// Shared mock seed — the ONE source of truth for every src/mocks/<domain>.js.
// Personas and fixtures are chosen so every badge state and all four demo
// hard cases (HC-1 paths, HC-3 scope, HC-4 multi-group, HC-5 deleted course)
// are reachable from the UI in mock mode. Domain mocks import ids from here;
// never invent parallel fixtures.
//
// NOTE: mock mode only. Real data comes from the extracted Moodle course via
// the backend — this seed never ships in the Thursday demo (task 06 §8).

export const USERS = [
  { id: 1, username: "admin1",        first_name: "Amal",  last_name: "Admin",   full_name: "Amal Admin",   suspended: false },
  { id: 2, username: "teacher.a",     first_name: "Tala",  last_name: "Teacher", full_name: "Tala Teacher", suspended: false },
  { id: 3, username: "ta.a",          first_name: "Tariq", last_name: "Assist",  full_name: "Tariq Assist", suspended: false },
  { id: 4, username: "ta.allgroups",  first_name: "Aya",   last_name: "Assist",  full_name: "Aya Assist",   suspended: false },
  { id: 5, username: "student.a",     first_name: "Salma", last_name: "Saleh",   full_name: "Salma Saleh",  suspended: false },
  { id: 6, username: "student.multi", first_name: "Majd",  last_name: "Masri",   full_name: "Majd Masri",   suspended: false },
  { id: 7, username: "student.b",     first_name: "Basel", last_name: "Badr",    full_name: "Basel Badr",   suspended: false },
  { id: 8, username: "student.susp",  first_name: "Sami",  last_name: "Suheil",  full_name: "Sami Suheil",  suspended: true  }, // account-suspended, still listed (C-6)
  { id: 9, username: "student.gone",  first_name: "Ghada", last_name: "Ghanem",  full_name: "Ghada Ghanem", suspended: false }, // only exists in HIST9 snapshots (HC-5)
];

export const COURSES = [
  { id: 1, short_name: "CS101",   full_name: "Intro to Computer Science", visible: true,  group_mode: "separate", force_group_mode: false, deleted: false },
  { id: 2, short_name: "MATH200", full_name: "Discrete Mathematics",      visible: true,  group_mode: "none",     force_group_mode: true,  deleted: false }, // force → per-activity modes silently ignored (GRP-012)
  { id: 3, short_name: "HIST9",   full_name: "History of Computing",      visible: false, group_mode: "none",     force_group_mode: false, deleted: true  }, // HC-5: served from snapshots only
  { id: 4, short_name: "LAB1",    full_name: "Open Lab",                  visible: true,  group_mode: "visible",  force_group_mode: false, deleted: false }, // no completion criteria → percent null
];

export const ROLES = [
  { id: 1, short_name: "manager",           name: "Manager",             archetype: "manager" },
  { id: 2, short_name: "editingteacher",    name: "Teacher",             archetype: "editingteacher" },
  { id: 3, short_name: "teacher",           name: "Non-editing teacher", archetype: "teacher" },
  { id: 4, short_name: "student",           name: "Student",             archetype: "student" },
  { id: 5, short_name: "guest",             name: "Guest",               archetype: "guest" },
  { id: 6, short_name: "teacher-allgroups", name: "TA (all groups)",     archetype: "teacher" },
];

// Contexts, matching the deployed schema's tree: system > course > activity.
export const CONTEXTS = [
  { id: 1,   level: "system",   instance_id: 0,   label: "System",              path: "/1" },
  { id: 10,  level: "course",   instance_id: 1,   label: "course:CS101",        path: "/1/10" },
  { id: 20,  level: "course",   instance_id: 2,   label: "course:MATH200",      path: "/1/20" },
  { id: 40,  level: "course",   instance_id: 4,   label: "course:LAB1",         path: "/1/40" },
  { id: 110, level: "activity", instance_id: 101, label: "activity:Assignment 1", path: "/1/10/110" },
  { id: 120, level: "activity", instance_id: 102, label: "activity:Quiz 1",       path: "/1/10/120" },
  { id: 130, level: "activity", instance_id: 103, label: "activity:Secret Forum", path: "/1/10/130" },
  { id: 210, level: "activity", instance_id: 201, label: "activity:Worksheet",    path: "/1/20/210" },
];

// Role assignments. ta.a and ta.allgroups differ by ROLE, not by person —
// the Moodle-faithful way to scope one TA (duplicate role + override).
export const ROLE_ASSIGNMENTS = [
  { id: 1, user_id: 1, role_id: 1, context_id: 1,  component: "",             item_id: 0 },
  { id: 2, user_id: 2, role_id: 2, context_id: 10, component: "",             item_id: 0 },
  { id: 3, user_id: 2, role_id: 2, context_id: 20, component: "",             item_id: 0 },
  { id: 4, user_id: 3, role_id: 3, context_id: 10, component: "",             item_id: 0 }, // ta.a — scoped
  { id: 5, user_id: 4, role_id: 6, context_id: 10, component: "",             item_id: 0 }, // ta.allgroups
  { id: 6, user_id: 5, role_id: 4, context_id: 10, component: "",             item_id: 41 },
  { id: 7, user_id: 5, role_id: 4, context_id: 10, component: "enrol_cohort", item_id: 43 }, // HC-1 second path
  { id: 8, user_id: 6, role_id: 4, context_id: 10, component: "",             item_id: 41 },
  { id: 9, user_id: 7, role_id: 4, context_id: 10, component: "",             item_id: 41 },
  { id: 10, user_id: 8, role_id: 4, context_id: 10, component: "",            item_id: 41 },
  { id: 11, user_id: 6, role_id: 4, context_id: 20, component: "",            item_id: 44 },
  { id: 12, user_id: 7, role_id: 4, context_id: 20, component: "",            item_id: 45 },
  { id: 13, user_id: 5, role_id: 4, context_id: 40, component: "",            item_id: 46 },
];

// Capability sheet, system-context defaults + one override.
// permission: allow | prevent | prohibit; absence = notset.
export const ROLE_CAPABILITIES = [
  // system defaults (context 1)
  { role_id: 1, context_id: 1, capability: "site:accessallgroups", permission: "allow" },
  { role_id: 2, context_id: 1, capability: "site:accessallgroups", permission: "allow" },
  { role_id: 3, context_id: 1, capability: "site:accessallgroups", permission: "allow" }, // teacher HAS it by default (Moodle surprise)
  { role_id: 6, context_id: 1, capability: "site:accessallgroups", permission: "allow" },
  { role_id: 1, context_id: 1, capability: "activity:grade",       permission: "allow" },
  { role_id: 2, context_id: 1, capability: "activity:grade",       permission: "allow" },
  { role_id: 3, context_id: 1, capability: "activity:grade",       permission: "allow" },
  { role_id: 6, context_id: 1, capability: "activity:grade",       permission: "allow" },
  { role_id: 4, context_id: 1, capability: "activity:submit",      permission: "allow" },
  { role_id: 5, context_id: 1, capability: "activity:submit",      permission: "prohibit" }, // the un-overridable demo
  { role_id: 4, context_id: 1, capability: "course:view",          permission: "allow" },
  { role_id: 5, context_id: 1, capability: "course:view",          permission: "allow" },
  { role_id: 1, context_id: 1, capability: "progress:viewall",     permission: "allow" },
  { role_id: 2, context_id: 1, capability: "progress:viewall",     permission: "allow" },
  { role_id: 3, context_id: 1, capability: "progress:viewall",     permission: "allow" },
  { role_id: 6, context_id: 1, capability: "progress:viewall",     permission: "allow" },
  { role_id: 4, context_id: 1, capability: "progress:viewown",     permission: "allow" },
  { role_id: 1, context_id: 1, capability: "completion:override",  permission: "allow" },
  { role_id: 2, context_id: 1, capability: "completion:override",  permission: "allow" },
  // the override that scopes ta.a: role 'teacher' loses accessallgroups inside CS101
  { role_id: 3, context_id: 10, capability: "site:accessallgroups", permission: "prevent" },
];

export const CAPABILITIES = [
  "course:view",
  "site:accessallgroups",
  "activity:grade",
  "activity:submit",
  "progress:viewall",
  "progress:viewown",
  "completion:override",
  "group:manage",
  "enrol:manual",
  "role:assign",
];

export const COHORTS = [
  { id: 31, name: "2026 intake", id_number: "INTAKE26", member_ids: [5, 6] },
];

// Enrolment method instances per course.
export const METHODS = [
  { id: 41, course_id: 1, method: "manual", status: "enabled",  default_role_id: 4, cohort_id: null, config: {} },
  { id: 42, course_id: 1, method: "self",   status: "enabled",  default_role_id: 4, cohort_id: null, config: { key: "sesame" } },
  { id: 43, course_id: 1, method: "cohort", status: "enabled",  default_role_id: 4, cohort_id: 31,   config: {} },
  { id: 44, course_id: 2, method: "manual", status: "enabled",  default_role_id: 4, cohort_id: null, config: {} },
  { id: 45, course_id: 2, method: "self",   status: "disabled", default_role_id: 4, cohort_id: null, config: { key: "open" } }, // method-disabled badge
  { id: 46, course_id: 4, method: "manual", status: "enabled",  default_role_id: 4, cohort_id: null, config: {} },
];

// One row per (user, method) — HC-1 lives here: salma has TWO paths into CS101.
export const ENROLMENTS = [
  { id: 61, method_id: 41, user_id: 5, status: "active",    time_start: null,         time_end: null },
  { id: 62, method_id: 43, user_id: 5, status: "active",    time_start: null,         time_end: null },
  { id: 63, method_id: 41, user_id: 6, status: "active",    time_start: null,         time_end: null },
  { id: 64, method_id: 41, user_id: 7, status: "active",    time_start: null,         time_end: null },
  { id: 65, method_id: 41, user_id: 8, status: "active",    time_start: null,         time_end: null }, // sami: account suspended, enrolment fine
  { id: 66, method_id: 44, user_id: 6, status: "active",    time_start: "2026-02-01", time_end: "2026-06-01" }, // expired window
  { id: 67, method_id: 45, user_id: 7, status: "active",    time_start: null,         time_end: null }, // via disabled method
  { id: 68, method_id: 46, user_id: 5, status: "active",    time_start: null,         time_end: null },
  { id: 69, method_id: 44, user_id: 5, status: "suspended", time_start: null,         time_end: null }, // per-path suspended
];

export const GROUPS = [
  { id: 11, course_id: 1, name: "Group A", enrolment_key: null, participation: true },
  { id: 12, course_id: 1, name: "Group B", enrolment_key: "keyB", participation: true },
  { id: 13, course_id: 1, name: "Observers", enrolment_key: null, participation: false },
];

// provenance: '' = manual; component names mirror role_assignment provenance.
export const GROUP_MEMBERS = [
  { group_id: 11, user_id: 5, component: "enrol_cohort", item_id: 43 }, // machine-owned row → 409 on remove without force
  { group_id: 11, user_id: 6, component: "",             item_id: 0 },  // HC-4: majd in A…
  { group_id: 12, user_id: 6, component: "",             item_id: 0 },  // …and B at once
  { group_id: 12, user_id: 7, component: "enrol_self",   item_id: 42 },
  { group_id: 11, user_id: 3, component: "",             item_id: 0 },  // ta.a belongs to Group A only
];

export const GROUPINGS = [
  { id: 21, course_id: 1, name: "Tutorial sections", group_ids: [11, 12] },
];

export const ACTIVITIES = [
  { id: 101, course_id: 1, name: "Assignment 1", activity_type: "assign", group_mode: null,       grouping_id: 21,   visible: true,  completion_enabled: true },
  { id: 102, course_id: 1, name: "Quiz 1",       activity_type: "quiz",   group_mode: "visible",  grouping_id: null, visible: true,  completion_enabled: true },
  { id: 103, course_id: 1, name: "Secret Forum", activity_type: "forum",  group_mode: null,       grouping_id: null, visible: false, completion_enabled: true }, // hidden → excluded from dashboard %
  { id: 201, course_id: 2, name: "Worksheet",    activity_type: "assign", group_mode: "separate", grouping_id: null, visible: true,  completion_enabled: false }, // configured ≠ effective (force_group_mode)
  { id: 401, course_id: 4, name: "Sandbox",      activity_type: "page",   group_mode: null,       grouping_id: null, visible: true,  completion_enabled: false },
];

// Activity completion cells (course CS101 report).
// state: incomplete | complete | complete_pass | complete_fail
export const ACTIVITY_COMPLETIONS = [
  { activity_id: 101, user_id: 5, state: "complete",      overridden_by: null, viewed: true  },
  { activity_id: 102, user_id: 5, state: "complete_pass", overridden_by: null, viewed: true  },
  { activity_id: 103, user_id: 5, state: "incomplete",    overridden_by: null, viewed: false },
  { activity_id: 101, user_id: 6, state: "complete",      overridden_by: 2,    viewed: false }, // 🔒 overridden by Tala
  { activity_id: 102, user_id: 6, state: "incomplete",    overridden_by: null, viewed: true  },
  { activity_id: 102, user_id: 7, state: "complete_fail", overridden_by: null, viewed: true  },
  { activity_id: 103, user_id: 7, state: "complete",      overridden_by: null, viewed: true  },
];

// Course completion criteria. LAB1 (4) deliberately has none → percent null.
export const COURSE_CRITERIA = {
  1: { aggregation: "all", items: [
        { id: 71, kind: "activity", activity_id: 101, label: "Complete Assignment 1" },
        { id: 72, kind: "activity", activity_id: 102, label: "Pass Quiz 1" },
        { id: 73, kind: "activity", activity_id: 103, label: "Post in Secret Forum" },
      ] },
  2: { aggregation: "any", items: [
        { id: 74, kind: "self", activity_id: null, label: "Self completion" },
      ] },
};

export const COURSE_COMPLETIONS = [
  { user_id: 5, course_id: 1, time_enrolled: "2026-02-10", time_started: "2026-02-12", time_completed: null },
  { user_id: 6, course_id: 1, time_enrolled: "2026-02-10", time_started: "2026-02-15", time_completed: null },
  { user_id: 7, course_id: 1, time_enrolled: "2026-02-11", time_started: "2026-03-01", time_completed: null },
  { user_id: 8, course_id: 1, time_enrolled: "2026-02-11", time_started: null,         time_completed: null },
  { user_id: 6, course_id: 2, time_enrolled: "2026-02-01", time_started: "2026-02-02", time_completed: "2026-05-20" },
];

// HC-5: HIST9 (deleted course) exists ONLY here. No FK anywhere — snapshots
// outlive the course, exactly like the progress_snapshot table.
export const SNAPSHOTS = [
  { id: 91, user_id: 9, course_id: 3, course_short_name: "HIST9", percent: 40,  taken_at: "2023-06-30", note: "end of term 1" },
  { id: 92, user_id: 9, course_id: 3, course_short_name: "HIST9", percent: 85,  taken_at: "2024-01-20", note: "resit window" },
  { id: 93, user_id: 9, course_id: 3, course_short_name: "HIST9", percent: 100, taken_at: "2024-06-28", note: "completed; course deleted 2025" },
  { id: 94, user_id: 5, course_id: 1, course_short_name: "CS101", percent: 62,  taken_at: "2026-06-30", note: "mid-semester checkpoint" },
];

export const LAST_ACCESS = [
  { user_id: 5, course_id: 1, accessed_at: "2026-07-20T14:02:00Z" },
  { user_id: 6, course_id: 1, accessed_at: "2026-07-21T08:40:00Z" },
  { user_id: 7, course_id: 1, accessed_at: "2026-06-30T10:00:00Z" },
];

// ---- LMS experience layer (auth, catalog, submissions, quizzes) ----------
// Fixtures for the signup/login + student/teacher portal flows. Same rule:
// domain mocks import ids from here; never invent parallel fixtures.

// Quiz definitions keyed by activity id. `answer` is the marking key — the
// mock API strips it before sending questions to a student.
export const QUIZZES = [
  {
    activity_id: 102,
    attempts_allowed: 3,
    grade_to_pass: 6,
    questions: [
      { id: 1, type: "multichoice", text: "Which data structure is FIFO?", points: 2, options: ["Stack", "Queue", "Tree", "Heap"], answer: 1 },
      { id: 2, type: "truefalse", text: "Binary search requires sorted input.", points: 2, answer: true },
      { id: 3, type: "multichoice", text: "Time complexity of a linear scan?", points: 2, options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2 },
      { id: 4, type: "essay", text: "In two sentences: why do arrays beat linked lists on cache locality?", points: 4, answer: null },
    ],
  },
];

// Assignment submissions. status: draft | submitted | graded.
// files carry no bytes in seed rows — uploads from the UI add data_url too.
export const SUBMISSIONS = [
  { id: 81, activity_id: 101, user_id: 7, status: "submitted", text: "Solution attached.", files: [{ name: "solution.pdf", size: 24812, type: "application/pdf" }], statement_accepted: true, submitted_at: "2026-07-18T09:12:00Z", grade: null, feedback: null, graded_by: null },
  { id: 82, activity_id: 101, user_id: 5, status: "graded", text: "See essay file.", files: [{ name: "essay.docx", size: 18110, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }], statement_accepted: true, submitted_at: "2026-07-15T11:03:00Z", grade: 86, feedback: "Solid work — cite sources next time.", graded_by: 2 },
  { id: 83, activity_id: 101, user_id: 6, status: "draft", text: "wip — not done yet", files: [], statement_accepted: false, submitted_at: null, grade: null, feedback: null, graded_by: null },
];

// Quiz attempts. state: in_progress | finished (essay awaiting marking) | graded.
export const QUIZ_ATTEMPTS = [
  { id: 71, activity_id: 102, user_id: 7, state: "finished", started_at: "2026-07-19T10:00:00Z", finished_at: "2026-07-19T10:24:00Z", answers: { 1: 1, 2: true, 3: 2, 4: "Contiguous memory keeps neighbouring elements on the same cache line, so sequential reads rarely miss." }, auto_score: 6, essay_scores: {}, total: null },
  { id: 72, activity_id: 102, user_id: 5, state: "graded", started_at: "2026-07-14T09:00:00Z", finished_at: "2026-07-14T09:31:00Z", answers: { 1: 1, 2: true, 3: 1, 4: "Arrays are contiguous; linked nodes scatter across the heap." }, auto_score: 4, essay_scores: { 4: 3 }, total: 7 },
];

// Enrolment requests — student asks, teacher approves (core Moodle has no
// request-to-enrol; this is our deliberate improvement over stock behaviour).
// Ghada (9) returning to CS101 doubles as the HC-2 "re-enrol" story.
export const ENROL_REQUESTS = [
  { id: 51, course_id: 1, user_id: 9, message: "Returning after a break — need CS101 to finish my degree.", status: "pending", requested_at: "2026-07-21T16:00:00Z", decided_by: null },
];

// Course requests — Moodle-faithful: plain teachers CANNOT create courses
// (moodle/course:create defaults to Manager/Course creator); they may only
// request one (moodle/course:request), and approval makes them its teacher.
export const COURSE_REQUESTS = [
  { id: 55, requester_id: 2, full_name: "Advanced Computer Science", short_name: "CS201", reason: "Follow-up course for CS101 graduates.", status: "pending", decided_by: null },
];

// ---- tiny shared helpers -------------------------------------------------
export const userById = (id) => USERS.find((u) => u.id === id) || null;
export const courseById = (id) => COURSES.find((c) => c.id === id) || null;
export const roleById = (id) => ROLES.find((r) => r.id === id) || null;
export const contextById = (id) => CONTEXTS.find((c) => c.id === id) || null;
export const contextForCourse = (courseId) =>
  CONTEXTS.find((c) => c.level === "course" && c.instance_id === courseId) || null;
export const contextForActivity = (activityId) =>
  CONTEXTS.find((c) => c.level === "activity" && c.instance_id === activityId) || null;

// Groups of a user within one course (HC-4 helper).
export const groupsOfUser = (userId, courseId) =>
  GROUP_MEMBERS.filter((m) => m.user_id === userId)
    .map((m) => GROUPS.find((g) => g.id === m.group_id))
    .filter((g) => g && g.course_id === courseId);

// Effective per-path liveness — mirrors v_enrolment_detail in the schema.
// `now` defaults to the real current time: a hardcoded past date made any
// enrolment starting today/later read as "not yet started" → wrongly suspended.
export function pathLive(enrolment, method, user, now = new Date()) {
  if (user?.suspended) return false;
  if (enrolment.status !== "active") return false;
  if (method.status !== "enabled") return false;
  if (enrolment.time_start && new Date(enrolment.time_start) > now) return false;
  if (enrolment.time_end && new Date(enrolment.time_end) <= now) return false;
  return true;
}

// Effective participant badge, per task 06 §4.2 precedence:
// account-suspended (red) > all-paths-dead reasons > active.
export function effectiveStatus(userId, courseId) {
  const user = userById(userId);
  const paths = ENROLMENTS.filter((e) => e.user_id === userId)
    .map((e) => ({ e, m: METHODS.find((m) => m.id === e.method_id) }))
    .filter(({ m }) => m && m.course_id === courseId);
  if (!paths.length) return null; // not enrolled at all
  if (user?.suspended) return "account_suspended";
  if (paths.some(({ e, m }) => pathLive(e, m, user))) return "active";
  const now = new Date();
  if (paths.some(({ e }) => e.time_end && new Date(e.time_end) <= now)) return "expired";
  if (paths.some(({ m }) => m.status === "disabled")) return "method_disabled";
  return "suspended";
}
