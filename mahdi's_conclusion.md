# Team 2 — People & Enrolment: The Three Systems and How They Collide

**Owner:** Mahdi
**Team:** Team 2 — People and Enrolment (Yaman anchor · Issa · Khaled · Mahmoud · Mahdi)
**Scope:** Enrolment methods, roles & permissions, groups, and how Moodle resolves the overlap between them
**Instance under test:** Moodle 5.3dev (Build 20260714), MariaDB, prefix `mdl_`
**Status legend:** ✅ Confirmed (code/DB) · 🟡 Plausible (needs a second check) · ❓ Unknown

---

## 0. The one-paragraph conclusion

Our domain is **three independent systems** — *enrolment*, *roles/permissions*, and *groups* — plus **one question** that ties them together:

```
Enrolment  ─┐
Roles      ─┼──►  "Can THIS user do THIS action in THIS course — and why?"  ──► Progress
Groups     ─┘
```

They overlap **without being the same thing**. Membership (enrolment) is not the same as capability (roles), and neither controls visibility (groups). A rule in one system can contradict a rule in another; Moodle has a fixed precedence for resolving each clash (Section 4).

---

## 1. System 1 — Enrolment: *how a person gets into a course*

Enrolment answers "is this person a member of this course," and it is **separate from what role they hold**.

### 1.1 Enrolment methods (plugins) ✅
The codebase ships 13 methods; **4 are enabled site-wide** in our install (`mdl_config.enrol_plugins_enabled`):

| Enabled here | Also available (disabled) |
|---|---|
| `manual`, `self`, `guest`, `cohort` | `meta`, `category`, `database`, `flatfile`, `imsenterprise`, `ldap`, `lti`, `fee`, `paypal` |

- **manual** – teacher/admin adds people.
- **self** – students enrol themselves (optional enrolment key).
- **cohort** – sync a site-wide cohort into the course.
- **guest** – read-only entry, not real membership.
- **meta** – "linked course": enrolments flow automatically from a parent course.

### 1.2 The data model — three tables, not one ✅
```
mdl_enrol            → one row per (course, method instance)
mdl_user_enrolments  → one row per (user, enrol instance)   ← the actual membership
mdl_role_assignments → one row per (user, role, context)    ← what they can do
```
**Enrolment ≠ role.** `user_enrolments` says you are *a member*; `role_assignments` says you are *a student/teacher*. The enrol plugin normally writes both, but they live in different tables and **can drift apart** (Section 4).

### 1.3 Status & time gotchas ✅
- `mdl_enrol.status`: **0 = enabled, 1 = disabled** (inverted from intuition).
- `mdl_user_enrolments.status`: **0 = active, 1 = suspended**. A suspended enrolment keeps the row but **cuts off access**.
- `timestart` / `timeend`: enrolment can be time-boxed.

### 1.4 Example — enrol instances on course "hello" (id 2) ✅
| instance | method | status |
|---|---|---|
| 1 | manual | enabled (0) |
| 2 | guest | disabled (1) |
| 3 | self | disabled (1) |

### 1.5 Example — the roster join (enrolment ⋈ role) ✅
| user | method | enrol status | role | assigned at |
|---|---|---|---|---|
| admin | manual | active | editingteacher | Course (50) |
| teacher1 | manual | active | editingteacher | Course (50) |
| yamanoe | manual | active | editingteacher | Course (50) |
| mahdi | manual | active | student | Course (50) |
| yaman | manual | active | student | Course (50) |
| student.a | manual | active | student | Course (50) |

---

## 2. System 2 — Roles & permissions: *what you can do*

### 2.1 The pieces ✅
- **Roles** (`mdl_role`): manager, coursecreator, editingteacher, teacher (non-editing), student, guest, authenticated user, frontpage.
- **Capabilities** (`mdl_capabilities`): **754** in this install (e.g. `mod/forum:addquestion`, `moodle/course:update`). Each is one yes/no action.
- **Contexts** (`mdl_context`) form a **tree**, general → specific:

| Context | Level |
|---|---|
| System | 10 |
| User | 30 |
| Category | 40 |
| Course | 50 |
| Module (activity) | 70 |
| Block | 80 |

- A **role assignment** happens *in a context*. A role given at Course level applies to everything inside the course, because permissions **inherit down the tree**.
- An **override** (`mdl_role_capabilities` at a specific context) tweaks a role's capability just for that context.

### 2.2 Permission values (from `lib/accesslib.php`) ✅
| Constant | Value | Meaning |
|---|---|---|
| `CAP_INHERIT` | 0 | not set — inherit from parent context |
| `CAP_ALLOW` | 1 | grant |
| `CAP_PREVENT` | −1 | deny, but overridable in a more specific context |
| `CAP_PROHIBIT` | −1000 | deny hard — **cannot** be overridden anywhere |

### 2.3 How `has_capability()` actually resolves — verified in code ✅
From `has_capability()` in `lib/accesslib.php`:

1. Build the **context path**: current context + all ancestors, ordered **most-specific → system**.
2. Collect **every role** the user holds along that path.
3. For each role, take the capability's value at the **most specific context** where it is defined.
4. **If any role, at any context in the path, is `PROHIBIT` → return `false` immediately.**
5. Otherwise **if any role resolves to `ALLOW` → allowed.** No `ALLOW` and no `PROHIBIT` → denied (default deny).

```php
if ($perm === CAP_PROHIBIT) return false;               // prohibit wins, always
$allowed = ($allowed or $roles[$roleid] === CAP_ALLOW);  // any ALLOW across roles → yes
return $allowed;
```

### 2.4 ⭐ The non-obvious rule (matters for the app) ✅
When a user has **two roles in the same context**, one `ALLOW` and one `PREVENT`, **`ALLOW` wins** — the code ORs the allows together. `PREVENT` only actually removes a permission when it sits at a **more specific context** (or in the same role) than the allow. The **only** value that guarantees denial regardless of other roles is **`PROHIBIT`**. The common belief "prevent beats allow" is **wrong** for multi-role resolution.

**Precedence:** `PROHIBIT` > (most-specific-context, per role) > **union of `ALLOW` across roles** > default deny.

---

## 3. System 3 — Groups & groupings: *who sees whom*

Groups do **not** grant or remove capabilities — they control **visibility and separation** of people/activity within a course.

### 3.1 Group mode (`mdl_course.groupmode`, or per-activity) ✅
| Mode | Value | Effect |
|---|---|---|
| No groups | 0 | everyone is one pool |
| Separate groups | 1 | you see only members/posts of **your own** group |
| Visible groups | 2 | you work in your group but can **see** others |

- `groupmodeforce` (course): if set, the course mode **overrides** every activity's own group mode.
- **Groupings** (`mdl_groupings`) are *groups of groups* — restrict an activity to certain groups, or deliver different content per grouping.
- Membership: `mdl_groups` (the groups) + `mdl_groups_members` (who's in them).

Course "hello": `groupmode = 0`, `groupmodeforce = 0`, **0 group members** — groups not yet exercised.

### 3.2 The subtlety ✅
Separate-groups can **hide** a participant a role would otherwise let you see. A non-editing teacher confined to Group A won't see Group B's students — even with `moodle/course:viewparticipants` = ALLOW — unless they also have `moodle/site:accessallgroups`. Capability says "yes," group mode says "not those people."

---

## 4. The hard part — contradictions and who wins ✅

| Contradiction | Resolution |
|---|---|
| **Enrolled but suspended** (`user_enrolments.status=1`) while role = teacher | Access **cut off** — suspension gates entry before capabilities matter. Role is irrelevant while suspended. |
| **Role but no enrolment** (e.g. teacher assigned at *Category*) | Can access/manage via capability, but is **not "enrolled"** → absent from gradebook/roster as a participant, no completion tracking. `is_enrolled()`=false, `has_capability()`=true. |
| **Enrolled but no role** | Member (roster, completion tracked) but may **lack capabilities** — sees the course, can't participate. |
| **Two roles, ALLOW vs PREVENT** (same context) | **ALLOW wins** (union), unless a PROHIBIT exists. |
| **ALLOW at course vs PREVENT at activity** (same role) | **Most specific wins** → PREVENT at the activity. |
| **Any PROHIBIT anywhere in the path** | **Hard deny**, overrides everything below. |
| **"See participants" capability vs Separate groups** | Group separation **hides** them, unless `moodle/site:accessallgroups`. |

Four look-alike checks that are **not** the same:
- `is_enrolled($context, $user)` → membership.
- `is_enrolled($context, $user, '', true)` → **active** membership (not suspended).
- `has_capability($cap, $context, $user)` → permission (independent of enrolment).
- **Participants list** = enrolled **and** holds a role with a student-ish archetype.

---

## 5. Mapping to our application (roster + progress + "can-do-and-why")

| App feature | Moodle source of truth |
|---|---|
| **Enrol by different methods** | create/enable `mdl_enrol` instances per method; enrol via each plugin's `enrol_user()` |
| **Roster** | `user_enrolments` ⋈ `enrol` ⋈ `role_assignments` ⋈ `groups_members` (the join in 1.5) |
| **"Can user X do action Y, and why?"** | `has_capability(Y, ctx, X)` for the answer; for *why*, walk the context path and list each role's contributing value, flagging any PROHIBIT / most-specific override — i.e. re-implement the accesslib loop as an **audit trail** |
| **Show progress** | the completion system (see `05_mahdi_completion_conclusions.md`); note completion only tracks **enrolled, active, role-bearing** users |

The distinctive requirement — *"and why"* — is the accesslib loop turned into an explanation, e.g.:
> *Denied — role `student` has PROHIBIT on `mod/x:submit` at the activity context.*
> *Allowed — role `editingteacher` grants ALLOW at course context and no PROHIBIT exists.*

---

## 6. Constants quick-reference ✅

| Group | Constant | Value |
|---|---|---|
| Permission | INHERIT / ALLOW / PREVENT / PROHIBIT | 0 / 1 / −1 / −1000 |
| Context | SYSTEM / USER / COURSECAT / COURSE / MODULE / BLOCK | 10 / 30 / 40 / 50 / 70 / 80 |
| Group mode | NOGROUPS / SEPARATEGROUPS / VISIBLEGROUPS | 0 / 1 / 2 |
| `mdl_enrol.status` | enabled / disabled | 0 / 1 |
| `mdl_user_enrolments.status` | active / suspended | 0 / 1 |

---

## 7. Open questions / leads

- ❓ Exact interaction of **meta enrolment** + suspension propagation from parent course.
- ❓ Whether `role_assignments` left behind after unenrolment cause "ghost" roster entries (relevant to the roster tool).
- 🟡 Confirm separate-groups hiding behaviour against `moodle/site:accessallgroups` with a live 2-group test.
- ❓ How `guest` access interacts with capability checks (guest has no enrolment row).

*Companion docs: `05_mahdi_completion_conclusions.md` (progress/completion), `DATABASE_SCHEMA.md` (full DB reference).*
