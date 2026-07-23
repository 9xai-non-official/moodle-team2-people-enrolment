# Team 2 Testing Assignment — Groups, Groupings, and Visibility
**Owner:** Mahmoud  
**Team:** Team 2 — People and Enrolment  
**Primary area:** Groups, membership, group modes, groupings, visibility, and Teaching Assistant scope  
**Anchor reviewer:** Yaman

---

## 1. Mission

Discover how Moodle uses Groups to organise or restrict access inside a course.

Prove the difference:

```text
Enrolment: Is the user a member of the course?
Role: What actions can the user perform?
Group: Which subset of users or records can the action apply to?
```

A role may allow grading while a group rule limits which students are visible. Your work owns Team 2 Hard Cases 3 and 4.

Every rule requires UI, database, code, and reproducible-test evidence.

---

## 2. Controlled Setup

### Course

- `T2-LAB`

### Users and roles

- `teacher.a` → Teacher
- `ta.a` → Non-editing Teacher
- `student.a` → Student
- `student.b` → Student
- Create `student.c` if needed

### Groups

- Group A
- Group B
- Group C

### Initial memberships

```text
Group A:
- ta.a
- student.a

Group B:
- student.b

Group C:
- student.c
```

Later include:

- User in two groups.
- User in no group.
- TA with access-all-groups.
- TA without access-all-groups.

---

## 3. Concepts You Must Distinguish

- Group.
- Group membership.
- No groups.
- Separate groups.
- Visible groups.
- Force group mode.
- Grouping.
- Access all groups capability.
- Group submission.

Group submission is not the same as using Separate groups.

---

## 4. Questions You Must Answer

1. Can a user belong to multiple groups in one course?
2. How do No groups, Separate groups, and Visible groups differ?
3. Does a Non-editing Teacher see only their own group?
4. What does access-all-groups change?
5. Do Groups affect Participants, Forums, Assignments, Gradebook, completion reports, and logs identically?
6. What is the difference between group mode, grouping restriction, and group submission?
7. What happens when a student changes group after submission?
8. Which group applies when a student belongs to two groups?
9. Is group membership history preserved?
10. Can Moodle reconstruct group membership at the time of a past action?

---

## 5. Test Cases

### G-01 — Create Groups and Memberships

Create Group A, B, and C, then add members according to the setup.

Record:

- Creation UI.
- Membership UI.
- Database rows and timestamps.
- Whether duplicate membership is possible.
- Whether an enrolled course user may remain ungrouped.

---

### G-02 — User in Multiple Groups

Add `student.a` to Group A and Group B.

Check:

- Groups overview.
- Participants filters.
- Assignment group selector.
- Forum group selector.
- Reports.

Prove how Moodle stores and displays simultaneous memberships.

---

### G-03 — No Groups Baseline

Create `G-TEST Assignment` with:

```text
Group mode: No groups
Students submit in groups: No
```

As `ta.a`, inspect visible students, submissions, group selector, and grading scope.

---

### G-04 — Separate Groups

Change the activity to:

```text
Group mode: Separate groups
```

Test as Teacher, TA, and every student.

Record separately:

- Course page visibility.
- Participant visibility.
- Submission visibility.
- Grade access.
- Group selector values.
- Forum behaviour.

Do not assume all activities implement groups identically.

---

### G-05 — Visible Groups

Change the activity to:

```text
Group mode: Visible groups
```

Test whether users can:

- See another group.
- Participate in another group.
- Grade another group.
- View another group read-only.

Write separate rules for “can view” and “can act.”

---

### G-06 — Access All Groups Capability

Check whether `ta.a` can see outside Group A.

If yes, investigate the access-all-groups capability. Use a safe copied/custom role to compare:

1. Capability allowed.
2. Capability not set or prevented.

Required explanation:

```text
Role permits grading
+
Group mode separates groups
+
Access-all-groups setting
=
Final visible student set
```

---

### G-07 — Teaching Assistant Scope
**Hard Case 3**

Required scenario:

> A teaching assistant can mark one group’s work, cannot mark another group’s work, and cannot see a third group at all.

Construct the closest valid Moodle configuration using:

- Separate or Visible groups.
- Capability overrides.
- Access-all-groups.
- Activity-level roles.
- Groupings.

Complete:

| Group | Can view members? | Can view submissions? | Can grade? | Why? |
|---|---|---|---|---|
| Group A | | | | |
| Group B | | | | |
| Group C | | | | |

If one standard activity cannot express the exact three-level rule, document that honestly. Do not fake it.

---

### G-08 — Student in Two Groups
**Hard Case 4**

Keep `student.a` in Group A and Group B. Test at least:

- Forum.
- Assignment.
- Participants.
- Completion report.

Answer:

- Can the student switch groups?
- Can the student see both groups?
- Does one submission appear under both groups?
- Are duplicate records created?
- How does the Teacher filter the data?
- Does behaviour differ by activity type?

---

### G-09 — Membership Change After Submission

1. `student.a` belongs to Group A.
2. Student submits Assignment.
3. Teacher or TA grades it.
4. Move the student to Group B or remove Group A membership.

Inspect:

- Where the submission appears.
- Whether grade changes.
- Whether original group is stored.
- Whether logs can reconstruct history.
- Whether membership history survives.

Coordinate with Team 3 because this affects group submissions and appeals.

---

### G-10 — Group Submission Versus Separate Groups

Create:

#### Assignment A

```text
Group mode: Separate groups
Students submit in groups: No
```

#### Assignment B

```text
Group mode: Separate groups
Students submit in groups: Yes
```

Compare ownership, number of submissions, member editing, grades, feedback, and membership changes.

Explain why group mode and group submission are separate systems.

---

### G-11 — Groupings

Create:

```text
Grouping AB
- Group A
- Group B
```

Restrict an activity to this grouping and test Group C:

- Course page visibility.
- Direct URL access.
- TA access.
- Teacher access.
- Completion record creation.

Explain how Grouping narrows activity scope.

---

### G-12 — Force Group Mode

Test course-level group mode with:

1. Force group mode = No.
2. Force group mode = Yes.

Observe whether activity-level settings can differ and document precedence.

---

## 6. Cross-Activity Comparison

Test at least Assignment and Forum. Recommended: Quiz and another activity.

| Behaviour | Assignment | Forum | Quiz | Participants |
|---|---|---|---|---|
| Separate groups | | | | |
| Visible groups | | | | |
| Multiple memberships | | | | |
| TA restriction | | | | |
| Historical group link | | | | |

---

## 7. Database Investigation

Focus on tables equivalent to:

- `groups`
- `groups_members`
- `groupings`
- `groupings_groups`
- `course_modules`
- Activity-specific submission tables
- Role and capability tables
- Logs

For every membership change:

1. Save rows before.
2. Change one membership.
3. Save rows after.
4. Check whether the old row was deleted, updated, or archived.
5. Check whether another historical link remains.

Required discovery:

- Does group membership store history?
- Do activities store group ID separately?
- Can past state be reconstructed?

---

## 8. PHP Investigation

Search:

```bash
rg "groups_get_user_groups"
rg "groups_get_activity_group"
rg "groups_get_all_groups"
rg "accessallgroups"
rg "SEPARATEGROUPS"
rg "VISIBLEGROUPS"
rg "grouping"
rg "groups_members"
```

For each rule record file, function, inputs, group-mode branch, capability check, and returned group set.

---

## 9. Rule Template

```markdown
## T2-GRP-XXX — Rule title

### Scenario
Users, roles, groups, groupings, and activity.

### Group configuration
No groups / Separate groups / Visible groups.

### Membership state
Exact memberships at test time.

### Action
Exact attempted action.

### Observed result
What the user could see or do.

### UI evidence
Page and screenshot.

### Database evidence
Membership and activity records.

### Code evidence
File, function, and filtering rule.

### Permission interaction
How roles/capabilities affected the result.

### Historical impact
What happens after membership changes.

### Confidence
Confirmed / Partially confirmed / Unknown.
```

---

## 10. Deliverables

### End of Monday

- Groups and membership matrix created.
- No groups, Separate groups, and Visible groups basic tests.
- At least 5 rules with UI evidence.

### End of Tuesday

- Hard Cases 3 and 4 completed or honestly marked partial.
- Grouping and force-group-mode rules.
- At least 12 strong rules.
- Database map and code paths.

### Wednesday handoff to Yaman

Provide:

1. Group and membership entities.
2. Required permission-engine group inputs.
3. Required API behaviours.
4. Historical membership limitations.
5. Activity-specific differences.
6. Whether the exact TA scenario is representable.
7. Data our simplified application cannot preserve.

The work is complete when the team can explain why a role permits an action but a target student is outside the user’s effective group scope.
