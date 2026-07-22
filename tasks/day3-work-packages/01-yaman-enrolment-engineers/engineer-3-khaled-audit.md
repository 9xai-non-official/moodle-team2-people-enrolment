# Engineer 3 — Khaled · Phase F: Audit Logging

**Engineer slot:** 3 · **Owner:** Khaled Saleh
**Parent work package:** [01-yaman-enrolment.md](../01-yaman-enrolment.md)
**Branch:** `t2/yaman/T2-DATA-001-audit` — exists on `origin`
**Filed from:** Slack, 2026-07-22 13:11 — transcribed verbatim, nothing added to the requirements.

Sole owner of enrolment audit infrastructure and audit call-site integration.

## Branch coordination

The event matrix and helper design may be prepared immediately.

Before finalizing code, **rebase on the completed Phase D and Phase E branches** from
Engineers 1 and 2. This is required because audit calls must be added to the final expiry,
group-reconciliation, and guest-handling paths rather than to outdated versions.

Do not modify business behaviour while adding audit calls.

Do not edit `backend/tests/test_enrolment.py` or hard cases — Engineer 5 owns test files.

## Owned implementation

In `app/services/enrolment.py`, add a small helper equivalent to:

```python
_audit(dbx, event, actor, affected, course, context, detail)
```

Audit records associated with transactional mutations must be written **inside the same
transaction** as the mutation.

## Covered events

- `enrolment.created`
- `enrolment.updated`
- `enrolment.deleted`
- `enrolment.suspended`
- `enrolment.reactivated`
- `enrolment.expired`
- `enrolment.synced`
- Relevant `role.*` events for provenance role writes performed by enrolment
- Repair/failure events required by Engineer 2's deferred group-operation flow

## Required fields

Where applicable: `actor_id` or documented system actor · `affected_id` · `course_id` ·
`context_id` · `method_id` · method kind · previous and new status · expiry action ·
`last_path` · intended group operation · provenance · failure reason · reconciliation status.

## Integration requirements

1. **Enrol and re-enrol** — distinguish `created` from `updated`.
2. **Suspend and reactivate** — skip audit for true no-op operations if the service performs
   change-gating.
3. **Unenrol** — include `last_path` and the removed method/path.
4. **Expiry** — consume Engineer 1's expiry event handoff and record the correct expiry action.
5. **Cohort sync** — record `enrolment.synced` with useful counts or detail already available
   from the operation.
6. **Deferred group failures** — consume Engineer 2's structured failure payload; ensure
   failure information is sufficient for diagnosis and reconciliation.

## D-AUDIT

Consume the existing `D-AUDIT` table contract and index adequacy.

Do not modify `schema.sql`, audit table DDL, migrations, or seeds. If the existing audit schema
cannot store a required value, **report the exact dependency to Essa** instead of altering the
schema.

## Test handoff to Engineer 5

Produce an event matrix listing: triggering operation · expected audit event · required fields ·
transactional or post-commit timing · expected `last_path` value · expected repair status.

Scenarios:

- Every lifecycle mutation writes an audit row
- Failed group operation is recorded
- Expiry actions are recorded
- Unenrol includes `last_path`
- No-op status change does not create an incorrect lifecycle event
- Audit changes do not violate the forbidden-write regression guard

## Restrictions

- Do not change enrolment business rules.
- Do not change expiry or reconciliation algorithms.
- Do not edit test files.
- Do not add DDL.
- Do not create a second audit abstraction.
- Do not move audit writes outside the mutation transaction when they can be atomic.
- Do not edit other engineers' files outside the approved enrolment service scope.

## Plan

1. Build the complete event matrix from the work package.
2. Inspect the final Phase D and E service paths.
3. Add the `_audit` helper.
4. Add audit calls to enrol, update, suspend, reactivate, unenrol, expiry, and sync.
5. Integrate Engineer 2's repair payload.
6. Verify transactional placement.
7. Review every event for actor, affected user, course, context, method, and detail.
8. Produce test specifications for Engineer 5.
9. Rebase and resolve only audit-related conflicts.
10. Submit the audit branch.

## Return

Audit event matrix · changed call sites · helper design · transaction placement explanation ·
`D-AUDIT` compatibility status · test handoff · any required Essa dependency · remaining blockers.
