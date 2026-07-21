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
import os
import sys

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
