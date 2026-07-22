"""T2-ROLES — full Moodle role sets: course creator, editing teacher, non-editing
teacher. Owner: Khaled (Roles & Permissions).

Two things are proven here:

  1. THE SEED (direct DB): the new capabilities exist and the role_capability
     matrix at system context matches Moodle's archetype defaults for the three
     roles in question — most importantly:
       * course:create -> manager, coursecreator, editingteacher  (the last is
         this team's deliberate extension: our editing teacher CAN create
         courses); NOT teacher/student/guest.
       * forum:replypost (answer a Q&A discussion) -> non-editing teacher (and
         above + students).
       * coursecreator does NOT get course:view (M09/D-SEED reserves it for
         manager — the apply.py fixtures contradiction-guard enforces this).

  2. THE GATE (TestClient, live DB): POST /api/lms/courses no longer refuses
     every non-admin. It now gates on the course:create capability at the
     system context (site-admin bypass intact), so a Course creator or a
     site-level editing teacher succeeds, a student is refused (403 naming the
     capability), and an anonymous caller is 401.

Runs over the live team DB (repo norm; hermetic CI blocked on D-SEC), same
etiquette as test_enrolment_authz.py: personas resolved BY USERNAME, DB
assertions use a PRIVATE asyncpg connection (never app.db's pool), DATABASE_URL
is injected only inside the module fixture.
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

_COURSE_PREFIX = "ZZTEST-ROLE"  # throwaway courses created by the gate tests


def q(sql: str, *args):
    async def go():
        conn = await asyncpg.connect(_ENV_URL, statement_cache_size=0, timeout=30)
        try:
            return [dict(r) for r in await conn.fetch(sql, *args)]
        finally:
            await conn.close()
    return asyncio.run(go())


def _h(uid) -> dict:
    return {"X-Acting-User": str(uid)}


@pytest.fixture(scope="module")
def client():
    os.environ["DATABASE_URL"] = _ENV_URL
    with TestClient(app) as c:
        yield c
    # Teardown: drop any course rows these tests created.
    q(f"delete from course where short_name like '{_COURSE_PREFIX}%'")


@pytest.fixture(scope="module")
def users(client):
    return {u["username"]: u["id"] for u in client.get("/api/users").json()}


# ---------------------------------------------------------------------------
# 1. THE SEED — capability catalogue + role_capability matrix at system context
# ---------------------------------------------------------------------------

def _perm_at_system(short_name: str, capability: str):
    rows = q(
        "select rc.permission::text as p from role_capability rc "
        "join role r on r.id = rc.role_id "
        "join context c on c.id = rc.context_id "
        "where c.level = 'system' and r.short_name = $1 and rc.capability = $2",
        short_name, capability,
    )
    return rows[0]["p"] if rows else None  # None = 'not set' (no row)


def test_new_capabilities_exist():
    for cap in ("course:create", "course:update", "course:manageactivities",
                "forum:replypost", "quiz:manage", "assign:grade", "grade:edit"):
        assert q("select 1 from capability where name = $1", cap), f"missing capability {cap}"


def test_coursecreator_role_exists():
    rows = q("select archetype::text as a, sort_order from role where short_name = 'coursecreator'")
    assert rows, "coursecreator role not seeded"
    assert rows[0]["a"] == "coursecreator"


def test_course_create_granted_to_manager_coursecreator_editingteacher():
    assert _perm_at_system("manager", "course:create") == "allow"
    assert _perm_at_system("coursecreator", "course:create") == "allow"
    assert _perm_at_system("editingteacher", "course:create") == "allow"  # team extension


def test_course_create_denied_to_teacher_student_guest():
    for sn in ("teacher", "student", "guest"):
        assert _perm_at_system(sn, "course:create") is None, f"{sn} must not hold course:create"


def test_non_editing_teacher_answers_qa():
    # The defining ask: the non-editing teacher can answer the Q&A (reply to a
    # forum discussion) and grade — but cannot edit the course.
    assert _perm_at_system("teacher", "forum:replypost") == "allow"
    assert _perm_at_system("teacher", "grade:edit") == "allow"
    assert _perm_at_system("teacher", "course:manageactivities") is None


def test_coursecreator_does_not_get_course_view():
    # M09/D-SEED: course:view is manager-only; the apply.py fixtures guard fails
    # if any other role holds it. Course creator must rely on course:viewhidden.
    assert _perm_at_system("coursecreator", "course:view") is None
    assert _perm_at_system("coursecreator", "course:viewhidden") == "allow"


# ---------------------------------------------------------------------------
# 2. THE GATE — POST /api/lms/courses now gates on course:create
# ---------------------------------------------------------------------------

def _create(client, uid, tag):
    body = {"full_name": f"Roles test {tag}", "short_name": f"{_COURSE_PREFIX}-{tag}"}
    return client.post("/api/lms/courses", headers=_h(uid), json=body)


def test_create_course_requires_principal(client):
    assert client.post("/api/lms/courses", json={"full_name": "x", "short_name": "x"}).status_code == 401


def test_course_creator_can_create_course(client, users):
    uid = users.get("creator1")
    assert uid, "fixtures persona 'creator1' (coursecreator@system) missing"
    r = _create(client, uid, "cc")
    assert r.status_code in (200, 201), r.text


def test_site_editing_teacher_can_create_course(client, users):
    uid = users.get("siteteacher1")
    assert uid, "fixtures persona 'siteteacher1' (editingteacher@system) missing"
    r = _create(client, uid, "et")
    assert r.status_code in (200, 201), r.text


def test_student_cannot_create_course(client, users):
    uid = users.get("student.a")
    assert uid, "fixtures persona 'student.a' missing"
    r = _create(client, uid, "stu")
    assert r.status_code == 403
    assert "course:create" in r.text


def test_admin_can_still_create_course(client, users):
    uid = users.get("admin1")
    assert uid, "fixtures persona 'admin1' missing"
    r = _create(client, uid, "adm")
    assert r.status_code in (200, 201), r.text
