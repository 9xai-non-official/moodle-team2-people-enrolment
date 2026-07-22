# Team 2 Testing Assignment — Enrolment System
**Owner:** Issa  
**Team:** Team 2 — People and Enrolment  
**Primary area:** Enrolment methods, lifecycle, suspension, unenrolment, re-enrolment, and simultaneous enrolments  
**Anchor reviewer:** Yaman

---

## 1. Mission

Discover how Moodle decides whether a user is effectively enrolled in a course.

Do not model enrolment as a single Boolean such as `is_enrolled = true`. Moodle may contain multiple course enrolment methods, multiple user-enrolment records, start and end dates, suspension, expiry, and role assignments connected to enrolment.

Every accepted rule must have evidence from:

1. Moodle UI behaviour.
2. Database rows before and after the action.
3. Moodle PHP code or the relevant function path.
4. Reproducible test steps.

Your work owns Team 2 Hard Cases 1 and 2.

---

## 2. Controlled Test Setup

### Course

- Full name: `Team 2 People and Enrolment Lab`
- Short name: `T2-LAB`

### Users

- `student.a`
- `student.b`
- `teacher.a`
- `ta.a`

### Roles in `T2-LAB`

- `teacher.a` → Teacher
- `ta.a` → Non-editing teacher
- `student.a` → Student
- `student.b` → Student

### Enrolment methods to investigate

At minimum:

- Manual enrolment.
- Self enrolment, if enabled.
- Cohort sync or another automatic/synchronised method.
- Guest access only as a comparison.

Learn the workflow first with controlled data, then repeat important checks against the supplied real course.

---

## 3. Questions You Must Answer

1. What is the difference between a user account, course enrolment instance, user enrolment, and role assignment?
2. Can one user have multiple enrolment sources in the same course?
3. If one enrolment source disappears, can another source keep access active?
4. What is the difference between suspension, expiry, unenrolment, disabling a method, and deleting a method?
5. What happens to roles, groups, completion, submissions, grades, forum posts, and logs when a student leaves?
6. What is restored when the student re-enrols?
7. Does Moodle reactivate an old record or create a new one?
8. Which dates and statuses determine effective access?
9. Which PHP function answers whether a user is enrolled in a context?
10. Which rules vary by enrolment plugin?

---

## 4. Test Cases

### E-01 — Account Without Course Enrolment

1. Create `student.a` but do not enrol the user in `T2-LAB`.
2. Log in as `student.a`.
3. Check **My courses**.
4. Search for `T2-LAB`.
5. Try the direct course URL.
6. Record the exact message, redirect, or denial.

Evidence:

- Screenshot.
- User table row.
- Proof that no matching user-enrolment exists.
- Relevant log entry.

Candidate rule: authentication and course enrolment are separate systems.

---

### E-02 — Manual Enrolment

1. Open `T2-LAB → Participants → Enrol users`.
2. Enrol `student.a` using Manual enrolment with Student role.
3. Log in as `student.a` and open the course.
4. Compare database rows before and after.

You must explain which record represents:

- The course-level Manual enrolment method.
- The user membership under that method.
- The Student role assignment.

---

### E-03 — Suspend and Reactivate

1. Suspend `student.a` from Participants.
2. Test course access as the student.
3. Inspect Participants as Teacher.
4. Reactivate the enrolment.
5. Test access again.

Observe:

- Is the student still listed?
- Does the role remain?
- Does group membership remain?
- Does completion remain?
- Is the same database row updated?
- Which status value changes?

Deliver a rule explaining why suspension is different from deletion.

---

### E-04 — Unenrol and Re-enrol

Before unenrolment, ensure `student.a` has:

- One activity completion.
- One assignment submission.
- One grade.
- Group A membership.

Then:

1. Unenrol the student.
2. Inspect UI and database.
3. Re-enrol manually.
4. Inspect all related data again.

Coordinate with:

- Mahmoud for groups.
- Mahdi for progress.
- Team 3 for submissions and grades.
- Team 1 for forum posts or activity visibility.

Record what disappeared from UI, what remained in storage, and what returned after re-enrolment.

---

### E-05 — Start and End Dates

1. Create an enrolment starting in the future.
2. Test access before the start time.
3. Change start time to the present.
4. Set an end date and test expiry.
5. Check whether cron is involved.

Explain the difference between time-based inactivity and explicit suspension.

---

### E-06 — Disable an Enrolment Method

1. Keep `student.a` manually enrolled.
2. Disable Manual enrolment at course level.
3. Test student access.
4. Re-enable it.
5. Compare with suspending only the user’s enrolment.

Explain the difference between:

- Disabling an enrolment instance.
- Suspending one user enrolment.
- Removing a user from the course.

---

### E-07 — Two Simultaneous Enrolment Methods
**Hard Case 1**

Enrol `student.a` through:

1. Manual enrolment.
2. Cohort sync or another automatic method.

Then:

1. Confirm both are active.
2. Remove the automatic membership or source.
3. Test whether the student remains in the course.
4. Inspect all enrolment and role rows.
5. Remove the manual enrolment afterward and test again.

Final required answer:

> A student is enrolled manually and through automatic sync. The sync is removed. Is the student still enrolled, and why?

Do not answer until UI, database, and code evidence agree.

---

### E-08 — Drop in Week 10 and Re-enrol in Week 12
**Hard Case 2**

Before dropping, ensure the student has:

- Course access.
- Group membership.
- Forum post.
- Assignment submission.
- Grade or quiz attempt.
- Activity completion.

Test three interpretations of “drop”:

1. Suspend enrolment.
2. Unenrol user.
3. Allow enrolment to expire.

Then re-enrol and complete this matrix:

| Data type | After suspension | After unenrolment | After re-enrolment |
|---|---|---|---|
| Course access | | | |
| Role | | | |
| Group membership | | | |
| Submission | | | |
| Grade | | | |
| Forum post | | | |
| Activity completion | | | |
| Course completion | | | |

---

## 5. Database Investigation

Identify the real table prefix first. Focus on tables equivalent to:

- `user`
- `course`
- `enrol`
- `user_enrolments`
- `role_assignments`
- `role`
- `context`
- `groups_members`
- `course_modules_completion`
- `course_completions`
- Assignment, grade, forum, and log tables

For every state-changing test:

1. Save rows before.
2. Perform one action only.
3. Save rows after.
4. Compare statuses, dates, and relationships.

Example evidence names:

```text
evidence/E-03-before-suspension.csv
evidence/E-03-after-suspension.csv
evidence/E-03-after-reactivation.csv
```

Never store passwords or secrets.

---

## 6. PHP Investigation

Search the Moodle source:

```bash
rg "user_enrolments"
rg "is_enrolled"
rg "get_enrolled_users"
rg "enrol_user"
rg "unenrol_user"
rg "update_user_enrol"
rg "role_assignments"
```

For each confirmed rule, record:

- File path.
- Class or function.
- Important condition.
- State read.
- State written.
- How it contributes to the final access decision.

---

## 7. Rule Template

```markdown
## T2-ENR-XXX — Rule title

### Question
The exact Moodle decision being tested.

### Setup
Course, user, enrolment sources, roles, and dates.

### Steps
Numbered reproduction steps.

### Observed behaviour
Exact result.

### UI evidence
Page and screenshot reference.

### Database evidence
Tables, rows, and changed fields.

### Code evidence
File, function, and relevant branch.

### Classification candidate
Essential / Accidental / Obsolete / Not classified yet.

### Impact on our application
Required model or API behaviour.

### Confidence
Confirmed / Partially confirmed / Unknown.
```

---

## 8. Deliverables

### End of Monday

- At least 5 enrolment rules with UI evidence.
- Manual enrolment flow documented.
- Suspension test completed.
- Initial table map.
- Open questions list.

### End of Tuesday

- At least 12 strong rules.
- Hard Cases 1 and 2 tested.
- Database relationship map.
- Important PHP paths identified.
- Losses added to `what-didnt-survive.md`.

### Wednesday handoff to Yaman

Provide:

1. How Moodle enrolment works.
2. Hard Case verdicts.
3. Required entities and statuses.
4. Required permission-engine inputs.
5. Proposed API behaviours.
6. Unresolved questions and blockers.
7. Evidence paths.
8. Plugin-specific risks.
9. Data our simplified application cannot preserve.

The work is complete only when another person can reproduce every important result without asking for clarification.
