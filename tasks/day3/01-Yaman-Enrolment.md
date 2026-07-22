# Work Package 01 — Yaman — Enrolment & People

**Engineer:** Yaman · **Domain:** Enrolment (manual/self/cohort/guest), course membership, enrolment lifecycle, cohort sync, People (`app_user`) via `users.py`
**Team:** Team 2 (People & Enrolment) · **Integration branch:** `team2/parity-fixes`
**Status of inputs:** parity audit COMPLETE. This package converts the confirmed audit issues into an implementation plan. It invents nothing; every task cites a target file:symbol, a Moodle source symbol (behaviour truth), or a coordination doc.
**Source-of-truth precedence used throughout:** Moodle = behaviour truth (`/Users/yamanobiedat/Documents/GitHub/moodle/public/...`); `schema.sql` = enforceable DDL truth; staging = UI truth (NO staging access in this environment — UI behaviour not derivable from the committed frontend is flagged `INSUFFICIENT EVIDENCE — requires staging inspection`).

**Issues owned by this package:** T2-ENR-001, T2-ENR-002, T2-ENR-003, T2-ENR-004, T2-ENR-005, T2-DATA-002 (enrolment side), T2-DATA-003 (guest one-per-course + enrolment-guard race). Contributes writes for T2-DATA-001 (audit_log — enrolment.* events).

---

## 1. Executive summary

The enrolment subsystem is **structurally strong but security-open and lifecycle-incomplete**. The data model already matches Moodle where it matters — per-method instances (`enrolment_method`), one row per `(method_id, user_id)` with `unique (method_id, user_id)` (`schema.sql:277`), OR-based liveness across paths (`services/enrolment.py:165-178` `is_active_enrolled`), source-aware unenrol via `component`/`item_id` provenance, and a real asyncpg transaction wrapping each mutation (`_tx`, `services/enrolment.py:80-89`) which actually *exceeds* Moodle (Moodle has no wrapping transaction, ENR-034). The two hard cases (HC-01 manual+cohort removal, HC-02 dropout/re-enrol) already trace as FUNCTIONALLY_EQUIVALENT on the modelled surface.

The work is to close **seven confirmed gaps**, in priority order:

1. **T2-ENR-001 (Critical) — zero authorization.** `enrol`/`unenrol`/`suspend`/`self_enrol`/cohort routes perform no capability check; `actor_id` is a query param recorded only as `modified_by`/`assigned_by` (`routers/enrolment.py:93-98`). Wire Khaled's `D-AUTH` (authenticated principal) + `D-ENFORCE` (`has_capability`/`require_capability`) into every mutation.
2. **T2-ENR-002 (High) — suspension bypass on re-enrol.** The upsert forces `status='active'` unconditionally (`services/enrolment.py:237-242`), silently reactivating a deliberately-suspended user. Preserve existing status unless an explicit activate is requested.
3. **T2-ENR-005 (Medium) — under-permission on per-path unenrol** and **T2-ENR-003 (Medium) — over-permission ghost role on last-path unenrol.** Both stem from Deviation D-1 (manual/self roles tagged `component='enrol_manual'/'enrol_self'` where Moodle uses `component=''`) plus the last-path cleanup deleting only `component like 'enrol_%'`. Coordinate the fix with Khaled under contract `D-RA`.
4. **T2-ENR-004 (Medium) — no active expiry.** No scheduler, no `expiredaction`, no `longtimenosee`, self-enrol never applies its period. Add a scheduled expiry worker + config + self-enrol period.
5. **T2-DATA-002 (Medium) — non-atomic cross-domain writes.** Group side-effects run post-commit with no reconciliation (`services/enrolment.py:350-356`). Make group ops retry-safe/idempotent and log failures to `audit_log`.
6. **T2-DATA-003 (Medium) — check-then-act races.** Guest one-per-course is Python-only (`services/enrolment.py:565-573`); needs a DB partial unique index (`D-GUEST`, Essa) plus catch-on-conflict. The `add_member` enrolment-guard race is Mahmoud's table but the enrolment-side guard consumes the same contract (`D-GM`).

All schema changes are **Essa dependencies** (`D-GUEST`, `D-EXPIRY-DDL`, `D-AUDIT` adequacy). Yaman writes NO DDL and never touches `component=''` rows in `role_assignment` or another engineer's files.

---

## 2. Scope

Owned outright (edit freely, within the matrix):

- **Backend routers:** `app/routers/enrolment.py`, `app/routers/users.py`.
- **Backend services:** `app/services/enrolment.py`.
- **Backend schemas:** `app/schemas_enrolment.py` (and, if user models are moved off shared `schemas.py`, a new `app/schemas_users.py` — created in Yaman's scope, not a shared edit).
- **Backend tests:** `backend/tests/test_enrolment.py`, `tests/hard-cases/hc1_manual_plus_cohort.sh`, `tests/hard-cases/hc2_drop_and_return.sh` (hc2 group asserts co-reviewed by Mahmoud per matrix §5).
- **Frontend page:** `src/pages/EnrolmentPage.jsx`.
- **Frontend components:** `src/components/enrolment/*` — `EnrolUserModal.jsx`, `MethodsPanel.jsx`, `SelfEnrolDemo.jsx`, `ParticipantsTable.jsx`, `UserPathsDrawer.jsx`.
- **Frontend mocks:** `src/mocks/enrolment.js` (retire/replace per MERGE-STRATEGY).
- **DB tables (domain owner — request DDL via Essa):** `enrolment_method`, `enrolment`, `cohort`, `cohort_member`, `user_last_access`, `app_user` (People). Views `v_enrolment_detail`, `v_course_participant`.
- **Dual-write provenance (code contract only):** rows in `role_assignment` with `component='enrol_*'`+`item_id`=method id (`D-RA`); rows in `group_member` with `component='enrol_self'/'enrol_cohort'`+`item_id`=method id (`D-GM`).
- **Audit rows:** `audit_log` events with `event` prefix `enrolment.*` (append-only; `D-AUDIT`).

New scheduled expiry worker (a new module in Yaman's backend scope, e.g. `app/tasks/enrol_expiry.py` — see §12/§16). If a shared entrypoint change (`main.py` startup wiring) is required to register the scheduler, that is a **shared-surface change routed through Essa** (custodian), submitted as an additive diff per MERGE-STRATEGY §"Shared-surface protocol".

---

## 3. Out of scope

- **All DDL / migrations / seed** — Essa only. Any column, index, constraint, view or trigger change is a dependency to Essa (`D-GUEST`, `D-EXPIRY-DDL`, view edits to `v_enrolment_detail`/`v_course_participant`, `audit_log` adequacy under `D-AUDIT`). Yaman never edits `schema.sql`, `fixtures.sql`, `seed.sql`.
- **Authentication mechanism** — Khaled (`D-AUTH`). Yaman consumes `Depends(current_user)`; does not build session/JWT verification.
- **Authorization engine** — Khaled (`D-ENFORCE`). Yaman consumes `has_capability(db, user_id, capability, context_id)` and `require_capability(...)`; does not implement capability resolution, `permissions.py`, `fn_can`, or `context` writes.
- **`role_assignment` semantics / `component=''` rows** — Khaled. Yaman writes/deletes ONLY `component='enrol_*'` rows (`D-RA`). The last-path full-strip of `component=''` roles (T2-ENR-003) is a **co-reviewed change with Khaled**, not a unilateral Yaman edit.
- **`group_member` / `course_group` / `grouping*` business logic** — Mahmoud. Yaman calls `services/groups.py` functions (`add_member`, `remove_members_by_provenance`, `remove_all_memberships`) with server-set provenance only (`D-GM`); does not implement scope, visibility, or the `groups.py:201` arity fix.
- **Progress / completion** — Mahdi. Yaman never writes `course_completion`/`activity_completion` (statically asserted by `test_enrolment.py:324-334`). The progress enrolment-gate (PRG-005) is Mahdi's; Yaman only guarantees liveness reads are correct.
- **`role`, `capability`, `role_capability`, `context`, completion tables** — READ-ONLY for Yaman (see §9).
- **Grades / grade recovery** — not modelled anywhere in the target (Team-1 scope). No target counterpart; do not build one.
- **`courses.py` projection, `db.py`, `supa.py`, `api.js`, `errors.js`, `src/components/common/*`** — SHARED-Essa custodian; changes only via coordination PR.

---

## 4. Objectives

- **O1 — Authorize every enrolment mutation.** No enrol/unenrol/suspend/reactivate/self-enrol/method/cohort mutation executes without an authenticated principal and a capability check at the course context; typed 401 (unauthenticated) / 403 (unauthorized) with the missing capability named. (T2-ENR-001)
- **O2 — Preserve suspension on re-enrol.** An idempotent re-enrol never lifts an administrative suspension; only an explicit activate does. (T2-ENR-002)
- **O3 — Correct role lifecycle across multi-method enrolment.** Per-path unenrol never drops a role the user still holds via another path; last-path unenrol strips ALL course roles (matching Moodle) OR the retention is made an explicit, documented product decision co-signed by Khaled. (T2-ENR-005, T2-ENR-003)
- **O4 — Active, configurable expiry.** A scheduled task applies `expiredaction` (KEEP/SUSPEND/UNENROL), enforces self-enrol `timeend`/period, and implements `longtimenosee` inactivity unenrol; expiry is reflected in state, not only on read. (T2-ENR-004)
- **O5 — Convergent cross-domain writes.** Group side-effects are idempotent and retry-safe; a post-commit failure converges (reconciliation) or is recorded to `audit_log` for repair, never leaving silent inconsistency. (T2-DATA-002)
- **O6 — Constraint-backed invariants.** Guest one-per-course is enforced by a DB partial unique index (Essa) with graceful conflict handling in code; the enrolment guard for group add is race-safe. (T2-DATA-003)
- **O7 — Auditable.** Every enrolment lifecycle change writes an `audit_log` row (`enrolment.created/updated/deleted/suspended/reactivated/expired/synced`) carrying actor, affected user, course, and a `last_path` flag equivalent. (T2-DATA-001 enrolment writes)
- **O8 — Tested & regression-safe.** Hermetic pytest coverage for every fixed behaviour; hard-case scripts made hermetic and asserting real role/group state; HC-01/HC-02 remain green.

---

## 5. Complete implementation roadmap

Ordered by dependency and risk. Each step names its gating dependency (§23) and merge unit (§24).

**Phase A — rebase on foundation (blocked until Phase 1 of IMPLEMENTATION-ORDER lands).**
Wait for `t2/essa/D-SEC`, Essa's migration batch (incl. `D-GUEST`, any `D-EXPIRY-DDL`), `t2/khaled/D-AUTH`, `t2/khaled/D-ENFORCE`. Rebase all Yaman branches on these so authz wiring is done once.

**Phase B — authorization wiring (T2-ENR-001, branch `t2/yaman/T2-ENR-001-authz`).**
1. Add `Depends(current_user)` (from `D-AUTH`) to every mutation route in `routers/enrolment.py`; stop trusting `actor_id` from the query string — derive the actor from the authenticated principal (keep `actor_id` only as an admin-override input gated by a manage capability, if `D-AUTH` supports impersonation; otherwise remove it).
2. Before each service mutation, call `require_capability(...)` at the resolved course context (`_course_context_id`, `services/enrolment.py:137-141`). Capability-to-route map in §11/§15.
3. Return typed 401/403 via the shared `errors.js` contract (Essa custodian for the error body shape; Yaman adds only the enrolment error codes via a coordination PR).

**Phase C — state-transition correctness (branch `t2/yaman/T2-ENR-002-reenrol-status`, then `t2/yaman/T2-ENR-roles-DRA`).**
4. T2-ENR-002: change the upsert (`services/enrolment.py:233-242`) so `status` is preserved on conflict unless an explicit `activate=True` / `status='active'` is passed. Do not blindly rewrite `time_start`/`time_end` — only update supplied fields (mirror Moodle `update_user_enrol` change-gating, ENR-010).
5. T2-ENR-005 + T2-ENR-003 (co-reviewed with Khaled, `D-RA`): choose ONE of the two Moodle-faithful options in §16 R-ROLE and implement. Both touch role tagging (`services/enrolment.py:110-111, 256-268`) and cleanup (`:309-314, 339-344`). Required reviewer: Khaled.

**Phase D — expiry subsystem (branch `t2/yaman/T2-ENR-004-expiry`).**
6. Self-enrol period: apply `timeend = now + enrolperiod` from method config in `self_enrol` (`services/enrolment.py:461-464`).
7. New scheduled worker (`app/tasks/enrol_expiry.py`): `process_expirations` (per-method `expiredaction`) + `longtimenosee` inactivity unenrol consuming `user_last_access`. Register via Essa-custodian `main.py` startup wiring.
8. Reflect expiry in state per configured action (SUSPEND/UNENROL write real transitions; KEEP leaves the on-read liveness, which is already access-equivalent to Moodle default — see §16 R-EXPIRY). Any persisted expiry state columns are `D-EXPIRY-DDL` (Essa).

**Phase E — integrity & concurrency (branch `t2/yaman/T2-DATA-002-003`).**
9. T2-DATA-003 guest: consume Essa's partial unique index (`D-GUEST`); wrap `create_method` guest insert in catch-on-`UniqueViolation` → typed 409 (keep the pre-check for a friendly message, but rely on the constraint for correctness).
10. T2-DATA-002: make deferred group ops idempotent and retry-safe; on `_run_group_ops` failure, write an `audit_log` repair row and (optionally) an idempotent reconciliation pass callable from the expiry worker. Group-op idempotency is Mahmoud's guarantee (`D-GM`); Yaman's job is to not commit-then-silently-fail.

**Phase F — audit + tests + frontend.**
11. T2-DATA-001 writes: emit `audit_log` rows from every lifecycle mutation (§16 R-AUDIT).
12. Rewrite `test_enrolment.py` to be hermetic (see §20) and add cases for every fixed behaviour; make `hc1`/`hc2` hermetic and assert role+group state.
13. Frontend: fix `SelfEnrolDemo.jsx` gate-chain contract drift; surface 401/403 and duplicate/409 reasons; retire `mocks/enrolment.js`; expose expiry/period config in `MethodsPanel.jsx` where derivable (flag UI gaps as INSUFFICIENT EVIDENCE).

**Phase G — integration (Phase 3 of IMPLEMENTATION-ORDER).**
14. Cross-domain scenarios from `domain-reports/cross-system-resolution.md` (XD-03 suspended access, XD-04 one-source-removed, XD-05 re-enrol reattach).

---

## 6. Backend files to modify

| File | Change | Issues |
|---|---|---|
| `app/routers/enrolment.py` | Add `Depends(current_user)` to all mutation routes; call `require_capability` before each service call; derive actor from principal; typed 401/403; surface 409 on duplicate/guest/conflict; guest-race conflict handling | T2-ENR-001, T2-DATA-003 |
| `app/services/enrolment.py` | `enrol_user` status-preserving upsert (`:233-242`); role-tagging + per-path/last-path cleanup fix (`:110-111,256-268,309-314,339-344`); self-enrol period (`:461-464`); expiry action hooks; guest conflict catch (`:565-573`); idempotent/retry-safe `_run_group_ops` + audit on failure (`:131-134,350-356`); `audit_log` writes in every mutation; `allow_unenrol_user`-equivalent guard for active cohort paths (§16 R-COHORT) | T2-ENR-002/003/004/005, T2-DATA-002/003 |
| `app/routers/users.py` | Add `Depends(current_user)` for consistency; confirm read-only exposure of `app_user` is capability-gated where Moodle gates user listing (People). Keep soft-delete hiding (`deleted_at is null`) | T2-ENR-001 (People half) |
| `app/schemas_enrolment.py` | Add `activate: bool = False` (or explicit `status`) to `EnrolRequest`/`CourseEnrolRequest` for T2-ENR-002; add method config models for expiry (`expiredaction`, `enrol_period`, `longtimenosee`, `max_enrolled`, `use_group_keys`, `sync_group_id`) as typed sub-models instead of raw `dict`; error-reason shapes for 401/403/409 | T2-ENR-002/004 |
| `app/tasks/enrol_expiry.py` *(new, Yaman scope)* | Scheduled worker: `process_expirations` + `longtimenosee` + optional group reconciliation pass | T2-ENR-004, T2-DATA-002 |
| `main.py` *(SHARED — Essa custodian)* | Register the expiry scheduler at startup; additive diff submitted to Essa | T2-ENR-004 |
| `app/schemas.py` *(SHARED — Essa custodian)* | If user/People models live here, extract to `app/schemas_users.py` (Yaman-owned) per MERGE-STRATEGY | organizational |

---

## 7. Frontend files to modify

Staging = UI truth, but **no staging access**; the following are grounded in the committed components. UI behaviour not derivable is flagged.

| File | Change | Evidence / flag |
|---|---|---|
| `src/components/enrolment/SelfEnrolDemo.jsx` | Fix the false comment "The API evaluates every gate (never stop-at-first-fail)" (`:1-2`) — the REAL backend stops at first failing gate and its chain is `course_visible → method_enabled → window_open → capacity → key_match` (`services/enrolment.py:55, self_enrol`). Render the real chain; the component already renders `result.gates` verbatim so mainly the copy + reliance on the retired mock changes | derivable from `services/enrolment.py:385-478` vs mock `mocks/enrolment.js:329` |
| `src/components/enrolment/EnrolUserModal.jsx` | Surface 401/403 (not enrolled to act) and 409 (duplicate/guest) via existing `ReasonList`/`ApiError` path (`:59-63`). Add the explicit "activate on re-enrol" affordance for T2-ENR-002 so a suspended re-enrol does NOT silently reactivate — the modal must send `activate` only when the operator intends it | derivable; exact affordance placement: **INSUFFICIENT EVIDENCE — requires staging inspection** |
| `src/components/enrolment/ParticipantsTable.jsx` | Keep per-path Suspend/Reactivate/Unenrol (`:119-163`). Disable/hide the Unenrol action on an ACTIVE cohort path unless suspended (mirror Moodle `allow_unenrol_user`, §16 R-COHORT); show a reason tooltip. Status badge already renders `effective_status` from the API (`:88-98`) — no client status logic (correct) | badge behaviour derivable; the cohort-unenrol guard is a NEW rule — server-enforced regardless; UI hint is best-effort |
| `src/components/enrolment/MethodsPanel.jsx` | Expose expiry config for T2-ENR-004: `expiredaction`, enrol period, `longtimenosee`, `max_enrolled` on the method panel (currently only shows self key + cohort + enable/disable/sync/remove, `:56-99`). Exact field layout: **INSUFFICIENT EVIDENCE — requires staging inspection**; wire to `PATCH /methods/{id}` config | config fields exist in `enrolment_method.config`; UI shape unknown |
| `src/components/enrolment/UserPathsDrawer.jsx` | No behaviour change required; verify `live` column still reflects the four §6.2 conditions after role/expiry changes (`:63-71`) | derivable |
| `src/pages/EnrolmentPage.jsx` | No structural change; ensure tabs still function once mocks retired (`:16, 147-158`) | derivable |
| `src/mocks/enrolment.js` | Retire/replace with the real API per MERGE-STRATEGY. Note existing drift to remove: duplicate → 409 (`:224-235`), self-enrol evaluate-all + `not_already_enrolled` + hardcoded window/capacity (`:329-358`) diverge from the real backend | derivable |

Shared frontend surfaces (`src/api.js`, `src/errors.js`, `src/components/common/*`, `src/context/ActingUser.jsx` is Khaled's) — any new enrolment endpoint/error code goes through the Essa coordination PR; `ActingUser` identity ties to `D-AUTH` (Khaled).

---

## 8. Database tables (owned domain — DDL requested via Essa; written by Yaman code)

| Table | DDL ref | Yaman writes | Notes |
|---|---|---|---|
| `enrolment_method` | `schema.sql:239-254` | insert/update/delete instances | `enrol_duration` currently dead (T2-ENR-004 will read it); guest one-per-course needs `D-GUEST` partial unique index |
| `enrolment` | `schema.sql:267-278` | upsert/suspend/unenrol | `unique (method_id, user_id)` (`:277`) is the concurrency guard; `status` enum is only `active`/`suspended` (`:34`) — "expired" is computed, may gain persisted state via `D-EXPIRY-DDL` |
| `cohort` | (schema.sql cohort DDL) | create | |
| `cohort_member` | (schema.sql) | add/remove → triggers sync | membership change fans out via `sync_methods_for_cohort` (`services/enrolment.py:536-548`) |
| `user_last_access` | `schema.sql:378-383` | upsert on touch; delete on last-path unenrol | consumed by `longtimenosee` (T2-ENR-004) |
| `app_user` | (schema.sql) | People CRUD via `users.py` | `deleted_at` soft-delete; `suspended` is account-level (C-6, independent of enrolment) |
| `v_enrolment_detail` | `schema.sql:409-428` | READ (view) | liveness rule incl. `u.deleted_at is null`; any change is an Essa view request |
| `v_course_participant` | `schema.sql:430-438` | READ (view) | roster rollup `bool_or(live)`; read by all domains |

Dual-write provenance rows (owned tables are Khaled's/Mahmoud's — see §9): `role_assignment` `component='enrol_*'` (`D-RA`), `group_member` `component='enrol_self'/'enrol_cohort'` (`D-GM`). `audit_log` append-only writes (`D-AUDIT`).

---

## 9. Database tables (READ ONLY)

Per matrix §11, Yaman reads but never writes these:

- `role`, `role_capability`, `capability` — Khaled. Read to resolve `default_role_id` labels and roster role names (`list_participants` join `role`, `services/enrolment.py:691-696`).
- `context` — Khaled. Read to resolve the course context id (`_course_context_id`, `:137-141`). Yaman never inserts a context; if none exists, role assignment is skipped with a warning (`:250-254`) — that behaviour stays.
- `course`, `course_activity` — Essa (Team-1 projection). Read for visibility/deleted checks (`self_enrol` course gate, `:407-410`).
- `course_group`, `grouping`, `grouping_group` — Mahmoud. Read only (e.g. group-key lookup in `self_enrol`, `:452-455`).
- `course_completion`, `activity_completion` — Mahdi. Never read/written by enrolment except the static guard that proves enrolment SQL never touches them (`test_enrolment.py:324-334`).

---

## 10. Database tables (NO ACCESS)

- **Business logic of** `role_capability`, `capability`, `fn_can`, `permissions.py` internals — Khaled's engine. Yaman calls the published `has_capability`/`require_capability` API only; never queries capability resolution tables directly.
- **`group_member` semantics, `course_group` scope/visibility, `grouping*`** — Mahmoud's logic. Yaman must not implement scope/visibility filtering or read group membership to make access decisions.
- **`course_completion_criteria` / `course_completion_aggr_methd` / `course_completion_crit_compl`** (Mahdi's `D-CRIT` new tables) — no access.
- **`role_assignment` rows with `component=''`** — Khaled-owned; NO write except the co-reviewed last-path full-strip (T2-ENR-003) which is executed only under `D-RA` with Khaled as required reviewer. Yaman never invents or edits `component=''` rows outside that contract.

---

## 11. API endpoints

All endpoints live in `routers/enrolment.py` (+ `users.py`). **Every mutation gains `Depends(current_user)` + `require_capability` (T2-ENR-001).** Capability names use the canonical form Khaled publishes under `D-CAPNAME`; the mapping below uses Moodle names as the intent.

| Method + path | Handler (line) | Mutation? | Capability (course context) | Change |
|---|---|---|---|---|
| GET `/courses/{id}/participants` | `participants` (`:33`) | read | `moodle/course:viewparticipants` (or manage) | authz read gate; roster already correct |
| GET `/courses/{id}/other-users` | `other_users` (`:46`) | read | view participants | — |
| GET `/courses/{id}/methods` | `methods` (`:55`) | read | `enrol/*:config` view | — |
| POST `/courses/{id}/methods` | `create_method` (`:60`) | write | `moodle/course:enrolconfig` | authz; guest 409 via `D-GUEST` |
| PATCH `/methods/{id}` | `patch_method` (`:69`) | write | `enrol/{kind}:config` | authz |
| DELETE `/methods/{id}` | `delete_method` (`:77`) | write | `enrol/{kind}:config` | authz |
| GET `/methods/{id}/enrolments` | `method_enrolments` (`:84`) | read | view participants | — |
| POST `/methods/{id}/enrolments` | `enrol` (`:92`) | write | `enrol/manual:enrol` (per kind) | authz; **T2-ENR-002** honour `activate` |
| DELETE `/methods/{id}/enrolments/{user}` | `unenrol` (`:101`) | write | `enrol/manual:unenrol` | authz; **R-COHORT** guard; **T2-ENR-003/005** cleanup |
| PATCH `/methods/{id}/enrolments/{user}` | `set_status` (`:107`) | write | `enrol/manual:manage` | authz |
| POST `/courses/{id}/enrol` (alias) | `enrol_by_course` (`:115`) | write | `enrol/manual:enrol` | authz; **T2-ENR-002** |
| PATCH `/enrolments/{id}` (row alias) | `set_status_by_row` (`:142`) | write | manage | authz |
| DELETE `/enrolments/{id}` (row alias) | `unenrol_by_row` (`:149`) | write | unenrol | authz; R-COHORT; T2-ENR-003/005 |
| POST `/self/{course}` | `self_enrol` (`:158`) | write | `enrol/self:enrolself` + instance config | authz (self-cap); **T2-ENR-004** period; gate parity |
| POST `/methods/{id}/sync` | `sync` (`:165`) | write | `enrol/cohort:config` | authz |
| GET `/guest-preview/{course}` | `guest_preview` (`:172`) | read | (public-ish; confirm) | — |
| GET `/cohorts`, POST `/cohorts` | (`:181,186`) | read/write | `moodle/cohort:manage` | authz on create |
| POST `/cohorts/{id}/members` | `add_member` (`:192`) | write | `moodle/cohort:assign` | authz; triggers sync |
| DELETE `/cohorts/{id}/members/{user}` | `remove_member` (`:200`) | write | `moodle/cohort:assign` | authz; triggers UNENROL sync |
| GET `/users/{id}/enrolments` | `user_enrolments` (`:209`) | read | self or manage | — |
| GET `/api/users`, `/api/users/{id}` | `users.py:19,26` | read | People view capability | authz |

No new business endpoints are invented. If the frontend needs a duplicate-detection response, it comes from the existing 409 path (`_ok(..., 409)`, `:23-28`).

---

## 12. Services

`app/services/enrolment.py` (owner Yaman) — function-level work:

- `enrol_user` (`:210-280`) — **T2-ENR-002**: replace `on conflict do update set status='active'` with status-preserving upsert (insert active; on conflict update only supplied `time_start/time_end/modified_by` and set `status='active'` ONLY when caller passes explicit activate). **T2-ENR-005/003**: change provenance tagging per §16 R-ROLE. **R-AUDIT**: write `enrolment.created`/`enrolment.updated`.
- `unenrol_user` (`:283-357`) — **T2-ENR-003**: last-path cleanup must remove ALL course roles (or documented decision, co-reviewed with Khaled, `D-RA`). **T2-ENR-005**: per-path cleanup must not drop a role justified by another active path. **R-COHORT**: refuse per-path unenrol of an active cohort path unless suspended. **T2-DATA-002**: audit on deferred group-op failure. **R-AUDIT**: `enrolment.deleted` with `last_path` flag.
- `suspend`/`reactivate`/`_set_status` (`:360-378`) — add change-gating (skip no-op writes, ENR-010) and `enrolment.suspended`/`enrolment.reactivated` audit.
- `self_enrol` (`:385-478`) — **T2-ENR-004**: apply `time_end = now + config.enrol_period`; keep the 5-gate stop-at-first-fail chain; add the self-enrol capability check (`enrol/self:enrolself`) + `already-enrolled` refusal (Moodle refuses re-self-enrol, ENR-019) — but do NOT reactivate a suspended row (ties to T2-ENR-002).
- `sync_cohort_method` (`:487-533`) — **R-COHORT/T2-ENR-005**: on `kept` members, add a role re-add pass so a manually-deleted cohort role is restored (Moodle phase 3, ENR-026 gap C5); leave UNENROL-only policy but annotate KEEP/SUSPEND as future config. **T2-DATA-002**: idempotent group ops.
- `create_method` (`:555-584`) — **T2-DATA-003**: rely on `D-GUEST` unique index; catch `UniqueViolation` → 409.
- New `app/tasks/enrol_expiry.py` — `process_expirations(db)`, `run_longtimenosee(db)`, `reconcile_group_side_effects(db)` (idempotent). Reads `enrolment_method.expiredaction`/`enrol_duration`/config and `user_last_access`.
- Read models (`list_participants`, `active_paths`, `user_enrolments_all`, etc.) — unchanged behaviour; confirm liveness still correct after changes.

Cross-domain calls go only through `services/groups.py` (Mahmoud) via `_groups_call` (`:114-128`) with server-set provenance — never direct SQL into `group_member`.

---

## 13. Controllers

The "controllers" are the FastAPI routers (`routers/enrolment.py`, `routers/users.py`) — thin HTTP layers; all logic stays in the service (existing discipline, keep it). Controller-level responsibilities:

- Attach `Depends(current_user)` and `require_capability` (§11) — this is the ONLY place authz is wired; the service trusts the resolved principal passed in.
- Map service refusals to HTTP via `_ok` (`:23-28`): 401 (no principal), 403 (capability denied), 404 (not found / not enrolled), 409 (duplicate/guest conflict). Keep "reason in `detail`" so the frontend `ReasonList` shows it verbatim.
- `enrol_by_course` (`:115-132`) resolves the manual method via raw SQL — keep, but it must also pass the authenticated actor and `activate` flag.
- Do not add business logic to controllers; new rules (R-COHORT guard, T2-ENR-002 activate) are decided in the service and surfaced as `{ok:False, reason}`.

---

## 14. Repositories

The target has no separate repository layer — data access is inline asyncpg SQL inside the service via the `_one`/`_all`/`_tx` adapters (`services/enrolment.py:63-89`) over the shared `app/db.py` pool (Essa custodian). Work items expressed as "repository/query":

- **Liveness query** `ACTIVE_CONDITIONS_SQL` (`:45-50`) — the single reused predicate; keep it the one source of truth; ensure `list_participants` CTE and `is_active_enrolled` stay in sync (inventory flagged a minor divergence: `list_participants` `paths` CTE doesn't filter deleted user/course, `:665-707`, while `is_active_enrolled` joins `course ... deleted_at is null`, `:169-177`). Align both on the `v_enrolment_detail.live` definition (which includes `u.deleted_at is null`, `schema.sql:420`).
- **Upsert query** (`:233-242`) — rewrite for T2-ENR-002 status preservation.
- **Role provenance delete queries** (`:309-314` per-path, `:339-344` last-path) — rewrite for T2-ENR-003/005 under `D-RA`.
- **Guest existence pre-check** (`:565-573`) — keep as a friendly message; correctness moves to the `D-GUEST` unique index + `on conflict`/exception catch.
- **`audit_log` insert** (new) — a small `_audit(dbx, event, actor, affected, course, context, detail)` helper writing inside the same `_tx` so audit is atomic with the change.
- No `SELECT ... FOR UPDATE`/advisory locks needed where a unique constraint suffices (enrol upsert is already safe, ENR-034); add locking only if the reconciliation pass requires it.

---

## 15. Validation rules

Request/authz validation (in `schemas_enrolment.py` + router + service):

- **V1 (authz):** every mutation requires an authenticated principal (`D-AUTH`) and passes `require_capability` at the course context (`D-ENFORCE`). Missing principal → 401; missing capability → 403 naming the capability. (T2-ENR-001)
- **V2 (self-enrol capability):** `self_enrol` requires `enrol/self:enrolself` for the acting user and the instance's `customint6`-equivalent "allow new enrolments" flag (ENR-019). (T2-ENR-004 adjacent)
- **V3 (activate intent):** re-enrol of an existing suspended row does NOT activate unless `EnrolRequest.activate is True` (new field). Default `activate=False`. (T2-ENR-002)
- **V4 (cohort method requires cohort_id):** keep existing check (`:574-575`); reject at schema level too.
- **V5 (guest one-per-course):** enforced by DB partial unique index (`D-GUEST`); code catches conflict → 409 with reason. (T2-DATA-003)
- **V6 (cohort-active unenrol guard):** reject per-path unenrol of an ACTIVE cohort enrolment (Moodle `allow_unenrol_user` false unless suspended, ENR-013) → 409/403 with reason. (R-COHORT)
- **V7 (window sanity):** if `enrol_start`/`enrol_end` both set, `start <= end`; if `enrol_duration` set, it is a positive interval (currently no CHECK — validate in schema/service, do not add DDL).
- **V8 (self-enrol period):** `time_end` computed from `config.enrol_period` when present, else open-ended. (T2-ENR-004)
- **V9 (config typing):** replace raw `config: dict` with typed sub-models per method kind so unknown/typo keys (e.g. `syncgroupid` vs `sync_group_id`) are caught. (hardening)
- **V10 (row existence):** unenrol/suspend of a non-enrolled user — decide 404 vs Moodle's silent no-op; current target returns 404 (`:302-304`). Keep 404 (clearer for an API) but document the intentional divergence from Moodle's silent return (ENR-035).

---

## 16. Business rules

Rules restated from Moodle behaviour truth; each cites the Moodle symbol and the target site.

- **R-ACTIVE (§6.2):** effective enrolment = ANY path with `enrolment.status='active'` AND `method.status='enabled'` AND now inside `[time_start, time_end)` AND user not deleted. Source: Moodle `get_enrolled_join` (`enrollib.php:1596-1616`), target `ACTIVE_CONDITIONS_SQL` (`:45-50`) + `v_enrolment_detail.live` (`schema.sql:409-428`). Keep; align the two definitions (§14).
- **R-REENROL (T2-ENR-002):** re-enrol preserves existing `status`; only explicit activate reactivates; time window changes only when supplied. Source: Moodle `enrol_user(status=null)` preserves status (`enrollib.php:2132-2136`), `update_user_enrol` change-gated (`:2214-2284`). Target defect at `:237-242`.
- **R-ROLE (T2-ENR-005 + T2-ENR-003, co-reviewed Khaled, `D-RA`):** pick ONE:
  - **Option A (recommended — Moodle-faithful):** tag manual/self roles `component=''` (matching Moodle `roles_protected()=false`, `enrol/manual/lib.php:32-35`, `enrol/self/lib.php:102-105`), keep cohort `component='enrol_cohort'`. Then per-path unenrol (component-filtered, `:309-314`) naturally leaves manual/self roles until last-path; last-path cleanup runs a blanket `role_unassign_all(user, course_ctx)` removing ALL roles including `component=''` (Moodle `enrollib.php:2344`). This fixes BOTH the under-permission (T2-ENR-005) and the ghost (T2-ENR-003) at once, and matches Moodle exactly. Requires Khaled sign-off because the last-path blanket now deletes his `component=''` rows.
  - **Option B (documented divergence):** keep D-1 tagging but on per-path unenrol only remove a provenance role if no other active path grants the same role; and document the `component=''` retention as an explicit product decision. Weaker parity; only if Khaled objects to A.
  Source/target sites: tagging `:110-111,256-268`; cleanup `:309-314,339-344`. Moodle: `enrollib.php:2182,2325,2344`.
- **R-COHORT-UNENROL (ENR-013/025):** an ACTIVE cohort-synced enrolment cannot be manually unenrolled — only when suspended. Source: `enrol/cohort/lib.php:218-224`. Target has no guard (ENR-013 MISSING); add in `unenrol_user`.
- **R-COHORT-SYNC (ENR-026, C5 gaps):** on sync, (1) enrol missing members, (2) reactivate suspended members, (3) **re-add missing cohort roles for kept members** (currently absent — `kept` never calls role logic, `:519-520`), (4) unenrol leftovers (UNENROL policy). Disabled method → frozen (keep). Document KEEP/SUSPEND/SUSPENDNOROLES as not-implemented (annotated, `:482-485`).
- **R-EXPIRY (T2-ENR-004):** a scheduled task applies per-method `expiredaction`: KEEP (default — no state change; on-read liveness already access-equivalent, confirmed C4), SUSPEND (set `status='suspended'`, keep roles), UNENROL (full per-path unenrol). Self `longtimenosee` → unconditional unenrol of inactive self-enrolled users using `user_last_access`. Self-enrol applies `time_end`. Source: Moodle `process_expirations` (`enrollib.php:2998-3106`), `enrol/self/lib.php:459-525`, `enrol/manual/settings.php:40`. Any persisted expiry-state column is `D-EXPIRY-DDL` (Essa).
- **R-GUEST (§6.7, T2-DATA-003):** guest methods create NO enrolment rows; one guest instance per course, DB-enforced via `D-GUEST`. Source target `:228-231,565-573`.
- **R-ATOMICITY (T2-DATA-002):** group side-effects deferred post-commit MUST be idempotent (Mahmoud, `D-GM`) and, on failure, recorded to `audit_log` for a reconciliation pass; never leave silent divergence. Source `:114-128,131-134,350-356`.
- **R-AUDIT (T2-DATA-001):** every lifecycle mutation writes an `audit_log` row: `enrolment.created/updated/deleted/suspended/reactivated/expired/synced`, `role.*` for provenance role writes it performs, with `actor_id`, `affected_id`=user, `course_id`, `context_id`, `detail` (method_id, kind, `last_path`). `audit_log` schema at `schema.sql:391-401`; currently never written (grep-confirmed). `D-AUDIT` (Essa confirms index adequacy).
- **R-C6 (account vs enrolment suspension):** `app_user.suspended` is a different switch; never touch enrolment rows/liveness on account suspension; account-suspended users STAY on the roster with a flag. Source `:660-664,715-717`; test `:295-305`. Keep.

---

## 17. Edge cases

1. **Suspended-elsewhere blocks last-path cleanup.** The last-path guard counts ANY remaining row regardless of status (`:326-330`) — a suspended path on another method correctly blocks the big cleanup (Moodle any-status `record_exists`, `enrollib.php:2332-2354`). PARITY (CH-09). Add a test — currently untested.
2. **Differing-role multi-method demotion (T2-ENR-005).** Manual=teacher + cohort=student; unenrol manual (cohort remains) must keep teacher (Option A) — the core fix.
3. **Ghost role (T2-ENR-003).** Self-enrolled student + manual `component=''` teacher; last-path unenrol must remove teacher (Option A) or be documented (Option B).
4. **Re-enrol a suspended user (T2-ENR-002).** Must stay suspended unless explicit activate.
5. **Cohort re-sync reactivation is PARITY** (Moodle unsuspends synced members, `enrol/cohort/locallib.php:209-211`; target `:516-518`) — do NOT "fix" this; only the manual/self/direct path is the bypass.
6. **Guest enrol attempt** returns refusal, never a row (`:228-231`). Concurrent guest-method create → at most one (D-GUEST).
7. **Self-enrol capacity TOCTOU** is shared PARITY with Moodle (both count-then-act, C6) — do not over-engineer; a DB cap is optional hardening, not required for parity.
8. **Method disabled mid-enrolment** freezes access without touching rows (`update_method`, `:591-592`; liveness condition 2). Keep.
9. **Expired-but-status-active row** lists under "active" filter (`:718`) yet exposes `effective_status='expired'` (`:726-734`). With R-EXPIRY SUSPEND/UNENROL it transitions; under KEEP it remains on-read — document the display nuance (C4).
10. **No course context row** → role assignment skipped with warning (`:250-254`). Keep; do not create context (Khaled's table).
11. **Non-enrolled unenrol/suspend** → 404 (target) vs Moodle silent no-op — documented divergence (V10).
12. **Soft-deleted course** still surfaces in some read paths (XD-06). Enrolment reads should apply `deleted_at is null` consistently (§14 alignment); cross-router deleted policy is an open consistency item flagged to the team, not solely Yaman's.
13. **Concurrent enrol** → safe/idempotent via `unique (method_id, user_id)` + `on conflict` (ENR-034). Keep.
14. **`enrol_duration` set but no `time_end`** → expiry worker computes effective end from `time_start + enrol_duration` (T2-ENR-004); today the column is dead.

---

## 18. Hard cases

- **HC-01 — manual + cohort, cohort removed** (`hard-cases/HC-01-*.md`; script `tests/hard-cases/hc1_manual_plus_cohort.sh`). Current verdict FUNCTIONALLY_EQUIVALENT (0.85) on default UNENROL. Work: (a) make the script hermetic (seed its own fixtures, not rely on user 10/cohort 2 in a live Supabase); (b) **add group assertions** (co-reviewed Mahmoud) — after cohort removal, the cohort-provenance group membership is gone and any manual/`component=''` membership survives (currently only asserts method presence, `:29-42`); (c) assert the cohort role row (`component='enrol_cohort'`) is deleted and the manual role survives (Option A: manual role is `component=''`); (d) remove the stale "pending Mahmoud" comment (`:11-13`).
- **HC-02 — dropout week 10, re-enrol week 12** (`hard-cases/HC-02-*.md`; script `hc2_drop_and_return.sh`). Current FUNCTIONALLY_EQUIVALENT (0.80) with the `component=''` sub-mismatch. Work: (a) hermetic fixtures; (b) assert last-path cleanup removes ALL course roles including a roles-service-assigned `component=''` role (Option A) — this is the T2-ENR-003 fix and the script's biggest gap (`:48-50` only prints a NOTE); (c) assert group memberships emptied on last-path and NOT restored on re-enrol; (d) completion rows survive (already asserted, `:37-38`); (e) progress reappears on re-enrol.
- **HC cross-domain** (`cross-system-resolution.md`): XD-03 (suspended student must be denied the course door — but that's the seed `course:view` fix owned by Khaled `D-SEED`; Yaman ensures rosters filter by enrolment status where required), XD-04 (one-source-removed = HC-01), XD-05 (re-enrol reattach = HC-02). Yaman's part is the enrolment-side correctness; the door/seed is Khaled.

---

## 19. Acceptance criteria

- **AC-1 (T2-ENR-001):** a student principal calling enrol/unenrol/suspend/self-enrol/method/cohort mutations gets 403 (no capability) and NO state change; unauthenticated gets 401; a teacher/manager with the capability succeeds. Proven by the authz gate test (§20) and MERGE-STRATEGY CI authz gate.
- **AC-2 (T2-ENR-002):** enrol → suspend → enrol again (no `activate`) → status stays `suspended`; enrol with `activate=True` reactivates. Window not silently rewritten.
- **AC-3 (T2-ENR-005):** manual-teacher + cohort-student; unenrol manual (cohort remains) → user retains teacher role. Same-role two-method case unchanged (regression).
- **AC-4 (T2-ENR-003):** self-enrol student + roles-service-assigned `component=''` teacher; remove last enrolment → no role assignments remain in the course context; user absent from `list_other_users` (Option A). OR: a signed product-decision doc records the retention (Option B) with the compatibility consequence stated. Khaled co-signs either way.
- **AC-5 (T2-ENR-004):** an enrolment past `time_end` transitions per configured `expiredaction` (SUSPEND/UNENROL write real state; a consumer reading `status` sees it); an inactive self-enrolled user is unenrolled after `longtimenosee`; self-enrol applies its period.
- **AC-6 (T2-DATA-002):** injected group-op failure after enrolment commit → system converges via reconciliation OR the failure is recorded to `audit_log` and repairable; no orphaned/missing memberships persist silently.
- **AC-7 (T2-DATA-003):** concurrent guest-method creation → at most one row (D-GUEST); concurrent add_member during unenrol → no membership for a non-enrolled user.
- **AC-8 (R-COHORT):** manual unenrol of an ACTIVE cohort path is refused with a reason; when suspended it is allowed.
- **AC-9 (audit):** every lifecycle mutation produces an `audit_log` row with actor/affected/course/detail; `enrolment.deleted` carries `last_path`.
- **AC-10 (HC parity):** `hc1`/`hc2` run hermetically in CI (seeded ephemeral DB) and pass with the new role+group assertions.

---

## 20. Required tests

Rewrite `backend/tests/test_enrolment.py` to be **hermetic** (the current file runs against the live team DB via `DATABASE_URL`, `:1-11`; MERGE-STRATEGY CI requires no external creds after `D-SEC`). Use an ephemeral seeded Postgres (fixtures built and torn down per test, as the file already does, but pointed at a CI DB). New/updated cases:

- `test_authz_enrol_requires_capability` — student principal → 403, no row; teacher → 201. (T2-ENR-001)
- `test_authz_unauthenticated_401` — no principal → 401 on every mutation. (MERGE-STRATEGY authz gate)
- `test_reenrol_preserves_suspension` — enrol/suspend/enrol(no activate) → suspended; enrol(activate) → active. (T2-ENR-002)
- `test_perpath_unenrol_keeps_role_from_other_path` — manual-teacher + cohort-student, unenrol manual → teacher retained. (T2-ENR-005)
- `test_same_role_two_method_unenrol_regression` — same role both methods → unchanged. (T2-ENR-005 regression)
- `test_lastpath_unenrol_strips_all_roles` — self student + `component=''` teacher, last-path unenrol → zero role rows in course ctx; absent from `list_other_users`. (T2-ENR-003, Option A)
- `test_expiry_action_suspend_and_unenrol` — seed past `time_end`, run worker → state transitions per `expiredaction`. (T2-ENR-004)
- `test_self_enrol_applies_period` — self-enrol with `enrol_period` → `time_end` set. (T2-ENR-004)
- `test_longtimenosee_unenrol` — stale `user_last_access` → worker unenrols. (T2-ENR-004)
- `test_cohort_active_unenrol_refused` — active cohort path unenrol → refused; suspended → allowed. (R-COHORT)
- `test_cohort_sync_readds_missing_role` — delete a kept member's cohort role, sync → restored. (ENR-026 C5)
- `test_guest_one_per_course_constraint` — second guest create → 409 (relies on `D-GUEST`); concurrent create → one row. (T2-DATA-003)
- `test_group_op_failure_audited` — inject `_groups_call` failure post-commit → `audit_log` repair row written, enrolment committed, reconciliation converges. (T2-DATA-002)
- `test_audit_rows_written` — each mutation writes the expected `audit_log` event. (T2-DATA-001)
- Keep and adapt existing passing cases: `test_four_active_conditions`, `test_enrol_writes_enrolment_and_provenance_role` (update expected component per Option A), `test_suspend_keeps_roles`, `test_two_paths_provenance_and_last_path_cleanup` (update for Option A), `test_self_enrol_gate_chain_order`, `test_cohort_sync_unenrol_policy`, `test_guest_never_enrols_and_one_per_course`, `test_account_suspended_user_still_on_roster`, `test_other_users_are_not_participants`, `test_no_forbidden_table_writes_in_service_sql` (must still pass — proves no writes to completion/group tables).

Hard-case scripts made hermetic + asserting real state: `hc1` (add group + role asserts), `hc2` (add role-strip + group-empty asserts). (T2-TEST-001)

---

## 21. Regression tests

- **`test_no_forbidden_table_writes_in_service_sql`** (`test_enrolment.py:324-334`) must stay green after all changes — proves the enrolment service never writes `course_group`, `group_member`, `activity_completion`, `course_completion`, `role_capability`, `capability`, and never mentions completion. The audit-log helper and any new SQL must not violate this.
- **HC-01 / HC-02** must remain FUNCTIONALLY_EQUIVALENT (their headline outcomes unchanged): manual survives cohort removal; completion survives unenrol; re-enrol restores participation but not groups.
- **C-6 account-vs-enrolment** roster behaviour unchanged (`test_account_suspended_user_still_on_roster`).
- **Idempotent enrol** under concurrency still converges to one row (`unique (method_id, user_id)`).
- **Cross-domain**: `backend/tests/test_check_integration.py` (Khaled custodian) — add enrolment cases via PR only, do not edit Khaled's assertions.
- Full suite `test_enrolment.py` + `test_permissions.py` + `test_groups.py` + new `test_progress.py` green before merge (MERGE-STRATEGY CI).

---

## 22. Integration points

- **Khaled (auth/authz):** consume `Depends(current_user)` (`D-AUTH`) and `has_capability`/`require_capability` (`D-ENFORCE`) — every route. Provenance role writes into `role_assignment` (`D-RA`); last-path full-strip co-reviewed. Canonical capability names (`D-CAPNAME`). `src/context/ActingUser.jsx` (Khaled) drives the frontend acting-user used by `ParticipantsTable.jsx:69` "Act as".
- **Mahmoud (groups):** call `services/groups.py` `add_member`/`remove_members_by_provenance`/`remove_all_memberships` with server-set provenance (`D-GM`); group ops must be idempotent for T2-DATA-002. hc2 group asserts co-reviewed.
- **Mahdi (progress):** enrolment liveness feeds the progress enrolment-gate (`D-VIEW`/PRG-005, Mahdi's fix). Yaman guarantees correct liveness reads; never writes completion.
- **Essa (DB + shared):** `D-GUEST`, `D-EXPIRY-DDL`, `D-AUDIT`, view changes; `main.py` scheduler wiring; `api.js`/`errors.js`/`schemas.py` shared edits via coordination PR; `D-SEC` precondition for hermetic tests.
- **Frontend:** `SelfEnrolDemo`/`EnrolUserModal`/`MethodsPanel`/`ParticipantsTable` consume the authorized API + real gate chain; retire `mocks/enrolment.js`.

---

## 23. Dependencies (D-* IDs)

Blocking (Yaman cannot finish/merge until delivered):

- **D-AUTH** (Khaled) — authenticated principal + `Depends(current_user)`. Blocks T2-ENR-001. IMPLEMENTATION-ORDER Phase 1.
- **D-ENFORCE** (Khaled) — `has_capability(db, user_id, capability, context_id)` + `require_capability`. Blocks T2-ENR-001 authz on every mutation.
- **D-GUEST** (Essa) — partial unique index guest one-per-course on `enrolment_method`. Blocks the constraint-backed part of T2-DATA-003 (code can land the catch-on-conflict ahead, but correctness needs the index).

Provenance contracts (parallel, co-reviewed — not another's edit):

- **D-RA** (Yaman ↔ Khaled) — `role_assignment` `component='enrol_*'` writes; last-path full-strip of `component=''` co-reviewed. Drives T2-ENR-003, T2-ENR-005, HC-01/02.
- **D-GM** (Yaman ↔ Mahmoud) — `group_member` `component='enrol_self'/'enrol_cohort'` writes; idempotency for T2-DATA-002. Drives HC-01, T2-GRP-003 boundary.

Non-blocking / hardening:

- **D-EXPIRY-DDL** (Essa) — any column/index to persist expiry action/notification state; confirm `enrol_duration` usage. Most of T2-ENR-004 is code.
- **D-AUDIT** (Essa + all) — confirm `audit_log` schema/index adequacy; Yaman writes `enrolment.*` rows. T2-DATA-001.
- **D-CAPNAME** (Khaled + Essa) — canonical capability names; Yaman uses whatever canonical form is published.
- **D-SEC** (Essa) — credential rotation; precondition for hermetic CI tests (MERGE-STRATEGY).
- **D-SEED** (Essa, Khaled) — `course:view` manager-only; not Yaman's fix but resolves XD-03 door for suspended users; Yaman's rosters must still filter by enrolment status where required.

Full graph in TEAM-DEPENDENCIES.md.

---

## 24. Merge order

Per MERGE-STRATEGY.md and IMPLEMENTATION-ORDER.md:

1. `t2/essa/D-SEC` (first, standalone).
2. `t2/essa/migrations-*` including `D-GUEST` and any `D-EXPIRY-DDL` (each its own PR, reviewed by Yaman as requester).
3. `t2/khaled/D-AUTH` then `t2/khaled/D-ENFORCE` — Yaman rebases on these before wiring authz.
4. Yaman domain branches (parallel with other domains once 1-3 in), in this internal order:
   - `t2/yaman/T2-ENR-001-authz`
   - `t2/yaman/T2-ENR-002-reenrol-status`
   - `t2/yaman/T2-ENR-roles-DRA` (T2-ENR-003 + T2-ENR-005; required reviewer Khaled)
   - `t2/yaman/T2-ENR-004-expiry` (scheduler wiring PR to Essa for `main.py`)
   - `t2/yaman/T2-DATA-002-003` (group-op reconciliation + guest constraint; required reviewer Mahmoud for group_member touch)
   - `t2/yaman/T2-DATA-001-audit`
   - `t2/yaman/frontend-enrolment` (mocks retire + gate-chain fix)
5. Integration/hard-case/regression PRs last (Phase 3).

Rule: a Yaman PR consuming a dependency cannot merge before that dependency PR merges (CI required-status check). PRs touching `role_assignment` require Khaled approval; `group_member` require Mahmoud approval (required reviewers, not shared ownership).

---

## 25. Git strategy

- Branch from `team2/parity-fixes`; one feature branch per dependency-scoped unit, named `t2/yaman/<issue-or-dep>` (§24). No commits to another engineer's branch; no direct commits to `main`.
- Rebase each domain branch on the merged foundation (`D-AUTH`/`D-ENFORCE` + migrations) before implementing, so authz wiring is never duplicated.
- Shared-surface edits (`main.py` scheduler wiring, `api.js`/`errors.js`/`schemas.py`) go as small additive diffs to `t2/essa/shared-<topic>` for Essa to merge — never rename/move shared symbols.
- Commit messages reference the issue/dep id (e.g. `T2-ENR-002: preserve suspension on re-enrol upsert`). Each PR header cites the audit issue and, for dual-write PRs, the D-RA/D-GM contract.
- No secret literals in any diff (permanent secret-scan gate after D-SEC).
- Migrations are never authored here — if a change needs DDL, stop and file or update the Essa dependency.

---

## 26. Implementation checklist

- [ ] Rebase on `D-SEC`, Essa migrations (`D-GUEST`, `D-EXPIRY-DDL`), `D-AUTH`, `D-ENFORCE`.
- [ ] Wire `Depends(current_user)` + `require_capability` into every mutation route in `enrolment.py` and `users.py`; map capabilities (§11). (T2-ENR-001)
- [ ] Remove trust in query-param `actor_id`; derive actor from principal. (T2-ENR-001)
- [ ] Add `activate` to `EnrolRequest`; rewrite upsert to preserve status + change-gate window. (T2-ENR-002)
- [ ] Decide R-ROLE Option A vs B with Khaled; implement role tagging + per-path/last-path cleanup. (T2-ENR-005, T2-ENR-003, D-RA)
- [ ] Add R-COHORT active-unenrol guard. (ENR-013)
- [ ] Add cohort-sync role re-add pass for kept members. (ENR-026 C5)
- [ ] Apply self-enrol period; add self-enrol capability + already-enrolled refusal. (T2-ENR-004)
- [ ] Build `app/tasks/enrol_expiry.py` (`process_expirations`, `longtimenosee`, reconciliation); register via Essa `main.py`. (T2-ENR-004, T2-DATA-002)
- [ ] Guest: catch `UniqueViolation` on `create_method` (relies on `D-GUEST`). (T2-DATA-003)
- [ ] Make deferred group ops idempotent + audit on failure + reconciliation pass. (T2-DATA-002, D-GM)
- [ ] Add `_audit` helper; write `enrolment.*` rows in every mutation. (T2-DATA-001, D-AUDIT)
- [ ] Align `list_participants` CTE liveness with `v_enrolment_detail.live` (deleted user/course). (§14)
- [ ] Type method `config` sub-models in `schemas_enrolment.py`. (V9)
- [ ] Frontend: fix `SelfEnrolDemo` gate copy; surface 401/403/409; add `activate` affordance; expose expiry config in `MethodsPanel`; cohort-active unenrol hint in `ParticipantsTable`; retire `mocks/enrolment.js`.
- [ ] Rewrite `test_enrolment.py` hermetic + all new cases (§20); keep regression guard green.
- [ ] Make `hc1`/`hc2` hermetic + role/group asserts (Mahmoud co-review on hc2).
- [ ] Cross-domain scenarios (XD-03/04/05) verified in Phase 3.

---

## 27. Estimated complexity

| Work unit | Complexity | Driver |
|---|---|---|
| T2-ENR-001 authz wiring | Medium | Mechanical across ~14 routes, but must correctly resolve context + consume Khaled's API; blocked on D-AUTH/D-ENFORCE |
| T2-ENR-002 re-enrol status | Low-Medium | Single upsert rewrite + schema field + tests; subtle (change-gating) |
| T2-ENR-003 + T2-ENR-005 role lifecycle | High | Cross-domain semantics, D-1 unwind, co-review with Khaled, touches the most delicate cleanup logic; risk of regressing HC-01/HC-02 |
| T2-ENR-004 expiry subsystem | High | New scheduler (architecture had none), self-enrol period, longtimenosee, per-method action config, shared `main.py` wiring |
| T2-DATA-002 atomicity | Medium-High | Reconciliation design + idempotency coordination with Mahmoud |
| T2-DATA-003 guest race | Low | Consume D-GUEST index + catch conflict |
| Audit writes | Low-Medium | Helper + call sites, must not violate forbidden-write guard |
| Frontend | Medium | Gate-chain fix, error surfacing, mock retirement; expiry UI gated on staging evidence |
| Test rewrite (hermetic) | Medium | Depends on CI ephemeral DB (D-SEC) |

Overall package: **High** — dominated by the role lifecycle (cross-domain) and the net-new expiry subsystem.

---

## 28. Estimated duration

Assuming Phase 1 dependencies (D-AUTH/D-ENFORCE/D-GUEST) are merged before Yaman starts Phase 2, and one engineer:

- T2-ENR-001 authz: ~2 days
- T2-ENR-002: ~1 day
- T2-ENR-003 + T2-ENR-005 (incl. Khaled co-review cycles): ~3-4 days
- T2-ENR-004 expiry: ~4-5 days
- T2-DATA-002: ~2 days
- T2-DATA-003: ~0.5 day
- Audit writes: ~1 day
- Frontend: ~2-3 days
- Hermetic test rewrite + hard cases: ~2-3 days
- Integration/cross-domain (Phase 3): ~2 days

**Total: ~19-24 working days (~4-5 weeks)**, excluding dependency wait time. Critical internal path: expiry subsystem and the role-lifecycle co-review.

---

## 29. Risk assessment

- **R1 (High) — regressing HC-01/HC-02 while fixing role lifecycle.** The D-1 unwind (Option A) changes what per-path and last-path cleanup delete. Mitigation: land HC-01/HC-02 hermetic assertions FIRST, then change the code; Khaled required reviewer on `role_assignment`.
- **R2 (High) — expiry scheduler architecture.** No scheduler exists; introducing one (APScheduler/cron/worker) affects deployment. Mitigation: keep the worker idempotent and callable both on a schedule and manually (`POST /methods/{id}/sync` already exists as a manual trigger precedent); coordinate `main.py` wiring with Essa; confirm the deployment runtime supports background tasks — **INSUFFICIENT EVIDENCE on deploy target — confirm with Essa/runtime**.
- **R3 (Medium) — Option A deletes Khaled's `component=''` rows on last-path.** This is the correct Moodle behaviour but crosses the ownership boundary. Mitigation: explicit `D-RA` co-review + a signed decision; fall back to Option B (documented divergence) only if Khaled blocks.
- **R4 (Medium) — cross-domain non-atomicity cannot be fully solved in enrolment alone.** True atomicity needs group ops in-transaction, which the architecture deliberately avoids (`_groups_call` docstring `:114-128`). Mitigation: reconciliation + audit, not forced single-transaction; accept "converges" as the bar (matches Moodle's observer/idempotent-sync model, DATA-018).
- **R5 (Medium) — authz depends entirely on Khaled's delivery.** If `D-AUTH`/`D-ENFORCE` slip, all of T2-ENR-001 slips. Mitigation: build the wiring against the published signature stub; do not invent a local auth.
- **R6 (Low-Medium) — frontend UI for expiry unverifiable without staging.** Mitigation: flag INSUFFICIENT EVIDENCE; ship backend + minimal config UI; defer polish to staging review.
- **R7 (Low) — hermetic tests blocked on D-SEC.** Mitigation: parametrize `DATABASE_URL` to a CI ephemeral DB; do not commit creds.
- **R8 (Low) — capability name drift.** Mitigation: use `D-CAPNAME` canonical names, no literals duplicated.

---

## 30. Definition of Done

- All seven owned issues (T2-ENR-001/002/003/004/005, T2-DATA-002, T2-DATA-003) resolved with the acceptance criteria in §19 met, or (T2-ENR-003 Option B) a signed product-decision doc co-authored with Khaled.
- Every enrolment/People mutation authenticated + authorized; a test proves 401 without session and 403 without capability for each mutation endpoint (MERGE-STRATEGY authz gate).
- `test_enrolment.py` hermetic and green in CI with all new cases; the forbidden-write regression guard still passes; `test_permissions.py`/`test_groups.py`/`test_progress.py` unaffected.
- `hc1`/`hc2` hermetic, asserting real role + group state, green.
- `audit_log` populated for every lifecycle change; no silent post-commit group failures.
- No DDL/migration/seed authored by Yaman; every schema need delivered as an Essa dependency and referenced by id.
- No edits to another engineer's files; `role_assignment` `component=''` rows touched only under the co-reviewed `D-RA` last-path fix; `group_member` written only with server-set `enrol_*` provenance under `D-GM`.
- Frontend consumes the authorized real API; `mocks/enrolment.js` retired; `SelfEnrolDemo` gate-chain copy corrected; error reasons surfaced.
- Merged in the §24 order onto `team2/parity-fixes`; secret-scan clean; all required reviewers (Khaled for role_assignment, Mahmoud for group_member) approved.

---

# System Prompt — Engineer "Yaman" (Enrolment & People)

## Identity
You are Yaman, the Enrolment & People engineer on Team 2 (People & Enrolment) of the Moodle parity project. You own manual/self/cohort/guest enrolment, course membership, the enrolment lifecycle (enrol/suspend/reactivate/unenrol/re-enrol), cohort sync, self-enrolment, the enrolment APIs/UI/validation/tests, and the People surface (`app_user` via `users.py`).

## Mission
Bring the target's enrolment subsystem to behavioural parity with Moodle by resolving exactly these audit issues: T2-ENR-001, T2-ENR-002, T2-ENR-003, T2-ENR-004, T2-ENR-005, T2-DATA-002 (enrolment side), T2-DATA-003 (guest one-per-course + enrolment guard). Behaviour truth is Moodle source (`/Users/yamanobiedat/Documents/GitHub/moodle/public/...`); enforceable data truth is `schema.sql`; UI truth is staging (which you cannot access — flag anything you cannot derive from the committed frontend as INSUFFICIENT EVIDENCE, never guess).

## Allowed scope
Edit only: `app/routers/enrolment.py`, `app/routers/users.py`, `app/services/enrolment.py`, `app/schemas_enrolment.py` (and a new `app/schemas_users.py` if extracting user models), a new `app/tasks/enrol_expiry.py`, `backend/tests/test_enrolment.py`, `tests/hard-cases/hc1_manual_plus_cohort.sh`, `tests/hard-cases/hc2_drop_and_return.sh`, `src/pages/EnrolmentPage.jsx`, `src/components/enrolment/*`, `src/mocks/enrolment.js`. Write domain data to `enrolment_method`, `enrolment`, `cohort`, `cohort_member`, `user_last_access`, `app_user`. Write provenance rows to `role_assignment` (`component='enrol_*'`, `D-RA`) and `group_member` (`component='enrol_self'/'enrol_cohort'`, `D-GM`) and append to `audit_log` (`enrolment.*`). Read `v_enrolment_detail`/`v_course_participant`.

## Forbidden scope
- Do NOT modify any other engineer's files (routers/services/schemas/components/tests for roles, groups, progress, or shared surfaces).
- Do NOT edit `schema.sql`, `fixtures.sql`, `seed.sql`, or write any migration — ALL DDL/migration/seed is Essa-only. If you need a column, index, constraint, view, or trigger, file/reference an Essa dependency (`D-GUEST`, `D-EXPIRY-DDL`, `D-AUDIT`, view change) and stop.
- Do NOT touch `role_assignment` rows with `component=''` except under the co-reviewed last-path full-strip fix (T2-ENR-003) with Khaled as required reviewer (`D-RA`).
- Do NOT write `group_member` directly — call `services/groups.py` with server-set provenance (`D-GM`); never accept client-supplied provenance.
- Do NOT write `course_completion`/`activity_completion` (statically enforced by `test_no_forbidden_table_writes_in_service_sql`), nor `role`/`capability`/`role_capability`/`context`/group/grouping tables.
- Do NOT build your own authentication or authorization engine — consume Khaled's `D-AUTH` (`Depends(current_user)`) and `D-ENFORCE` (`has_capability`/`require_capability`).
- Do NOT edit shared files (`main.py`, `db.py`, `supa.py`, `api.js`, `errors.js`, `schemas.py`, `components/common/*`, `context/SelectedCourse.jsx`) directly — submit additive diffs through Essa (custodian).
- Do NOT invent files, tables, endpoints, capabilities, or Moodle behaviours.

## Coding standards
- Keep the existing discipline: routers are thin HTTP layers; ALL domain logic in `services/enrolment.py`. Reuse `ACTIVE_CONDITIONS_SQL` as the single liveness predicate. Use the `_one`/`_all`/`_tx` adapters; keep writes inside a transaction. Match surrounding style, comment density, and the existing docstring convention. Every service refusal is `{ok: False, reason: ...}` surfaced verbatim to the UI via `_ok`.
- Prefer typed Pydantic models over raw `dict` config. No secret literals. Write audit rows inside the same transaction as the change.

## Database restrictions
Essa owns all DDL. You request schema changes as dependencies; you never author them. Rely on DB constraints for correctness where they exist (`unique (method_id, user_id)`, the new `D-GUEST` partial unique index) rather than app-only checks. Read-only on `role*`, `capability`, `context`, `course*`, `group*`, `grouping*`, completion tables.

## Parity requirements
Match Moodle behaviour exactly; never simplify or invent. Where the audit found the target already equivalent (per-method model, OR-liveness, source-aware unenrol, transaction wrapping, C-6 account/enrolment split, cohort-resync reactivation), preserve it — do not "fix" parity into divergence. Where Moodle behaviour is config-dependent (expiredaction, unenrolaction), implement the default faithfully and annotate the un-implemented policies rather than pretending they exist.

## Frontend requirements
The frontend must consume the authorized real API and reflect real backend behaviour: correct the `SelfEnrolDemo` gate-chain copy (real backend stops at first failing gate; chain is course_visible→method_enabled→window_open→capacity→key_match), surface 401/403/409 reasons, add an explicit activate-on-re-enrol affordance, expose expiry/period config where derivable, and retire `mocks/enrolment.js`. For any UI shape you cannot derive from the committed components, write "INSUFFICIENT EVIDENCE — requires staging inspection" — do not guess.

## Testing requirements
Deliver hermetic pytest coverage for every fixed behaviour (§20), keep the forbidden-write regression guard green, and make `hc1`/`hc2` hermetic with real role+group assertions (hc2 group asserts co-reviewed by Mahmoud). A mutation endpoint's PR does not merge until a test proves it returns 401 without a session and 403 without capability.

## Acceptance requirements
Meet every acceptance criterion in §19. For T2-ENR-003 choose Moodle-faithful Option A (full last-path role strip, Khaled co-signed) unless Khaled blocks, in which case ship Option B with a signed product-decision doc stating the compatibility consequence.

## Evidence requirements
Every change cites its basis: a Moodle source symbol (behaviour truth), a `schema.sql` line (data truth), an audit issue id, or a committed frontend component (UI truth). Never cite staging you did not observe. When behaviour cannot be verified without a live DB or staging, mark it runtime-pending / INSUFFICIENT EVIDENCE rather than asserting it as observed.

## Completion requirements
Done means: all seven issues resolved to §19, hermetic tests + hard cases green, every mutation authenticated+authorized, `audit_log` populated, no DDL authored, no other engineer's files or `component=''` rows touched outside the co-reviewed contract, frontend on the real API, merged in the §24 order with all required reviewers' approval. If any dependency (D-AUTH, D-ENFORCE, D-GUEST) is unmet, you build against its published contract and wait — you never work around it by editing another engineer's scope or the schema.
