"""T2-ENR-001 authz wiring tests — owner: Yaman.

Every enrolment/people route must (1) 401 without a principal, (2) 403 without
the route's capability — naming it in `detail` — with NO state change, and
(3) succeed for an actor that holds the capability (or the admin bypass, for
the fail-closed unseeded capabilities).

Runs over HTTP via TestClient against the live team DB (the repo's current
norm; hermetic CI is blocked on D-SEC). Personas come from fixtures.sql and
are resolved BY USERNAME at runtime — ids are never hardcoded. Direct DB
assertions use their own asyncpg connections (never app.db's global pool, so
the TestClient lifespan pool is left untouched).

Env etiquette (the whole-suite interplay): the hermetic modules
(test_api_smoke.py, test_check_integration.py) pop DATABASE_URL at import and
their tests RELY on it staying absent. So this file must not touch
os.environ at import time in either direction — the URL is read from .env
via dotenv_values (no environ writes) and only injected inside our own
module-scoped fixture, which runs after the hermetic modules' tests are done
(alphabetical execution order) and only when these tests actually run.
"""
import asyncio
import os
import pathlib
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import dotenv_values  # noqa: E402

_ENV_URL = (dotenv_values(pathlib.Path(__file__).resolve().parents[1] / ".env")
            .get("DATABASE_URL") or os.environ.get("DATABASE_URL"))

import asyncpg  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

pytestmark = pytest.mark.skipif(
    not _ENV_URL, reason="live team DB required (backend/.env)")


# ---------------------------------------------------------------------------
# Direct-DB helper: PRIVATE connection per call — never touches app.db._pool.
# ---------------------------------------------------------------------------

def q(sql: str, *args):
    async def go():
        conn = await asyncpg.connect(_ENV_URL,
                                     statement_cache_size=0, timeout=30)
        try:
            return [dict(r) for r in await conn.fetch(sql, *args)]
        finally:
            await conn.close()
    return asyncio.run(go())


def _h(uid: int) -> dict:
    return {"X-Acting-User": str(uid)}


@pytest.fixture(scope="module")
def client():
    # Inject the URL only now — after the hermetic modules' tests have run —
    # so app.db.connect() inside the lifespan finds it even if a hermetic
    # module popped it from the process env during collection.
    os.environ["DATABASE_URL"] = _ENV_URL
    with TestClient(app) as c:  # context manager runs lifespan → db.connect()
        yield c


@pytest.fixture(scope="module")
def ids(client):
    """Personas by username (open /api/users), courses/methods/cohort by
    their fixtures.sql idempotency keys."""
    users = {u["username"]: u["id"] for u in client.get("/api/users").json()}
    cs101 = q("select id from course where external_ref = 'T2-CS101'")[0]["id"]
    methods = {r["method"]: r["id"] for r in q(
        "select id, method from enrolment_method where course_id = $1", cs101)}
    cohort = q("select id from cohort where id_number = 'INTAKE26'")[0]["id"]
    return {"users": users, "cs101": cs101, "methods": methods,
            "cohort": cohort}


def _enrolment_count(method_id: int, user_id: int) -> int:
    return q("select count(*) c from enrolment where method_id = $1 "
             "and user_id = $2", method_id, user_id)[0]["c"]


@pytest.fixture(scope="module")
def selfenrol_seeded():
    """Lazy (no import-time DB hit) — lets the suite survive Essa's seed
    landing without edits."""
    return bool(q("select 1 from role_capability "
                  "where capability = 'enrol:selfenrol' limit 1"))


# ---------------------------------------------------------------------------
# 1-2. 401 — missing principal (raised by deps.current_user before any DB hit)
# ---------------------------------------------------------------------------

# (method, url, body) — bodies are schema-valid so the ONLY missing thing is
# the credential; ids can be dummies because 401 fires before resolution.
_MUTATIONS = [
    ("post", "/api/enrolment/courses/1/methods", {"method": "manual"}),
    ("patch", "/api/enrolment/methods/1", {"status": "enabled"}),
    ("delete", "/api/enrolment/methods/1", None),
    ("post", "/api/enrolment/methods/1/enrolments", {"user_id": 1}),
    ("delete", "/api/enrolment/methods/1/enrolments/1", None),
    ("patch", "/api/enrolment/methods/1/enrolments/1", {"status": "suspended"}),
    ("post", "/api/enrolment/courses/1/enrol", {"user_id": 1}),
    ("patch", "/api/enrolment/enrolments/1", {"status": "suspended"}),
    ("delete", "/api/enrolment/enrolments/1", None),
    ("post", "/api/enrolment/self/1", {"user_id": 1}),
    ("post", "/api/enrolment/methods/1/sync", None),
    ("post", "/api/enrolment/cohorts", {"name": "x"}),
    ("post", "/api/enrolment/cohorts/1/members", {"user_id": 1}),
    ("delete", "/api/enrolment/cohorts/1/members/1", None),
]


def test_authz_unauthenticated_401(client):
    for method, url, body in _MUTATIONS:
        kwargs = {"json": body} if body is not None else {}
        r = getattr(client, method)(url, **kwargs)
        assert r.status_code == 401, \
            f"{method.upper()} {url} → {r.status_code}, expected 401"


def test_authz_reads_require_principal(client, ids):
    cs, m = ids["cs101"], ids["methods"]["manual"]
    gated = [f"/api/enrolment/courses/{cs}/participants",
             f"/api/enrolment/courses/{cs}/other-users",
             f"/api/enrolment/courses/{cs}/methods",
             f"/api/enrolment/methods/{m}/enrolments",
             "/api/enrolment/cohorts",
             f"/api/enrolment/users/{ids['users']['student.a']}/enrolments",
             f"/api/users/{ids['users']['student.a']}"]
    for url in gated:
        assert client.get(url).status_code == 401, url
    # bootstrap + pre-auth surfaces stay open
    assert client.get("/api/users").status_code == 200
    assert client.get(f"/api/enrolment/guest-preview/{cs}").status_code == 200


def test_guest_preview_stays_open(client, ids):
    r = client.get(f"/api/enrolment/guest-preview/{ids['cs101']}")
    assert r.status_code == 200
    assert "guest_allowed" in str(r.json()) or isinstance(r.json(), dict)


# ---------------------------------------------------------------------------
# 3-6. capability gates — seeded caps and fail-closed caps
# ---------------------------------------------------------------------------

def test_authz_enrol_requires_capability(client, ids):
    """Student → 403 naming enrol:manual, and NO enrolment row appears."""
    u, cs = ids["users"], ids["cs101"]
    target, m = u["ta.allgroups"], ids["methods"]["manual"]
    before = _enrolment_count(m, target)
    r = client.post(f"/api/enrolment/courses/{cs}/enrol",
                    json={"user_id": target}, headers=_h(u["student.a"]))
    assert r.status_code == 403
    assert "enrol:manual" in r.json()["detail"]
    assert _enrolment_count(m, target) == before


def test_teacher_can_enrol_and_unenrol(client, ids):
    """editingteacher@CS101 holds the seeded enrol:manual / enrol:unenrol."""
    u, m = ids["users"], ids["methods"]["manual"]
    teacher = u["teacher.a"]
    # pick a target with no manual-method row so the test is self-contained
    target = next((u[name] for name in
                   ("ta.allgroups", "student.susp", "student.b")
                   if _enrolment_count(m, u[name]) == 0), None)
    assert target is not None, "no persona free of CS101 manual enrolment"
    try:
        r = client.post(f"/api/enrolment/methods/{m}/enrolments",
                        json={"user_id": target}, headers=_h(teacher))
        assert r.status_code == 201, r.json()
        assert _enrolment_count(m, target) == 1
        r = client.delete(f"/api/enrolment/methods/{m}/enrolments/{target}",
                          headers=_h(teacher))
        assert r.status_code == 200, r.json()
        assert _enrolment_count(m, target) == 0
    finally:  # belt-and-braces restore as admin
        client.delete(f"/api/enrolment/methods/{m}/enrolments/{target}",
                      headers=_h(u["admin1"]))


def test_admin_passes_fail_closed_caps(client, ids):
    """cohort:manage is unseeded → fail-closed, but the admin config-list
    bypass in the permission engine still authorizes admin1."""
    admin = ids["users"]["admin1"]
    name = "T2-AUTHZ-SCRATCH-COHORT"
    q("delete from cohort where name = $1", name)  # idempotent re-runs
    try:
        r = client.post("/api/enrolment/cohorts", json={"name": name},
                        headers=_h(admin))
        assert r.status_code == 201, r.json()
    finally:
        q("delete from cohort where name = $1", name)


def test_teacher_403_on_fail_closed_cap(client, ids):
    """course:enrolconfig is unseeded → even editingteacher is denied until
    Essa's seed lands (docs/T2-ENR-001-capability-seed.draft.sql)."""
    m = ids["methods"]["manual"]
    r = client.patch(f"/api/enrolment/methods/{m}", json={"status": "enabled"},
                     headers=_h(ids["users"]["teacher.a"]))
    assert r.status_code == 403
    assert "course:enrolconfig" in r.json()["detail"]


# ---------------------------------------------------------------------------
# 7-8. self-enrol: identity binding + fail-closed capability
# ---------------------------------------------------------------------------

def test_selfenrol_principal_mismatch_403(client, ids):
    u, cs = ids["users"], ids["cs101"]
    m_self = ids["methods"]["self"]
    before = _enrolment_count(m_self, u["student.b"])
    r = client.post(f"/api/enrolment/self/{cs}",
                    json={"user_id": u["student.b"], "key": "sesame"},
                    headers=_h(u["student.a"]))
    assert r.status_code == 403
    assert "yourself" in r.json()["detail"]        # identity refusal…
    assert "capability" not in r.json()["detail"]  # …not a capability one
    assert _enrolment_count(m_self, u["student.b"]) == before


def test_selfenrol_student_fail_closed(client, ids, selfenrol_seeded):
    u, cs = ids["users"], ids["cs101"]
    actor = u["student.b"]
    m_self = ids["methods"]["self"]
    before = _enrolment_count(m_self, actor)
    r = client.post(f"/api/enrolment/self/{cs}",
                    json={"user_id": actor, "key": "sesame"}, headers=_h(actor))
    if not selfenrol_seeded:
        assert r.status_code == 403
        assert "enrol:selfenrol" in r.json()["detail"]
        assert _enrolment_count(m_self, actor) == before
    else:  # seed landed: the verdict path runs; restore any row it created
        assert r.status_code == 200
        if _enrolment_count(m_self, actor) > before:
            client.delete(
                f"/api/enrolment/methods/{m_self}/enrolments/{actor}",
                headers=_h(u["admin1"]))


# ---------------------------------------------------------------------------
# 9. status changes need enrol:manage (unseeded → teacher 403, admin passes)
# ---------------------------------------------------------------------------

def test_status_patch_requires_enrol_manage(client, ids):
    u, m = ids["users"], ids["methods"]["manual"]
    row = q("select user_id from enrolment "
            "where method_id = $1 and status = 'active' limit 1", m)
    assert row, "fixtures should hold an active CS101 manual enrolment"
    target = row[0]["user_id"]
    url = f"/api/enrolment/methods/{m}/enrolments/{target}"
    r = client.patch(url, json={"status": "suspended"},
                     headers=_h(u["teacher.a"]))
    assert r.status_code == 403
    assert "enrol:manage" in r.json()["detail"]
    # admin bypass works; restore in finally
    try:
        r = client.patch(url, json={"status": "suspended"},
                         headers=_h(u["admin1"]))
        assert r.status_code == 200, r.json()
    finally:
        client.patch(url, json={"status": "active"}, headers=_h(u["admin1"]))


# ---------------------------------------------------------------------------
# 10-12. reads: roster gate, user detail, user enrolments (self vs other)
# ---------------------------------------------------------------------------

def test_participants_read_gated(client, ids):
    u, cs = ids["users"], ids["cs101"]
    r = client.get(f"/api/enrolment/courses/{cs}/participants",
                   headers=_h(u["student.a"]))
    assert r.status_code == 403
    assert "course:viewparticipants" in r.json()["detail"]
    r = client.get(f"/api/enrolment/courses/{cs}/participants",
                   headers=_h(u["ta.a"]))  # teacher role holds the cap
    assert r.status_code == 200


def test_user_detail_self_vs_other(client, ids):
    u = ids["users"]
    me, other, admin = u["student.a"], u["student.b"], u["admin1"]
    assert client.get(f"/api/users/{me}", headers=_h(me)).status_code == 200
    r = client.get(f"/api/users/{other}", headers=_h(me))
    assert r.status_code == 403
    assert "user:viewdetails" in r.json()["detail"]
    assert client.get(f"/api/users/{other}",
                      headers=_h(admin)).status_code == 200


def test_user_enrolments_self_vs_other(client, ids):
    u = ids["users"]
    me, other, admin = u["student.a"], u["student.b"], u["admin1"]
    base = "/api/enrolment/users"
    assert client.get(f"{base}/{me}/enrolments",
                      headers=_h(me)).status_code == 200
    r = client.get(f"{base}/{other}/enrolments", headers=_h(me))
    assert r.status_code == 403
    assert "user:viewdetails" in r.json()["detail"]
    assert client.get(f"{base}/{other}/enrolments",
                      headers=_h(admin)).status_code == 200


# ---------------------------------------------------------------------------
# 13-16. edge cases: suspended principal, 404-before-403, system-context gate
# ---------------------------------------------------------------------------

def test_suspended_principal_403(client, ids):
    """A suspended (not deleted) account passes current_user but resolves no
    authorizing grant — every gated mutation stays denied."""
    u, cs = ids["users"], ids["cs101"]
    r = client.post(f"/api/enrolment/courses/{cs}/enrol",
                    json={"user_id": u["student.b"]},
                    headers=_h(u["student.susp"]))
    assert r.status_code == 403


def test_unknown_method_404_before_403(client, ids):
    """Resource resolution precedes the capability check (groups.py
    precedent) — a student probing an unknown id sees 404, not 403."""
    r = client.patch("/api/enrolment/methods/999999",
                     json={"status": "enabled"},
                     headers=_h(ids["users"]["student.a"]))
    assert r.status_code == 404


def test_cohort_member_requires_system_cap(client, ids):
    """cohort:assign is gated at the SYSTEM context — an editingteacher's
    course-scoped role never reaches it (matches Moodle site-level cohorts)."""
    u, coh = ids["users"], ids["cohort"]
    target = u["student.b"]
    before = q("select count(*) c from cohort_member "
               "where cohort_id = $1 and user_id = $2", coh, target)[0]["c"]
    r = client.post(f"/api/enrolment/cohorts/{coh}/members",
                    json={"user_id": target}, headers=_h(u["teacher.a"]))
    assert r.status_code == 403
    assert "cohort:assign" in r.json()["detail"]
    after = q("select count(*) c from cohort_member "
              "where cohort_id = $1 and user_id = $2", coh, target)[0]["c"]
    assert after == before
