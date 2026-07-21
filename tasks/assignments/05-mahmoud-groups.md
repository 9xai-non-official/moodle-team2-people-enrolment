# Build Task 05 — Mahmoud · Groups, Groupings & Visibility Scope

**Owner:** Mahmoud · **Domain:** groups, group membership, groupings, group modes, and the group-scope service that feeds the permission engine (Hard Cases 3 & 4)
**Branch:** feature branch `feat/mahmoud-groups` cut from `staging`, PR back into `staging`.
**App location (staging branch):** `moodle-replica/`
**Depends on:** Issa's database bootstrap PR merged; Yaman's `services/enrolment.py` merged (you need `is_active_enrolled`). Frontend is Issa's (file 06) — you provide APIs and review his Groups page.
**Source of truth:** `TEAM2-MASTER-REFERENCE.md` §10 (groups), §12, §13 (HC 3–4), your findings in `notes/groups-groupings.md` (rules GRP-001/002/006/012) and your task guide `tasks/mahmoud-groups-groupings-task-guide.md`.

---

## 1. Mission

Build the **third system**: groups never grant or remove capabilities — they decide **who sees whom and whose records an action can touch**. Your service is "the second gate": Khaled's checker says *the role permits grading*; your service says *but only these students are reachable*. Get this right and Hard Cases 3 and 4 fall out naturally.

The sentence that rules your domain (your own guide §23):
> The Role grants the general ability; the activity's Separate-Groups policy limits the students the actor can reach; the target being outside the actor's permitted group scope means the capability may be allowed while the specific operation is denied or filtered.

Three concepts you must never conflate (rule GRP-002 is the schema proof):
- **Cohort** — site-level bag of *users*, drives enrolment (Yaman's).
- **Group** — course-internal set of *enrolled users*, affects visibility/scope.
- **Grouping** — a named set of *groups* (never users — `grouping_group` has no user column).

---

## 2. Tables — exactly what you own, read, and take from them

### You WRITE (sole owner)

| Table | Columns | Semantics you must implement |
|---|---|---|
| `course_group` | all | One row per group per course. `enrolment_key` — if set and the self-enrol method has `use_group_keys`, Yaman's flow lands the user in this group (he calls YOUR service). `visibility` 0–3 (all/members/own/none) and `participation` are membership-privacy — a **different dimension** from group mode; never mix them. |
| `group_member` | all | One row per (group, user); PK (group_id, user_id); a user may be in many groups of one course (Hard Case 4). `component`/`item_id`: `''` = human-added; `'enrol_cohort'/'enrol_self'` = machine-added by Yaman **through your function**. |
| `grouping`, `grouping_group` | all | Groupings contain groups only. Deleting a grouping never deletes its groups. |
| `course_activity.group_mode`, `course_activity.grouping_id` | those two columns only | Per-activity mode (`NULL` = inherit course) and optional grouping restriction. The rest of `course_activity` is Issa's projection — untouched. |

### You READ (never write)

`course.group_mode`, `course.force_group_mode` (course-level policy — set via Issa's sync/seed; if the demo needs a toggle, expose it as a PATCH that Issa's sync module applies — coordinate, don't write `course` yourself), `user_enrolment` **via Yaman's service** (the enrolment guard), `role_capability` **via Khaled's service** (`has_capability(..., 'moodle/site:accessallgroups', ...)` for scope decisions).

---

## 3. The service you must export — `backend/app/services/groups.py`

These are called by Yaman (enrol flows), Khaled (gate 7), and Mahdi (report scoping). Freeze the signatures Day 1:

```python
def add_member(db, group_id, user_id, *, component='', item_id=0) -> dict
    # GUARD: refuse unless enrolment.is_active_enrolled(user, the group's course)
    # -> {"ok": False, "reason": "user has no active enrolment in this course"}
    # (faithful to Moodle's groups_add_member is_enrolled guard — rule SA-GRP-004)
def remove_member(db, group_id, user_id, *, force=False) -> dict
    # component-owned rows refuse normal removal unless force (rule SA-GRP-006)
def remove_members_by_provenance(db, course_id, user_id, component, item_id) -> int
    # Yaman calls on single-path unenrol
def remove_all_memberships(db, course_id, user_id) -> int
    # Yaman calls on LAST-path unenrol (whole-course cleanup)
def user_groups(db, user_id, course_id) -> list[dict]
def effective_group_mode(db, activity_id) -> str        # THE rule below
def allowed_groups(db, user_id, activity_id) -> list[dict]
def shares_group(db, actor_id, target_id, activity_id) -> dict
    # {"shared": bool, "mode": ..., "actor_groups": [...], "target_groups": [...],
    #  "access_all_groups": bool, "reasons": [...]}
def group_access_check(db, actor_id, target_id, activity_id, action) -> dict
    # the full §5 decision with reasons — used by your endpoint AND Khaled's gate 7
```

### Behaviour rules (each verified — cite when demoing)

1. **Effective mode** (your confirmed rule GRP-012, `grouplib.php:743`):
   `force_group_mode` on the course ⇒ course mode wins for **every** activity, the activity's own setting is silently ignored; otherwise activity mode, falling back to course mode when the activity's is NULL. Always return both `configured_mode` and `effective_mode` + `course_mode_forced` so the UI can show the "silently ignored" case.
2. **Allowed groups** (your rule GRP-006, `grouplib.php:770–782/1188`):
   effective mode `visible` **or** actor has `accessallgroups` ⇒ ALL groups (of the activity's grouping if set, else the course) + "all participants"; effective mode `separate` without the capability ⇒ **only the actor's own groups**; mode `none` ⇒ no filtering at all (rule SA-GRP-014).
3. **Grouping restriction:** if `course_activity.grouping_id` is set, the group universe for that activity is only the grouping's groups; a user whose groups are all outside the grouping effectively has **no group there**.
4. **`accessallgroups` widens visibility/scope — it never grants the action.** Grading still requires `mod/assign:grade` (Khaled's gate 5). Two systems; do not merge them.
5. **No membership history exists** (rule SA-GRP-015): moving a student between groups re-filters everything by *current* membership; nothing stores "group at submission time". Faithful behaviour — document it in the UI (a tooltip on the member list), don't secretly fix it.
6. **Multi-membership** (Hard Case 4): `student.multi` is in A and B by seed; `allowed_groups` returns both; any group filter containing either shows him; nothing deduplicates him into one "primary" group.

---

## 4. API — replace the stub in `backend/app/routers/groups.py`

Current stub (take from staging): `APIRouter(prefix="/api/groups")` with in-memory `list_groups(courseid)`. Replace entirely. **Do not touch `main.py`** — your router is already wired.

| Method & path | Purpose |
|---|---|
| `GET /api/groups?course_id=` | Groups of a course with member counts + visibility/participation flags |
| `POST /api/groups` · `PATCH /api/groups/{id}` · `DELETE /api/groups/{id}` | CRUD (delete removes memberships, never users/enrolments — rule GRP-001: identity and membership are separate records) |
| `GET /api/groups/{id}/members` | Members with provenance chips (manual / enrol_cohort / enrol_self) |
| `POST /api/groups/{id}/members` | body `{user_id}` → `add_member` (surface the enrolment-guard refusal verbatim) |
| `DELETE /api/groups/{id}/members/{user_id}?force=` | `remove_member` (component-owned → 409 unless force, with reason) |
| `GET /api/groups/groupings?course_id=` · `POST` · `POST /groupings/{id}/groups` · `DELETE /groupings/{id}/groups/{group_id}` | Grouping CRUD + composition |
| `PATCH /api/groups/activities/{activity_id}` | body `{group_mode?, grouping_id?}` — your two columns |
| `GET /api/groups/activities/{activity_id}/policy` | `{configured_mode, effective_mode, course_mode_forced, grouping}` — rule GRP-012 as an endpoint |
| `GET /api/groups/activities/{activity_id}/allowed?user_id=` | `allowed_groups` result |
| `POST /api/groups/access-check` | body `{actor_user_id, target_user_id, activity_id, action}` → the full `group_access_check` verdict (contract below) |

`POST /api/groups/access-check` response (frozen — Khaled's gate 7 and Team 3 both consume it; from your guide §17):

```json
{ "visible": false, "action_allowed": false,
  "group_mode": "separate", "course_mode_forced": false,
  "actor_groups": ["Group A"], "target_groups": ["Group B"],
  "access_all_groups": false,
  "reasons": [
    "The activity uses Separate Groups.",
    "The actor and target do not share an allowed Group.",
    "The actor does not have access-all-groups." ] }
```

Pydantic models in **new** `backend/app/schemas_groups.py`.

---

## 5. Hard Cases you own end-to-end

**HC-3 — the three-outcome TA** (with Khaled): seed gives you `ta.a` (teacher role, Group A, no accessallgroups) and `ta.allgroups`. Demo on Assignment SG (separate mode): `access-check(ta.a → student.a)` → allowed (shared group); `(ta.a → student.b)` → **denied with the three reasons** while Khaled's capability gate still shows `mod/assign:grade = allow` — the money shot; `(ta.a → student.c)` with Group C outside the "Assignment Groups" grouping → not even visible. `(ta.allgroups → anyone)` → allowed via accessallgroups. If a *single* activity cannot produce all three outcomes at once, present it as two configurations honestly — your guide's instruction: **do not force the expected result**.

**HC-4 — student in two groups**: `student.multi` in A and B; show `allowed_groups` under each mode, and that a teacher's group filter for A *and* the filter for B both list him, with no duplicate records created.

---

## 6. Frontend spec — implemented by Issa (file 06), reviewed by YOU

Issa builds `frontend/src/pages/GroupsPage.jsx` + `frontend/src/components/groups/` against this spec; you review his PR. If the UI needs data your API doesn't return, extend the API — scope logic never runs client-side.

- **GroupsPage**: course selector → tabs *Groups* / *Groupings* / *Activity policy* / *Scope check*.
- **GroupsBoard**: three-column card layout (a card per group: name, member chips with provenance badges, enrolment-key indicator, add/remove member controls; removal of machine-owned members shows the 409 reason + force option).
- **GroupingPanel**: groupings with drag-or-click group composition; a banner repeating "groupings contain groups, not users".
- **ActivityPolicyTable**: every activity × {configured mode, effective mode, forced?, grouping} — highlight rows where configured ≠ effective (the GRP-012 surprise).
- **ScopeCheckPanel**: actor + target + activity pickers → renders the access-check verdict with the reasons list; side-by-side "as ta.a / as ta.allgroups" toggle for the HC-3 demo.

---

## 7. Forbidden

- Never write `user_enrolment`, `enrolment_method`, `cohort*`, `role_*`, `capability`, any completion table, or `course` columns.
- Never bypass the enrolment guard in `add_member` — it is the load-bearing difference between cohort (site bag) and group (course partition).
- Never invent membership history storage (out of scope — documented limitation), and never dedupe multi-membership.
- Never edit: `main.py`, `schemas.py`, `db.py`, `schema.sql`, other routers/services, or **anything under `frontend/` (all of it is Issa's)**.

---

## 8. Definition of done

- [ ] `services/groups.py` exports the frozen signatures; Yaman/Khaled/Mahdi confirmed imports.
- [ ] `add_member` refuses non-enrolled users with the exact reason string; component-owned removal protected.
- [ ] Effective-mode logic passes: forced course mode overrides activity mode; NULL inherits.
- [ ] `allowed_groups` correct for all four seeded personas across the three modes (write a pytest table for ta.a, ta.allgroups, student.multi, student.c).
- [ ] HC-3 three verdicts + HC-4 walkthrough reproducible from Issa's UI (you review his Groups page against §6).
- [ ] Khaled's gate 7 consumes `shares_group()` (integration verified together).
- [ ] Zero writes outside §2.

---

## 9. System prompt (paste into your AI coding assistant)

```text
You are the coding assistant for Mahmoud, owner of GROUPS/GROUPINGS/SCOPE
(BACKEND ONLY) in Team 2's "moodle-replica" app (branch: staging). Stack:
FastAPI + SQLAlchemy 2 (SQL-first text() queries, session from app/db.py:get_db)
on PostgreSQL 17 (Supabase). The entire frontend/ tree belongs to Issa — you
write API contracts, never UI code.

FILES YOU MAY CREATE/EDIT — nothing else:
  backend/app/routers/groups.py, backend/app/schemas_groups.py (new),
  backend/app/services/groups.py (new), backend/tests/test_groups.py (new).
NEVER touch: main.py, schemas.py, db.py, schema.sql, ANYTHING under frontend/
(Issa's), other routers/services, or tables owned by others.

DATABASE FACTS (created by Issa; DDL frozen):
  course_group(id, course_id, name, id_number, enrolment_key,
    visibility 0..3, participation bool, unique(course_id,name))
  group_member(group_id, user_id PK pair, component, item_id, added_at)
  grouping(id, course_id, name), grouping_group(grouping_id, group_id PK pair)
    -- deliberately NO user column: groupings contain groups, never users
  course_activity(..., group_mode enum[none|separate|visible] NULL=inherit,
    grouping_id) -- you own ONLY these two columns
  course(group_mode, force_group_mode) -- READ-ONLY to you
  Enrolment facts via services.enrolment (Yaman): is_active_enrolled(user,course).
  Capability facts via services.permissions (Khaled):
    has_capability(user,'moodle/site:accessallgroups', activity_context).

DOMAIN RULES (verified against Moodle lib/grouplib.php + group/lib.php):
  1. Groups NEVER grant or deny capabilities. They filter VISIBILITY and the
     TARGET SET of actions. Your outputs are scope verdicts, not permissions.
  2. add_member GUARD: refuse any user without an ACTIVE enrolment in the
     group's course (Moodle groups_add_member is_enrolled guard). Return
     {"ok":false,"reason":"user has no active enrolment in this course"}.
  3. Effective mode = course.force_group_mode ? course.group_mode
     : (activity.group_mode ?? course.group_mode). Always report
     configured_mode, effective_mode, course_mode_forced separately.
  4. allowed_groups(user, activity): universe = grouping's groups if
     activity.grouping_id set, else all course groups. mode 'visible' OR
     has accessallgroups -> whole universe (+"all participants");
     'separate' without it -> only the user's own groups; 'none' -> no
     filtering. accessallgroups widens SCOPE only — it never grants grading.
  5. shares_group(actor,target,activity): under effective 'separate' without
     accessallgroups, action targets must share >=1 allowed group; 'visible'
     -> visible=true but action_allowed only if shared or accessallgroups;
     'none' -> everything true. Return reasons[] strings verbatim like:
     "The activity uses Separate Groups." / "The actor and target do not share
     an allowed Group." / "The actor does not have access-all-groups."
  6. Provenance: component=''=human row; 'enrol_cohort'/'enrol_self' rows are
     machine-owned -> remove_member refuses without force=true (409 + reason);
     remove_members_by_provenance / remove_all_memberships exist for Yaman's
     unenrol flows. You are the ONLY writer of group_member; others go through
     your functions.
  7. A user can be in MANY groups of one course (PK group_id+user_id only).
     Never dedupe; group filters may list the same person under several groups.
  8. No membership history exists and you must not invent it — current
     membership decides everything; state this limitation in UI tooltips.
  9. Deleting a group deletes memberships only (identity vs membership are
     separate records); deleting a grouping never deletes groups.
 10. Groups' `visibility`(0 all/1 members/2 own/3 none)+`participation` are a
     SEPARATE privacy dimension from group mode — expose them as flags, never
     mix them into mode logic.
API prefix stays /api/groups. The /access-check response contract is frozen
(consumed by Khaled's checker gate 7 and Team 3) — never rename its fields.
Write pytest cases for the persona × mode matrix before UI work.
```
