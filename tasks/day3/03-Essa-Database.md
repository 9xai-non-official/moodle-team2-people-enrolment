# Work Package 03 — Essa · Database + DB-Driven Frontend Integration

> **Engineer:** Essa · **Domain:** Database (all DDL, migrations, seed, ORM/models, views, functions, triggers) + custodian of shared backend infra (`db.py`, `supa.py`, `main.py` wiring, `routers/__init__.py`, `courses.py` projection) + coordinator of shared DB-driven frontend surfaces (`api.js`, `errors.js`, `src/components/common/*`).
> **Backbone obeyed:** `TEAM-OWNERSHIP-MATRIX.md`, `TEAM-DEPENDENCIES.md`, `IMPLEMENTATION-ORDER.md`, `MERGE-STRATEGY.md`.
> **Owned artifact:** `moodle-team2-people-enrolment/schema.sql` (PG17, 558 lines); seed `seed.sql` + `moodle-replica/backend/fixtures.sql`.
> **Behaviour truth:** `/Users/yamanobiedat/Documents/GitHub/moodle` (via audit citations).
> **Note:** Essa is the one engineer with **no System Prompt** — this package is the complete mandate. Sections follow the mandated 30-heading structure; per wp-yaman's note, sections 8/9/10 invert for the DB owner (§8 carries the bulk; §9/§10 are short).

---

## 1. Executive summary

Essa is the **single writer of every DDL object** in Team 2 and the **custodian of the shared data/infra plumbing**. Every schema need from Yaman (enrolment), Mahdi (progress), Khaled (roles/contexts), and Mahmoud (groups) arrives as a dependency (`D-*`) and Essa delivers it as a discrete, forward-only, reviewed migration. Essa does **not** implement domain business logic (enrolment/roles/groups/progress services).

This package converts the completed parity audit into an implementation plan built as **16 migration units** (`M00`–`M16`), each tied to a dependency ID and the audit issue it derives from. The spine:
- **D-SEC** first (rotate/remove the committed Supabase `service_role` JWT + DB password — T2-SEC-001).
- The Phase-1 migration batch feeding Mahdi and Mahmoud: **D-VIEW** (`v_course_progress` rewrite), **D-CRIT** (criteria tables), **D-GRP-VIS**/**D-GRP-AVAIL** (group visibility/availability), plus **D-CTX**, **D-GUEST**, **D-SEED**/**D-CAPNAME**.
- Data-integrity + hygiene: **D-AUDIT** (audit_log adequacy), **D-PDEC** (formalize the runtime-only `permission_decision` table), **D-FNCAN** (retire dead `fn_can`), **D-IMMUT** (write-once `time_completed`), **D-SNAP** (HC-05 option-A ledger), **T2-DATA-004** (deletion semantics), **D-EXPIRY-DDL** (conditional).
- Infra: retire `supa.py` for a **single asyncpg data layer**; add a global exception handler; keep RLS enabled on every new table.

Endorsed superiorities (real FKs, survive-unenrol completion, no-FK audit log, non-drifting context path, NULL-guarded liveness) are preserved by every migration, never regressed.

---

## 2. Scope

Per `TEAM-OWNERSHIP-MATRIX.md §9-11, §4`:

**DDL / data model (exclusive):** all 20 tables in `schema.sql`; all 8 enums; every constraint, FK, index, CHECK; all views (`v_enrolment_detail:409`, `v_course_participant:430`, `v_course_progress:442`); the function `fn_can:475`; the trigger `trg_context_path:122` + `context_path` binding `:136`; all seed (`seed.sql`, `fixtures.sql`) and their reconciliation into one canonical seed; ORM/model shapes; DB docs (`docs/findings/DB_SCHEMA.md`); and the migration workflow itself (there is none today — the whole `schema.sql` is applied at once).

**Shared backend infra (custodian):** `app/db.py` (asyncpg pool), `app/supa.py` (PostgREST — fate to decide), `app/__init__.py`, `app/services/__init__.py`, `app/routers/__init__.py`, `main.py` (wiring + D-AUTH merge point), `app/routers/courses.py` (Team-1 projection), `app/schemas.py` (until domains extract their own).

**Shared DB-driven frontend surfaces (coordinator):** `src/api.js`, `src/errors.js`, `src/components/common/*`, `src/lib/catalog.js`, `src/context/SelectedCourse.jsx`, `src/pages/DashboardPage.jsx`, `src/mocks/{core,seed,index}.js`.

---

## 3. Out of scope

- **Domain service logic:** `services/enrolment.py` (Yaman), `services/permissions.py` (Khaled), `services/groups.py` (Mahmoud), new `services/progress.py` (Mahdi), new `services/auth.py` (Khaled). Essa provides the substrate; domains write the rules.
- **Domain routers:** `enrolment.py`, `users.py` (Yaman), `roles.py`, `permissions.py` (Khaled), `groups.py` (Mahmoud), `progress.py` (Mahdi). Exception: retiring `supa.py` changes `progress.py`'s data-access lines — delivered as a **co-reviewed shim** to Mahdi, not an Essa rewrite of his logic.
- **Domain frontend pages/components** and domain `lib/*Api.js` / `mocks/{enrolment,progress,roles,groups}.js`.
- **Team-1 course content:** `course`/`course_activity` are thin projections (`external_ref`=Team-1 id, `schema.sql:21-24`); sync-only, never write content, **never delete Team-1 course/grade data** (compatibility contract, 05-data-final-verdicts.md §DATA-013/014).
- **Authoring D-AUTH / D-ENFORCE:** provided by Khaled; Essa only **merges** the auth middleware into `main.py`.

---

## 4. Objectives

Each objective = one audit issue → one Essa deliverable → one dependency.

| # | Objective | Issue | Dep | Migration |
|---|---|---|---|---|
| 1 | Rotate + remove committed creds; secret-store loading; secret-scan gate | T2-SEC-001 | D-SEC | M00 |
| 2 | `v_course_progress`: one tracked set, clamp ≤100, exclude fail, enrolment gate | T2-PRG-001/005 | D-VIEW | M03 |
| 3 | Completion criteria + aggregation + crit-compl tables | T2-PRG-003 | D-CRIT | M04 |
| 4 | Per-group visibility enum + column; consult `participation` | T2-GRP-004 | D-GRP-VIS | M05 |
| 5 | Activity availability restrictions by group/grouping (hidden/greyed) | T2-GRP-005 | D-GRP-AVAIL | M06 |
| 6 | Recursive `trg_context_path` for descendant reparent | T2-RBAC-005 | D-CTX | M07 |
| 7 | Guest one-per-course partial unique index | T2-DATA-003 | D-GUEST | M08 |
| 8 | Seed: `course:view` manager-only; `accessallgroups` editingteacher/manager; reconcile seeds; canonical capability name | T2-RBAC-003/004 | D-SEED, D-CAPNAME | M09 |
| 9 | `audit_log` adequacy + supplemental indexes | T2-DATA-001 | D-AUDIT | M10 |
| 10 | Formalize runtime-only `permission_decision` table + decision indexes | T2-DATA-001/RBAC-060 | D-PDEC | M11 |
| 11 | Retire dead `fn_can` SQL function (three-resolver problem) | T2-RBAC-002 | D-FNCAN | M12 |
| 12 | Write-once `course_completion.time_completed` (defence-in-depth) | T2-PRG-002 | D-IMMUT | M13 |
| 13 | HC-05 option A: snapshot/ledger for real 3-year time-series | T2-PRG-004 | D-SNAP | M14 (conditional) |
| 14 | Deletion semantics: `deleted_at` policy, `activity_completion` FK ON DELETE, module/category lifecycle | T2-DATA-004 | (T2-DATA-004) | M15 |
| 15 | Expiry-state column/index if needed | T2-ENR-004 | D-EXPIRY-DDL | M16 (conditional) |
| 16 | Single data layer (retire `supa.py`); global exception handler; RLS on new tables | (infra) | — | infra |

---

## 5. Complete implementation roadmap

Follows `IMPLEMENTATION-ORDER.md` phases and `MERGE-STRATEGY.md` merge order. Every migration is discrete, forward-only, one concern, with `-- Dependency: D-XXX  Issue: T2-XXX  Reviewed-by: <engineer>` in its header; **never edit a merged migration — add a new one** (`MERGE-STRATEGY.md:33`).

### Phase 0 — immediate, independent (Essa alone)
**M00 — D-SEC — T2-SEC-001 (ops, non-DDL, FIRST):** rotate the exposed `service_role` JWT + DB password in Supabase (treat as compromised — the audit never used them); remove `moodle-replica/backend/.env` from the tree (and git history if tracked); add `.env` to `.gitignore`; keep only `.env.example` placeholders (already clean, `.env.example:1-7`); load secrets from env/secret store (`db.py:24` already reads `os.environ`); fix the contradicting `test_check_integration.py:5-6` docstring; add a secret-scan CI gate (`MERGE-STRATEGY.md:40`). Merges standalone before anything else.

**M01 — baseline + migration ledger:** `schema.sql` verbatim + `create table schema_migrations(version text primary key, applied_at timestamptz not null default now());`. Establishes the workflow; no behaviour change. `schema.sql` remains the human-readable "current full state," regenerated as migrations merge.

**M02 — baseline seed:** `seed.sql` verbatim (pre-corrections); D-SEED corrects it forward.

### Phase 1 — migration batch (parallel with Khaled's D-AUTH/D-ENFORCE)

**M03 — D-VIEW — T2-PRG-001/005 — Reviewed-by Mahdi.** Rewrite `v_course_progress` (current defects at schema.sql:442-457: numerator/denominator use different filters → >100% and false-complete; no clamp; no enrolment gate). Moodle computes both sides over one tracked set and gates on `is_tracked_user` (active enrolment) — `completionlib.php`.
- Define the tracked set once: `course_activity` where `completion_enabled AND visible AND deleted_at IS NULL`.
- Numerator = that same set where `activity_completion.state IN ('complete','complete_pass')` — **exclude `complete_fail`**.
- Denominator = that same set. `percent = LEAST(100, round(100*num/NULLIF(denom,0)))`; NULL/0 when denom 0.
- `is_complete` from `time_completed IS NOT NULL` OR (denom>0 AND num=denom) — never from a >100 artifact.
- **Enrolment gate (T2-PRG-005):** expose `enrolled` boolean via `v_course_participant`/`enrolment` join so `progress.py` returns gated results for the default endpoint (unenrolled → empty) while completion rows stay retained (survive-unenrol, schema.sql:337-341) and re-enrol resurfaces them (regression guard PRG-031). Keep soft-deleted **courses** included (HC-05, schema.sql:441) — the gate is on enrolment, not `course.deleted_at`. Restructure the denominator so the tracked-set count is computed once per course (CTE/join), not the current per-row correlated subquery (§17 performance).
- Per-user group-allowed refinement depends on D-GRP-VIS/AVAIL — ship gating first, add group-allowed as a follow-up so Mahdi is not blocked. Confirm final column names with Mahdi before merge.

**M04 — D-CRIT — T2-PRG-003 — Reviewed-by Mahdi.** Mirror Moodle's criteria tables (DATA-012), target-style:
```sql
create type completion_aggregation as enum ('all','any');
create type completion_crit_type   as enum ('self','date','unenrol','activity','duration','grade','role','course');

create table course_completion_criteria (
    id bigint generated always as identity primary key,
    course_id bigint not null references course(id) on delete cascade,
    criteria_type completion_crit_type not null,
    activity_id bigint references course_activity(id) on delete cascade,
    grade_pass numeric(10,5), time_end timestamptz, enrol_period interval,
    role_id bigint references role(id),
    config jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now());
create index idx_ccc_course on course_completion_criteria(course_id);

create table course_completion_aggr_methd (
    id bigint generated always as identity primary key,
    course_id bigint not null references course(id) on delete cascade,
    criteria_type completion_crit_type,   -- NULL = overall course aggregation
    method completion_aggregation not null default 'all',
    unique (course_id, criteria_type));

create table course_completion_crit_compl (
    id bigint generated always as identity primary key,
    user_id bigint not null references app_user(id),    -- NO cascade: survives (HIS-002)
    course_id bigint not null references course(id),     -- NO cascade
    criteria_id bigint not null references course_completion_criteria(id) on delete cascade,
    grade_final numeric(10,5), unenrolled_at timestamptz, time_completed timestamptz,
    unique (user_id, course_id, criteria_id));
create index idx_cccc_user_course on course_completion_crit_compl(user_id, course_id);
alter table course_completion_criteria     enable row level security;
alter table course_completion_aggr_methd   enable row level security;
alter table course_completion_crit_compl   enable row level security;
```
`crit_compl` FKs to `app_user`/`course` deliberately non-cascading (survive unenrol/soft-delete, like `course_completion`). Aggregation compute is Mahdi's; Essa delivers only tables + constraints.

**M05 — D-GRP-VIS — T2-GRP-004 — Reviewed-by Mahmoud.**
```sql
create type group_visibility as enum ('all','members','own','none');   -- Moodle GROUPS_VISIBILITY_*
alter table course_group add column visibility group_visibility not null default 'all';
```
`participation` already exists (schema.sql:296) — Mahmoud consults both in scope logic. Default `all` = safe forward migration (matches Moodle `visibility DEFAULT 0`, DATA-008).

**M06 — D-GRP-AVAIL — T2-GRP-005 — Reviewed-by Mahmoud.** Relational (not Moodle's opaque JSON blob):
```sql
create type availability_display as enum ('hidden','greyed');
create table activity_availability (
    id bigint generated always as identity primary key,
    activity_id bigint not null references course_activity(id) on delete cascade,
    group_id bigint references course_group(id) on delete cascade,
    grouping_id bigint references grouping(id) on delete cascade,
    display availability_display not null default 'greyed',
    created_at timestamptz not null default now(),
    check ((group_id is not null)::int + (grouping_id is not null)::int = 1));
create index idx_availability_activity on activity_availability(activity_id);
alter table activity_availability enable row level security;
```
Enforcement (hide/grey) is Mahmoud's; Essa delivers the substrate.

**M07 — D-CTX — T2-RBAC-005 — Reviewed-by Khaled.** `trg_context_path()` (schema.sql:122-137) recomputes only the moved node; descendants keep stale `path`/`depth`. Add an `AFTER UPDATE OF parent_id` trigger (guarded on `old.path <> new.path`) that rewrites descendants:
```sql
update context d
   set path  = new.path || substr(d.path, length(old.path)+1),
       depth = new.depth + (d.depth - old.depth)
 where d.path like old.path || '/%';
```
Keep the existing BEFORE trigger for the moved-node/insert case; `idx_context_path` (pattern_ops) serves the LIKE efficiently. Latent today (no move endpoint) but makes any future reparent correct.

**M08 — D-GUEST — T2-DATA-003 — Reviewed-by Yaman.** `create_method` guest uniqueness is app-checked only (`enrolment.py:565-573`, code comment admits no DB index) → concurrent creates duplicate. Match the schema's own DB-unique pattern:
```sql
create unique index uq_guest_method_per_course on enrolment_method (course_id) where method = 'guest';
```
Correctly **partial** — only guest is single-instance; manual/self/cohort stay multi-instance (Moodle has no unique on `(courseid,enrol)`, DATA-002). Yaman then catches the unique violation → 409 instead of the racy pre-check.

**M09 — D-SEED + D-CAPNAME(seed) — T2-RBAC-003/004 — Reviewed-by Khaled + Mahmoud.**
1. **`course:view` over-granted:** `seed.sql:58,65,73,78,82` grant it to all five roles. Moodle reserves `course:view` for **manager only** (`access.php:857-864`) — combined with the door gate's "active enrolment OR course:view" (`permissions.py:314`), suspended students pass. Grant `course:view` to `manager` only.
2. **Plain teacher `accessallgroups`:** root `seed.sql:74` grants it to plain `teacher` at system context on a false-premise comment (`:49`). Moodle: editingteacher + manager only (`access.php:393-401`). Remove the plain-teacher grant.
3. **D-CAPNAME (seed side):** DB seed + `permissions.py:156` use unprefixed `site:accessallgroups`; `groups.py:192,201` use `moodle/site:accessallgroups`. Essa normalizes the seed to the **canonical form chosen in D-CAPNAME** (recommend unprefixed — fewest code changes; final string is Khaled+Mahmoud's call).
4. **Reconcile `seed.sql` ↔ `fixtures.sql`** into one canonical seed (config → demo fixtures ordering); ensure no contradictory grant survives across the two (fixtures.sql:86 course-context `prevent`, :26/:35 separate all-groups role).

**M10 — D-AUDIT — T2-DATA-001 — Reviewed-by all.** `audit_log` (schema.sql:391-401) is defined but written by zero code (writes are each domain's). DDL is adequate and correct (no FKs → outlives hard deletes; matches `logstore_standard_log`, DATA-016). Add report-query indexes:
```sql
create index idx_audit_course on audit_log(course_id, created_at);
create index idx_audit_actor  on audit_log(actor_id, created_at);
create index idx_audit_event  on audit_log(event, created_at);
```
Recommend indefinite retention (Moodle default `loglifetime=0`, HIS-011) for HC-02/HC-05 reconstruction; document in `DB_SCHEMA.md`. Optionally host a shared `audit(event, actor_id, affected_id, course_id, context_id, detail)` insert helper in `db.py` for domains to call.

**M11 — D-PDEC — T2-DATA-001 / RBAC-060 — Reviewed-by Khaled.** Formalize the 21st table: `permission_decision` is lazily `create table if not exists`'d at runtime by `permissions.py:390-401` and is **absent from `schema.sql`** (drift, inventory §1.4/§8). Add its DDL (from `PERMISSION_DECISION_DDL`) to a migration so it is version-controlled and reviewable — Khaled's data, Essa's DDL. Add indexes for the Decision Log query (`permissions.py:921-953`), e.g. on `(actor_id, created_at)` and `(affected_id, created_at)`; `enable row level security`. Keep it distinct from `audit_log` (it logs permission *checks*, not mutations).

**M12 — D-FNCAN — T2-RBAC-002 — Reviewed-by Khaled.** `fn_can` (schema.sql:475-532) is a full in-SQL resolver that **nothing calls** — `permissions.py` re-implements the same rules in Python; the DB view path and the groups path add a third (inventory §1.3, "three-resolver problem"). Retire the dead SQL function to prevent divergence: `drop function if exists fn_can(bigint, varchar, bigint);` The Python resolver stays canonical. Coordinate the exact drop timing with Khaled (confirm no environment invokes it first).

**M13 — D-IMMUT — T2-PRG-002 — Reviewed-by Mahdi.** Defence-in-depth behind Mahdi's app-level fix: make `course_completion.time_completed` write-once. Re-POST currently rewrites it to a fresh `now()` and DELETE un-completes (`progress.py:112-139`). Trigger:
```sql
create or replace function trg_completion_immutable() returns trigger language plpgsql as $$
begin
    if old.time_completed is not null and new.time_completed is distinct from old.time_completed then
        raise exception 'course_completion.time_completed is write-once (was %, cannot set to %)',
            old.time_completed, new.time_completed;
    end if;
    return new;
end $$;
create trigger completion_time_immutable before update on course_completion
    for each row execute function trg_completion_immutable();
```
Un-completion becomes an explicit, authorized, audited reset in Mahdi's code — not a plain DELETE. This is a backstop, not the primary fix (T2-PRG-002 §Required).

**M14 — D-SNAP — T2-PRG-004 — Reviewed-by Mahdi (conditional: HC-05 OPTION A only).** The HC-05 3-year timeline is frontend-mock only (`mocks/progress.js:317-344`; no table, no endpoint). Two options:
- **Option A (real time-series):** add a longitudinal snapshot/ledger table so a genuine 3-year completion/enrolment report replaces the mock. This also partially serves T2-DATA-001. **Blocking only if the team picks Option A.** Proposed:
```sql
create table completion_snapshot (
    id bigint generated always as identity primary key,
    user_id bigint not null references app_user(id),     -- NO cascade: history survives
    course_id bigint not null references course(id),      -- NO cascade
    captured_at timestamptz not null default now(),
    enrolment_status enrolment_status,      -- point-in-time
    activities_done int, activities_total int,
    percent int, time_completed timestamptz,
    detail jsonb not null default '{}'::jsonb);
create index idx_snapshot_user_course on completion_snapshot(user_id, course_id, captured_at);
alter table completion_snapshot enable row level security;
```
Append-only, non-cascading (survives soft-delete/unenrol). A capture job (Mahdi's code, or a scheduled write) populates it.
- **Option B (honest current-state scope):** no new table; remove the fabricated timeline and document current-state-only (which already exceeds Moodle for soft-deleted courses). **Recommendation: default to Option B unless the team explicitly wants the ledger** — flag as §29 open decision. Ship M14 only if Option A is chosen.

**M15 — T2-DATA-004 — Reviewed-by Mahdi.**
1. **`deleted_at` filter policy (documented + enforced):** current-state reads filter `deleted_at IS NULL`; historical paths (progress/audit) may `include_deleted` (as `courses.py:19` already does). `v_course_progress` intentionally keeps soft-deleted courses (HC-05).
2. **`activity_completion` FK ON DELETE:** FK is RESTRICT (schema.sql:363) → a hard module delete is blocked if completion exists (HIS-007). Prefer soft-delete + filter; for genuine hard delete:
```sql
alter table activity_completion drop constraint activity_completion_activity_id_fkey;
alter table activity_completion add constraint activity_completion_activity_id_fkey
    foreign key (activity_id) references course_activity(id) on delete cascade;
```
Keep `course_completion`/`crit_compl` non-cascading. Highest-risk migration — stage last; compensating migration restores RESTRICT.
3. **Category/module lifecycle:** `context_level` has `'category'` but no backing table (HIS-008). **INSUFFICIENT EVIDENCE / product decision** — categories may be Team-1-owned (schema.sql:21-24), no product doc. Safe deliverable: the `deleted_at` policy + never-hard-delete-Team-1-data. Add a `course_category` table + cascade **only if** the team confirms Team-2 ownership.

**M16 — D-EXPIRY-DDL — T2-ENR-004 — Reviewed-by Yaman (conditional).** Only if Yaman confirms persisted expiry state is needed beyond `enrolment_method.enrol_duration`/`enrolment.time_end` (schema.sql:248,273). Most expiry work is code. Deferred until Yaman files the concrete need.

### Phase 2 — support domain implementation
Merge Khaled's D-AUTH middleware into `main.py`; deliver the `supa.py`→`db.py` swap to Mahdi; add global exception handler; add per-domain endpoints/error codes to `api.js`/`errors.js` via coordination PRs.

### Phase 3 — integration
Reconcile frontend contract paths ↔ live routes so the `lib/*Api.js` fallback adapters retire; support hard-case scripts on a seeded DB; feed the sanctioned-DB runtime confirmations.

**Critical path:** Essa's migration batch (`M03/M09/M04`) feeds Mahdi and Mahmoud; start day 1 in parallel with Khaled's auth (`IMPLEMENTATION-ORDER.md:44`).

---

## 6. Backend files to modify

| File | Change | Migration/Dep |
|---|---|---|
| `moodle-team2-people-enrolment/migrations/` (new dir) | Forward-only migration home + `schema_migrations` ledger | all |
| `migrations/M01…M16_*.sql` | The 16 migration units (§5) | all |
| `moodle-team2-people-enrolment/schema.sql` | Regenerate "current full state" as migrations merge (source of change = migrations) | all |
| `moodle-team2-people-enrolment/seed.sql`, `moodle-replica/backend/fixtures.sql` | D-SEED corrections; reconcile into one canonical seed | M09 |
| `moodle-replica/backend/.env` | **Remove** from tree (D-SEC) | M00 |
| `moodle-replica/backend/.gitignore` | Add `.env` | M00 |
| `moodle-replica/backend/.env.example` | Keep placeholders; document secret-store loading | M00 |
| `app/db.py` | Confirm as single data layer; optional `audit()` helper; ensure secrets from env only | infra/M10 |
| `app/supa.py` | **Retire/remove** (single-layer decision, §12/§14) | infra |
| `main.py` | Global exception handler; merge D-AUTH middleware; update `/api/stats` if new counts surface | infra |
| `app/routers/__init__.py` | Custodian (currently empty; if registration moves here) | infra |
| `app/routers/courses.py` | Enforce `deleted_at` policy; additive projection columns as tables land | M15 |
| `app/schemas.py` | Custodian; drive the domain-file split; shared projection models for new columns | infra |
| `docs/findings/DB_SCHEMA.md` | Keep accurate; document new enums/tables, retention policy, enum↔Moodle mapping | all |

There is **no ORM** — the backend uses raw parameterized SQL (`$1`) via `db.fetch_all/fetch_one` (`db.py:55-64`). Do not introduce an ORM (out of scope, high churn); Essa's "models" are the DDL + Pydantic shapes.

---

## 7. Frontend files to modify (DB-driven integration surfaces)

Essa coordinates additive changes to the shared surfaces that render the shapes the schema produces; Essa does **not** edit domain pages/components. As migrations stabilize real shapes, reconcile `api.js` so the `lib/*Api.js` "contract-path-first, then live-fallback" adapters (`groupsApi.js:16-101`, `progressApi.js:6-40`) can retire (inventory §6, gap #13).

| File | Responsibility | Driven by |
|---|---|---|
| `src/api.js` | Base client + mock toggle; merge each domain's new endpoint (additive); reconcile contract vs live paths | D-VIEW/D-CRIT/D-GRP-VIS |
| `src/errors.js` | `ApiError` extracting `detail`/`reason`/`reasons`/`blocking_reasons` (`errors.js:4-26`); new codes; retired `supa.py` 500s become deterministic `{reason}` | §15 error contract |
| `src/lib/catalog.js` | 30s read-only cache; include/exclude new read lists correctly | D-CRIT/D-GRP-VIS |
| `src/context/SelectedCourse.jsx` | Respect `deleted_at` policy (no soft-deleted course for current-state actions) | M15 |
| `src/pages/DashboardPage.jsx` | Aggregates all domains; update when `v_course_progress` columns change | M03 |
| `src/components/common/*` | CONFLICT-RISK shared components; coordination PR only; `CourseModeChip`/`ContextPath` may need props for `group_visibility`/recursive path | M05/M07 |
| `src/mocks/{core,seed,index}.js` | Retire as real endpoints land (unmatched routes fall through, `mocks/index.js:26`) | Phase 2/3 |

---

## 8. Database tables (Essa owns ALL DDL — the bulk)

**Existing 20 tables (schema.sql), unchanged in shape unless noted below:** `app_user`, `course`, `course_activity`, `context`, `role`, `capability`, `role_capability`, `role_assignment`, `cohort`, `cohort_member`, `enrolment_method`, `enrolment`, `course_group`, `group_member`, `grouping`, `grouping_group`, `course_completion`, `activity_completion`, `user_last_access`, `audit_log`.

**Tables/objects Essa CREATES:**
- `schema_migrations` (M01 — ledger).
- `course_completion_criteria`, `course_completion_aggr_methd`, `course_completion_crit_compl` (M04, D-CRIT) + enums `completion_aggregation`, `completion_crit_type`.
- `activity_availability` (M06, D-GRP-AVAIL) + enum `availability_display`.
- `permission_decision` (M11, D-PDEC — formalizing the runtime table).
- `completion_snapshot` (M14, D-SNAP — conditional, HC-05 option A).
- `course_category` (M15 — **only if** Team-2 ownership confirmed; otherwise not created).
- Enum `group_visibility` (M05, D-GRP-VIS).

**Tables Essa ALTERS:**
- `course_group` — add `visibility` column (M05).
- `activity_completion` — FK `activity_id` RESTRICT → CASCADE (M15).
- `enrolment_method` — add partial unique index `uq_guest_method_per_course` (M08).
- `audit_log` — add `idx_audit_course/actor/event` (M10).
- `course_completion` — write-once trigger (M13).
- `enrolment`/`enrolment_method` — optional expiry column/index (M16, conditional).

**Views/functions/triggers Essa OWNS:**
- Rewrite `v_course_progress` (M03). Preserve `v_enrolment_detail` (incl. the NULL-guarded `(time_end is null or time_end > now())` liveness — do not simplify) and `v_course_participant`.
- Extend `trg_context_path` with descendant recompute (M07).
- Add `trg_completion_immutable` (M13).
- **Drop** `fn_can` (M12, D-FNCAN).

Every new table gets `enable row level security` (locked-shut default, schema.sql:538-557).

---

## 9. Database tables (READ ONLY — inverts for the DB owner)

Essa owns **all DDL**, so nothing is DDL-read-only. This section instead records the tables Essa's **own code** (projection/infra) only *reads* and must never write business rows into: `app_user`, `role`, `capability`, `role_capability`, `role_assignment`, `cohort`, `cohort_member`, `enrolment_method`, `enrolment`, `course_group`, `group_member`, `grouping`, `grouping_group`, `course_completion`, `activity_completion`, `user_last_access`, `context`. Essa's code **writes** only `course`/`course_activity` (Team-1 projection sync) and DDL/seed. Row ownership stays with each domain (`TEAM-OWNERSHIP-MATRIX.md:105-127`).

---

## 10. Database tables (NO ACCESS)

None at the DDL level (Essa owns all DDL). Two hard "do not write content" boundaries: **Team-1 course content** — `course`/`course_activity` are projections; sync `external_ref` facts only, never author content or delete Team-1 rows (schema.sql:21-24; 05-data-final-verdicts.md §DATA-013/014). **Dual-write tables** (`role_assignment`, `group_member`) — Essa's DDL supports both writers (owner + Yaman provenance `component='enrol_*'`, D-RA/D-GM) but Essa's own code writes neither.

---

## 11. API endpoints

Essa owns only the **projection + wiring**, not domain endpoints:
- `courses.py` — `GET /api/courses` (`include_deleted` flag), `GET /api/courses/{id}`, `GET /api/courses/{id}/activities` (`courses.py:18-48`). Enforce the `deleted_at` policy (M15). Additive projection columns (group_mode, grouping_id, completion_enabled, availability) coordinated with Mahmoud/Mahdi.
- `main.py` — `GET /api/health` (`:48-59`), `GET /api/stats` (`:62-70`); router wiring (`:74-80`). Merge point for Khaled's D-AUTH middleware (`main.py:33` stack).
- `routers/__init__.py` — custodian (currently empty).
- **Contract stability:** additive-only on shared surfaces; no renaming/moving shared symbols without broadcast (`MERGE-STRATEGY.md:25`). Never add an endpoint that trusts a client `actor_id` (auth is Khaled's D-AUTH).

---

## 12. Services

Essa owns only the **infra service surface**, not domain services:
- `app/services/__init__.py` (custodian).
- **Data-layer decision (retire `supa.py`):** `supa.py` is used by exactly one router (`progress.py`, inventory §2) and runs with the RLS-bypassing `service_role` key (the same key in T2-SEC-001); it has no transactions and turns every error into a generic 500 via unhandled `raise_for_status()` (`supa.py:44,54,63`). **Consolidate on the asyncpg pool (`db.py`)**: kills the split-brain (gap #1), shrinks the credential blast radius, gives progress writes real transactions and the deterministic `{ok:false,reason}` contract. Delivered as a co-reviewed PR swapping `progress.py`'s three call sites onto `db.py` — Essa authors the data-access swap, Mahdi keeps his logic.
- Essa does **not** write `services/enrolment.py`, `permissions.py`, `groups.py`, `progress.py`, or `auth.py`.

---

## 13. Controllers

Essa's controllers (routers) are the shared/projection ones only:
- `app/routers/courses.py` — Team-1 course/activity projection reads (sync-only).
- `main.py` — app entrypoint, lifespan (`db.connect/disconnect`), CORS, health/stats, router registration, global exception handler (§15), D-AUTH merge.
- `app/routers/__init__.py` — registration custodian.
Domain controllers (`enrolment.py`, `roles.py`, `permissions.py`, `groups.py`, `progress.py`, `users.py`) are out of scope (§3).

---

## 14. Repositories

The data-access layer is Essa's real code custody:
- `app/db.py` — the asyncpg pool (`connect/disconnect/connected/pool/fetch_all/fetch_one`, `db.py:22-64`). Session pooler port 5432, `statement_cache_size=0`. Keep the clean 503 when `DATABASE_URL` unset (`db.py:43-52`). This becomes the **single** data layer.
- `app/supa.py` — the PostgREST/service-role layer (`select/upsert/update`). **Retire and remove** once `progress.py` no longer imports it; drop `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` from config.
- No ORM/repository framework is introduced — raw parameterized SQL remains the pattern (§6).

---

## 15. Validation rules (→ database constraints)

Essa expresses invariants as **DB constraints**, not app checks, matching the schema's endorsed pattern (DATA-005 kills Moodle's dup-assignment race):

| Invariant | Constraint | Status |
|---|---|---|
| One enrolment per (method,user) | `enrolment` UNIQUE (schema.sql:277) | keep |
| One role-assignment per (user,role,ctx,component,item) | `role_assignment` UNIQUE (:206) | keep (superior) |
| One capability/override per (role,ctx,capability) | `role_capability` UNIQUE (:184) | keep |
| One context per (level,instance) | `context` UNIQUE (:117) | keep |
| One completion per (user,activity)/(user,course) | UNIQUEs (:369,:350) | keep |
| Cohort method requires cohort_id | CHECK (:252) | keep |
| Enrolment liveness incl. NULL-guarded window | `v_enrolment_detail.live` (:420-425) | keep — do NOT simplify (C2 resolved) |
| **Guest one-per-course** | partial UNIQUE index | **add — D-GUEST (M08)** |
| **One crit-compl per (user,course,criteria)** | UNIQUE | **add — D-CRIT (M04)** |
| **One aggregation method per (course,criteria_type)** | UNIQUE | **add — D-CRIT (M04)** |
| **Availability targets exactly one of group/grouping** | CHECK | **add — D-GRP-AVAIL (M06)** |
| **Progress clamp [0,100] / single tracked set** | `v_course_progress` | **add — D-VIEW (M03)** |
| **Write-once `time_completed`** | trigger | **add — D-IMMUT (M13)** |

**Error contract:** retiring `supa.py` removes the unhandled-500 path; add a **global exception handler** in `main.py` mapping unique-violation → 409, FK-violation → 409/400, check-violation → 400, so uncaught asyncpg errors (incl. the `sort_order` unique race) return shaped `{reason}` not bare 500 (inventory §4).

---

## 16. Business rules (→ database invariants)

Moodle-truth semantics the schema must encode/preserve:
1. **Enrolment ≠ role** — separate facts; provenance (`component`/`item_id`) scopes removals (schema.sql:189-208; HC-01).
2. **Completion survives, participation is removed** — no cascade from enrolment (schema.sql:337-341; HIS-002); M04's tables follow suit.
3. **Suspension retains everything, removes access** — flag flip, no deletes (HIS-003); D-SEED removes `course:view` from students so the door stays shut.
4. **Audit outlives deletion** — no FKs on `audit_log` (schema.sql:389; DATA-016/HIS-011).
5. **Context path is derived, cannot drift** — trigger; recompute descendants on move (D-CTX).
6. **`course:view` = manager-only inspector view**, not the enrolment door (T2-RBAC-003).
7. **`accessallgroups` = editingteacher/manager only** (T2-RBAC-004).
8. **Progress = completed-tracked / total-tracked over one set, gated on active enrolment** (T2-PRG-001/005).
9. **`time_completed` is write-once**, forward-only history (T2-PRG-002).
10. **Soft-deleted courses stay reportable but not enrollable/rosterable** (T2-DATA-004).
11. **Guest single-instance; other methods multi-instance** (D-GUEST; DATA-002).
12. **One canonical permission resolver** — Python resolver is authoritative; retire `fn_can` (D-FNCAN).

---

## 17. Edge cases

- **NULL end-date liveness** (`time_end IS NULL` = open-ended): the `(time_end is null or time_end > now())` guard must remain in `v_enrolment_detail` and any progress gate (C2 resolved — regressing it is a severe liveness bug).
- **Numerator > denominator**: eliminated by computing both over one tracked set + clamp (M03).
- **Soft-deleted-after-completion activity**: excluded from both view sides (M03); course soft-delete keeps progress (HC-05).
- **Denominator = 0** (no tracked activities): `NULLIF` → NULL/0, never divide-by-zero (M03).
- **Concurrent guest-method create / crit-compl upsert**: DB uniques (M08/M04) make them safe.
- **Reparent of a deep subtree**: descendant recompute via path-prefix rewrite (M07).
- **Module hard-delete with completion rows**: FK RESTRICT blocks it today → CASCADE or soft-delete filter (M15).
- **Re-POST complete / DELETE un-complete**: write-once trigger blocks silent history rewrite (M13).
- **`sort_order` unique race** on role create: loser 500s today → global handler → 409 (§15).
- **App boots without DB**: `db.pool()` 503 with clear reason preserved (`db.py:43-52`).

---

## 18. Hard cases (DB substrate role)

- **HC-01 (manual + cohort):** provenance `component`/`item_id` on `role_assignment`/`group_member` lets one sync's removal touch only its own rows — DDL already supports (schema.sql:202-206, 304-307); Essa preserves it.
- **HC-02 (dropout/re-enrol):** non-cascading `course_completion`/`crit_compl` (survive unenrol) + re-enrol resurfaces via the enrolment-gated view (M03). Audit trail via D-AUDIT.
- **HC-03 (TA groups):** D-SEED (`accessallgroups` scoping) + D-CAPNAME (name consistency) + D-GRP-VIS make the TA correctly group-scoped.
- **HC-04 (two groups):** a user in two groups of one course is already supported (`group_member` composite PK, no anti-constraint); D-GRP-VIS refines visibility.
- **HC-05 (three-year progress):** current-state cross-course incl. soft-deleted courses works from live tables (exceeds Moodle); the real time-series needs D-SNAP option A or honest current-state scoping (option B) — §29 decision.

---

## 19. Acceptance criteria

| Dep | Acceptance |
|---|---|
| D-SEC | Secret-scan CI green; no secret literals; app boots from env/secret-store; keys rotated; `.env` gitignored. |
| D-VIEW | `v_course_progress` never >100; fail excluded; hidden/deleted excluded both sides; unenrolled gated; re-enrol resurfaces. |
| D-CRIT | criteria/aggr/crit-compl tables with correct UNIQUEs + non-cascading survival FKs; Mahdi aggregates ALL/ANY server-side. |
| D-GRP-VIS | enum + `course_group.visibility`; existing rows default `all`; MEMBERS/OWN/NONE + `participation` expressible. |
| D-GRP-AVAIL | availability table restricts activity to group/grouping with hidden/greyed; CHECK enforces one target. |
| D-CTX | reparent → all descendant `path`/`depth` recomputed; inheritance correct. |
| D-GUEST | concurrent guest-method create → at most one row. |
| D-SEED/D-CAPNAME | `course:view` manager-only; `accessallgroups` editingteacher/manager; capability name identical across DB/`permissions.py`/`groups.py`; single reconciled seed. |
| D-AUDIT | schema confirmed adequate; supplemental indexes; each mutation → one row (once domains write). |
| D-PDEC | `permission_decision` in schema + migration + indexes; Decision Log reads it. |
| D-FNCAN | `fn_can` dropped; Python resolver canonical; no caller breaks. |
| D-IMMUT | second POST does not change `time_completed`; illegal update raises. |
| D-SNAP | (Option A) `/api/progress/snapshots` returns real persisted data; (Option B) 404 + documented current-state scope. |
| T2-DATA-004 | soft-deleted course absent from enrol/roster, present in historical progress; module hard-delete clears completion without FK block; category decision documented. |
| Infra | `supa.py` retired; single asyncpg layer; global exception handler; RLS on all new tables. |

---

## 20. Required tests

- **Migrations:** each applies cleanly forward on fresh baseline and on a baselined DB; `schema_migrations` records it; re-apply is a no-op.
- **D-VIEW:** seed a course with a hidden and a soft-deleted-after-completion activity → `v_course_progress` ≤100, not falsely complete; unenrolled → empty; re-enrol → resurfaces (feeds `test_progress.py` — Mahdi's file, Essa's seed fixtures).
- **Constraints:** concurrent guest-create → one row (D-GUEST); concurrent crit-compl upsert → one row (D-CRIT); write-once trigger rejects `time_completed` change (D-IMMUT).
- **D-CTX:** move a subtree → every descendant `path`/`depth` updated.
- **D-SEED:** suspended student → door denied; manager → allowed without enrolment; non-editing teacher under separate groups → own group only.
- **D-FNCAN:** grep confirms no caller; drop leaves the Python resolver green.
- **Hermeticity:** migration + seed stand up an ephemeral seeded DB with rotated creds so `test_enrolment.py`/hard-case scripts run in CI without the committed `.env` (D-SEC precondition, `MERGE-STRATEGY.md:38`).
- **Secret-scan** green on every diff.

---

## 21. Regression tests

- **Preserve endorsed superiorities:** real FKs; `course_completion`/`activity_completion` non-cascade from enrolment (survive-unenrol); `audit_log` no-FK; NULL-guarded liveness in `v_enrolment_detail`; trigger-derived non-drifting `context.path`. A regression suite asserts these still hold after every migration.
- **`v_enrolment_detail`/`v_course_participant`** shapes unchanged by the `v_course_progress` rewrite.
- **Re-enrol reattachment (PRG-031):** completion resurfaces after re-enrol — must not break when adding the enrolment gate (M03).
- **Existing hermetic suites** (`test_permissions.py`, `test_groups.py`, `test_api_smoke.py`) stay green; `test_check_integration.py` unaffected by the `fn_can` drop (it tests the Python resolver).
- **`courses.py` projection**: `include_deleted` behaviour preserved after the `deleted_at` policy (M15).

---

## 22. Integration points

What other engineers consume from Essa (and what Essa consumes):
- **Mahdi** consumes D-VIEW (view columns), D-CRIT (criteria tables), D-IMMUT (trigger), D-SNAP (option A); provides the exact `progress.py` shape and reviews the `supa.py` swap.
- **Mahmoud** consumes D-GRP-VIS (enum/column), D-GRP-AVAIL (tables), D-CAPNAME (seed name); provides scope semantics for `participation`/`visibility`.
- **Khaled** consumes D-SEED (seed corrections), D-CAPNAME (canonical name), D-CTX (recursive path), D-PDEC (formalized table), D-FNCAN (drop coordination); provides the canonical capability constant and confirms no `fn_can` caller. Essa **merges** Khaled's D-AUTH middleware into `main.py`.
- **Yaman** consumes D-GUEST (unique index), D-EXPIRY-DDL (conditional); Essa's DDL supports the D-RA/D-GM provenance dual-writes without arbitrating them.
- **Shared surfaces:** `api.js`/`errors.js`/`common/*` additive coordination PRs from all domains, applied by Essa (`MERGE-STRATEGY.md:19-25`).

---

## 23. Dependencies (D-* IDs)

**Essa provides (delivers as migrations):** D-SEC (M00), D-VIEW (M03), D-CRIT (M04), D-GRP-VIS (M05), D-GRP-AVAIL (M06), D-CTX (M07), D-GUEST (M08), D-SEED + D-CAPNAME-seed (M09), D-AUDIT (M10), D-PDEC (M11), D-FNCAN (M12), D-IMMUT (M13), D-SNAP (M14, conditional), D-EXPIRY-DDL (M16, conditional); plus T2-DATA-004 deletion semantics (M15). Each PR reviewed by the requesting engineer (`MERGE-STRATEGY.md:12`).

**Essa consumes / coordinates:** D-AUTH + D-ENFORCE (from Khaled — Essa merges the middleware only); D-CAPNAME code-side canonical string (from Khaled+Mahmoud); Mahdi's view-shape and `supa.py`-swap review; Mahmoud's scope semantics; Yaman's expiry-need confirmation.

**Blocking map** (`TEAM-DEPENDENCIES.md:47-63`): D-SEC first, standalone. D-VIEW blocks Mahdi; D-CRIT blocks Mahdi's criteria; D-GRP-VIS/AVAIL block Mahmoud; D-SEED blocks Khaled's HC-03/suspension; D-CAPNAME(seed) blocks Mahmoud's D-GRP-ARITY. D-CTX/D-GUEST/D-EXPIRY-DDL/D-IMMUT/D-PDEC/D-FNCAN non-blocking hardening. D-SNAP blocking only if HC-05 Option A chosen.

---

## 24. Merge order

Per `MERGE-STRATEGY.md §Merge order`:
1. `t2/essa/D-SEC` (M00) — first, standalone; rotate before anything.
2. `t2/essa/migrations-baseline` (M01/M02) — workflow + ledger.
3. `t2/essa/migrations-<D-ID>` — one PR per migration (M03…M16), forward-only, reviewed by the requester, merged to `team2/parity-fixes`.
4. Merge Khaled's `t2/khaled/D-AUTH` middleware into `main.py`.
5. `t2/essa/supa-retire` — the `progress.py` data-access swap, co-reviewed with Mahdi.
6. Shared-surface coordination PRs (`api.js`/`errors.js`/`common/*`).
7. Integration/hard-case/runtime PRs last.

CI gates every merge: pytest green (incl. `test_progress.py`), hermetic suites (no external creds — D-SEC precondition), secret-scan, authz 401/403 gate once D-AUTH/D-ENFORCE land. A domain PR consuming a dependency cannot merge before the providing migration PR (`MERGE-STRATEGY.md:17`).

---

## 25. Git strategy

- Long-lived integration branch `team2/parity-fixes`; feature branches `t2/essa/<dep>` (e.g. `t2/essa/D-VIEW-progress-view`). No commits to another's branch; no direct commits to `main` (`MERGE-STRATEGY.md:6-9`).
- **Migration discipline:** forward-only, timestamped/sequenced, one concern each, dependency ID + issue in the header; **never edit a merged migration — add a new one**; seed changes are migrations too and reconcile `seed.sql` ↔ `fixtures.sql` (`MERGE-STRATEGY.md:31-35`).
- View/function/trigger changes (`v_course_progress`, `trg_context_path`, `fn_can`) are Essa migrations reviewed by the domain owner.
- No secret literals in any diff (permanent secret-scan gate after D-SEC).

---

## 26. Implementation checklist

- [ ] M00 D-SEC: rotate keys, remove `.env`, gitignore, secret-store, secret-scan gate, fix docstring.
- [ ] M01/M02: `migrations/` dir + `schema_migrations` ledger + baseline schema/seed.
- [ ] M03 D-VIEW: rewrite `v_course_progress` (single set, clamp, exclude fail, enrolment gate); confirm columns with Mahdi.
- [ ] M04 D-CRIT: criteria/aggr/crit-compl tables + enums + RLS.
- [ ] M05 D-GRP-VIS: `group_visibility` enum + `course_group.visibility`.
- [ ] M06 D-GRP-AVAIL: `activity_availability` + enum + CHECK + index + RLS.
- [ ] M07 D-CTX: descendant recompute trigger.
- [ ] M08 D-GUEST: partial unique index.
- [ ] M09 D-SEED/D-CAPNAME: `course:view` manager-only; drop plain-teacher `accessallgroups`; canonical name; reconcile seeds.
- [ ] M10 D-AUDIT: audit_log indexes; document retention; optional `audit()` helper.
- [ ] M11 D-PDEC: formalize `permission_decision` + indexes + RLS.
- [ ] M12 D-FNCAN: confirm no caller (with Khaled) → drop `fn_can`.
- [ ] M13 D-IMMUT: write-once `time_completed` trigger.
- [ ] M14 D-SNAP: only if HC-05 Option A chosen → `completion_snapshot`.
- [ ] M15 T2-DATA-004: `deleted_at` policy; `activity_completion` FK CASCADE; category decision.
- [ ] M16 D-EXPIRY-DDL: only if Yaman files the need.
- [ ] Infra: retire `supa.py`; global exception handler; RLS on every new table; regenerate `schema.sql` + `DB_SCHEMA.md`.

---

## 27. Estimated complexity

| Unit | Complexity | Why |
|---|---|---|
| M00 D-SEC | Medium | Ops + coordination + CI gate; rotation is external |
| M01/M02 baseline | Low | Verbatim + tiny ledger |
| M03 D-VIEW | **High** | Correctness-critical SQL; enrolment gate; performance restructure; cross-review with Mahdi |
| M04 D-CRIT | Medium-High | New subsystem substrate; survival-FK nuance |
| M05 D-GRP-VIS | Low | Enum + column |
| M06 D-GRP-AVAIL | Medium | New tables + CHECK + enforcement contract |
| M07 D-CTX | Medium | Recursive path rewrite; correctness under move |
| M08 D-GUEST | Low | One partial index |
| M09 D-SEED/D-CAPNAME | Medium | Cross-layer name reconciliation; seed merge; runtime-confirm deployed seed |
| M10 D-AUDIT | Low | Indexes + doc |
| M11 D-PDEC | Low-Medium | Formalize + indexes |
| M12 D-FNCAN | Low | Drop after caller-check |
| M13 D-IMMUT | Low | One trigger |
| M14 D-SNAP | Medium | Conditional; new ledger + capture contract |
| M15 T2-DATA-004 | Medium-High | FK change risk; policy across routers; category ambiguity |
| M16 D-EXPIRY-DDL | Low | Conditional |
| Infra (supa retire + handler) | Medium | Cross-router swap + error mapping |

---

## 28. Estimated duration

Rough, assuming Essa full-time and reviewers responsive (calendar days):
- Phase 0 (M00–M02): ~1–2 days.
- Phase 1 batch (M03–M09): ~6–9 days; **M03 is the long pole (~2–3 days)**, M04 ~1.5, others ~0.5 each. Parallelizable with Khaled's auth.
- Hardening (M10–M13, M15): ~3–4 days; M15 FK change staged carefully.
- Conditionals (M14 D-SNAP if Option A, M16 D-EXPIRY-DDL): +1–2 days each if selected.
- Infra (`supa.py` retire + global handler): ~1–2 days, co-reviewed with Mahdi.
- Total core path ~12–17 days; +2–4 if both conditionals are chosen. Runtime confirmations (§27 of RUNTIME-VALIDATION-PLAN) add time gated on a sanctioned DB.

---

## 29. Risk assessment

| Risk | Mitigation | Residual |
|---|---|---|
| Rotating creds breaks local envs | `.env.example` + secret-store docs; broadcast on merge | Low |
| D-VIEW column change breaks Mahdi's router | Confirm columns before M03; ship `enrolled` boolean for gated + admin paths | Low |
| D-CAPNAME string churns three layers | Essa owns seed only; defer string to D-CAPNAME; recommend unprefixed | Low |
| M15 FK RESTRICT→CASCADE deletes completion unexpectedly | Prefer soft-delete + filter; stage last; compensating migration restores RESTRICT | Medium |
| `supa.py` retirement regresses progress writes | Co-review swap with Mahdi; keep deterministic errors; handler first | Low |
| `fn_can` drop breaks a hidden caller | Grep + Khaled confirmation before M12 | Low |
| New tables missing RLS → PostgREST exposure | `enable row level security` in every new-table migration | Low |
| Migration workflow introduced mid-flight | Baseline (M01/M02) = current schema verbatim; forward-only after | Low |
| `schemas.py` shared-file conflicts | Drive domain-file split; Essa reviews all edits until split | Medium |

**INSUFFICIENT EVIDENCE / open decisions (must resolve before the affected unit closes):**
1. **Category/module ownership (T2-DATA-004/HIS-008):** may be Team-1; no product doc. Do **not** invent `course_category` until confirmed; ship the `deleted_at` policy + never-delete-Team-1-data regardless.
2. **Auto-completion scope (T2-PRG-003):** whether criteria/aggregation are intentionally out-of-scope is undocumented. D-CRIT substrate lands anyway; record the decision.
3. **HC-05 Option A vs B (D-SNAP):** real ledger vs honest current-state scope. Recommend Option B unless the team wants the time-series; M14 ships only if Option A.
4. **D-CAPNAME canonical string:** prefixed vs unprefixed — cross-team decision (recommend unprefixed).
5. **D-VIEW enrolment-gate shape:** `enrolled` boolean vs inner-join drop — needs Mahdi (admin reports may want retained rows).
6. **D-EXPIRY-DDL necessity:** conditional on Yaman.
7. **Deployed seed vs `seed.sql` (T2-RBAC-003/004):** confirm at runtime (RUNTIME-VALIDATION-PLAN P1-2) before D-SEED closes — run M09 against the confirmed deployed seed, not just the file.

---

## 30. Definition of Done

- All non-conditional migrations (M00–M13, M15) merged to `team2/parity-fixes`, forward-only, each reviewed by its requesting engineer, each with dependency ID + issue in its header; `schema_migrations` reflects them.
- Credentials rotated + removed; secret-scan gate permanent; app boots from env/secret-store; contradicting docstring fixed.
- `v_course_progress` never exceeds 100, excludes fail, gates on active enrolment, resurfaces on re-enrol; Mahdi's progress work unblocked.
- Criteria/aggregation/crit-compl, group visibility, activity availability substrates delivered and consumed by Mahdi/Mahmoud.
- Seed corrected (`course:view` manager-only; `accessallgroups` editingteacher/manager), capability name canonical across all three layers, one reconciled seed; Khaled's HC-03/suspension verdicts unblocked.
- `audit_log` adequacy confirmed + indexed; `permission_decision` formalized; dead `fn_can` retired; write-once `time_completed` enforced.
- Single asyncpg data layer (`supa.py` retired); global exception handler shaping DB errors; RLS enabled on every new table; endorsed superiorities preserved (regression suite green).
- Deletion-semantics policy documented + enforced; `activity_completion` FK behaviour decided; category/module and HC-05-ledger decisions recorded (or their migrations shipped if chosen).
- All CI gates green; runtime confirmations (P1-2 deployed seed; P2-4 view; P3-10 guest race) recorded back into the issue files with adjusted confidence.
- `schema.sql` + `docs/findings/DB_SCHEMA.md` regenerated to match the merged migrations.

---

## Appendix — References & Citations

*(Citations are also woven inline throughout §1–§30; consolidated here for auditability. This appendix follows §30 and is not one of the 30 mandated sections.)*

**Backbone (obeyed exactly):** `team-work-packages/TEAM-OWNERSHIP-MATRIX.md`, `TEAM-DEPENDENCIES.md` (incl. D-SNAP/D-IMMUT/D-PDEC/D-FNCAN rows 29-32), `IMPLEMENTATION-ORDER.md`, `MERGE-STRATEGY.md`.

**Audit issues:** `issues/T2-SEC-001`, `T2-DATA-001`, `T2-DATA-003`, `T2-DATA-004`, `T2-PRG-001`, `T2-PRG-002`, `T2-PRG-003`, `T2-PRG-004`, `T2-PRG-005`, `T2-GRP-004`, `T2-GRP-005`, `T2-RBAC-002`, `T2-RBAC-003`, `T2-RBAC-004`, `T2-RBAC-005`, `T2-ENR-004`.

**Evidence:** `evidence/small-system/05-data-tests-inventory.md` (schema truth §1.1-1.4, split-brain data layer §2, `permission_decision`/`audit_log` §8, frontend integration §6, gap list §10); `evidence/moodle/05-data-events-retention.md` (DATA-001..018 / EVT-001..012 / HIS-001..012 / What-Survives matrix — incl. DATA-008 group visibility/participation, DATA-012 criteria tables, DATA-016 log store, HIS-002/006/007/008 deletion); `evidence/moodle/05-data-final-verdicts.md` (endorsed verdicts, three headline defects, superiorities, C1-C7); `FINAL-PARITY-REPORT.md`; `RUNTIME-VALIDATION-PLAN.md` (P1-2, P2-4, P3-10).

**Owned schema artifact:** `moodle-team2-people-enrolment/schema.sql` — tables 47-401, `context` trigger 122-137, views `v_enrolment_detail:409`/`v_course_participant:430`/`v_course_progress:442-457`, `fn_can:475-532`, RLS 538-557; `seed.sql` (roles/caps/system defaults 11-89; `course:view` grants :58,65,73,78,82; plain-teacher `accessallgroups` :74 + false-premise comment :49); `moodle-replica/backend/fixtures.sql` (demo personas; course-context `prevent` :86; separate `teacher-allgroups` role :26,35).

**Target infra (read-only, cited):** `moodle-replica/backend/app/db.py` (asyncpg pool :22-64), `app/supa.py` (PostgREST/service-role :15-23,44,54,63 — to retire), `main.py` (wiring/health/stats :48-80, middleware :33), `app/routers/courses.py` (Team-1 projection :18-48), `app/routers/__init__.py` (empty), `app/routers/progress.py` (:112-139 mutable/deletable completion), `app/services/permissions.py` (:156 cap constant, :314 gate-4, :390-401/689-708 `permission_decision`), `app/services/groups.py` (:192,201 prefixed cap), `backend/.env.example` (placeholders; T2-SEC-001 describes `.env` — secret values never reproduced).

**Moodle behaviour truth:** `/Users/yamanobiedat/Documents/GitHub/moodle` — `lib/db/install.xml` (DDL baselines), `enrollib.php`, `accesslib.php` (`access.php:393-401` accessallgroups, `:857-864` course:view; context path rebuild), `completionlib.php` (`get_course_progress_percentage`, `is_tracked_user`), `grouplib.php` (visibility constants), `moodlelib.php` (delete paths), `context.php` (cascade) — via the audit citations above.
