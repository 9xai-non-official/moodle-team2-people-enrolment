# Team 2 — People & Enrolment · Database Schema

**Live on Supabase** · project `UserRoles` (`gbzvunmywuuwfhyhsahl`) · PostgreSQL 17 · deployed 2026-07-21
Source files: [`schema.sql`](../../schema.sql) (DDL) · [`seed.sql`](../../db/seed.sql) (roles/capabilities config)

Our own model of Moodle's People & Enrolment area — same concepts, not a copy.
Each table below names the Moodle table it descends from and why it exists.

---

## What is done

- ✅ 20 tables + 3 views deployed, real FK constraints throughout (Moodle has none)
- ✅ Permission engine `fn_can(user, capability, context)` in SQL — returns verdict **and why**
- ✅ Context tree with trigger-maintained path (cannot drift, unlike Moodle's cron-repaired path)
- ✅ Seeded: 5 roles, 16 capabilities, 39 system-level defaults — config only, no invented course data
- ✅ Smoke-tested (rolled back): hard case #1 dual-enrolment, override precedence, prohibit stickiness
- ✅ RLS enabled on all tables, zero policies → anon key sees nothing; backend uses service key / direct Postgres

### Improvements over Moodle (the "engineering" part)

| Moodle | Ours | Why |
|---|---|---|
| No FK constraints anywhere | Real FKs | Integrity in DB, not PHP |
| Magic ints (`permission=-1000`, group mode `0/1/2`) | Postgres enums | Readable, type-checked |
| Unix-epoch bigints, `timeend=2147483647` = "forever" | `timestamptz`, `NULL` = open | Y2038 bug removed |
| `customint1..8`+`customchar1..3`+`customtext1..4` on `enrol` | one `config jsonb` | 15 spare columns → 1 |
| Context path string only, cron repairs drift | `parent_id` FK + trigger-derived path | Source of truth is relational |
| `course_modules_viewed` = whole table | `viewed_at` column | One nullable column does the job |
| Hard deletes possible | `deleted_at` soft delete on user/course | Hard case #5: history survives |

---

## Enums

| Type | Values | Replaces (Moodle) |
|---|---|---|
| `context_level` | `system, category, course, activity, user` | contextlevel 10/40/50/70/30 |
| `role_archetype` | `manager, editingteacher, teacher, student, guest` | archetype varchar |
| `enrol_method_kind` | `manual, self, cohort, guest` | enrol varchar(20) |
| `method_status` | `enabled, disabled` | status 0/1 |
| `enrolment_status` | `active, suspended` | status 0/1 |
| `cap_permission` | `allow, prevent, prohibit` | 1 / -1 / -1000 ("not set" = row absent) |
| `group_mode` | `none, separate, visible` | groupmode 0/1/2 |
| `completion_state` | `incomplete, complete, complete_pass, complete_fail` | completionstate 0/1/2/3 |

---

## Tables

### Identity

#### `app_user` — (Moodle: `user`)
The person. Moodle's 50+ columns cut to the identity core.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `username` | varchar(100) | unique |
| `email` | varchar(255) | |
| `first_name`, `last_name` | varchar(100) | |
| `id_number` | varchar(100) | external institutional id, for extraction mapping |
| `suspended` | boolean | can't log in; enrolments untouched |
| `deleted_at` | timestamptz | soft delete — history survives (Moodle scrambles + keeps row) |
| `created_at`, `updated_at` | timestamptz | |

### Team-1 projections (we do not own these)

#### `course` — (Team 1's course, synced via their API)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `external_ref` | varchar(100) | Team 1 / Moodle course id, unique |
| `short_name`, `full_name` | varchar/text | |
| `visible` | boolean | |
| `group_mode` | group_mode | course-level setting |
| `force_group_mode` | boolean | true → per-activity modes silently ignored (Moodle rule) |
| `start_date`, `end_date` | timestamptz | |
| `deleted_at` | timestamptz | soft delete — hard case #5 |

#### `course_activity` — (Team 1's course_modules)
Needed for per-activity group mode (hard case #4), TA scope (#3), completion.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `course_id` | bigint → course | |
| `external_ref` | varchar(100) | unique per course |
| `name` | text | |
| `activity_type` | varchar(50) | 'assign','quiz','forum',… |
| `group_mode` | group_mode NULL | NULL = inherit course; ignored if force_group_mode |
| `grouping_id` | bigint → grouping | restrict activity to a grouping |
| `visible` | boolean | |
| `completion_enabled` | boolean | counts toward progress |
| `deleted_at` | timestamptz | |

### Permission spine

#### `context` — (Moodle: `context`)
Every place a permission can be checked; one tree: system > category > course > activity/user.
`path`/`depth` derived by trigger `trg_context_path` from `parent_id` — cannot drift.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `level` | context_level | |
| `instance_id` | bigint | polymorphic: course.id / activity.id / user.id per level; unique (level, instance_id) |
| `parent_id` | bigint → context | real FK (Moodle has none) |
| `path` | text | derived, e.g. `/1/3/17` |
| `depth` | int | derived |

#### `role` — (Moodle: `role`)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `short_name` | varchar(100) | unique — 'manager','editingteacher','teacher' (=TA),'student','guest' |
| `name` | varchar(255) | |
| `description` | text | |
| `archetype` | role_archetype | what "reset to default" resets to |
| `sort_order` | int | unique |

#### `capability` — (Moodle: `capabilities`)
Catalogue of checkable actions. Names keep Moodle's `component:action` convention.

| Column | Type | Notes |
|---|---|---|
| `name` | varchar(255) | PK, e.g. `activity:grade`, `site:accessallgroups` |
| `cap_type` | 'read'/'write' | |
| `min_context_level` | context_level | highest meaningful point in tree |
| `component` | varchar(100) | |
| `risks` | text[] | Moodle's bitmask, readable |

#### `role_capability` — (Moodle: `role_capabilities`)
"Role R says P about capability C, at and below context X."
Row at system ctx = definition; deeper row = override. **Absence = 'not set', NOT deny.**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `role_id` | bigint → role | cascade |
| `context_id` | bigint → context | cascade |
| `capability` | varchar → capability(name) | cascade |
| `permission` | cap_permission | allow / prevent / prohibit |
| `modified_by` | bigint → app_user | |
| `updated_at` | timestamptz | |

Unique (role_id, context_id, capability).

#### `role_assignment` — (Moodle: `role_assignments`)
"User U holds role R at context X and below." **Being enrolled and having a role are separate facts** — the key Moodle insight. `component`+`item_id` record what created it, so removing a sync removes exactly its own assignments (hard case #1).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `user_id` | bigint → app_user | cascade |
| `role_id` | bigint → role | cascade |
| `context_id` | bigint → context | cascade |
| `component` | varchar(100) | '' = manual, 'enrol_cohort' etc. |
| `item_id` | bigint | the enrolment_method that created it |
| `assigned_by` | bigint → app_user | |
| `assigned_at` | timestamptz | |

Unique (user_id, role_id, context_id, component, item_id).

### Enrolment

#### `cohort` / `cohort_member` — (Moodle: `cohort`, `cohort_members`)
Site-wide people lists driving automatic enrolment (the "group sync" of hard case #1).
`cohort`: id, name, id_number (unique), description, component ('' = manual; non-empty = externally managed), created_at.
`cohort_member`: PK (cohort_id, user_id), added_at.

#### `enrolment_method` — (Moodle: `enrol`)
An *instance* of a way into one course. **Disabling suspends participation via it without deleting anyone's enrolment row** — the whole answer to hard case #1.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `course_id` | bigint → course | |
| `method` | enrol_method_kind | manual / self / cohort / guest |
| `status` | method_status | enabled / disabled |
| `default_role_id` | bigint → role | role granted on enrol via this method |
| `cohort_id` | bigint → cohort | required when method='cohort' (CHECK) |
| `enrol_start`, `enrol_end` | timestamptz | window for enrolling |
| `enrol_duration` | interval | per-user enrolment length |
| `config` | jsonb | password, welcome msg… (replaces 15 custom* columns) |
| `created_at`, `updated_at` | timestamptz | |

#### `enrolment` — (Moodle: `user_enrolments`)
**One row = one user's participation VIA ONE METHOD.** Two methods = two rows.
User is IN the course iff ≥1 row is live (see `v_course_participant`).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `method_id` | bigint → enrolment_method | cascade — deleting a method deletes only ITS rows |
| `user_id` | bigint → app_user | cascade |
| `status` | enrolment_status | active / suspended |
| `time_start`, `time_end` | timestamptz NULL | NULL = open (Moodle: 0 / 2147483647) |
| `modified_by` | bigint → app_user | |
| `created_at`, `updated_at` | timestamptz | |

Unique (method_id, user_id).

### Groups

#### `course_group` / `group_member` — (Moodle: `groups`, `groups_members`)
Partitions inside one course. A user CAN be in two groups at once — hard case #4 is a feature. Membership does not imply enrolment (Moodle quirk, kept + documented).
`course_group`: id, course_id → course, name, id_number, description, enrolment_key (self-enrol key → auto-join), participation, created_at.
`group_member`: PK (group_id, user_id), component + item_id (what auto-added it), added_at.

#### `grouping` / `grouping_group` — (Moodle: `groupings`, `groupings_groups`)
Named sets OF GROUPS; activities point at groupings, not groups. Kept separate — collapsing them is the classic redesign mistake.
`grouping`: id, course_id → course, name, description, created_at.
`grouping_group`: PK (grouping_id, group_id), added_at.

### Progress

#### `course_completion` — (Moodle: `course_completions`)
Per user per course: enrolled / started / completed timestamps. **Survives unenrolment and course soft-delete** (hard cases #2, #5) — never cascades from enrolment.
Unique (user_id, course_id).

#### `activity_completion` — (Moodle: `course_modules_completion` + `course_modules_viewed`)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | PK |
| `activity_id` | bigint → course_activity | |
| `user_id` | bigint → app_user | |
| `state` | completion_state | no row = incomplete (Moodle rule) |
| `viewed_at` | timestamptz | replaces Moodle's separate viewed table |
| `overridden_by` | bigint → app_user | teacher forced the state; auto-updates stop (Moodle rule) |
| `updated_at` | timestamptz | |

Unique (user_id, activity_id).

#### `user_last_access` — (Moodle: `user_lastaccess`)
PK (user_id, course_id), accessed_at. Participants-page "last access"; evidence for hard case #2 re-enrolment.

#### `audit_log` — (Moodle: `logstore_standard_log`, slimmed)
Append-only event trail: event, actor_id, affected_id, course_id, context_id, detail jsonb, created_at.
**No FKs on purpose** — log rows outlive hard deletes. Powers hard cases #2 and #5 reconstruction.

---

## Views

| View | Question it answers |
|---|---|
| `v_enrolment_detail` | Every (user, course, method) row + `live` boolean: user not deleted AND enrolment active AND method enabled AND now() inside window |
| `v_course_participant` | Per (user, course): `enrolled` = bool_or(live), `method_count`, `methods[]`. THE enrolment rule in one view |
| `v_course_progress` | Per (user, course): activities done / total completable, includes soft-deleted courses (hard case #5) |

---

## `fn_can(user_id, capability, context_id) → jsonb` — the permission engine

The brief's core question: "can this user do this action in this course, **and why**."

Resolution (Moodle's real rules, smoke-tested):
1. Collect user's role assignments at the context and every ancestor.
2. Per role: deepest `role_capability` row along the path wins — **except prohibit, which is sticky: once seen on the path, a deeper allow cannot switch it back.**
3. Across roles: any prohibit → denied. Else any allow → granted. Else denied ('prevent' silences only its own role; 'not set' falls through).

Returns:
```json
{
  "user_id": 7, "capability": "activity:grade", "context_id": 17,
  "granted": false,
  "reason": "a role resolves to PROHIBIT — nothing can override it",
  "trace": [ {"role": "teacher", "permission": "prevent", "decided_at_depth": 3} ]
}
```

Call from SQL (`select fn_can(7,'activity:grade',17);`) or PostgREST RPC (`POST /rest/v1/rpc/fn_can`).

---

## Seeded configuration (seed.sql)

- Context root: `system` (id 1).
- Roles: manager, editingteacher (Teacher), **teacher (= non-editing teacher = TA)**, student, guest.
- 16 capabilities in Moodle's `component:action` style, incl. `site:accessallgroups` (key to hard cases #3/#4), `activity:grade`, `enrol:manual`.
- 39 system-context defaults. Two deliberate surprises kept from Moodle:
  - **Both teacher roles get `site:accessallgroups` by default** — the TA of hard case #3 becomes group-scoped only via an explicit `prevent` override at course/activity context.
  - **Guest has `prohibit` on `activity:submit`** — the live demo that no deeper allow can resurrect a prohibit.

No course/user/enrolment data seeded — the brief forbids invented data; real data arrives via extraction from the given Moodle course.

---

## Connecting

Project ref `gbzvunmywuuwfhyhsahl`, region ap-northeast-1. Credentials live in `TEAM_CREDENTIALS.md` (NOT committed — ask Issa).

| Use | How |
|---|---|
| FastAPI / asyncpg / psql | Pooler: `postgresql://postgres.gbzvunmywuuwfhyhsahl:<PASSWORD>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres` (transaction mode; use port 5432 session mode for prepared statements) |
| supabase-js / PostgREST | `https://gbzvunmywuuwfhyhsahl.supabase.co` + service key (backend only). Anon key is useless by design: RLS on, no policies |
| Dashboard | supabase.com/dashboard → project UserRoles |
