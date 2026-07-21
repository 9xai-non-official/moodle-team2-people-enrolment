# Team 2 — Individual Moodle Investigation Guide

## Project Context

Team 2 is responsible for understanding Moodle's **People and Enrolment** area.

The complete Team 2 problem is:

> How does a person become connected to a course, what can they do after joining it, how do groups affect their visibility and actions, and how is their progress stored and calculated?

The final Team 2 application must be a separate application built with:

- **Backend:** Python + FastAPI
- **Frontend:** React + TypeScript
- **Moodle:** Used only as the system being investigated
- **PHP:** Read Moodle PHP when necessary, but do not build the new application in PHP

The final application should be able to:

1. Show a course roster.
2. Show why each person is enrolled.
3. Show roles and important permissions.
4. Show group membership.
5. Show progress.
6. Answer:

```text
Can this user perform this action in this course?
Why or why not?
```

---

# Critical Working Rule

You are working on your own local Moodle installation.

Therefore, you must build the **complete minimum Team 2 environment** on your own machine.

However, you must not deeply investigate every Team 2 domain.

You must follow this rule:

```text
Build all minimum dependencies.
Deeply investigate only your assigned domain.
```

This means:

- You create the common users.
- You create the common course.
- You create basic enrolments.
- You create basic roles.
- You create basic groups.
- You create basic activities.
- You enable progress tracking.
- After that, you spend most of your investigation time on your assigned subject.

Recommended effort:

```text
20% — understand the complete Team 2 system
80% — investigate your assigned domain deeply
```

Do not duplicate another owner's deep investigation unless your experiment requires cross-domain verification.

---

# Shared Minimum Local Environment

You must create this setup before starting your specialist experiments.

## 1. Create the Course

Create:

```text
Full name: Team 2 Test Course
Short name: T2-TEST
Category: Team 2
Course format: Topics
Visibility: Visible
Completion tracking: Enabled
Default group mode: No groups
Force group mode: No
```

Confirm that you can open the course as administrator.

## 2. Create the Test Users

Create these local test accounts:

| Username | Purpose |
|---|---|
| `teacher.a` | Main editing teacher |
| `ta.a` | Limited teaching assistant |
| `student.a` | Main student in Group A |
| `student.b` | Student in Group B |
| `student.c` | Student in Group C |
| `student.multi` | Student belonging to two groups |
| `student.returning` | Dropout and re-enrolment experiments |

Use local test passwords only. Do not commit passwords or secrets to Git.

## 3. Create the Basic Enrolments

Inside `T2-TEST`, create:

| User | Enrolment method | Role | Status |
|---|---|---|---|
| `teacher.a` | Manual | Teacher | Active |
| `ta.a` | Manual | Non-editing teacher | Active |
| `student.a` | Manual | Student | Active |
| `student.b` | Manual | Student | Active |
| `student.c` | Manual | Student | Active |
| `student.multi` | Manual | Student | Active |
| `student.returning` | Manual | Student | Active |

Advanced enrolment methods are created only when your specialist experiments need them.

## 4. Create the Basic Groups

Create:

### Group A

- `ta.a`
- `student.a`
- `student.multi`

### Group B

- `student.b`
- `student.multi`

### Group C

- `student.c`

Create:

```text
Grouping name: Assignment Groups
Groups:
- Group A
- Group B
```

## 5. Create the Basic Activities

Create:

### Page 1 — Introduction

Completion condition:

```text
Student must view the activity
```

### Quiz 1 — Entry Quiz

Configure:

- At least two questions
- A passing grade
- Completion requires a passing grade

### Assignment 1 — Group Assignment

Configure:

- Student submissions enabled
- Completion requires submission
- Initial group mode: No groups

### Forum 1 — Discussion Forum

Configure:

- Students can post
- Completion requires one discussion or reply

### Page 2 — Restricted Page

Keep it available for later restriction experiments.

## 6. Verify the Environment

Before advanced work, confirm:

- `teacher.a` can edit the course.
- `ta.a` can enter the course.
- All students can enter the course.
- Students can view Page 1.
- Students can attempt Quiz 1.
- Students can submit Assignment 1.
- Students can post in Forum 1.
- Completion indicators appear.
- Group memberships are correct.

Do not start advanced experiments until this setup works.

---

# Standard Investigation Method

Every rule must come from an experiment.

Do not write:

```text
I think Moodle works like this.
```

Write:

```text
We performed this setup and action.
This result occurred.
These database rows changed.
This Moodle code path supports the behavior.
Therefore, this is the rule.
```

## Required Evidence

For each important rule, collect at least:

1. UI evidence
2. Database evidence

When possible, also collect:

3. Moodle PHP code evidence
4. A repeatable automated test
5. Relevant log or event evidence

## Standard Rule Template

```markdown
## Rule ID: DOMAIN-001

### Title
A short rule name.

### Question
What behavior are we trying to understand?

### Preconditions
What must already exist?

### Setup
Course, users, enrolment, roles, groups, activities, and settings.

### Action
What exact action did you perform?

### Expected Result
What did you expect before testing?

### Actual Result
What actually happened?

### Business Rule
Write the Moodle behavior in one clear sentence.

### Why It Matters
Explain the practical consequence.

### UI Evidence
Page path, visible result, screenshot filename.

### Database Evidence
Tables, row IDs, fields, and before/after values.

### Code Evidence
PHP file, function, class, or capability.

### Related Domains
Enrolment / Roles / Groups / Progress.

### Confidence
Confirmed / Partially confirmed / Open.

### Open Questions
What remains unknown?
```

## Evidence Folder

Store evidence using:

```text
evidence/
├── screenshots/
├── database/
├── code-paths/
└── experiment-notes/
```

Suggested filename pattern:

```text
DOMAIN-rule-number-description
```

Example:

```text
ENR-001-multiple-enrolment-paths.png
```

---

# Database Safety

Use Moodle UI for changes whenever possible.

Use the database mainly to:

- Read rows
- Compare before and after
- Understand relationships
- Confirm system behavior

Do not randomly modify Moodle tables.

Common prefix:

```text
mdl_
```

Your installation may use another prefix.

Before an experiment:

1. Record related row IDs.
2. Save current values.
3. Perform one UI action.
4. Query the same records again.
5. Write the exact difference.
6. Do not make several changes at once.

---

# Moodle Code Reading Method

Moodle is written in PHP.

You may read it to understand behavior, but the final Team 2 application must not be built in PHP.

Use this process:

1. Start from the UI operation.
2. Identify the page, form, or request.
3. Search Moodle source for the related table, capability, or function.
4. Follow calls until you find the decision.
5. Record the exact file and function.
6. Explain the rule in your own words.
7. Do not copy large Moodle implementation details into the new app.

Useful shared search terms:

```text
has_capability
require_capability
is_enrolled
get_enrolled_users
role_assign
groups_is_member
completion_info
```

---

# Daily Working Process

## Start of Day

Write:

1. The exact question you will test.
2. The required setup.
3. Expected behavior.
4. Tables to inspect.
5. Code terms to search.
6. Expected deliverable.

## During the Day

After each meaningful experiment:

- Save evidence immediately.
- Write the rule immediately.
- Do not rely on memory.
- Record blocked or confusing behavior.

## End of Day

Submit:

```text
- Rules confirmed
- Rules partially confirmed
- Experiments completed
- Experiments blocked
- Screenshots collected
- Database tables inspected
- Code paths found
- Cross-domain questions
- First task for tomorrow
```

---

# Definition of Done for One Experiment

An experiment is done only when:

- [ ] Setup is written.
- [ ] Action is written.
- [ ] Expected result is written.
- [ ] Actual result is written.
- [ ] UI evidence exists.
- [ ] Database evidence exists.
- [ ] Relevant Moodle code was searched.
- [ ] A business rule is written.
- [ ] Related domains are identified.
- [ ] Open questions are recorded.
- [ ] Another team member can repeat it.

---

# Your Assignment

## Owner

**Name:** Mahmoud  
**Primary domain:** Groups and Groupings  
**Rule prefix:** `GRP-`

## Your Mission

You must understand:

> How does Moodle use group membership to limit visibility, participation, and action scope?

Your job is not only to create groups.

You must explain how groups interact with:

- Activities
- Teachers
- Teaching assistants
- Students
- Submissions
- Forums
- Permissions
- Enrolment lifecycle

## What You Must Build as Basic Dependencies

Build the complete shared environment.

You need basic enrolments and roles to test group behavior.

However, do not deeply investigate:

- Every enrolment method
- Complete capability resolution
- All completion rules
- Grade aggregation

When behavior depends on a capability, coordinate with Khaled.

When membership changes because of enrolment, coordinate with Issa.

---

# Your Additional Setup

Verify:

```text
Group A:
- ta.a
- student.a
- student.multi

Group B:
- student.b
- student.multi

Group C:
- student.c
```

Create:

```text
Grouping: Assignment Groups
Contains:
- Group A
- Group B
```

Create activity variants:

```text
Assignment NG — No Groups
Assignment SG — Separate Groups
Assignment VG — Visible Groups

Forum NG — No Groups
Forum SG — Separate Groups
Forum VG — Visible Groups
```

Use clear names so screenshots and database rows are easy to identify.

Create one additional teaching assistant if useful:

```text
ta.allgroups
```

This account can be used to compare a TA with and without access to all groups.

---

# Concepts You Must Explain

1. Group
2. Group membership
3. Grouping
4. Grouping membership
5. Course group mode
6. Activity group mode
7. No Groups
8. Separate Groups
9. Visible Groups
10. Forced group mode
11. Activity grouping
12. Access restriction by grouping
13. Access all groups capability
14. Multiple group membership
15. Group-based visibility
16. Group-based grading scope
17. Membership change after submission
18. Membership survival after enrolment changes

---

# Questions You Must Answer

1. What is the difference between a Group and a Grouping?
2. Can one user belong to more than one group?
3. What does No Groups change?
4. What does Separate Groups change?
5. What does Visible Groups change?
6. Does group mode block access or only filter data?
7. Can a teacher always see all groups?
8. Can a non-editing teacher see all groups?
9. Which capability controls access to all groups?
10. Can a TA grade one group only?
11. Can a TA see one group but not grade it?
12. Can a student see another group's discussions?
13. What happens to a student in two groups?
14. Which group is used for a submission?
15. Can one activity use only selected groups through a grouping?
16. What happens to users outside the selected grouping?
17. What happens if a user joins a group after submitting?
18. What happens if a user leaves a group before grading?
19. Does suspension remove group membership?
20. Does unenrolment remove group membership?
21. Does re-enrolment restore membership?
22. How do roles and group modes combine?
23. How should Team 2 explain a group-based denial?
24. Which group details must be extracted?
25. What information is difficult to represent in a simplified app?

---

# Required Experiments

## GRP-001 — Group and Grouping Baseline

1. Create Groups A, B, and C.
2. Create Assignment Groups grouping.
3. Inspect:
   - `mdl_groups`
   - `mdl_groups_members`
   - `mdl_groupings`
   - `mdl_groupings_groups`
4. Add and remove one membership.
5. Compare rows.
6. Explain Group vs Grouping.

## GRP-002 — No Groups

1. Collect submissions from `student.a`, `student.b`, and `student.c`.
2. Open Assignment NG as `teacher.a`.
3. Open as `ta.a`.
4. Record visible users and filters.
5. Record whether membership affects anything.
6. Write the rule.

## GRP-003 — Separate Groups

1. Configure Assignment SG.
2. Put `ta.a` in Group A.
3. Ensure the TA does not have access-all-groups if possible.
4. Collect submissions from all three students.
5. Open grading as `ta.a`.
6. Record:
   - Visible Group A students
   - Group B behavior
   - Group C behavior
7. Inspect group-related capability behavior with Khaled.

This is the main setup for Hard Case 3.

## GRP-004 — Visible Groups

1. Configure Assignment VG.
2. Repeat the same student submissions.
3. Test as students and TA.
4. Record what is visible.
5. Record what remains non-editable or non-gradeable.
6. Compare directly with Separate Groups.

## GRP-005 — Forum Group Modes

For Forum NG, SG, and VG:

1. Create discussions as `student.a`.
2. Create discussions as `student.b`.
3. Create discussions as `student.c`.
4. Test visibility as each student.
5. Test visibility as `ta.a`.
6. Record posting ability and viewing ability.
7. Identify whether behavior differs from Assignment.

## GRP-006 — TA Restricted to One Group

Target behavior:

```text
- Can grade Group A
- Cannot grade Group B
- Cannot see Group C
```

Steps:

1. Configure the TA role with Khaled.
2. Assign `ta.a` to Group A.
3. Use Separate Groups.
4. Submit work from all groups.
5. Test the exact behavior.
6. If Moodle does not naturally produce all three levels, document:
   - What Moodle actually supports
   - What configuration is missing
   - Whether role overrides are needed
7. Write the exact evidence.

## GRP-007 — Student in Two Groups

Use `student.multi`.

1. Confirm the student belongs to Group A and Group B.
2. Open Separate Groups forum.
3. Create or view discussions in both groups.
4. Submit to Assignment SG.
5. Inspect what group information is stored.
6. Test as TA from Group A.
7. Test as teacher with all-group access.
8. Record ambiguities.

This is the main experiment for Hard Case 4.

## GRP-008 — Activity Limited to a Grouping

1. Configure Page 2 or an assignment to use `Assignment Groups`.
2. Test `student.a`.
3. Test `student.b`.
4. Test `student.c`.
5. Record visibility.
6. Add Group C to the grouping.
7. Retest.
8. Remove Group B.
9. Retest.
10. Determine whether access, visibility, or participation changes.

## GRP-009 — Membership Change After Submission

1. Submit as `student.a` while in Group A.
2. Move the student to Group B.
3. Open the submission as teacher.
4. Open it as `ta.a`.
5. Remove the student from every group.
6. Check submission visibility.
7. Re-add the student.
8. Record whether the submission has historical group identity or current membership behavior.

## GRP-010 — Enrolment Lifecycle and Membership

Coordinate with Issa.

1. Record `student.returning` group membership.
2. Suspend enrolment.
3. Inspect membership row.
4. Test group-based access.
5. Reactivate.
6. Fully unenrol.
7. Inspect membership rows.
8. Re-enrol.
9. Check whether membership returns.
10. Record the lifecycle rule.

## GRP-011 — Access All Groups

Coordinate with Khaled.

1. Test `ta.a` without access-all-groups.
2. Record visibility.
3. Allow `moodle/site:accessallgroups`.
4. Retest.
5. Compare assignment and forum behavior.
6. Record whether the capability bypasses all group restrictions or only some.

---

# Comparison Table You Must Produce

Create a final table:

| Behavior | No Groups | Separate Groups | Visible Groups |
|---|---|---|---|
| Student sees own group | | | |
| Student sees other group | | | |
| Student can interact with other group | | | |
| TA sees own group | | | |
| TA sees other group | | | |
| Teacher sees all groups | | | |
| Group filter displayed | | | |

Fill it from evidence, not assumptions.

---

# Database Tables You Own

Primary:

```text
mdl_groups
mdl_groups_members
mdl_groupings
mdl_groupings_groups
mdl_course
mdl_course_modules
```

Supporting:

```text
mdl_user
mdl_context
mdl_role_assignments
mdl_role_capabilities
mdl_enrol
mdl_user_enrolments
```

Activity-specific tables may be needed for assignment and forum behavior.

For every table, document:

- Course relationship
- User relationship
- Activity relationship
- Grouping relationship
- Time fields
- Removal behavior

---

# Moodle Code Search Targets

Search for:

```text
groups_get_all_groups
groups_get_members
groups_is_member
groups_get_activity_group
groups_get_activity_groupmode
SEPARATEGROUPS
VISIBLEGROUPS
NOGROUPS
moodle/site:accessallgroups
```

Also search assignment and forum plugins for group handling.

Record whether group behavior is:

- Centralized in group APIs
- Implemented separately by each activity
- A combination of both

This distinction is important for the new model.

---

# Rules You Must Deliver

Minimum:

```text
12–15 strong GRP rules
```

Required categories:

- Group membership rules
- Grouping rules
- No/Separate/Visible rules
- TA visibility rules
- Multiple membership rules
- Post-submission membership rules
- Enrolment lifecycle rules
- Access-all-groups rules

---

# Your Hard Case Responsibility

## Hard Case 3 — Primary Owner

You own the complete scenario setup and observed visibility:

> A TA can grade one group's work, cannot grade another group's work, and cannot see a third group.

Khaled owns the permission configuration.

You own:

- Group structure
- Group modes
- Membership
- Visibility
- Submission scope
- Evidence

## Hard Case 4 — Primary Owner

You own:

> A student belongs to two groups at once while the activity uses Separate Groups.

You must document the exact Moodle behavior and any activity-specific differences.

---

# Your Required Handoff

Provide Yaman with:

1. Group vs Grouping explanation.
2. Group mode comparison table.
3. Hard Case 3 evidence.
4. Hard Case 4 evidence.
5. Multi-group membership findings.
6. Membership-change findings.
7. Enrolment lifecycle findings.
8. Access-all-groups behavior.
9. Database map.
10. Moodle code paths.
11. Proposed FastAPI group model.
12. Open questions.

## Suggested New Application Entities

```text
Group
GroupMembership
Grouping
GroupingGroup
ActivityGroupPolicy
GroupAccessDecision
```

Suggested policy fields:

```text
ActivityGroupPolicy
- activity_id
- mode
- grouping_id
- restrict_access
- allow_visibility
```

## Your Definition of Done

- [ ] Shared environment works.
- [ ] Groups and grouping created.
- [ ] Three assignment modes tested.
- [ ] Three forum modes tested.
- [ ] TA scope tested.
- [ ] Student in two groups tested.
- [ ] Grouping restriction tested.
- [ ] Membership after submission tested.
- [ ] Enrolment lifecycle tested.
- [ ] Access-all-groups tested.
- [ ] 12–15 rules written.
- [ ] Hard Cases 3 and 4 covered.
- [ ] Handoff reviewed by Yaman.

# Your Required Output Files

Maintain your own working file during investigation.

Your findings will later be merged into Team 2's official repository.

Recommended structure:

```text
notes/
└── YOUR-DOMAIN.md

evidence/
├── screenshots/
├── database/
├── code-paths/
└── experiment-notes/

tests/
└── hard-cases/
```

Your final handoff to Yaman must include:

1. Your confirmed business rules.
2. Your evidence references.
3. Your table relationship map.
4. Your Moodle PHP code paths.
5. Your experiments and reproduction steps.
6. Your proposed model for the new FastAPI app.
7. Data that can be extracted.
8. Data that cannot be represented cleanly.
9. Open questions.
10. At least one hard-case test contribution.

---

# Final Reminder

You must not investigate Moodle as a normal user only.

For every important behavior, connect:

```text
Visible Moodle behavior
        +
Database state
        +
Code decision
        =
Confirmed business rule
```

Your job is not merely to say what button you clicked.

Your job is to explain:

- What Moodle did
- Why it did it
- Which data controlled it
- Which code made the decision
- How Team 2 should rebuild the behavior
- What cannot be preserved outside Moodle
