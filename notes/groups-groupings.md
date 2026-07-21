# Groups & Groupings — Findings

**Owner:** Mahmoud · **Domain:** Groups and Groupings · **Reviewer:** Yaman
**Rule prefix:** `GRP-`
**Moodle under test:** 5.3dev (Build 20260605), MySQL 8.0.35, prefix `mdl_`
**Source tree read:** `/Applications/MAMP/htdocs2/moodle503/public`
**Status legend:** ✅ Confirmed · 🟡 Plausible (needs a live check) · ❓ Unknown / not yet tested

> This is deliverable #1 of Yaman's task guide (§20). It is the single write-up of the
> Groups investigation; the `GRP-` rules, matrices, and maps below accumulate across Days 1–4.
> Evidence standard here (per Yaman, screenshots waived): **database + source-code evidence.**

---

## 0. Deliverables tracker (guide §20)

| # | Deliverable | State |
|---|---|---|
| 1 | This document | 🟡 in progress |
| 2 | ≥15 `GRP-` rules | 🟡 4 seeded, 11+ to go |
| 3 | Group vs Grouping vs Cohort | ✅ §1 below |
| 4 | Source-code map | ✅ §3 (grows as we read) |
| 5 | Database map | ✅ §2 |
| 6 | Group mode matrix | ❓ needs activities |
| 7 | Grouping matrix | ❓ needs grouping + activity |
| 8 | Membership lifecycle matrix | ❓ needs Issa coordination |
| 9 | Hard Case 3 evidence | ❓ |
| 10 | Hard Case 4 evidence | ❓ |
| 11 | Assignment vs Forum comparison | ❓ needs activities |
| 12 | Access-all-groups findings | 🟡 source read, live check pending |
| 13 | Multiple-membership findings | ❓ needs student.multi |
| 14 | Membership-after-submission | ❓ needs submission |
| 15 | Enrolment lifecycle | ❓ needs Issa coordination |
| 16 | FastAPI entity proposal | ⚪ guide §16 is a starting point |
| 17 | API recommendations | ⚪ guide §17 is a starting point |
| 18 | Automated test contribution | ⚪ |
| 19 | Open questions | 🟡 §5 below |
| 20 | Honest limitations | 🟡 §6 below |

---

## 1. Group vs Grouping vs Cohort ✅

Three different things people constantly conflate. The schema settles it (see §2):

| Concept | Lives at | Contains | Enrols users? | Affects activity behaviour? |
|---|---|---|---|---|
| **Cohort** | Site / category | **Users** | Yes, via Cohort Sync | No, not directly |
| **Group** | One course | **Course users** | No | Yes |
| **Grouping** | One course | **Groups** (not users) | No | Yes |

The decisive structural proof: `mdl_groupings_groups` links `groupingid → groupid` with **no `userid` column** (§2). A grouping therefore *cannot* contain users directly — only groups. A user's presence in a grouping is always derived: user → group (`groups_members`) → grouping (`groupings_groups`). Confirmed in code by `groups_get_grouping_members()`, which reaches users only by joining through `groups_members` (`lib/grouplib.php:702`).

---

## 2. Database map ✅

Exact columns on this Moodle version (`SHOW COLUMNS`, 2026-07-21).

**`mdl_groups`** — group *identity*. One row per group. Key cols: `id`, `courseid`, `name`, `idnumber`, `visibility`, `participation`, `timecreated`, `timemodified`.

**`mdl_groups_members`** — group *membership*. One row per (group, user). Key cols: `id`, `groupid`, `userid`, `timeadded`, **`component`**, **`itemid`**.
→ `component` is empty (`''`) for manual membership, or a plugin name (e.g. `enrol_cohort`) for **plugin-owned** membership. `itemid` ties back to the owning instance. This is how Moodle distinguishes "a human added this member" from "a sync added this member" — central to GRP-013/014.

**`mdl_groupings`** — grouping identity. Key cols: `id`, `courseid`, `name`, `idnumber`.

**`mdl_groupings_groups`** — grouping↔group link. Cols: `id`, `groupingid`, `groupid`, `timeadded`. **No `userid`** — the proof behind §1.

Course/activity group config (to confirm as we build activities):
- `mdl_course.groupmode`, `mdl_course.groupmodeforce`, `mdl_course.defaultgroupingid`
- `mdl_course_modules.groupmode`, `mdl_course_modules.groupingid`, `mdl_course_modules.availability`

---

## 3. Source-code map (grows as we read)

File under investigation: `lib/grouplib.php`.

| Function | Line | What it decides |
|---|---|---|
| `groups_get_activity_groupmode` | 732 | the **effective** group mode of an activity |
| `groups_get_all_groups` | 263 | which groups exist / a user belongs to |
| `groups_get_members` | 654 | users in a group |
| `groups_is_member` | 571 | is user X in group Y |
| `groups_get_activity_allowed_groups` | 1188 | which groups a user may act within, in an activity |
| `groups_group_visible` | 1219 | can user X see group Y |

Constants (`lib/grouplib.php:29–39`): `NOGROUPS = 0`, `SEPARATEGROUPS = 1`, `VISIBLEGROUPS = 2`.
Capability gate: `moodle/site:accessallgroups` checked at lines 767, 923, 1015, 1085.

---

## 4. Rules

### GRP-001 — Group identity and group membership are separate records ✅

**Question:** Is a group the same record as its members?
**Business rule:** A group exists as one row in `mdl_groups`; each member is a separate row in
`mdl_groups_members`. Removing a member deletes only the membership row, never the group.
**Database evidence (live, T2-LAB):** `mdl_groups` holds 3 rows (A id=1, B id=2, C id=3).
`mdl_groups_members` holds separate rows keyed by `groupid`+`userid`. Group C exists with **zero**
member rows — proving identity persists with no membership.
**Source evidence:** the two tables are queried independently throughout `grouplib.php`.
**Confidence:** ✅ structural. *Live-validation pending:* the add-then-remove disposable-user
delta (guide GRP-001 steps 5–8) to show the group row is untouched.
**Open:** does removing the *last* member change anything on the group row? (expected: no)

### GRP-002 — A grouping contains groups, not users ✅

**Question:** Can a grouping hold users directly?
**Business rule:** A grouping links only to groups; user membership in a grouping is always
derived through group membership.
**Database evidence:** `mdl_groupings_groups` columns are `(id, groupingid, groupid, timeadded)`
— **no `userid`**. There is no table linking a grouping to a user.
**Source evidence:** `groups_get_grouping_members()` (`grouplib.php:702`) reaches users only by
joining `groups_members` → `groupings_groups`.
**Confidence:** ✅ confirmed (schema + code).

### GRP-012 — A forced course group mode overrides the activity's own mode ✅

**Question:** If the course forces a group mode, does an activity's own setting still apply?
**Business rule:** When `course.groupmodeforce` is set, the **course** group mode is used for every
activity and the activity's own `groupmode` is ignored. Otherwise the activity's `groupmode` wins.
**Source evidence:** `groups_get_activity_groupmode()` — `lib/grouplib.php:743`:
```php
return empty($course->groupmodeforce) ? $cm->groupmode : $course->groupmode;
```
**Confidence:** ✅ confirmed from source. *Live check (guide GRP-012):* flip
`course.groupmodeforce` on and confirm a "No groups" activity behaves as the forced mode.
**Why it matters:** the group mode a judge sees configured on an activity may not be the mode
actually in force — the app's `ActivityGroupPolicy` must carry `course_mode_forced` (guide §16).

### GRP-006 — Access-all-groups widens which groups you see; Separate hides the rest ✅🟡

**Question:** What does `moodle/site:accessallgroups` change under Separate vs Visible groups?
**Business rule:** With **Visible groups** *or* the access-all-groups capability, a user is offered
**all** groups (plus "All participants"). Under **Separate groups** *without* the capability, a user
is limited to **their own** groups only.
**Source evidence:** `grouplib.php:770–782` (course group menu):
```php
if ($groupmode == VISIBLEGROUPS or $aag) {
    $allowedgroups = groups_get_all_groups($course->id, 0, $course->defaultgroupingid); // ALL
} else {
    $allowedgroups = groups_get_all_groups($course->id, $USER->id, ...);                // OWN only
}
```
and the "All participants" option is added only `if (!$allowedgroups or VISIBLEGROUPS or $aag)`.
**Confidence:** ✅ for the course-level menu. 🟡 the *activity*-level equivalent lives in
`groups_get_activity_allowed_groups` (`grouplib.php:1188`) — read next, then confirm.
**Important (guide §6):** access-all-groups changes *visibility/scope*, not grading rights.
Grading still needs `mod/assign:grade`. Two separate systems — do not merge them.

<!-- GRP-003, 004, 005, 007–011, 013–015 need the activities / extra users built. -->

---

## 5. Open questions (feeds guide §15)

- **For Issa (enrolment):** does suspending an enrolment keep the `groups_members` row? Does final
  unenrolment delete it? How is a plugin-owned membership (`component != ''`) cleaned up? (GRP-013/14)
- **For Khaled (roles):** exact capabilities on `ta.a` — does it have `mod/assign:grade`? in which
  context? does it have `accessallgroups`? (Hard Case 3)
- **For Mahdi (progress):** does a grouping-restricted activity a student can't access still count
  in their completion denominator? (GRP-015)
- **For Yaman (design):** should the permission checker return group evidence in its reasons array?
  must the app support a user in multiple groups? store membership history?

---

## 6. Honest limitations (feeds guide §20.20)

- Findings are from **5.3dev alpha**; enrolment/roles/groups are stable subsystems, but any rule
  tagged 🟡/❓ should be re-checked if the team standardises on a different version.
- Everything below the four seeded rules currently lacks the environment to test (no groupings,
  no assign/forum activities, only 4 of 8 users) — see the environment gap in the README/plan.
- No UI screenshots (waived by Yaman); rules rest on DB + source evidence instead.
