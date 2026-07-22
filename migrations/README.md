# Migrations — Team 2, People & Enrolment

Forward-only SQL migrations. Owner: **Essa** (single writer of all DDL, per
`TEAM-OWNERSHIP-MATRIX.md §9-11`).

Before this directory existed, the entire `schema.sql` was applied at once and
there was no way to make a reviewed, incremental change. That is what M01
establishes.

## Running

```bash
export DATABASE_URL=postgresql://...
python3 migrations/apply.py --status     # what is applied, what is pending
python3 migrations/apply.py --dry-run    # what would run
python3 migrations/apply.py              # apply pending, each in its own transaction
python3 migrations/verify.py             # acceptance + regression checks (§19/§20)
```

`verify.py` creates its fixtures inside a transaction and rolls back, so it is
safe to run against any database — it leaves nothing behind.

To stand up a database the backend test suite can use:

```bash
python3 migrations/apply.py --with-fixtures
```

That applies the migrations, then `moodle-replica/backend/fixtures.sql` (demo
personas), in that order — config before demo data, per M09.4. It then
re-asserts the D-SEED corrections, because fixtures run *after* M09 and a
fixture that re-granted `course:view` or `site:accessallgroups` would silently
undo the fix. The runner fails loudly if that ever happens.

**Known gap:** this still does not make `tests/test_enrolment.py` pass. Those
tests reference `demo_alice`, `demo_bob` and `DEMO-CS101` by hardcoded id, and
**no SQL file in this repo creates those rows** — `fixtures.sql:3` says
explicitly that they are teammates' rows which it leaves untouched. They exist
only in the deployed Supabase database, created by hand. Until either those
fixtures are added here or the tests look their subjects up by name instead of
by id, that suite cannot run in CI. See §20 "Hermeticity".

Local PG17 for testing:

```bash
docker run --rm -d --name moodle-t2-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=moodle_t2 -p 5434:5432 postgres:17
```

## Rules

These come from `MERGE-STRATEGY.md:31-35` and are not negotiable:

1. **Forward-only.** Never edit a merged migration — add a new one. A
   compensating migration is the way to undo something.
2. **One concern per file.** The header carries `Dependency:`, `Issue:` and
   `Reviewed-by:`.
3. **Reviewed by the requester.** A migration that exists to unblock Mahdi is
   reviewed by Mahdi, not by whoever is nearest.
4. **A domain PR cannot merge before the migration it depends on**
   (`MERGE-STRATEGY.md:17`).
5. **Every new table gets `enable row level security`** — the schema is locked
   shut by default (`schema.sql:538-557`), and PostgREST is reachable.
6. **Seed changes are migrations too.**

## The set

| File | Dep | Issue | Reviewer |
|---|---|---|---|
| M01 baseline schema | — | — | Essa |
| M02 baseline seed | — | — | Essa |
| M03 `v_course_progress` rewrite | D-VIEW | T2-PRG-001/005 | Mahdi |
| M04 completion criteria | D-CRIT | T2-PRG-003 | Mahdi |
| M05 group visibility | D-GRP-VIS | T2-GRP-004 | Mahmoud |
| M06 activity availability | D-GRP-AVAIL | T2-GRP-005 | Mahmoud |
| M07 recursive context path | D-CTX | T2-RBAC-005 | Khaled |
| M08 guest method unique | D-GUEST | T2-DATA-003 | Yaman |
| M09 seed corrections | D-SEED, D-CAPNAME | T2-RBAC-003/004 | Khaled + Mahmoud |
| M10 audit_log indexes | D-AUDIT | T2-DATA-001 | all |
| M11 permission_decision | D-PDEC | T2-DATA-001/RBAC-060 | Khaled |
| M12 drop fn_can | D-FNCAN | T2-RBAC-002 | Khaled |
| M13 write-once completion | D-IMMUT | T2-PRG-002 | Mahdi |
| M15 deletion semantics | — | T2-DATA-004 | Mahdi |

**M14 and M16 are in `conditional/` and are NOT applied by the runner.** They
ship only once the decisions in their headers are made (HC-05 Option A for M14;
Yaman confirming a persisted expiry need for M16). Moving a file up into
`migrations/` is how it gets adopted.

`M14` and `M16` keep their numbers so the sequence stays stable — there is no
gap to explain later, and `M15` is not renumbered if `M14` is never adopted.

## Order and risk

M03 / M09 / M04 are the critical path — they unblock Mahdi and Mahmoud, so they
merge first.

**M15 is the highest-risk file in the set** and is staged last. It changes an FK
from RESTRICT to CASCADE, which means a hard delete of a `course_activity` will
delete its `activity_completion` rows instead of erroring. The compensating
migration is written out at the bottom of that file. `course_completion` and
`course_completion_crit_compl` stay non-cascading on purpose — they are what
make HC-02 and HC-05 answerable, and cascading them would quietly destroy the
survive-unenrol guarantee.

## What is NOT here

Domain logic. Essa provides the substrate; the rules live in each domain's
service:

- ALL/ANY criteria aggregation over M04's tables → Mahdi
- hide/grey enforcement over M06's table → Mahmoud
- the canonical capability string for D-CAPNAME → Khaled + Mahmoud
- catching M08's unique violation as a 409 → Yaman
