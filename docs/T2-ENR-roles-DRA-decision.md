# T2-ENR-005 / T2-ENR-003 role semantics — decision & Khaled review request

**Owner:** Yaman · **Required reviewer:** Khaled (D-RA) · **Branch:** `t2/yaman/T2-ENR-roles-DRA`

## What shipped on this branch (Option B — no cross-owner deletion)

The provenance model already keys every enrolment-driven `role_assignment` row
by `(component, item_id = method_id)` (`enrol_user`, services/enrolment.py).
Two consequences, both the T2-ENR-005 behaviour we want, with **no code change
to tagging**:

- **Per-path unenrol** deletes only rows matching this method's
  `component + item_id`. A role granted by another still-active path keeps its
  own row and survives. (`test_perpath_unenrol_keeps_role_from_other_path`,
  `test_same_role_two_method_unenrol_regression`.)
- **Last-path cleanup** blanket-removes rows with `component like 'enrol_%'`
  but **deliberately leaves `component=''` rows** — those are Khaled's
  (manually assigned roles, `roles_protected()`), and deleting them is not
  Yaman's call.

**New this branch:** the R-COHORT guard (ENR-013). An *active* cohort-synced
path can no longer be manually unenrolled (409, reason names ENR-013) — cohort
membership is the source of truth; suspend it or remove the user from the
cohort. The sync itself passes `_cohort_sync=True` to bypass the guard.
(`test_cohort_active_unenrol_blocked`.)

## The open decision for Khaled — Option A (Moodle-faithful)

Moodle tags manual/self enrolment roles `component=''` (not `enrol_manual` /
`enrol_self`) and, on final unenrol, runs `role_unassign_all(user, coursectx)`
— removing **every** role in the course context, including manually assigned
ones (`enrollib.php:2344`). Adopting Option A would:

1. tag manual/self provenance roles `component=''` (cohort stays `enrol_cohort`);
2. make last-path cleanup a blanket `role_unassign_all` at the course context.

This is exact Moodle parity and closes the T2-ENR-003 "ghost role after last
unenrol" case fully. **It requires Khaled's sign-off** because step 2 deletes
`role_assignment` rows he owns (`component=''`), and step 1 changes the
provenance convention his resolver reads.

**Recommendation:** adopt Option A once Khaled confirms the blanket last-path
strip is acceptable for `component=''` rows. Until then Option B stands — it is
safe, correct for T2-ENR-005, and touches no cross-owner data.
