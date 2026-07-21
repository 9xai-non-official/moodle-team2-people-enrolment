# Team 2 Testing Assignment — Roles, Contexts, and Permissions
**Owner:** Khaled  
**Team:** Team 2 — People and Enrolment  
**Primary area:** Roles, capabilities, contexts, role assignments, conflicts, and permission explanations  
**Anchor reviewer:** Yaman

---

## 1. Mission

Discover how Moodle answers:

> Can this user perform this action in this place, and why?

Do not reduce decisions to role names. A user may have several roles, different roles in different courses, inherited roles, activity-level assignments, capability conflicts, or group restrictions.

Your work defines the core of Team 2’s future permission-check feature.

Every accepted rule must include UI, database, code, and reproducible-test evidence.

---

## 2. Required Role Coverage

Inspect the actual local installation using:

```text
Site administration
→ Users
→ Permissions
→ Define roles
```

Investigate:

1. Site Administrator.
2. Manager.
3. Course Creator.
4. Teacher.
5. Non-editing Teacher.
6. Student.
7. Guest.
8. Authenticated User.
9. Authenticated User on Frontpage.
10. Any custom or modified roles found locally.

Record role short name, archetype, allowed context levels, and whether the role was modified.

---

## 3. Concepts You Must Prove

Explain with evidence:

- Account: identity and login.
- Authentication: how login is verified.
- Enrolment: course membership.
- Role: named capability collection assigned in a context.
- Capability: one specific permission.
- Context: where the role and permission apply.
- Group restriction: separate filtering of targets or records.

Map the context hierarchy, including:

```text
System
Course category
Course
Activity/module
Block
User
```

For each level, determine assignment, inheritance, and override behaviour.

---

## 4. Controlled Accounts and Courses

Use:

- `manager.a`
- `creator.a`
- `teacher.a`
- `ta.a`
- `student.a`
- `student.b`

Use two courses:

- `T2-LAB`
- `T2-SECOND`

Required contextual example:

```text
teacher.a:
- Teacher in T2-LAB
- Student in T2-SECOND
```

---

## 5. Test Cases

### R-01 — Authenticated User Without Course Role

1. Create and log in as `student.a`.
2. Do not enrol the user in `T2-LAB`.
3. Test profile editing, messaging, site home, course access, and assignment access.

Explain what Authenticated User gives and what it does not give.

---

### R-02 — Same User, Different Roles in Different Courses

Configure:

- `teacher.a` → Teacher in `T2-LAB`.
- `teacher.a` → Student in `T2-SECOND`.

In both courses test:

- Edit mode.
- Add activity.
- View participants.
- Enrol users.
- Submit assignment.
- Grade submissions.
- View grades.

Prove that roles are contextual, not permanent account properties.

---

### R-03 — Teacher Capability Matrix

As `teacher.a`, test individually:

- View course.
- Edit course settings.
- Add Page, Assignment, and Quiz.
- Delete and move activities.
- View Participants.
- Enrol Student.
- Assign Student and Non-editing Teacher roles.
- Create Group.
- View and grade submissions.
- Override grade.
- View completion report and logs.
- Access another course with no assigned role.

Every action needs a separate result and evidence ID.

---

### R-04 — Non-editing Teacher Capability Matrix

As `ta.a`, test:

- View course and Participants.
- Turn Edit mode on.
- Add or delete activity.
- Edit Assignment settings.
- View submissions.
- Grade and write feedback.
- View gradebook and completion report.
- Enrol a user.
- Create Group.
- Access all groups.

This test is essential for the Teaching Assistant scenario.

---

### R-05 — Student Capability Matrix

As `student.a`, test:

- View course and Participants.
- View own and another profile.
- Add activity.
- Submit and edit own submission.
- View own and another student’s grade.
- View own completion.
- Grade a submission.
- Access a hidden activity.
- Access course after enrolment suspension.

---

### R-06 — Guest Capability Matrix

Enable Guest access in a controlled course and test:

- Open course.
- View Page and download file.
- Open and submit Assignment.
- Attempt Quiz.
- View Participants.
- Receive progress or grade.

Explain Guest versus Authenticated User versus enrolled Student.

---

### R-07 — Manager Scope

Test both if possible:

1. System-level Manager.
2. Category-level Manager.

Check:

- Create and edit courses.
- Access courses in another category.
- Manage users.
- View reports.
- Assign roles.
- Change site configuration.
- Install plugins.

Explain delegated administration versus Site Administrator.

---

### R-08 — Course Creator Scope

As `creator.a`, test:

- Create course.
- Edit the created course.
- Edit a course created by someone else.
- Identify the role automatically assigned in the created course.
- Create in another category.
- Enrol students.

Explain the boundary between course creation and course management.

---

### R-09 — Activity-Level Assignment or Override

Choose one Forum or Assignment.

Try a role assignment or override at activity level. Compare permissions:

- Inside that activity.
- Elsewhere in the course.
- In another activity.

Prove that lower contexts can create local behaviour.

---

### R-10 — Allow, Prevent, and Prohibit Conflict

Use a safe copied/custom role and one controlled capability, such as:

- Add discussion.
- Grade assignment.
- Access all groups.
- View participants.

Test:

1. Higher context allows.
2. Lower context prevents.
3. Another role allows.
4. One role prohibits.

Explain Inherit/Not set, Allow, Prevent, Prohibit, and the final result.

Do not permanently modify standard roles.

---

### R-11 — Multiple Roles in the Same Context

Give one user multiple roles in `T2-LAB`, for example:

- Student.
- Non-editing Teacher.
- Restricted custom role.

For every action record:

```text
Action
Relevant capabilities
Role A value
Role B value
Final result
Reason
```

---

### R-12 — Permission Explanation Prototype

For at least five actions, produce a manual explanation the future API should return.

Example structure:

```json
{
  "allowed": false,
  "action": "assignment.grade",
  "context": "Assignment 1",
  "reasons": [
    {
      "source": "role",
      "role": "Non-editing teacher",
      "result": "allow"
    },
    {
      "source": "group restriction",
      "result": "deny",
      "message": "The target student is outside the effective group scope."
    }
  ]
}
```

Use this only to identify required facts, not as a frozen final schema.

---

## 6. Capability Matrix

Maintain this living table:

| Action | Admin | Manager | Course Creator | Teacher | Non-editing Teacher | Student | Guest |
|---|---|---|---|---|---|---|---|
| Create user | | | | | | | |
| Create course | | | | | | | |
| Edit course | | | | | | | |
| Add activity | | | | | | | |
| Enrol user | | | | | | | |
| Create group | | | | | | | |
| Submit assignment | | | | | | | |
| Grade assignment | | | | | | | |
| View completion report | | | | | | | |
| View all groups | | | | | | | |

Every cell must be one of:

- Confirmed allowed.
- Confirmed denied.
- Not applicable.
- Not tested.
- Depends on scope/configuration.

Attach evidence IDs.

---

## 7. Database Investigation

Focus on tables equivalent to:

- `role`
- `role_capabilities`
- `role_assignments`
- `context`
- `user`
- `course`

For every tested user, trace:

```text
user
→ role assignment
→ role
→ context
→ capability values
```

Capture context ID, context level, instance ID, role ID, capability name, and permission value.

---

## 8. PHP Investigation

Search:

```bash
rg "has_capability"
rg "require_capability"
rg "role_assignments"
rg "role_capabilities"
rg "accessallgroups"
rg "is_siteadmin"
```

For important decisions document:

- File and function.
- Capability name.
- Context passed.
- Denial behaviour.
- Whether Site Administrator bypasses normal calculation.
- Whether Groups are checked separately.

Distinguish:

```text
Role lookup
Capability resolution
Group filtering
Final action decision
```

---

## 9. Rule Template

```markdown
## T2-RBAC-XXX — Rule title

### Action
Exact action.

### User state
Account, enrolment, roles, groups, and context.

### Expected result
Pre-test hypothesis only.

### Observed result
Exact Moodle behaviour.

### Capability evidence
Capability and permission value.

### Context evidence
Context level and instance.

### UI evidence
Page and screenshot.

### Database evidence
Relevant rows.

### Code evidence
File, function, and capability check.

### Final explanation
Why Moodle allowed or denied.

### Confidence
Confirmed / Partially confirmed / Unknown.
```

---

## 10. Deliverables

### End of Monday

- Actual local role list.
- Role/context concept map.
- Teacher, Non-editing Teacher, and Student matrices.
- At least 5 rules with UI evidence.

### End of Tuesday

- Full role matrix.
- Multiple-context and conflict tests.
- At least 15 strong rules.
- Important capability checks mapped.
- Permission explanation requirements proposed.

### Wednesday handoff to Yaman

Provide:

1. Required permission-check inputs.
2. Required output and explanation fields.
3. Capability and context model.
4. Conflict-resolution rules.
5. Group interaction requirements.
6. Unknowns blocking implementation.
7. Moodle-specific complexity not worth reproducing.

The work is complete when the team can explain a denial using capability, context, enrolment, and group evidence—not only a role name.
