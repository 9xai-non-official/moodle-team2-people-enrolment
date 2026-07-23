# LMS backend router — mapping to replace the frontend mocks

Goal: retire `frontend/src/mocks/lms.js` (and the `/api/auth/*` + `/api/lms/*`
mock routes) so every LMS feature reads/writes the real database.

## Key finding: the schema already exists

Every table the mock invents is **already in the live Postgres** (verified
against the Supabase DB, not just fixtures). This is a **wiring job, not a
schema-design job** — no migrations required for the core flows.

| Mock in-memory store (`seed.js`) | Real table (already live) | Notes |
|---|---|---|
| `CREDENTIALS` map | `app_credential(user_id, password_hash, confirmed)` | PK=user_id, FK→app_user. `password_hash` is 64-hex → **SHA-256** (match the seed scheme). 2 rows seeded. |
| `SUBMISSIONS` | `assignment_submission(id, activity_id, user_id, body jsonb, submission_status, submitted_at)` | UNIQUE(activity_id,user_id). `body` = `{text, files[], statement_accepted}` (confirmed in seed). Grade lives separately. |
| grade/feedback fields on submissions | `grade(id, activity_id, user_id, points, max_points, feedback, state, graded_by, graded_at)` | UNIQUE(activity_id,user_id). Shared by assign + quiz. |
| `QUIZZES` | `quiz(activity_id PK, attempts_allowed, grade_to_pass)` + `quiz_question(id, activity_id, kind, prompt, choices jsonb, correct jsonb, points)` | `correct` is a number (multichoice index), boolean (truefalse), or null (essay). |
| `QUIZ_ATTEMPTS` | `quiz_attempt(id, activity_id, user_id, state, score, max_score, started_at, finished_at)` + `quiz_answer(id, attempt_id, question_id, response jsonb, points, feedback)` | UNIQUE(attempt_id,question_id). |
| `ENROL_REQUESTS` | `enrol_request(id, course_id, user_id, message, status, requested_at, decided_by, decided_at)` | 1:1. |
| `COURSE_REQUESTS` | `course_request(id, requester_id, full_name, short_name, reason, status, course_id, requested_at, decided_by, decided_at)` | 1:1 (+ `course_id` link to the created course). |
| `ACTIVITIES` | `course_activity` | Already used elsewhere. |

## Reuse, don't reimplement

The mock hand-rolls identity and authorization (`isAdmin`, `teaches`,
`hasAccessAllGroups`, `gradeGate`, `requireActiveStudent`). The backend already
has all of these as services — the LMS router should **call them**:

- **Enrol** — `services/enrolment.enrol_user(db, method_id, user_id, ...)`,
  `services/enrolment.self_enrol(db, course_id, user_id, key=..., ...)`
  (already does the key check + role assignment + audit).
- **Effective enrolment status / "am I enrolled"** —
  `enrolment.is_active_enrolled`, `enrolment.active_paths`,
  `enrolment.user_enrolments_all`; or the `v_course_participant` /
  `v_enrolment_detail` views (`live` / `enrolled` columns).
- **Authorization** — `services/permissions.require_capability(db, actor_id,
  capability, context_id)` / `has_capability(...)` instead of `isAdmin`/`teaches`.
- **HC-3 group-scoped grading** — `services/groups.shares_group(actor, target,
  activity_id)` + `_has_accessallgroups` instead of the mock `gradeGate`.
- **Context ids** — `enrolment._course_context_id` / `groups._course_context_id`.
- **Audit** — `db.audit(event, actor_id=..., ...)` inside `db.transaction()`.

Capability names already defined: `caps_enrolment.py` (`enrol:manual`,
`enrol:selfenrol`, …); seeded caps include `course:viewparticipants`,
`activity:grade`, `site:accessallgroups`, `completion:override`. Course
creation maps to Moodle's `moodle/course:create` (manager) — pick/confirm the
capability name for `course:create` and `course:manageactivities`.

## Proposed file layout

Mirror the retired `app/routers/lms/*` split (source is gone, only stale `.pyc`
remain), wire into `main.py` with `app.include_router(...)`:

```
app/routers/lms/__init__.py      # aggregates the sub-routers
app/routers/lms/auth.py          # /api/auth/*
app/routers/lms/catalog.py       # /api/lms/catalog + enrol/self-enrol/request
app/routers/lms/activities.py    # student activity list + submission + quiz
app/routers/lms/grading.py       # teacher submissions/attempts/grade/grade-essay
app/routers/lms/courses.py       # course create + course-requests
app/services/lms.py              # auto-grade, meSummary, catalog aggregation
```
`main.py:14` currently imports only 6 routers + permissions; add `lms`.
Also fix the stale `main.py` docstring ("Endpoints are stubs that return
placeholder data").

---

## Endpoint-by-endpoint map

Legend: **[R]** reuse existing service · **[N]** new logic in `services/lms.py`.

### Auth — `/api/auth/*`  (app_credential + app_user)

| Method + path | DB action | Rules / notes |
|---|---|---|
| POST `/api/auth/signup` | INSERT `app_user` + `app_credential`(sha256(password), confirmed=false) in one tx | username unique (409); return `{user, confirmation_required:true}`. |
| POST `/api/auth/confirm` | UPDATE `app_credential` SET confirmed=true WHERE user_id | 404 if no cred. |
| POST `/api/auth/login` | SELECT `app_credential` + `app_user`; compare hash | 401 bad creds; 403 unconfirmed; 403 if `app_user.suspended`. Return `meSummary`. **[N]** Optionally also mint a Bearer via `services/auth.issue_token(user_id)` so the SPA gets a real token (unifies with the Bearer-gated routes). |
| GET `/api/auth/me?user_id=` | reads only | Return `meSummary`. |

**`meSummary(user)` [N]** = `{ user, is_admin, teaches:[course_id], enrolled:[course_id] }`
- `is_admin` ← `permissions._account_and_identity` (site-admin) or a manager role at system context.
- `teaches` ← courses where user holds an editingteacher/teacher role (join `role_assignment`→`context`→`role.archetype`).
- `enrolled` ← `enrolment.user_enrolments_all` / `v_course_participant`.

> Note: this partially overlaps the existing `deps.current_user` (X-Acting-User)
> and `services/auth` (Bearer). Decision below (§Open) on whether `/api/auth/*`
> becomes the real login that issues the Bearer, or stays a thin profile lookup.

### Catalog + enrol — `/api/lms/*`

| Method + path | DB action | Rules / notes |
|---|---|---|
| GET `/api/lms/catalog?user_id=` | SELECT visible non-deleted `course`; per course join `enrolment_method`, `enrol_request`, effective status | **[N]** build `{course, my_status, teaching, request_pending, options:{self_enrol:{requires_key}, can_request}}`. `my_status` ← effective enrolment status; `teaching` ← `permissions`/role check; `request_pending` ← pending `enrol_request`; `self_enrol` ← enabled `self` method (`requires_key = config.key present`); `can_request` ← enabled `manual` method. |
| POST `/api/lms/courses/{id}/enrol` | **[R]** `enrolment.enrol_user(...)` on the course's manual method (activate) | teacher/admin only → `require_capability(enrol:manual)`. Upserts enrolment + role_assignment (service already does it). |
| POST `/api/lms/courses/{id}/self-enrol` | **[R]** `enrolment.self_enrol(db, course_id, user_id, key=body.key)` | service enforces method enabled + key + not-already-enrolled; add suspended-account guard (403). |
| POST `/api/lms/courses/{id}/enrol-request` | INSERT `enrol_request`(pending) | 409 if already active or already pending. |
| GET `/api/lms/courses/{id}/enrol-requests?actor_id=` | SELECT `enrol_request` JOIN `app_user` WHERE course | teacher-gated (`require_capability` view/enrol at course ctx). |
| POST `/api/lms/enrol-requests/{id}/(approve\|deny)` | UPDATE status+decided_by/at; on approve **[R]** `enrol_user` via manual method | 409 if not pending; teacher-gated; 409 if manual method disabled. |

### Activities + student submission/quiz — `/api/lms/*`

| Method + path | DB action | Rules / notes |
|---|---|---|
| GET `/api/lms/courses/{id}/activities?user_id=` | SELECT `course_activity` WHERE course (not deleted) | hide `visible=false` for non-teachers; attach `mine` per-activity status **[N]** (see adapters). |
| GET `/api/lms/activities/{id}/submission?user_id=` | SELECT `assignment_submission` (+ `grade`) | default `{status:"none"}` if none; merge grade fields. |
| POST `/api/lms/activities/{id}/submission` | UPSERT `assignment_submission` (`body` jsonb) | `requireActiveStudent` via `enrolment.is_active_enrolled` (403); activity must be assign + visible; ≤5 files; can't edit if submitted/graded (409); on `action=submit` require `statement_accepted` (403), set status=submitted, submitted_at=now. |
| GET `/api/lms/activities/{id}/quiz?user_id=` | SELECT `quiz` + `quiz_question` (**strip `correct`**) + this user's `quiz_attempt` | `max_score` = Σ points. |
| POST `/api/lms/activities/{id}/attempts` | INSERT `quiz_attempt`(in_progress) | active student; no in-progress attempt (409); attempts_used < attempts_allowed (403). |
| PATCH `/api/lms/attempts/{id}` | UPSERT `quiz_answer`(response) per answer | attempt must be in_progress (409). Body `{answers:{question_id: response}}`. |
| POST `/api/lms/attempts/{id}/finish` | **[N]** auto-grade → UPDATE `quiz_attempt` | compare `quiz_answer.response` to `quiz_question.correct`; sum auto points; if any essay → state=`finished` (awaiting), score=null; else state=`graded`, score=auto. |

### Teacher grading — `/api/lms/*`

| Method + path | DB action | Rules / notes |
|---|---|---|
| GET `/api/lms/activities/{id}/submissions?actor_id=` | SELECT `assignment_submission` JOIN `app_user` (+`grade`) | teacher-gated; per-row `can_grade` ← **[R]** `groups.shares_group`/HC-3. |
| POST `/api/lms/submissions/{id}/grade` | UPSERT `grade`(points, feedback, graded_by, state=graded) | HC-3 grade gate; can't grade a draft (409); points 0–100. Sets submission's derived status→graded. |
| GET `/api/lms/activities/{id}/attempts?actor_id=` | SELECT `quiz_attempt` JOIN `app_user` + `quiz_question` (incl. `correct`) | teacher-gated; per-row `can_grade`. |
| POST `/api/lms/attempts/{id}/grade-essay` | UPDATE `quiz_answer.points` for the essay question; when all essays scored, recompute `quiz_attempt.score` + state=graded | attempt must be `finished` (409); points 0–question.points. |

### Course creation + requests — `/api/lms/*`

| Method + path | DB action | Rules / notes |
|---|---|---|
| POST `/api/lms/courses` | INSERT `course` + `context`(course) + manual `enrolment_method` (tx) | admin/manager only (`require_capability(course:create)`); short_name unique (409). |
| POST `/api/lms/course-requests` | INSERT `course_request`(pending) | full_name+short_name required. |
| GET `/api/lms/course-requests?actor_id=` | SELECT `course_request` JOIN requester | admin sees all; others see own. |
| POST `/api/lms/course-requests/{id}/(approve\|reject)` | UPDATE status; on approve create course+context+method, assign requester editingteacher, set `course_request.course_id` (tx) | admin only; 409 if not pending. |

---

## Field / shape adapters (the only non-trivial translations)

The frontend expects the mock's JSON shape. Keep the response shape identical so
no frontend change is needed; translate at the router edge.

**Assignment submission** — `assignment_submission.body` jsonb holds
`{text, files, statement_accepted}`; grade fields come from the `grade` table:
```
response = {
  id, activity_id, user_id,
  status: submission_status,              # none|draft|submitted|graded (graded ⇐ grade row exists)
  text: body.text, files: body.files, statement_accepted: body.statement_accepted,
  submitted_at,
  grade: grade.points, feedback: grade.feedback, graded_by: grade.graded_by,
}
```

**Quiz question** — DB↔mock rename: `kind`→`type`, `prompt`→`text`,
`choices`→`options`, `correct`→`answer`. **Always drop `correct` on student
reads** (`stripAnswers`).

**Quiz attempt** — mock's `answers{qid:val}`, `auto_score`, `essay_scores{}`,
`total` are spread across `quiz_attempt` + `quiz_answer`:
- `answers` ⇐ `{quiz_answer.question_id: quiz_answer.response}`
- `auto_score` ⇐ Σ points of non-essay `quiz_answer`
- `essay_scores` ⇐ `{qid: quiz_answer.points}` for essay questions
- `total` ⇐ `quiz_attempt.score`

**`mine` per-activity status** (activities list) — assign → submission_status +
grade; quiz → attempts_used/allowed, in_progress, awaiting_marking, best_score,
max_score. Compute in `services/lms.py`.

---

## Open decisions (need your call)

1. **Auth identity model.** Three mechanisms would coexist: X-Acting-User
   (`deps`), Bearer (`services/auth`), and this new `/api/auth/*`. Recommend:
   `/api/auth/login` verifies `app_credential` **and** issues the Bearer via
   `auth.issue_token`, so login becomes the single real entry point and the
   `X-Acting-User` dev shim can be retired. Confirm before wiring.
2. **Password hashing.** Seed uses 64-hex (SHA-256, likely unsalted). Keep
   SHA-256 to stay compatible, or upgrade to bcrypt/argon2 (adds a dependency +
   a re-hash of the 2 seeded creds). Recommend bcrypt for anything beyond demo.
3. **Capability names** for `course:create` / `course:manageactivities` — confirm
   the exact strings + which roles hold them (seed `role_capability`).
4. **`grade.max_points`** — mock hardcodes 0–100. Keep 100, or read the
   activity's configured max?

## Not-LMS but same "mock-only" class (separate, smaller)

Progress sub-features also hit mock-only paths with no real equivalent:
`/api/progress/{report,criteria,snapshots}`, `activities/{id}/{toggle,override,view}`,
`users/{id}/overview`, `courses/{id}/self-complete`. Tables exist
(`completion_criteria`, `course_completion_criteria`, `activity_completion`,
`v_course_progress`). Track as a follow-up to this LMS router.
