# Work Package 02 — Mahdi — Progress & Completion

**Engineer:** Mahdi · **Domain:** Course completion, activity completion, progress calculation, dashboard/timeline, completion services/APIs/frontend/tests
**Team:** Team 2 (People & Enrolment) · **Integration branch:** `team2/parity-fixes`
**Status of inputs:** parity audit COMPLETE. This package converts the confirmed audit issues into an implementation plan. It invents nothing; every task cites a target file:symbol, a Moodle source symbol (behaviour truth), or a coordination doc.
**Source-of-truth precedence used throughout:** Moodle = behaviour truth (`/Users/yamanobiedat/Documents/GitHub/moodle/public/...`); `schema.sql` = enforceable DDL truth; staging = UI truth (NO staging access in this environment — UI behaviour not derivable from the committed frontend is flagged `INSUFFICIENT EVIDENCE — requires staging inspection`).

**Issues owned by this package:** T2-PRG-001, T2-PRG-002, T2-PRG-003, T2-PRG-004, T2-PRG-005. Contributes writes for T2-DATA-001 (`audit_log` — `completion.*` events).

---

## 1. Executive summary

The progress subsystem is a **thin manual-completion + read-time-percentage backend hidden behind a rich, false-similarity frontend mock.** The target ships two disjoint progress surfaces (`evidence/small-system/04-progress-inventory.md:11-45`): (1) a live backend (`app/routers/progress.py`, wired `main.py:79`) with exactly 5 endpoints over ONE read view `v_course_progress` plus writes to `course_completion`; and (2) a completely different frontend mock (`src/mocks/progress.js`, active when `VITE_USE_MOCKS=1`) that the four progress components actually call. Only `POST /api/progress/complete` exists on both sides. Everything richer the UI shows — the per-activity report grid, teacher override, criteria editor with ALL/ANY, and the 3-year history timeline — is served by JavaScript arrays, not Postgres (`evidence/moodle/04-completion-final-verdicts.md:23-24`).

The work closes **five confirmed gaps**, in priority order:

1. **T2-PRG-001 (High) — progress % can exceed 100% and report false completion.** `v_course_progress` builds numerator and denominator with different activity filters (`schema.sql:449,454-456` vs `:450-451`): completions on hidden / non-tracked / soft-deleted activities inflate `activities_done` but not `activities_total`, so `percent_complete > 100` and `calculated_complete` fire spuriously (worked 125% case, `domain-reports/cross-system-resolution.md:82-83`). Fix via `D-VIEW` (Essa) + a defensive clamp in the service.
2. **T2-PRG-005 (Medium) — progress not enrolment-gated.** The view never joins enrolment (`schema.sql:442-457`), so a fully-unenrolled user still returns live progress; Moodle gates display on active enrolment via `is_tracked_user` (`completionlib.php:1402-1404`). Fix via the same `D-VIEW` enrolment-status join — gating display while preserving stored rows.
3. **T2-PRG-002 (Medium; historical-integrity High) — `time_completed` is mutable and un-completable.** Re-POST rewrites the timestamp (`progress.py:112-117`) and DELETE clears it (`:131-139`); Moodle's `timecompleted` is write-once (`completion_completion.php:158-212`). Fix in code (write-once + audited reset) plus optional `D-IMMUT` hardening.
4. **T2-PRG-003 (High) — automatic completion, criteria, aggregation & overrides are mock-only.** No backend endpoint writes `activity_completion`; no criteria/aggregation tables; override column exists but no route (`04-progress-inventory.md:60-110`). Build a real activity-completion write path, criteria + aggregation subsystem (`D-CRIT`, Essa), and a real capability-gated override path.
5. **T2-PRG-004 (Medium) — HC-05 3-year timeline fabricated.** `HistoryTimeline` renders `/api/progress/snapshots`, which exists only in the mock over 4 hardcoded rows incl. a phantom user id 9 (`mocks/progress.js:317-344`, `seed.js:196-201`). Either implement a real snapshot/ledger (`D-SNAP`, Essa) or honestly scope the time-series out and serve current-state only.

Woven through all of these: **T2-DATA-001** — `audit_log` exists (`schema.sql:391-401`) but no completion code writes it; every completion mutation must emit a `completion.*` event.

**Three genuine strengths the audit confirmed must be preserved, not regressed** (§21): completion survives unenrol (test-guarded, `test_enrolment.py:324-334`); re-enrol reattaches by key (`schema.sql:350,369`); and soft-delete retention exceeds Moodle, surfaced via the `course_deleted` flag (`schema.sql:447`).

All schema changes are **Essa dependencies** (`D-VIEW`, `D-CRIT`, `D-SNAP`, `D-IMMUT`, `D-AUDIT` adequacy); auth/authz are **Khaled dependencies** (`D-AUTH`, `D-ENFORCE`). Mahdi writes NO DDL and never edits another engineer's files.

---

## 2. Scope

Owned outright (edit freely, within the matrix `TEAM-OWNERSHIP-MATRIX.md`):

- **Backend router:** `app/routers/progress.py`.
- **Backend service:** `app/services/progress.py` *(new — progress logic currently sits inline in the router; matrix `:34`)*.
- **Backend schemas:** `app/schemas_progress.py` *(new — matrix `:45`)*. NB: the models `CourseProgress`/`CompleteRequest` are currently defined **inline** in `progress.py:27-43`, not in shared `schemas.py` (which holds only `User/Course/Role/Group/Enrolment`, `schemas.py:5-31`); extraction moves them out of the router.
- **Backend tests:** `backend/tests/test_progress.py` *(new)*, `tests/hard-cases/hc5_three_year_progress.sh` *(new)*.
- **Frontend page:** `src/pages/ProgressPage.jsx`.
- **Frontend components:** `src/components/progress/*` — `CompletionGrid.jsx`, `CriteriaEditor.jsx`, `HistoryTimeline.jsx`, `MyProgress.jsx`.
- **Frontend lib/mocks:** `src/lib/progressApi.js`, `src/mocks/progress.js` (retire per MERGE-STRATEGY).
- **DB tables (domain owner — request DDL via Essa):** `course_completion`, `activity_completion`. View `v_course_progress` (semantics owner; DDL via `D-VIEW`).
- **Audit rows:** `audit_log` events with `event` prefix `completion.*` (append-only; `D-AUDIT`).

If new completion-criteria tables are created (`D-CRIT`), Mahdi is their **domain owner** (requests changes, writes rows) but not their DDL author.

---

## 3. Out of scope

- **All DDL / migrations / seed** — Essa only. Any column, index, constraint, view, or trigger change is a dependency to Essa (`D-VIEW`, `D-CRIT`, `D-SNAP`, `D-IMMUT`, `audit_log` adequacy under `D-AUDIT`). Mahdi never edits `schema.sql`, `fixtures.sql`, `seed.sql`.
- **Authentication mechanism** — Khaled (`D-AUTH`). Mahdi consumes `Depends(current_user)`; does not build session/JWT verification. `src/context/ActingUser.jsx` is Khaled's — consume, do not edit.
- **Authorization engine** — Khaled (`D-ENFORCE`). Mahdi consumes `has_capability(db, user_id, capability, context_id)` / `require_capability(...)`; never re-implements capability resolution in Python, SQL, or JS (the audit's three-resolver problem, `cross-system-resolution.md:85-96`, must not grow a fourth copy).
- **Enrolment, roles, groups business logic** — Yaman/Khaled/Mahmoud. Mahdi reads `enrolment*`, `role*`, `group*`, `context` (and views `v_enrolment_detail`/`v_course_participant`) READ-ONLY to consume the enrolment gate; never writes them and never implements their logic.
- **Group-aware progress denominator** — depends on Mahmoud's group visibility/availability (`D-GRP-VIS`/`D-GRP-AVAIL`) and his broken routed scope path (`groups.py:201`, T2-GRP-001). Do not implement group logic; coordinate or scope out (§17).
- **Grades / grade-based completion** — no grade tables exist in the target (`answers-progress.md:113-115`, Team-1 scope). Do not build one; scope grade criteria out with a Moodle citation.
- **`courses.py` projection, `db.py`, `supa.py`, `main.py`, `api.js`, `errors.js`, `src/components/common/*`, `src/context/SelectedCourse.jsx`, `src/pages/DashboardPage.jsx`, `src/mocks/{core,seed,index}.js`** — SHARED-Essa custodian; changes only via additive coordination PR.

---

## 4. Objectives

- **O1 — Correct, bounded progress %.** Numerator and denominator drawn from ONE tracked-activity set (visible + `completion_enabled` + not soft-deleted); FAIL excluded from the numerator; `percent_complete ∈ [0,100]`; `calculated_complete` can never fire on an over-count. (T2-PRG-001)
- **O2 — Enrolment-gated display, retained storage.** Unenrolled/suspended users return no live progress; the underlying completion rows remain and resurface on re-enrol. (T2-PRG-005, preserving PRG-031)
- **O3 — Immutable completion history.** `time_completed` is write-once; repeat completes no-op; un-completion is an explicit, authorized, audited reset — not a plain DELETE; `time_enrolled` set on insert. (T2-PRG-002)
- **O4 — Real completion subsystem.** Activity completion is written by real endpoints (view/tick/override), instantly cascades to course completion, aggregates persisted criteria (ALL/ANY) server-side, and enforces override capability + lock. (T2-PRG-003)
- **O5 — Honest history.** The fabricated 3-year timeline is gone; either a real snapshot/ledger backs `/snapshots` or the endpoint 404s and current-state (incl. soft-deleted courses) is served honestly. (T2-PRG-004)
- **O6 — Auditable.** Every completion mutation writes a `completion.*` `audit_log` row (actor/affected/course/context/before-after/timestamp). (T2-DATA-001 completion writes)
- **O7 — Strengths preserved.** Completion survives unenrol, reattaches on re-enrol, and soft-delete retention + `course_deleted` flag intact — each regression-guarded. (PRG-030/031, HC-05a)
- **O8 — Tested & regression-safe.** Hermetic pytest for every fixed behaviour; a hermetic `hc5` asserting real state; `test_enrolment.py:324-334` stays green.

---

## 5. Complete implementation roadmap

Ordered by dependency and risk. Each step names its gating dependency (§23) and merge unit (§24).

**Phase A — rebase on foundation (blocked until Phase 1 of IMPLEMENTATION-ORDER lands).**
Wait for `t2/essa/D-SEC`, Essa's migration batch (`D-VIEW`, `D-CRIT`, and — if chosen — `D-SNAP`/`D-IMMUT`), `t2/khaled/D-AUTH`, `t2/khaled/D-ENFORCE`. Rebase all Mahdi branches on these so authz wiring and view semantics are consumed once (`IMPLEMENTATION-ORDER.md:20-27`; `MERGE-STRATEGY.md:13`).

**Phase B — model extraction (branch `t2/mahdi/schemas_progress-extract`, no deps — start first).**
1. Move `CourseProgress`/`CompleteRequest` out of `progress.py:27-43` into `app/schemas_progress.py`; widen `percent_complete`/`percent_remaining` to `float | None` for the null "no bar" rule (§15). Add the new models the real contract needs (§6).

**Phase C — progress correctness (branch `t2/mahdi/T2-PRG-001-005-view-consume`, rebased on `D-VIEW`).**
2. T2-PRG-001: consume Essa's rewritten `v_course_progress` (single tracked-activity set + clamp + FAIL-exclusion); in `services/progress.py` add a defensive clamp `percent = min(100.0, max(0.0, round(done/total*100, 1))) if total>0 else None` and derive `calculated_complete` from the corrected count. (`schema.sql:442-457`; Moodle `progress.php:48-83`, `completionlib.php:1700-1720`)
3. T2-PRG-005: consume the enrolment-status gate added to `v_course_progress` (join `v_course_participant`/`v_enrolment_detail` liveness `schema.sql:420-425,430-438`); gate the endpoint, keep the rows. Add the reattach regression (§21). Provide Yaman the corrected `hc2` ASSERT-2 text (§18).

**Phase D — immutable completion (branch `t2/mahdi/T2-PRG-002-immutable-complete`).**
4. T2-PRG-002: rewrite `mark_complete` (`progress.py:104-128`) — write-once `time_completed`, set `time_enrolled` on insert, no-op on repeat. Replace `DELETE /complete` (`:131-139`) with a capability-gated, audited `POST /complete/reset`.

**Phase E — real completion subsystem (branch `t2/mahdi/T2-PRG-003-activity-criteria-override`, rebased on `D-CRIT` + `D-ENFORCE`).**
5. Activity write path: real `POST /activities/{id}/view` and `.../complete` writing `activity_completion` (Moodle `set_module_viewed` `completionlib.php:791-816`, `update_state` `:575-673`), with instant course re-aggregation in-transaction (Moodle PRG-013 `:1298-1307`). (§13, §16)
6. Criteria + aggregation: real `GET/POST /courses/{id}/criteria` over `D-CRIT` tables; a real aggregation engine (ALL/ANY overall + per-type) marking course completion write-once (Moodle `:474-487`, `completion_criteria.php:35-94`). Implement in-scope types (ACTIVITY, SELF, DATE, DURATION); scope out GRADE/ROLE/COURSE with citations.
7. Override: real `POST /activities/{id}/override` — `require_capability('completion:override', course_ctx)` (canonical name per `D-CAPNAME`), server-set `overridden_by`, complete-override lock (Moodle `:592-598,633-636,656-657`).

**Phase F — audit + history (branches `t2/mahdi/T2-DATA-001-completion-audit`, `t2/mahdi/T2-PRG-004-hc05`).**
8. T2-DATA-001: emit `completion.*` `audit_log` rows from every mutation via the shared helper (§16 R-AUDIT).
9. T2-PRG-004: choose option A (real `D-SNAP` ledger, also aids T2-DATA-001 durable residue) or option B (remove timeline, serve current-state incl. soft-deleted); remove the phantom fabrications from the mock/seed (§7).

**Phase G — frontend consolidation + tests.**
10. Collapse the two surfaces onto one real contract (§11); simplify `progressApi.js`; retire `mocks/progress.js`; migrate seed rows to SQL via Essa. (§7)
11. Write hermetic `test_progress.py` (§20) and `hc5_three_year_progress.sh` (§20); keep `test_enrolment.py:324-334` green.

**Phase H — integration (Phase 3 of IMPLEMENTATION-ORDER).**
12. Cross-domain scenarios from `cross-system-resolution.md` (XD-05 reattach, XD-08 progress-vs-groups, XD-09 deleted-activity over-count) (§18, §22).

---

## 6. Backend files to modify

| File | Change | Issues |
|---|---|---|
| `app/routers/progress.py` | Add `Depends(current_user)` to all routes; `require_capability` before override/criteria-edit/reset; delegate all logic to `services/progress.py`; consolidate onto the real contract (§11); return `percent_complete=None` when `total==0`; replace `DELETE /complete` with `POST /complete/reset`; add real activity/criteria/override/self-complete routes; migrate off `supa.py` to the Essa-designated data layer | all PRG + T2-DATA-001 |
| `app/services/progress.py` *(new)* | House compute + mutation logic: read `v_course_progress` + clamp/null rule; write-once `mark_course_complete`; `reset_course_complete`; `set_activity_viewed`/`set_activity_state`/`override_activity_state` + instant cascade; `get_criteria`/`upsert_criteria`/`evaluate_course_completion`; `write_audit` helper (or call the shared one) | T2-PRG-001..005, T2-DATA-001 |
| `app/schemas_progress.py` *(new)* | Extract `CourseProgress` (`percent_complete: float\|None`), `CompleteRequest` from `progress.py:27-43`; add `ActivityCompletionCell`, `CourseReport` (activities + rows + `can_override` + `cannot_override_reason`), `Criterion`/`CriteriaSet`, `OverrideRequest`, `SnapshotRow` (if §16 option A). Field names aligned to the frontend contract (`progressApi.js`) | organizational + all PRG |
| `app/routers/__init__.py` *(SHARED — Essa custodian)* | If route registration changes, additive diff via Essa | organizational |
| `main.py` / `app/db.py` / `app/supa.py` *(SHARED — Essa custodian)* | Progress moves to the surviving data layer Essa designates (expected asyncpg `db.py`); the RLS-bypassing service-role `supa` path is retired for progress — coordinated with Essa, not a Mahdi edit | T2-PRG-* (trust boundary) |
| `app/schemas.py` *(SHARED — Essa custodian)* | No Mahdi edit needed — progress models never lived here; extraction is from `progress.py` | organizational |

---

## 7. Frontend files to modify

Staging = UI truth, but **no staging access**; the following are grounded in the committed components. UI behaviour not derivable is flagged.

| File | Change | Evidence / flag |
|---|---|---|
| `src/lib/progressApi.js` | Once the backend serves the contract paths, the contract-first call (`:20-24`) hits the real backend; drop the hardcoded `excluded:0` (`:33`) and `manual_completable:true` (`:37`); remove the null-bar re-derivation (`:32`) since the API now returns null; update the divergence comment block (`:9-15`) | derivable from `progressApi.js:18-40` |
| `src/components/progress/CompletionGrid.jsx` | Report grid already calls the contract endpoints; verify binding to the real `CourseReport` shape; `/toggle` → real `/activities/{id}/complete`, `/override` real + capability-driven `can_override`; **never trust client `actor_id`** (`:50,80`) — the authenticated principal drives it | derivable; override-modal UX **INSUFFICIENT EVIDENCE — requires staging inspection** |
| `src/components/progress/CriteriaEditor.jsx` | `KINDS` (`:8`) and ALL/ANY (`:39-43`) now hit real `D-CRIT`-backed endpoints; disable/annotate out-of-scope kinds (grade/role/course) rather than faking | derivable |
| `src/components/progress/HistoryTimeline.jsx` | Per §16 option A/B: back `/snapshots` (`:30`) with a real ledger, or repoint to current cross-course state and relabel the "Past 3 years" control (`:57-76`); remove reliance on phantom user 9 | derivable; whether the screen is demo-only **INSUFFICIENT EVIDENCE — requires staging inspection** |
| `src/components/progress/MyProgress.jsx` | `manualComplete` already uses real `POST /api/progress/complete` (`:57-66`) — keep; ensure write-once doesn't surprise UI (second click no-ops, date doesn't move); `self-complete` (`:45-54`) now real | derivable |
| `src/pages/ProgressPage.jsx` | No structural change; ensure Report/My-progress/Criteria/History tabs (`:14`) function once mocks retired | derivable |
| `src/mocks/progress.js` | Retire per file header + matrix `:100`; removes phantom user 9 / HIST9 fabrications | derivable |
| `src/mocks/seed.js` *(SHARED — Essa custodian, `:103`)* | Remove/migrate progress arrays (`ACTIVITY_COMPLETIONS:164-172`, `COURSE_CRITERIA:175-184`, `COURSE_COMPLETIONS:186-192`, `SNAPSHOTS:196-201`) to SQL seed via Essa coordination PR | derivable |
| `src/pages/DashboardPage.jsx` *(SHARED — Essa custodian)* | If it shows progress, coordinate any contract change with Essa; do not edit directly | **INSUFFICIENT EVIDENCE — requires staging inspection** |

---

## 8. Database tables (owned domain — DDL requested via Essa; written by Mahdi code)

| Table | DDL ref | Mahdi writes | Notes |
|---|---|---|---|
| `course_completion` | `schema.sql:343-351` | insert/update `time_enrolled/time_started/time_completed`; write-once complete; audited reset | `unique (user_id, course_id)` (`:350`) is the concurrency guard; survives unenrol + soft-delete (no cascade, `:345-346`) — must stay that way |
| `activity_completion` | `schema.sql:361-370` | insert/update `state`, `viewed_at`, `overridden_by` via new endpoints | states enum `completion_state:37`; `unique (user_id, activity_id)` (`:369`); no `on delete cascade` (`:363`) |
| `course_completion_criteria` / `course_completion_aggr_methd` / `course_completion_crit_compl` *(new, `D-CRIT`)* | Essa migration | insert/update criteria defs, aggregation method, per-user per-criterion completion | mirror Moodle CCCR/CCAM/CCCC (`04-completion.md:19-21,206-264`) |
| `progress_snapshot` / ledger *(new, `D-SNAP`, if §16 option A)* | Essa migration | append snapshots from real write path | FK-free / soft-FK so rows outlive soft-delete |
| `v_course_progress` | `schema.sql:442-457` | READ (view) | semantics owner; fix via `D-VIEW` (num/denom single set + clamp + FAIL-exclude + enrolment gate); keep soft-deleted-course inclusion + `course_deleted` flag (`:447`) |
| `audit_log` | `schema.sql:391-401` | append `completion.*` rows | SHARED-Essa DDL; index `idx_audit_affected` (`:401`); currently never written |

---

## 9. Database tables (READ ONLY)

Per matrix `:139`, Mahdi reads but never writes these:

- `enrolment`, `enrolment_method`, and views `v_enrolment_detail` (`schema.sql:409-428`), `v_course_participant` (`:430-438`) — Yaman. Read ONLY to supply the enrolment-status gate for `v_course_progress` (T2-PRG-005). Never write; never author enrolment logic.
- `role`, `role_capability`, `capability`, `context` — Khaled. The override capability check goes through Khaled's `has_capability`/`require_capability` API; Mahdi never queries capability-resolution tables directly.
- `course_group`, `group_member`, `grouping`, `grouping_group` — Mahmoud. Read only, and only if a future group-aware denominator is pursued via Essa (§17); do not make access decisions from them.
- `course`, `course_activity` — Essa (Team-1 projection). Read for `visible`/`completion_enabled`/`deleted_at`/`group_mode` (`schema.sql:86-98`) used by the tracked-activity set; any tracking-mode column change is an Essa dependency.
- `app_user` — Yaman (People). Read for names/soft-delete in reports.

---

## 10. Database tables (NO ACCESS)

- **Enrolment/role/group business logic and mutation** — Mahdi must not write `enrolment*`, `role*`, `role_assignment`, `group_member`, `course_group`, `grouping*`, `context`, or `cohort*`, and must not implement their rules.
- **Capability-resolution internals** (`fn_can` `schema.sql:475-532`, `permissions.py`) — call the published API only; never re-resolve capabilities in Python/SQL/JS.
- **Team-1 projection writes** (`course`, `course_activity`, `courses.py` sync) — Essa only.
- **All DDL/seed** (`schema.sql`, `fixtures.sql`, `seed.sql`) — Essa only; every schema need is a dependency (§23).

---

## 11. API endpoints

All live in `routers/progress.py` (prefix `/api/progress`, `progress.py:22`). **Every mutation gains `Depends(current_user)` (`D-AUTH`); override/criteria-edit/reset gain `require_capability` (`D-ENFORCE`).** The plan consolidates the two disjoint surfaces (§1) onto one real backend contract; the "Replaces" column names the mock route being made real.

| Method + path | Current | Change | Replaces / issue |
|---|---|---|---|
| GET `/api/progress?user_id&course_id` | `get_progress` (`:81`) | return `percent_complete=None` when `total==0`; clamp | T2-PRG-001 |
| GET `/api/progress/course/{id}` | `progress_by_course` (`:90`) | enrolment-gated roster progress | T2-PRG-001/005 |
| GET `/api/progress/user/{id}` | `progress_by_user` (`:96`) | enrolment-gated; keep soft-deleted courses (`course_deleted`) | T2-PRG-005, HC-05a |
| GET `/api/progress/users/{id}/overview` | mock `:189-231` | real dashboard overview | T2-PRG-003 |
| GET `/api/progress/courses/{id}/report` | mock `:150-186` | real report grid + `can_override` | T2-PRG-003 |
| GET/POST `/api/progress/courses/{id}/criteria` | mock `:233-263` | real criteria (POST capability-gated) | T2-PRG-003 (D-CRIT) |
| POST `/api/progress/activities/{id}/view` | mock `:265-272` | real `viewed_at`; view→complete where required | T2-PRG-003 |
| POST `/api/progress/activities/{id}/complete` | mock `/toggle :274-281` | real manual tick | T2-PRG-003 |
| POST `/api/progress/activities/{id}/override` | mock `:283-295` | real; capability + `overridden_by` + lock | T2-PRG-003 (D-ENFORCE) |
| POST `/api/progress/courses/{id}/self-complete` | mock `:297-315` | real; refuse when no self criterion | T2-PRG-003 |
| POST `/api/progress/complete` | `mark_complete` (`:104`) | write-once; set `time_enrolled`; idempotent no-op | T2-PRG-002 |
| POST `/api/progress/complete/reset` | *(new)* | replaces `DELETE /complete` (`:131`); capability-gated + audited | T2-PRG-002 |
| GET `/api/progress/snapshots` | mock `:317-344` | real ledger (D-SNAP) OR 404 with mocks off | T2-PRG-004 |

No business endpoint is invented beyond making the already-demoed mock routes real. Error contract via shared `errors.js` (Essa custodian; Mahdi adds progress codes via coordination PR): 401 unauth, 403 capability refusal (reasons in `detail` for `ReasonList`), 404 missing record.

---

## 12. Services

`app/services/progress.py` (new, owner Mahdi) — function-level work:

- `get_progress` / `list_by_user` / `list_by_course` — read `v_course_progress` (post `D-VIEW`); apply defensive clamp + null rule (§15); the enrolment gate lives in the view (T2-PRG-005), consumed read-only.
- `mark_course_complete(db, actor, user_id, course_id)` — **T2-PRG-002**: write-once `time_completed`; set `time_enrolled` on the insert branch (fixes `progress.py:119-127` omission); idempotent no-op on repeat; `completion.course_completed` audit.
- `reset_course_complete(db, actor, user_id, course_id)` — capability-gated, audited zeroing of `time_completed`; replaces the plain DELETE.
- `set_activity_viewed` / `set_activity_state` / `override_activity_state` — **T2-PRG-003**: write `activity_completion`; `override_activity_state` calls `require_capability` and sets `overridden_by=actor.id` (server-set, never client), applies the complete-override lock; each triggers `evaluate_course_completion` in the same transaction (instant cascade).
- `get_criteria` / `upsert_criteria` / `evaluate_course_completion` — **T2-PRG-003**: persist to `D-CRIT` tables; aggregate per-type then overall (ALL/ANY); on overall-true call `mark_course_complete` (write-once).
- `write_audit(db, event, actor_id, affected_id, course_id, context_id, detail)` — **T2-DATA-001**: or delegate to the shared helper (§16 R-AUDIT), inside the same transaction as the mutation.

All cross-domain reads (enrolment liveness, override capability) go through the owning domain's public API/view — never direct writes, never re-implemented logic.

---

## 13. Controllers

The "controllers" are the FastAPI routes in `routers/progress.py` — thin HTTP layers; **all logic moves to `services/progress.py`** (matrix `:34`; the router currently mixes both, e.g. `_to_progress:48-67`, `_fetch:70-76` inline). Controller responsibilities:

- Attach `Depends(current_user)` (`D-AUTH`) to every route and `require_capability` (`D-ENFORCE`) to override/criteria-edit/reset — the ONLY place authz is wired; the service trusts the resolved principal.
- Map service refusals to HTTP: 401 (no principal), 403 (capability denied, reasons in `detail`), 404 (no record). Match the mock's refusal shape (`{reasons:[...]}`, `mocks/progress.js:289,303-305`) so the frontend `ReasonList` renders verbatim.
- Do not accept client-supplied `actor_id` (the mock trusts `body.actor_id`, `mocks/progress.js:288,292`; `CompletionGrid.jsx:50,80` sends it) — derive the actor from the authenticated principal.
- No business logic in controllers; new rules (write-once, override lock, criteria aggregation) live in the service.

---

## 14. Repositories

The target has no separate repository layer — data access is inline in the router via `from app import supa as db` (`progress.py:20`), the PostgREST/service-role layer the audit flags for removal (`supa.py`, SHARED-Essa; matrix `:51`). Work items expressed as "repository/query":

- **Data-layer migration.** Move progress reads/writes to the surviving layer Essa designates (expected asyncpg `app/db.py`). This removes the RLS-bypassing service-role trust boundary from the progress path (`HC-05-three-year-progress.md:102`). Coordination item with Essa, not a Mahdi DDL/infra edit.
- **Progress read** — `v_course_progress` via a single parameterized query (replaces `_fetch:70-76`), post-`D-VIEW`.
- **Completion writes** — wrap `mark_course_complete`/activity writes/instant cascade in a real transaction (asyncpg), replacing the non-atomic check-then-act SELECT→UPDATE|UPSERT (`progress.py:108-127`). Rely on `unique(user_id,course_id)` / `unique(user_id,activity_id)` (`schema.sql:350,369`) with deliberate `on conflict` — not PostgREST merge-duplicates.
- **`audit_log` insert** — a small `_audit(...)` helper (or the shared one) writing inside the same transaction so audit is atomic with the change.
- No `SELECT ... FOR UPDATE` needed where the unique constraint suffices; add locking only if a criteria-aggregation pass requires it.

---

## 15. Validation rules

- **V1 (authz):** every mutation requires an authenticated principal (`D-AUTH`); override/criteria-edit/reset also pass `require_capability` at the course context (`D-ENFORCE`). Missing principal → 401; missing capability → 403 naming the capability. (T2-PRG-003, T2-DATA-001 actor)
- **V2 (write-once):** `POST /complete` on a row whose `time_completed` is non-NULL is a no-op returning current state; it never overwrites. Only sets when NULL. (T2-PRG-002)
- **V3 (reset intent):** clearing completion is only via `POST /complete/reset`, capability-gated + audited; there is no plain DELETE. (T2-PRG-002)
- **V4 (null "no bar"):** `percent_complete` is `null` when there are no tracked activities (`total==0`), matching Moodle `progress.php:48-83` — not `0.0`. (T2-PRG-001)
- **V5 (clamp):** `percent_complete ∈ [0,100]`; `calculated_complete` derived from the corrected count only. (T2-PRG-001)
- **V6 (enrolment gate):** progress endpoints return no live rows for users without active enrolment (per `v_course_participant.enrolled`/liveness), while retaining stored rows. (T2-PRG-005)
- **V7 (override authority):** `override_activity_state` requires the canonical `completion:override` capability (`D-CAPNAME`); `overridden_by` is server-set to the principal; a complete-override locks against automatic recompute. (T2-PRG-003)
- **V8 (self-complete precondition):** `self-complete` refuses (403 with reason) unless the course has a self criterion (mirrors `mocks/progress.js:301-306`). (T2-PRG-003)
- **V9 (criteria typing):** criteria kinds constrained to the implemented set (ACTIVITY/SELF/DATE/DURATION); out-of-scope kinds (GRADE/ROLE/COURSE) rejected with a documented reason, not silently faked. (T2-PRG-003)
- **V10 (snapshot honesty):** `/snapshots` returns only real persisted rows or 404 — never fabricated arrays. (T2-PRG-004)

---

## 16. Business rules

Rules restated from Moodle behaviour truth; each cites the Moodle symbol and the target site.

- **R-PROGRESS (T2-PRG-001):** progress% = completed / countable over ONE tracked-activity set = `visible AND completion_enabled AND deleted_at is null`; numerator counts `state in ('complete','complete_pass')` (FAIL excluded); `percent_complete` clamped `[0,100]`; `null` when no tracked activities. Source: Moodle `get_course_progress_percentage` `progress.php:48-83`, denominator `completionlib.php:1346-1393`, numerator `:1700-1720`. Target defect: `v_course_progress` numerator `schema.sql:449,454-456` vs denominator `:450-451`. Fix via `D-VIEW` + service clamp.
- **R-TRACKED-USER (T2-PRG-005):** progress display is gated on active enrolment; unenrolled/suspended → no live progress, stored rows retained, resurface on re-enrol. Source: Moodle `is_tracked_user → is_enrolled(onlyactive=true)` `completionlib.php:1402-1404`. Target has no enrolment join (`schema.sql:442-457`). Fix: enrolment-status join in `D-VIEW` (read-only consumption of `v_enrolment_detail.live` `schema.sql:420-425`).
- **R-IMMUTABLE (T2-PRG-002):** `time_completed` is set once and never changed; repeat complete no-ops; un-completion is an explicit audited reset. Source: Moodle `mark_complete()` never changes existing `timecompleted` `completion_completion.php:158-212`. Target defect: rewrite `progress.py:112-117`, DELETE `:131-139`. Also set `time_enrolled` on insert (`:119-127` omits it). Optional DB guard via `D-IMMUT`.
- **R-ACTIVITY-STATE (T2-PRG-003):** activity completion is written by real endpoints — view sets `viewed_at` and (where required) completes; manual tick toggles for MANUAL activities. Source: Moodle `set_module_viewed` `completionlib.php:791-816`, `update_state` `:575-673`. Target: no writer today; `viewed_at`/`state`/`overridden_by` columns exist (`schema.sql:365-367`). Grade-derived pass/fail is scoped out (no grade tables, `answers-progress.md:113-115`).
- **R-CASCADE (T2-PRG-003):** a single activity-completion write instantly re-evaluates course completion for that `(user,course)` in the same transaction; if criteria met, set `time_completed` write-once. Source: Moodle instant cascade `completionlib.php:1298-1307`. Target computes on-read today (fresh by construction, `04-completion-final-verdicts.md:17`) — keep freshness, add persistence of the completion timestamp.
- **R-CRITERIA (T2-PRG-003):** criteria are persisted (`D-CRIT`) and aggregated server-side: per-type then overall ALL/ANY, default ALL. Implement ACTIVITY (state ∈ complete/complete_pass), SELF (user self-marks), DATE (`now > timeend`), DURATION (`now > timeenrolled + period`); scope out GRADE/ROLE/COURSE with citations. Source: Moodle `completion_criteria.php:35-94`, aggregation `completionlib.php:474-487`, per-criterion `04-completion.md:274-290`. Target: mock-only 4 kinds, only activity+self working (`answers-progress.md:152-160`).
- **R-OVERRIDE (T2-PRG-003):** override requires `completion:override` at course context, records the overrider, and a complete-override on an automatic activity locks it against recompute (incomplete-override does not). Source: Moodle `:592-598,633-636,656-657`. Target: mock-only (`mocks/progress.js:283-295`); `fn_can` never called by progress. Use Khaled's `has_capability` — no fourth resolver.
- **R-RETENTION (preserve — PRG-030/031, HC-05a):** completion survives unenrol and soft-delete; re-enrol reattaches by `(user,activity)`/`(user,course)` keys; `v_course_progress` includes soft-deleted courses with `course_deleted`. Source: `enrolment.py:346-348` (never deletes), keys `schema.sql:350,369`, flag `:447`. Mahdi must add NO code path that deletes completion on unenrol.
- **R-HISTORY (T2-PRG-004):** the honest bar — current cross-course state (incl. soft-deleted) is answerable and exceeds Moodle; a true time-series needs an explicit added ledger (Moodle has none, `04-completion.md:471-477`). Either build `D-SNAP` populated from real events, or serve current-state and 404 `/snapshots`. Never fabricate.
- **R-AUDIT (T2-DATA-001):** every completion mutation writes one `audit_log` row: `completion.activity_updated/activity_overridden/course_completed/course_reset/criteria_changed`, with `actor_id`, `affected_id`=target user, `course_id`, `context_id`, `detail` (before/after). Schema `schema.sql:391-401`; never written today (`history-retention.md:89-100`). `D-AUDIT` confirms index adequacy; Mahdi writes only completion-domain rows.

---

## 17. Edge cases

1. **Completed-then-soft-deleted activity.** Today it inflates the numerator (`percent>100`, false complete); after `D-VIEW` single-set filter it drops from both sides → ≤100%, `calculated_complete=false`. (T2-PRG-001, XD-09)
2. **Hidden tracked activity.** Excluded from both numerator and denominator; a student can reach 100% via visible work. Today the backend counts it (`schema.sql:450-451` has no `visible` filter), opposite the mock/Moodle. (T2-PRG-001)
3. **No tracked activities.** Returns `percent_complete=null` (no bar), not `0.0`. (T2-PRG-001)
4. **Unenrolled user with surviving completion.** Live endpoint returns nothing (gated); DB row retained; re-enrol resurfaces it. (T2-PRG-005, PRG-031)
5. **Suspended user.** Gated like `onlyactive=false` (`cross-system-resolution.md:49`). (T2-PRG-005)
6. **Repeat `POST /complete`.** No-op; `time_completed` unchanged; second click in `MyProgress` doesn't move the date. (T2-PRG-002)
7. **Calculated-only completion.** A course complete purely by activities today has `time_completed=NULL` forever (`answers-progress.md:186-194`, CH-6 "when" miss); the instant-cascade write-once path (R-CASCADE) persists the timestamp.
8. **Complete-override then automatic trigger.** The lock prevents recompute from clearing an overridden-complete activity. (T2-PRG-003)
9. **Self-complete with no self criterion.** 403 with reason. (T2-PRG-003)
10. **Group-restricted activity in the denominator.** Moodle excludes per-user group availability (PRG-027); the target has no group filter and the routed group scope is broken (`groups.py:201`). Do NOT implement group logic — either request Essa add per-user availability to `D-VIEW` reading Mahmoud's tables read-only, or scope out until `D-GRP-VIS`/`D-GRP-AVAIL` land. Recommend scope-out with a note. (XD-08)
11. **Soft-deleted course.** Still appears in `/user/{id}` with `course_deleted=true` — preserve (HC-05a). (T2-PRG-004)
12. **Concurrent first-time completes.** Reconcile on `unique(user_id,course_id)` without 500; deliberate `on conflict`. (§14)
13. **Hard course delete.** Not reachable (no endpoint; no-cascade FKs would RESTRICT while completion rows reference the course, `history-retention.md:153-155`). No action; do not add a cascade.
14. **Activity soft-delete without completion cleanup.** Rows retained (no cascade); the fixed view excludes the deleted activity from both sides, so no over-count. Do not delete completion. (XD-09)

---

## 18. Hard cases

- **HC-05 — 3-year progress across courses incl. deleted/archived** (`hard-cases/HC-05-three-year-progress.md`). Verdict FALSE_SIMILARITY (0.85): the demoed timeline is mock-fabricated (`mocks/progress.js:317-344`, `seed.js:196-201`, phantom user 9). Honest bar: current cross-course incl. soft-deleted = producible and **exceeds Moodle** (HC-05a); a true time-series is impossible in either system without a ledger (`04-completion.md:471-477`). Work: (a) new hermetic `hc5_three_year_progress.sh` that seeds a learner with a soft-deleted course and asserts `GET /api/progress/user/{id}` returns it with `course_deleted=true`; (b) asserts `/snapshots` behaves per §16 option A (real ledger rows) or B (404 with mocks off); (c) asserts no phantom user/HIST9 is reachable from the live API; (d) keeps the over-count fixed so the current snapshot's numbers are trustworthy (`HC-05-three-year-progress.md:93`).
- **HC-02 — dropout/re-enrol (progress side)** (`tests/hard-cases/hc2_drop_and_return.sh`, Yaman-owned). The script reads `GET /api/progress/user/10` filtered to `course_id==3` (`:19-22,37-38,52`) and today asserts rows are still returned after a full unenrol — the pre-fix behaviour. After the enrolment gate (T2-PRG-005), provide Yaman the corrected ASSERT-2: rows retained in the DB but **gated** from the live endpoint, resurfacing on re-enrol. Co-reviewed change (Yaman merges his file); Mahdi supplies the assertion text. Regression: completion still survives unenrol (§21).
- **HC cross-domain** (`cross-system-resolution.md`): XD-05 reattach (the missing enrolment join is a feature here, a bug in T2-PRG-005 — gate display, keep storage); XD-08 progress-vs-groups (scope-out per edge case 10); XD-09 deleted-activity over-count (fixed by `D-VIEW`).

---

## 19. Acceptance criteria

- **AC-1 (T2-PRG-001):** `D-VIEW` merged; `percent_complete ∈ [0,100]` in all fixtures; `calculated_complete` never fires on over-count; hidden/non-tracked/soft-deleted excluded from both numerator and denominator; FAIL excluded; `null` when no tracked activities; `test_progress.py` AC-1 passes.
- **AC-2 (T2-PRG-005):** unenrolled/suspended users return no live progress; DB rows retained; re-enrol resurfaces (PRG-031 regression); `hc2` ASSERT-2 updated with Yaman; AC-2 test passes.
- **AC-3 (T2-PRG-002):** second `POST /complete` does not change `time_completed`; `time_enrolled` set on insert; reset is capability-gated + audited (no plain DELETE); AC-3 test passes.
- **AC-4 (T2-PRG-003 activity):** marking an activity viewed/complete writes a backend `activity_completion` row; the completion instantly re-evaluates course completion in-transaction; AC-4 test passes.
- **AC-5 (T2-PRG-003 criteria):** course completion aggregates real persisted criteria (ALL/ANY) server-side for the in-scope types; out-of-scope kinds are refused, not faked; AC-5 test passes.
- **AC-6 (T2-PRG-003 override):** override requires the `completion:override` capability, records `overridden_by`=authenticated principal (not client `actor_id`), and a complete-override locks against recompute; AC-6 test passes.
- **AC-7 (T2-PRG-004):** the fabricated timeline is gone; `/snapshots` returns real persisted rows (option A) or 404 with mocks off (option B); current cross-course incl. soft-deleted still returns (HC-05a regression); `hc5` passes.
- **AC-8 (T2-DATA-001):** every completion mutation writes exactly one `audit_log` row with actor/action/target/timestamp; a history query reconstructs a user's completion changes; AC-8 test passes.
- **AC-cross-cutting:** all progress mutations return 401 without a session and 403 without capability; no client `actor_id` trusted; progress served from the Essa-designated data layer (not the `supa` service-role path); no completion deletion on unenrol (§21 preserved).

---

## 20. Required tests

New `backend/tests/test_progress.py` — **hermetic** against an ephemeral seeded Postgres (no external creds — MERGE-STRATEGY CI requires this after `D-SEC`). There is zero progress coverage today (`04-progress-inventory.md:236-244`; T2-TEST-001). Cases:

- `test_progress_percent_bounded_and_single_set` — completion on a soft-deleted and a non-tracked activity → `percent ≤ 100`, `calculated_complete False`; hidden excluded both sides; FAIL not counted. (AC-1)
- `test_progress_null_when_no_tracked_activities` — `total==0` → `percent_complete is None`. (AC-1)
- `test_progress_gated_on_enrolment` — complete → unenrol → empty from `/user/{id}`; DB row present; re-enrol → resurfaces; suspended → gated. (AC-2)
- `test_time_completed_write_once` — second `POST /complete` doesn't change the timestamp; insert sets `time_enrolled`. (AC-3)
- `test_reset_requires_capability_and_audits` — reset 401 without session, 403 without cap, writes an audit row. (AC-3, AC-8)
- `test_activity_completion_written_and_cascades` — view/complete writes `activity_completion`; course completion re-evaluated in-transaction. (AC-4)
- `test_criteria_aggregation_all_any` — persisted criteria aggregate ALL/ANY server-side; out-of-scope kind refused. (AC-5)
- `test_override_capability_overrider_and_lock` — override needs capability, sets `overridden_by` to the principal, locks against recompute. (AC-6)
- `test_snapshots_real_or_404` — real rows (option A) or 404 mocks-off (option B); current-state incl. soft-deleted still returns. (AC-7)
- `test_completion_mutations_audited` — each mutation → one `audit_log` row. (AC-8)
- `test_concurrent_first_complete_no_500` — two concurrent completes reconcile on the unique constraint. (§14)
- `test_progress_mutations_authz_gate` — 401 without session / 403 without capability on each mutation. (MERGE-STRATEGY authz gate)

New `tests/hard-cases/hc5_three_year_progress.sh` — hermetic (seeded ephemeral DB), asserting real state per §18 HC-05 (soft-deleted course appears with `course_deleted=true`; `/snapshots` per option; no phantom user/HIST9). Model on `hc2_drop_and_return.sh` (curl + python asserts, `set -euo pipefail`).

---

## 21. Regression tests

- **`test_no_forbidden_table_writes_in_service_sql`** (`test_enrolment.py:324-334`, Yaman's) must stay green — proves the enrolment service never writes completion tables. Mahdi must not push completion logic into the enrolment path; a green here is the signal.
- **PRG-030 (completion survives unenrol)** — a `test_progress.py` case asserting completion rows persist after unenrol (no code path deletes them). Load-bearing strength.
- **PRG-031 (re-enrol reattach)** — folded into `test_progress_gated_on_enrolment`: the same rows resurface on re-enrol (the gate hides display, never storage).
- **HC-05a (soft-delete retention exceeds Moodle)** — `hc5` asserts current cross-course incl. soft-deleted returns with `course_deleted=true`.
- **Freshness (PRG-024)** — on-read/instant-cascade completion stays fresh; no stale window introduced.
- Full suite `test_progress.py` + `test_enrolment.py` + `test_permissions.py` + `test_groups.py` green before merge (MERGE-STRATEGY CI).

---

## 22. Integration points

- **Essa (DB + shared):** `D-VIEW` (view fix + enrolment gate; Mahdi authors semantics + acceptance SQL and reviews the migration, `MERGE-STRATEGY.md:35`); `D-CRIT` (criteria/aggregation tables); `D-SNAP` (if option A); `D-IMMUT` (optional); `D-AUDIT` (index adequacy + shared audit helper placement); the data-layer decision (`db.py` vs `supa.py`) and `seed.js`/`schemas.py`/`errors.js`/`api.js`/`DashboardPage.jsx` shared edits via coordination PR; `D-SEC` precondition for hermetic tests.
- **Khaled (auth/authz):** consume `Depends(current_user)` (`D-AUTH`) on every route and `has_capability`/`require_capability` (`D-ENFORCE`) for override/criteria-edit/reset; canonical capability names (`D-CAPNAME`, esp. `completion:override`). Never re-implement resolution.
- **Yaman (enrolment):** read-only consumption of `v_enrolment_detail`/`v_course_participant` for the T2-PRG-005 gate; co-review the `hc2` ASSERT-2 update (Yaman's file). Yaman guarantees liveness reads; Mahdi never writes enrolment.
- **Mahmoud (groups):** the group-aware denominator (XD-08) depends on his `D-GRP-VIS`/`D-GRP-AVAIL` and the `groups.py:201` fix — coordinate or scope out; Mahdi reads group tables only if Essa folds availability into `D-VIEW`.
- **Frontend:** components consume the authorized real API; `progressApi.js` simplified; `mocks/progress.js` retired; seed migrated via Essa.

---

## 23. Dependencies (D-* IDs)

Blocking (Mahdi cannot finish/merge until delivered):

- **D-VIEW** (Essa) — rewrite `v_course_progress`: single tracked-activity set (visible + `completion_enabled` + not soft-deleted) for numerator AND denominator; numerator `complete/complete_pass` only; clamp ≤100; **add enrolment-status gate** (join `v_course_participant`/`v_enrolment_detail`); **keep** soft-deleted-course inclusion + `course_deleted` flag. Blocks T2-PRG-001 + T2-PRG-005. `TEAM-DEPENDENCIES.md:21`.
- **D-CRIT** (Essa) — new tables `course_completion_criteria`, `course_completion_aggr_methd`, `course_completion_crit_compl` (per-type + overall ALL/ANY). Blocks T2-PRG-003 criteria work. `TEAM-DEPENDENCIES.md:22`.
- **D-AUTH** (Khaled) — authenticated principal + `Depends(current_user)`. Blocks the actor for every mutation + audit. `TEAM-DEPENDENCIES.md:12`.
- **D-ENFORCE** (Khaled) — `has_capability(db, user_id, capability, context_id)` + `require_capability`. Blocks override/criteria-edit/reset authz. `TEAM-DEPENDENCIES.md:13`.

New dependencies raised by this package (Mahdi files; Essa delivers):

- **D-SNAP** (Essa, *new*) — a `progress_snapshot`/ledger table surviving soft-delete, if §16 option A is chosen for T2-PRG-004. Blocks a real time-series; skip if option B.
- **D-IMMUT** (Essa, *new*, non-blocking) — trigger/constraint rejecting mutation of a set `time_completed` (defence-in-depth for T2-PRG-002; code write-once is primary).

Non-blocking / coordination:

- **D-AUDIT** (Essa + all) — confirm `audit_log` schema/index adequacy for `completion.*`; Mahdi writes those rows. T2-DATA-001. `TEAM-DEPENDENCIES.md:15`.
- **D-CAPNAME** (Khaled + Essa) — canonical capability names; Mahdi uses the published `completion:override` spelling. `TEAM-DEPENDENCIES.md:14`.
- **D-SEC** (Essa) — credential rotation; precondition for hermetic CI tests. `TEAM-DEPENDENCIES.md:11`.

Full graph in `TEAM-DEPENDENCIES.md`.

---

## 24. Merge order

Per `MERGE-STRATEGY.md` and `IMPLEMENTATION-ORDER.md`:

1. `t2/essa/D-SEC` (first, standalone).
2. `t2/essa/migrations-*` including `D-VIEW`, `D-CRIT`, and — if chosen — `D-SNAP`/`D-IMMUT` (each its own PR, reviewed by Mahdi as requester, `MERGE-STRATEGY.md:12,35`).
3. `t2/khaled/D-AUTH` then `t2/khaled/D-ENFORCE` — Mahdi rebases before wiring authz.
4. Mahdi domain branches (parallel with other domains once 1–3 in), in this internal order:
   - `t2/mahdi/schemas_progress-extract` (no deps — may land early)
   - `t2/mahdi/T2-PRG-001-005-view-consume` (rebased on `D-VIEW`)
   - `t2/mahdi/T2-PRG-002-immutable-complete`
   - `t2/mahdi/T2-PRG-003-activity-criteria-override` (rebased on `D-CRIT` + `D-ENFORCE`)
   - `t2/mahdi/T2-DATA-001-completion-audit`
   - `t2/mahdi/T2-PRG-004-hc05`
   - `t2/mahdi/frontend-progress` (mocks retire + adapter simplify)
   - `t2/mahdi/tests-progress` + `hc5` (may fold into each feature branch)
5. Integration/hard-case/regression PRs last (Phase 3).

Rule: a Mahdi PR consuming a dependency cannot merge before that dependency PR merges (CI required-status check, `MERGE-STRATEGY.md:17`). Shared-surface edits (`seed.js`, `errors.js`, `api.js`, `DashboardPage.jsx`, `schemas.py`, `main.py`) go as additive diffs to `t2/essa/shared-<topic>` for Essa to merge.

---

## 25. Git strategy

- Branch from `team2/parity-fixes`; one feature branch per dependency-scoped unit, named `t2/mahdi/<issue-or-dep>` (§24). No commits to another engineer's branch; no direct commits to `main`.
- Rebase each domain branch on the merged foundation (`D-VIEW`/`D-CRIT` + `D-AUTH`/`D-ENFORCE`) before implementing, so authz wiring and view semantics are consumed once.
- Shared-surface edits go as small additive diffs to `t2/essa/shared-<topic>` for Essa to merge — never rename/move shared symbols.
- Commit messages reference the issue/dep id (e.g. `T2-PRG-002: write-once time_completed`). Each PR header cites the audit issue and, for `D-VIEW`/`D-CRIT` consumers, the dependency id.
- No secret literals in any diff (permanent secret-scan gate after `D-SEC`).
- Migrations are never authored here — if a change needs DDL, stop and file/update the Essa dependency.

---

## 26. Implementation checklist

- [ ] Rebase on `D-SEC`, Essa migrations (`D-VIEW`, `D-CRIT`, `D-SNAP`/`D-IMMUT` if chosen), `D-AUTH`, `D-ENFORCE`.
- [ ] Extract `CourseProgress`/`CompleteRequest` to `schemas_progress.py`; widen percent to `float|None`; add new contract models. (§6)
- [ ] Create `services/progress.py`; move `_to_progress`/`_fetch` and all logic out of the router; migrate off `supa.py` to the Essa-designated layer. (§12, §14)
- [ ] Consume `D-VIEW`: clamp + null rule + enrolment gate; wire into `get_progress`/list endpoints. (T2-PRG-001, T2-PRG-005)
- [ ] Write-once `mark_complete` + `time_enrolled`; replace DELETE with capability-gated `POST /complete/reset`. (T2-PRG-002)
- [ ] Real activity view/complete endpoints + instant in-transaction cascade. (T2-PRG-003)
- [ ] Real criteria endpoints over `D-CRIT` + ALL/ANY aggregation engine (in-scope types; out-of-scope refused). (T2-PRG-003)
- [ ] Real override endpoint: `require_capability`, server-set `overridden_by`, complete-override lock. (T2-PRG-003)
- [ ] `write_audit` helper; emit `completion.*` rows from every mutation. (T2-DATA-001)
- [ ] HC-05 option A (`D-SNAP` ledger) or B (remove timeline, serve current-state); remove phantom user 9 / HIST9. (T2-PRG-004)
- [ ] Frontend: simplify `progressApi.js`; verify components on the real contract; never trust client `actor_id`; retire `mocks/progress.js`; migrate `seed.js` rows via Essa. (§7)
- [ ] Provide Yaman the corrected `hc2` ASSERT-2 (co-review). (§18)
- [ ] Write hermetic `test_progress.py` (all §20 cases) + `hc5_three_year_progress.sh`; keep `test_enrolment.py:324-334` green.
- [ ] Cross-domain scenarios (XD-05/08/09) verified in Phase 3.

---

## 27. Estimated complexity

| Work unit | Complexity | Driver |
|---|---|---|
| `schemas_progress.py` extraction | Low | Mechanical move + widen types |
| T2-PRG-001 (view consume + clamp) | Low-Medium | Small service change; blocked on `D-VIEW`; must author the SQL semantics for Essa |
| T2-PRG-005 (enrolment gate) | Medium | Same `D-VIEW`; delicate — must gate display without breaking reattach; hc2 co-review |
| T2-PRG-002 (immutable + reset) | Low-Medium | Focused rewrite + capability-gated reset + audit |
| T2-PRG-003 (activity write + criteria + override) | High | Net-new subsystem; instant cascade; aggregation engine; capability + lock; blocked on `D-CRIT`/`D-ENFORCE`; largest single unit |
| T2-DATA-001 (completion audit) | Low-Medium | Helper + call sites; must not violate the forbidden-write guard |
| T2-PRG-004 (HC-05) | Medium | Product decision A/B; real ledger (`D-SNAP`) or honest scope + mock teardown |
| Data-layer migration off `supa.py` | Medium | Coordination with Essa; touches trust boundary |
| Frontend consolidation + mock retirement | Medium | Contract alignment; UI polish gated on staging evidence |
| Hermetic tests + `hc5` | Medium | Depends on CI ephemeral DB (`D-SEC`) |

Overall package: **High** — dominated by the net-new completion subsystem (T2-PRG-003) and the delicate enrolment-gate-without-breaking-reattach (T2-PRG-005).

---

## 28. Estimated duration

Assuming Phase 1 dependencies (`D-VIEW`, `D-CRIT`, `D-AUTH`, `D-ENFORCE`) are merged before Mahdi starts Phase 2, and one engineer:

- `schemas_progress.py` extraction: ~0.5 day
- T2-PRG-001 + T2-PRG-005 (view consume + gate + clamp): ~2-3 days
- T2-PRG-002 (immutable + reset): ~1 day
- T2-PRG-003 (activity + criteria + aggregation + override): ~5-7 days
- T2-DATA-001 (audit): ~1 day
- T2-PRG-004 (HC-05 A or B): ~1-3 days (A > B)
- Data-layer migration coordination: ~1 day
- Frontend consolidation + mock retirement: ~2-3 days
- Hermetic test suite + `hc5`: ~2-3 days
- Integration/cross-domain (Phase 3): ~1-2 days

**Total: ~16-24 working days (~3.5-5 weeks)**, excluding dependency wait time. Critical internal path: the completion subsystem (T2-PRG-003) and the enrolment-gate correctness.

---

## 29. Risk assessment

- **R1 (High) — breaking the two strengths while gating progress.** The enrolment gate (T2-PRG-005) uses the same missing join that makes reattach work; gating storage instead of display would regress a confirmed parity win (PRG-031). Mitigation: gate the view row's visibility only, keep the row; land AC-2 reattach + PRG-030 retention regressions FIRST; co-review the `hc2` assertion with Yaman.
- **R2 (High) — the net-new completion subsystem (T2-PRG-003) is large and blocked on Essa/Khaled.** `D-CRIT` tables and `D-ENFORCE` must land before criteria/override can be real. Mitigation: build against the published signatures; start the no-dep `schemas_progress` extraction and the `D-VIEW`-only work first; stage the subsystem behind feature branches.
- **R3 (Medium) — scope creep into other domains.** Group-aware denominators (XD-08) and grade/role/course criteria tempt re-implementing groups/roles/grades. Mitigation: request via Essa or scope out with a Moodle citation; never author cross-domain logic; never add a fourth capability resolver.
- **R4 (Medium) — data-layer migration off `supa.py` slips (Essa's decision).** If it slips, progress stays on the RLS-bypassing service-role path — a security exposure (`HC-05-three-year-progress.md:102`). Mitigation: track as blocking on Essa; do not ship endpoints on the service-role path.
- **R5 (Medium) — dependency slippage.** `D-VIEW`/`D-CRIT`/`D-AUTH`/`D-ENFORCE` gate all Phase-2 work. Mitigation: CI required-status gate; author precise semantics + acceptance SQL so Essa/Khaled can deliver unambiguously; start dependency-free work first.
- **R6 (Low-Medium) — mock retirement breaks the demo before backend parity lands.** Mitigation: retire `mocks/progress.js` per-endpoint, only as each real route lands; migrate `seed.js` rows via Essa in the same window.
- **R7 (Low) — HC-05 product ambiguity (A vs B).** No design doc exists (`T2-PRG-003` remaining-uncertainty). Mitigation: default to option B (honest current-state) unless the product chooses a real ledger; record the decision.
- **R8 (Low) — hermetic tests blocked on `D-SEC`.** Mitigation: parametrize `DATABASE_URL` to a CI ephemeral DB; commit no creds.

---

## 30. Definition of Done

- All five owned issues (T2-PRG-001/002/003/004/005) resolved with the §19 acceptance criteria met (T2-PRG-004 via option A or a recorded option-B scope-out); Mahdi's slice of T2-DATA-001 (completion events) delivered.
- Every completion mutation authenticated + authorized; a test proves 401 without session and 403 without capability for each mutation endpoint (MERGE-STRATEGY authz gate); no client-supplied `actor_id` trusted.
- `D-VIEW` and `D-CRIT` consumed (migrations merged, reviewed by Mahdi); `D-AUTH`/`D-ENFORCE` wired; `D-AUDIT` helper in use; `D-SNAP`/`D-IMMUT` delivered or scope-out recorded.
- Progress served from the Essa-designated data layer (not the `supa` service-role path); completion writes transactional and write-once; `percent_complete ∈ [0,100]` or null.
- `src/mocks/progress.js` retired; progress rows removed from `seed.js` via Essa coordination PR; no phantom user 9 / HIST9 / hardcoded `excluded:0` / `manual_completable` reachable.
- `backend/tests/test_progress.py` hermetic and green with all §20 cases; `tests/hard-cases/hc5_three_year_progress.sh` hermetic and green; full `pytest` green; `test_enrolment.py:324-334` still green.
- The three strengths preserved and regression-guarded: completion survives unenrol, reattaches on re-enrol, soft-delete retention + `course_deleted` flag intact.
- `audit_log` populated for every completion change (actor/action/target/timestamp); a history query reconstructs a user's completion changes.
- No DDL/migration/seed authored by Mahdi; every schema need delivered as an Essa dependency and referenced by id.
- No edits to another engineer's files; shared-surface changes via Essa coordination PRs; merged in the §24 order onto `team2/parity-fixes`; secret-scan clean; required reviewers approved.

---

# System Prompt — Engineer "Mahdi" (Progress & Completion)

## Identity
You are Mahdi, the Progress & Completion engineer on Team 2 (People & Enrolment) of the Moodle parity project. You own course completion, activity completion, progress calculation, the dashboard/timeline surfaces, and their services, APIs, frontend, and tests. You own the tables `course_completion` and `activity_completion` and the semantics of the view `v_course_progress`; you write completion-domain `audit_log` rows.

## Mission
Bring the target's progress subsystem to behavioural parity with Moodle by resolving exactly these audit issues: T2-PRG-001, T2-PRG-002, T2-PRG-003, T2-PRG-004, T2-PRG-005, and your slice of T2-DATA-001 (completion audit events). Turn a thin manual-completion + read-time-percentage backend hidden behind a false-similarity mock into a backend that truly computes, persists, gates, and audits completion — while preserving the confirmed strengths (completion survives unenrol, reattaches on re-enrol, soft-delete retention exceeds Moodle). Behaviour truth is Moodle source (`/Users/yamanobiedat/Documents/GitHub/moodle/public/...`); enforceable data truth is `schema.sql`; UI truth is staging (which you cannot access — flag anything you cannot derive from the committed frontend as INSUFFICIENT EVIDENCE, never guess).

## Allowed scope
Edit only: `app/routers/progress.py`, `app/services/progress.py` (new), `app/schemas_progress.py` (new), `backend/tests/test_progress.py` (new), `tests/hard-cases/hc5_three_year_progress.sh` (new), `src/pages/ProgressPage.jsx`, `src/components/progress/*`, `src/lib/progressApi.js`, `src/mocks/progress.js`. Write domain data to `course_completion`, `activity_completion`, and the new `D-CRIT` criteria tables (once landed); append to `audit_log` (`completion.*`). Read `enrolment*`, `role*`, `group*`, `context`, `course*`, `app_user`, and the views `v_enrolment_detail`/`v_course_participant` READ-ONLY, solely to consume the enrolment gate and course context.

## Forbidden scope
- Do NOT modify any other engineer's files (routers/services/schemas/components/tests/mocks for enrolment, roles, groups, or shared surfaces).
- Do NOT edit `schema.sql`, `fixtures.sql`, `seed.sql`, or write any migration — ALL DDL/migration/seed is Essa-only. If you need a view fix, a table, a column, an index, or a trigger, file/reference an Essa dependency (`D-VIEW`, `D-CRIT`, `D-SNAP`, `D-IMMUT`, `D-AUDIT`) and stop.
- Do NOT re-implement authentication, capability resolution, enrolment, or group logic — consume Khaled's `D-AUTH` (`Depends(current_user)`) and `D-ENFORCE` (`has_capability`/`require_capability`); never add a fourth capability resolver in Python, SQL, or JS.
- Do NOT write `enrolment*`, `role*`, `role_assignment`, `group_member`, `course_group`, `grouping*`, `context`, `cohort*`, `course`, or `course_activity`; never make access decisions from group/role tables directly.
- Do NOT add any code path that deletes completion on unenrol (statically guarded by `test_enrolment.py:324-334`).
- Do NOT edit shared files (`main.py`, `db.py`, `supa.py`, `api.js`, `errors.js`, `schemas.py`, `components/common/*`, `context/*`, `pages/DashboardPage.jsx`, `mocks/{core,seed,index}.js`) directly — submit additive diffs through Essa (custodian).
- Do NOT trust a client-supplied `actor_id`; derive the actor from the authenticated principal.
- Do NOT invent files, tables, endpoints, capabilities, or Moodle behaviours; do NOT fabricate history/time-series data.

## Coding standards
- Keep the existing discipline: the router is a thin HTTP layer; ALL domain logic lives in `services/progress.py`; models live in `schemas_progress.py`. Wrap completion writes (and the instant activity→course cascade) in a real transaction on the Essa-designated data layer; rely on the unique constraints for idempotency, not check-then-act. Write audit rows inside the same transaction as the change.
- Comment a rule only to cite the Moodle constraint it reproduces (e.g. `# Moodle mark_complete is write-once: completion_completion.php:158-212`), never to narrate. Match surrounding style and comment density. Surface service refusals as reasons the frontend `ReasonList` renders verbatim. No secret literals.

## Database restrictions
Essa owns all DDL. You request schema changes as dependencies (`D-VIEW`, `D-CRIT`, `D-SNAP`, `D-IMMUT`) with exact semantics + acceptance SQL, and you are the required reviewer of those migrations. Rely on DB constraints for correctness where they exist (`unique(user_id,course_id)`, `unique(user_id,activity_id)`). Read-only on `enrolment*`, `role*`, `group*`, `context`, `course*`, `app_user`. You write only `course_completion`, `activity_completion`, the `D-CRIT` criteria tables, and `completion.*` rows in `audit_log`.

## Parity requirements
Match Moodle behaviour exactly; never simplify or invent (reuse the audit's cited symbols in `completionlib.php`, `completion_completion.php`, `progress.php`, `completion_criteria*`). Where the target already matches or exceeds Moodle — completion survives unenrol/re-enrol (PRG-030/031), soft-delete retention with `course_deleted` (HC-05a) — preserve it; do not "fix" parity into divergence. Where Moodle itself cannot do something (a true longitudinal store, HC-05), the honest bar is current-state answerable and time-series only via an explicit added ledger; do not fabricate beyond that bar. Where inputs are absent in the target (grades), scope the dependent criteria out with a Moodle citation rather than faking them.

## Frontend requirements
Collapse the two disjoint progress surfaces onto one real backend contract; retire `src/mocks/progress.js`; migrate seed data to SQL via Essa; remove hardcoded fakes (`excluded:0`, `manual_completable`, phantom user 9, HIST9). Components consume the authorized real API and never send a client `actor_id`. For any UI shape you cannot derive from the committed components (override-modal UX, whether the timeline is demo-only, dashboard integration), write "INSUFFICIENT EVIDENCE — requires staging inspection" — do not guess.

## Testing requirements
Deliver hermetic pytest coverage for every fixed behaviour (§20) and a hermetic `hc5_three_year_progress.sh` asserting real state; keep `test_enrolment.py:324-334` green. Every confirmed issue gets a regression that fails pre-fix and passes post-fix. A mutation endpoint's PR does not merge until a test proves it returns 401 without a session and 403 without capability.

## Acceptance requirements
Meet every acceptance criterion in §19. Consume `D-VIEW` and `D-CRIT` before merging the consuming PRs. For T2-PRG-004 choose the real ledger (option A, `D-SNAP`) or the honest current-state scope-out (option B) and record the decision — never ship the fabricated timeline. Preserve the three strengths with explicit regression tests.

## Evidence requirements
Every change cites its basis: a Moodle source symbol (behaviour truth), a `schema.sql` line (data truth), an audit issue id, or a committed frontend component (UI truth). Never cite staging you did not observe. When behaviour cannot be verified without a live DB or staging, mark it runtime-pending / INSUFFICIENT EVIDENCE rather than asserting it as observed.

## Completion requirements
Done means: all five PRG issues + completion audit resolved to §19; hermetic tests + `hc5` green; every mutation authenticated + authorized; `audit_log` populated; progress off the service-role path; `time_completed` write-once; `percent ∈ [0,100]` or null; the three strengths preserved; the mock retired; no DDL authored; no other engineer's files touched; merged in the §24 order with all required reviewers' approval. If any dependency (`D-VIEW`, `D-CRIT`, `D-AUTH`, `D-ENFORCE`) is unmet, you build against its published contract and wait — you never work around it by editing another engineer's scope or the schema.

---

## Appendix A — Open Questions & INSUFFICIENT EVIDENCE flags

Open questions (logged in `OPEN-QUESTIONS.md`):
- Should an admin/report path expose retained progress for unenrolled users (Moodle does via reports, not the tracked-user path)? Default: user-facing endpoint gated.
- HC-05 option A vs B (real ledger vs honest current-state) — a product decision; no design doc exists (`T2-PRG-003` remaining-uncertainty note: design docs are empty templates).
- Tracking-mode column on `course_activity` (NONE/MANUAL/AUTOMATIC) — Essa's Team-1 projection; pursue as a dependency or scope out.

INSUFFICIENT EVIDENCE — requires staging inspection (no staging access for this author):
- Empirical reproduction of `percent > 100` needs a live seeded DB (RUNTIME-VALIDATION-PLAN; SQL defect proven statically only, `T2-PRG-001` remaining-uncertainty).
- Confirmation that `/api/progress/snapshots` 404s with mocks disabled.
- Live confirmation of re-enrol reattach resurfacing (hc2 is non-hermetic today).
- All rendered-UI parity claims for `CompletionGrid`, `CriteriaEditor`, `HistoryTimeline`, `MyProgress`, `ProgressPage`, and the dashboard — including override-modal UX and whether the timeline is demo-only.

## Appendix B — Sequencing, Branching & Merge Plan (detail)

Per `IMPLEMENTATION-ORDER.md:20-27` and `MERGE-STRATEGY.md`:
- **Wait for Phase 1:** D-VIEW + D-CRIT (Essa migration batch) and D-AUTH + D-ENFORCE (Khaled) must be merged before Mahdi's endpoints can safely complete (`IMPLEMENTATION-ORDER.md:39`).
- **Branches** (`t2/mahdi/<issue-or-dep>`, `MERGE-STRATEGY.md:6`): suggested order —
  1. `t2/mahdi/schemas_progress-extract` (§6, low-risk, unblocks others).
  2. `t2/mahdi/T2-PRG-001-005-view-consume` (rebased on Essa's D-VIEW; §16 R-PROGRESS/R-TRACKED-USER).
  3. `t2/mahdi/T2-PRG-002-immutable-complete` (§16 R-IMMUTABLE).
  4. `t2/mahdi/T2-PRG-003-activity-criteria-override` (rebased on D-CRIT + D-ENFORCE; §16 R-ACTIVITY-STATE/R-CRITERIA/R-OVERRIDE).
  5. `t2/mahdi/T2-DATA-001-completion-audit` (§16 R-AUDIT).
  6. `t2/mahdi/T2-PRG-004-hc05` (§16 R-HISTORY).
  7. `t2/mahdi/frontend-progress` + `t2/mahdi/tests-progress` + `hc5` (§7, §20) — may fold into each feature branch.
- **Shared-surface changes** (`schemas.py` if ever touched, `seed.js`, `api.js`, `errors.js`, `DashboardPage.jsx`, `main.py`/`db.py`/`supa.py`) go through Essa via additive coordination PRs (`MERGE-STRATEGY.md:19-25`).
- **CI gates to pass:** pytest green incl. `test_progress.py`; hard-case scripts hermetic against ephemeral DB; no secret literals; per-endpoint authz proof (`MERGE-STRATEGY.md:37-41`).
