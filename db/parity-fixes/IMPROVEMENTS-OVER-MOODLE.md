# Improvements Over Moodle — gaps the small project (Team 2) solved that are still weaknesses in Moodle

This file lists every place where the **small system** (`moodle-team2-people-enrolment`) is **better than Moodle** — a weakness that exists in the big system (Moodle) and was **solved / improved** in the small system. These are the audit's confirmed "target exceeds Moodle" findings, checked by the independent validator (`evidence/validation/INDEPENDENT-VALIDATION.md`).

**Status legend:** ✅ Proven from source · ⚠️ Conditional (real, but narrower than it first looks — see note).

**Honest caveat (read this):** these are genuine strengths and should be preserved. They do **not** cancel the security/enforcement gaps in the other direction (no authentication, no authorization enforcement, group endpoint crash, mock-only screens). This file is only the "we did it better" side; the "we are missing it" side is in `GAP-ANALYSIS.md` / `FINAL-PARITY-REPORT.md`.

---

## 🟢 RESOLUTION UPDATE (2026-07-22) — both conditionals upgraded to ✅

The two ⚠️ conditional items are now **unconditional strengths**, and four new
DB-layer wins were added. See `db/parity-fixes/README.md` in the repo for the
applied SQL + live proofs.

- **#7 soft-delete retention (Note A) → ✅.** A real activity-completion write
  path + auto-recompute cascade (`fn_set_activity_completion` + trigger,
  `db/parity-fixes/04`) now populates `activity_completion` from code, so the
  retained, still-queryable history is **activity-level**, not just the
  course-level `course_completion` row. Proven: completing an activity flips
  course completion via trigger and is audited.
- **#12 see/act-on group model (Note B) → ✅.** The `/access-check` and
  `/allowed` arity-500 that made this a *design-only* strength is fixed (work
  package 05, PR #25). The two-boolean SEE/ACT-ON model is now reachable and
  enforced on the real routed API. Proven: `ta.a`→own group only, `ta.allgroups`
  →all, routed, no 500.

**New "better than Moodle" wins this session (DB layer, bypass-proof):**
- **Universal audit triggers** — every enrolment/role mutation is logged by a
  row trigger, so no code path (bulk SQL, plugin, migration) can skip the ledger
  the way Moodle's PHP events can. (`db/parity-fixes/01`)
- **Trigger-cascaded completion** — course completion recomputes instantly from
  activity state; it cannot drift, so there is no reaggregate flag or repair
  cron (Moodle needs both). (`db/parity-fixes/04`)
- **In-database scheduler** — expiry demotion + longtimenosee run as `pg_cron`
  jobs writing *stored* state, not Moodle's laggable external cron computed
  on read. (`db/parity-fixes/03`)
- **Real completion aggregation** — ALL/ANY over real criteria tables, replacing
  the mock-only implementation. (`db/parity-fixes/02`)

---

## Summary table

| # | Improvement | Weakness still in Moodle | How Team 2 solved it | Evidence (Team 2) | Status |
|---|---|---|---|---|---|
| 1 | Real foreign keys | Moodle's DB has **no FK constraints at all** — integrity lives only in PHP | Real `REFERENCES` FKs across all tables + `ON DELETE` behavior | `schema.sql` (throughout); audit `DATA-017` | ✅ |
| 2 | Unique constraint on role assignment | Moodle has **no DB unique** on `role_assignments` → documented duplicate-assignment race | `unique (user_id, role_id, context_id, component, item_id)` + `on conflict do nothing` | `schema.sql:206`; `DATA-005` / `RBAC-012` | ✅ |
| 3 | Real transactions on enrolment | Moodle's enrol/role/group sequences are **not** wrapped in one atomic transaction | enrol/unenrol/sync wrapped in a DB transaction | `services/enrolment.py` (`_tx`); `DATA-018` / `ENR-034` | ✅ |
| 4 | Trigger-maintained context path | Moodle stores context path as a **string with no parent FK** and repairs drift with a cron job | `parent_id` FK is the source of truth; `path`/`depth` derived by trigger (cannot drift on insert) | `schema.sql:110-137` (`trg_context_path`); `DATA-004` / `RBAC-002` | ✅ |
| 5 | Enums instead of magic ints | Moodle uses magic integers (status=0 active, permission=-1000 prohibit, groupmode 0/1/2) | Typed Postgres enums (`enrolment_status`, `cap_permission`, `group_mode`, `completion_state`, …) | `schema.sql:30-37` | ✅ |
| 6 | Proper timestamps (no Y2038 bug) | Moodle uses unix-epoch bigints; `user_enrolments.timeend` defaults to **2147483647** (a literal Y2038 bug) as "no end" | `timestamptz` everywhere; open-ended = `NULL`, correctly handled by `(time_end is null or time_end > now())` | `schema.sql:265,272-273`; `v_enrolment_detail`; `DATA-001` (C2 confirmed not a bug) | ✅ |
| 7 | Soft delete keeps history | Moodle's `delete_course` **destroys** completion data; nothing survives | `deleted_at` soft delete on `user`/`course`; completion rows retained and still queryable; **now activity-level** via `fn_set_activity_completion` + cascade | `schema.sql:55,77,447`; `db/parity-fixes/04`; `HC-05a` / `PRG-033` | ✅ (upgraded 2026-07-22) |
| 8 | `jsonb config` instead of spare columns | Moodle's `enrol` table has 15 spare columns (`customint1..8`, `customchar1..3`, `customtext1..4`) | Single `config jsonb` column | `schema.sql:249` | ✅ |
| 9 | Richer "why" for permissions | Moodle just throws a bare `required_capability_exception` | Full per-role decision trace returned as structured data (`granted` + `reason` + `trace`) | `schema.sql:475-532` (`fn_can`) + `services/permissions.py`; `RBAC-060` | ✅ |
| 10 | Graceful concurrent group add | Moodle's concurrent `groups_add_member` loser throws an **uncaught** `dml_write_exception` | `insert ... on conflict (group_id,user_id) do nothing` resolves the race cleanly | `services/groups.py` (add member); `GRP-036` | ✅ |
| 11 | Extra CHECK / uniqueness guards | Moodle lacks several integrity guards | Added constraints, e.g. `check (method <> 'cohort' or cohort_id is not null)`; unique `(course_id, external_ref)`; unique `(user_id, course_id)` on completion | `schema.sql:97,252,350`; `DATA-002/007/009` | ✅ |
| 12 | More expressive group scope model | Moodle core has **no per-group grade capability** — separate-groups gives only a two-way (own vs everything) split; "see B but not grade B, while C is invisible" is not expressible in core | `scope_verdict` keeps SEE and ACT-ON as two separate booleans per group; **now reachable + enforced on the routed API** | `services/groups.py` (`scope_verdict`); PR #25; `HC-03` trace | ✅ (upgraded 2026-07-22 — routed 500 fixed) |
| 13 | DB cascade of role rows on context delete | Moodle relies on manual PHP cleanup | `role_capability`/`role_assignment` FKs use `on delete cascade` from `context` | `schema.sql:179,201`; `HIS-009` | ✅ |

---

## Notes on the conditional items

**Note A — soft-delete retention (#7):** This is a real advantage: the small system can produce a **current** cross-course progress report that *includes soft-deleted courses*, which Moodle cannot do after a hard `delete_course`. However, it is **narrower than it first appears**: the per-activity detail depends on `activity_completion`, and the audit confirmed **no code writes that table** (it is seed/external only). So the surviving, queryable data is mainly the **manual `course_completion`** row, not full activity-level progress. The superiority holds for course-level completion retention; it does not (yet) deliver a full activity-level history. (Ref: `05-data-final-verdicts.md` C3/C4; `PRG-031`.)

**Note B — group scope expressiveness (#12):** The `scope_verdict` model is genuinely more expressive than Moodle core (it can separate "can see" from "can act on" at group granularity). **But** this logic is currently **unreachable through the real API** because `/access-check` and `/allowed` crash with a 500 (the `has_capability` arity bug at `services/groups.py:201`, issue `T2-GRP-001`). So it is a **design** strength that is not yet a **working** strength until that bug is fixed. It is listed here because the model itself is superior; it becomes a real advantage once the endpoint is repaired.

---

## Grouped view (by area)

**Data integrity (strongest area):** #1 real FKs · #2 unique role assignment · #11 extra CHECK/unique guards · #13 cascade on context delete.

**Concurrency & transactions:** #3 real enrolment transactions · #10 graceful concurrent group add.

**Schema design & correctness:** #4 drift-proof context path · #5 enums vs magic ints · #6 no Y2038 sentinel · #8 `jsonb` config.

**History & reporting:** #7 soft-delete retention (⚠️ conditional).

**Permissions & groups:** #9 richer "why" trace · #12 see/act separation (⚠️ conditional).

---

## Where these came from
- `FINAL-PARITY-REPORT.md` §5 "Where the target is better than Moodle"
- `what-didnt-survive.md` → "Where the target is actually thicker than Moodle"
- `evidence/moodle/05-data-final-verdicts.md` → "Superior-to-Moodle items"
- `COVERAGE-MATRIX.md` → rows tagged "(superior)"
- Confirmed by `evidence/validation/INDEPENDENT-VALIDATION.md`

*No behavior was invented. Moodle is the source of truth. Every item is a difference the audit proved from source, with the conditional ones honestly marked.*
