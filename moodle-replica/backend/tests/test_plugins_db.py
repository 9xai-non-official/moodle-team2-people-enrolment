"""Tier-b (DB-gated) plugin tests — hermetic docker Postgres, real schema,
fake Graph. Skipped unless PLUGIN_DB_TEST=1 (same env-gating posture as the
other DB tiers). Recipe (migrations/README.md):

    docker run --rm -d --name moodle-t2-pg -e POSTGRES_PASSWORD=dev \
      -e POSTGRES_DB=moodle_t2 -p 5434:5432 postgres:17
    DATABASE_URL=postgresql://postgres:dev@localhost:5434/moodle_t2 \
      python3 migrations/apply.py --with-fixtures
    cd moodle-replica/backend && PLUGIN_DB_TEST=1 \
      DATABASE_URL=postgresql://postgres:dev@localhost:5434/moodle_t2 \
      python -m pytest tests/test_plugins_db.py -q

Covers: CLI install (DDL + ledger + idempotence), end-to-end
course→outbox→dispatch→mapping with a monkeypatched graph, enrol → member
add, unenrol last-path semantics, disabled-plugin drop.
"""
import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

pytestmark = pytest.mark.skipif(
    os.environ.get("PLUGIN_DB_TEST") != "1",
    reason="needs a disposable DB — set PLUGIN_DB_TEST=1 (docker recipe in "
           "the module docstring)")

import uuid

SHORT = f"PLG{uuid.uuid4().hex[:6]}"  # unique per run — re-runnable vs one DB


async def _uid(db, username: str) -> int:
    """Fixture ids differ between the hand-built live DB and a fresh docker
    apply (admin1 is 6 live, 1 here) — resolve by username, never hardcode."""
    return await db.fetch_val(
        "select id from app_user where username = $1", username)


@pytest.fixture(scope="module")
def loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def ctx(loop):
    """Connected db module + CLI-installed msteams plugin + fake graph."""
    from app import db
    from app.plugin_cli import _install
    from app.plugins.msteams import handlers
    from app.services import plugin_core, realtime

    loop.run_until_complete(db.connect())
    assert db.connected(), "DATABASE_URL required for tier-b"
    loop.run_until_complete(_install("msteams"))
    # Second install must be a clean no-op (idempotence).
    loop.run_until_complete(_install("msteams"))
    loop.run_until_complete(plugin_core.set_enabled("msteams", True))

    class FakeGraph:
        def __init__(self):
            self.created, self.added, self.removed, self.archived = [], [], [], []
            self.users = {"real@t.example": "aad-1"}

        async def create_team(self, name, description, owner_upn, settings):
            self.created.append(name)
            return f"team-{len(self.created)}"

        async def find_user(self, email, settings):
            return self.users.get(email)

        async def add_member(self, team_id, aad_id, settings):
            self.added.append((team_id, aad_id))

        async def remove_member(self, team_id, aad_id, settings):
            self.removed.append((team_id, aad_id))

        async def archive_team(self, team_id, settings):
            self.archived.append(team_id)

    fake = FakeGraph()
    real_graph = handlers.graph
    handlers.graph = fake

    async def _noop_publish(channel, name, data):
        pass
    real_publish = realtime.publish
    realtime.publish = _noop_publish

    loop.run_until_complete(plugin_core.put_settings("msteams", {
        "tenant_id": "t", "client_id": "c", "client_secret": "s",
        "owner_upn": "owner@t.example",
        "email_overrides": '{"student.a": "real@t.example"}',
    }))

    admin = loop.run_until_complete(_uid(db, "admin1"))
    student = loop.run_until_complete(_uid(db, "student.a"))
    yield db, plugin_core, fake, loop, admin, student

    handlers.graph = real_graph
    realtime.publish = real_publish
    loop.run_until_complete(db.disconnect())


def _drain(loop, plugin_core):
    """Dispatch until quiet (retries excluded — next_attempt_at is future)."""
    for _ in range(5):
        r = loop.run_until_complete(plugin_core.dispatch_pending(limit=50))
        if r["dispatched"] == 0 and r["failed"] == 0:
            break
    return r


def test_install_ledgered_and_idempotent(ctx):
    db, plugin_core, _, loop, _admin, _student = ctx
    assert loop.run_until_complete(db.fetch_val(
        "select to_regclass('public.msteams_course_team') is not null"))
    rows = loop.run_until_complete(db.fetch_all(
        "select filename from plugin_migration where plugin = 'msteams'"))
    assert [r["filename"] for r in rows] == ["001__msteams_course_team.sql"]
    assert loop.run_until_complete(plugin_core.pending_migrations("msteams")) == []


def test_course_to_team_end_to_end(ctx):
    db, plugin_core, fake, loop, admin, _student = ctx
    from httpx import ASGITransport, AsyncClient
    import main

    async def flow():
        async with AsyncClient(transport=ASGITransport(app=main.app),
                               base_url="http://t") as client:
            resp = await client.post(
                "/api/lms/courses", headers={"X-Acting-User": str(admin)},
                json={"short_name": SHORT, "full_name": "Plugin E2E"})
            assert resp.status_code == 200, resp.text
            return resp.json()["id"]

    course_id = loop.run_until_complete(flow())
    row = loop.run_until_complete(db.fetch_one(
        "select * from plugin_event where event = 'course.created' "
        "and payload->>'course_id' = $1::text", str(course_id)))
    assert row is not None, "emit must land in the outbox with the course"

    _drain(loop, plugin_core)
    mapping = loop.run_until_complete(db.fetch_one(
        "select * from msteams_course_team where course_id = $1", course_id))
    assert mapping["status"] == "ready"
    assert mapping["aad_group_id"] == "team-1"
    assert fake.created == [f"{SHORT} — Plugin E2E"]


def test_enrol_and_unenrol_membership(ctx):
    db, plugin_core, fake, loop, admin, student = ctx
    from app.services import enrolment as enrol_svc

    course_id = loop.run_until_complete(db.fetch_val(
        "select id from course where short_name = $1", SHORT))
    method_id = loop.run_until_complete(db.fetch_val(
        "select id from enrolment_method where course_id = $1 "
        "and method = 'manual'", course_id))

    r = loop.run_until_complete(enrol_svc.enrol_user(
        db, method_id, student, actor_id=admin))
    assert r["ok"], r
    _drain(loop, plugin_core)
    assert ("team-1", "aad-1") in fake.added

    r = loop.run_until_complete(enrol_svc.unenrol_user(
        db, method_id, student, actor_id=admin))
    assert r["ok"] and r["last_path_cleanup"] is True
    _drain(loop, plugin_core)
    assert ("team-1", "aad-1") in fake.removed


def test_disabled_plugin_drops_events(ctx):
    db, plugin_core, fake, loop, _admin, _student = ctx
    loop.run_until_complete(plugin_core.set_enabled("msteams", False))
    created_before = list(fake.created)
    loop.run_until_complete(plugin_core.emit(
        db, "course.created", {"course_id": 999999}))
    _drain(loop, plugin_core)
    assert fake.created == created_before  # handler never ran
    status = loop.run_until_complete(db.fetch_val(
        "select status from plugin_event where payload->>'course_id' = '999999'"))
    assert status == "done"  # dropped, not stuck
    loop.run_until_complete(plugin_core.set_enabled("msteams", True))
