"""Routed group tests (Task 05 — Mahmoud, T2-GRP-001..005).

Unlike test_groups.py (pure helpers, no I/O) these hit the REAL running API +
seeded DB — the audit called for "routed pytest, not helper-only". They are
skipped unless GROUPS_API_URL points at a live server seeded by fixtures.sql,
so the hermetic pure suite still runs everywhere with no creds.

    GROUPS_API_URL=http://localhost:8011 pytest tests/test_groups_routed.py

Personas (fixtures.sql): admin1=6 manager · ta.a=8 scoped teacher ·
ta.allgroups=9 · student.a=10 (Group A) · student.multi=11 (A+B) ·
student.b=12 (Group B). Course CS101=3; Assignment 1 inherits separate.
"""
import os

import httpx
import pytest

BASE = os.environ.get("GROUPS_API_URL")
pytestmark = pytest.mark.skipif(not BASE, reason="set GROUPS_API_URL to a live seeded server")

ADMIN, TA_A, TA_ALL, STU_A, STU_MULTI, STU_B = 6, 8, 9, 10, 11, 12
CS101 = 3


def _client():
    return httpx.Client(base_url=BASE, timeout=20)


def _activity_id(name):
    with _client() as c:
        acts = c.get(f"/api/courses/{CS101}/activities").json()
    return next(a["id"] for a in acts if a["name"] == name)


def _group_id(name):
    with _client() as c:
        gs = c.get(f"/api/groups?course_id={CS101}", headers={"X-Acting-User": str(ADMIN)}).json()
    return next(g["id"] for g in gs if g["name"] == name)


# ---- T2-GRP-001: routed decision, no 500, prevent honoured -----------------
def test_access_check_routed_no_500():
    a1 = _activity_id("Assignment 1")
    with _client() as c:
        r = c.post("/api/groups/access-check", json={
            "actor_user_id": TA_A, "target_user_id": STU_B, "activity_id": a1, "action": "grade"})
    assert r.status_code == 200, r.text
    v = r.json()
    # separate mode, ta.a scoped to Group A (prevent honoured), basel in Group B
    assert v["visible"] is False and v["action_allowed"] is False


def test_access_check_allgroups_reaches_all():
    a1 = _activity_id("Assignment 1")
    with _client() as c:
        v = c.post("/api/groups/access-check", json={
            "actor_user_id": TA_ALL, "target_user_id": STU_B, "activity_id": a1, "action": "grade"}).json()
    assert v["visible"] and v["action_allowed"]


def test_allowed_routed_multi_group():
    a1 = _activity_id("Assignment 1")
    with _client() as c:
        got = c.get(f"/api/groups/activities/{a1}/allowed?user_id={STU_MULTI}").json()
    names = {g["name"] for g in got["groups"]}
    assert {"Group A", "Group B"} <= names  # HC-04 union under separate mode


# ---- T2-GRP-003: auth gates ------------------------------------------------
def test_mutation_requires_session_401():
    ga = _group_id("Observers")
    with _client() as c:
        r = c.post(f"/api/groups/{ga}/members", json={"user_id": STU_B})
    assert r.status_code == 401


def test_mutation_requires_capability_403():
    ga = _group_id("Observers")
    with _client() as c:
        r = c.post(f"/api/groups/{ga}/members", json={"user_id": STU_B},
                   headers={"X-Acting-User": str(STU_B)})  # a student has no group:manage
    assert r.status_code == 403


def test_provenance_forged_rejected():
    ga = _group_id("Observers")
    with _client() as c:
        r = c.post(f"/api/groups/{ga}/members",
                   json={"user_id": STU_B, "component": "enrol_cohort", "item_id": 5},
                   headers={"X-Acting-User": str(ADMIN)})
    assert r.status_code == 422  # extra='forbid' — client cannot forge provenance


def test_manual_add_sets_empty_provenance_and_is_removable():
    ga = _group_id("Observers")
    with _client() as c:
        add = c.post(f"/api/groups/{ga}/members", json={"user_id": STU_B},
                     headers={"X-Acting-User": str(ADMIN)}).json()
        assert add["ok"] and add["component"] == ""
        # default-allow removal + idempotent second remove
        r1 = c.request("DELETE", f"/api/groups/{ga}/members/{STU_B}",
                       headers={"X-Acting-User": str(ADMIN)}).json()
        r2 = c.request("DELETE", f"/api/groups/{ga}/members/{STU_B}",
                       headers={"X-Acting-User": str(ADMIN)}).json()
        assert r1["ok"] and r2["ok"]  # second is idempotent no-op


# ---- T2-GRP-002: scope filter ----------------------------------------------
def test_members_scoped_by_visibility():
    ga = _group_id("Group A")
    with _client() as c:
        seen = {m["username"] for m in c.get(f"/api/groups/{ga}/members",
                                             headers={"X-Acting-User": str(TA_A)}).json()}
    assert "student.a" in seen  # Group A is visibility=all; members listed
