# Build Task 02 — Mahdi · Progress & Completion

**Owner:** Mahdi · **Domain:** activity completion, course completion, the progress percentages, overrides, history & snapshots (Hard Case 5)
**Branch:** feature branch `feat/mahdi-progress` cut from `staging`, PR back into `staging`.
**App location (staging branch):** `moodle-replica/`
**Depends on:** Issa's database bootstrap PR merged; Yaman's `services/enrolment.py`; Mahmoud's `services/groups.py` (for report scoping). Frontend is Issa's (file 06) — you provide APIs and review his Progress page.
**Source of truth:** `TEAM2-MASTER-REFERENCE.md` §11 (completion), §13 (HC-5), §15 (events/history), §17 — plus your own confirmed findings in `05_mahdi_completion_conclusions.md` (they are the behavioural spec; you already proved most of this on the live Moodle).

---

## 1. Mission

Build the **two tracking systems** and keep them apart — your own single most important conclusion:

| # | Concept | Driven by | Stored in (our schema) | Shown as |
|---|---|---|---|---|
| 1 | **Progress percentage** | *activity* completion only | `activity_completion` | the progress bar on the course card |
| 2 | **Course completion state** | *course criteria* (self/activity/grade/…) | `course_completion` | the tick + date in the report |

They are separate systems: a course can be Complete at 0 activities (self-completion) and can sit at 66% forever without being Complete. Also yours: the append-only **`progress_snapshot`** store — the only honest answer to "3 years of progress including deleted courses" (Hard Case 5).

Second law of your domain: **there is no single progress formula** (contradiction C-4). Your dashboard % and your report are *allowed* to disagree — by design, like Moodle — and the UI must say why.

---

## 2. Tables — exactly what you own, read, and take from them

### You WRITE (sole owner)

| Table | Columns | Semantics you must implement |
|---|---|---|
| `activity_completion` | all | Per-user per-activity **state machine, not a log**. Absent row = incomplete. `state` ∈ incomplete/complete/complete_pass/complete_fail. `viewed_at` = the view record (our schema folds Moodle's separate `course_modules_viewed` table back in). `overridden_by` ≠ NULL **locks** the state: automatic recomputation must never downgrade an overridden state; changing it again requires the override capability again. |
| `completion_criterion` | all | What a course requires: kind ∈ self/activity/grade/duration/date/role/course; `activity_id` for kind=activity; thresholds in `config` jsonb. **A course with completion enabled but zero criteria can never be Complete** — you proved this live on course `hello`. |
| `criterion_completion` | all | Per-user satisfaction per criterion, `completed_at`, `grade_final`. This is the "WHY it completed" provenance Moodle sometimes loses (your finding: the self-completion path left it empty — our app always writes it). |
| `course_completion_settings` | all | ALL vs ANY aggregation, one row per course. |
| `course_completion` | all | The per-user verdict. `time_completed` **never changes once set** (Moodle's `mark_complete()` returns early — replicate). `reaggregate` flag queues recomputation. |
| `progress_snapshot` | INSERT only | Append-only. Never UPDATE/DELETE. `course_id` has no FK and names are denormalized **on purpose** — rows must survive course deletion. Reasons: `event` (on every completion change), `scheduled` (sweep), `pre_delete` (called by Issa's `soft_delete_course` **before** it sets `deleted_at` — the deletion contract). |
| `course_activity.completion_enabled` | that column only | The per-activity tracking switch (rest of the row is Issa's projection / Mahmoud's two group columns). |

### You READ (never write)

`user_enrolment` + Yaman's `is_active_enrolled` (tracked-users filter), `course_activity` (visibility, deleted_at), `app_user`, group scope via Mahmoud's `allowed_groups` (report group filter), `role_capability` via Khaled's `has_capability` (override capability + report-view capability).

---

## 3. The service — `backend/app/services/progress.py`

Frozen signatures:

```python
def set_viewed(db, activity_id, user_id) -> dict          # records viewed_at, may complete (view rule)
def toggle_manual(db, activity_id, user_id, done: bool) -> dict
def override_state(db, activity_id, user_id, state, *, actor_id) -> dict   # capability-gated
def recompute_activity(db, activity_id, user_id) -> dict  # automatic rules
def reaggregate_course(db, course_id, user_id=None) -> dict
def dashboard_percent(db, course_id, user_id) -> float | None
def tracked_users(db, course_id) -> list[int]
def snapshot_course(db, course_id, *, reason) -> int      # ISSA CALLS THIS pre-delete
def snapshot_user(db, user_id, course_id, *, reason) -> int
```

### Behaviour rules (each one is a rule you personally confirmed — cite your doc in the demo)

1. **Three-layer enablement** (your P-01): nothing is ever written unless (a) the app-level flag `COMPLETION_ENABLED` env (default true, mirrors `$CFG->enablecompletion`), (b) the course has at least the settings row, (c) `course_activity.completion_enabled` — all true. Disabled ⇒ no rows, empty reports.
2. **Activity completion writes immediately** on trigger (view/submit/manual/override). **Course completion is eventually consistent**: each activity change sets `course_completion.reaggregate=true` and calls `reaggregate_course` inline (we are allowed to be faster than Moodle's cron — annotate the difference; Moodle needed `completion_regular_task`, your P-08 observation).
3. **Manual mode** accepts only complete/incomplete. **Automatic mode** = AND of configured conditions (view required ⇒ needs `viewed_at`; grade/pass conditions arrive from Team 3 events — see §5); reducer: any incomplete → incomplete; else any fail → complete_fail; else prefer complete_pass.
4. **Override lock:** `overridden_by` set ⇒ `recompute_activity` returns without changing state. `override_state` requires Khaled's `has_capability(actor, 'moodle/course:overridecompletion', course_ctx)` and records the actor — your report UI shows "overridden by X".
5. **Aggregation:** ALL ⇒ every criterion satisfied; ANY ⇒ at least one. On satisfy: write `criterion_completion.completed_at`; when the aggregate passes and `time_completed` is NULL → set it once, forever. Un-satisfying a criterion later never clears `time_completed` (faithful; annotate).
6. **Tracked users** = actively enrolled (Yaman) **and** holding `moodle/course:isincompletionreports` (Khaled resolves; student archetype only) — this is why teachers don't clutter their own reports, and why your report and Yaman's roster are different lists (contradiction C-3 — keep them different on purpose).
7. **The dashboard percent** (your T2-PRG-002, scoped per C-4):
   ```
   if course formally complete            -> 100
   else completed/total tracked, visible activities * 100
   if no activity has completion tracking -> null (no bar)
   ```
   Denominator: `completion_enabled` activities that are visible and not deleted. Numerator: states `complete` + `complete_pass` only — **`complete_fail` does not count**. Hidden activities are **excluded here but included in the report** — render both numbers and label them ("Dashboard %" vs "Report grid") so the disagreement is a feature, not a bug.
8. **Snapshots:** every state change inserts one `event` snapshot row (cheap: one insert). `snapshot_course(reason='pre_delete')` copies the *entire* course's completion picture with denormalized names. A scheduled sweep endpoint exists for the demo (`POST /api/progress/snapshots/sweep`).

---

## 4. API — new router `backend/app/routers/progress.py`

You are allowed to add **exactly two lines** to `main.py`:

```python
from app.routers import progress        # with the imports
app.include_router(progress.router)     # with the includes
```

`APIRouter(prefix="/api/progress", tags=["progress"])`:

| Method & path | Purpose |
|---|---|
| `POST /api/progress/activities/{activity_id}/view` | body `{user_id}` → `set_viewed` (simulates the student opening the page) |
| `POST /api/progress/activities/{activity_id}/toggle` | body `{user_id, done}` → manual tick |
| `POST /api/progress/activities/{activity_id}/override` | body `{user_id, state, actor_id}` → override (403 with reason when capability fails) |
| `GET /api/progress/courses/{course_id}/report` | **The completion grid**: tracked users × tracked activities, each cell `{state, overridden_by?, viewed_at?}` + per-user criteria columns + course tick/date. Params: `?group_id=` (scoped via Mahmoud), `?actor_id=` (server checks report-view capability via Khaled). **Includes hidden activities** — by design. |
| `GET /api/progress/courses/{course_id}/percent?user_id=` | `{percent, formula: "dashboard", counted, total, excluded_hidden: n}` |
| `GET /api/progress/users/{user_id}/overview` | All courses: per-course percent + completion state — the student dashboard feed |
| `GET /api/progress/courses/{course_id}/criteria` · `POST` · `DELETE /criteria/{id}` · `PUT /api/progress/courses/{course_id}/settings` | Criteria CRUD + ALL/ANY |
| `POST /api/progress/courses/{course_id}/self-complete` | body `{user_id}` → satisfies a kind='self' criterion (your T2-PRG-001 flow, with `criterion_completion` provenance written — the gap Moodle had) |
| `POST /api/progress/courses/{course_id}/reaggregate` | manual trigger for the demo |
| `GET /api/progress/snapshots?user_id=&course_id=&from=&to=` | append-only history reads — **works for deleted courses** (that's the HC-5 demo) |
| `POST /api/progress/snapshots/sweep` | scheduled-style sweep |
| `POST /api/progress/events` | **Team 3 intake** (§5) |

Pydantic models in **new** `backend/app/schemas_progress.py`.

## 5. Team 3 event intake (the cross-team contract you own)

`POST /api/progress/events` — body (from MASTER-REFERENCE §18.2, your own task file's spec):

```json
{ "event_id": "t3-8f2a...", "type": "grade_received|assessment_passed|assessment_failed|submission_finalised|activity_viewed",
  "user_id": 5, "course_id": 1, "activity_id": 4,
  "grade": 7.5, "passed": true, "occurred_at": "2026-07-23T09:00:00Z", "source": "team3" }
```

- **Idempotency is non-negotiable:** store processed `event_id`s (a tiny `processed_event` set — put it in `config`-style storage or a two-column table *created by asking Issa*, not by you) and silently ignore duplicates so replays never double-count progress.
- Mapping: `submission_finalised` → satisfies a submit condition; `grade_received` → satisfies grade condition (state complete); `assessment_passed/failed` → complete_pass / complete_fail; every applied event triggers `recompute_activity` → reaggregation → an `event` snapshot.

---

## 6. Hard Case 5 — your end-to-end demo

Script (rehearse it): student.a completes Page 1 (view) → percent moves; teacher overrides student.b complete → grid shows "overridden by"; self-complete flow sets the course tick with criterion provenance; then Issa runs `soft_delete_course('T2-PERM'-clone or a throwaway course)` → **pre_delete snapshots fire first** → the course vanishes from every live endpoint → `GET /api/progress/snapshots?user_id=...` still returns the full history with course/activity names. Close with the honest line from your feasibility spec: live tables cannot do this — the snapshot store is the only reliable answer; a foreign key to a live course is insufficient because the row disappears.

---

## 7. Frontend spec — implemented by Issa (file 06), reviewed by YOU

Issa builds `frontend/src/pages/ProgressPage.jsx` + `frontend/src/components/progress/` against this spec; you review his PR. If the UI needs data your API doesn't return, extend the API — completion logic never runs client-side.

- **ProgressPage**: course selector → tabs *Report* / *My progress* / *Criteria* / *History*.
- **CompletionGrid**: tracked users × activities; cell glyphs: ○ incomplete · ✓ complete · ✓P pass (green) · ✗F fail (red) · 🔒 overridden (tooltip: by whom, when); hidden activities get a "hidden — counted here, excluded from dashboard %" header chip; group filter dropdown (Mahmoud's allowed groups for the viewing actor); course-completion column with tick + date.
- **MyProgress**: per-course cards with the dashboard bar (`null` ⇒ no bar, exactly like Moodle) + the counted/total/excluded numbers on hover; "Complete course" self-completion button when a self criterion exists.
- **CriteriaEditor**: criteria list + ALL/ANY toggle + add (kind, activity, threshold).
- **HistoryTimeline**: snapshot query UI; deleted courses render with a "deleted — served from snapshots" badge. This screen *is* Hard Case 5.

---

## 8. Forbidden

- Never write `user_enrolment`, `enrolment_method`, `cohort*`, `role_*`, `capability`, group tables, or `course`/`course_activity` beyond `completion_enabled`.
- Never delete or update `progress_snapshot` rows. Never clear `time_completed`. Never let recompute beat an override.
- Never merge percent logic into the report (two formulas stay two formulas).
- Never edit: `schemas.py`, `db.py`, `schema.sql`, other routers/services, or **anything under `frontend/` (all of it is Issa's)**. `main.py`: your two lines only.

---

## 9. Definition of done

- [ ] Three-layer enablement verified (flag off ⇒ zero rows written anywhere).
- [ ] State machine + override lock unit-tested (`backend/tests/test_progress.py`): recompute never downgrades an override; fail never counts in percent; absent row = incomplete.
- [ ] ALL vs ANY both demoed; `time_completed` immutable once set.
- [ ] Dashboard % vs report grid disagree on a hidden activity — shown side by side, labeled (in Issa's UI; you review his Progress page against §7).
- [ ] Team 3 event intake idempotent (send the same event twice, count once).
- [ ] HC-5 script runs: pre-delete snapshots → deletion → history still served.
- [ ] Tracked-users ≠ roster verified (a teacher is on Yaman's roster, absent from your grid).
- [ ] Zero writes outside §2.

---

## 10. System prompt (paste into your AI coding assistant)

```text
You are the coding assistant for Mahdi, owner of PROGRESS & COMPLETION (BACKEND
ONLY) in Team 2's "moodle-replica" app (branch: staging). Stack: FastAPI +
SQLAlchemy 2 (SQL-first text() queries, session from app/db.py:get_db) on
PostgreSQL 17 (Supabase). The entire frontend/ tree belongs to Issa — you write
API contracts, never UI code.

FILES YOU MAY CREATE/EDIT — nothing else:
  backend/app/routers/progress.py (new), backend/app/schemas_progress.py (new),
  backend/app/services/progress.py (new), backend/tests/test_progress.py (new),
  and EXACTLY two lines in backend/main.py (import + include of the progress
  router).
NEVER touch: schemas.py, db.py, schema.sql, ANYTHING under frontend/ (Issa's),
other routers/services, or tables owned by others.

DATABASE FACTS (created by Issa; DDL frozen):
  activity_completion(activity_id, user_id, state enum[incomplete|complete|
    complete_pass|complete_fail], viewed_at, overridden_by, unique(user,activity))
    -- STATE MACHINE not a log; ABSENT ROW = incomplete
  completion_criterion(course_id, kind enum[self|activity|grade|duration|date|
    role|course], activity_id, config jsonb)
  criterion_completion(criterion_id, user_id, completed_at, grade_final,
    unique(criterion,user))  -- the WHY-provenance; always write it
  course_completion_settings(course_id PK, aggregation enum[all|any])
  course_completion(course_id, user_id, time_enrolled, time_started,
    time_completed, reaggregate, unique(course,user))
  progress_snapshot(user_id, course_id NO-FK, course_name, activity_id NO-FK,
    activity_name, state, percent, reason in(event|scheduled|pre_delete),
    taken_at) -- APPEND-ONLY, survives deletions by design
  course_activity(..., completion_enabled bool <- the ONLY column you write there,
    visible, deleted_at).
  Enrolment via services.enrolment (Yaman): is_active_enrolled(user,course).
  Groups via services.groups (Mahmoud): allowed_groups(user,activity).
  Capabilities via services.permissions (Khaled): has_capability(user, cap, ctx)
  for 'moodle/course:overridecompletion', 'moodle/course:isincompletionreports',
  'report/progress:view'.

DOMAIN RULES (each verified on live Moodle by this owner — implement exactly):
  1. TWO SEPARATE SYSTEMS: percentage (activity_completion only) vs course
     completion (criteria). A course can be Complete at 0 activities; 66% can
     be not-Complete. Never merge them.
  2. Three-layer enablement: global flag AND course AND activity.completion_enabled;
     any layer off => write NOTHING, reports empty.
  3. Activity writes are immediate; course completion is recomputed via
     reaggregate (we run it inline — faster than Moodle's cron; note it).
  4. Manual mode: only complete/incomplete. Automatic: AND of conditions;
     reducer any-incomplete->incomplete, else any-fail->complete_fail, else
     prefer complete_pass.
  5. OVERRIDE LOCK: overridden_by set => automatic recompute must NOT change
     state; overriding requires has_capability(actor,
     'moodle/course:overridecompletion', course ctx); record the actor.
  6. course_completion.time_completed is WRITE-ONCE: set when aggregation
     first passes, never cleared, never updated.
  7. Zero criteria => the course can never be Complete.
  8. TRACKED USERS = actively enrolled AND holding
     'moodle/course:isincompletionreports' (student-only default) — the report
     population is NOT the roster; teachers appear on the roster but not here.
  9. DASHBOARD % : formally complete->100; else (complete+complete_pass) /
     (completion-enabled, visible, non-deleted activities); complete_fail NEVER
     counts; no tracked activities -> null (no bar). THE REPORT INCLUDES hidden
     activities. The two views may disagree — label both, never reconcile.
 10. SNAPSHOTS: insert an 'event' snapshot on every state change;
     snapshot_course(reason='pre_delete') is called by Issa BEFORE course
     soft-delete; snapshots are append-only, no FK to course, names denormalized;
     the history endpoint must serve deleted courses from snapshots alone.
 11. Team 3 intake POST /api/progress/events is IDEMPOTENT by event_id —
     duplicates are ignored, progress never double-counts.
API prefix /api/progress. Every verdict/write returns explicit reason fields.
Write the state-machine unit tests before the UI.
```
