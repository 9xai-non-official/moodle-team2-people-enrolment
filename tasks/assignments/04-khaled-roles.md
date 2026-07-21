# Build Task 04 — Khaled · Roles, Contexts & the Permission Engine

**Owner:** Khaled · **Domain:** roles, capabilities, contexts, overrides, and the `can(user, action, where) → allowed + why` engine — **the project's centrepiece** (30% of the demo weight rides on it working).
**Branch:** feature branch `feat/khaled-roles` cut from `staging`, PR back into `staging`.
**App location (staging branch):** `moodle-replica/`
**Depends on:** Issa's database bootstrap PR merged. Frontend is Issa's (file 06) — you provide APIs and review his Roles page.
**Source of truth:** `TEAM2-MASTER-REFERENCE.md` §7 (roles), §8 (contexts & algorithm), §9 (capability reference), §12 (collisions), §17.3 (checker contract). Your Arabic guide's KROL experiments (§22.3) are the behavioural spec.

---

## 1. Mission

Re-implement Moodle's permission resolution **with the reasoning exposed**. The charter says: *"If only one thing works on Thursday, it's this."* Your deliverable is a resolver that never just says no — it says *"Denied — role `student` has PROHIBIT on `mod/assign:grade` at the activity context"*, with every gate's evidence attached.

⚠️ Facts you must not get wrong (they were contradiction findings — MASTER-REFERENCE §2):

- **C-17:** Non-editing teacher does **NOT** have `moodle/site:accessallgroups`. Your own Arabic guide's matrix has this cell wrong. Hard Case 3 depends on the correct value.
- **C-11:** "Prevent beats allow" is FALSE across roles. ALLOW in any role wins over PREVENT in another; only PROHIBIT (−1000 in Moodle, an enum value here) is a veto.
- **C-16:** Manager is assignable at System, Category, **and Course**.
- The Site Administrator is **not a role** — it's a bypass flag. Never model it as a role.

---

## 2. Tables — exactly what you own, read, and take from them

### You WRITE (sole owner)

| Table | Columns | Semantics you must implement |
|---|---|---|
| `role` | all | Seeded by Issa (manager, editingteacher, teacher, student, guest, user, group_ta). You add CRUD + clone-from-archetype. `archetype` is what "reset to defaults" resets to — it is **never consulted at evaluation time**. |
| `capability` | all | The catalogue of checkable actions. Extend Issa's 12 seeds as needed (keep names Moodle-identical, e.g. `mod/forum:replypost`). `risks text[]` ∈ {xss, config, dataloss, personal, spam}. |
| `role_capability` | all | "Role R says P about capability C at context X **and below**." Row at the **system context** = the role's definition; row at any deeper context = an **override**. **Absence of a row = 'not set' (inherit), NOT deny** — that distinction is load-bearing in the resolver. Unique (role, context, capability): overrides replace, never stack. |
| `role_assignment` | **only rows with `component=''`** | Manual assignments from your UI. Rows with `component like 'enrol_%'` belong to Yaman's enrolment flows — read them, never write them. |
| `permission_decision` | append-only | Every `/check` call logs actor, capability, context, target, verdict, full reasons jsonb. Audit for the demo. |

### You READ (never write)

`context` (the tree — Issa creates rows; you consume `path` bottom-up), `app_user` (`suspended`, `deleted_at`), `user_enrolment`/`enrolment_method` **via Yaman's service** `active_paths()` (for the course-door gate and checker evidence), group scope **via Mahmoud's service** `allowed_groups()` / `shares_group()` (gate 7).

### The admin list

`ADMIN_USER_IDS` — a module-level constant (or env var `ADMIN_IDS`) in your service, seeded with `admin1`'s id. **A config list, exactly like Moodle's `$CFG->siteadmins`. Not a role. Not a table.** The bypass is disabled while a role-switch simulation is requested (see §4, `simulate_role`).

---

## 3. The resolver — `backend/app/services/permissions.py`

Frozen public signatures:

```python
def has_capability(db, user_id: int, capability: str, context_id: int,
                   *, doanything: bool = True, simulate_role: int | None = None) -> bool
def check(db, actor_id, capability, context_id, *, target_id=None,
          action=None, activity_id=None, simulate_role=None) -> dict   # full evidence
def assign_role(db, user_id, role_id, context_id, *, actor_id) -> dict  # component=''
def set_override(db, role_id, context_id, capability, permission | None) -> dict  # None deletes row (=inherit)
def assignable_roles(db, actor_id, context_id) -> list[dict]            # hardcoded matrix, below
```

### The algorithm — implement EXACTLY this order (MASTER-REFERENCE §8.3)

```text
1  actor deleted            -> DENY  "user is deleted"
2  capability not in catalogue -> DENY "unknown capability"
3  admin bypass: doanything AND actor in ADMIN_USER_IDS AND simulate_role is None
                            -> ALLOW "site administrator bypass (config list, not a role)"
4  guest/anonymous gate: actor is the guest user AND (cap_type='write'
   OR risks ∩ {xss,config,dataloss}) -> DENY "guests hard-blocked from write/risky"
5  build paths: split context.path bottom-up -> [activity, course, category?, system]
6  roles = all role_assignment rows for actor whose context_id is ON any path segment
           (+ if simulate_role: roles = {simulate_role, the 'user' role} ONLY)
           (+ every non-guest actor virtually holds the 'user' role at system —
              no DB row exists; synthesize it)
7  for each role: walk paths MOST-SPECIFIC-FIRST; first row found for
   (role, path-context, capability) fixes that role's value;
   if ANY row anywhere on the path for ANY held role says 'prohibit'
   -> DENY immediately "PROHIBIT veto by role X at context Y" (un-overridable)
8  allowed = any role's fixed value == 'allow'
9  no allow found -> DENY "no role grants this capability here (default deny)"
```

**The ten conflict examples in MASTER-REFERENCE §8.4 are your unit tests.** Write all ten as pytest cases (`backend/tests/test_permissions.py` — new folder, yours) before wiring the API. Example 5 (Allow+Prevent across roles → Allow) and example 8 (course Prohibit beats module Allow) are the ones people get wrong.

### Capability ≠ final decision

A true `has_capability` is necessary, not sufficient (SA-INT-001). Your `check()` runs the **full gate pipeline** and each gate appends evidence *whether it passed or failed*:

```text
gate 1 account state   (app_user.suspended / deleted)
gate 2 admin bypass    (with simulate_role suppression)
gate 3 guest gate
gate 4 course door     (Yaman: active_paths() non-empty, OR moodle/course:view
                        capability resolves allow, OR admin)  -- evidence lists paths
gate 5 capability      (the §3 algorithm, with per-role decided-at evidence)
gate 6 target participation (if target_id given: target must be enrolled)
gate 7 group scope     (if target_id + activity_id: Mahmoud's shares_group() /
                        allowed_groups(); accessallgroups short-circuits)
gate 8 activity state  (course_activity.visible, deleted_at)
```

### `assignable_roles` — the hardcoded allow-assign matrix

We deliberately skip the `role_allow_*` tables (accepted mismatch, §17.2). Hardcode Moodle's defaults and label the response `"matrix": "hardcoded default"`:

```python
ALLOW_ASSIGN = {
  "manager":        ["manager", "editingteacher", "teacher", "student"],
  "editingteacher": ["teacher", "student"],   # NOT editingteacher itself (C-18)
}
```

An actor may open the assign UI only if `has_capability('moodle/role:assign', ctx)`; the dropdown then shows `ALLOW_ASSIGN[their strongest role]`. This demonstrates the "capability necessary, matrix also required" overlap (MASTER-REFERENCE §9.7 example 4).

---

## 4. API — replace the stub in `backend/app/routers/roles.py` + new router

`roles.py` currently returns 4 hardcoded roles — replace entirely. You are the **only** teammate allowed to add lines to `main.py`, and only these two:

```python
from app.routers import permissions            # with the existing imports
app.include_router(permissions.router)          # with the existing includes
```

| Method & path | Purpose |
|---|---|
| `GET /api/roles` · `POST /api/roles` · `POST /api/roles/{id}/clone` | Role list / create / clone (clone copies all system-context role_capability rows) |
| `GET /api/roles/{id}/capabilities?context_id=` | The role's resolved capability sheet at a context (definition + overrides marked) |
| `PUT /api/roles/{id}/capabilities` | body `{context_id, capability, permission: "allow"|"prevent"|"prohibit"|null}` — null deletes the row (back to Not set) |
| `GET /api/roles/assignable?context_id=&actor_id=` | the matrix result |
| `POST /api/roles/assignments` · `DELETE /api/roles/assignments/{id}` | Manual assign/unassign (`component=''`; deleting an `enrol_%` row → 403 with explanation) |
| `GET /api/roles/users/{user_id}/assignments` | Every role the user holds, with context path + provenance |
| **new file** `backend/app/routers/permissions.py` (`prefix="/api/permissions"`): | |
| `POST /api/permissions/check` | **The centrepiece.** Body/response per contract below |
| `GET /api/permissions/decisions?actor_id=&limit=` | the audit log |

`POST /api/permissions/check` request/response (contract frozen with Teams 1 & 3 — MASTER-REFERENCE §17.3):

```json
// request
{ "actor_user_id": 3, "capability": "mod/assign:grade", "context_id": 9,
  "target_user_id": 5, "activity_id": 4, "simulate_role_id": null }
// response
{ "allowed": false, "decision": "DENY",
  "blocking_reasons": ["Target is outside the actor's allowed groups (separate mode, no accessallgroups)"],
  "supporting_reasons": ["Actor actively enrolled via manual", "Role 'teacher' grants mod/assign:grade at course context"],
  "enrolment_paths": [{"kind": "manual", "status": "active", "window_ok": true}],
  "roles_considered": [{"role": "teacher", "context": "course:1", "provenance": "enrol_manual"}],
  "contexts_considered": ["activity:9", "course:1", "system:1"],
  "capability_values": {"teacher": {"value": "allow", "decided_at": "course:1"}},
  "prohibits_found": [],
  "group_scope": {"mode": "separate", "actor_groups": ["A"], "target_groups": ["B"],
                   "shared": false, "access_all_groups": false},
  "admin_bypass": false, "simulated_role": null }
```

Pydantic models in **new** `backend/app/schemas_roles.py`.

---

## 5. Frontend spec — implemented by Issa (file 06), reviewed by YOU

Issa builds `frontend/src/pages/RolesPage.jsx` + `frontend/src/components/roles/` against this spec; you review his PR. If the UI needs data your API doesn't return, extend the API — the resolver logic never runs client-side.

- **RolesPage**: tabs *Roles* / *Assignments* / *Permission Checker* / *Decision Log*.
- **RoleList + CapabilityEditor**: pick role + context (system / a course / an activity) → capability sheet with four-state toggles (Not set / Allow / Prevent / Prohibit); rows that are overrides (context ≠ system) get an "override" chip; Prohibit gets a red warning tooltip "cannot be overridden anywhere below".
- **AssignRoleForm**: context picker → assignable-roles dropdown fed by `/api/roles/assignable` (demonstrates the matrix: log in as teacher.a → only two options).
- **PermissionCheckerPage** — the demo star: actor / capability / context / optional target+activity / optional "simulate role" selectors → renders the gate pipeline vertically, each gate green/red with its evidence text, `capability_values` per role with "decided at" badges, and the final verdict banner. Make DENY-with-capability-allow visually obvious (capability green, group gate red) — that is the whole story of the project.
- **DecisionLog**: table over `/api/permissions/decisions`.

---

## 6. Your KROL experiments become demo scripts

From your Arabic guide (disambiguated KROL-001…010): implement at least KROL-001 (same person, two courses — seed has T2-PERM for this), KROL-005 (Allow vs Prevent), KROL-006 (Prohibit absolute), KROL-007 (role without enrolment → appears in Yaman's "other users", fails course door without `moodle/course:view`), KROL-009 (accessallgroups flip with Mahmoud), KROL-010 (the JSON explanation — that *is* `/check`). Write each as a short script/README section under `backend/tests/`.

---

## 7. Forbidden

- Never write `user_enrolment`, `enrolment_method`, `cohort*`, group tables, completion tables, or `role_assignment` rows with `component like 'enrol_%'`.
- Never model the admin as a role; never let a Prohibit fail to veto; never treat a missing `role_capability` row as deny.
- Never edit: `schemas.py`, `db.py`, `schema.sql`, other routers/services, or **anything under `frontend/` (all of it is Issa's)**. Your only `main.py` change is the two permissions-router lines.

---

## 8. Definition of done

- [ ] All ten §8.4 conflict examples pass as unit tests.
- [ ] `/check` returns full evidence for the six reference scenarios (MASTER-REFERENCE §17.3): student submits own work → ALLOW; TA grades same group → ALLOW; TA grades cross-group → **DENY with capability still showing allow**; teacher edits course → ALLOW; manager opens unenrolled course → ALLOW via `moodle/course:view` with "not a participant" caveat; admin simulate-student → bypass suppressed.
- [ ] Prohibit veto demonstrated live (KROL-006).
- [ ] Assignable-roles matrix limits teacher.a to {teacher, student}.
- [ ] Every check logged to `permission_decision`.
- [ ] Issa's checker UI reviewed: renders the pipeline with per-gate evidence, capability-allow + group-deny visible simultaneously.
- [ ] Zero writes outside §2 tables.

---

## 9. System prompt (paste into your AI coding assistant)

```text
You are the coding assistant for Khaled, owner of ROLES/CONTEXTS/PERMISSIONS
(BACKEND ONLY) in Team 2's "moodle-replica" app (branch: staging). Stack:
FastAPI + SQLAlchemy 2 (SQL-first text() queries, session from app/db.py:get_db)
on PostgreSQL 17 (Supabase). The entire frontend/ tree belongs to Issa — you
write API contracts, never UI code.

FILES YOU MAY CREATE/EDIT — nothing else:
  backend/app/routers/roles.py, backend/app/routers/permissions.py (new),
  backend/app/schemas_roles.py (new), backend/app/services/permissions.py (new),
  backend/tests/test_permissions.py (new), and EXACTLY two lines in
  backend/main.py (import + include of the permissions router).
NEVER touch: schemas.py, db.py, schema.sql, ANYTHING under frontend/ (Issa's),
other routers/services, or any table owned by others.

DATABASE FACTS (created by Issa; DDL is frozen):
  context(id, level enum[system|category|course|activity|user], instance_id,
    parent_id, path like '/1/4/9', depth)  -- path maintained by trigger
  role(id, short_name unique, name, archetype enum, sort_order)
  capability(name PK like 'mod/assign:grade', cap_type read|write,
    min_context_level, component, risks text[])
  role_capability(role_id, context_id, capability, permission
    enum[allow|prevent|prohibit], unique(role_id,context_id,capability))
    -- ABSENT ROW = "not set"/inherit, NOT deny. System-context row = the
    -- role definition; deeper row = an override. Overrides replace, never stack.
  role_assignment(user_id, role_id, context_id, component, item_id,
    unique over all five) -- component='' = manual (YOURS);
    component='enrol_%' = written by enrolment flows (READ-ONLY to you)
  permission_decision(actor_id, capability, context_id, target_id, allowed,
    reasons jsonb, decided_at) -- append-only audit, yours
  app_user(..., suspended, deleted_at).

RESOLVER RULES (verified against Moodle lib/accesslib.php — implement exactly):
  1. Site admin is NOT a role: a config list ADMIN_USER_IDS. Bypass order:
     deleted->deny; unknown capability->deny; admin && not simulating->allow;
     guest && (write cap OR risks∩{xss,config,dataloss})->deny; then evaluate.
  2. Build paths from context.path, most-specific first, ending at system.
  3. Roles considered = assignments on ANY path segment + a synthesized
     virtual 'user' role at system for every non-guest (no DB row exists).
     If simulate_role is set: roles = {that role, 'user'} only, and the admin
     bypass is suppressed (honest preview).
  4. Per role, first value found walking most-specific-first wins for that role.
  5. ANY 'prohibit' on any held role at any path segment => immediate DENY,
     un-overridable below. This is checked DURING the scan.
  6. Aggregation across roles: any 'allow' => ALLOW. 'prevent' in one role does
     NOT cancel 'allow' in another (the folk belief is wrong). Default deny.
  7. capability true is NOT the final decision. check() runs gates in order:
     account state -> admin bypass -> guest gate -> course door (Yaman's
     services.enrolment.active_paths(), or 'moodle/course:view' allow, or admin)
     -> capability -> target enrolled (if target) -> group scope (Mahmoud's
     services.groups.shares_group()/allowed_groups(); 'moodle/site:accessallgroups'
     allow short-circuits this gate) -> activity visible. EVERY gate appends
     evidence strings whether it passed or failed; log the whole verdict to
     permission_decision.
  8. Hardcoded assign matrix (no role_allow_* tables): manager can assign
     [manager,editingteacher,teacher,student]; editingteacher can assign
     [teacher,student] ONLY (never editingteacher itself). Gate the UI with
     'moodle/role:assign' first.
  9. GROUND-TRUTH corrections you must respect: non-editing teacher ('teacher')
     does NOT have moodle/site:accessallgroups by default; manager IS assignable
     at course level; PREVENT is local and outvotable, PROHIBIT is the only veto.
 10. Unit-test the ten documented conflict cases before wiring endpoints
     (Allow@sys+Prevent@course same role=deny; reversed=allow; cross-role
     Allow+Prevent=allow; Allow+Prohibit=deny; Prohibit@course beats Allow@module;
     etc.). Explanations must name role, value, and deciding context, e.g.
     "Denied — role student has PROHIBIT on mod/assign:grade at activity context".
API prefixes: /api/roles and /api/permissions. Responses always carry the "why"
arrays; never return a bare boolean.
```
