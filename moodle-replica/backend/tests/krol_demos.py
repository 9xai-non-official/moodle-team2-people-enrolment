"""KROL demo scripts (Khaled's ROL-001..010 experiments → live demonstrations).

Run:  python tests/krol_demos.py

These use the PURE resolver + gate pipeline (no DB) so each experiment is a
self-contained, reproducible demonstration of the behaviour the Arabic guide
specified. Each function returns True when it demonstrates the expected rule; the
module asserts them all at import-for-test time too (see test_krol_demos below).

Mapping: the guide labels them ROL-###; the task brief calls them KROL-###.
"""
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.permissions import (  # noqa: E402
    CapRow,
    CheckInput,
    build_decision,
    resolve_capability,
)

SYS, T2TEST_COURSE, T2TEST_ACT = 1, 3, 9
T2PERM_COURSE, T2PERM_ACT = 5, 11
TEACHER, STUDENT, USER = 30, 40, 99
LABELS = {SYS: "system:0", T2TEST_COURSE: "course:1", T2TEST_ACT: "activity:4",
          T2PERM_COURSE: "course:2", T2PERM_ACT: "activity:6"}


def _rc(r, c, p):
    return CapRow(r, c, p)


def krol_001_role_is_contextual():
    """ROL-001: the SAME person is a Teacher in one course and a Student in
    another — a role assignment is bound to a contextid, it is not global."""
    grade_rows = [_rc(TEACHER, SYS, "allow")]  # teacher grants activity:grade; student doesn't
    in_test = resolve_capability([T2TEST_ACT, T2TEST_COURSE, SYS], [TEACHER], grade_rows)
    in_perm = resolve_capability([T2PERM_ACT, T2PERM_COURSE, SYS], [STUDENT], grade_rows)
    print(f"  KROL-001  grade @ T2-TEST(teacher)={in_test.allowed}  "
          f"@ T2-PERM(student)={in_perm.allowed}")
    return in_test.allowed and not in_perm.allowed


def krol_005_allow_vs_prevent():
    """ROL-005: Allow high + Prevent low -> the more-specific PREVENT wins
    (deny). Reversed -> the more-specific ALLOW wins (allow). Prevent is local
    and breakable."""
    forward = resolve_capability(
        [T2TEST_COURSE, SYS], [TEACHER],
        [_rc(TEACHER, SYS, "allow"), _rc(TEACHER, T2TEST_COURSE, "prevent")])
    reversed_ = resolve_capability(
        [T2TEST_COURSE, SYS], [TEACHER],
        [_rc(TEACHER, SYS, "prevent"), _rc(TEACHER, T2TEST_COURSE, "allow")])
    print(f"  KROL-005  allow@sys+prevent@course={forward.allowed}  "
          f"prevent@sys+allow@course={reversed_.allowed}")
    return (not forward.allowed) and reversed_.allowed


def krol_006_prohibit_is_absolute():
    """ROL-006: Prohibit at the top, Allow below -> it STILL fails. Prohibit is
    un-overridable by any allow at any lower context."""
    res = resolve_capability(
        [T2TEST_ACT, T2TEST_COURSE, SYS], [TEACHER],
        [_rc(TEACHER, T2TEST_COURSE, "prohibit"), _rc(TEACHER, T2TEST_ACT, "allow")])
    print(f"  KROL-006  prohibit@course + allow@activity -> allowed={res.allowed} "
          f"({res.reason})")
    return not res.allowed and bool(res.prohibits)


def krol_007_role_without_enrolment():
    """ROL-007: a role assignment can exist without an enrolment. Such a user
    fails the COURSE DOOR (not enrolled) unless they hold course:view — even
    though their capability resolves to allow."""
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[T2TEST_ACT, T2TEST_COURSE, SYS], context_labels=LABELS,
        roles_considered=[{"role_id": TEACHER, "role": "teacher",
                           "context": "course:1", "provenance": "manual"}],
        cap_rows=[_rc(TEACHER, SYS, "allow")],
        enrolment_paths=[],           # assigned the role, but NOT enrolled
        course_view_allowed=False,    # and no course:view
        activity_id=4, activity_visible=True,
    )
    res = build_decision(inp)
    door_blocked = any("course door" in r.lower() for r in res["blocking_reasons"])
    cap_allow = res["capability_values"]["teacher"]["value"] == "allow"
    print(f"  KROL-007  capability=allow({cap_allow})  but door blocks -> "
          f"allowed={res['allowed']}")
    return (not res["allowed"]) and door_blocked and cap_allow


def krol_009_accessallgroups_second_gate():
    """ROL-009: with separate groups the TA can grade only their own group's
    students — UNLESS accessallgroups is granted, which opens all groups."""
    base = dict(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[T2TEST_ACT, T2TEST_COURSE, SYS], context_labels=LABELS,
        roles_considered=[{"role_id": TEACHER, "role": "teacher",
                           "context": "course:1", "provenance": "manual"},
                          {"role_id": USER, "role": "user", "context": "system:0",
                           "provenance": "virtual"}],
        cap_rows=[_rc(TEACHER, SYS, "allow")],
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
        target_id=5, target_enrolled=True, activity_id=4, group_mode="separate",
        actor_groups=["A"], target_groups=["B"], activity_visible=True,
    )
    without = build_decision(CheckInput(**base, access_all_groups=False))
    with_ = build_decision(CheckInput(**base, access_all_groups=True))
    print(f"  KROL-009  cross-group without accessallgroups={without['allowed']}  "
          f"with accessallgroups={with_['allowed']}")
    return (not without["allowed"]) and with_["allowed"]


def krol_010_decision_explanation():
    """ROL-010: the decision-explanation model — that IS /check's response."""
    inp = CheckInput(
        capability="activity:grade", cap_known=True, cap_type="write",
        path=[T2TEST_ACT, T2TEST_COURSE, SYS], context_labels=LABELS,
        roles_considered=[{"role_id": TEACHER, "role": "teacher",
                           "context": "course:1", "provenance": "enrol_manual"},
                          {"role_id": USER, "role": "user", "context": "system:0",
                           "provenance": "virtual"}],
        cap_rows=[_rc(TEACHER, SYS, "allow")],
        enrolment_paths=[{"kind": "manual", "status": "active", "window_ok": True}],
        target_id=5, target_enrolled=True, activity_id=4, group_mode="separate",
        actor_groups=["A"], target_groups=["A"], access_all_groups=False,
        activity_visible=True,
    )
    res = build_decision(inp)
    print("  KROL-010  /check output:")
    print(json.dumps(res, indent=2, default=str))
    return res["allowed"] and res["group_scope"]["shared"] is True


DEMOS = [
    krol_001_role_is_contextual,
    krol_005_allow_vs_prevent,
    krol_006_prohibit_is_absolute,
    krol_007_role_without_enrolment,
    krol_009_accessallgroups_second_gate,
    krol_010_decision_explanation,
]


def main():
    print("KROL experiments — live demonstrations")
    ok = True
    for demo in DEMOS:
        result = demo()
        ok = ok and result
        print(f"    -> {'PASS' if result else 'FAIL'}: {demo.__doc__.splitlines()[0]}")
    print("\nAll KROL demos demonstrated as expected." if ok else "\nSOME DEMOS FAILED.")
    return 0 if ok else 1


# Also runnable under pytest as a single regression guard.
def test_krol_demos_all_hold():
    for demo in DEMOS:
        assert demo() is True, f"{demo.__name__} did not demonstrate its rule"


if __name__ == "__main__":
    raise SystemExit(main())
