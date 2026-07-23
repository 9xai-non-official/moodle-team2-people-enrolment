"""Tier-a (hermetic) tests for the msteams plugin handlers — graph + db +
realtime all faked. Proves the handler CONTRACTS the outbox relies on:
idempotent re-dispatch, terminal skip on unknown AAD email, last-path-only
removal, retryable raise while the team isn't provisioned.

    cd moodle-replica/backend && python -m pytest tests/test_msteams_handlers.py -q
"""
import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.plugins.msteams import handlers  # noqa: E402

SETTINGS = {
    "tenant_id": "t", "client_id": "c", "client_secret": "s",
    "owner_upn": "owner@tenant.example", "archive_on_delete": True,
    "email_overrides": {"student.a": "real.student@tenant.example"},
}


class FakeDB:
    """Holds the msteams_course_team mapping + a course + a user; answers the
    exact queries the handlers issue (fragment-matched)."""

    def __init__(self, mapping=None, user=None):
        self.mapping = mapping  # dict or None
        self.user = user or {"username": "student.a",
                             "email": "student.a@whocan.local"}
        self.audits = []

    async def fetch_one(self, q, *args):
        q = " ".join(q.split())
        if "from msteams_course_team" in q:
            return dict(self.mapping) if self.mapping else None
        if "from course where id" in q:
            return {"id": args[0], "short_name": "CS101",
                    "full_name": "Intro to CS"}
        if "from app_user where id" in q:
            return dict(self.user)
        raise AssertionError(f"unexpected fetch_one: {q}")

    async def execute(self, q, *args):
        q = " ".join(q.split())
        if "insert into msteams_course_team" in q:
            if self.mapping is None:
                self.mapping = {"course_id": args[0], "aad_group_id": None,
                                "status": "pending", "error": None}
            return
        if "set aad_group_id" in q:
            self.mapping.update(aad_group_id=args[1], status="ready",
                                error=None)
            return
        if "set error" in q:
            self.mapping["error"] = args[1]
            return
        if "set status = 'archived'" in q:
            self.mapping["status"] = "archived"
            return
        raise AssertionError(f"unexpected execute: {q}")

    async def audit(self, event, **kw):
        self.audits.append((event, kw))


class FakeGraph:
    def __init__(self):
        self.created = []
        self.added = []
        self.removed = []
        self.archived = []
        self.users = {"real.student@tenant.example": "aad-123",
                      "owner@tenant.example": "aad-owner"}

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


@pytest.fixture()
def fakes(monkeypatch):
    fdb = FakeDB()
    fgraph = FakeGraph()
    published = []

    async def publish(channel, name, data):
        published.append((channel, name, data))

    monkeypatch.setattr(handlers, "db", fdb)
    monkeypatch.setattr(handlers, "graph", fgraph)
    monkeypatch.setattr(handlers.realtime, "publish", publish)
    return fdb, fgraph, published


READY = {"course_id": 3, "aad_group_id": "team-1", "status": "ready",
         "error": None}


def test_course_created_twice_creates_one_team(fakes):
    fdb, fgraph, published = fakes
    asyncio.run(handlers.on_course_created({"course_id": 3}, SETTINGS))
    asyncio.run(handlers.on_course_created({"course_id": 3}, SETTINGS))
    assert fgraph.created == ["CS101 — Intro to CS"]
    assert fdb.mapping["status"] == "ready"
    assert ("course:3", "msteams.status") == published[-1][:2]
    assert published[-1][2]["status"] == "ready"


def test_enrolment_created_unknown_email_is_terminal_skip(fakes):
    fdb, fgraph, _ = fakes
    fdb.mapping = dict(READY)
    fdb.user = {"username": "student.b", "email": "fake@whocan.local"}
    asyncio.run(handlers.on_enrolment_created(
        {"course_id": 3, "user_id": 12}, SETTINGS))  # must NOT raise
    assert fgraph.added == []
    assert fdb.audits and fdb.audits[0][0] == "msteams.member_skipped"


def test_enrolment_created_override_maps_to_aad(fakes):
    fdb, fgraph, _ = fakes
    fdb.mapping = dict(READY)
    asyncio.run(handlers.on_enrolment_created(
        {"course_id": 3, "user_id": 10}, SETTINGS))
    assert fgraph.added == [("team-1", "aad-123")]


def test_enrolment_created_team_not_ready_is_retryable(fakes):
    fdb, _, _ = fakes
    fdb.mapping = None
    with pytest.raises(RuntimeError):
        asyncio.run(handlers.on_enrolment_created(
            {"course_id": 3, "user_id": 10}, SETTINGS))


def test_enrolment_deleted_not_last_path_keeps_member(fakes):
    fdb, fgraph, _ = fakes
    fdb.mapping = dict(READY)
    asyncio.run(handlers.on_enrolment_deleted(
        {"course_id": 3, "user_id": 10, "last_path": False}, SETTINGS))
    assert fgraph.removed == []


def test_enrolment_deleted_last_path_removes_member(fakes):
    fdb, fgraph, _ = fakes
    fdb.mapping = dict(READY)
    asyncio.run(handlers.on_enrolment_deleted(
        {"course_id": 3, "user_id": 10, "last_path": True}, SETTINGS))
    assert fgraph.removed == [("team-1", "aad-123")]


def test_course_deleted_archives_when_ready(fakes):
    fdb, fgraph, published = fakes
    fdb.mapping = dict(READY)
    asyncio.run(handlers.on_course_deleted({"course_id": 3}, SETTINGS))
    assert fgraph.archived == ["team-1"]
    assert fdb.mapping["status"] == "archived"


def test_course_deleted_respects_archive_setting(fakes):
    fdb, fgraph, _ = fakes
    fdb.mapping = dict(READY)
    asyncio.run(handlers.on_course_deleted(
        {"course_id": 3}, {**SETTINGS, "archive_on_delete": False}))
    assert fgraph.archived == []
