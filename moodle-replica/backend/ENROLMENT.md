# Enrolment & People — Domain Guide

**Owner:** Yaman (Team 2) · **Stack:** FastAPI + asyncpg over Supabase Postgres
**Scope of this document:** everything the enrolment domain does, exactly as it
behaves in this repository. Every claim below is grounded in the actual code and
the live schema. File references use paths relative to `moodle-replica/backend/`.

Files you own (the whole domain lives in four files + one worker + one caps module):

| File | Role |
|---|---|
| `app/services/enrolment.py` | **All domain logic.** The only place that decides *what happens*. |
| `app/routers/enrolment.py` | Thin HTTP layer: auth, capability gates, request/response shaping. |
| `app/routers/users.py` | The "People" reads (`/api/users`). |
| `app/schemas_enrolment.py` | Pydantic request/response models. |
| `app/caps_enrolment.py` | Capability name constants + context resolvers + the 403 wrapper. |
| `app/tasks/enrol_expiry.py` | The scheduled expiry / inactivity / group-repair worker. |
| `tests/test_enrolment.py`, `tests/test_enrolment_authz.py` | The domain's tests. |

---

## 1. The one mental model you must hold

Moodle (and this system) keep **two facts about a person in a course completely
separate**:

1. **Enrolment** — *"are you a member of this course?"* Stored in the
   `enrolment` table. This is what makes a course appear on your dashboard and
   what gates access.
2. **Role assignment** — *"what are you allowed to do?"* Stored in
   `role_assignment` (owned by Khaled's permission engine). A teacher, a
   student, a manager — that is a role, not an enrolment.

A person can be enrolled with no role, or hold a role with no enrolment
("other users"). The enrolment service writes **both** rows when you enrol
someone (the enrolment row *and* a provenance role row), and keeps them honest.
Never conflate them.

A third concept sits above both: a **method**. You are never enrolled "into a
course" directly — you are enrolled **through an enrolment method instance**
(`enrolment_method`) that belongs to the course. The same person can be enrolled
in one course through several methods at once (e.g. manually *and* via a cohort).
Each such connection is a **path**.

> Enrolment says you are a MEMBER. Role assignment says what you CAN DO. Methods
> are the doors you came through, and you can come through several at once.

---

## 2. Database tables the domain touches

These are the live columns (verified against the deployed Supabase schema).

### `enrolment` — one row per (method, user) path
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `method_id` | bigint | FK → `enrolment_method.id`, **ON DELETE CASCADE** |
| `user_id` | bigint | FK → `app_user.id`, ON DELETE CASCADE |
| `status` | `enrolment_status` enum | **only `active` \| `suspended`** — there is no `expired` value |
| `time_start` | timestamptz | null = no lower bound |
| `time_end` | timestamptz | null = forever |
| `modified_by` | bigint | audit provenance (the acting principal) |
| `created_at` / `updated_at` | timestamptz | |

**Unique constraint:** `(method_id, user_id)` — a person has at most one row per
method. That is why enrolling is an *upsert*, never a duplicate insert.

### `enrolment_method` — one row per method instance on a course
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `course_id` | bigint | FK → `course.id` |
| `method` | `enrol_method` enum | `manual` \| `self` \| `cohort` \| `guest` |
| `status` | enum | `enabled` \| `disabled` (disabled = **freeze**, see §4) |
| `default_role_id` | bigint | role granted to people enrolled through this method |
| `cohort_id` | bigint | set only for `cohort` methods |
| `enrol_start` / `enrol_end` | timestamptz | the sign-up window for `self` |
| `enrol_duration` | interval | self-enrol period → sets each enrolment's `time_end` |
| `config` | jsonb | free-form per-kind config (keys below) |
| `created_at` / `updated_at` | timestamptz | |

`config` keys the code reads:
- `self`: `key` (enrolment key), `use_group_keys` (bool), `max_enrolled` (int),
  `enrol_period` (seconds — fallback if `enrol_duration` column is null).
- `cohort`: `sync_group_id` (place synced members into this group).
- expiry worker: `expiredaction` (`keep` \| `suspend` \| `unenrol`),
  `longtimenosee` (days of inactivity before auto-unenrol).

### `cohort` / `cohort_member`
- `cohort(id, name, id_number, description, component, created_at)`.
- `cohort_member(cohort_id, user_id, added_at)`.
A cohort is a site-wide list of users; a `cohort` enrolment method syncs that
list into a course (add member → enrol; remove member → unenrol).

### `user_last_access(user_id, course_id, accessed_at)`
Feeds the inactivity ("longtimenosee") sweep and is touched on roster reads.

### `v_enrolment_detail` — the liveness view (read-only, single source of truth)
Columns: `enrolment_id, user_id, course_id, method_id, method,
enrolment_status, method_status, time_start, time_end, **live**`. The `live`
column encodes the four active-conditions (§4) so no caller re-implements them.

### `role_assignment` (Khaled's — the domain WRITES provenance rows here, never elsewhere)
Enrolment writes rows keyed by `(user_id, role_id, context_id, component,
item_id)`. For enrolment provenance: `component = 'enrol_<method>'`
(`enrol_manual` / `enrol_self` / `enrol_cohort`) and `item_id = method_id`.
Manually-assigned roles (Khaled's) carry `component = ''` and the domain must
never delete those (see §6.3).

---

## 3. The four active-conditions ("liveness")

A path is **live** (grants access) only when **all four** hold. This is one SQL
predicate, `ACTIVE_CONDITIONS_SQL` in `app/services/enrolment.py`, reused
everywhere:

```sql
      e.status   = 'active'          -- 1. the enrolment row is active
  and m.status   = 'enabled'         -- 2. the method is enabled (disabling = freeze)
  and (e.time_start is null or e.time_start <= now())   -- 3. started
  and (e.time_end   is null or e.time_end   >  now())   -- 4. not ended
```

A person is **actively enrolled in a course** if **at least one** of their paths
is live. Helpers:
- `is_active_enrolled(db, user_id, course_id)` — any live path? (onlyactive)
- `is_enrolled(db, user_id, course_id)` — any path at all, live or not?
- `active_paths(db, user_id, course_id)` — the list of that user's paths with
  their `live`/`window_ok` flags.

**Consequence to remember:** *suspending* an enrolment or *disabling* a method
kills access **without deleting any rows** — access resumes the instant the
switch flips back. That is different from *unenrolling*, which deletes the path.

---

## 4. HTTP API — every endpoint

All routes are under the prefix **`/api/enrolment`** (People reads are under
`/api/users`). Every route except `guest-preview` requires an **authenticated
principal** via the `X-Acting-User` header (`Depends(current_user)` from
`app/deps.py`). Mutations additionally pass a **capability check** at the
relevant context. See §5 for the auth model.

Legend: `*` = capability not yet seeded → **fails closed** (only a site admin
passes) until Essa merges the seed diff (§8).

### Reads
| Method + path | Capability (context) | Returns |
|---|---|---|
| `GET /courses/{id}/participants?status=active\|suspended\|all` | `course:viewparticipants` (course) | `ParticipantOut[]` — people **with** enrolment rows. Also touches `user_last_access` for the principal. |
| `GET /courses/{id}/other-users` | `course:viewparticipants` (course) | `OtherUserOut[]` — role-holders with **no** enrolment. |
| `GET /courses/{id}/methods` | `course:viewparticipants` (course) | `MethodOut[]` |
| `GET /methods/{id}/enrolments` | `course:viewparticipants` (course) | `MethodEnrolmentOut[]` |
| `GET /guest-preview/{course_id}` | **open** (pre-auth question) | `GuestPreviewOut` |
| `GET /cohorts` | principal only, no capability | `CohortOut[]` |
| `GET /users/{user_id}/enrolments` | self free, else `user:viewdetails` | `UserPathOut[]` |

### Mutations
| Method + path | Capability (context) | Body → effect |
|---|---|---|
| `POST /courses/{id}/methods` | `course:enrolconfig`* (course) | `MethodCreate` → create a method instance |
| `PATCH /methods/{id}` | `course:enrolconfig`* (course) | `MethodPatch` → enable/disable/reconfigure |
| `DELETE /methods/{id}` | `course:enrolconfig`* (course) | tear down instance: unenrol every member (roles + groups cleaned) then delete |
| `POST /methods/{id}/enrolments` | `enrol:manual` (course) | `EnrolRequest` → enrol via this method |
| `POST /courses/{id}/enrol` | `enrol:manual` (course) | `CourseEnrolRequest` → alias, resolves to the course's manual method if `method_id` omitted |
| `DELETE /methods/{id}/enrolments/{user_id}` | `enrol:unenrol` (course) | remove this path |
| `DELETE /enrolments/{id}` | `enrol:unenrol` (course) | same, addressed by enrolment row id |
| `PATCH /methods/{id}/enrolments/{user_id}` | `enrol:manage`* (course) | `EnrolmentStatusPatch` → suspend/reactivate |
| `PATCH /enrolments/{id}` | `enrol:manage`* (course) | same, by row id |
| `POST /self/{course_id}` | identity (principal == body.user_id) **and** `enrol:selfenrol`* (course) | `SelfEnrolRequest` → the self-enrol gate chain |
| `POST /methods/{id}/sync` | `cohort:config`* (course) | trigger a cohort-method sync |
| `POST /cohorts` | `cohort:manage`* (**system**) | `CohortCreate` → create a cohort |
| `POST /cohorts/{id}/members` | `cohort:assign`* (**system**) | `CohortMemberAdd` → add member (+ propagates sync) |
| `DELETE /cohorts/{id}/members/{user_id}` | `cohort:assign`* (**system**) | remove member (+ propagates unenrol) |

### People reads (`app/routers/users.py`)
| Method + path | Capability | Notes |
|---|---|---|
| `GET /api/users` | **open** | The frontend's acting-user bootstrap — fires before any principal exists. Returns minimal safe columns only. |
| `GET /api/users/{id}` | self free, else `user:viewdetails` | Row resolved first, so an unknown id is 404 before 403. |

### Error contract (what the frontend renders verbatim)
- **401** — no / unknown principal (missing or invalid `X-Acting-User`).
- **404** — unknown method / row / course context / user (resource resolution
  runs *before* the capability check).
- **403** — missing capability; `detail` names the capability
  (e.g. `requires capability 'enrol:manual' at context 9`).
- **409** — conflict (duplicate guest method; **active cohort path manual
  unenrol**, see §6.4; DB constraint violations mapped by `app/errors.py`).
- **400** — other service refusals; the reason is in `detail`.

Precedence, in order: **401 → 404 → 403 → service refusal**. Service refusals
carry their reason in `detail`, and may override the HTTP code via an
`http_status` field (that is how the cohort guard returns 409 on a route whose
default is 404).

---

## 5. Authorization model (how the gates work)

The domain does **not** implement auth or an authorization engine — it consumes
Khaled's merged contracts.

- **Identity:** `Depends(current_user)` (`app/deps.py`) reads the `X-Acting-User`
  header, verifies the account exists and is not deleted, and returns the
  principal `dict` (`id`, `username`, `suspended`, `deleted`). Missing/unknown →
  401. (This is the interim identity assertion; Khaled's Bearer/JWT auth slots
  in here later with no route changes.)
- **Authorization:** `caps_enrolment.require_capability_http(actor_id, cap,
  context_id)` wraps Khaled's `permissions.require_capability` (the engine's
  "one mechanism every write path uses") and maps its `PermissionError` to HTTP
  403 naming the capability. It is chosen over `deps.require_capability`
  deliberately, because the engine version (a) still lets a **site admin** pass
  even for capabilities that are not seeded yet, and (b) denies
  deleted/suspended actors up front.
- **Contexts:** capabilities are checked at a **context**, not a course id.
  - Course-scoped gates resolve `course_id → context.id` via
    `deps.course_context_id` (404 if the course has no context row).
  - Cohorts are **site-level** objects, so their gates run at the **system
    context** (`caps_enrolment.system_context_id()`).
  - `user:viewdetails` runs at the target's user context if one exists, else
    falls back to the system context (`user_view_context_id`).

### Capabilities used (canonical short names, `component:action`)
Seeded today (grants exist): `course:viewparticipants`, `enrol:manual`,
`enrol:unenrol`, `user:viewdetails`.

**Not seeded yet → fail closed** (admin bypass still works):
`course:enrolconfig`, `enrol:manage`, `enrol:selfenrol`, `cohort:config`,
`cohort:manage`, `cohort:assign`. Turning these 403s into the intended grants is
Essa's seed migration — see §8. This is the same fail-closed posture the engine
uses for `role:manage`.

---

## 6. Business rules (the behaviour that matters)

### 6.1 Enrolling — `enrol_user()` (upsert, status-preserving)
Enrolling writes **two** things atomically: the `enrolment` row and the
provenance `role_assignment` row (`component='enrol_<method>'`,
`item_id=method_id`, role = `role_id` or the method's `default_role_id`).

- A **new** row is always `active`.
- A **re-enrol** (row already exists) **preserves the existing status** unless
  the caller passes `activate=True`. *A suspended learner is never silently
  reactivated by a duplicate enrol.* (T2-ENR-002 / ENR-010.)
- Only **supplied** fields are written on conflict — `time_start`, `time_end`,
  `modified_by` use `coalesce(new, existing)`, so passing `None` means "leave it
  as-is" (mirrors Moodle `update_user_enrol` change-gating).
- Guest methods **never** create enrolment rows (§6.6).
- For a `cohort` method with `config.sync_group_id`, group placement is queued
  and run **after** the transaction commits (see §7).

### 6.2 Status changes — `suspend()` / `reactivate()` (change-gated)
- Flip **status only**: roles stay, groups stay, rows stay. Access dies/returns
  purely because condition 1 of liveness changes.
- **Change-gated:** a no-op flip (already in the target status) returns
  `{"ok": True, "changed": False}` and does **not** rewrite `updated_at`. A real
  flip returns `"changed": True`.

### 6.3 Unenrolling & role cleanup — `unenrol_user()` (T2-ENR-003 / T2-ENR-005)
Removing one path deletes **only that path's** enrolment row and the
`role_assignment` rows matching **its** `(component, item_id=method_id)`.
Because every path owns its own provenance row:
- **A role justified by another active path survives** a per-path unenrol
  (T2-ENR-005). Example: manual-teacher + cohort-student; unenrol the manual
  path → the teacher role goes, the cohort student role stays.
- **Last-path cleanup:** when the removed path was the person's *last* path in
  the course, the domain also removes the leftover `enrol_%` provenance roles,
  their `user_last_access` row, and queues removal of all their group
  memberships. **It deliberately leaves `component=''` rows** — those are
  Khaled's manually-assigned roles (Option B; see §8 for the Option A decision).
- **Never deleted:** `activity_completion` / `course_completion` rows
  (progress resumes on re-enrolment — Hard Case #2), submissions, grades, and
  `component=''` role rows.

### 6.4 The cohort unenrol guard — R-COHORT (ENR-013)
An **active** cohort-synced path **cannot be manually unenrolled** — cohort
membership is the source of truth. Attempting it returns **409** naming ENR-013;
the operator must either suspend the path first, or remove the user from the
cohort (which unenrols them via the sync). The sync itself, and method teardown
(`delete_method`), pass an internal `_cohort_sync=True` flag to bypass this
guard, because those are legitimate system-driven removals, not manual ones.

> Note: this is exactly the case a self-review caught — `delete_method` must
> bypass the guard, otherwise deleting a cohort method with active members would
> have every unenrol refused while the `ON DELETE CASCADE` still removed the
> enrolment rows, orphaning role and group rows (ghost access). It now bypasses.

### 6.5 Self-enrolment — `self_enrol()` (the gate chain)
`POST /self/{course_id}` runs a strict, **stop-at-first-failure** chain and
always returns the full `gates[]` array up to the failure plus
`blocking_reasons[]`. Order:

1. `course_visible` — course exists and is visible.
2. `method_enabled` — the course has an enabled `self` method.
3. `window_open` — now within `enrol_start`/`enrol_end`.
4. `capacity` — under `config.max_enrolled` (0 = unlimited).
5. `key_match` — the instance `key`, or (if `use_group_keys`) a group's
   enrolment key, which **also places the user in that group**.

On success it enrols the user with the method's `default_role_id`. The router
adds two guards in front of the chain: **identity** (`body.user_id` must equal
the principal — you can only self-enrol *yourself*, else 403) and the
**capability** `enrol:selfenrol` (fail-closed until seeded).

**Self-enrol period (T2-ENR-004):** the new enrolment's `time_end` is set to
`now + enrol_duration` (the method's interval column), or, if that is null,
`now + config.enrol_period` seconds. Unset → open-ended.

### 6.6 Guest — `create_method(method='guest')` / `guest_access_enabled()`
Guest access is a **session concept**: guest methods create **no** enrolment
rows, ever. `guest-preview` only answers whether the course's guest switch is on
(and whether it has a password). **One guest method per course**: the code keeps
a friendly pre-check for a readable message, and the database's partial unique
index is the real correctness guarantee — a race that loses surfaces as a
typed **409**, not a 500. (T2-DATA-003 / migration M08.)

### 6.7 Cohort sync — `sync_cohort_method()` (policy UNENROL)
Reconciles one cohort method against its cohort's membership:
- members not enrolled → **enrol**;
- enrolled-but-suspended members → **reactivate**;
- enrolled-but-no-longer-members → **unenrol** (bypassing the R-COHORT guard).
Disabled methods are frozen and skipped. Membership changes propagate:
`add_cohort_member` / `remove_cohort_member` → `sync_methods_for_cohort` →
`sync_cohort_method` for every course method pointing at that cohort.

### 6.8 Rosters — `list_participants()` / `list_other_users()`
- **Participants** = people **with** enrolment rows. Account-suspended users
  stay listed with a badge (C-6): `enrolment_status` and `account_suspended` are
  reported as **separate** facts, plus a folded `effective_status` for the UI.
- **Other users** = people who hold a role in the course but have **no**
  enrolment row.

---

## 7. Cross-domain rule: groups go through Mahmoud's service only

The enrolment service **never** writes `group_member` directly. Group placement
and removal are deferred: each mutation appends operations to an `ops` list and
runs them **after commit** via `_run_group_ops` → Mahmoud's `groups` service
(`add_member`, `remove_members_by_provenance`, `remove_all_memberships`), always
with **server-set provenance** (`component='enrol_<method>'`, `item_id=method`).
This is required because his functions use their own pool and cannot see our
uncommitted rows. Group ops are idempotent (his D-GM contract:
on-conflict-do-nothing), so the expiry worker's reconciliation pass can safely
re-drive them.

---

## 8. The expiry / inactivity worker — `app/tasks/enrol_expiry.py` (T2-ENR-004)

Three idempotent functions, safe to run repeatedly; `run_all()` runs them in
order:

- `process_expirations()` — for each active path whose `time_end` has passed,
  apply the method's `config.expiredaction`: **suspend** (flip status),
  **unenrol** (remove the path, bypassing R-COHORT), or **keep** (no-op — the
  on-read liveness already treats a past `time_end` as not-live).
- `run_longtimenosee()` — unenrol active paths whose method sets
  `config.longtimenosee` (days) and whose user has not accessed the course
  within that window (no `user_last_access` row counts as stale).
- `reconcile_group_side_effects()` — re-drive cohort→group membership so a
  commit-then-group-op failure heals on the next tick.

**No persisted expiry state (D-EXPIRY-DDL / M16 = DO NOT ADOPT):** `time_end` +
`enrol_duration` already derive expiry, and the `enrolment_status` enum has no
`expired` value — expiry collapses into `active`/`suspended`, which is exactly
what the worker writes. Adding a column would be drift-prone derived data.

**Scheduling:** `main.py` is a shared surface (Essa custodian), so the periodic
caller is delivered as an additive diff (`docs/T2-ENR-004-main-scheduler.diff`),
not edited directly. It starts a lifespan asyncio loop calling
`enrol_expiry.run_all()` every `ENROL_EXPIRY_INTERVAL_SECONDS` (default 3600;
0 disables).

---

## 9. Coordination items owned outside this domain

These are prepared as **additive diffs / decision docs**, never edited into
teammates' files directly:

1. **`docs/T2-ENR-001-capability-seed.draft.sql`** (for **Essa**) — adds the
   unseeded capabilities and their default grants so the fail-closed 403s
   (`course:enrolconfig`, `enrol:manage`, `enrol:selfenrol`, `cohort:*`) become
   the intended allow rules. It also proposes a real `'user'` (Authenticated
   user) role row so `enrol:selfenrol` can be granted to "anyone logged in" —
   **needs Khaled's ack** (touches his resolver semantics).
2. **`docs/T2-ENR-roles-DRA-decision.md`** (for **Khaled**) — the R-ROLE
   decision. Option B (shipped) leaves `component=''` roles on last-path
   cleanup; Option A (Moodle-faithful blanket `role_unassign_all`) needs his
   sign-off because it deletes rows he owns.
3. **`docs/T2-ENR-004-main-scheduler.diff`** (for **Essa**) — the `main.py`
   scheduler wiring.

**Known deferred gap:** ENR-026 C5 — the cohort sync does not yet *re-add* a
manually-deleted role on a *kept* member. Flagged, not implemented.

---

## 10. Running it locally

```bash
cd moodle-replica/backend
python3 -m venv .venv && . .venv/bin/activate      # first time
pip install -r tests/requirements-dev.txt

# DB connection — copy the example and fill in the rotated password
cp .env.example .env       # then set DATABASE_URL (session pooler, port 5432)

# run the API
uvicorn main:app --reload

# run the domain tests (against the live team DB via .env)
python3 -m pytest tests/test_enrolment.py -v
python3 -m pytest tests/test_enrolment_authz.py -v
```

**Testing notes that will save you hours:**
- Tests run against the **live** team DB and build/tear down their own scratch
  fixtures (methods, cohorts) for the `demo_*` scratch users; seeded rows are
  read-only. Each test wraps its async scenario in `asyncio.run()` (fresh pool
  per test — asyncpg pools are loop-bound).
- **Do not run two test processes against the DB at the same time.** They share
  the scratch users (`ALICE=4`, `BOB=5`) and course `LAB1=5`; overlapping runs
  collide and produce *non-deterministic* failures (e.g. "two methods = two
  rows" seeing three). Run suites serially.
- The hermetic modules (`test_api_smoke`, `test_check_integration`) pop
  `DATABASE_URL`; `test_enrolment*.py` re-read it from `.env` via `dotenv_values`
  and only inject it inside their own fixtures, so the whole suite is
  order-independent.

---

## 11. Quick call-map (where to look when something breaks)

| Symptom | Look at |
|---|---|
| 401 on everything | `X-Acting-User` header missing → `app/deps.py::current_user` |
| 403 naming a capability that "should work" | capability not seeded → §8 seed diff; or actor lacks the grant |
| Re-enrol reactivated a suspended user | that would be a regression in `enrol_user`'s `case when $activate` upsert |
| Deleting a cohort method leaves ghost roles | `delete_method` must pass `_cohort_sync=True` (§6.4) |
| Self-enrol always fails at a gate | read the returned `gates[]` — the failing gate names itself |
| Group not created/removed on enrol | Mahmoud's service unavailable or the deferred `ops` not run — §7 |
| Roster shows/hides the wrong people | `list_participants` (with rows) vs `list_other_users` (roles, no rows) — §6.8 |
