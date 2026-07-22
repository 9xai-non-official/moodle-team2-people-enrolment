# LMS experience layer — sign-in, catalog, submissions, grading

The people-&-enrolment app (WhoCan) originally answered *"who can do what, and
why"* from an inspector's seat. This layer adds the **lived experience** on
top of the same model: you sign up, you get into a course, you do the work,
somebody grades it — with every permission rule still enforced and explained.

Everything below runs in **mock mode** (`VITE_USE_MOCKS=1`) against
`src/mocks/lms.js` + fixtures in `src/mocks/seed.js`. Every mock route is a
1:1 contract for a later FastAPI endpoint — connect-later by deleting the mock
route (unmatched paths already fall through to the real backend).

Sources: Moodle 5.02 docs (`docs.moodle.org/502/en/...`), cited per rule.
Verified end-to-end with Playwright on 2026-07-22.

---

## 1. The front door (signup / login)

Moodle's **email-based self-registration**, condensed to its essence
([Email-based_self-registration], [Managing_authentication]):

| Step | Moodle | Us |
|---|---|---|
| Create account | "Create new account" on login page | Sign-up tab on `/` |
| Confirm | confirmation email link; account unusable until clicked | mock inbox panel with the confirm button — same gate, zero SMTP |
| Login refused | unconfirmed → refused; suspended → refused | identical, reasons shown verbatim |
| Demo shortcut | — | one-click persona sign-in + "explore mode" (original persona switcher) |

New accounts have **no role anywhere** — you become a student *in a course*
only by enrolling. That separation (account ≠ enrolment ≠ role) is the
team-2 thesis and it is enforced here.

Mock routes: `POST /api/auth/signup · confirm · login`, `GET /api/auth/me`.

## 2. Getting into a course (catalog + enrolment)

Moodle enrolment methods surfaced student-side ([Enrolment_methods],
[Self_enrolment], [Enrolment_key], [Course_enrolment]):

- **Self enrolment**, optional key (`sesame` in CS101). Wrong key → refusal
  verbatim. Success appends a real enrolment path (`enrol_self` provenance)
  plus the method's default role at the course context — exactly Moodle's
  bookkeeping.
- **Manual-only course** — stock Moodle shows *"You cannot enrol yourself in
  this course."* and stops. **Core has no request/approval flow**
  ([Enrolment_FAQ]) — that dead end is our improvement target:
  **Request enrolment** (message → teacher's Roster inbox → approve = manual
  enrolment, deny = closed). Flagged as an extension, not a replica.
- Enrolled/expired/suspended states reuse the existing per-path liveness
  logic (any-active-path-wins, HC-1).

Mock routes: `GET /api/lms/catalog`,
`POST /api/lms/courses/{id}/self-enrol · enrol-request`,
`GET /api/lms/courses/{id}/enrol-requests`,
`POST /api/lms/enrol-requests/{id}/approve|deny`.

## 3. Doing the work (student)

- **Course view**: hidden activities simply don't exist for students
  (teachers see them greyed) — same rule the progress report already uses.
- **Assignment** ([Assignment_settings]): online text + up to 5 files
  (images preview inline), *save draft* → *submit* gated by the
  **submission statement** ("this is my own work"); after submit the work is
  **locked** until a teacher reverts to draft. Grade + feedback appear in
  place once marked.
- **Quiz** ([Quiz_activity], [Quiz_settings]): limited attempts (3 on
  Quiz 1), one open attempt at a time, multichoice/true-false auto-marked at
  *Finish*; **essay questions wait for a teacher** — attempt state
  `finished` (essay pending) vs `graded` (total released), Moodle's manual
  marking split ([Quiz_reports]).

Mock routes: `GET /api/lms/courses/{id}/activities`,
`GET|POST /api/lms/activities/{id}/submission`,
`GET /api/lms/activities/{id}/quiz`, `POST .../attempts`,
`PATCH /api/lms/attempts/{id}`, `POST /api/lms/attempts/{id}/finish`.

## 4. Running the course (teacher) — Teaching page

- **Roster**: participants with roles/status/groups; enrolment-request
  inbox; **promote to non-editing teacher** — allowed because a teacher may
  only assign roles *below their own* (default: non-editing teacher,
  student — [Teacher_role]); goes through the existing assignable-matrix
  endpoint, refusals verbatim.
- **Content**: create assignments and quizzes (question builder:
  multichoice / true-false / essay with points). **Non-editing teachers are
  refused** — "can grade in courses but not edit them"
  ([Non-editing_teacher_role]).
- **Grading**: assignment queue (grade 0–100 + feedback, re-grade) and quiz
  essay marking (releases the total). **Group-scoped**: a TA whose
  access-all-groups is *prevented* can only grade students sharing one of
  her groups — hard case 3 enforced in the grading queue, with the refusal
  spelled out.
- **New course** — the question "can a teacher create courses?" answered by
  the software itself: **No.** *"By default a regular teacher can't add a
  new course"* ([Adding_a_new_course]); `moodle/course:create` belongs to
  Manager/Course creator at system/category context
  ([Capabilities/moodle/course:create]). The button exists and **refuses
  with that reason**. The sanctioned path is a **course request**
  ([Course_request]); approval creates the course and makes the requester
  its (editing) teacher — mirroring the Course-creator auto-enrol rule
  ([Course_creator_role]).

Mock routes: `GET /api/lms/activities/{id}/submissions · attempts`,
`POST /api/lms/submissions/{id}/grade`,
`POST /api/lms/attempts/{id}/grade-essay`,
`POST /api/lms/courses/{id}/activities`, `POST /api/lms/courses`,
`GET|POST /api/lms/course-requests`, `POST /api/lms/course-requests/{id}/approve|reject`.

## 4b. Role-loop additions (iterations 1–3)

Walking each role's story A→Z surfaced gaps; all fixed and gate-tested:

- **Student**: dashboard scoped to their world (requests they're waiting on,
  not site counts); **self-unenrol** faithful to `enrol/self:unenrolself` —
  only self-enrolled paths removable, manual/cohort refuse with the reason;
  completions survive and the UI says so.
- **Teacher**: roster **"+ Enrol user"** (`enrol/manual:enrol`, editing only),
  per-path **suspend/reactivate/unenrol** (cohort paths refuse — sync would
  recreate them), **remove TA role**, **revert-to-draft** on submissions
  (grade stays on record), **hide/show activities** (non-editing refused).
- **Admin**: new Admin page — **create accounts** (usable immediately: the
  confirmation-email gate belongs to self-registration only), site-wide
  **suspend/reactivate** (no self-lockout), **course create/hide/soft-delete**
  — deletion keeps completions and snapshots alive (hard case 5, see
  Progress → History).

Iterations 5–17 (refinement loops): own-profile editing (`PATCH
/api/auth/profile` — password change requires the current one), "My grades"
strip (`GET /api/lms/my-grades`), catalog search, roster → Groups-board
hand-off, activity rename + quiz attempt-limit editing, teacher marking-queue
badges (never sent to students), Admin overview strip + **make/revoke
manager** (`POST /api/lms/users/{id}/toggle-manager`, no self-lockout),
password autocomplete/show-toggle, ARIA labels, mobile layout (sidebar
becomes a top strip under 760px), dark-mode parity, presenter/glossary
coverage.

Extra mock routes: `POST /api/lms/users`, `PATCH /api/lms/users/{id}`,
`PATCH|DELETE /api/lms/courses/{id}`, `POST /api/lms/courses/{id}/enrol`,
`PATCH|DELETE /api/lms/enrolments/{id}`, `POST /api/lms/courses/{id}/remove-role`,
`POST /api/lms/submissions/{id}/revert`, `PATCH /api/lms/activities/{id}`,
`POST /api/lms/courses/{id}/unenrol-self`, `GET /api/lms/my-requests`.

## 5. Business rules encoded (evidence per rule)

1. Account must be confirmed before first login; suspension refuses sign-in
   but keeps enrolments/grades. [Email-based_self-registration], [Enrolment_FAQ]
2. Self-enrol key mismatch → refusal; key optional per method. [Self_enrolment]
3. Self-enrolment writes both an enrolment row **and** a role assignment with
   `enrol_self` provenance (machine-owned, like cohort sync). [Self_enrolment]
4. No request-to-enrol exists in core Moodle — ours is an extension. [Enrolment_FAQ]
5. Hidden activities are invisible to students, visible-greyed to teachers. [Course_homepage]
6. Submission statement is a hard gate; submitted work locks until reverted. [Assignment_settings]
7. Quiz attempts are capped; one in-progress attempt at a time. [Quiz_settings]
8. Auto-markable questions grade at finish; essays hold the total until
   manually marked (state `finished` ≠ `graded`). [Quiz_reports]
9. Grading is group-scoped when access-all-groups is prevented (deepest
   override wins; prohibit un-overridable). [Non-editing_teacher_role], [Override_permissions]
10. Non-editing teacher: grade yes, edit/add activities no. [Non-editing_teacher_role]
11. Teachers assign only roles below their own (non-editing teacher, student). [Teacher_role]
12. Teachers cannot create courses (`moodle/course:create` = Manager/Course
    creator, system/category context only). [Adding_a_new_course], [Capabilities/moodle/course:create]
13. Course request approval creates the course **and** makes the requester
    its teacher. [Course_request], [Course_creator_role]
14. Role assignment ≠ enrolment: teachers appear under "My courses" via role,
    badge "teaching", without any enrolment row. [Assign_roles]
15. Self-unenrol is per-method: only a self-enrolment path may be
    self-removed (`enrol/self:unenrolself`); other paths refuse. [Enrolment_FAQ]
16. Suspend ≠ unenrol: suspension blocks access and keeps every scrap of
    data; unenrolment ends access but completions/grade history survive. [Manual_enrolment]
17. Cohort-owned paths resist manual edits — the next sync recreates them;
    the fix is cohort membership, not the roster. [Enrolment_methods]
18. Reverting a submission to draft unlocks editing without erasing the
    recorded grade. [Assignment_settings]
19. Admin-created accounts skip email confirmation — that gate exists only
    for self-registration. [Email-based_self-registration]
20. Deleting a course never deletes the record that people finished it —
    completions and snapshots outlive the course (hard case 5). [Course_completion]

## 6. Deliberate divergences & not-replicated (honesty section)

**Improvements over stock Moodle (on purpose):**
- Request-to-enrol queue (core dead-ends at "you cannot enrol yourself").
- Role-scoped navigation: students see Dashboard/Courses/Progress only —
  Moodle shows everyone everything and greys pieces out.
- Every refusal carries its reason verbatim (Moodle mostly hides the button).
- Confirmation "email" rendered in-app (demoable without SMTP).

**Not replicated (would matter in production, out of scope here):** due/cut-off
dates & late flags, quiz timing/auto-submit, question bank & shuffling,
review-option windows, forum/workshop activities, guest access, group
enrolment keys routing into groups, welcome messages, file quotas, calendar,
badges, messaging, gradebook aggregation (team 3's area). Each is a
documented Moodle behaviour we chose not to fake shallowly.

## 7. Demo path (presenter mode 🎤 has the same steps)

1. Sign up → confirm → student-scoped shell → self-enrol CS101 (`sesame`) →
   request MATH200 → submit Assignment 1 with an image → attempt Quiz 1
   (auto 4/6, essay pending).
2. Sign in as **teacher.a** → approve Ghada's request (returning student,
   HC-2 flavour) → promote Basel to non-editing teacher → grade the
   submission → mark the essay (total releases).
3. Sign in as **ta.a** (scoped TA) → Grading shows "outside your groups" on
   Group B (HC-3), refusal text on attempt → Content tab refuses creation
   (grade-only role).
4. New course tab as any teacher → direct create **refuses** with
   `moodle/course:create` → request → as **admin1** approve → requester now
   teaches it.

[Email-based_self-registration]: https://docs.moodle.org/502/en/Email-based_self-registration
[Managing_authentication]: https://docs.moodle.org/502/en/Managing_authentication
[Enrolment_methods]: https://docs.moodle.org/502/en/Enrolment_methods
[Self_enrolment]: https://docs.moodle.org/502/en/Self_enrolment
[Enrolment_key]: https://docs.moodle.org/502/en/Enrolment_key
[Course_enrolment]: https://docs.moodle.org/502/en/Course_enrolment
[Enrolment_FAQ]: https://docs.moodle.org/502/en/Enrolment_FAQ
[Assignment_settings]: https://docs.moodle.org/502/en/Assignment_settings
[Quiz_activity]: https://docs.moodle.org/502/en/Quiz_activity
[Quiz_settings]: https://docs.moodle.org/502/en/Quiz_settings
[Quiz_reports]: https://docs.moodle.org/502/en/Quiz_reports
[Teacher_role]: https://docs.moodle.org/502/en/Teacher_role
[Non-editing_teacher_role]: https://docs.moodle.org/502/en/Non-editing_teacher_role
[Override_permissions]: https://docs.moodle.org/502/en/Override_permissions
[Adding_a_new_course]: https://docs.moodle.org/502/en/Adding_a_new_course
[Capabilities/moodle/course:create]: https://docs.moodle.org/502/en/Capabilities/moodle/course:create
[Course_request]: https://docs.moodle.org/502/en/Course_request
[Course_creator_role]: https://docs.moodle.org/502/en/Course_creator_role
[Assign_roles]: https://docs.moodle.org/502/en/Assign_roles
[Course_homepage]: https://docs.moodle.org/502/en/Course_homepage
