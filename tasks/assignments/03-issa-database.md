# Build Task 03 — Issa · Database Foundation (one-time bootstrap)

**Owner:** Issa · **Domain:** the PostgreSQL database + backend data layer — **as a one-time bootstrap**
**Branch:** work on a feature branch `feat/issa-database` cut from `staging`, PR back into `staging`.
**App location (staging branch):** `moodle-replica/`
**Source of truth for all domain facts:** `TEAM2-MASTER-REFERENCE.md` (esp. §6, §8, §10, §11, §14, §17).
**Target:** PostgreSQL 17 (Supabase).

> **Role update (per Yaman):** Issa's *ongoing* assignment is now the **frontend** — see [06-issa-frontend.md](06-issa-frontend.md). This database file remains his **first task**: do the bootstrap below once, merge it, and from that moment the schema is **frozen** (any later DDL change needs team agreement and goes through Issa). After the bootstrap PR merges, Issa moves to file 06 full-time and stops editing `backend/`.

> Per Yaman's instruction, this file intentionally contains **no system prompt**. Everything Issa needs is written out directly.

---

## 1. Mission

You build and own the **database itself** and the **data-access foundation** every other teammate depends on. Nobody else creates tables, changes columns, or touches the connection layer. Everybody else *uses* what you provide. You are the first blocker: **until §4 and §6 below are done, the other four cannot start writing real logic.** Do them first, in order.

You do **not** implement enrolment/roles/groups/progress business logic — that is Yaman/Khaled/Mahmoud/Mahdi. You give them tables, seeds, and a connection.

---

## 2. Exactly what exists today on `staging` (your starting point)

```
moodle-replica/
├── backend/
│   ├── main.py                 # FastAPI app, CORS for :5173/:5174, /api/health, includes 5 routers
│   ├── requirements.txt        # fastapi>=0.118, uvicorn[standard]>=0.34, pydantic>=2.11  ← YOU will extend this
│   └── app/
│       ├── schemas.py          # Pydantic stubs: User, Course, Role, Group, Enrolment
│       └── routers/            # users, courses, enrolment, roles, groups — ALL return in-memory _SAMPLE data
└── frontend/                   # React+Vite shell — YOUR ongoing area, but only AFTER this bootstrap PR (see file 06)
```

Repo root also has `schema.sql` — currently a **6-line placeholder**. You replace it with the real schema below.

**There is no database anywhere yet.** Every router serves hardcoded `_SAMPLE` lists. Your job is to make the database real so the others can replace those stubs.

---

## 3. The design rules (already decided — do not re-litigate)

The schema is **our own model, inspired by Moodle but not a copy**. The five global improvements (from the schema header, keep them consistently in every table you add):

1. **Real FOREIGN KEY constraints** — Moodle has none at DB level (verified: `DATABASE_SCHEMA.md` header; integrity lives in PHP).
2. **Enums instead of magic ints** — Moodle's `status=0` means active, `permission=-1000` means prohibit, `groupmode 0/1/2`.
3. **`timestamptz` instead of unix-epoch bigints** — Moodle's `user_enrolments.timeend` default `2147483647` is a literal Y2038 bug used as "no end date". We use `NULL`.
4. **Soft delete (`deleted_at`)** on user/course — history survives deletion (Hard Case #5).
5. **`jsonb config`** instead of Moodle's `customint1..8 / customchar1..3 / customtext1..4` spare columns.

Two deliberate deviations from Moodle, agreed team-wide (record them as annotations in schema.sql):

- **D-1. Provenance is always recorded.** Moodle writes manual enrolment's role assignments with `component=''` (because `enrol_manual.roles_protected()` returns false), which makes multi-path cleanup confusing (MASTER-REFERENCE §6.10, C-analysis). In our app **every** machine-created row carries `component='enrol_manual' | 'enrol_self' | 'enrol_cohort'` + `item_id=<enrolment_method.id>`; only a human acting in the roles UI writes `component=''`. This is an intentional simplification — annotate it.
- **D-2. `role_assignment` HAS a unique constraint** `(user_id, role_id, context_id, component, item_id)` — Moodle deliberately has **no** unique index there so duplicates per provenance are legal; our constraint encodes the same "one row per provenance" idea explicitly instead of implicitly.

**Isolation:** courses & activities are **owned by Team 1**. Our `course` and `course_activity` tables are thin projections synced over their API (`external_ref` = their id). We never write course *content*, only people/enrolment facts about it.

---

## 4. The complete schema — 24 tables, 10 enums

The first part of `schema.sql` is already written (Yaman's draft — the header + enums + 10 tables). **Keep it verbatim**, then complete the file with the remaining tables below. Final inventory, in dependency order:

| # | Table | Status | Written by (app code) | Read by |
|---|---|---|---|---|
| 1 | `app_user` | ✅ in draft | Issa (seed), Yaman (suspend flag) | everyone |
| 2 | `course` (projection) | ✅ in draft | Issa (sync only) | everyone |
| 3 | `course_activity` (projection) | ✅ in draft | Issa (sync), Mahmoud (`group_mode`,`grouping_id`), Mahdi (`completion_enabled`) | everyone |
| 4 | `context` (+ path trigger) | ✅ in draft | Issa (rows created on sync/bootstrap) | Khaled (resolver), all |
| 5 | `role` | ✅ in draft | Khaled | everyone |
| 6 | `capability` | ✅ in draft | Khaled (seed w/ Issa) | Khaled |
| 7 | `role_capability` | ✅ in draft | Khaled | Khaled |
| 8 | `role_assignment` | ✅ in draft | Khaled (manual, `component=''`), Yaman (enrol-provenance rows only) | Khaled, Yaman |
| 9 | `cohort` | ✅ in draft | Yaman | Yaman |
| 10 | `cohort_member` | ✅ in draft | Yaman | Yaman |
| 11 | `enrolment_method` | ⚠️ draft truncated — complete per §4.1 | Yaman | Yaman, all |
| 12 | `user_enrolment` | ➕ add (§4.2) | Yaman | everyone (the roster fact) |
| 13 | `course_group` | ➕ add (§4.3) | Mahmoud | Mahmoud, Khaled, Mahdi |
| 14 | `group_member` | ➕ add (§4.3) | Mahmoud (sole writer; others via his service) | Mahmoud, Khaled, Mahdi |
| 15 | `grouping` | ➕ add (§4.3) | Mahmoud | Mahmoud |
| 16 | `grouping_group` | ➕ add (§4.3) | Mahmoud | Mahmoud |
| 17 | `activity_completion` | ➕ add (§4.4) | Mahdi | Mahdi, all |
| 18 | `completion_criterion` | ➕ add (§4.4) | Mahdi | Mahdi |
| 19 | `criterion_completion` | ➕ add (§4.4) | Mahdi | Mahdi |
| 20 | `course_completion_settings` | ➕ add (§4.4) | Mahdi | Mahdi |
| 21 | `course_completion` | ➕ add (§4.4) | Mahdi | Mahdi, all |
| 22 | `progress_snapshot` | ➕ add (§4.5) | Mahdi (append-only) | Mahdi |
| 23 | `user_lastaccess` | ➕ add (§4.6) | Yaman | Yaman (self-enrol inactivity) |
| 24 | `permission_decision` | ➕ add (§4.7) | Khaled (append-only audit) | Khaled |

Enums (10): `context_level`, `role_archetype`, `enrol_method_kind`, `method_status`, `enrolment_status`, `cap_permission`, `group_mode`, `completion_state` — already in the draft — plus two new ones you add: `criterion_kind`, `aggregation_method`.

### 4.1 Complete `enrolment_method` (Moodle: `enrol`)

```sql
-- ---------------------------------------------------------------------------
-- enrolment_method  (Moodle: enrol)
-- WHY: an *instance* of a way into one course ("this course's self-enrolment,
-- with key X"). One course can hold several instances — even two of the same
-- kind (Moodle allows e.g. two self-enrol instances with different keys).
-- Only guest is limited to one per course, and in Moodle that limit lives in
-- PHP, not the schema — here it is a real partial unique index.
-- config jsonb replaces Moodle's customint1..8: for kind='self' the keys are
--   {"key": "...", "use_group_keys": bool, "max_enrolled": int,
--    "inactivity_days": int, "welcome_message": "..."}
-- for kind='cohort': {"sync_group_id": int}
-- ---------------------------------------------------------------------------
create table enrolment_method (
    id              bigint generated always as identity primary key,
    course_id       bigint not null references course(id) on delete cascade,
    kind            enrol_method_kind not null,
    status          method_status not null default 'enabled',
    default_role_id bigint not null references role(id),
    cohort_id       bigint references cohort(id),      -- kind='cohort' only
    config          jsonb not null default '{}'::jsonb,
    enrol_start     timestamptz,                        -- sign-up window (self)
    enrol_end       timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    check (kind <> 'cohort' or cohort_id is not null)
);
create unique index uq_guest_method_per_course
    on enrolment_method(course_id) where kind = 'guest';
create index idx_method_course on enrolment_method(course_id);
```

### 4.2 `user_enrolment` (Moodle: `user_enrolments`)

```sql
-- ---------------------------------------------------------------------------
-- user_enrolment  (Moodle: user_enrolments)
-- WHY: THE membership fact. One row per (method, user) — NOT per (course,
-- user): a person enrolled by two methods has two rows (Hard Case #1).
-- "Active" is a 4-condition question, never just status:
--   status='active' AND method.status='enabled'
--   AND (time_start IS NULL OR time_start <= now())
--   AND (time_end   IS NULL OR time_end   >  now())
-- time_end NULL = forever (Moodle used the Y2038 sentinel 2147483647).
-- ---------------------------------------------------------------------------
create table user_enrolment (
    id          bigint generated always as identity primary key,
    method_id   bigint not null references enrolment_method(id) on delete cascade,
    user_id     bigint not null references app_user(id) on delete cascade,
    status      enrolment_status not null default 'active',
    time_start  timestamptz,
    time_end    timestamptz,
    created_by  bigint references app_user(id),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (method_id, user_id)
);
create index idx_ue_user on user_enrolment(user_id);
```

### 4.3 Groups cluster (Moodle: `groups`, `groups_members`, `groupings`, `groupings_groups`)

```sql
-- ---------------------------------------------------------------------------
-- course_group / group_member / grouping / grouping_group
-- WHY: groups partition ENROLLED people inside one course; they grant no
-- permissions (visibility/scope only). A grouping contains GROUPS, never
-- users — grouping_group deliberately has no user_id column; that absence is
-- the structural proof (MASTER-REFERENCE §10.1, rule GRP-002).
-- group_member carries provenance like role_assignment: component='' means a
-- human added the member; 'enrol_cohort' means the sync owns the row and
-- removes it with its path (rule about self-enrol group keys: per D-1 we
-- record component='enrol_self' — an improvement over Moodle, which leaves
-- those rows unowned and never cleans them).
-- ---------------------------------------------------------------------------
create table course_group (
    id            bigint generated always as identity primary key,
    course_id     bigint not null references course(id) on delete cascade,
    name          varchar(254) not null,
    id_number     varchar(100),
    description   text not null default '',
    enrolment_key varchar(50),              -- self-enrol group key
    visibility    smallint not null default 0
                  check (visibility between 0 and 3),  -- 0 all,1 members,2 own,3 none (GROUPS_VISIBILITY_*)
    participation boolean not null default true,
    created_at    timestamptz not null default now(),
    unique (course_id, name)
);

create table group_member (
    group_id   bigint not null references course_group(id) on delete cascade,
    user_id    bigint not null references app_user(id) on delete cascade,
    component  varchar(100) not null default '',
    item_id    bigint not null default 0,
    added_at   timestamptz not null default now(),
    primary key (group_id, user_id)          -- Moodle: UNIQUE (userid, groupid)
);
create index idx_gm_user on group_member(user_id);

create table grouping (
    id          bigint generated always as identity primary key,
    course_id   bigint not null references course(id) on delete cascade,
    name        varchar(255) not null,
    description text not null default '',
    unique (course_id, name)
);

create table grouping_group (
    grouping_id bigint not null references grouping(id) on delete cascade,
    group_id    bigint not null references course_group(id) on delete cascade,
    added_at    timestamptz not null default now(),
    primary key (grouping_id, group_id)      -- NO user_id. Ever.
);

-- close the forward reference left open in the draft:
alter table course_activity
    add constraint fk_activity_grouping
    foreign key (grouping_id) references grouping(id);
```

### 4.4 Completion cluster (Moodle: `course_modules_completion`, `course_completion_criteria`, `course_completion_crit_compl`, `course_completion_aggr_methd`, `course_completions`)

```sql
create type criterion_kind     as enum ('self','activity','grade','duration','date','role','course');
create type aggregation_method as enum ('all','any');

-- ---------------------------------------------------------------------------
-- activity_completion  (Moodle: course_modules_completion + course_modules_viewed)
-- WHY: per-user per-activity state machine, NOT a log. Absent row = incomplete.
-- overridden_by <> NULL locks the state against automatic downgrade
-- (MASTER-REFERENCE §11.4). viewed_at folds Moodle's separate
-- course_modules_viewed table back in (annotate: 5.3 split it out).
-- ---------------------------------------------------------------------------
create table activity_completion (
    id            bigint generated always as identity primary key,
    activity_id   bigint not null references course_activity(id) on delete cascade,
    user_id       bigint not null references app_user(id) on delete cascade,
    state         completion_state not null default 'incomplete',
    viewed_at     timestamptz,
    overridden_by bigint references app_user(id),
    updated_at    timestamptz not null default now(),
    unique (user_id, activity_id)
);

-- what a course requires in order to be "Complete"
create table completion_criterion (
    id          bigint generated always as identity primary key,
    course_id   bigint not null references course(id) on delete cascade,
    kind        criterion_kind not null,
    activity_id bigint references course_activity(id),   -- kind='activity' only
    config      jsonb not null default '{}'::jsonb,      -- grade threshold, date, days...
    check (kind <> 'activity' or activity_id is not null)
);

-- per-user satisfaction of one criterion (Moodle: course_completion_crit_compl)
create table criterion_completion (
    id            bigint generated always as identity primary key,
    criterion_id  bigint not null references completion_criterion(id) on delete cascade,
    user_id       bigint not null references app_user(id) on delete cascade,
    completed_at  timestamptz,
    grade_final   numeric(10,5),
    unique (criterion_id, user_id)
);

-- ALL vs ANY, one row per course (Moodle: course_completion_aggr_methd)
create table course_completion_settings (
    course_id   bigint primary key references course(id) on delete cascade,
    aggregation aggregation_method not null default 'all'
);

-- the per-user aggregate verdict (Moodle: course_completions)
-- WHY: separate from the % — a course can be 66% and not Complete, or
-- Complete at 0 activities (self-completion). time_completed never changes
-- once set (Moodle's mark_complete() returns early if already set).
create table course_completion (
    id             bigint generated always as identity primary key,
    course_id      bigint not null references course(id) on delete cascade,
    user_id        bigint not null references app_user(id) on delete cascade,
    time_enrolled  timestamptz,
    time_started   timestamptz,
    time_completed timestamptz,
    reaggregate    boolean not null default false,
    unique (course_id, user_id)
);
```

### 4.5 `progress_snapshot` — the Hard-Case-#5 table (no Moodle equivalent)

```sql
-- ---------------------------------------------------------------------------
-- progress_snapshot — append-only. THE answer to "3 years of progress across
-- deleted courses". course_id has deliberately NO FK and names are
-- denormalized: the row must survive the course's deletion (a FK to a live
-- course is exactly what makes Moodle's history unreconstructable).
-- Written on: completion events, scheduled sweeps, and ALWAYS pre-deletion.
-- Never UPDATE or DELETE rows here.
-- ---------------------------------------------------------------------------
create table progress_snapshot (
    id            bigint generated always as identity primary key,
    user_id       bigint not null references app_user(id),
    course_id     bigint not null,            -- NO FK, on purpose
    course_name   text not null,
    activity_id   bigint,                     -- NO FK, on purpose
    activity_name text,
    state         text not null,
    percent       numeric(5,2),
    reason        varchar(20) not null check (reason in ('event','scheduled','pre_delete')),
    taken_at      timestamptz not null default now()
);
create index idx_snapshot_lookup on progress_snapshot(user_id, course_id, taken_at);
```

### 4.6 `user_lastaccess` (Moodle: `user_lastaccess`)

```sql
create table user_lastaccess (
    user_id     bigint not null references app_user(id) on delete cascade,
    course_id   bigint not null references course(id) on delete cascade,
    accessed_at timestamptz not null default now(),
    primary key (user_id, course_id)
);
```

### 4.7 `permission_decision` — audit of the "why" engine (no Moodle equivalent)

```sql
create table permission_decision (
    id         bigint generated always as identity primary key,
    actor_id   bigint not null references app_user(id),
    capability varchar(255) not null,
    context_id bigint not null references context(id),
    target_id  bigint references app_user(id),
    allowed    boolean not null,
    reasons    jsonb not null,                -- the full evidence array
    decided_at timestamptz not null default now()
);
```

**What we deliberately do NOT build** (annotate at the bottom of schema.sql, from MASTER-REFERENCE §17.2 accepted mismatches): no `role_allow_assign/override/switch/view` matrices (assigner rules are hardcoded in Khaled's service), no block/user-profile contexts beyond the enum value, no multi-host (`mnethostid`), no sessions table (stateless API), meta/database/ldap/paid enrolment kinds excluded from the enum on purpose.

---

## 5. Supabase setup — step by step

1. Create the Supabase project (region: closest to Amman). Save the connection string.
2. Run the completed `schema.sql` in the Supabase SQL editor **in one transaction**. Order matters: enums → tables 1–10 (draft) → §4.1 → §4.2 → §4.3 → §4.4 → §4.5–4.7. The `course_activity.grouping_id` FK is added *after* `grouping` exists (already handled in §4.3).
3. Disable Row Level Security for the hackathon (`alter table ... disable row level security` is the default for new tables via SQL editor; just don't enable it) — auth is out of scope.
4. Put the connection string in `moodle-replica/backend/.env` as `DATABASE_URL=postgresql+psycopg://...`. **Add `.env` to `moodle-replica/backend/.gitignore`. Never commit credentials** (repo rule since db.sh).
5. Commit `schema.sql` (repo root — replace the 6-line stub) and a `moodle-replica/backend/.env.example` with a placeholder URL.

---

## 6. Backend foundation code you write

### 6.1 `backend/requirements.txt` — append (do not remove existing lines)

```
sqlalchemy>=2.0
psycopg[binary]>=3.2
python-dotenv>=1.0
```

### 6.2 `backend/app/db.py` — new file, the only connection layer

```python
"""Database foundation. Owner: Issa. Everyone imports from here; nobody else edits."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

load_dotenv()

engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)

def get_db():
    """FastAPI dependency: yields a Session, always closes."""
    with Session(engine) as session:
        yield session
        session.commit()
```

Domain owners write parameterized SQL through this session (`db.execute(text("select ... where id=:id"), {"id": x})`). No ORM models — SQL-first keeps everyone honest with the schema.

### 6.3 `backend/app/services/__init__.py` — create the empty package

Each owner adds their own module later (`enrolment.py` Yaman, `permissions.py` Khaled, `groups.py` Mahmoud, `progress.py` Mahdi, `sync.py` you). You create only `__init__.py` and `sync.py`.

### 6.4 `backend/app/services/sync.py` — Team 1 projection sync (yours)

Functions (stub bodies acceptable Day 1, but the **context creation must be real**):

- `upsert_course(external_ref, short_name, full_name, visible, start, end)` → insert/update `course` **and** create its `context` row (`level='course'`, `instance_id=course.id`, `parent_id=<the system context>`).
- `upsert_activity(course_external_ref, external_ref, name, activity_type, visible)` → insert/update `course_activity` + its `context` (`level='activity'`, parent = the course's context).
- `soft_delete_course(external_ref)` → **first call Mahdi's `progress.snapshot_course(course_id, reason='pre_delete')`**, then set `deleted_at`. This ordering is the deletion contract (MASTER-REFERENCE §18.1) — deleting before snapshotting is the one unforgivable bug.
- Bootstrap on first run: one `context` row `level='system', instance_id=0, parent_id=NULL` (id becomes the tree root; the trigger writes `path='/1'`).

### 6.5 `backend/app/seed.py` — the demo dataset (yours; run once via `python -m app.seed`)

Seed exactly this (mirrors the team's live test environment, MASTER-REFERENCE §22):

- **Roles** (7): manager, editingteacher ("Teacher"), teacher ("Non-editing teacher"), student, guest, user ("Authenticated user") + custom `group_ta` (archetype teacher). Sort order in that sequence. *(No `frontpage` — out of scope.)*
- **Capabilities** (Khaled will extend; you seed the 12 core ones so FKs resolve): `enrol/manual:enrol`, `enrol/manual:unenrol`, `enrol/self:enrolself`, `enrol/self:unenrolself`, `moodle/course:view`, `moodle/course:viewparticipants`, `moodle/course:managegroups`, `moodle/site:accessallgroups`, `moodle/role:assign`, `mod/assign:grade`, `mod/assign:submit`, `moodle/course:overridecompletion` — with `cap_type` and `risks` per MASTER-REFERENCE §9.
- **Default role_capability rows at the system context** per the capability grid in MASTER-REFERENCE §7.7 (e.g. `viewparticipants` → allow for manager/editingteacher/teacher/student; `accessallgroups` → allow for manager/editingteacher **only — NOT teacher**, see contradiction C-17; `enrolself` → allow for `user`; `submit` → student only; `grade` → manager/editingteacher/teacher).
- **Users** (9): `admin1` (goes into the app's admin list — see Khaled's file), `teacher.a`, `ta.a`, `ta.allgroups`, `student.a`, `student.b`, `student.c`, `student.multi`, `student.returning`.
- **Courses** (2): `T2-TEST` ("Team 2 Test Course"), `T2-PERM` ("Team 2 Permission Comparison") + contexts.
- **Activities** in T2-TEST (5): Page 1 (page, view-completion), Quiz 1 (quiz), Assignment NG / Assignment SG / Forum SG — with `completion_enabled=true` on Page 1 and the assignments.
- **Enrolment methods**: manual (enabled) on both courses; self (enabled, key `"sesame"`) on T2-TEST; guest (disabled) on T2-TEST.
- **Enrolments + role assignments** (via the manual method, `component='enrol_manual'`): teacher.a→editingteacher, ta.a & ta.allgroups→teacher, the five students→student, all in T2-TEST, all active.
- **Groups** in T2-TEST: A {ta.a, student.a, student.multi}, B {student.b, student.multi}, C {student.c} (`component=''`), grouping "Assignment Groups" = {A, B}.
- **One cohort** "CS-2026" with student.a + student.b as members (for Hard-Case-#1 demos).
- `course_completion_settings`: T2-TEST → 'all'; one `completion_criterion` (kind='activity' → Page 1).

Idempotency: the seed must be re-runnable (upsert on unique keys or `on conflict do nothing`).

### 6.6 Wire nothing else

You do **not** edit `main.py`, any router, or `schemas.py`. This bootstrap PR = `schema.sql`, `requirements.txt` (append), `.env.example`, `app/db.py`, `app/services/__init__.py`, `app/services/sync.py`, `app/seed.py`, and this file's checklist updates. Frontend work starts only after this PR merges (file 06 — keep the two PRs separate).

---

## 7. What each teammate takes from your work (publish this table in your PR description)

| Teammate | Reads | Writes | Must NEVER touch |
|---|---|---|---|
| Yaman (enrolment) | `app_user`, `course`, `role`, `cohort*` | `enrolment_method`, `user_enrolment`, `cohort`, `cohort_member`, `user_lastaccess`, `role_assignment` (only rows with `component like 'enrol_%'`), `app_user.suspended` | `role_capability`, `context`, group tables (uses Mahmoud's service), completion tables |
| Khaled (roles) | everything | `role`, `capability`, `role_capability`, `role_assignment` (`component=''`), `permission_decision` | `user_enrolment`, `enrolment_method`, group tables, completion tables |
| Mahmoud (groups) | `user_enrolment` (active check via Yaman's service), `course`, `course_activity` | `course_group`, `group_member`, `grouping`, `grouping_group`, `course_activity.group_mode`/`grouping_id` | `role_*`, `user_enrolment`, completion tables |
| Mahdi (progress) | `user_enrolment`, `course_activity`, group tables (via Mahmoud's service) | `activity_completion`, `completion_criterion`, `criterion_completion`, `course_completion_settings`, `course_completion`, `progress_snapshot`, `course_activity.completion_enabled` | `role_*`, `user_enrolment`, group membership |
| Issa (you) | everything | DDL, seeds, `course`/`course_activity`/`context` sync rows | any business-logic table row outside seeds/sync |

Cross-domain writes happen **only through the owner's service function**, never by raw SQL into someone else's table. Example: Yaman's cohort sync places a user into a group by calling `groups.add_member(db, group_id, user_id, component='enrol_cohort', item_id=method_id)` — Mahmoud's function, which enforces the "must be actively enrolled" guard.

---

## 8. Definition of done

- [ ] Supabase project live; `schema.sql` applied cleanly from scratch in one run (test by dropping and re-running).
- [ ] All 24 tables + 10 enums exist; `\d` output matches this document.
- [ ] Every table annotated with WHY + its Moodle ancestor (the annotations are the deliverable — un-annotated schema scores nothing, per project charter).
- [ ] `.env.example` committed; no credentials in git.
- [ ] `db.py` works: `GET /api/health` extended by *nobody*; instead verify with `python -c "from app.db import engine; print(engine.connect())"`.
- [ ] Seed script runs twice without error; counts verified (9 users, 7 roles, 2 courses, 5 activities, 3 groups, 1 grouping, 1 cohort).
- [ ] Contexts exist for: system (1), both courses (2), all five activities (5) — 8 rows, correct `path`/`depth` via the trigger.
- [ ] Ownership table (§7) posted in the PR; all four teammates acknowledged it.
- [ ] PR into `staging` merged before anyone else's PR (you are the foundation).
