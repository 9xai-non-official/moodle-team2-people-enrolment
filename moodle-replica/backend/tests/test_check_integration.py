"""Integration test for the async check() wiring, using an in-memory FakeDB.

There is no live Postgres in this environment (credentials were removed from the
repo), so this harness canned-answers the exact queries _gather() issues and
verifies that check() assembles the CheckInput facts correctly and produces the
right gated verdict. The pure resolver logic itself is covered by
test_permissions.py; this proves the DB-layer plumbing on top of it.

Scenario: KROL-009 / reference scenario 3 — a non-editing teacher (TA) grading a
student in a DIFFERENT group under separate-groups mode, with no accessallgroups
row. Capability resolves ALLOW; the group gate denies. That simultaneous
"capability green, group red" is the whole point of the project.
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services import permissions  # noqa: E402


class FakeDB:
    """Answers only the queries _gather()/check() actually issue, keyed by
    distinctive SQL fragments + args. Whitespace-normalized matching."""

    def __init__(self, *, access_all_groups_row=False, target_group="B"):
        self.access_all_groups_row = access_all_groups_row
        self.target_group = target_group
        self.inserted = []

    def _norm(self, q):
        return " ".join(q.split())

    async def fetch_one(self, q, *a):
        q = self._norm(q)
        if "from app_user where id=$1" in q:
            return {"id": a[0], "username": "teacher.a", "suspended": False, "deleted_at": None}
        if "from capability where name=$1" in q:
            return {"name": a[0], "cap_type": "write", "min_context_level": "activity", "risks": []}
        if "from context where id=$1" in q and "any" not in q:
            return {"id": 9, "level": "activity", "instance_id": 4, "path": "/1/3/9", "depth": 3}
        if "from role where short_name='user'" in q:
            return None  # no 'user' role seeded -> virtual role synthesized
        if "select short_name from role where id=$1" in q:
            return {"short_name": "teacher"}
        if "enrolled from v_course_participant" in q:
            return {"enrolled": True}
        if "group_mode, force_group_mode from course where id=$1" in q:
            return {"group_mode": "separate", "force_group_mode": False}
        if "group_mode from course_activity where id=$1" in q:
            return {"group_mode": None}  # inherit course
        if "visible, deleted_at from course_activity where id=$1" in q:
            return {"visible": True, "deleted_at": None}
        if "insert into permission_decision" in q:
            self.inserted.append(a)
            return {"id": 1}
        return None

    async def fetch_all(self, q, *a):
        q = self._norm(q)
        if "from context where id = any" in q:
            return [
                {"id": 9, "level": "activity", "instance_id": 4},
                {"id": 3, "level": "course", "instance_id": 1},
                {"id": 1, "level": "system", "instance_id": 0},
            ]
        if "from role_assignment ra join role r on r.id = ra.role_id" in q:
            # actor holds the non-editing teacher role (id 30) at the course ctx (3)
            return [{"role_id": 30, "short_name": "teacher", "context_id": 3, "component": ""}]
        if "from role_capability where capability=$1" in q:
            cap = a[0]
            if cap == "activity:grade":
                return [{"role_id": 30, "context_id": 1, "permission": "allow"}]
            if cap == "course:view":
                return [{"role_id": 30, "context_id": 1, "permission": "allow"}]
            if cap == "site:accessallgroups":
                return ([{"role_id": 30, "context_id": 1, "permission": "allow"}]
                        if self.access_all_groups_row else [])
            return []
        if "from v_enrolment_detail" in q:
            return [{"kind": "manual", "status": "active", "window_ok": True}]
        if "group_member gm join course_group" in q:
            user_id = a[0]
            return [{"name": "A"}] if user_id == 3 else [{"name": self.target_group}]
        if "create table if not exists permission_decision" in q:
            return []
        return []


def test_ta_cross_group_denied_but_capability_allow_via_async_check():
    db = FakeDB(access_all_groups_row=False, target_group="B")
    res = asyncio.run(permissions.check(
        db, actor_id=3, capability="activity:grade", context_id=9,
        target_id=5, activity_id=4,
    ))
    assert res["allowed"] is False and res["decision"] == "DENY"
    assert res["capability_values"]["teacher"]["value"] == "allow"
    assert res["group_scope"]["mode"] == "separate"
    assert res["group_scope"]["shared"] is False
    assert res["group_scope"]["access_all_groups"] is False
    assert any("group" in r.lower() for r in res["blocking_reasons"])
    # the virtual 'user' role was synthesized and considered
    assert any(r["role"] == "user" for r in res["roles_considered"])
    # the decision was logged (best-effort audit)
    assert db.inserted, "expected a permission_decision insert"


def test_simulated_role_labeled_at_previewed_context():
    # Review finding 2: a simulated role must be labeled at the previewed (leaf)
    # context, not the system root.
    db = FakeDB(target_group="A")
    res = asyncio.run(permissions.check(
        db, actor_id=3, capability="activity:grade", context_id=9, simulate_role=30,
    ))
    sim = [r for r in res["roles_considered"] if "simulated" in (r.get("provenance") or "")]
    assert sim and sim[0]["context"] == "activity:4"
    assert res["simulated_role"] is not None


def test_ta_same_group_allowed_via_async_check():
    db = FakeDB(access_all_groups_row=False, target_group="A")  # target now in group A
    res = asyncio.run(permissions.check(
        db, actor_id=3, capability="activity:grade", context_id=9,
        target_id=5, activity_id=4,
    ))
    assert res["allowed"] is True and res["decision"] == "ALLOW"
    assert res["group_scope"]["shared"] is True


def test_ta_cross_group_allowed_when_accessallgroups_present():
    db = FakeDB(access_all_groups_row=True, target_group="B")
    res = asyncio.run(permissions.check(
        db, actor_id=3, capability="activity:grade", context_id=9,
        target_id=5, activity_id=4,
    ))
    assert res["allowed"] is True
    assert res["group_scope"]["access_all_groups"] is True


ROLE_ID = {"manager": 10, "editingteacher": 20, "teacher": 30, "student": 40, "guest": 50}
ID_ROLE = {v: k for k, v in ROLE_ID.items()}
SORT = {"manager": 1, "editingteacher": 2, "teacher": 3, "student": 4, "guest": 5}


class FakeAssignDB:
    """Actor holds `actor_role` at a course context. Verifies the assignable
    matrix, the role:assign capability gate, admin handling, and the write-path
    authorization on assign_role()."""

    def __init__(self, actor_role="editingteacher", has_role_assign=True, admin=False):
        self.actor_role = actor_role
        self.has_role_assign = has_role_assign
        self.admin = admin
        self.inserted = []

    def _norm(self, q):
        return " ".join(q.split())

    async def fetch_one(self, q, *a):
        q = self._norm(q)
        if "from app_user where id=$1" in q:
            username = "admin1" if self.admin else "u.actor"
            return {"id": a[0], "username": username, "suspended": False, "deleted_at": None}
        if "from capability where name=$1" in q:
            return {"name": a[0], "cap_type": "write", "min_context_level": "course",
                    "risks": ["spam", "personal"]}
        if "from context where id=$1" in q and "any" not in q:
            return {"id": 3, "level": "course", "instance_id": 1, "path": "/1/3", "depth": 2}
        if "from role where short_name='user'" in q:
            return None
        if "select short_name from role where id=$1" in q:
            return {"short_name": ID_ROLE.get(a[0], "unknown")}
        if "insert into role_assignment" in q:
            self.inserted.append(a)
            return {"id": 99, "user_id": a[0], "role_id": a[1], "context_id": a[2],
                    "component": "", "assigned_by": a[3], "assigned_at": None}
        return None

    async def fetch_all(self, q, *a):
        q = self._norm(q)
        if "from context where id = any" in q:
            return [{"id": 3, "level": "course", "instance_id": 1},
                    {"id": 1, "level": "system", "instance_id": 0}]
        if "select short_name from role order by sort_order" in q:
            return [{"short_name": r} for r in ["manager", "editingteacher", "teacher", "student", "guest"]]
        if "distinct r.short_name, r.sort_order" in q:
            return [{"short_name": self.actor_role, "sort_order": SORT[self.actor_role]}]
        if "from role_assignment ra join role r on r.id = ra.role_id" in q:
            return [{"role_id": ROLE_ID[self.actor_role], "short_name": self.actor_role,
                     "context_id": 3, "component": ""}]
        if "from role_capability where capability=$1" in q:
            return ([{"role_id": ROLE_ID[self.actor_role], "context_id": 1, "permission": "allow"}]
                    if (a[0] == "role:assign" and self.has_role_assign) else [])
        return []


def test_editingteacher_assignable_roles_limited_to_teacher_and_student():
    db = FakeAssignDB(actor_role="editingteacher")
    res = asyncio.run(permissions.assignable_roles(db, actor_id=7, context_id=3))
    assert res["matrix"] == "hardcoded default"
    assert res["can_assign"] is True
    assert res["based_on_role"] == "editingteacher"
    assert res["assignable"] == ["teacher", "student"]  # never editingteacher itself (C-18)


def test_manager_assignable_includes_manager_at_course():
    db = FakeAssignDB(actor_role="manager")
    res = asyncio.run(permissions.assignable_roles(db, actor_id=7, context_id=3))
    assert "manager" in res["assignable"]  # C-16: manager assignable at course
    assert res["assignable"] == ["manager", "editingteacher", "teacher", "student"]


def test_no_role_assign_capability_means_empty_assignable():
    db = FakeAssignDB(actor_role="editingteacher", has_role_assign=False)
    res = asyncio.run(permissions.assignable_roles(db, actor_id=7, context_id=3))
    assert res["can_assign"] is False
    assert res["assignable"] == []


def test_admin_assignable_roles_lists_all_roles():
    # Review finding 3/9: admin (config list, not a role) must not get
    # can_assign=True with an empty list.
    db = FakeAssignDB(actor_role="student", admin=True)
    res = asyncio.run(permissions.assignable_roles(db, actor_id=1, context_id=3))
    assert res["can_assign"] is True
    assert res["assignable"], "admin must be able to assign roles"
    assert "manager" in res["assignable"]


def test_assign_role_rejects_privilege_escalation():
    # Review finding 7 (HIGH): the write path must enforce role:assign, not just
    # the read-only matrix endpoint. A student cannot self-promote to manager.
    db = FakeAssignDB(actor_role="student", has_role_assign=False)
    import pytest
    with pytest.raises(PermissionError):
        asyncio.run(permissions.assign_role(
            db, user_id=50, role_id=ROLE_ID["manager"], context_id=3, actor_id=50))
    assert db.inserted == [], "no assignment row should be written on refusal"


def test_assign_role_rejects_role_outside_matrix():
    # editingteacher HAS role:assign but may not assign manager (C-18).
    db = FakeAssignDB(actor_role="editingteacher", has_role_assign=True)
    import pytest
    with pytest.raises(PermissionError):
        asyncio.run(permissions.assign_role(
            db, user_id=50, role_id=ROLE_ID["manager"], context_id=3, actor_id=7))
    assert db.inserted == []


def test_assign_role_allows_permitted_role():
    db = FakeAssignDB(actor_role="editingteacher", has_role_assign=True)
    res = asyncio.run(permissions.assign_role(
        db, user_id=50, role_id=ROLE_ID["student"], context_id=3, actor_id=7))
    assert res["created"] is True
    assert db.inserted, "assignment row should be written"


class FakeDecisionsDB:
    async def fetch_all(self, q, *a):
        # asyncpg returns jsonb as a str when no codec is registered.
        return [{"id": 1, "actor_id": 3, "capability": "activity:grade", "context_id": 9,
                 "target_id": 5, "allowed": False,
                 "reasons": '{"allowed": false, "decision": "DENY"}', "decided_at": None}]

    async def fetch_one(self, q, *a):
        return None


def test_decisions_decodes_reasons_json():
    # Review finding 5: reasons must come back as an object, not a JSON string.
    db = FakeDecisionsDB()
    rows = asyncio.run(permissions.decisions(db, actor_id=None, limit=10))
    assert isinstance(rows[0]["reasons"], dict)
    assert rows[0]["reasons"]["decision"] == "DENY"


class FakeDecisionsJoinDB:
    """A row as the joined Decision-Log query returns it: the audit row plus the
    actor's name and the context's level/instance."""

    async def fetch_all(self, q, *a):
        return [{
            "id": 7, "actor_id": 3, "capability": "activity:grade", "context_id": 9,
            "target_id": 5, "allowed": False,
            "reasons": json.dumps({
                "allowed": False, "decision": "DENY",
                "blocking_reasons": ["Target is outside the actor's allowed groups"],
                "supporting_reasons": ["Capability 'activity:grade': allowed by role teacher"],
            }),
            "decided_at": datetime(2026, 7, 23, 5, 30, tzinfo=timezone.utc),
            "actor_name": "Tariq Assist", "ctx_level": "activity", "ctx_instance": 4,
        }]

    async def fetch_one(self, q, *a):
        return None


def test_decisions_row_carries_what_the_decision_log_renders():
    # The Decision Log tab reads actor.full_name / context_label / verdict /
    # created_at / reason lines / replay inputs. Serving raw audit columns made
    # the tab throw on the first row, so the endpoint owns that shape.
    rows = asyncio.run(permissions.decisions(FakeDecisionsJoinDB(), limit=10))
    r = rows[0]
    assert r["actor"] == {"id": 3, "full_name": "Tariq Assist"}
    assert r["context_label"] == "activity:4"
    assert r["verdict"] == "denied"
    assert r["created_at"] == "2026-07-23T05:30:00+00:00"
    assert r["blocking_reasons"] == ["Target is outside the actor's allowed groups"]
    assert r["supporting_reasons"] == ["Capability 'activity:grade': allowed by role teacher"]
    # Replay re-runs the stored check from these inputs.
    assert r["inputs"] == {"actor_id": 3, "capability": "activity:grade",
                           "context_id": 9, "target_user_id": 5}
    assert isinstance(r["reasons"], dict)  # full stored evidence stays available


def test_decisions_row_survives_a_missing_actor_or_context():
    # Left joins: a decision about a since-deleted user must still render.
    class Sparse(FakeDecisionsJoinDB):
        async def fetch_all(self, q, *a):
            rows = await FakeDecisionsJoinDB.fetch_all(self, q, *a)
            rows[0].update(actor_name=None, ctx_level=None, ctx_instance=None,
                           allowed=True, decided_at=None)
            return rows

    r = asyncio.run(permissions.decisions(Sparse(), limit=10))[0]
    assert r["actor"]["full_name"] == "user 3"
    assert r["context_label"] == "context 9"
    assert r["verdict"] == "allowed"
    assert r["created_at"] is None


# ===========================================================================
# WP04 · Authentication (app/services/auth.py) — the acting principal must come
# from a VERIFIED credential, never a request field. Pure verifier unit tests
# (no app, no DB).
# ===========================================================================
from app.services import auth  # noqa: E402


def test_hmac_token_roundtrip_yields_principal():
    v = auth.HmacTokenVerifier("s3cret")
    tok = auth.issue_token(42, secret="s3cret", username="teacher.a")
    p = v.verify(tok)
    assert p is not None and p.user_id == 42 and p.username == "teacher.a"


def test_tampered_token_is_rejected():
    v = auth.HmacTokenVerifier("s3cret")
    tok = auth.issue_token(42, secret="s3cret")
    payload_b64, sig = tok.rsplit(".", 1)
    forged = auth.issue_token(999, secret="s3cret").split(".", 1)[0] + "." + sig
    assert v.verify(forged) is None  # signature no longer matches the payload


def test_wrong_secret_is_rejected():
    tok = auth.issue_token(42, secret="s3cret")
    assert auth.HmacTokenVerifier("different").verify(tok) is None


def test_missing_secret_authenticates_nobody():
    # Fail-closed: with no AUTH_SECRET the default verifier rejects everything
    # rather than falling open.
    tok = auth.issue_token(42, secret="s3cret")
    assert auth.HmacTokenVerifier(None).verify(tok) is None


def test_expired_token_is_rejected():
    v = auth.HmacTokenVerifier("s3cret")
    tok = auth.issue_token(42, secret="s3cret", ttl_seconds=-1)
    assert v.verify(tok) is None


def test_garbage_credentials_are_rejected():
    v = auth.HmacTokenVerifier("s3cret")
    assert v.verify("") is None
    assert v.verify("not-a-token") is None
    assert v.verify("a.b.c.d") is None


def test_non_ascii_credential_fails_closed_without_raising():
    # Review finding: Starlette decodes header bytes as latin-1, so a crafted
    # `Authorization: Bearer é.abc` reaches verify() with non-ASCII code points.
    # Must fail-closed (return None), never raise (which would surface as a 500).
    v = auth.HmacTokenVerifier("s3cret")
    assert v.verify("é.abc") is None       # non-ASCII payload segment
    assert v.verify("abc.é") is None       # non-ASCII signature segment
    assert v.verify("\x80\x81.\x82") is None


# ===========================================================================
# WP04 · No mutation (or the /check endpoint) may run without a verified
# credential. Every protected route → 401 when unauthenticated. Hermetic:
# DATABASE_URL is cleared so no live connection is attempted; auth runs first.
# ===========================================================================
import os as _os  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402  (import runs app.db.load_dotenv())

_os.environ.pop("DATABASE_URL", None)  # keep hermetic AFTER import (load_dotenv ran)
_client = TestClient(app)

# Bodies are valid so the ONLY thing missing is the credential → deterministic 401.
_PROTECTED = [
    ("post", "/api/permissions/check",
     {"actor_user_id": 1, "capability": "course:view", "context_id": 1}),
    ("post", "/api/roles", {"short_name": "x", "name": "X"}),
    ("post", "/api/roles/1/clone", {"short_name": "x", "name": "X"}),
    ("put", "/api/roles/1/capabilities",
     {"context_id": 1, "capability": "course:view", "permission": "allow"}),
    ("post", "/api/roles/assignments", {"user_id": 1, "role_id": 1, "context_id": 1}),
    ("delete", "/api/roles/assignments/1", None),
    ("get", "/api/roles/assignable?context_id=1", None),
]


def test_protected_routes_require_authentication():
    for method, url, body in _PROTECTED:
        resp = getattr(_client, method)(url, **({"json": body} if body is not None else {}))
        assert resp.status_code == 401, f"{method.upper()} {url} → {resp.status_code}, expected 401"


# ===========================================================================
# WP04 · Authorization on every mutating action. A caller lacking the required
# capability → PermissionError (the router maps it to 403) and NO row is written.
# Admin (config-list identity) bypasses via require_capability. A bad capability
# name in set_override is a ValueError (→400), never a 500.
# ===========================================================================
import pytest  # noqa: E402


class FakeMutDB:
    """Captures every write statement and canned-answers the reads a mutation
    issues. `admin` decides whether the actor is a site admin (which bypasses
    require_capability). `capability_known` toggles the capability catalogue."""

    def __init__(self, *, admin=False, capability_known=True, assignment=None, suspended=False):
        self.admin = admin
        self.capability_known = capability_known
        self.assignment = assignment
        self.suspended = suspended
        self.writes = []  # (verb, normalized_sql, args)

    def _norm(self, q):
        return " ".join(q.split())

    def _record(self, n, a):
        head = n.strip().split(" ", 1)[0].lower()
        if head in ("insert", "delete", "update"):
            self.writes.append((head, n, a))

    def wrote(self, fragment):
        return any(fragment in n for _, n, _ in self.writes)

    async def fetch_one(self, q, *a):
        n = self._norm(q)
        self._record(n, a)
        if "from app_user where id=$1" in n:
            return {"id": a[0], "username": "admin1" if self.admin else "u.actor",
                    "suspended": self.suspended, "deleted_at": None}
        if "from capability where name=$1" in n:
            return ({"name": a[0], "cap_type": "write", "min_context_level": "course",
                     "risks": []} if self.capability_known else None)
        if "from context where level='system'" in n:
            return {"id": 1}
        if "select archetype from role where id=$1" in n:
            return {"archetype": "teacher"}
        if "select short_name from role where id=$1" in n:
            return {"short_name": "teacher"}
        if "from role_assignment where id=$1" in n:
            return self.assignment
        if n.startswith("insert into role_capability"):
            return {"id": 88, "role_id": a[0], "context_id": a[1], "capability": a[2],
                    "permission": a[3] if len(a) > 3 else "allow"}
        if n.startswith("insert into role_assignment"):
            return {"id": 99, "user_id": a[0], "role_id": a[1], "context_id": a[2],
                    "component": "", "assigned_by": a[3], "assigned_at": None}
        if n.startswith("insert into role "):
            return {"id": 77, "short_name": a[0], "name": a[1], "description": a[2],
                    "archetype": a[3], "sort_order": 9}
        if n.startswith("delete from role_assignment"):
            return {"id": a[0]}
        if n.startswith("delete from role_capability"):
            return {"id": 88}
        if "insert into audit_log" in n or "insert into permission_decision" in n:
            return {"id": 1}
        return None

    async def fetch_all(self, q, *a):
        n = self._norm(q)
        self._record(n, a)
        if n.startswith("insert into role_capability"):  # clone copies rows here
            return [{"id": 1}]
        return []


def _deny_capability(monkeypatch):
    async def deny(*a, **k):
        return False
    monkeypatch.setattr(permissions, "has_capability", deny)


def test_set_override_denied_without_capability_writes_nothing(monkeypatch):
    _deny_capability(monkeypatch)
    db = FakeMutDB(admin=False)
    with pytest.raises(PermissionError):
        asyncio.run(permissions.set_override(db, 30, 3, "activity:grade", "allow", actor_id=7))
    assert not db.wrote("insert into role_capability")


def test_create_role_denied_without_capability_writes_nothing(monkeypatch):
    _deny_capability(monkeypatch)
    db = FakeMutDB(admin=False)
    with pytest.raises(PermissionError):
        asyncio.run(permissions.create_role(db, "ta2", "TA2", "", "teacher", actor_id=7))
    assert not db.wrote("insert into role ")


def test_clone_role_denied_without_capability_writes_nothing(monkeypatch):
    _deny_capability(monkeypatch)
    db = FakeMutDB(admin=False)
    with pytest.raises(PermissionError):
        asyncio.run(permissions.clone_role(db, 30, "ta2", "TA2", "", actor_id=7))
    assert not db.wrote("insert into role ")


def test_unassign_role_denied_without_capability_writes_nothing(monkeypatch):
    _deny_capability(monkeypatch)
    db = FakeMutDB(admin=False,
                   assignment={"id": 5, "user_id": 50, "role_id": 30, "context_id": 3, "component": ""})
    with pytest.raises(PermissionError):
        asyncio.run(permissions.unassign_role(db, 5, actor_id=7))
    assert not db.wrote("delete from role_assignment")


def test_unassign_role_refuses_enrolment_owned_row():
    # The existing refusal of enrol_%-owned rows must survive (403), even for admin.
    db = FakeMutDB(admin=True,
                   assignment={"id": 5, "user_id": 50, "role_id": 30, "context_id": 3,
                               "component": "enrol_cohort"})
    with pytest.raises(PermissionError):
        asyncio.run(permissions.unassign_role(db, 5, actor_id=1))
    assert not db.wrote("delete from role_assignment")


def test_set_override_unknown_capability_is_validation_error():
    # admin bypasses authorization; a bad capability name must be a ValueError
    # (router → 400), never an uncaught FK 500.
    db = FakeMutDB(admin=True, capability_known=False)
    with pytest.raises(ValueError):
        asyncio.run(permissions.set_override(db, 30, 3, "bogus:cap", "allow", actor_id=1))
    assert not db.wrote("insert into role_capability")


def test_admin_can_create_role_and_writes_audit():
    db = FakeMutDB(admin=True)
    res = asyncio.run(permissions.create_role(db, "ta2", "TA2", "", "teacher", actor_id=1))
    assert res["id"] == 77
    assert db.wrote("insert into role ")
    assert db.wrote("insert into audit_log")


def test_admin_can_unassign_manual_row_and_writes_audit():
    db = FakeMutDB(admin=True,
                   assignment={"id": 5, "user_id": 50, "role_id": 30, "context_id": 3, "component": ""})
    res = asyncio.run(permissions.unassign_role(db, 5, actor_id=1))
    assert res["deleted"] is True
    assert db.wrote("delete from role_assignment")
    assert db.wrote("insert into audit_log")


def test_suspended_actor_cannot_mutate_even_as_admin():
    # Review findings: account state (suspended) must block the write path BEFORE
    # the admin bypass, mirroring build_decision gate 1. No row is written.
    db = FakeMutDB(admin=True, suspended=True)
    with pytest.raises(PermissionError):
        asyncio.run(permissions.create_role(db, "x", "X", "", "teacher", actor_id=1))
    assert not db.wrote("insert into role ")
    with pytest.raises(PermissionError):
        asyncio.run(permissions.set_override(db, 1, 3, "activity:grade", "allow", actor_id=1))
    assert not db.wrote("insert into role_capability")
    db2 = FakeMutDB(admin=True, suspended=True,
                    assignment={"id": 5, "user_id": 50, "role_id": 30, "context_id": 3, "component": ""})
    with pytest.raises(PermissionError):
        asyncio.run(permissions.unassign_role(db2, 5, actor_id=1))
    assert not db2.wrote("delete from role_assignment")


def test_suspended_actor_has_no_capability():
    db = FakeMutDB(admin=False, suspended=True)
    assert asyncio.run(permissions.has_capability(db, 7, "role:override", 3)) is False


def test_suspended_actor_cannot_assign_role():
    db = FakeMutDB(admin=True, suspended=True)
    with pytest.raises(PermissionError):
        asyncio.run(permissions.assign_role(db, user_id=50, role_id=40, context_id=3, actor_id=1))
    assert not db.wrote("insert into role_assignment")
