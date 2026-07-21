# Mahmoud — Professional Moodle Groups and Groupings Task Guide

## Team 2: People, Enrolment, Roles, Groups, and Progress

**Owner:** Mahmoud  
**Primary domain:** Groups and Groupings  
**Rule prefix:** `GRP-`  
**Main reviewer:** Yaman  
**Roles support:** Khaled  
**Enrolment support:** Issa  
**Progress support:** Mahdi  

---

# 1. Mission

Mahmoud's task is to understand and document:

> How Moodle uses Groups and Groupings to control visibility, participation, collaboration, and the scope of actions inside a Course.

Mahmoud must not stop after creating Groups in the Moodle UI.

He must be able to explain:

- What a Group is
- What a Grouping is
- How both differ from a Cohort
- How Group memberships are stored
- How activity Group modes work
- How Roles and Capabilities interact with Groups
- Why a Teaching Assistant may grade one Group but not another
- What happens when one Student belongs to multiple Groups
- What happens when membership changes after a submission or Forum post
- What happens after suspension, unenrolment, and re-enrolment
- Which behavior belongs to Moodle core
- Which behavior belongs to Assignment, Forum, or another activity plugin
- How Team 2 should represent this behavior in the new FastAPI application

---

# 2. Scope Rule

Mahmoud must build the full minimum environment on his own Moodle instance:

```text
Course
Users
Basic Enrolments
Basic Roles
Groups
Grouping
Assignments
Forums
Completion Tracking
```

However, he must deeply investigate only:

```text
Groups
Group Membership
Groupings
Group Modes
Group Visibility
Group Action Scope
```

Recommended effort:

```text
20% — Understand Enrolment, Roles, and Progress dependencies
80% — Investigate Groups and Groupings deeply
```

Coordinate with:

- Issa when Enrolment changes
- Khaled when Capabilities or Roles matter
- Mahdi when Completion or Progress changes
- Yaman when the final permission explanation is designed

---

# 3. Core Concepts

## 3.1 Group

A Group is a subset of participants inside one Course.

Example:

```text
Group A
- ta.a
- student.a
- student.multi
```

A Group belongs to one Course.

## 3.2 Group Membership

Group Membership connects one User to one Group.

A User may belong to more than one Group.

Example:

```text
student.multi
- Group A
- Group B
```

## 3.3 Grouping

A Grouping is a collection of Groups.

Example:

```text
Grouping: Assignment Groups
- Group A
- Group B
```

A Grouping contains Groups, not Users directly.

## 3.4 Cohort

A Cohort is different from a Group.

A Cohort is usually a site-level or category-level collection of Users used for bulk organization and Cohort Sync.

Example:

```text
Cohort: Computer Science Students 2026
```

A Cohort may enrol Users into a Course.

A Group then separates Users inside that Course.

## 3.5 Group Mode

An activity can use:

```text
No Groups
Separate Groups
Visible Groups
```

The final behavior also depends on:

- Course Group settings
- Forced Group mode
- Grouping
- User Role
- User Capabilities
- Activity plugin behavior

## 3.6 Access All Groups

The important Capability is usually:

```text
moodle/site:accessallgroups
```

It may let a User access Groups beyond their own membership.

It does not automatically grant grading or editing.

---

# 4. Cohort vs Group vs Grouping

| Concept | Scope | Contains | Purpose | Enrols Users? | Affects Activity Behavior? |
|---|---|---|---|---|---|
| Cohort | Site or Category | Users | Bulk organization and sync | Through Cohort Sync | Not directly |
| Group | One Course | Course Users | Divide participants inside Course | No | Yes |
| Grouping | One Course | Groups | Select Groups for an activity | No | Yes |

Example:

```text
Cohort: Computer Science 2026
Course: Programming 101
Groups: Lab A, Lab B, Lab C
Grouping: Programming Labs
- Lab A
- Lab B
```

---

# 5. Local Environment Setup

## 5.1 Course

Create:

```text
Full name: Team 2 Test Course
Short name: T2-TEST
Category: Team 2
Course format: Topics
Visible: Yes
Completion tracking: Enabled
Default Group mode: No Groups
Force Group mode: No
```

## 5.2 Users

Create:

| Username | Purpose |
|---|---|
| `teacher.a` | Editing Teacher |
| `ta.a` | Group-limited Teaching Assistant |
| `ta.allgroups` | TA with wider Group access |
| `student.a` | Group A |
| `student.b` | Group B |
| `student.c` | Group C |
| `student.multi` | Group A and Group B |
| `student.returning` | Lifecycle tests |

## 5.3 Enrolments

| User | Role | Method | Status |
|---|---|---|---|
| `teacher.a` | Teacher | Manual | Active |
| `ta.a` | Non-editing Teacher or custom TA | Manual | Active |
| `ta.allgroups` | Non-editing Teacher or custom TA | Manual | Active |
| `student.a` | Student | Manual | Active |
| `student.b` | Student | Manual | Active |
| `student.c` | Student | Manual | Active |
| `student.multi` | Student | Manual | Active |
| `student.returning` | Student | Manual | Active |

## 5.4 Groups

### Group A

```text
ta.a
student.a
student.multi
```

### Group B

```text
student.b
student.multi
```

### Group C

```text
student.c
```

## 5.5 Grouping

Create:

```text
Grouping name: Assignment Groups
Contains:
- Group A
- Group B
```

Keep Group C outside the Grouping initially.

## 5.6 Assignments

Create:

```text
Assignment NG — No Groups
Assignment SG — Separate Groups
Assignment VG — Visible Groups
```

Use the same instructions and submission settings.

## 5.7 Forums

Create:

```text
Forum NG — No Groups
Forum SG — Separate Groups
Forum VG — Visible Groups
```

Use the same Forum type and settings.

## 5.8 Grouping-Restricted Activity

Create:

```text
Name: Grouping Restricted Activity
Grouping: Assignment Groups
Restriction: User must belong to an included Group
```

## 5.9 Completion

Configure:

- Assignment completion requires submission
- Forum completion requires a post
- Restricted Page completion requires viewing

---

# 6. Baseline Verification

Before advanced experiments, verify:

- `teacher.a` can edit the Course
- `ta.a` can enter the Course
- `ta.allgroups` can enter the Course
- all Students can enter the Course
- Group memberships are correct
- `student.multi` belongs to Group A and Group B
- Assignment Groups contains Group A and Group B only
- every activity has the correct Group mode
- `student.c` cannot initially access the Grouping-restricted activity

Do not continue until the baseline is correct.

---

# 7. Evidence Standard

Every Rule must include:

```text
UI Evidence
+
Database Evidence
+
Source-Code Evidence when possible
```

Store evidence under:

```text
evidence/
├── screenshots/groups/
├── database/groups/
├── code-paths/groups/
└── experiment-notes/groups/
```

## Rule Template

```markdown
## GRP-001 — Rule Title

### Question
What behavior are we testing?

### Setup
- Course
- Actor
- Target User
- Role
- Capability
- Group Membership
- Activity
- Group Mode
- Grouping

### Action
What exact action was performed?

### Expected Result
What did we expect?

### Actual Result
What happened?

### Business Rule
One precise sentence.

### Beginner Explanation
Explain it simply.

### UI Evidence
Page, result, screenshot.

### Database Evidence
Tables, rows, fields, before/after.

### Source-Code Evidence
File, class/function, important decision.

### Confidence
Confirmed / Partial / Requires Live Validation.

### Open Questions
What remains unclear?
```

---

# 8. Database Tables

Mahmoud must understand:

```text
groups
groups_members
groupings
groupings_groups
course
course_modules
```

Supporting tables:

```text
user
enrol
user_enrolments
role_assignments
role_capabilities
context
course_modules_completion
```

## Important Fields

### `groups`

```text
id
courseid
name
idnumber
description
timecreated
timemodified
```

### `groups_members`

```text
id
groupid
userid
timeadded
component
itemid
```

`component` and `itemid` may indicate plugin-owned membership.

### `groupings`

```text
id
courseid
name
description
timecreated
timemodified
```

### `groupings_groups`

```text
id
groupingid
groupid
timeadded
```

### `course`

Important Group fields may include:

```text
groupmode
groupmodeforce
defaultgroupingid
```

### `course_modules`

Important fields may include:

```text
groupmode
groupingid
availability
visible
```

Confirm exact fields from the installed Moodle version.

---

# 9. Read-Only SQL Templates

## Course

```sql
SELECT id, fullname, shortname, groupmode, groupmodeforce, defaultgroupingid
FROM mdl_course
WHERE shortname = 'T2-TEST';
```

## Groups

```sql
SELECT id, courseid, name, idnumber, timecreated, timemodified
FROM mdl_groups
WHERE courseid = :course_id
ORDER BY id;
```

## Memberships

```sql
SELECT
    gm.id,
    g.name AS group_name,
    u.username,
    gm.component,
    gm.itemid,
    gm.timeadded
FROM mdl_groups_members gm
JOIN mdl_groups g ON g.id = gm.groupid
JOIN mdl_user u ON u.id = gm.userid
WHERE g.courseid = :course_id
ORDER BY g.name, u.username;
```

## Groupings

```sql
SELECT id, courseid, name, timecreated, timemodified
FROM mdl_groupings
WHERE courseid = :course_id
ORDER BY id;
```

## Groups inside Groupings

```sql
SELECT
    gg.id,
    grping.name AS grouping_name,
    grp.name AS group_name,
    gg.timeadded
FROM mdl_groupings_groups gg
JOIN mdl_groupings grping ON grping.id = gg.groupingid
JOIN mdl_groups grp ON grp.id = gg.groupid
WHERE grping.courseid = :course_id
ORDER BY grping.name, grp.name;
```

## Activity Group Configuration

```sql
SELECT
    id,
    course,
    instance,
    groupmode,
    groupingid,
    visible,
    availability
FROM mdl_course_modules
WHERE course = :course_id
ORDER BY id;
```

Do not use `INSERT`, `UPDATE`, `DELETE`, or schema commands.

---

# 10. Source-Code Investigation

Start with:

```text
public/lib/grouplib.php
public/group/lib.php
public/group/
public/mod/assign/
public/mod/forum/
public/lib/accesslib.php
public/lib/enrollib.php
```

Search for:

```text
groups_get_activity_groupmode
groups_get_activity_group
groups_get_activity_allowed_groups
groups_get_all_groups
groups_get_members
groups_is_member
groups_group_visible
groups_add_member
groups_remove_member
groups_sync_with_enrolment
NOGROUPS
SEPARATEGROUPS
VISIBLEGROUPS
moodle/site:accessallgroups
moodle/course:managegroups
```

For every important function, document:

1. Inputs
2. Return value
3. Tables read
4. Capabilities checked
5. Course settings used
6. Module settings used
7. Session state used
8. Plugins calling it
9. Decisions left to the plugin

## Assignment Investigation

Investigate how Assignment:

- selects the active Group
- filters the grading list
- checks target Student visibility
- handles team submission
- applies Separate Groups
- applies Visible Groups
- handles access-all-groups
- handles suspended Users

## Forum Investigation

Investigate how Forum:

- filters discussions
- selects active Group
- allows posting
- displays other Group discussions
- applies Separate Groups
- applies Visible Groups
- handles Users in multiple Groups

## Core vs Plugin Comparison

| Behavior | Moodle Core | Assignment | Forum |
|---|---|---|---|
| Effective Group mode | | | |
| Allowed Groups | | | |
| Active Group | | | |
| Target filtering | | | |
| Submission or posting | | | |
| Grading or moderation | | | |
| Cross-Group visibility | | | |

---

# 11. Required Experiments

## GRP-001 — Group Baseline

1. Open Course Groups.
2. Screenshot Groups A, B, and C.
3. Query `groups`.
4. Query `groups_members`.
5. Add a disposable User to Group A.
6. Query again.
7. Remove the User.
8. Query again.
9. Record exact changes.

Required Rule:

> Group identity and Group membership are separate records.

---

## GRP-002 — Grouping Baseline

1. Open Groupings.
2. Confirm Assignment Groups contains Group A and Group B.
3. Query `groupings`.
4. Query `groupings_groups`.
5. Add Group C.
6. Query again.
7. Remove Group C.
8. Record the difference.

Required Rule:

> A Grouping contains Groups, not Users.

---

## GRP-003 — No Groups Assignment

1. Submit Assignment NG as Students A, B, and C.
2. Open grading as `teacher.a`.
3. Record visible Users.
4. Open grading as `ta.a`.
5. Record visible Users.
6. Record Group filters.
7. Compare with Group memberships.

Do not assume the result before testing.

---

## GRP-004 — Separate Groups Assignment

Setup:

```text
ta.a → Group A
student.a → Group A
student.b → Group B
student.c → Group C
```

Steps:

1. Confirm Assignment SG uses Separate Groups.
2. Confirm `ta.a` does not have access-all-groups.
3. Submit as all Students.
4. Open grading as `ta.a`.
5. Record visible Students.
6. Try opening `student.a`.
7. Try opening `student.b`.
8. Try opening `student.c`.
9. Record UI behavior.
10. Record relevant Capability behavior with Khaled.

---

## GRP-005 — Visible Groups Assignment

Repeat GRP-004 using Assignment VG.

Record:

- visible Students
- gradeable Students
- available Group filters
- whether another Group's submission can be opened
- whether it can be changed

Create a Separate vs Visible comparison.

---

## GRP-006 — Access All Groups

1. Record `ta.a` behavior without access-all-groups.
2. Ask Khaled to confirm the Capability.
3. Use `ta.allgroups` or a safe custom Role.
4. Repeat Assignment SG checks.
5. Repeat Forum SG checks.
6. Record what becomes visible.
7. Record what becomes actionable.

Important:

> Access-all-groups may widen Group scope but does not automatically grant grading.

---

## GRP-007 — Three-Outcome TA Scenario

Target:

```text
TA can grade Group A.
TA cannot grade Group B.
TA cannot see Group C.
```

Investigate whether one activity can produce this using:

- Role Capabilities
- Group Membership
- Separate Groups
- Groupings
- Activity restrictions
- Activity-level overrides

If not, document whether it needs:

- multiple activities
- separate Groupings
- module-level overrides
- availability restrictions

Do not force the expected result.

This is Hard Case 3.

---

## GRP-008 — Student in Two Groups

Setup:

```text
student.multi:
- Group A
- Group B
```

### Assignment

1. Submit to Assignment SG.
2. Inspect available Group selection.
3. Inspect how Teachers see the submission.
4. Check whether Group identity is stored or derived.
5. Move the Student between Groups and retest.

### Forum

1. Open Forum SG.
2. Observe active Group selection.
3. Post in Group A.
4. Switch to Group B.
5. Post or view behavior.
6. Test visibility as Students A and B.

This is Hard Case 4.

---

## GRP-009 — Grouping-Restricted Activity

1. Confirm Grouping contains Group A and Group B only.
2. Test as `student.a`.
3. Test as `student.b`.
4. Test as `student.c`.
5. Record:
   - visible or hidden
   - accessible or denied
   - completion effect
6. Add Group C.
7. Retest `student.c`.
8. Remove Group B.
9. Retest `student.b`.

Separate:

```text
Invisible
Visible but inaccessible
Accessible but Group-filtered
```

---

## GRP-010 — Membership Change After Submission

1. `student.a` submits while in Group A.
2. Record membership and submission.
3. Move Student to Group B.
4. Test as `ta.a`.
5. Test as `teacher.a`.
6. Remove Student from all Groups.
7. Retest.
8. Re-add to Group A.
9. Retest.

Determine whether behavior uses:

- current membership
- submission-time Group
- plugin-specific logic

---

## GRP-011 — Membership Change After Forum Post

Repeat the same lifecycle with Forum SG.

Check:

- visibility of old discussions
- ability to reply
- active Group
- stored discussion Group
- current membership effect

Compare with Assignment.

---

## GRP-012 — Forced Course Group Mode

1. Record current activity Group modes.
2. Enable forced Separate Groups at Course level.
3. Open Assignment NG and Forum NG.
4. Record effective behavior.
5. Inspect `course.groupmodeforce`.
6. Trace `groups_get_activity_groupmode`.
7. Restore original settings.

Required Rule:

> The configured activity mode may differ from the effective mode when the Course forces a Group mode.

---

## GRP-013 — Suspension and Group Membership

Coordinate with Issa.

1. Record `student.returning` membership.
2. Suspend the Course enrolment.
3. Query `groups_members`.
4. Test Group-restricted activity access.
5. Reactivate.
6. Query and test again.

Required distinction:

> The membership row may remain while effective Course access is blocked.

---

## GRP-014 — Unenrolment and Re-enrolment

Coordinate with Issa.

1. Record Group membership.
2. Fully unenrol `student.returning`.
3. Query membership.
4. Re-enrol manually.
5. Check whether membership returns.
6. Repeat with a plugin-owned membership if available.
7. Compare manual and plugin-owned memberships.

Required result:

- manual membership behavior
- plugin-owned membership behavior
- last-enrolment cleanup
- re-synchronization behavior

---

## GRP-015 — Completion and Group Restrictions

Coordinate with Mahdi.

1. Configure completion for the Grouping-restricted activity.
2. Check progress for Students A, B, and C.
3. Change Grouping membership.
4. Check whether completion visibility or progress denominator changes.
5. Record the exact report used.

Do not claim there is one universal Moodle progress formula.

---

# 12. Required Matrices

## Group Mode Matrix

| Behavior | No Groups | Separate Groups | Visible Groups |
|---|---|---|---|
| Student sees own Group | | | |
| Student sees other Group names | | | |
| Student sees other Group content | | | |
| Student can interact with other Group | | | |
| TA sees own Group | | | |
| TA sees other Groups | | | |
| TA grades own Group | | | |
| TA grades other Groups | | | |
| Teacher sees all Groups | | | |
| Group filter appears | | | |
| Plugin-specific differences | | | |

## Grouping Matrix

| User | Current Groups | Included in Grouping? | Activity visible? | Activity accessible? | Data scope |
|---|---|---|---|---|---|
| student.a | A | Yes | | | |
| student.b | B | Yes | | | |
| student.c | C | No | | | |
| student.multi | A, B | Yes | | | |

## Membership Lifecycle Matrix

| Lifecycle Action | Membership Row Remains? | User Accesses Course? | Group Activity Access? | Restored Automatically? |
|---|---|---|---|---|
| Suspend Enrolment | | | | |
| Reactivate Enrolment | | | | |
| Remove one of two paths | | | | |
| Remove final path | | | | |
| Re-enrol manually | | | | |
| Cohort re-sync | | | | |

---

# 13. Business Rules

Minimum:

```text
15 strong GRP rules
```

Recommended:

```text
18–25 rules
```

Required categories:

- Group identity
- Membership
- Multiple membership
- Grouping
- Course Group mode
- Forced mode
- No Groups
- Separate Groups
- Visible Groups
- Access-all-groups
- Assignment behavior
- Forum behavior
- Grouping restriction
- Membership changes
- Suspension
- Unenrolment
- Plugin-owned memberships
- Progress interaction
- Historical limitations

---

# 14. Hard Cases

## Hard Case 3 — TA Scope

Scenario:

> A Teaching Assistant can grade one Group, cannot grade another Group, and cannot see a third Group.

Mahmoud owns:

- Group structure
- Group mode
- Grouping
- Membership
- Visibility
- Activity filtering
- UI evidence
- Database evidence

Khaled owns:

- Capabilities
- Role configuration
- Overrides
- Access-all-groups

Yaman owns:

- Final integrated explanation

## Hard Case 4 — Student in Two Groups

Scenario:

> A Student belongs to two Groups while the activity uses Separate Groups.

Mahmoud must compare:

- Assignment
- Forum

Do not generalize one plugin's result to all Moodle activities.

---

# 15. Questions for Other Owners

## Questions for Issa

1. Does suspension keep manual Group membership?
2. Does final unenrolment remove all Group memberships?
3. How are plugin-owned memberships identified?
4. Does Cohort Sync restore membership?
5. What happens when one of two enrolment paths is removed?
6. Does a disabled enrolment instance affect Group visibility?

## Questions for Khaled

1. Does the TA have `mod/assign:grade`?
2. Does the TA have `moodle/site:accessallgroups`?
3. Which Context contains the Capability?
4. Can a Module override reduce access?
5. Can the TA view a Group without grading it?
6. Which Capability manages Groups?

## Questions for Mahdi

1. Does an excluded activity count in progress?
2. Does Group removal change displayed progress?
3. Does Completion remain stored?
4. Which progress screen is authoritative?
5. Does a hidden activity affect the denominator?

## Questions for Yaman

1. Which Group rules are essential?
2. Should the permission checker return Group evidence?
3. Must the app support multiple memberships?
4. Should Group membership history be stored?
5. How will Team 1 expose activity Group settings?
6. How will Team 3 request grader-to-student checks?

---

# 16. Proposed FastAPI Model

## Group

```text
id
course_id
name
description
source
created_at
updated_at
```

## GroupMembership

```text
id
group_id
user_id
source_component
source_item_id
joined_at
left_at
active
```

## Grouping

```text
id
course_id
name
description
```

## GroupingGroup

```text
grouping_id
group_id
```

## ActivityGroupPolicy

```text
activity_id
group_mode
grouping_id
course_mode_forced
availability_requires_membership
```

## GroupAccessDecision

```text
actor_user_id
target_user_id
activity_id
allowed_groups
actor_groups
target_groups
access_all_groups
visibility_result
action_scope_result
reasons
```

---

# 17. Suggested API Endpoints

## Course Groups

```http
GET /courses/{course_id}/groups
```

## Group Members

```http
GET /groups/{group_id}/members
```

## User Memberships

```http
GET /users/{user_id}/courses/{course_id}/groups
```

## Activity Group Policy

```http
GET /activities/{activity_id}/group-policy
```

## Group Access Check

```http
POST /group-access/check
```

Example request:

```json
{
  "actor_user_id": "ta.a",
  "target_user_id": "student.b",
  "course_id": "T2-TEST",
  "activity_id": "assignment-sg",
  "action": "grade"
}
```

Example response:

```json
{
  "visible": false,
  "action_allowed": false,
  "group_mode": "separate_groups",
  "actor_groups": ["Group A"],
  "target_groups": ["Group B"],
  "access_all_groups": false,
  "reasons": [
    "The activity uses Separate Groups.",
    "The actor and target do not share an allowed Group.",
    "The actor does not have access-all-groups."
  ]
}
```

---

# 18. Automated Test Contributions

Suggested tests:

```text
test_separate_groups_limits_ta_scope.py
test_visible_groups_differs_from_separate_groups.py
test_student_can_belong_to_two_groups.py
test_grouping_excludes_group_c.py
test_membership_change_after_submission.py
test_unenrolment_removes_group_membership.py
```

Example:

```python
def test_ta_cannot_grade_student_from_another_group():
    # Given:
    # - TA is in Group A
    # - Student is in Group B
    # - Activity uses Separate Groups
    # - TA can grade assignments
    # - TA cannot access all groups
    #
    # Then:
    # - The target Student is outside the TA's Group scope
    # - The decision explains the Group mismatch
    ...
```

---

# 19. Work Order

## Day 1

- Create the environment
- Understand Group vs Grouping vs Cohort
- Run GRP-001 and GRP-002
- Inspect database tables
- Write first Rules

## Day 2

- Read Moodle Group source code
- Run Assignment experiments
- Run Forum experiments
- Test access-all-groups
- Build comparison matrices

## Day 3

- Complete Hard Case 3
- Complete Hard Case 4
- Test membership changes
- Test lifecycle behavior
- Agree API and model with Yaman

## Day 4

- Finalize Rules
- Finalize evidence
- Finalize source map
- Add tests
- Validate integration
- Document limitations

---

# 20. Final Deliverables

Mahmoud must deliver:

1. `notes/groups-groupings.md`
2. At least 15 `GRP-` Rules
3. Group vs Grouping vs Cohort explanation
4. Source-code map
5. Database map
6. Group mode matrix
7. Grouping matrix
8. Membership lifecycle matrix
9. Hard Case 3 evidence
10. Hard Case 4 evidence
11. Assignment vs Forum comparison
12. Access-all-groups findings
13. Multiple membership findings
14. Membership-after-submission findings
15. Enrolment lifecycle findings
16. FastAPI entity proposal
17. API recommendations
18. Automated test contribution
19. Open questions
20. Honest limitations

---

# 21. Quality Gate

Mahmoud's work is not complete when he says:

```text
I created Groups and tested them.
```

It is complete when he can explain:

- Which Group mode was effective
- Whether the Course forced the mode
- Which Grouping applied
- Which Groups the actor belongs to
- Which Groups the target belongs to
- Whether access-all-groups applies
- Which activity plugin applies additional rules
- What the UI displayed
- What the database stored
- What the source code decided
- Why the final result occurred

Reject a Rule when:

- it has no reproducible setup
- it has no evidence
- it confuses Group with Grouping
- it confuses Cohort with Group
- it treats Capability and Group restriction as the same thing
- it assumes Assignment and Forum behave identically
- it ignores Enrolment status
- it generalizes from one screen
- it hides unresolved behavior

---

# 22. Definition of Done

## Environment

- [ ] Course created
- [ ] Users created
- [ ] Basic Enrolments created
- [ ] Groups A, B, and C created
- [ ] `student.multi` belongs to A and B
- [ ] Assignment Groups created
- [ ] Assignment NG, SG, and VG created
- [ ] Forum NG, SG, and VG created
- [ ] Grouping-restricted activity created

## Investigation

- [ ] Group schema inspected
- [ ] Grouping schema inspected
- [ ] Source functions traced
- [ ] Assignment behavior tested
- [ ] Forum behavior tested
- [ ] No/Separate/Visible compared
- [ ] Access-all-groups tested
- [ ] Forced mode tested
- [ ] Multiple membership tested
- [ ] Membership after submission tested
- [ ] Membership after Forum post tested
- [ ] Suspension tested
- [ ] Unenrolment and re-enrolment tested
- [ ] Completion interaction observed

## Documentation

- [ ] At least 15 Rules
- [ ] UI evidence stored
- [ ] Database evidence stored
- [ ] Source paths stored
- [ ] Matrices completed
- [ ] Hard Cases 3 and 4 completed
- [ ] Open questions recorded
- [ ] Handoff reviewed by Yaman

---

# 23. Final Explanation Mahmoud Must Be Able to Give

Scenario:

```text
ta.a is actively enrolled in T2-TEST.
ta.a has a Role that allows Assignment grading.
ta.a belongs to Group A.
student.b belongs to Group B.
Assignment SG uses Separate Groups.
ta.a does not have access-all-groups.
```

Expected explanation:

```text
The Role grants the general ability to grade Assignments.

The Activity's Separate Groups policy limits the Students
the TA can reach.

Because the TA belongs to Group A and Student B belongs to Group B,
the target is outside the TA's permitted Group scope.

Therefore, the Capability may be allowed while the specific
grader-to-student operation is denied or filtered by Group logic.

The exact UI and API behavior must be confirmed in the Assignment
plugin on the investigated Moodle version.
```

Mahmoud's task is not just to know that Groups exist.

His task is to explain how Moodle turns Group configuration into real visibility and action-scope decisions.
