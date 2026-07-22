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

**Name:** Issa  
**Primary domain:** Enrolment and User Lifecycle  
**Rule prefix:** `ENR-`

## Your Mission

You must understand:

> How does a person become a participant in a course, remain active, become suspended, leave, and return?

Your main responsibility is not user profile design. Your responsibility is the relationship between the user and the course.

You must clearly explain the difference between:

- A Moodle user account
- An enrolment method
- An enrolment instance inside a course
- A user's enrolment record
- An active enrolment
- A suspended enrolment
- An expired enrolment
- An unenrolled user
- A re-enrolled user
- A role assigned as part of enrolment

## What You Must Build as Basic Dependencies

You must create the complete shared environment described above.

You need basic roles, groups, activities, and completion because you must observe what happens to them when enrolment changes.

However, do not deeply investigate:

- Full capability resolution
- Every role override
- Every group mode
- Every completion criterion
- Gradebook aggregation

When one of your experiments touches those topics, record the observation and send the deep question to the correct owner.

---

# Your Additional Setup

## Create a Cohort

Create:

```text
Cohort name: T2 Cohort A
Cohort ID: T2-COHORT-A
Members:
- student.a
- student.returning
```

Add a Cohort Sync enrolment method to `T2-TEST`.

## Enable Self Enrolment

Add:

```text
Custom instance name: T2 Self Enrolment
Default role: Student
Allow new enrolments: Yes
Allow existing enrolments: Yes
```

Use an enrolment key only if needed. Do not commit it.

## Prepare a Lifecycle Student

Use:

```text
student.returning
```

This user must:

- Submit Assignment 1
- Post in Forum 1
- View Page 1
- Attempt Quiz 1
- Join a group

This creates data that can be inspected before and after suspension, unenrolment, and re-enrolment.

---

# Concepts You Must Explain

By the end, you must be able to explain these without guessing:

1. User account
2. Course enrolment
3. Enrolment plugin
4. Enrolment instance
5. User enrolment record
6. Manual enrolment
7. Self enrolment
8. Cohort Sync
9. Multiple simultaneous enrolment paths
10. Active status
11. Suspended status
12. Start date
13. End date
14. Expired enrolment
15. Unenrolment
16. Re-enrolment
17. Role assignment created by enrolment
18. Difference between access and stored historical data

---

# Questions You Must Answer

1. Can one user have two enrolment methods in one course?
2. How is each path stored?
3. Does Moodle merge the paths or keep them separately?
4. What happens if one path is removed?
5. What happens if the entire enrolment method is disabled?
6. What is the difference between disabling and deleting a method?
7. What is the difference between suspension and unenrolment?
8. Does a suspended user remain in Participants?
9. Can a suspended user open the course?
10. What happens to the user's course role?
11. What happens to group membership?
12. What happens to submissions?
13. What happens to forum posts?
14. What happens to grades?
15. What happens to activity completion?
16. What happens to course completion?
17. What returns after re-enrolment?
18. Does Moodle create a new enrolment record or restore an old one?
19. How do start and end dates affect access?
20. Can two enrolment paths assign different roles?
21. Which enrolment source is responsible for removing a role?
22. Can one path remain active while another is suspended?
23. What event records are generated?
24. Can an administrator identify why a person is enrolled?
25. What enrolment information must the new Team 2 app preserve?

---

# Required Experiments

## ENR-001 — Manual Enrolment Baseline

1. Manually enrol `student.a`.
2. Record the Participants UI.
3. Query `mdl_enrol`.
4. Query `mdl_user_enrolments`.
5. Query related `mdl_role_assignments`.
6. Record the enrolment instance and user enrolment relationship.
7. Suspend the enrolment.
8. Compare UI and rows.
9. Reactivate it.
10. Record the rule.

## ENR-002 — Multiple Enrolment Paths

Setup:

```text
student.a:
- Manual enrolment
- Cohort Sync enrolment
```

Steps:

1. Confirm both paths exist.
2. Record both user enrolment rows.
3. Confirm course access.
4. Remove the student from the cohort.
5. Confirm whether Manual Enrolment remains.
6. Test course access.
7. Add the student back.
8. Remove Manual Enrolment only.
9. Test access again.
10. Remove the final active path.
11. Test access.
12. Explain every transition.

This is your primary ownership for Hard Case 1.

## ENR-003 — Disable vs Delete an Enrolment Method

1. Confirm students exist through Self Enrolment.
2. Disable new self enrolments.
3. Check current students.
4. Disable existing enrolments if Moodle exposes the option.
5. Check access.
6. Re-enable it.
7. Delete the enrolment instance in a disposable test course if safe.
8. Compare behavior.
9. Record which rows are removed or changed.

## ENR-004 — Suspend vs Unenrol

Use `student.returning`.

Before changing enrolment:

- Submit Assignment 1.
- Post in Forum 1.
- View Page 1.
- Complete or attempt Quiz 1.
- Join Group A.

Then:

1. Record all related IDs.
2. Suspend the enrolment.
3. Test login and course access.
4. Inspect enrolment status.
5. Inspect role assignment.
6. Inspect group membership.
7. Inspect submissions.
8. Inspect posts.
9. Inspect completion.
10. Reactivate.
11. Test all data again.
12. Fully unenrol.
13. Inspect everything again.
14. Re-enrol manually.
15. Inspect whether data is visible again.

Coordinate:
- Roles result with Khaled
- Group result with Mahmoud
- Completion result with Mahdi
- Submission and grades with Team 3

## ENR-005 — Self Enrolment Lifecycle

1. Use a student not enrolled.
2. Join through Self Enrolment.
3. Record the generated rows.
4. Compare with Manual Enrolment.
5. Change enrolment start and end settings.
6. Prevent new self enrolments.
7. Check existing users.
8. Suspend a self-enrolled user.
9. Unenrol the user.
10. Rejoin if allowed.
11. Record whether the new record differs.

## ENR-006 — Start and End Dates

1. Set start date in the future.
2. Test access before start.
3. Move start to the past.
4. Test again.
5. Set end date in the future.
6. Move end date to the past.
7. Observe status and access.
8. Compare with manual suspension.
9. Check cron-related behavior if a delayed update occurs.
10. Record whether expiry is immediate or scheduled.

## ENR-007 — Two Methods, Two Roles

1. Enrol a test user manually as Student.
2. Enrol the same user using another method with another role if supported.
3. Inspect enrolment rows.
4. Inspect role assignments.
5. Remove one enrolment path.
6. Check which role remains.
7. Ask Khaled to verify final capabilities.
8. Record which enrolment method controls which role assignment.

## ENR-008 — Re-enrolment Identity

1. Record the original user enrolment ID.
2. Unenrol the user.
3. Re-enrol through the same method.
4. Compare IDs and timestamps.
5. Re-enrol through a different method.
6. Compare again.
7. Determine whether Moodle restores or recreates the relationship.

---

# Database Tables You Own

Primary:

```text
mdl_user
mdl_course
mdl_enrol
mdl_user_enrolments
mdl_role_assignments
mdl_context
```

Related survival tables:

```text
mdl_groups_members
mdl_course_modules_completion
mdl_course_completions
mdl_assign_submission
mdl_forum_posts
```

Do not make final grade claims without Team 3.

For every table, document:

- Primary key
- Foreign keys
- Status fields
- Time fields
- Source/method relationship
- Deletion or preservation behavior

---

# Moodle Code Search Targets

Search for:

```text
is_enrolled
get_enrolled_users
user_enrolments
enrol_plugin
enrol_manual
enrol_self
enrol_cohort
enrol_user
unenrol_user
update_user_enrol
```

Record:

- Plugin folder
- Main class
- Method called
- Database operation
- Events generated
- Role assignment behavior

---

# Rules You Must Deliver

Minimum:

```text
12–15 strong ENR rules
```

Suggested categories:

- Multiple method rules
- Suspension rules
- Unenrolment rules
- Re-enrolment rules
- Date rules
- Self-enrolment rules
- Cohort Sync rules
- Role lifecycle rules
- Data survival rules

---

# Your Required Handoff

Provide Yaman with:

1. Enrolment lifecycle diagram.
2. Manual vs Self vs Cohort Sync comparison.
3. Suspend vs Unenrol comparison table.
4. Hard Case 1 result.
5. Your part of Hard Case 2.
6. Tables and relationships.
7. Moodle code paths.
8. Extraction fields required by the new app.
9. Information that cannot be preserved.
10. Proposed FastAPI enrolment model.
11. At least one automated test.
12. Open questions requiring another owner.

## Suggested New Application Entities

```text
User
Course
EnrolmentMethod
UserEnrolment
EnrolmentStatus
EnrolmentRoleLink
```

Suggested fields:

```text
UserEnrolment
- id
- user_id
- course_id
- method_id
- status
- starts_at
- ends_at
- suspended_at
- removed_at
- source_reference
```

## Your Definition of Done

- [ ] Shared environment works.
- [ ] Cohort Sync works.
- [ ] Self Enrolment works.
- [ ] Multiple paths tested.
- [ ] Suspend vs Unenrol tested.
- [ ] Re-enrolment tested.
- [ ] Dates tested.
- [ ] Data survival checked.
- [ ] 12–15 rules written.
- [ ] Database map written.
- [ ] Code paths recorded.
- [ ] Hard Case 1 covered.
- [ ] Hard Case 2 contribution complete.
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
