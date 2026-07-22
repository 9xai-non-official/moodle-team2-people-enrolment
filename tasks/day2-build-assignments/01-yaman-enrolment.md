# Build Task 01 — Yaman · Enrolment

**Owner:** Yaman · **Domain:** enrolment methods, user enrolments, cohorts, roster, lifecycle
**Branch:** feature branch `feat/yaman-enrolment` cut from `staging`, PR back into `staging`.
**App location (staging branch):** `moodle-replica/`
**Depends on:** Issa's foundation PR (schema + `app/db.py` + seeds) must be merged first.
**Source of truth:** `TEAM2-MASTER-REFERENCE.md` §6 (enrolment), §12 (collisions), §13 (Hard Cases 1–2), §17 (rebuild).

---

## 1. Mission

Build the **membership system**: how a person gets into a course, by which method, in what state, and what the roster shows. You own the answer to `is_enrolled(user, course, only_active)` — the function every other domain calls before doing anything. **Backend only** — the entire frontend is Issa's (file 06); §6 below is the UI *spec* he implements and you review.

The one sentence that rules your domain (MASTER-REFERENCE §6.3):
> **Enrolment ≠ role.** `user_enrolment` says you are *a member*; `role_assignment` says what you *can do*. They are separate rows in separate systems and can drift apart — your code keeps them honest.

---

## 2. Tables — exactly what you own, read, and take from them

### You WRITE (sole owner unless noted)

| Table | Columns you set | Semantics you must implement |
|---|---|---|
| `enrolment_method` | all | One row per method instance per course. `kind` ∈ manual/self/cohort/guest. `status` enabled/disabled — disabling an instance freezes every enrolment through it without touching their rows. Multiple instances of the same kind per course are legal; guest is one-per-course (DB enforces it). `config` jsonb: self → `{"key","use_group_keys","max_enrolled","inactivity_days"}`; cohort → `{"sync_group_id"}`. |
| `user_enrolment` | all | One row per (method, user) — **two methods = two rows** (Hard Case #1). `status` active/suspended. `time_end` NULL = forever. **The four active-conditions** (memorize): row active + method enabled + start passed-or-null + end future-or-null. |
| `cohort`, `cohort_member` | all | Site-level bags of people. Membership change triggers sync into every course that has a cohort method pointing at the bag. |
| `user_lastaccess` | upsert on roster/API touches | Feeds self-enrol inactivity cleanup. |
| `app_user.suspended` | that flag only | Account suspension ≠ enrolment suspension (C-6). Account-suspended users **still appear** on rosters — replicate Moodle here and show a badge instead of hiding them. |
| `role_assignment` | **only rows with `component like 'enrol_%'`** | When you enrol, you also insert the role row: `role_id = method.default_role_id`, `context_id = the course's context`, `component = 'enrol_manual'|'enrol_self'|'enrol_cohort'`, `item_id = method.id`. When a path is removed you delete **only rows matching your component+item_id**. Rows with `component=''` are Khaled's — never touch them. (Deviation D-1: unlike Moodle, our manual enrolments DO carry provenance.) |

### You READ (never write)

`app_user` (identity), `course` (projection — check `deleted_at is null`), `role` (to resolve `default_role_id`), `context` (to find the course context id for role rows).

### You CALL (other owners' services — never their tables)

- `groups.add_member(db, group_id, user_id, component, item_id)` / `groups.remove_members_by_provenance(db, course_id, user_id, component, item_id)` / `groups.remove_all_memberships(db, course_id, user_id)` — Mahmoud.
- `progress` needs nothing from you at write time; Mahdi reads `user_enrolment` directly.

---

## 3. The service you must export — `backend/app/services/enrolment.py`

Everyone depends on these signatures; freeze them Day 1 and announce in the team channel:

```python
def is_active_enrolled(db, user_id: int, course_id: int) -> bool
    # the 4 conditions, ANY path qualifies
def is_enrolled(db, user_id: int, course_id: int) -> bool
    # bare existence, any state — Moodle's onlyactive=False
def active_paths(db, user_id: int, course_id: int) -> list[dict]
    # [{method_id, kind, status, window_ok}] — feeds Khaled's checker evidence
def enrol_user(db, method_id, user_id, *, role_id=None, time_start=None, time_end=None, actor_id) -> dict
def unenrol_user(db, method_id, user_id, *, actor_id) -> dict
def suspend(db, method_id, user_id) / reactivate(db, method_id, user_id)
```

### Behaviour rules (each is a verified Moodle rule — cite the section when you demo)

1. **`enrol_user`** upserts the `user_enrolment` row (unique method+user → re-enrolling updates, never duplicates), inserts the provenance `role_assignment` row, and — for cohort methods with `sync_group_id` — calls Mahmoud's `add_member` with your provenance. §6.5.
2. **`unenrol_user`** deletes the row, deletes role_assignment rows matching *your* component+item_id, then runs the **last-path check**: if the user has NO other `user_enrolment` row in this course → whole-course cleanup: call `groups.remove_all_memberships`, delete `user_lastaccess`, and delete any remaining `enrol_%` role rows in this course context. **Completion rows are never deleted** — that is the "progress resumes on re-enrolment" behaviour (Hard Case #2, §6.10/§6.11).
3. **Suspend** flips status only. Roles stay. Access dies because `is_active_enrolled` fails. Never delete anything on suspend.
4. **Self-enrol** gate chain in exact order (§6.6): course exists & visible → method enabled → window open → `max_enrolled` not hit → key check — if `use_group_keys` and the submitted key matches a `course_group.enrolment_key` in this course, enrol AND call `add_member` into that group with `component='enrol_self'` → then create the enrolment with the method's `default_role_id`.
5. **Cohort sync** (`sync_cohort_method(db, method_id)`): members not enrolled → enrol; enrolled-but-suspended → reactivate; enrolled-but-no-longer-members → **unenrol** (we implement policy UNENROL only; annotate that Moodle also offers KEEP/SUSPEND/SUSPENDNOROLES). Run it on every cohort_member add/remove and expose `POST /api/enrolment/methods/{id}/sync` to trigger it manually for the demo.
6. **Guest** methods create **no** `user_enrolment` rows ever — a guest is a session concept; for the demo, `GET /api/enrolment/guest-preview/{course_id}` just answers whether guest access is enabled.

---

## 4. API — replace the stub in `backend/app/routers/enrolment.py`

Current stub (take from staging): `APIRouter(prefix="/api/enrolment")` with one in-memory `list_enrolments`. Replace entirely with:

| Method & path | Purpose | Notes |
|---|---|---|
| `GET /api/enrolment/courses/{course_id}/participants` | **The roster** — the flagship read | Joins user_enrolment ⋈ enrolment_method ⋈ role_assignment (course context) ⋈ group_member. Per person: id, name, roles[], methods[] (kind + status + window), enrolment_status (active/suspended/expired/method-disabled), groups[], account_suspended flag, last_access. Query params: `?status=active|suspended|all` (default active — mirrors Moodle's default filter). |
| `GET /api/enrolment/courses/{course_id}/other-users` | Role-holders with **no** enrolment (Khaled creates them) | `role_assignment` rows in course context with no user_enrolment — MASTER-REFERENCE §8.8. |
| `GET /api/enrolment/courses/{course_id}/methods` · `POST` · `PATCH /methods/{id}` | List / create / enable-disable-configure instances | |
| `POST /api/enrolment/methods/{id}/enrolments` | Enrol a user (manual) | body: user_id, role_id?, time_start?, time_end? |
| `DELETE /api/enrolment/methods/{id}/enrolments/{user_id}` | Unenrol from that path | triggers last-path logic |
| `PATCH /api/enrolment/methods/{id}/enrolments/{user_id}` | body `{"status": "suspended"|"active"}` | |
| `POST /api/enrolment/self/{course_id}` | Self-enrol | body: user_id, key? — returns the gate-chain verdict with the failing gate named |
| `POST /api/enrolment/methods/{id}/sync` | Cohort sync trigger | |
| `GET /api/enrolment/cohorts` · `POST` · `POST /cohorts/{id}/members` · `DELETE /cohorts/{id}/members/{user_id}` | Cohort management | member changes call the sync |
| `GET /api/enrolment/users/{user_id}/enrolments` | All of one user's paths across courses | powers Hard-Case-#1 demo |

Pydantic models go in a **new** file `backend/app/schemas_enrolment.py` — do not edit the shared `schemas.py`.

---

## 5. Hard Cases you own end-to-end

- **HC-1 (manual + cohort, cohort removed):** seed has student.a manually enrolled AND in cohort CS-2026. Demo: attach a cohort method to T2-TEST, sync (2 rows visible in "user paths" endpoint), remove student.a from the cohort, sync → cohort row + its role gone, manual row + role survive, groups placed by the cohort gone, manual groups intact. The participants endpoint must show him continuously enrolled throughout.
- **HC-2 (drop week 10, return week 12):** demo unenrol → roster loses him, `activity_completion` rows still in DB (ask Mahdi's endpoint) → re-enrol → progress reappears untouched; groups are empty (must rejoin — this is faithful Moodle behaviour, not a bug).

---

## 6. Frontend spec — implemented by Issa (file 06), reviewed by YOU

The shell (nav, acting-user selector, api helpers) is Issa's job. Your responsibility here is the **spec below and the review**: when Issa's Enrolment page PR is open, you check it against this section. If the UI needs data the API doesn't give, you extend your API — the UI never computes enrolment logic client-side.

### 6.1 EnrolmentPage (`frontend/src/pages/EnrolmentPage.jsx` + `frontend/src/components/enrolment/` — Issa's files)

- **EnrolmentPage**: course selector (from `/api/courses`) → tabs: *Participants* / *Methods* / *Cohorts* / *Other users*.
- **ParticipantsTable**: columns Name · Roles · Method(s) · Status (colour badges: active green, suspended grey, expired amber, method-disabled amber, account-suspended red **but still listed**) · Groups · Last access · actions (suspend/reactivate/unenrol per path). Status filter mirroring `?status=`.
- **EnrolUserModal**: user picker + role (default from method) + optional start/end.
- **MethodsPanel**: the course's instances with enable/disable toggle + self-enrol key config + "Sync now" for cohort.
- **SelfEnrolDemo**: small form (user + key) that shows the gate-chain verdict, including the named failing gate — this visualizes §3.4.
- **UserPathsDrawer**: for one user, every enrolment path with its method/status/window — the HC-1 visual.

---

## 7. Forbidden (breaking these breaks teammates)

- Never write `role_capability`, `context`, `course_group`/`group_member` (call Mahmoud's service), any completion table, or `role_assignment` rows where `component=''`.
- Never edit: `schemas.py`, `main.py`, other routers/services, `db.py`, `schema.sql`, or **anything under `frontend/` (all of it is Issa's)**.
- Never hard-delete a user or course. Never delete completion rows on unenrol.
- Never merge to `staging` without the roster endpoint passing the HC-1 walkthrough.

---

## 8. Definition of done

- [ ] `services/enrolment.py` exports the six frozen signatures; Khaled/Mahmoud/Mahdi confirmed they can import them.
- [ ] All §4 endpoints live against Supabase (no `_SAMPLE` left in your router).
- [ ] Four active-conditions implemented as one SQL predicate, reused everywhere (no copy-paste drift).
- [ ] HC-1 and HC-2 demo scripts run clean on seeded data.
- [ ] Issa's Enrolment page reviewed and approved against §6.
- [ ] Roster shows account-suspended users with a badge (C-6 faithful).
- [ ] No writes to any table outside §2.

---

## 9. System prompt (paste into your AI coding assistant)

```text
You are the coding assistant for Yaman, owner of the ENROLMENT domain (BACKEND
ONLY) in Team 2's "moodle-replica" app (branch: staging). Stack: FastAPI +
SQLAlchemy 2 (SQL-first via text() queries, sessions from app/db.py:get_db) on
PostgreSQL 17 (Supabase). The entire frontend/ tree belongs to Issa — you write
API contracts, never UI code.

FILES YOU MAY CREATE/EDIT — nothing else:
  backend/app/routers/enrolment.py, backend/app/schemas_enrolment.py,
  backend/app/services/enrolment.py, backend/tests/test_enrolment.py.
NEVER touch: schemas.py, main.py, db.py, schema.sql, other routers/services,
ANYTHING under frontend/ (Issa's), any table owned by others.

DATABASE FACTS (already created by Issa; do not alter DDL):
  enrolment_method(id, course_id, kind enum[manual|self|cohort|guest],
    status enum[enabled|disabled], default_role_id, cohort_id, config jsonb,
    enrol_start, enrol_end)  -- guest: max one per course (partial unique index)
  user_enrolment(id, method_id, user_id, status enum[active|suspended],
    time_start, time_end NULL=forever, unique(method_id,user_id))
  cohort(id,name,id_number,component), cohort_member(cohort_id,user_id, PK both)
  user_lastaccess(user_id,course_id,accessed_at, PK both)
  role_assignment(user_id, role_id, context_id, component, item_id,
    unique(user_id,role_id,context_id,component,item_id))
  app_user(..., suspended bool, deleted_at), course(..., deleted_at),
  context(level enum, instance_id, parent_id, path, depth).

DOMAIN RULES (verified against Moodle source — implement exactly):
  1. ACTIVE enrolment = 4 conditions, ALL true on at least one path:
     ue.status='active' AND method.status='enabled'
     AND (time_start IS NULL OR time_start<=now())
     AND (time_end IS NULL OR time_end>now()).
  2. Enrolment and role are separate facts. enrol_user() writes BOTH:
     the user_enrolment row and a role_assignment row with
     component='enrol_<kind>', item_id=method_id, at the COURSE context
     (context where level='course' and instance_id=course_id).
  3. unenrol_user(): delete the path row + role_assignment rows matching MY
     component+item_id only. Then last-path check: if no other user_enrolment
     rows remain for this user+course -> call groups service
     remove_all_memberships(course_id,user_id), delete user_lastaccess row,
     delete remaining enrol_% role rows in this course context.
     NEVER delete completion rows (progress must survive re-enrolment).
  4. Suspend = status flip only; keep roles, keep groups, keep everything.
  5. Account suspension (app_user.suspended) is a DIFFERENT switch: the user
     still appears in rosters (show a badge); it never touches enrolment rows.
  6. Self-enrol gate order: course visible -> method enabled -> window ->
     max_enrolled -> key (a matching course_group.enrolment_key both enrols AND
     joins that group via the groups service, component='enrol_self') ->
     create enrolment with method.default_role_id. Return which gate failed.
  7. Cohort sync policy = UNENROL (member removed -> full path removal).
     Member added -> enrol or reactivate; optional config.sync_group_id ->
     groups service add_member(component='enrol_cohort', item_id=method_id).
  8. Guest kind creates NO user_enrolment rows ever.
  9. Cross-domain writes ONLY via services: groups membership through
     app/services/groups.py functions (Mahmoud's), never direct SQL to
     course_group/group_member.
 10. Re-enrolling an existing (method,user) UPDATES the row (upsert), never errors.
API prefix stays /api/enrolment. Roster endpoint is the flagship: participants =
users WITH user_enrolment rows (role optional); role-without-enrolment users go
to /other-users, never the roster. Write clean parameterized SQL, small pure
functions, and return explicit "why" fields (failing gate names) in every verdict.
```
