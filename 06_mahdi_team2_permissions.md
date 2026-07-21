# Team 2 — Permissions (Capabilities) Reference

> Generated from the live install (Moodle 5.3dev). For each capability: what it allows, its type, the context it applies in, its risk flags, and **which roles grant it by default in this system** (permission = ALLOW at System context).

## How to read / track a permission

- **Type** — `read` (view only) or `write` (changes data).
- **Context** — the lowest level the capability can be set (it inherits downward).
- **Default roles** — roles that have this as **ALLOW** right now. Empty = nobody has it by default (must be granted).
- **Risk** — what can go wrong if granted (SPAM/PERSONAL/XSS/CONFIG/TRUST/DATALOSS).

**Track any capability live in your system:**
- UI — *Site administration → Users → Permissions → Define roles →* pick a role → search the capability.
- UI — check it for one course: *Course → Participants → Permissions* (`/admin/roles/permissions.php?contextid=<id>`).
- DB — `SELECT r.shortname, rc.permission FROM mdl_role_capabilities rc JOIN mdl_role r ON r.id=rc.roleid WHERE rc.capability='<name>';`
- Code — a capability is checked with `has_capability('<name>', $context, $user)`.

---

## Enrolment methods

Each enrol plugin defines its own capabilities. The pattern is consistent: `:config` (set the method up on a course), `:enrol`/`:enrolself` (add people), `:manage` (edit existing enrolments), `:unenrol` (remove others), `:unenrolself` (leave). These control **membership**, not what a member can do.

| Capability | What it allows | Type | Context | Default roles (ALLOW) | Risk |
|---|---|---|---|---|---|
| `enrol/category:config` | Configure category enrol instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/category:synchronised` | Role assignments synchronised to course enrolment | write | System | *(none)* | — |
| `enrol/cohort:config` | Configure cohort instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/cohort:unenrol` | Unenrol suspended users | write | Course | `manager` | — |
| `enrol/database:config` | Configure database enrol instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/database:unenrol` | Unenrol suspended users | write | Course | `manager` | — |
| `enrol/fee:config` | Configure enrolment on payment enrol instances | write | Course | `manager` | — |
| `enrol/fee:manage` | Manage enrolled users | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/fee:unenrol` | Unenrol users from course | write | Course | `manager` | — |
| `enrol/fee:unenrolself` | Unenrol self from course | write | Course | *(none)* | — |
| `enrol/flatfile:manage` | Manage user enrolments manually | write | Course | *(none)* | — |
| `enrol/flatfile:unenrol` | Unenrol users from the course manually | write | Course | *(none)* | — |
| `enrol/guest:config` | Configure guest access instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/imsenterprise:config` | Configure IMS Enterprise enrol instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/ldap:manage` | Manage LDAP enrol instances | write | Course | `manager` | — |
| `enrol/lti:config` | Configure 'Publish as LTI tool' instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/lti:unenrol` | Unenrol users from the course | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/manual:config` | Configure manual enrol instances | write | Course | `manager` | — |
| `enrol/manual:enrol` | Enrol users | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/manual:manage` | Manage user enrolments | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/manual:unenrol` | Unenrol users from the course | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/manual:unenrolself` | Unenrol self from the course | write | Course | *(none)* | — |
| `enrol/meta:config` | Configure meta enrol instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/meta:selectaslinked` | Select course as meta linked | read | Course | `manager` | — |
| `enrol/meta:unenrol` | Unenrol suspended users | write | Course | `manager` | — |
| `enrol/paypal:config` | Configure PayPal enrol instances | write | Course | `manager` | — |
| `enrol/paypal:manage` | Manage enrolled users | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/paypal:unenrol` | Unenrol users from course | write | Course | `manager` | — |
| `enrol/paypal:unenrolself` | Unenrol self from the course | write | Course | *(none)* | — |
| `enrol/self:config` | Configure self enrol instances | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/self:enrolself` | Self enrol in course | write | Course | `user` | — |
| `enrol/self:holdkey` | Appear as the self enrolment key holder | write | Course | *(none)* | — |
| `enrol/self:manage` | Manage enrolled users | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/self:unenrol` | Unenrol users from course | write | Course | `editingteacher`, `manager`, `teacher1` | — |
| `enrol/self:unenrolself` | Unenrol self from the course | write | Course | `student` | — |

---

## Roles & permissions

The meta-layer: capabilities that let someone hand out or change other people's access. High risk — these are how privilege escalation happens, which is why most are Manager-only.

| Capability | What it allows | Type | Context | Default roles (ALLOW) | Risk |
|---|---|---|---|---|---|
| `moodle/role:assign` | Assign roles to users | write | Course | `editingteacher`, `manager`, `teacher1` | SPAM, PERSONAL, XSS |
| `moodle/role:manage` | Create and manage roles | write | System | `manager` | SPAM, PERSONAL, XSS |
| `moodle/role:override` | Override permissions for others | write | Course | `manager` | SPAM, PERSONAL, XSS |
| `moodle/role:review` | Review permissions for others | read | Course | `editingteacher`, `manager`, `teacher`, `teacher1` | PERSONAL |
| `moodle/role:safeoverride` | Override safe permissions for others | write | Course | `editingteacher`, `teacher1` | SPAM |
| `moodle/role:switchroles` | Switch to other roles | read | Course | `editingteacher`, `manager`, `teacher1` | PERSONAL, XSS |

---

## Cohorts (bulk membership)

Cohorts are site/category-wide sets of users that can be bulk-enrolled (via the `cohort` enrol method) or bulk-assigned roles. Relevant to enrolling people 'by different methods'.

| Capability | What it allows | Type | Context | Default roles (ALLOW) | Risk |
|---|---|---|---|---|---|
| `moodle/cohort:assign` | Add and remove cohort members | write | Category | `manager` | — |
| `moodle/cohort:configurecustomfields` | Configure cohort custom fields | write | System | *(none)* | SPAM |
| `moodle/cohort:manage` | Create, delete and move cohorts | write | Category | `manager` | — |
| `moodle/cohort:view` | View site-wide cohorts | read | Course | `editingteacher`, `manager`, `teacher1` | — |

---

## Groups & groupings

Groups control **visibility/separation**, not permissions. `accessallgroups` is the key one — it lets a user bypass Separate-groups mode and see everyone.

| Capability | What it allows | Type | Context | Default roles (ALLOW) | Risk |
|---|---|---|---|---|---|
| `moodle/course:managegroups` | Manage groups | write | Course | `editingteacher`, `manager`, `teacher1` | XSS |
| `moodle/course:viewhiddengroups` | View hidden groups | READ | Course | `editingteacher`, `manager`, `teacher`, `teacher1` | PERSONAL |
| `moodle/course:creategroupconversations` | Create group conversations | write | Course | `editingteacher`, `manager`, `teacher1` | XSS |
| `moodle/group:configurecustomfields` | Configure group/grouping custom fields | write | System | *(none)* | SPAM |
| `moodle/site:accessallgroups` | Access all groups | read | Activity | `editingteacher`, `manager`, `teacher1` | — |
| `moodle/calendar:managegroupentries` | Manage group calendar entries | write | Course | `editingteacher`, `manager`, `teacher`, `teacher1` | SPAM |

---

## Participants & user visibility

Who can see the roster and how much of each person. Enrol config/review are the buttons on the Participants page.

| Capability | What it allows | Type | Context | Default roles (ALLOW) | Risk |
|---|---|---|---|---|---|
| `moodle/course:viewparticipants` | View participants | read | Course | `editingteacher`, `manager`, `student`, `teacher`, `teacher1` | — |
| `moodle/site:viewparticipants` | View participants | read | System | `manager` | — |
| `moodle/course:enrolconfig` | Configure enrol instances in courses | write | Course | `editingteacher`, `manager`, `teacher1` | PERSONAL |
| `moodle/course:enrolreview` | Review course enrolments | read | Course | `editingteacher`, `manager`, `teacher1` | PERSONAL |

---

## Progress & completion

Viewing and overriding completion — the progress side of the roster tool.

| Capability | What it allows | Type | Context | Default roles (ALLOW) | Risk |
|---|---|---|---|---|---|
| `moodle/course:togglecompletion` | Manually mark activities as complete | write | Activity | `user` | — |
| `moodle/course:overridecompletion` | Override activity completion status | write | Course | `editingteacher`, `manager`, `teacher`, `teacher1` | — |
| `moodle/course:isincompletionreports` | Be shown on completion reports | read | Course | `student` | — |
| `report/completion:view` | View course completion report | read | Course | `editingteacher`, `manager`, `teacher`, `teacher1` | PERSONAL |
| `report/progress:view` | View activity completion reports | read | Course | `editingteacher`, `manager`, `teacher`, `teacher1` | PERSONAL |

---

## Worked examples you can trace (using our real course "hello", id 2)

These answer the app's core question — *"can this user do this action here, and why?"* — using the users already in our install. Each one you can reproduce with the DB query shown.

> Note: our install has a **custom role `teacher1`** (mirrors editingteacher) in addition to the standard roles — visible in the "Default roles" columns above.

### Example 1 — Can `student.a` enrol another person? ❌
- **Capability:** `enrol/manual:enrol` (Course context)
- **student.a's role:** `student`
- **Roles that ALLOW it:** editingteacher, manager, teacher1 — **student is not among them**
- **Result:** **Denied.** `has_capability('enrol/manual:enrol', course_ctx, student.a)` → false.
- **Why:** no role student.a holds grants this capability, and there's no override/PROHIBIT.
- **Trace it:**
  ```sql
  SELECT r.shortname, rc.permission FROM mdl_role_capabilities rc
  JOIN mdl_role r ON r.id=rc.roleid WHERE rc.capability='enrol/manual:enrol';
  ```

### Example 2 — Can `student.a` see the participants list? ✅
- **Capability:** `moodle/course:viewparticipants`
- **Roles that ALLOW it:** editingteacher, manager, **student**, teacher, teacher1
- **Result:** **Allowed** — `student` is in the ALLOW list.
- **Why:** the student role grants this at course context; no PROHIBIT.
- *(But note: if the course used **Separate groups**, the list would be filtered to student.a's own group unless they also had `moodle/site:accessallgroups`.)*

### Example 3 — Can `student.a` mark an activity complete? ✅
- **Capability:** `moodle/course:togglecompletion` (Activity context)
- **Roles that ALLOW it:** `user` (the authenticated-user role — everyone logged in)
- **Result:** **Allowed** — this is why manual self-completion works for any enrolled student.

### Example 4 — Can `teacher1` (our editing teacher) assign roles? ✅ (with a catch)
- **Capability:** `moodle/role:assign`
- **Roles that ALLOW it:** editingteacher, manager, teacher1 → **Allowed.**
- **The catch:** having `role:assign` doesn't mean you can assign *any* role. Which roles you may hand out is a **separate** restriction in `mdl_role_allow_assign`. An editing teacher can typically assign Student/Non-editing teacher but **not** Manager — even though the capability check passes. This is a classic "two systems overlap" case.
  ```sql
  SELECT a.shortname AS can_assign FROM mdl_role_allow_assign ra
  JOIN mdl_role src ON src.id=ra.roleid
  JOIN mdl_role a ON a.id=ra.allowassign
  WHERE src.shortname='editingteacher';
  ```

### The general "and why" recipe (for the app)
1. `has_capability($cap, $context, $user)` → the yes/no.
2. To explain it: walk the context path (Activity → Course → Category → System), list every role the user holds and that role's value for `$cap` at each level.
3. Apply precedence: **PROHIBIT anywhere → No**; else **most-specific value per role**; else **any ALLOW → Yes**; else default No.
4. For role/enrol actions, also check the *second* table (`role_allow_assign`, enrolment status) — the capability is necessary but not always sufficient.

