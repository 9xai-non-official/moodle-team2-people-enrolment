# Frontend ⇄ Backend contracts (DERIVED — owners must confirm)

**Status: derived by Issa from task 06 §4–§5**, because files 01/02/04/05 +
TEAM2-MASTER-REFERENCE are not in the repo yet. Field names follow 06's
explicit mentions (`reasons[]`, `blocking_reasons[]`, `capability_values`,
"decided at course:1", status vocabulary, `counted/total/excluded`).
**Yaman / Khaled / Mahmoud / Mahdi: review your section; silence = agreement.**
Mocks in `src/mocks/*.js` implement exactly these shapes; when your endpoint
lands, delete the mock file — nothing else changes.

Conventions everywhere:
- Errors: FastAPI style `{"detail": "..."}"`; domain refusals add
  `{"reasons": ["...", ...]}` (or `blocking_reasons`). UI shows them verbatim.
- Actor: permission-sensitive GETs take `?actor_id=`; mutations carry
  `actor_id` in the body. (From the "acting as" header select.)
- Timestamps ISO-8601; `null` = open/none. Ids are integers.

## Core (shell)
- `GET /api/health` → `{status:"ok",...}` (exists)
- `GET /api/users` → `[{id, username, first_name, last_name, full_name, suspended}]`
- `GET /api/courses?include_deleted=1` → `[{id, short_name, full_name, visible, group_mode, force_group_mode, deleted}]`
- `GET /api/stats` → `{users, courses, enrolments, groups}`

## Enrolment (Yaman — 06 §4.2)
- `GET /api/enrolment/courses/{id}/participants?status=active|suspended|all` →
  `[{user_id, full_name, username, roles:["student",...],
     paths:[{enrolment_id, method_id, method, method_status, status, time_start, time_end}],
     effective_status:"active"|"suspended"|"expired"|"method_disabled"|"account_suspended",
     groups:[{id,name}], last_access}]`
  (account-suspended users stay listed — C-6.)
- `GET /api/enrolment/courses/{id}/other-users` → `[{user_id, full_name, roles:[...], note}]`
- `GET /api/enrolment/courses/{id}/methods` →
  `[{id, method:"manual"|"self"|"cohort", status:"enabled"|"disabled",
     default_role:{id,short_name}, cohort:{id,name}|null, config:{key?}, enrolled_count}]`
- `PATCH /api/enrolment/methods/{id}` body `{status}` → updated method
- `POST /api/enrolment/methods/{id}/sync` → `{added:[user_id], removed:[user_id], kept:[user_id]}`
- `GET /api/enrolment/methods/{id}/enrolments` → `[{enrolment_id, user_id, full_name, status, time_start, time_end}]`
- `POST /api/enrolment/courses/{id}/enrol` body `{user_id, role_id?, method_id?, time_start?, time_end?}` → participant row
- `PATCH /api/enrolment/enrolments/{id}` body `{status:"active"|"suspended"}` → row
- `DELETE /api/enrolment/enrolments/{id}` → 204 (unenrol ONE path)
- `POST /api/enrolment/self/{course_id}` body `{user_id, key}` →
  `{enrolled:bool, gates:[{gate, passed, reason}], blocking_reasons:[...]}`
  gate names: `method_enabled, window_open, key_match, not_already_enrolled, capacity`
- `GET /api/enrolment/users/{id}/enrolments` →
  `[{course:{id,short_name,deleted}, method, method_status, status, time_start, time_end, live}]` (HC-1 drawer)
- `GET /api/enrolment/cohorts` → `[{id, name, id_number, member_count, synced_courses:[short_name]}]`
- `DELETE /api/enrolment/methods/{id}` → 204 (removes cohort sync → HC-1 demo)

## Roles / Permissions (Khaled — 06 §4.3)
- `GET /api/roles` → `[{id, short_name, name, archetype}]`
- `GET /api/roles/contexts` → `[{id, level, label, path}]` (pickers)
- `GET /api/roles/{id}/capabilities?context_id=` →
  `[{capability, permission:"allow"|"prevent"|"prohibit"|"notset",
     is_override:bool, defined_at:{context_id, label}|null}]`
- `POST /api/roles/{id}/capabilities` body `{context_id, capability, permission}` → row
- `GET /api/roles/assignable?actor_id=&context_id=` → `[{role_id, short_name, name}]` (matrix demo)
- `GET /api/roles/assignments?context_id=` → `[{id, user:{id,full_name}, role:{id,short_name}, context:{id,label}, component, item_id}]`
- `POST /api/roles/assignments` body `{actor_id, user_id, role_id, context_id}` → row | 403 `{reasons}`
- `POST /api/permissions/check` body
  `{actor_id, capability, context_id, target_user_id?, activity_id?, simulate_role_id?}` →
  `{verdict:"allowed"|"denied",
    gates:[{gate:"enrolment"|"role"|"capability"|"group", passed, evidence:[...]}],
    capability_values:[{role, permission, decided_at:{context_id,label}}],
    reasons:[...]}`
  **Critical: capability gate may pass while group gate fails — both rows present.**
- `GET /api/permissions/decisions?limit=` → `[{id, actor:{id,full_name}, capability, context_label, verdict, created_at, reasons:[...]}]`

## Groups (Mahmoud — 06 §4.4)
- `GET /api/groups/courses/{id}/groups` →
  `[{id, name, enrolment_key:bool, participation,
     members:[{user_id, full_name, provenance:""|"enrol_cohort"|"enrol_self", item_id}]}]`
- `POST /api/groups/{id}/members` body `{user_id, actor_id}` → member | 403/409 `{reasons}` (non-enrolled user refused)
- `DELETE /api/groups/{id}/members/{user_id}?actor_id=&force=1` → 204 | 409 `{reason, machine_owned:true}` (component-owned row)
- `GET /api/groups/courses/{id}/groupings` → `[{id, name, groups:[{id,name}]}]`
- `GET /api/groups/courses/{id}/activity-policies` →
  `[{activity_id, name, configured_mode:"none"|"separate"|"visible"|null,
     effective_mode, forced:bool, grouping:{id,name}|null}]`
  (configured ≠ effective rows get highlighted — GRP-012.)
- `GET /api/groups/activities/{id}/allowed?actor_id=` → `{groups:[{id,name}], all_groups:bool, reason}`
- `POST /api/groups/access-check` body `{actor_id, target_user_id, activity_id}` →
  `{outcome:"allowed"|"denied"|"invisible", reasons:[...]}` (HC-3 three outcomes)

## Progress (Mahdi — 06 §4.5)
- `GET /api/progress/courses/{id}/report?actor_id=&group_id=` →
  `{activities:[{id, name, hidden, completion_enabled}],
    rows:[{user_id, full_name,
           cells:[{activity_id, state:"incomplete"|"complete"|"complete_pass"|"complete_fail",
                   overridden_by:{id,full_name}|null, viewed:bool}],
           course_complete:{done:bool, at:date|null}}]}`
- `GET /api/progress/courses/{id}/percent?user_id=` → `{percent:number|null, counted, total, excluded}`
  (`percent:null` when the course has no criteria — renders NO bar.)
- `GET /api/progress/users/{id}/overview` →
  `[{course:{id, short_name, deleted}, percent:number|null, counted, total, excluded, completed_at}]`
  (includes deleted courses, served from snapshots.)
- `GET /api/progress/courses/{id}/criteria` → `{aggregation:"all"|"any", items:[{id, kind, activity_id, label, threshold?}]}`
- `POST /api/progress/courses/{id}/criteria` body `{kind, activity_id?, threshold?, aggregation?}` → updated criteria
- `POST /api/progress/activities/{id}/view` body `{user_id}` → cell
- `POST /api/progress/activities/{id}/toggle` body `{user_id}` → cell (manual tick)
- `POST /api/progress/activities/{id}/override` body `{user_id, state, actor_id}` → cell | 403 `{reasons}` (capability-gated)
- `POST /api/progress/courses/{id}/self-complete` body `{user_id}` → `{done:true}` | 403 (only when a self criterion exists)
- `GET /api/progress/snapshots?user_id=&course_id=&from=&to=` →
  `[{id, user_id, course:{id, short_name, deleted}, percent, taken_at, note, source:"snapshot"}]`
  (**works for courses that exist nowhere else — HC-5.**)
