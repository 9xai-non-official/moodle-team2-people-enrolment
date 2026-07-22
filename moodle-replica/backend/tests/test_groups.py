"""Group-scope logic tests (Task 05 — Mahmoud).

These exercise the PURE decision helpers (no database), which is where the
Hard-Case-3/4 behaviour lives. Run:  pytest backend/tests/test_groups.py

Persona/seed model (mirrors the task's controlled setup):
    Groups:  A=1  B=2  C=3
    Assignment SG is grouping-restricted to "Assignment Groups" = {A, B},
        so its group universe is {1, 2}; Group C (3) does not participate.
    ta.a          -> Group A [1], NO access-all-groups
    ta.allgroups  -> Group A [1], HAS access-all-groups
    student.a     -> [1]   student.b -> [2]   student.c -> [3]
    student.multi -> [1, 2]   (Hard Case 4)
"""
from app.services.groups import (
    NONE,
    SEPARATE,
    VISIBLE,
    effective_mode,
    resolve_allowed_group_ids,
    scope_verdict,
)

A, B, C = 1, 2, 3
SG_UNIVERSE = [A, B]  # Assignment SG restricted to grouping {A, B}


# ---------------------------------------------------------------------------
# GRP-012 — effective mode (grouplib.php:743)
# ---------------------------------------------------------------------------
def test_forced_course_mode_overrides_activity():
    # course forces 'separate'; activity says 'none' -> forced wins, activity ignored
    assert effective_mode(NONE, SEPARATE, force=True) == SEPARATE
    assert effective_mode(VISIBLE, SEPARATE, force=True) == SEPARATE


def test_activity_mode_wins_when_not_forced():
    assert effective_mode(VISIBLE, SEPARATE, force=False) == VISIBLE


def test_null_activity_mode_inherits_course():
    assert effective_mode(None, SEPARATE, force=False) == SEPARATE
    assert effective_mode(None, NONE, force=False) == NONE


# ---------------------------------------------------------------------------
# GRP-006 — allowed groups (grouplib.php:770-782)
# ---------------------------------------------------------------------------
def test_separate_without_aag_limits_to_own_groups():
    assert resolve_allowed_group_ids(SEPARATE, False, SG_UNIVERSE, [A]) == [A]


def test_visible_shows_whole_universe():
    assert set(resolve_allowed_group_ids(VISIBLE, False, SG_UNIVERSE, [A])) == {A, B}


def test_access_all_groups_shows_whole_universe_even_in_separate():
    assert set(resolve_allowed_group_ids(SEPARATE, True, SG_UNIVERSE, [A])) == {A, B}


def test_none_mode_no_filtering():
    assert set(resolve_allowed_group_ids(NONE, False, SG_UNIVERSE, [A])) == {A, B}


# ---------------------------------------------------------------------------
# HARD CASE 3 — the three-outcome TA on Assignment SG (separate, universe {A,B})
# ---------------------------------------------------------------------------
def test_hc3_ta_can_grade_own_group():
    v = scope_verdict(SEPARATE, False, [A], [A], access_all_groups=False, universe_ids=SG_UNIVERSE)
    assert v["visible"] and v["action_allowed"]


def test_hc3_ta_cannot_grade_other_group_but_capability_still_allows():
    # the money shot: role permits grading, group scope denies it
    v = scope_verdict(SEPARATE, False, [A], [B], access_all_groups=False, universe_ids=SG_UNIVERSE)
    assert v["visible"] is False
    assert v["action_allowed"] is False
    assert "The activity uses Separate Groups." in v["reasons"]
    assert "The actor and target do not share an allowed Group." in v["reasons"]
    assert "The actor does not have access-all-groups." in v["reasons"]


def test_hc3_ta_cannot_even_see_group_outside_the_grouping():
    # Group C is outside the activity's grouping universe {A, B} -> not even visible
    v = scope_verdict(SEPARATE, False, [A], [C], access_all_groups=False, universe_ids=SG_UNIVERSE)
    assert v["visible"] is False
    assert v["action_allowed"] is False


def test_hc3_ta_allgroups_reaches_everyone():
    for target in ([A], [B], [C]):
        v = scope_verdict(SEPARATE, False, [A], target, access_all_groups=True, universe_ids=SG_UNIVERSE)
        assert v["visible"] and v["action_allowed"]
        assert v["access_all_groups"] is True


# ---------------------------------------------------------------------------
# Visible-groups nuance — see other groups, act only in your own
# ---------------------------------------------------------------------------
def test_visible_can_see_other_group_but_not_act():
    v = scope_verdict(VISIBLE, False, [A], [B], access_all_groups=False, universe_ids=SG_UNIVERSE)
    assert v["visible"] is True
    assert v["action_allowed"] is False


def test_visible_hides_group_outside_the_grouping():
    v = scope_verdict(VISIBLE, False, [A], [C], access_all_groups=False, universe_ids=SG_UNIVERSE)
    assert v["visible"] is False


# ---------------------------------------------------------------------------
# HARD CASE 4 — student in two groups (A and B), no dedupe
# ---------------------------------------------------------------------------
def test_hc4_multi_group_student_reachable_from_either_group():
    # a teacher in A shares group A with student.multi[1,2]
    from_a = scope_verdict(SEPARATE, False, [A], [A, B], access_all_groups=False, universe_ids=SG_UNIVERSE)
    # a teacher in B shares group B with the same student
    from_b = scope_verdict(SEPARATE, False, [B], [A, B], access_all_groups=False, universe_ids=SG_UNIVERSE)
    assert from_a["action_allowed"] is True
    assert from_b["action_allowed"] is True


def test_hc4_allowed_groups_shows_both_under_visible():
    # under visible/teacher, the group filter lists both of the student's groups
    assert set(resolve_allowed_group_ids(VISIBLE, False, SG_UNIVERSE, [A, B])) == {A, B}


# ---------------------------------------------------------------------------
# No-groups mode — scope never restricts
# ---------------------------------------------------------------------------
def test_none_mode_everyone_reachable():
    v = scope_verdict(NONE, False, [A], [B], access_all_groups=False, universe_ids=SG_UNIVERSE)
    assert v["visible"] and v["action_allowed"]
