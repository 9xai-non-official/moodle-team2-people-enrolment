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

**Name:** Khaled  
**Primary domain:** Roles, Permissions, and Contexts  
**Rule prefix:** `ROL-`

## Your Mission

You must understand:

> Why can a user perform a specific action in one Moodle location but not another?

Your assignment is not to memorize Moodle role names.

You must understand how Moodle reaches the final permission decision.

You must explain:

- Role
- Capability
- Permission value
- Context
- Role assignment
- Capability override
- Multiple roles
- Inheritance
- Allow
- Prevent
- Prohibit

## What You Must Build as Basic Dependencies

Build the complete shared environment.

You need enrolments, groups, and activities so roles can be tested in realistic contexts.

However, do not deeply investigate:

- Every enrolment plugin
- Every group lifecycle rule
- Every completion criterion
- Grade aggregation

Your focus is the permission engine.

---

# Your Additional Setup

Create:

```text
Role name: Group Teaching Assistant
Short name: group_ta
Archetype: Non-editing teacher
```

Create a second disposable custom role:

```text
Role name: Permission Test Role
Short name: permission_test
```

Use the disposable role for dangerous or confusing override tests.

Create a second course:

```text
Full name: Team 2 Permission Comparison Course
Short name: T2-PERM
```

This lets you test the same person in different course contexts.

Create a second assignment in `T2-TEST`:

```text
Assignment 2 — Restricted Grading Assignment
```

This lets you compare module-level permission behavior.

---

# Concepts You Must Explain

1. Role
2. Role archetype
3. Capability
4. Permission
5. Context
6. System context
7. Course category context
8. Course context
9. Module/activity context
10. User context
11. Role assignment
12. Role capability
13. Permission override
14. Allow
15. Not set
16. Prevent
17. Prohibit
18. Multiple role combination
19. Capability inheritance
20. Final permission decision

---

# Questions You Must Answer

1. Is a role global?
2. Where is a role assigned?
3. Can the same user have different roles in different courses?
4. Can one user have multiple roles in one course?
5. Are capabilities combined?
6. What does Not set mean?
7. What is the difference between Prevent and Prohibit?
8. Can a lower context override a higher context?
9. Can Prohibit ever be overridden?
10. What happens when one role allows and another prevents?
11. What happens when one role allows and another prohibits?
12. Does enrolment create a role assignment?
13. Can a role assignment exist without active enrolment?
14. Can a user access a course without a normal Student role?
15. Can a user have a role only at activity level?
16. What context is checked for course editing?
17. What context is checked for assignment grading?
18. How do group-related capabilities affect grading scope?
19. What does `moodle/site:accessallgroups` change?
20. How should Team 2 explain a permission decision to the user?
21. Which parts of Moodle's permission model are essential?
22. Which parts are Moodle-specific complexity?
23. What information must be extracted?
24. What cannot be represented in a simplified model?
25. What should the FastAPI permission evaluator receive and return?

---

# Required Experiments

## ROL-001 — Same User, Different Courses

Setup:

```text
teacher.a:
- Teacher in T2-TEST
- Student or no role in T2-PERM
```

Steps:

1. Test course editing in `T2-TEST`.
2. Test editing in `T2-PERM`.
3. Inspect `mdl_role_assignments`.
4. Inspect `mdl_context`.
5. Map each context ID to a course.
6. Record why behavior differs.

## ROL-002 — Multiple Roles in One Course

1. Give `ta.a` Non-editing Teacher.
2. Also give `ta.a` Student.
3. Record visible actions.
4. Inspect both role assignments.
5. Remove Student only.
6. Compare behavior.
7. Remove Non-editing Teacher only.
8. Compare behavior.
9. Identify capability combination behavior.

## ROL-003 — Course-Level Override

1. Choose one safe capability.
2. Record the role's original permission.
3. Override it in `T2-TEST`.
4. Test the action.
5. Inspect `mdl_role_capabilities`.
6. Remove the override.
7. Retest.
8. Record the context and result.

Suggested capabilities:

```text
moodle/course:update
mod/forum:startdiscussion
mod/assign:grade
```

Use exact capability names from your Moodle version.

## ROL-004 — Activity-Level Override

1. Allow `ta.a` to grade Assignment 1.
2. Prevent grading in Assignment 2 at module context.
3. Test both assignments.
4. Inspect both module context rows.
5. Inspect override records.
6. Explain why one activity allows the action and the other denies it.

## ROL-005 — Allow vs Prevent

1. Use the disposable test role.
2. Set a capability to Allow at a higher context.
3. Set it to Prevent at a lower context.
4. Test the result.
5. Reverse the arrangement if Moodle allows.
6. Record inheritance behavior.

## ROL-006 — Prohibit

Use only a disposable role and safe capability.

1. Set capability to Prohibit.
2. Try to Allow it at a lower context.
3. Test the result.
4. Inspect database values.
5. Restore the test environment.
6. Record whether Prohibit is absolute.

## ROL-007 — Role Without Normal Enrolment

1. Assign a role at course context through an administrative role assignment path.
2. Do not create a normal enrolment if possible.
3. Check Participants.
4. Check course access.
5. Inspect `mdl_role_assignments`.
6. Inspect `mdl_user_enrolments`.
7. Coordinate with Issa before finalizing the rule.

## ROL-008 — Enrolment Suspension and Role State

Coordinate with Issa.

1. Record `ta.a` role assignment.
2. Suspend the enrolment.
3. Check whether the role row remains.
4. Test the capability.
5. Reactivate.
6. Fully unenrol.
7. Check role rows again.
8. Record the distinction between stored assignment and effective access.

## ROL-009 — Group Access Capability

Coordinate with Mahmoud.

1. Configure Assignment 1 with Separate Groups.
2. Put `ta.a` in Group A.
3. Verify access to Group A.
4. Test access to Group B.
5. Change `moodle/site:accessallgroups`.
6. Retest.
7. Explain the interaction between capability and group restriction.

## ROL-010 — Permission Explanation Prototype

For at least five permission checks, produce structured results:

```json
{
  "user": "ta.a",
  "capability": "mod/assign:grade",
  "context": "Assignment 1",
  "allowed": true,
  "roles": ["Group Teaching Assistant"],
  "overrides": [],
  "group_effect": "Group A only",
  "reasons": [
    "The user is actively enrolled.",
    "The role allows assignment grading.",
    "The activity uses separate groups.",
    "The user belongs to Group A."
  ]
}
```

---

# Database Tables You Own

Primary:

```text
mdl_role
mdl_role_assignments
mdl_role_capabilities
mdl_context
```

Supporting:

```text
mdl_user
mdl_course
mdl_course_modules
mdl_enrol
mdl_user_enrolments
mdl_groups
mdl_groups_members
```

For each table, document:

- Key fields
- Context relationship
- Role relationship
- Capability value representation
- Inheritance implications
- Deletion behavior

---

# Moodle Code Search Targets

Search for:

```text
has_capability
require_capability
get_user_roles
role_assign
role_unassign
assign_capability
unassign_capability
context_system
context_course
context_module
CAP_ALLOW
CAP_PREVENT
CAP_PROHIBIT
```

For every important code path, write:

- File path
- Function name
- Input context
- Capability checked
- Decision returned
- Related cache behavior if found

Do not spend the whole day reading cache internals unless it changes the business rule.

---

# Rules You Must Deliver

Minimum:

```text
12–15 strong ROL rules
```

Required categories:

- Context rules
- Role assignment rules
- Multiple role rules
- Allow/Prevent/Prohibit rules
- Override rules
- Enrolment interaction rules
- Group capability rules
- Module-specific permission rules

---

# Your Hard Case Responsibility

You are joint owner of Hard Case 3:

> A teaching assistant can grade one group, cannot grade another, and cannot see a third.

Mahmoud owns the group setup and visibility behavior.

You own:

- Required capabilities
- Role configuration
- Context
- Access-all-groups behavior
- Permission explanation

You also support Hard Case 4 where a student belongs to two groups.

---

# Your Required Handoff

Provide Yaman with:

1. Context hierarchy diagram.
2. Role vs capability explanation.
3. Allow/Prevent/Prohibit table.
4. Multiple-role findings.
5. Course override findings.
6. Activity override findings.
7. Role-without-enrolment findings.
8. Permission evaluator pseudocode.
9. Structured explanation examples.
10. Database map.
11. Moodle code paths.
12. Hard Case 3 capability requirements.
13. Open questions.

## Suggested New Application Entities

```text
Role
Capability
RoleCapability
RoleAssignment
Context
PermissionOverride
PermissionDecision
PermissionReason
```

Suggested evaluator:

```text
evaluate_permission(
    user_id,
    capability,
    context_id,
    target_user_id=None,
    activity_id=None
)
```

Suggested response:

```text
allowed
decision
capability
context
roles_considered
overrides_considered
group_restrictions
reasons
```

## Your Definition of Done

- [ ] Shared environment works.
- [ ] Custom roles created.
- [ ] Different course contexts tested.
- [ ] Multiple roles tested.
- [ ] Course override tested.
- [ ] Module override tested.
- [ ] Allow/Prevent/Prohibit tested.
- [ ] Role without enrolment tested.
- [ ] Group capability tested.
- [ ] 12–15 rules written.
- [ ] Context diagram complete.
- [ ] Hard Case 3 contribution complete.
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
