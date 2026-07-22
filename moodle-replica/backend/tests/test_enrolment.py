"""Enrolment domain tests — owner: Yaman (task 01 §8, Phase 4).

Runs against the live team database (DATABASE_URL from backend/.env), so every
scenario builds its OWN scratch fixtures (methods, cohorts, enrolments for the
demo_* scratch users) and tears them down in `finally`. Seeded rows are only
ever READ. No shared conftest / pytest plugins: each test wraps its async
scenario in asyncio.run(), so plain `pytest` works with zero config.

Run:  ./.venv/bin/pip install -r tests/requirements-dev.txt
      ./.venv/bin/python -m pytest tests/test_enrolment.py -v
"""
import asyncio
import os
import pathlib
import re

import pytest
from dotenv import dotenv_values

from app import db
from app.services import enrolment as svc

# The hermetic modules (test_api_smoke, test_check_integration) pop
# DATABASE_URL from the process env at import, so in a whole-suite run it is
# gone by the time these tests execute. Read it from .env WITHOUT touching
# os.environ at import (their 503-without-db test needs it absent while THEY
# run) and re-inject lazily inside run(), which only executes with our tests.
_ENV_URL = (dotenv_values(pathlib.Path(__file__).resolve().parents[1] / ".env")
            .get("DATABASE_URL") or os.environ.get("DATABASE_URL"))

# Scratch identities (seeded for exactly this purpose) — never seed students.
ALICE, BOB = 4, 5           # demo_alice / demo_bob
ADMIN = 6                   # actor for writes
LAB1 = 5                    # scratch course
CS101 = 3                   # seeded demo course — READ ONLY in these tests
STUDENT_ROLE = 4


def run(coro):
    """Each test gets a fresh loop + pool (asyncpg pools are loop-bound)."""
    if _ENV_URL:
        os.environ["DATABASE_URL"] = _ENV_URL
    async def wrapped():
        await db.connect()
        try:
            return await coro
        finally:
            await db.disconnect()
    return asyncio.run(wrapped())


async def _cleanup_scratch(method_ids=(), cohort_ids=()):
    for mid in method_ids:
        await svc.delete_method(db, mid, actor_id=ADMIN)
    for cid in cohort_ids:
        await db.fetch_all("delete from cohort where id = $1 returning id", cid)


async def _make_method(course_id=LAB1, method="manual", **kw) -> int:
    res = await svc.create_method(db, course_id, method,
                                  default_role_id=kw.pop("default_role_id",
                                                         STUDENT_ROLE), **kw)
    assert res["ok"], res
    return res["method"]["id"]


# ---------------------------------------------------------------------------
# §6.2 — the four active-conditions, one predicate
# ---------------------------------------------------------------------------

def test_four_active_conditions():
    async def scenario():
        mid = await _make_method()
        try:
            # all four hold → live
            await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN)
            assert await svc.is_active_enrolled(db, ALICE, LAB1)

            # condition 1: row suspended → dead (row still exists)
            await svc.suspend(db, mid, ALICE)
            assert not await svc.is_active_enrolled(db, ALICE, LAB1)
            assert await svc.is_enrolled(db, ALICE, LAB1)  # onlyactive=False
            await svc.reactivate(db, mid, ALICE)

            # condition 2: method disabled → dead, rows untouched (freeze)
            await svc.update_method(db, mid, status="disabled")
            assert not await svc.is_active_enrolled(db, ALICE, LAB1)
            await svc.update_method(db, mid, status="enabled")

            # condition 3: time_start in the future → dead
            row = await db.fetch_one(
                "update enrolment set time_start = now() + interval '1 day' "
                "where method_id = $1 and user_id = $2 returning id", mid, ALICE)
            assert row and not await svc.is_active_enrolled(db, ALICE, LAB1)

            # condition 4: time_end in the past → dead; NULL = forever
            await db.fetch_one(
                "update enrolment set time_start = null, "
                "time_end = now() - interval '1 day' "
                "where method_id = $1 and user_id = $2 returning id", mid, ALICE)
            assert not await svc.is_active_enrolled(db, ALICE, LAB1)
            await db.fetch_one(
                "update enrolment set time_end = null "
                "where method_id = $1 and user_id = $2 returning id", mid, ALICE)
            assert await svc.is_active_enrolled(db, ALICE, LAB1)
        finally:
            await _cleanup_scratch(method_ids=[mid])
    run(scenario())


# ---------------------------------------------------------------------------
# §6.5 / D-1 / rule 10 — enrol writes BOTH rows; re-enrol upserts
# ---------------------------------------------------------------------------

def test_enrol_writes_enrolment_and_provenance_role():
    async def scenario():
        mid = await _make_method()
        try:
            res = await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN)
            assert res["ok"]
            ra = res["role_assigned"]
            assert ra["component"] == "enrol_manual" and ra["item_id"] == mid
            # rule 10: same (method,user) again → update, never error/duplicate
            res2 = await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN)
            assert res2["ok"] and not res2["role_assigned"]["created"]
            rows = await db.fetch_all(
                "select id from enrolment where method_id=$1 and user_id=$2",
                mid, ALICE)
            assert len(rows) == 1
        finally:
            await _cleanup_scratch(method_ids=[mid])
    run(scenario())


# ---------------------------------------------------------------------------
# §6.5 rule 3 — suspend flips status ONLY; roles stay
# ---------------------------------------------------------------------------

def test_suspend_keeps_roles():
    async def scenario():
        mid = await _make_method()
        try:
            await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN)
            await svc.suspend(db, mid, ALICE)
            roles = await db.fetch_all(
                "select 1 from role_assignment "
                "where user_id=$1 and component='enrol_manual' and item_id=$2",
                ALICE, mid)
            assert len(roles) == 1, "suspend must never touch roles"
        finally:
            await _cleanup_scratch(method_ids=[mid])
    run(scenario())


# ---------------------------------------------------------------------------
# T2-ENR-002 (ENR-010) — re-enrol preserves state; explicit activate opts in
# ---------------------------------------------------------------------------

def test_reenrol_preserves_suspension():
    """A duplicate enrol must NOT silently reactivate a suspended row —
    activate=True is the only way back to active. And a bare re-enrol leaves
    the time window alone (supplied-fields-only, Moodle update_user_enrol)."""
    async def scenario():
        mid = await _make_method()
        try:
            end = (await db.fetch_one(
                "select date_trunc('second', now() + interval '30 day') t"))["t"]
            await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN, time_end=end)
            await svc.suspend(db, mid, ALICE)

            res = await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN)
            assert res["ok"], res
            assert res["enrolment"]["status"] == "suspended", \
                "re-enrol silently reactivated a suspended row"
            assert res["enrolment"]["time_end"] == end, \
                "re-enrol clobbered an unsupplied time_end"

            res = await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN,
                                       activate=True)
            assert res["enrolment"]["status"] == "active"
            assert res["enrolment"]["time_end"] == end
        finally:
            await _cleanup_scratch(method_ids=[mid])
    run(scenario())


def test_status_flip_is_change_gated():
    """A no-op suspend/reactivate reports changed=False and leaves updated_at
    alone (ENR-010 change-gating)."""
    async def scenario():
        mid = await _make_method()
        try:
            await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN)
            first = await svc.suspend(db, mid, ALICE)
            assert first["ok"] and first["changed"] is True
            stamp = first["enrolment"]["updated_at"]
            again = await svc.suspend(db, mid, ALICE)
            assert again["ok"] and again["changed"] is False
            assert again["enrolment"]["updated_at"] == stamp, \
                "no-op flip rewrote the row"
        finally:
            await _cleanup_scratch(method_ids=[mid])
    run(scenario())


# ---------------------------------------------------------------------------
# §6.10 / HC-1 — two paths; removing one touches only ITS provenance;
# removing the LAST triggers whole-course cleanup
# ---------------------------------------------------------------------------

def test_two_paths_provenance_and_last_path_cleanup():
    async def scenario():
        m1 = await _make_method()               # manual
        m2 = await _make_method(method="self",  # second path, own provenance
                                config={"key": "scratch-key"})
        try:
            await svc.enrol_user(db, m1, ALICE, actor_id=ADMIN)
            await svc.enrol_user(db, m2, ALICE, actor_id=ADMIN)
            paths = await svc.active_paths(db, ALICE, LAB1)
            assert len(paths) == 2, "two methods = two rows (§6.10)"

            res = await svc.unenrol_user(db, m2, ALICE, actor_id=ADMIN)
            assert not res["last_path_cleanup"], "manual path still there"
            left = await db.fetch_all(
                "select component, item_id from role_assignment where user_id=$1",
                ALICE)
            assert {(r["component"], r["item_id"]) for r in left} == \
                   {("enrol_manual", m1)}, "only enrol_self provenance removed"

            await svc.touch_last_access(db, ALICE, LAB1)
            res = await svc.unenrol_user(db, m1, ALICE, actor_id=ADMIN)
            assert res["last_path_cleanup"], "last path → whole-course cleanup"
            assert await db.fetch_one(
                "select 1 from user_last_access where user_id=$1 and course_id=$2",
                ALICE, LAB1) is None
            assert await db.fetch_all(
                "select 1 from role_assignment where user_id=$1", ALICE) == []
        finally:
            await _cleanup_scratch(method_ids=[m1, m2])
    run(scenario())


# ---------------------------------------------------------------------------
# §6.6 — self-enrol gate chain, exact order, failing gate named
# ---------------------------------------------------------------------------

def test_self_enrol_gate_chain_order():
    async def scenario():
        # gate 1: hidden/deleted course (HIST9, id 6, seeded soft-deleted)
        v = await svc.self_enrol(db, 6, ALICE)
        assert v["failing_gate"] == "course_visible"

        mid = await _make_method(method="self", status="disabled",
                                 config={"key": "k1"})
        try:
            # gate 2: no enabled self method
            v = await svc.self_enrol(db, LAB1, ALICE, "k1")
            assert v["failing_gate"] == "method_enabled"

            # gate 3: window closed
            await svc.update_method(db, mid, status="enabled")
            await db.fetch_one(
                "update enrolment_method set enrol_end = now() - interval '1 day' "
                "where id = $1 returning id", mid)
            v = await svc.self_enrol(db, LAB1, ALICE, "k1")
            assert v["failing_gate"] == "window_open"
            await db.fetch_one(
                "update enrolment_method set enrol_end = null "
                "where id = $1 returning id", mid)

            # gate 4: capacity
            await svc.update_method(db, mid, config={"key": "k1",
                                                     "max_enrolled": 1})
            assert (await svc.self_enrol(db, LAB1, BOB, "k1"))["enrolled"]
            v = await svc.self_enrol(db, LAB1, ALICE, "k1")
            assert v["failing_gate"] == "capacity"
            await svc.update_method(db, mid, config={"key": "k1"})

            # gate 5: key
            v = await svc.self_enrol(db, LAB1, ALICE, "wrong")
            assert v["failing_gate"] == "key_match"

            # all gates pass → enrolled with the method's default role
            v = await svc.self_enrol(db, LAB1, ALICE, "k1")
            assert v["enrolled"] and v["failing_gate"] is None
            assert all(g["reason"] == "" for g in v["gates"] if g["passed"])
        finally:
            await _cleanup_scratch(method_ids=[mid])
    run(scenario())


# ---------------------------------------------------------------------------
# §6.8 — cohort sync, policy UNENROL
# ---------------------------------------------------------------------------

def test_cohort_sync_unenrol_policy():
    async def scenario():
        c = await svc.create_cohort(db, "scratch-cohort", "SCRATCH-T")
        cid = c["cohort"]["id"]
        mid = None
        try:
            mid = (await svc.create_method(
                db, LAB1, "cohort", cohort_id=cid,
                default_role_id=STUDENT_ROLE))["method"]["id"]

            # member added → enrolled on next sync
            await db.fetch_all(
                "insert into cohort_member (cohort_id, user_id) values ($1,$2) "
                "returning user_id", cid, ALICE)
            res = await svc.sync_cohort_method(db, mid, actor_id=ADMIN)
            assert res["added"] == [ALICE]

            # suspended member → reactivated
            await svc.suspend(db, mid, ALICE)
            res = await svc.sync_cohort_method(db, mid, actor_id=ADMIN)
            assert res["added"] == [ALICE]
            assert await svc.is_active_enrolled(db, ALICE, LAB1)

            # member removed → FULL path removal (policy UNENROL;
            # Moodle also offers KEEP / SUSPEND / SUSPENDNOROLES)
            res = await svc.remove_cohort_member(db, cid, ALICE, actor_id=ADMIN)
            assert res["synced"][0]["removed"] == [ALICE]
            assert not await svc.is_enrolled(db, ALICE, LAB1)

            # disabled method = frozen, sync skips
            await svc.update_method(db, mid, status="disabled")
            res = await svc.sync_cohort_method(db, mid)
            assert res.get("skipped")
        finally:
            await _cleanup_scratch(method_ids=[mid] if mid else [],
                                   cohort_ids=[cid])
    run(scenario())


# ---------------------------------------------------------------------------
# R-COHORT (ENR-013) — an active cohort path resists MANUAL unenrol; the sync
# still removes it; suspending first re-opens manual unenrol.
# ---------------------------------------------------------------------------

def test_cohort_active_unenrol_blocked():
    async def scenario():
        c = await svc.create_cohort(db, "scratch-rcohort", "SCRATCH-RC")
        cid = c["cohort"]["id"]
        mid = None
        try:
            mid = (await svc.create_method(
                db, LAB1, "cohort", cohort_id=cid,
                default_role_id=STUDENT_ROLE))["method"]["id"]
            await db.fetch_all(
                "insert into cohort_member (cohort_id, user_id) values ($1,$2) "
                "returning user_id", cid, ALICE)
            await svc.sync_cohort_method(db, mid, actor_id=ADMIN)
            assert await svc.is_active_enrolled(db, ALICE, LAB1)

            # manual unenrol of the ACTIVE cohort path is refused (409/ENR-013)
            res = await svc.unenrol_user(db, mid, ALICE, actor_id=ADMIN)
            assert res["ok"] is False and res["http_status"] == 409
            assert await svc.is_active_enrolled(db, ALICE, LAB1), \
                "refused unenrol must not have removed the row"

            # suspend first → manual unenrol now allowed
            await svc.suspend(db, mid, ALICE)
            res = await svc.unenrol_user(db, mid, ALICE, actor_id=ADMIN)
            assert res["ok"] is True
            assert not await svc.is_enrolled(db, ALICE, LAB1)
        finally:
            await _cleanup_scratch(method_ids=[mid] if mid else [],
                                   cohort_ids=[cid])
    run(scenario())


# ---------------------------------------------------------------------------
# §6.7 — guest: no enrolment rows ever; one instance per course (code-enforced)
# ---------------------------------------------------------------------------

def test_guest_never_enrols_and_one_per_course():
    async def scenario():
        mid = await _make_method(method="guest", default_role_id=None)
        try:
            res = await svc.enrol_user(db, mid, ALICE, actor_id=ADMIN)
            assert not res["ok"], "guest methods must never create enrolments"
            dup = await svc.create_method(db, LAB1, "guest")
            assert not dup["ok"], "one guest method per course — code-enforced"
            preview = await svc.guest_access_enabled(db, LAB1)
            assert preview["guest_access"] is True
        finally:
            await _cleanup_scratch(method_ids=[mid])
    run(scenario())


# ---------------------------------------------------------------------------
# C-6 — account suspension ≠ enrolment suspension (read-only on seed)
# ---------------------------------------------------------------------------

def test_account_suspended_user_still_on_roster():
    async def scenario():
        roster = await svc.list_participants(db, CS101, "all")
        susp = [p for p in roster if p["username"] == "student.susp"]
        assert susp, "account-suspended users must STAY LISTED (C-6)"
        p = susp[0]
        assert p["account_suspended"] is True
        assert p["enrolment_status"] == "active", \
            "the two switches are independent facts"
        assert p["effective_status"] == "account_suspended"
    run(scenario())


def test_other_users_are_not_participants():
    async def scenario():
        roster = await svc.list_participants(db, CS101, "all")
        others = await svc.list_other_users(db, CS101)
        assert {p["user_id"] for p in roster}.isdisjoint(
               {o["user_id"] for o in others}), \
            "role-without-enrolment users never appear on the roster (§8.8)"
        assert any(o["user_id"] == 7 for o in others)  # teacher.a, seeded
    run(scenario())


# ---------------------------------------------------------------------------
# Task §7 — forbidden writes, statically enforced:
# the service must never write teammates' tables directly.
# ---------------------------------------------------------------------------

def test_no_forbidden_table_writes_in_service_sql():
    src = pathlib.Path(svc.__file__).read_text()
    for table in ("course_group", "group_member", "activity_completion",
                  "course_completion", "role_capability", "capability"):
        assert not re.search(
            rf"(insert\s+into|update|delete\s+from)\s+{table}\b", src,
            re.IGNORECASE), \
            f"enrolment service must not write {table} (task 01 §7)"
    # completion rows are never deleted on unenrol (Hard Case #2)
    assert "completion" not in re.sub(r"#.*|\"\"\".*?\"\"\"", "", src,
                                      flags=re.DOTALL).lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
