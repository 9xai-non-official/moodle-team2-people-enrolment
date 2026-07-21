"""Unit tests for the permission resolver — Khaled / Team 2 (Roles & Permissions).

These are the load-bearing tests: the ten §8.4 conflict cases plus the gate
pipeline. They exercise the *pure* resolver core (no DB, no network) so they
run anywhere `pytest` is installed — the resolver deliberately separates policy
(pure functions) from I/O (async asyncpg layer).

Ground rules encoded here (from the task brief + Moodle's lib/accesslib.php,
confirmed against the in-DB fn_can and the team's own findings docs):
  * "not set" = absence of a role_capability row = INHERIT, never deny.
  * Within one role, the MOST-SPECIFIC row on the context path wins...
  * ...EXCEPT prohibit, which is sticky: once a held role has prohibit anywhere
    on the path, no deeper allow can switch it back.
  * Across roles, ANY allow wins (C-11: a PREVENT in one role does NOT cancel an
    ALLOW in another). Only PROHIBIT is an absolute, un-overridable veto.
"""
import os
import sys

# Make the `app` package importable when pytest is run from repo root or backend/.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.permissions import (  # noqa: E402
    CapRow,
    CheckInput,
    build_decision,
    resolve_capability,
)

# --- context ids (a node in the context tree) -------------------------------
SYS = 1       # system context
CAT = 2       # category context
COURSE = 3    # course context
ACT = 9       # activity context

# --- role ids ---------------------------------------------------------------
ROLE_A = 101
ROLE_B = 102
STUDENT = 40
TEACHER = 30

# Context paths, MOST-SPECIFIC-FIRST (as the resolver expects them).
PATH_AT_ACTIVITY = [ACT, COURSE, SYS]
PATH_AT_COURSE = [COURSE, SYS]


def rc(role_id, context_id, permission):
    return CapRow(role_id=role_id, context_id=context_id, permission=permission)


# ============================================================================
# The ten conflict cases (§8.4)
# ============================================================================

def test_case01_allow_at_system_prevent_at_course_same_role_denies():
    # Within a role, the more-specific PREVENT overrides the less-specific ALLOW.
    rows = [rc(ROLE_A, SYS, "allow"), rc(ROLE_A, COURSE, "prevent")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], rows)
    assert result.allowed is False
    assert result.role_decisions[ROLE_A].value == "prevent"
    assert result.role_decisions[ROLE_A].decided_at == COURSE


def test_case02_prevent_at_system_allow_at_course_same_role_allows():
    # Reverse of case 1: the more-specific ALLOW overrides the PREVENT.
    rows = [rc(ROLE_A, SYS, "prevent"), rc(ROLE_A, COURSE, "allow")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], rows)
    assert result.allowed is True
    assert result.role_decisions[ROLE_A].value == "allow"
    assert result.role_decisions[ROLE_A].decided_at == COURSE


def test_case03_cross_role_allow_beats_prevent():
    # C-11: PREVENT in one role does NOT cancel ALLOW in another. ANY allow wins.
    rows = [rc(ROLE_A, SYS, "allow"), rc(ROLE_B, SYS, "prevent")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A, ROLE_B], rows)
    assert result.allowed is True


def test_case04_allow_and_prohibit_same_role_denies():
    # PROHIBIT is an absolute veto even in the presence of ALLOW.
    rows = [rc(ROLE_A, SYS, "allow"), rc(ROLE_A, COURSE, "prohibit")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], rows)
    assert result.allowed is False
    assert (ROLE_A, COURSE) in result.prohibits


def test_case05_prohibit_at_course_beats_allow_at_activity():
    # PROHIBIT is un-overridable — even by a MORE-specific allow below it.
    rows = [rc(ROLE_A, COURSE, "prohibit"), rc(ROLE_A, ACT, "allow")]
    result = resolve_capability(PATH_AT_ACTIVITY, [ROLE_A], rows)
    assert result.allowed is False
    assert result.role_decisions[ROLE_A].value == "prohibit"


def test_case06_no_rows_is_default_deny():
    # Absence of any row = "not set" everywhere = default deny (no allow found).
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], [])
    assert result.allowed is False
    assert result.role_decisions[ROLE_A].value is None
    assert result.prohibits == []


def test_case07_prevent_only_denies():
    # A lone PREVENT denies (but is locally breakable — see case 3).
    rows = [rc(ROLE_A, SYS, "prevent")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], rows)
    assert result.allowed is False


def test_case08_prohibit_at_system_denies_despite_deeper_allow():
    # Same shape as case 5 but the prohibit sits at the top of the tree.
    rows = [rc(ROLE_A, SYS, "prohibit"), rc(ROLE_A, ACT, "allow")]
    result = resolve_capability(PATH_AT_ACTIVITY, [ROLE_A], rows)
    assert result.allowed is False
    assert (ROLE_A, SYS) in result.prohibits


def test_case09_cross_role_prohibit_vetoes_another_roles_allow():
    # One role ALLOWs at the course; another PROHIBITs at system -> DENY.
    rows = [rc(ROLE_A, COURSE, "allow"), rc(ROLE_B, SYS, "prohibit")]
    result = resolve_capability(PATH_AT_ACTIVITY, [ROLE_A, ROLE_B], rows)
    assert result.allowed is False
    assert (ROLE_B, SYS) in result.prohibits


def test_case10_activity_allow_overrides_course_prevent_over_system_allow():
    # Three levels, one role: allow@system, prevent@course, allow@activity.
    # Most-specific (activity) allow wins.
    rows = [
        rc(ROLE_A, SYS, "allow"),
        rc(ROLE_A, COURSE, "prevent"),
        rc(ROLE_A, ACT, "allow"),
    ]
    result = resolve_capability(PATH_AT_ACTIVITY, [ROLE_A], rows)
    assert result.allowed is True
    assert result.role_decisions[ROLE_A].value == "allow"
    assert result.role_decisions[ROLE_A].decided_at == ACT


# --- supporting invariants --------------------------------------------------

def test_absent_course_row_inherits_system_allow():
    # Checked at the course, only a system row exists: it INHERITS (allow),
    # it does not fall through to deny. The "absence = inherit" invariant.
    rows = [rc(ROLE_A, SYS, "allow")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], rows)
    assert result.allowed is True
    assert result.role_decisions[ROLE_A].decided_at == SYS


def test_rows_off_the_path_are_ignored():
    # A row at a sibling context not on this path must not affect the result.
    OTHER = 777
    rows = [rc(ROLE_A, OTHER, "allow")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], rows)
    assert result.allowed is False


def test_role_not_held_is_ignored():
    # An allow belonging to a role the actor does NOT hold grants nothing.
    rows = [rc(ROLE_B, SYS, "allow")]
    result = resolve_capability(PATH_AT_COURSE, [ROLE_A], rows)
    assert result.allowed is False


def test_prohibit_reason_names_role_and_context():
    # Explanations must name the deciding role and context (brief requirement).
    rows = [rc(STUDENT, ACT, "prohibit")]
    result = resolve_capability(PATH_AT_ACTIVITY, [STUDENT], rows)
    assert result.allowed is False
    assert str(STUDENT) in result.reason and str(ACT) in result.reason


# ============================================================================
# The gate pipeline — the six reference scenarios (§17.3) + gate-specific cases.
# build_decision() runs account -> admin -> guest -> course-door -> capability
# -> target participation -> group scope -> activity state, and returns the
# frozen /check response contract.
# ============================================================================

MANAGER = 10
EDITING = 20
USER = 99
LABELS = {ACT: "activity:9", COURSE: "course:1", CAT: "category:1", SYS: "system:1"}


def role(role_id, name, context, provenance=""):
    return {"role_id": role_id, "role": name, "context": LABELS[context], "provenance": provenance}


def test_scenario1_student_submits_own_work_allow():
    inp = CheckInput(
        capability="activity:submit", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(STUDENT, "student", COURSE, "enrol_self"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(STUDENT, SYS, "allow")],
        enrolment_paths=[{"kind": "self", "status": "active", "window_ok": True}],
        activity_id=9, activity_visible=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is True and res["decision"] == "ALLOW"
    assert res["capability_values"]["student"]["value"] == "allow"


def test_scenario2_ta_grades_same_group_allow():
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(TEACHER, "teacher", COURSE, "enrol_manual"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(TEACHER, SYS, "allow")],
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
        target_id=5, target_enrolled=True,
        activity_id=9, group_mode="separate",
        actor_groups=["A"], target_groups=["A"], access_all_groups=False,
        activity_visible=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is True and res["decision"] == "ALLOW"
    assert res["group_scope"]["shared"] is True


def test_scenario3_ta_grades_cross_group_deny_but_capability_still_allow():
    # THE demo: capability resolves ALLOW, but the group gate denies.
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(TEACHER, "teacher", COURSE, "enrol_manual"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(TEACHER, SYS, "allow")],
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
        target_id=5, target_enrolled=True,
        activity_id=9, group_mode="separate",
        actor_groups=["A"], target_groups=["B"], access_all_groups=False,
        activity_visible=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is False and res["decision"] == "DENY"
    # capability still shows allow — that is the whole story of the project
    assert res["capability_values"]["teacher"]["value"] == "allow"
    assert res["group_scope"]["shared"] is False
    assert res["group_scope"]["access_all_groups"] is False
    assert any("group" in r.lower() for r in res["blocking_reasons"])


def test_scenario3b_accessallgroups_short_circuits_group_gate():
    # Same cross-group setup but with accessallgroups -> ALLOW.
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(TEACHER, "teacher", COURSE, "enrol_manual"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(TEACHER, SYS, "allow")],
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
        target_id=5, target_enrolled=True,
        activity_id=9, group_mode="separate",
        actor_groups=["A"], target_groups=["B"], access_all_groups=True,
        activity_visible=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is True


def test_scenario4_teacher_edits_course_allow():
    inp = CheckInput(
        capability="group:manage", cap_known=True, cap_type="write",
        path=[COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(EDITING, "editingteacher", COURSE, "enrol_manual"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(EDITING, SYS, "allow")],
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
    )
    res = build_decision(inp)
    assert res["allowed"] is True and res["decision"] == "ALLOW"


def test_scenario5_manager_opens_unenrolled_course_allow_via_courseview():
    # Not enrolled (no enrolment paths), but course:view resolves allow ->
    # the course door opens with a "not a participant" caveat.
    inp = CheckInput(
        capability="course:view", cap_known=True, cap_type="read",
        path=[COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(MANAGER, "manager", SYS, ""),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(MANAGER, SYS, "allow")],
        enrolment_paths=[],  # NOT enrolled
        course_view_allowed=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is True and res["decision"] == "ALLOW"
    assert any("not a participant" in r.lower() or "not enrolled" in r.lower()
               for r in res["supporting_reasons"] + res["blocking_reasons"])


def test_scenario6_admin_simulate_student_bypass_suppressed():
    # Admin, but simulating student -> admin bypass is suppressed (honest
    # preview), and student lacks activity:grade -> DENY.
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(STUDENT, "student", COURSE, "simulated"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[],  # student has no activity:grade allow
        is_admin=True, simulate_role_id=STUDENT,
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
        activity_id=9, activity_visible=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is False and res["decision"] == "DENY"
    assert res["admin_bypass"] is False
    assert res["simulated_role"] == "student"


def test_admin_bypass_allows_without_roles():
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[], cap_rows=[],
        is_admin=True, simulate_role_id=None,
    )
    res = build_decision(inp)
    assert res["allowed"] is True and res["admin_bypass"] is True


def test_guest_gate_blocks_write_capability():
    inp = CheckInput(
        capability="activity:submit", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[], cap_rows=[],
        is_guest=True,
        enrolment_paths=[{"kind": "guest", "status": "active", "window_ok": True}],
    )
    res = build_decision(inp)
    assert res["allowed"] is False
    assert any("guest" in r.lower() for r in res["blocking_reasons"])


def test_deleted_actor_denied_first():
    inp = CheckInput(
        capability="course:view", cap_known=True, cap_type="read",
        path=[COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(MANAGER, "manager", SYS, "")],
        cap_rows=[rc(MANAGER, SYS, "allow")],
        actor_deleted=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is False
    assert any("delete" in r.lower() for r in res["blocking_reasons"])


def test_unknown_capability_denied():
    inp = CheckInput(
        capability="does:notexist", cap_known=False,
        path=[COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(MANAGER, "manager", SYS, "")], cap_rows=[],
    )
    res = build_decision(inp)
    assert res["allowed"] is False
    assert any("unknown capability" in r.lower() for r in res["blocking_reasons"])


def test_prohibit_live_krol006_capability_gate_denies():
    # KROL-006: prohibit is absolute. Enrolled student with a prohibit override
    # on activity:submit -> capability gate denies via veto.
    inp = CheckInput(
        capability="activity:submit", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(STUDENT, "student", COURSE, "enrol_self"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(STUDENT, SYS, "allow"), rc(STUDENT, ACT, "prohibit")],
        enrolment_paths=[{"kind": "self", "status": "active", "window_ok": True}],
        activity_id=9, activity_visible=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is False
    assert res["prohibits_found"], "prohibit should be recorded as evidence"


def test_admin_simulate_does_not_open_course_door_as_admin():
    # Review finding: during a role-switch preview the admin's real identity must
    # not leak through the course-door gate. Previewing a role that is NOT
    # enrolled and lacks course:view must honestly DENY.
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[ACT, COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(TEACHER, "teacher", COURSE, "simulated"),
                          role(USER, "user", SYS, "virtual")],
        cap_rows=[rc(TEACHER, SYS, "allow")],
        is_admin=True, simulate_role_id=TEACHER,
        enrolment_paths=[], course_view_allowed=False,  # previewed role can't enter
        activity_id=9, activity_visible=True,
    )
    res = build_decision(inp)
    assert res["allowed"] is False
    assert res["admin_bypass"] is False
    assert any("course door" in r.lower() for r in res["blocking_reasons"])
    assert not any("administrator" in r.lower() for r in res["supporting_reasons"])


def test_target_participation_skipped_without_course_context():
    # Review finding: gate 6 must not fire for user/system/category-scoped
    # capabilities that have no course on the path.
    inp = CheckInput(
        capability="user:viewdetails", cap_known=True, cap_type="read",
        path=[SYS], context_labels={SYS: "system:0"},
        roles_considered=[role(MANAGER, "manager", SYS, "")],
        cap_rows=[rc(MANAGER, SYS, "allow")],
        has_course=False,
        target_id=5, target_enrolled=False,  # would wrongly block if gate 6 ran
        enrolment_paths=[],
    )
    res = build_decision(inp)
    assert res["allowed"] is True
    assert not any("participant" in r.lower() for r in res["blocking_reasons"])


def test_response_contract_has_all_frozen_keys():
    inp = CheckInput(
        capability="course:view", cap_known=True, cap_type="read",
        path=[COURSE, SYS], context_labels=LABELS,
        roles_considered=[role(MANAGER, "manager", SYS, "")],
        cap_rows=[rc(MANAGER, SYS, "allow")],
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
    )
    res = build_decision(inp)
    for key in ["allowed", "decision", "blocking_reasons", "supporting_reasons",
                "enrolment_paths", "roles_considered", "contexts_considered",
                "capability_values", "prohibits_found", "group_scope",
                "admin_bypass", "simulated_role"]:
        assert key in res, f"missing contract key: {key}"
    assert res["contexts_considered"] == ["course:1", "system:1"]
