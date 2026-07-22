# WhoCan backend endpoint audit

Source inspected: `moodle-replica/backend/main.py`, all files under `app/routers/`, Pydantic schemas, and the React API calls. FastAPI currently publishes 56 operations across 49 paths.

## Core

| Endpoint | Returned data |
|---|---|
| `GET /` | `service`, `app`, `health`, `docs` |
| `GET /api/health` | `status`, `service`, `version`, `database`; when connected: database `connected`, `roles`, `capabilities` |
| `GET /api/stats` | `users`, `courses`, `enrolments`, `groups` |
| `GET /api/users` | array: `id`, `username`, `first_name`, `last_name`, `full_name`, `id_number`, `suspended` |
| `GET /api/users/{user_id}` | same user shape; other-user details are capability-gated |
| `GET /api/courses` | array: `id`, `short_name`, `full_name`, `visible`, `group_mode`, `force_group_mode`, `deleted` |
| `GET /api/courses/{course_id}` | one course with the same fields |
| `GET /api/courses/{course_id}/activities` | array: `id`, `course_id`, `name`, `activity_type`, `group_mode`, `grouping_id`, `visible`, `completion_enabled`, `deleted` |

## Enrolment

| Endpoint | Returned data / effect |
|---|---|
| `GET /api/enrolment/courses/{course_id}/participants?status=` | participant rows: user identity, enrolment row/method, enrolment/account status, role, dates, last access, path count |
| `GET /api/enrolment/courses/{course_id}/other-users` | role-holders without enrolment: user and role/context data |
| `GET /api/enrolment/courses/{course_id}/methods` | method instances: `id`, course, method, status, default role, cohort, start/end, config |
| `POST /api/enrolment/courses/{course_id}/methods` | creates a manual/self/guest/cohort method; returns the created service row/verdict |
| `PATCH /api/enrolment/methods/{method_id}` | updated method row/verdict |
| `DELETE /api/enrolment/methods/{method_id}` | `204`; removes method and processes enrolment paths |
| `GET /api/enrolment/methods/{method_id}/enrolments` | enrolment rows for that method: enrolment/user/status/date/role data |
| `POST /api/enrolment/methods/{method_id}/enrolments` | creates enrolment; body supports user, role, start/end, activate |
| `PATCH /api/enrolment/methods/{method_id}/enrolments/{user_id}` | suspend/reactivate result |
| `DELETE /api/enrolment/methods/{method_id}/enrolments/{user_id}` | unenrol result with last-path rules |
| `POST /api/enrolment/courses/{course_id}/enrol` | course alias for manual enrolment; resolves method then returns enrol result |
| `PATCH /api/enrolment/enrolments/{enrolment_id}` | row-id alias for suspend/reactivate |
| `DELETE /api/enrolment/enrolments/{enrolment_id}` | row-id alias for unenrol |
| `POST /api/enrolment/self/{course_id}` | `ok`, `enrolled`, `method_id`, `enrolment_id`, `reason` as applicable |
| `POST /api/enrolment/methods/{method_id}/sync` | cohort sync counts/results (added, restored, suspended/removed according to service) |
| `GET /api/enrolment/guest-preview/{course_id}` | guest availability verdict/reasons and method information |
| `GET /api/enrolment/cohorts` | cohorts: `id`, `name`, `id_number`, `description`, member count where projected |
| `POST /api/enrolment/cohorts` | created cohort result |
| `POST /api/enrolment/cohorts/{cohort_id}/members` | add-member result |
| `DELETE /api/enrolment/cohorts/{cohort_id}/members/{user_id}` | remove-member result |
| `GET /api/enrolment/users/{user_id}/enrolments` | all enrolment paths: course, method, enrolment status/dates, role and provenance |

All enrolment routes except guest preview require an authenticated principal. Mutations are capability-gated; refusals expose a human-readable `detail`/`reason`.

## Roles and permissions

| Endpoint | Returned data / effect |
|---|---|
| `GET /api/roles/capabilities` | `name`, `cap_type`, `min_context_level`, `component`, `risks` |
| `GET /api/roles/contexts` | `id`, `level`, `instance_id`, `path`, `depth`, `label` |
| `GET /api/roles/assignable?context_id=` | actor-relative assignable roles/matrix result |
| `GET /api/roles/assignments?context_id=` | nested `user`, `role`, `context`, plus `assignment_id`, `component`, `item_id` |
| `POST /api/roles/assignments` | assignment result; capability and allow-assign matrix enforced |
| `DELETE /api/roles/assignments/{assignment_id}` | unassignment result; enrolment-owned assignments are refused |
| `GET /api/roles/users/{user_id}/assignments` | assignment, role, context/path, provenance, item and timestamp |
| `GET /api/roles` | `id`, `short_name`, `name`, `description`, `archetype`, `sort_order` |
| `POST /api/roles` | created role with the same shape |
| `POST /api/roles/{role_id}/clone` | cloned role result |
| `GET /api/roles/{role_id}/capabilities?context_id=` | capability sheet: capability metadata, permission/effective value and override evidence |
| `PUT /api/roles/{role_id}/capabilities` | set/clear override result |
| `POST /api/permissions/dev-login` | development token and minimal user identity |
| `POST /api/permissions/check` | `allowed`, decision/reason, actor/capability/context and full gate evidence |
| `GET /api/permissions/decisions` | newest permission decision audit rows; optional actor filter and limit |

## Groups

| Endpoint | Returned data / effect |
|---|---|
| `GET /api/groups?course_id=` | groups for course |
| `POST /api/groups` | created group |
| `DELETE /api/groups/{group_id}` | delete result |
| `GET /api/groups/{group_id}/members` | member user rows |
| `POST /api/groups/{group_id}/members` | add-member result |
| `DELETE /api/groups/{group_id}/members/{user_id}` | remove-member result |
| `GET /api/groups/groupings?course_id=` | groupings for course |
| `POST /api/groups/groupings` | created grouping |
| `POST /api/groups/groupings/{grouping_id}/groups` | grouping-group link result |
| `PATCH /api/groups/activities/{activity_id}` | updated activity group policy |
| `GET /api/groups/activities/{activity_id}/policy` | activity group mode, grouping and policy fields |
| `GET /api/groups/activities/{activity_id}/allowed` | actor/user allowed groups and scope |
| `GET /api/groups/activities/{activity_id}/availability` | availability verdict/reasons |
| `POST /api/groups/access-check` | `allowed` verdict with group/context evidence |

## Progress

Every progress response has: `user_id`, `course_id`, `short_name`, `activities_done`, `activities_total`, `percent_complete`, `percent_remaining`, `calculated_complete`, `manually_completed`, `time_completed`, `completed`.

| Endpoint | Returned data / effect |
|---|---|
| `GET /api/progress?user_id=&course_id=` | one `CourseProgress` |
| `GET /api/progress/course/{course_id}` | array of progress for every participant |
| `GET /api/progress/user/{user_id}` | array of the user's course progress |
| `POST /api/progress/complete` | manual-completion result; completion timestamp is write-once |
| `DELETE /api/progress/complete?user_id=&course_id=` | intended uncomplete operation, but current DB rule makes it return `409` |

## Frontend/backend gaps found

The React UI also calls `/api/auth/*`, `/api/lms/*`, and richer `/api/progress/courses/*`, `/api/progress/activities/*`, and `/api/progress/snapshots` contracts. These are provided by frontend mocks when `VITE_USE_MOCKS=1`; they are **not FastAPI routes in the inspected backend**. The frontend adapters already compensate for some route differences (notably progress and groups), but a live run without mocks will leave those auth/LMS/richer-progress calls unresolved.

## Image mapping

The mockups use the real page registry and the fields above: Auth (login/signup/confirm), Dashboard, Courses, Teaching, Demos, Enrolment, Roles, Groups, and Progress. They are bilingual concept mockups, not literal runtime screenshots.
