"""Tier-a (hermetic, no DB) tests for the plugin framework core:
manifest validation, transactional emit, dispatch routing/backoff/dead,
and settings masking/merging. Runs everywhere: no DATABASE_URL needed.

    cd moodle-replica/backend && python -m pytest tests/test_plugin_core.py -q
"""
import asyncio
import os
import sys
import types
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services import plugin_core  # noqa: E402


def _fake_plugin(name="fake", events=None, handlers=None, schema=None):
    mod = types.ModuleType(f"app.plugins.{name}")
    mod.MANIFEST = {
        "name": name, "version": "1.0.0",
        "events": events if events is not None else ["course.created"],
        "settings_schema": schema or [],
    }
    mod.HANDLERS = handlers if handlers is not None else {}
    return mod


# ---------------------------------------------------------------------------
# validate_manifest
# ---------------------------------------------------------------------------
def test_msteams_manifest_is_valid():
    from app.plugins import msteams
    assert plugin_core.validate_manifest(msteams) == []


def test_manifest_missing_keys_rejected():
    mod = types.ModuleType("app.plugins.broken")
    mod.MANIFEST = {"name": "broken"}
    mod.HANDLERS = {}
    problems = plugin_core.validate_manifest(mod)
    assert any("version" in p for p in problems)
    assert any("events" in p for p in problems)


def test_handler_without_event_rejected():
    async def h(payload, settings):
        pass
    mod = _fake_plugin(events=["course.created"],
                       handlers={"enrolment.created": h})
    problems = plugin_core.validate_manifest(mod)
    assert any("enrolment.created" in p for p in problems)


def test_bad_settings_field_type_rejected():
    mod = _fake_plugin(schema=[{"key": "x", "type": "dropdown"}])
    assert any("dropdown" in p for p in plugin_core.validate_manifest(mod))


# ---------------------------------------------------------------------------
# emit — records the INSERT on whatever executes it (conn or module)
# ---------------------------------------------------------------------------
class FakeConn:
    def __init__(self):
        self.executed = []

    async def execute(self, q, *args):
        self.executed.append((" ".join(q.split()), args))

    async def fetchrow(self, q, *args):  # marks this as a "conn" for adapters
        return None


def test_emit_inserts_into_outbox():
    conn = FakeConn()
    asyncio.run(plugin_core.emit(conn, "course.created", {"course_id": 7}))
    assert len(conn.executed) == 1
    q, args = conn.executed[0]
    assert "insert into plugin_event" in q
    assert args[0] == "course.created"
    assert '"course_id": 7' in args[1]


# ---------------------------------------------------------------------------
# route_handlers — enabled + subscribed only
# ---------------------------------------------------------------------------
def test_route_handlers_enabled_and_subscribed_only():
    async def h(payload, settings):
        pass
    subscribed = _fake_plugin("subscribed",
                              handlers={"course.created": h})
    other = _fake_plugin("other", events=["course.deleted"], handlers={})
    reg = {"subscribed": subscribed, "other": other,
           "disabled": _fake_plugin("disabled",
                                    handlers={"course.created": h})}
    enabled = {"subscribed": {"k": 1}, "other": {}}  # 'disabled' not enabled
    routed = plugin_core.route_handlers("course.created", enabled, reg)
    assert [settings for _, settings in routed] == [{"k": 1}]


# ---------------------------------------------------------------------------
# dispatch_pending — done / backoff / dead, via a fake db module
# ---------------------------------------------------------------------------
class FakeDispatchConn:
    """Emulates the exact queries dispatch_pending issues, holding one
    outbox row whose attempts/status evolve like the real UPDATE would."""

    def __init__(self, row, enabled_rows):
        self.row = row
        self.enabled_rows = enabled_rows
        self.done_ids = []

    async def fetch(self, q, *args):
        q = " ".join(q.split())
        if "from plugin_event" in q:
            return [self.row] if self.row["status"] == "pending" else []
        if "from plugin where enabled" in q:
            return self.enabled_rows
        raise AssertionError(f"unexpected fetch: {q}")

    async def execute(self, q, *args):
        if "status = 'done'" in q:
            self.row["status"] = "done"
            self.done_ids.append(args[0])

    async def fetchrow(self, q, *args):
        q = " ".join(q.split())
        if "attempts = attempts + 1" in q:
            self.row["attempts"] += 1
            max_attempts = args[2]
            if self.row["attempts"] >= max_attempts:
                self.row["status"] = "dead"
            return {"attempts": self.row["attempts"],
                    "status": self.row["status"]}
        raise AssertionError(f"unexpected fetchrow: {q}")


def _fake_db_module(conn):
    fake = types.SimpleNamespace()
    fake.connected = lambda: True

    @asynccontextmanager
    async def transaction():
        yield conn

    fake.transaction = transaction

    async def audit(*a, **k):
        pass

    fake.audit = audit
    return fake


def _run_dispatch(monkeypatch, row, plugin_mod, enabled, conn=None):
    conn = conn or FakeDispatchConn(row, enabled)
    monkeypatch.setattr(plugin_core, "db", _fake_db_module(conn))
    monkeypatch.setattr(plugin_core, "registry",
                        lambda: {plugin_mod.MANIFEST["name"]: plugin_mod})
    result = asyncio.run(plugin_core.dispatch_pending())
    return result, conn


def test_dispatch_success_marks_done(monkeypatch):
    calls = []

    async def h(payload, settings):
        calls.append((payload, settings))

    mod = _fake_plugin(handlers={"course.created": h})
    row = {"id": 1, "event": "course.created",
           "payload": '{"course_id": 3}', "status": "pending", "attempts": 0}
    enabled = [{"name": "fake", "settings": '{"a": 1}'}]
    result, conn = _run_dispatch(monkeypatch, row, mod, enabled)
    assert result == {"dispatched": 1, "failed": 0}
    assert calls == [({"course_id": 3}, {"a": 1})]
    assert row["status"] == "done"


def test_dispatch_no_subscriber_drops_event(monkeypatch):
    mod = _fake_plugin(handlers={})
    row = {"id": 2, "event": "course.created", "payload": "{}",
           "status": "pending", "attempts": 0}
    result, _ = _run_dispatch(monkeypatch, row, mod, enabled=[])
    assert result == {"dispatched": 1, "failed": 0}
    assert row["status"] == "done"  # disabled plugin ⇒ events drop, not queue


def test_dispatch_failure_backs_off_then_dead(monkeypatch):
    async def h(payload, settings):
        raise RuntimeError("graph down")

    mod = _fake_plugin(handlers={"course.created": h})
    row = {"id": 3, "event": "course.created", "payload": "{}",
           "status": "pending", "attempts": 0}
    enabled = [{"name": "fake", "settings": "{}"}]

    result, _ = _run_dispatch(monkeypatch, row, mod, enabled)
    assert result == {"dispatched": 0, "failed": 1}
    assert row["status"] == "pending" and row["attempts"] == 1

    row["attempts"] = plugin_core.MAX_ATTEMPTS - 1
    result, _ = _run_dispatch(monkeypatch, row, mod, enabled)
    assert row["status"] == "dead"


# ---------------------------------------------------------------------------
# settings masking + merging
# ---------------------------------------------------------------------------
SCHEMA = [
    {"key": "tenant", "type": "text", "required": True},
    {"key": "secret", "type": "text", "required": True, "secret": True},
    {"key": "flag", "type": "bool", "default": True},
    {"key": "overrides", "type": "json", "default": {}},
    {"key": "n", "type": "number"},
]


def test_mask_settings_hides_secret_values():
    masked = plugin_core.mask_settings(
        SCHEMA, {"tenant": "t1", "secret": "hunter2"})
    assert masked["secret"] == {"set": True}
    assert masked["tenant"] == "t1"
    assert masked["flag"] is True  # default surfaces


def test_merge_settings_round_trip_keeps_omitted_secret():
    stored = {"tenant": "t1", "secret": "hunter2"}
    merged = plugin_core.merge_settings(
        SCHEMA, stored, {"tenant": "t2", "secret": ""})
    assert merged["secret"] == "hunter2"  # blank secret = keep
    assert merged["tenant"] == "t2"


def test_merge_settings_validates():
    import pytest
    with pytest.raises(ValueError):
        plugin_core.merge_settings(SCHEMA, {}, {"nope": 1})  # unknown key
    with pytest.raises(ValueError):
        plugin_core.merge_settings(SCHEMA, {"secret": "s"},
                                   {"tenant": "t", "flag": "yes"})  # bad bool
    with pytest.raises(ValueError):
        plugin_core.merge_settings(SCHEMA, {"secret": "s"},
                                   {"tenant": "t", "overrides": "{bad"})
    with pytest.raises(ValueError):
        plugin_core.merge_settings(SCHEMA, {}, {"tenant": "t"})  # secret req'd
    merged = plugin_core.merge_settings(
        SCHEMA, {"secret": "s"},
        {"tenant": "t", "overrides": '{"u": "x@y.z"}', "n": 5})
    assert merged["overrides"] == {"u": "x@y.z"}
