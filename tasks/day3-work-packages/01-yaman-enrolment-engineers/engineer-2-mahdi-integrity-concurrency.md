# Engineer 2 — Mahdi · Phase E: Integrity & Concurrency

**Engineer slot:** 2 · **Owner:** Mahdi Anagreh
**Parent work package:** [01-yaman-enrolment.md](../01-yaman-enrolment.md)
**Branch:** `t2/yaman/T2-DATA-002-003`
**Filed from:** Slack, 2026-07-22 13:11 — transcribed verbatim, nothing added to the requirements.

## Scope

- `T2-DATA-003` — guest one-per-course conflict handling
- `T2-DATA-002` — deferred group-operation reliability
- The enrolment side of the `D-GM` group-membership guard
- The reconciliation implementation consumed by the expiry worker

## Branch coordination

The guest-conflict portion may be implemented immediately.

Before modifying `app/tasks/enrol_expiry.py` or integrating reconciliation with the worker,
**rebase on Engineer 1's completed Phase D branch**. Do not independently recreate or replace
the expiry worker.

Do not edit `backend/tests/test_enrolment.py` or hard-case scripts — Engineer 5 is the sole
test-file owner.

Do not create the shared audit helper — Engineer 3 owns audit infrastructure. Produce a
complete structured repair-event payload and identify where Engineer 3 must persist it.

## Part 1 — Guest one-per-course

Modify the `create_method` path so that:

- The existing application pre-check remains, for a friendly duplicate reason.
- The `D-GUEST` partial unique index is the correctness guarantee.
- A unique database conflict is caught.
- The conflict becomes a typed HTTP 409.
- The reason flows through the existing service result and `_ok` path.
- Guest methods never create enrolment rows.
- Concurrent guest creation results in at most one method.

Do not add `SELECT FOR UPDATE` or advisory locks when the unique constraint is sufficient.

If `D-GUEST` is not merged, implement against the frozen contract but report database-backed
correctness as **blocked**.

## Part 2 — Deferred group operations

Preserve the current architecture:

- Enrolment transaction commits first.
- Group side effects run through `services/groups.py`.
- Do not force group operations into the enrolment transaction.

Make the enrolment side retry-safe, idempotent when repeated, observable on failure, and
repairable through reconciliation.

Use only published `D-GM` operations: `add_member`, `remove_members_by_provenance`,
`remove_all_memberships`.

Use server-set provenance only — `enrol_self`, `enrol_cohort`, other approved `enrol_*` values
from the contract; `item_id` must identify the enrolment method where required. Never accept
client-supplied provenance and never write `group_member` directly.

## Part 3 — Reconciliation

Implement an idempotent reconciliation path. Coordinate with Engineer 1 so that
`app/tasks/enrol_expiry.py` exposes or calls `reconcile_group_side_effects(db)`.

- Repeated repair attempts converge.
- Repeated add attempts do not duplicate membership.
- Repeated remove attempts remain successful.
- Repair operations use the normal `services/groups.py` contract.
- Reconciliation does not introduce independent group business logic.

## Part 4 — Enrolment-guard race

Consume the merged `D-GM` contract so a concurrent `add_member` cannot leave final group
membership for a user who is no longer enrolled. Do not modify Mahmoud's service or table
logic — implement only the enrolment-side guarantees.

## Audit handoff to Engineer 3

For each post-commit group failure, construct: event type · actor or system actor · affected
user · course · method ID and kind · intended group operation · group identifier where
applicable · component and `item_id` provenance · failure reason · retry or reconciliation
state.

Engineer 3 persists the final audit record. Do not create a competing audit abstraction.

## Test handoff to Engineer 5

Provide exact scenarios for:

- Duplicate guest returns 409
- Concurrent guest creation produces one row
- Guest method creates no enrolment rows
- Enrolment commits while group operation fails
- Failure becomes visible in audit after Engineer 3 integration
- Reconciliation converges
- Repeated reconciliation creates no duplicates
- Concurrent `add_member` and unenrol leaves no invalid membership
- Forbidden direct group SQL remains absent

## Restrictions

- No DDL or migration edits.
- No direct `group_member` SQL.
- No Mahmoud-owned file changes.
- No test-file changes.
- No new locking where uniqueness is sufficient.
- No audit helper implementation.
- No changes to unrelated enrolment lifecycle rules.

## Plan

1. Verify `D-GUEST` and `D-GM` contracts.
2. Implement guest pre-check plus unique-conflict handling.
3. Review existing deferred `_groups_call` and `_run_group_ops` behaviour.
4. Define a structured failure and repair payload.
5. Rebase on Engineer 1's expiry branch.
6. Implement idempotent reconciliation integration.
7. Validate repeated add/remove behaviour manually.
8. Produce audit and test handoff documentation.
9. Request Mahmoud review for `D-GM`-related work.
10. Submit the branch without merging before required dependencies.

## Return

Changed files and symbols · `D-GUEST` status · 409 behaviour · reconciliation design · failure
payload · manual concurrency/idempotency evidence · Engineer 3 and Engineer 5 handoffs ·
Mahmoud review status · remaining limitations.
