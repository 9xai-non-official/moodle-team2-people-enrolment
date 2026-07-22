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

**Name:** Mahdi  
**Primary domain:** Progress and Completion  
**Rule prefix:** `PRG-`

## Your Mission

You must understand:

> How does Moodle decide that an activity or course is complete, where does it store that decision, and what happens to progress over time?

Your job is not simply to display a percentage.

You must explain:

- Activity completion
- Course completion
- Manual completion
- Automatic completion
- Completion states
- Completion conditions
- Recalculation
- Historical progress
- Deletion impact
- Enrolment lifecycle impact

## What You Must Build as Basic Dependencies

Build the complete shared environment.

You need students, enrolments, activities, roles, and basic groups.

However, do not deeply investigate:

- Every enrolment plugin
- Full role resolution
- All group behavior
- Gradebook aggregation

Coordinate with:

- Issa for suspend/unenrol/re-enrol
- Team 3 for grade-based completion
- Mahmoud for group-restricted activities
- Khaled for manual override permissions

---

# Your Additional Setup

Ensure completion tracking is enabled at the site and course level.

Configure:

## Page 1

```text
Completion:
- Show activity as complete when conditions are met
- Student must view this activity
```

## Quiz 1

```text
Completion:
- Student must receive a grade
- Require passing grade
```

## Assignment 1

```text
Completion:
- Student must submit
```

## Forum 1

```text
Completion:
- Require one discussion or reply
```

Create:

```text
Page Manual — Manual Completion Activity
```

Configure it so the student can mark it complete manually.

Create one disposable activity:

```text
Page Disposable — Delete After Completion Test
```

Create two additional test courses:

```text
T2-YEAR-1
T2-YEAR-2
```

Use these for multi-course historical progress experiments.

---

# Concepts You Must Explain

1. Completion tracking
2. Activity completion rule
3. Activity completion state
4. Incomplete
5. Complete
6. Complete-pass
7. Complete-fail
8. Manual completion
9. Automatic completion
10. Completion by view
11. Completion by submission
12. Completion by grade
13. Course completion criteria
14. Course completion record
15. Progress percentage
16. Completion recalculation
17. Hidden activity behavior
18. Deleted activity behavior
19. Enrolment lifecycle behavior
20. Historical progress limitations

---

# Questions You Must Answer

1. Where is activity completion stored?
2. Where is course completion stored?
3. Is progress calculated live or saved?
4. What completion states exist?
5. What is the difference between manual and automatic completion?
6. What happens after a student views a required page?
7. What happens after a failed quiz?
8. What happens after a later passing attempt?
9. What happens after an assignment submission is removed?
10. What happens when a completion condition changes?
11. Does Moodle recalculate previous completion automatically?
12. What happens when an activity is hidden?
13. What happens when access to an activity is restricted?
14. Does a restricted activity count in progress?
15. What happens when an activity is deleted?
16. What happens to completion when a student is suspended?
17. What happens after unenrolment?
18. What happens after re-enrolment?
19. Can a teacher override completion?
20. Can progress be reconstructed across several courses?
21. What happens when an old course is deleted?
22. Is historical progress preserved anywhere?
23. Which timestamps matter?
24. What must Team 2 extract into its new app?
25. What history cannot survive extraction?

---

# Required Experiments

## PRG-001 — View Completion

1. Record `student.a` current completion rows.
2. Log in as `student.a`.
3. View Page 1.
4. Refresh the course.
5. Inspect `mdl_course_modules_completion`.
6. Record state and timestamp.
7. View it again.
8. Check whether the row changes.
9. Write the rule.

## PRG-002 — Manual Completion

1. Open Page Manual as `student.a`.
2. Mark complete.
3. Inspect the completion row.
4. Unmark it.
5. Inspect again.
6. Test whether `teacher.a` can override it.
7. Test whether `ta.a` can override it.
8. Coordinate permission questions with Khaled.

## PRG-003 — Quiz Fail Then Pass

1. Attempt Quiz 1 and fail.
2. Inspect grade and completion.
3. Record completion state.
4. Attempt again and pass.
5. Inspect state and timestamp.
6. Change the passing grade after completion.
7. Observe whether Moodle recalculates.
8. Coordinate grade interpretation with Team 3.

## PRG-004 — Assignment Submission Completion

1. Submit Assignment 1.
2. Inspect completion.
3. Edit the submission.
4. Check completion.
5. Remove or revert submission if safely possible.
6. Check whether completion changes.
7. Ask Team 3 about submission lifecycle rules.

## PRG-005 — Forum Completion

1. View Forum 1 without posting.
2. Inspect completion.
3. Add a reply.
4. Inspect completion.
5. Delete the reply if permitted.
6. Inspect whether completion reverses.
7. Record whether the rule is event-based or recalculated.

## PRG-006 — Condition Change

1. Complete Page 1.
2. Change the completion condition.
3. Check old completion.
4. Trigger any available recalculation.
5. Compare records.
6. Record whether administrators are warned.
7. Explain implications for data migration.

## PRG-007 — Hidden Activity

1. Complete a test activity.
2. Hide it from students.
3. Check course progress.
4. Check the student progress report.
5. Unhide it.
6. Compare.
7. Record whether hidden items count.

## PRG-008 — Restricted Activity

Coordinate with Mahmoud.

1. Restrict Page 2 to a grouping.
2. Test progress for an included student.
3. Test progress for `student.c`, who is initially outside the grouping.
4. Check whether the unavailable activity affects the denominator.
5. Add Group C to the grouping.
6. Retest.
7. Record the rule.

## PRG-009 — Suspend, Unenrol, Re-enrol

Use `student.returning`.

Before lifecycle changes:

- Complete Page 1.
- Submit Assignment 1.
- Post in Forum 1.
- Attempt Quiz 1.

Then:

1. Record all completion rows.
2. Suspend enrolment.
3. Check progress UI.
4. Reactivate.
5. Check again.
6. Fully unenrol.
7. Inspect rows.
8. Re-enrol.
9. Check whether progress returns.
10. Coordinate with Issa.

## PRG-010 — Delete a Completed Activity

Use Page Disposable only.

1. Complete the page.
2. Record module and completion IDs.
3. Delete the activity.
4. Check completion rows.
5. Check course progress.
6. Check logs or recycle bin if available.
7. Restore if the environment supports it.
8. Record what can and cannot be reconstructed.

## PRG-011 — Course Completion

1. Configure course completion criteria.
2. Complete all required activities.
3. Check whether course completion is immediate.
4. Run cron if required and approved.
5. Inspect `mdl_course_completions`.
6. Change a criterion.
7. Observe effect.
8. Record delay and recalculation behavior.

## PRG-012 — Historical Progress Across Courses

Use:

```text
T2-YEAR-1
T2-YEAR-2
T2-TEST
```

1. Enrol `student.a` in each.
2. Complete different activities.
3. Query progress across all courses.
4. Design a simple combined progress report.
5. Determine which fields are required.
6. Test a deleted disposable course only if explicitly approved.
7. If deletion is unsafe, inspect schema and code and mark the test as blocked.
8. Explain whether three-year progress including deleted courses is possible.

This is your primary ownership for Hard Case 5.

---

# Database Tables You Own

Primary:

```text
mdl_course_modules
mdl_course_modules_completion
mdl_course_completions
mdl_course_completion_criteria
mdl_course_completion_crit_compl
```

Supporting:

```text
mdl_user
mdl_course
mdl_enrol
mdl_user_enrolments
```

Activity tables and grade tables may be needed.

For each completion table, document:

- User relationship
- Course relationship
- Activity relationship
- State values
- Timestamp fields
- Recalculation fields
- Deletion behavior

---

# Moodle Code Search Targets

Search for:

```text
completion_info
completion_completion
COMPLETION_INCOMPLETE
COMPLETION_COMPLETE
COMPLETION_COMPLETE_PASS
COMPLETION_COMPLETE_FAIL
update_state
mark_complete
course_completions
```

Also inspect:

- Page view completion handling
- Quiz completion dependency
- Assignment completion dependency
- Forum completion dependency
- Course completion cron behavior

Record whether completion logic is centralized or activity-specific.

---

# Progress Formula Investigation

Do not assume Moodle uses:

```text
completed activities / all activities
```

Investigate:

- Which activities are included
- Hidden activities
- Restricted activities
- Activities without completion rules
- Failed completion states
- Manual activities
- Deleted activities

Write the exact denominator and numerator behavior for your tested scenario.

---

# Rules You Must Deliver

Minimum:

```text
12–15 strong PRG rules
```

Required categories:

- View completion
- Manual completion
- Grade completion
- Submission completion
- Forum completion
- Condition change
- Hidden/restricted activities
- Deletion
- Enrolment lifecycle
- Course completion
- Historical progress

---

# Your Hard Case Responsibility

## Hard Case 5 — Primary Owner

> Show a student's progress across every course over three years, including courses that have been deleted.

You must identify:

- What Moodle can show
- What remains after normal course use
- What is lost after deletion
- Whether backup, logs, or external snapshots are required
- What Team 2's simplified app must preserve proactively

You also jointly support Hard Case 2 with Issa.

---

# Your Required Handoff

Provide Yaman with:

1. Activity completion state diagram.
2. Manual vs automatic completion table.
3. Progress calculation evidence.
4. Suspend/unenrol/re-enrol findings.
5. Deleted activity findings.
6. Course completion findings.
7. Historical progress findings.
8. Hard Case 5 result.
9. Database map.
10. Moodle code paths.
11. Proposed FastAPI progress model.
12. Open questions.

## Suggested New Application Entities

```text
ActivityCompletionRule
ActivityCompletion
CourseCompletionCriteria
CourseCompletion
ProgressSnapshot
```

Suggested fields:

```text
ActivityCompletion
- user_id
- activity_id
- state
- completed_at
- source
- evidence_reference
```

For historical reporting, consider:

```text
ProgressSnapshot
- user_id
- course_id
- captured_at
- completed_count
- required_count
- percentage
- course_status
```

Do not finalize without Yaman.

## Your Definition of Done

- [ ] Shared environment works.
- [ ] Completion tracking works.
- [ ] View completion tested.
- [ ] Manual completion tested.
- [ ] Quiz fail/pass tested.
- [ ] Submission completion tested.
- [ ] Forum completion tested.
- [ ] Condition change tested.
- [ ] Hidden/restricted activity tested.
- [ ] Enrolment lifecycle tested.
- [ ] Deleted activity tested.
- [ ] Course completion tested.
- [ ] Historical progress tested.
- [ ] 12–15 rules written.
- [ ] Hard Case 5 covered.
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
