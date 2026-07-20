# Team 2 Testing Assignment — Activity and Course Progress
**Owner:** Mahdi  
**Team:** Team 2 — People and Enrolment  
**Primary area:** Activity completion, course completion, history, deleted courses, and cross-team progress inputs  
**Anchor reviewer:** Yaman

---

## 1. Mission

Discover how Moodle decides that a student has completed an activity or course.

Do not reduce progress to one percentage. Moodle may track viewing, submitting, grading, passing, manual completion, course criteria, recalculation, and historical records.

Your work owns Team 2 Hard Case 5 and defines the progress data needed from Team 1 and Team 3.

Every rule requires UI, database, code, and reproducible-test evidence.

---

## 2. Controlled Setup

### Course

- `T2-LAB`

### Users

- `student.a`
- `student.b`
- `teacher.a`

### Activities

Create at least:

1. Page — completion by viewing.
2. Assignment — completion by submission.
3. Assignment or Quiz — completion by receiving a grade.
4. Quiz — completion by passing grade.
5. Manual-completion activity, if available.

Enable Completion tracking globally and inside the course. Record the exact settings required.

---

## 3. Concepts You Must Distinguish

- Activity completion.
- Course completion.
- Progress display.
- Completion criteria.
- Completion state.
- Manual completion.
- Automatic completion.
- Grade-dependent completion.
- Historical progress.

Identify actual state values such as incomplete, complete, pass, or fail from the installed Moodle version.

---

## 4. Questions You Must Answer

1. Which settings must be enabled before completion is recorded?
2. How do viewing, submitting, receiving a grade, and passing differ?
3. Does Moodle store why completion happened or only the final state?
4. Is event history preserved?
5. What happens after suspension, unenrolment, re-enrolment, activity hiding, deletion, reset, or course deletion?
6. Can deleted-course progress be reconstructed?
7. Which fields must come from Team 1?
8. Which assessment events must come from Team 3?
9. Does Moodle recalculate after settings change?
10. Can a reliable three-year history be shown?

---

## 5. Test Cases

### P-01 — Completion Tracking Disabled

1. Use an activity before enabling completion tracking.
2. View and submit as `student.a`.
3. Check UI, reports, and database.

Explain what is missing when completion tracking is disabled.

---

### P-02 — Page Completed by View

Create:

```text
Welcome Page
Condition: Student must view the activity
```

1. Record state before view.
2. Open as `student.a`.
3. Return to course.
4. Check student display and Teacher completion report.
5. Inspect database.
6. Repeat views and check whether timestamp/state changes.

---

### P-03 — Assignment Completed by Submission

Create an Assignment with:

```text
Condition: Make a submission
```

Test:

1. Open without submitting.
2. Save draft, if supported.
3. Submit for grading.
4. Check when completion changes.
5. Edit or remove submission if allowed.

Determine whether draft counts and whether deletion reverses completion.

---

### P-04 — Completion by Grade

Configure:

```text
Condition: Receive a grade
```

1. Submit as student.
2. Check before grading.
3. Grade as Teacher or TA.
4. Check after grading.
5. Change, remove, or override grade.

Explain “receive a grade” versus “pass.”

---

### P-05 — Completion by Passing Grade

Use a Quiz or graded activity with a passing grade.

Test:

- Below pass.
- Equal to pass.
- Above pass.
- Regrade fail to pass.
- Regrade pass to fail.

Record completion state, pass/fail state, report display, database values, and recalculation behaviour.

---

### P-06 — Manual Completion

If supported, test:

- Student marks complete.
- Student reverses it.
- Teacher overrides it.
- Teacher reverses override.

Record who may act, timestamps, and whether the source/reason is stored.

---

### P-07 — Multiple Conditions

Configure an activity requiring more than one condition if possible, such as:

```text
View activity
+
Receive grade
```

Test event order:

1. View first, grade later.
2. Grade first, view later.
3. Change a condition after completion.

Determine whether all or any conditions are required.

---

### P-08 — Course Completion

Configure course completion using required activities.

Test:

- None complete.
- Some complete.
- All complete.
- One becomes incomplete again.
- Required activity deleted.

Determine whether updates are immediate, cron-based, reversible, timestamped, or historical.

---

### P-09 — Suspend, Unenrol, and Re-enrol

Coordinate with Issa.

Before changes, ensure `student.a` has:

- Viewed Page.
- Submitted Assignment.
- Received grade.
- Passed one activity.
- Partial course completion.

Test suspension, reactivation, unenrolment, and re-enrolment.

Complete:

| Progress data | Suspended | Unenrolled | Re-enrolled |
|---|---|---|---|
| Activity completion row | | | |
| Course completion row | | | |
| Student UI | | | |
| Teacher report | | | |
| Grade link | | | |
| Submission link | | | |

---

### P-10 — Hidden Activity

Complete an activity, then hide it.

Inspect student page, student progress, Teacher report, course completion calculation, and database.

Determine whether hidden means invisible, excluded, incomplete, or still counted.

---

### P-11 — Delete an Activity

Use a controlled activity.

Before deletion capture:

- Activity record.
- Completion rows.
- Course completion state.
- Logs.

Delete it, inspect recycle bin and related records, then restore if possible.

Determine what survives and whether the student history remains understandable.

---

### P-12 — Course Reset

Back up or copy the test course first.

Run reset with selected options and inspect:

- Enrolments.
- Groups.
- Submissions.
- Grades.
- Activity completion.
- Course completion.
- Logs.

Document each reset option separately where possible.

---

### P-13 — Hidden, Ended, Archived, and Deleted Course

Investigate separately:

1. Hidden course.
2. Ended course.
3. Archived-by-convention course, if there is no single archive state.
4. Deleted course.
5. Recycle-bin course.
6. Permanently deleted course.

For each state answer:

- Can Student see it?
- Can Teacher see it?
- Can reports show progress?
- Can APIs/database reconstruct it?
- Are course and activity names retained?
- Are completion timestamps retained?

---

### P-14 — Three-Year Progress
**Hard Case 5**

Simulate:

- Year 1 course — completed.
- Year 2 course — partially completed and hidden.
- Year 3 course — current.
- Delete one controlled course after capturing evidence.

Produce a feasibility report explaining:

1. What live Moodle can show.
2. What survives deletion.
3. What exists only in logs or backups.
4. What cannot be reconstructed.
5. Which snapshot/tombstone our application must store before deletion.
6. Why a foreign key to a live course is insufficient.

Do not claim full history unless evidence proves it.

---

## 6. Cross-Team Integration Requirements

### Required from Team 1

```text
course_id
course title
course state
activity_id
activity title
activity type
visibility
deleted/archived state
completion configuration
required earlier activity
group mode
```

### Required from Team 3

```text
event_id
user_id
course_id
activity_id
submission status
grade status
grade
passed
occurred_at
source
```

### Candidate events

```text
activity_viewed
submission_created
submission_finalised
grade_received
assessment_passed
assessment_failed
activity_deleted
course_deleted
```

Every event needs an idempotency key so duplicates do not double-count progress.

---

## 7. Database Investigation

Focus on tables equivalent to:

- `course_modules_completion`
- `course_completions`
- Course completion criteria tables
- `course_modules`
- `course`
- User and enrolment tables
- Grade tables
- Assignment/quiz tables
- Logs
- Recycle-bin related data

For every completion type map:

```text
Trigger
→ source record/event
→ completion state row
→ timestamp
→ report display
```

Required discoveries:

- Exact completion state values.
- Whether provenance is stored.
- Deletion cascades.
- Course deletion effect.
- Cron involvement.

---

## 8. PHP Investigation

Search:

```bash
rg "course_modules_completion"
rg "course_completions"
rg "completion_info"
rg "mark_complete"
rg "update_state"
rg "COMPLETION_COMPLETE"
rg "COMPLETION_COMPLETE_PASS"
rg "COMPLETION_COMPLETE_FAIL"
rg "course_completion"
```

Document file, class/function, trigger, state transition, cron involvement, recalculation, and deletion behaviour.

---

## 9. Rule Template

```markdown
## T2-PRG-XXX — Rule title

### Completion target
Activity or course.

### Configuration
Exact completion conditions.

### User state
Enrolment, role, group, submission, and grade.

### Trigger
View, submit, grade, pass, manual action, cron, deletion, or reset.

### Observed transition
Before state → after state.

### UI evidence
Student and Teacher views.

### Database evidence
Rows, state values, and timestamps.

### Code evidence
File, function, and transition logic.

### Historical effect
What survives later changes.

### Integration impact
What Team 1, Team 3, or our application must provide.

### Confidence
Confirmed / Partially confirmed / Unknown.
```

---

## 10. Deliverables

### End of Monday

- Completion enabled and verified.
- Page-by-view and Assignment-by-submission tests.
- At least 5 rules with UI evidence.
- Initial completion table map.

### End of Tuesday

- Grade and pass tests.
- Enrolment-change matrix with Issa.
- Course-completion behaviour.
- Deletion and historical limitations.
- Hard Case 5 feasibility report.
- At least 12 strong rules.

### Wednesday handoff to Yaman

Provide:

1. Minimum progress entities.
2. State-transition rules.
3. Required Team 1 fields.
4. Required Team 3 events.
5. Idempotency requirements.
6. Historical course-reference design.
7. Data that does not survive extraction.
8. Honest limits on deleted-course history.

The work is complete when the team can explain which activity states produced a progress result and what historical information is missing.
