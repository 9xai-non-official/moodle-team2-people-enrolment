# Work Package 01 (Yaman · Enrolment) — Engineer Slices

Work package [01-yaman-enrolment.md](../01-yaman-enrolment.md) split into five engineer slices,
assigned over Slack on **2026-07-22 13:11**. Filed here so the assignments live in the repo
rather than in chat history.

| # | Owner | Phase | Slice | Branch | Branch status |
|---|---|---|---|---|---|
| 1 | — | D | Expiry worker (`app/tasks/enrol_expiry.py`) | — | **brief not captured** |
| 2 | Mahdi | E | [Integrity & concurrency](engineer-2-mahdi-integrity-concurrency.md) | `t2/yaman/T2-DATA-002-003` | not created yet |
| 3 | Khaled | F | [Audit logging](engineer-3-khaled-audit.md) | `t2/yaman/T2-DATA-001-audit` | exists on `origin` |
| 4 | Mahmoud | F | [Frontend](engineer-4-mahmoud-frontend.md) | `t2/yaman/frontend-enrolment` | exists locally (PR #33 merged) |
| 5 | — | — | Sole owner of `backend/tests/test_enrolment.py` + hard-case scripts | — | **brief not captured** |

> **Engineers 1 and 5 have no brief here.** Their assignments were not part of the Slack
> message that was filed, but slices 2 and 3 both depend on Engineer 1's Phase D branch and both
> hand test scenarios to Engineer 5. Add their briefs when available — do not infer them from
> the references in the other three files.

## Dependency order

Phase D (Engineer 1) must land first. Then:

- **Engineer 2** may start guest-conflict work immediately, but must rebase on Phase D before
  touching `app/tasks/enrol_expiry.py` or wiring reconciliation into the worker.
- **Engineer 3** may design the event matrix immediately, but must rebase on **both** Phase D
  and Phase E before finalizing, so audit calls attach to the final code paths.
- **Engineer 4** may build in parallel, but rebases once the backend contracts from 1, 2, and 3
  stabilize.

## Ownership boundaries

These three briefs partition ownership deliberately — the same rule appears in all of them:

- **Engineer 5 alone** edits `backend/tests/test_enrolment.py` and hard-case scripts. Engineers
  2 and 3 write *test specifications*, not tests.
- **Engineer 3 alone** owns audit infrastructure. Engineer 2 produces a structured failure
  payload and says where it must be persisted; it does not build a second audit helper.
- **Mahmoud** owns `services/groups.py` and the `group_member` table. Engineer 2 implements
  only the enrolment side of the `D-GM` guard and must request his review.
- **Essa** owns shared surfaces — `schema.sql`, DDL, migrations, seeds, and the shared frontend
  files. Schema shortfalls get reported to Essa, never patched locally.

## Cross-references

- Parent package: [01-yaman-enrolment.md](../01-yaman-enrolment.md)
- Groups contract (`D-GM`) owner: [05-mahmoud-groups.md](../05-mahmoud-groups.md)
- Database / `D-AUDIT` / `D-GUEST` owner: [03-essa-database.md](../03-essa-database.md)
