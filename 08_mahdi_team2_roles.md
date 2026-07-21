# Team 2 — Roles: Functionalities & Responsibilities

**Owner:** Mahdi · **Team 2 — People & Enrolment**
**Instance:** Moodle 5.3dev · data pulled live from `mdl_role*` (System context grants)
**Status:** ✅ Confirmed from the running system unless noted.

---

## 0. What a "role" actually is

A **role** is a named bundle of **capabilities** (allow/prevent decisions) that a user is granted **in a context** (System, Category, Course, Activity…). The role defines *what you can do*; the assignment context defines *where*. A role is meaningless on its own — it only takes effect once assigned to a user in a context (`mdl_role_assignments`).

Two capability numbers matter below:
- **Allow-caps** = how many of the 754 capabilities the role grants by default (bigger = more powerful).
- **Assignable contexts** = the levels the role may be handed out at (`mdl_role_context_levels`).

---

## 1. The nine roles in this install

| Role | Archetype | Assignable at | Allow-caps | One-line job |
|---|---|---|---|---|
| **manager** | manager | System, Category, Course | **561** | Admin-lite: runs a site/category/course, manages everything incl. people & roles |
| **editingteacher** (Teacher) | editingteacher | Course, Activity | **459** | Owns a course: builds content, enrols people, grades, manages groups |
| **teacher** (Non-editing teacher) | teacher | Course, Activity | **216** | Teaches & grades but can't change the course structure or enrol people |
| **coursecreator** | coursecreator | System, Category | 26 | Can create new courses; little else |
| **student** | student | Course, Activity | 80 | Participates: views, submits, is graded |
| **guest** | guest | *(not assignable)* | 29 | Read-only visitor, cannot participate |
| **user** (Authenticated user) | user | *(not assignable)* | 137 | Baseline every logged-in user gets automatically site-wide |
| **frontpage** | frontpage | *(not assignable)* | 10 | What logged-in users can do on the site front page |
| **teacher1** *(custom)* | editingteacher | Course, Activity | **459** | A team-made **clone of editing teacher** (name typo "techaer1") — created for testing |

> `guest`, `user`, `frontpage` have **no assignable contexts** — they're applied automatically by the system, never picked in an "Assign roles" list. `manager` and `coursecreator` are the only roles assignable at **System** — which is why the site-level assign screen shows only those two.

---

## 2. Role-by-role: responsibilities & Team 2 functionality

Legend for each role: **Enrol** (add/remove people) · **Roles** (assign/override) · **Groups** · **Progress** · **Key limits**.

### 2.1 manager
**Responsibility:** the closest thing to an administrator without being the site admin. Runs whole categories/courses and the people in them.
- **Enrol:** every method — `enrol/manual:*`, `self`, `cohort`, `meta`, `paypal/fee`, incl. the config-only ones (`enrol/manual:config`, `enrol/cohort:unenrol`) that even editing teachers lack.
- **Roles:** `role:assign`, `role:override`, `role:manage`, `role:review`, `role:switchroles`. Can **assign every role** (manager, editingteacher, teacher, coursecreator, student) and **override every role**.
- **Cohorts:** the **only** role that can `cohort:manage` / `cohort:assign` (create cohorts & set membership).
- **Groups:** `managegroups`, `accessallgroups`, `viewhiddengroups`.
- **Progress:** view + override completion, all reports.
- **Limits:** not the site super-admin (that's the `admin` account, which bypasses all checks via `doanything`).

### 2.2 editingteacher (Teacher)
**Responsibility:** owns and builds a course, and manages the people in it. Your primary "course-runner."
- **Enrol:** `enrol/manual:enrol` / `:manage` / `:unenrol`, plus `self`, `meta`, `cohort` **config** (can set up methods) — **but not** `enrol/manual:config` or `cohort:unenrol` (those stay manager-only).
- **Roles:** `role:assign` — but only **teacher + student** (`mdl_role_allow_assign`), never manager. Plus `role:review`, `role:safeoverride`, `role:switchroles`. Can override teacher/student/guest.
- **Cohorts:** `cohort:view` + `enrol/cohort:config` — can **use** cohorts but **not create** them.
- **Groups:** `managegroups`, `accessallgroups`, `viewhiddengroups` — full group control.
- **Progress:** override completion, view completion/progress reports.
- **Limits:** cannot assign/override manager; cannot manage cohorts or roles globally.

### 2.3 teacher (Non-editing teacher)
**Responsibility:** teach and assess within a course someone else built. The "TA / grader."
- **Enrol:** ❌ **none** — no `enrol/manual:enrol`. A non-editing teacher **cannot add or remove participants**. (Big one for the roster tool.)
- **Roles:** ❌ cannot `role:assign` or `role:override`. Only `role:review` (look, don't touch) and `switchroles` → student/guest.
- **Groups:** ❌ **not** in `managegroups` and ❌ **not** in `accessallgroups` → under **Separate groups** a non-editing teacher sees **only their own group's** participants. Can `viewhiddengroups`.
- **Progress:** ✅ override completion, view completion & progress reports (their grading job).
- **Key limits:** view/grade yes; change course membership, roles, or groups **no**.

### 2.4 coursecreator
**Responsibility:** create new courses (often the only thing). Assignable at System/Category.
- 26 caps, essentially `moodle/course:create` and supporting view caps. No enrolment/role/group management to speak of.

### 2.5 student
**Responsibility:** participate in a course.
- **Enrol:** `enrol/self:unenrolself` — can **leave** a self-enrolled course, but cannot enrol others.
- **Roles/Groups:** none of the management caps.
- **Visibility:** ✅ `moodle/course:viewparticipants` — students *can* see classmates (subject to group mode).
- **Progress:** shows on completion reports (`course:isincompletionreports`); marks own activity completion via the `user` role's `togglecompletion`.

### 2.6 guest
**Responsibility:** look, don't touch. 29 read caps; **cannot post, submit, or be enrolled** (guests have no `user_enrolments` row).

### 2.7 user (Authenticated user)
**Responsibility:** the **baseline for everyone logged in**, applied automatically site-wide (not assigned by hand).
- Grants site-wide things every member needs: **`enrol/self:enrolself`** (self-enrol into courses) and **`moodle/course:togglecompletion`** (tick activities done). This is *why any logged-in user* can self-enrol and self-complete.

### 2.8 frontpage
**Responsibility:** what a logged-in user may do specifically on the **site front page** (10 caps). Rarely edited.

### 2.9 teacher1 (custom — flag for the team)
Identical capability count (459) and archetype to `editingteacher`; can assign/override teacher+student the same way. It's a **duplicate created during our testing** (display name misspelled "techaer1"). **Recommendation:** delete or rename before it confuses the roster tool — two indistinguishable editing-teacher roles is a data-hygiene risk.

---

## 3. Who can manage whom — the three matrices

Having `role:assign` / `role:override` / `role:switchroles` is *necessary but not sufficient*: a **second table** limits *which* roles you may act on. This is a core Team 2 "overlap" mechanism.

### `mdl_role_allow_assign` — who can **assign** whom
| Role | Can assign |
|---|---|
| manager | manager, editingteacher, teacher, coursecreator, student |
| editingteacher | teacher, student |
| teacher1 | teacher, student |

### `mdl_role_allow_override` — who can **override** whose permissions
| Role | Can override |
|---|---|
| manager | manager, editingteacher, teacher, coursecreator, student, guest, user, frontpage |
| editingteacher | teacher, student, guest |
| teacher1 | teacher, student, guest |

### `mdl_role_allow_switch` — who can **switch role to** (view-as)
| Role | Can switch to |
|---|---|
| manager | editingteacher, teacher, student, guest |
| editingteacher | teacher, student, guest |
| teacher | student, guest |
| teacher1 | teacher, student, guest |

**Takeaway:** an editing teacher can *assign* Student/Teacher but **cannot create a Manager**, and cannot override a manager's permissions — the privilege ceiling that stops course staff escalating to admin.

---

## 4. Team 2 capability grid (who can do the key actions)

| Action (capability) | manager | editingteacher | teacher | student | user |
|---|:--:|:--:|:--:|:--:|:--:|
| Enrol users manually (`enrol/manual:enrol`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure enrol methods (`course:enrolconfig`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Self-enrol (`enrol/self:enrolself`) | — | — | — | — | ✅ |
| Self-unenrol (`enrol/self:unenrolself`) | — | — | — | ✅ | — |
| Assign roles (`role:assign`) | ✅ | ✅* | ❌ | ❌ | ❌ |
| Override permissions (`role:override`) | ✅ | (safe only) | ❌ | ❌ | ❌ |
| Manage cohorts (`cohort:manage`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage groups (`course:managegroups`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| See all groups (`site:accessallgroups`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| View participants (`course:viewparticipants`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Override completion (`course:overridecompletion`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark own activity done (`course:togglecompletion`) | — | — | — | — | ✅ |
| View completion report (`report/completion:view`) | ✅ | ✅ | ✅ | ❌ | ❌ |

\* editing teacher's `role:assign` is limited to teacher + student (Section 3).

**The sharpest distinction** — *editing teacher vs non-editing teacher*: both grade, view participants, override completion, and read reports; only the **editing** teacher can **enrol people, manage groups, see all groups, and assign roles**. That single line answers most "why can't this teacher do X" tickets.

---

## 5. How to verify any of this (tracking)

- **UI:** *Site admin → Users → Permissions → Define roles →* pick a role → see every capability.
- **Assign matrix UI:** *Define roles → Allow role assignments* tab.
- **DB:** roles `mdl_role`; grants `mdl_role_capabilities`; assign/override/switch limits `mdl_role_allow_assign|override|switch`; where-assignable `mdl_role_context_levels`.
- **Code:** the decision is always `has_capability($cap, $context, $user)` (see `mahdi's_conclusion.md` for the resolution algorithm).

*Companion docs: `06_mahdi_team2_permissions.md` (per-capability detail), `mahdi's_conclusion.md` (enrolment/roles/groups overlap), `07_mahdi_team2_database.md` (schema).*
