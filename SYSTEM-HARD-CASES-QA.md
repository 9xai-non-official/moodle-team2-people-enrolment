# System behaviour — hard-case Q&A

How **this system** (moodle-team2, `moodle-replica/`) answers the five hard cases,
grounded in the actual code and schema. Each answer names the mechanism.

---

## 1. A student is enrolled both manually and through an automatic group sync. The sync gets removed. Are they still enrolled?

**Yes — they remain enrolled.**

Enrolment is **per-method**: each way in is its own `enrolment` row, tagged with
its own provenance (`component` + `item_id`). The manual enrolment and the cohort
sync are **two independent rows**. Removing the sync removes **only its own path**:
its `enrolment` row, its provenance `role_assignment`, and the group memberships
that carried its provenance (`component='enrol_cohort'`, `item_id=<method id>`).
The manual row is untouched.

Whether a user is "enrolled right now" is computed as **"any live path"**:

```
v_course_participant.enrolled = bool_or(live)   -- true if ANY method is live
```
(`schema.sql`, view `v_course_participant`, over `v_enrolment_detail.live`).

So with the manual path still live, `enrolled` stays `true`. Whole-course cleanup
(group removal, `user_last_access`) only fires on the **last-path** unenrol — when
*no* other enrolment row remains (`services/enrolment.py`, `unenrol_user`, §6.10 /
last-path check). Removing one of two paths never triggers it.

---

## 2. A student drops out in week ten. What happens to their submissions, their grades, and their forum posts? Then they re-enrol in week twelve.

**Nothing is destroyed. Their work is retained, and re-enrolment resumes progress exactly where it was (Hard Case #2).**

Unenrolment (`services/enrolment.py`, `unenrol_user`) deletes only the
*membership/authority* rows:
- the `enrolment` row(s) for that path,
- the matching provenance `role_assignment` rows,
- on a **last-path** drop: group memberships (`remove_all_memberships`) and
  `user_last_access`.

It **deliberately does NOT delete** learning records (`enrolment.py:479-480`):

> *"Deliberately NOT deleted: activity_completion / course_completion rows
> (Hard Case #2), submissions, grades, and role_assignment [of other paths]."*

So concretely:
- **Submissions** — retained.
- **Grades** (`grade`, `quiz_attempt`) — retained.
- **Activity/course completion** (`activity_completion`, `course_completion`) — retained.
- **Forum posts** — `forum` is an activity *type* (`course_activity.activity_type`),
  and by the same rule user-authored content is decoupled from enrolment and is
  **not** cascaded away on unenrol. (This checkout models forum as an activity
  type; it has no separate forum-posts table, so there is nothing enrolment
  deletes for it.)

**During weeks 10–12 (unenrolled):** the display gate (T2-PRG-005) hides the
student from the *active* roster/progress view (`v_course_progress.enrolled = false`),
but every stored record persists underneath.

**Re-enrolling in week 12:** a fresh `enrolment` row + provenance role are created.
Because completions and grades were never deleted, progress and grades **resume
in place** — the student picks up exactly where they left off.

---

## 3. A teaching assistant can mark one group's work, cannot mark another group's, and cannot see a third group at all.

**All three outcomes are the correct, intended behaviour of one group-scoped TA — this is Hard Case #3.**

The TA is a teacher **without** `site:accessallgroups` (a *group-scoped* teacher).
The engine splits the decision into two distinct sets — **SEE** vs **ACT**
(`services/groups.py`, `scope_verdict`; the grade write is gated by
`grade.py:_group_ok` / `quiz.py:_grade_gate`):

- **Group 1 — can mark.** The TA **shares** this group with the student, so it is
  both visible and `action_allowed` → grading permitted.
- **Group 2 — can see, cannot mark.** Under **Visible-groups** mode, `visible =
  in_universe` but `action_allowed = hits_actor_own` — you may *see* other
  participating groups but may only *act* in your own. Grading a non-shared group
  is refused.
- **Group 3 — cannot see at all.** A group **outside the activity's universe**
  (e.g. the activity is restricted to a grouping of A+B and the student is in
  group C), or a non-shared group under **Separate-groups** mode, is in *neither*
  set — the "not even visible" outcome.

Key rule enforced in code: `accessallgroups` **widens scope only — it never grants
the action itself** (`scope_verdict`: *"access-all-groups reaches every group"* for
SEE, but ACT still requires sharing). So a TA who lacks it is confined to their own
groups for marking.

---

## 4. A student belongs to two groups at once, and the activity is set to keep groups separate.

**Fully supported — being in two groups is a feature, not a conflict — and in Separate mode the student is seen as the UNION of both groups.**

The schema keeps Moodle's quirk on purpose (`schema.sql:362-363`):

> *"a user CAN be in two groups of the same course at once — hard case #4 is a
> feature, not a bug; `separate` mode then shows the **union** of both groups."*

Membership is evaluated as **sets**, not a single group:
- The student's visible cohort in Separate mode is the union of *all* their groups'
  members.
- A group-scoped TA "shares a group" with this student if **either** of the
  student's groups overlaps one of the TA's — `target_groups & actor_own` is
  non-empty (`scope_verdict`). Any overlap is enough.

So the dual membership never gets "collapsed" to one group; both count everywhere
scope is computed.

---

## 5. Show a student's progress across every course they have taken over three years, including courses that have since been deleted.

**The system is designed to serve exactly this — via two mechanisms — with one part currently pending a DB migration.**

1. **Soft-deleted courses are included on purpose.** `v_course_progress` keeps rows
   for soft-deleted courses and flags them (`course_deleted`) rather than dropping
   them (the view is documented *"Includes soft-deleted courses on purpose (hard
   case #5)"*). So a course that was hidden/soft-deleted still appears in the
   student's history.

2. **An append-only snapshot ledger outlives *hard* deletion.** For courses that
   are truly gone, `progress_snapshot` (D-SNAP) preserves history:
   - **no foreign key** to `course`/`user`, so rows survive a hard delete;
   - **course names denormalized in**, so the row still means something once the
     course no longer exists;
   - **append-only** (trigger blocks UPDATE/DELETE) — history can't be rewritten.

   The backend writes a snapshot on each completion change and serves the
   cross-course, multi-year history at **`GET /api/progress/snapshots`**
   (`routers/progress.py`, `_snapshot` / `list_snapshots`).

**Honest status:** the `progress_snapshot` **table is not yet created in the live
database** — the D-SNAP migration (`fix_T2-PRG-004_D-SNAP_snapshots.sql`) is pending
(Essa). The code degrades safely until then: snapshot **writes are skipped**
(missing-table error swallowed) and `GET /api/progress/snapshots` returns a clean
**503** ("progress_snapshot not created yet"). Once the migration is applied, the
full three-year, includes-deleted-courses history is served — no code change
required.

---

### Cross-cutting principle behind all five

Enrolment/authority rows and learning records live in **separate systems**
(MASTER-REFERENCE §6.3: *"enrolment says you are a MEMBER; role_assignment says
what you CAN DO"*), and history is deliberately **decoupled** from current
membership. That single design choice is what makes 1, 2 and 5 behave correctly:
removing one path never removes another's data, and dropping out never erases the
record.
