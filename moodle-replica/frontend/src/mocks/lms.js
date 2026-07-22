// LMS experience mocks — signup/login, course catalog + self-enrol/request,
// assignment submissions (file upload), quiz attempts + grading, activity
// creation, course requests. STATEFUL like enrolment.js: handlers mutate the
// seed arrays so flows survive refetches. Every rule mirrors documented
// Moodle behaviour (see frontend/LMS-EXPERIENCE.md for the evidence trail);
// connect-later: each route maps 1:1 onto a planned backend endpoint.
// explicit extensions so plain `node` can run lms.selfcheck.mjs (Vite is fine either way)
import { ApiError } from "../errors.js";
import {
  USERS,
  COURSES,
  ROLES,
  CONTEXTS,
  ROLE_ASSIGNMENTS,
  ROLE_CAPABILITIES,
  METHODS,
  ENROLMENTS,
  ACTIVITIES,
  QUIZZES,
  SUBMISSIONS,
  QUIZ_ATTEMPTS,
  ENROL_REQUESTS,
  COURSE_REQUESTS,
  userById,
  courseById,
  roleById,
  contextForCourse,
  contextForActivity,
  groupsOfUser,
  effectiveStatus,
} from "./seed.js";

const nextId = (rows) => Math.max(0, ...rows.map((r) => r.id)) + 1;
const activityById = (id) => ACTIVITIES.find((a) => a.id === id) || null;
const quizForActivity = (id) => QUIZZES.find((q) => q.activity_id === id) || null;

// Signup-created accounts: password + Moodle-style email-confirmation state.
// Seed personas sign in with any non-empty password (demo convenience).
const CREDENTIALS = new Map(); // user_id → { password, confirmed }

// ---- identity helpers ----------------------------------------------------

const roleIdsAt = (userId, contextIds) =>
  ROLE_ASSIGNMENTS.filter(
    (a) => a.user_id === userId && contextIds.includes(a.context_id),
  ).map((a) => a.role_id);

const isAdmin = (userId) =>
  roleIdsAt(userId, [1]).some((rid) => roleById(rid)?.archetype === "manager");

const teacherRoleAt = (userId, courseId) => {
  const ctx = contextForCourse(courseId);
  const ids = roleIdsAt(userId, ctx ? [1, ctx.id] : [1]);
  return {
    editing: ids.some((rid) => roleById(rid)?.archetype === "editingteacher"),
    nonEditing: ids.some((rid) => roleById(rid)?.archetype === "teacher"),
  };
};

const teaches = (userId, courseId) => {
  const t = teacherRoleAt(userId, courseId);
  return isAdmin(userId) || t.editing || t.nonEditing;
};

const taughtCourseIds = (userId) =>
  COURSES.filter((c) => !c.deleted && teaches(userId, c.id)).map((c) => c.id);

// accessallgroups resolved for one user at one course: per role take the
// deepest override (course beats system), then prohibit > any-allow > deny.
function hasAccessAllGroups(userId, courseId) {
  const ctx = contextForCourse(courseId);
  if (!ctx) return false;
  const verdicts = [...new Set(roleIdsAt(userId, [1, ctx.id]))].map((rid) => {
    const atCourse = ROLE_CAPABILITIES.find(
      (rc) => rc.role_id === rid && rc.context_id === ctx.id && rc.capability === "site:accessallgroups",
    );
    const atSystem = ROLE_CAPABILITIES.find(
      (rc) => rc.role_id === rid && rc.context_id === 1 && rc.capability === "site:accessallgroups",
    );
    return (atCourse ?? atSystem)?.permission ?? "notset";
  });
  if (verdicts.includes("prohibit")) return false;
  return verdicts.includes("allow");
}

// HC-3 in the grading flow: a group-scoped TA may only grade students who
// share one of her participation groups.
function gradeGate(actorId, courseId, targetUserId) {
  if (!teaches(actorId, courseId))
    throw new ApiError(403, { reasons: ["you do not teach this course — grading needs a teacher role here"] });
  if (isAdmin(actorId) || hasAccessAllGroups(actorId, courseId)) return;
  const mine = groupsOfUser(actorId, courseId).map((g) => g.id);
  const theirs = groupsOfUser(targetUserId, courseId).map((g) => g.id);
  if (!mine.some((g) => theirs.includes(g)))
    throw new ApiError(403, {
      reasons: [
        `your access-all-groups is prevented in this course and you share no group with ${userById(targetUserId)?.full_name} — you may only grade your own group's work (hard case 3)`,
      ],
    });
}

const requireActiveStudent = (userId, courseId) => {
  const st = effectiveStatus(userId, courseId);
  if (st !== "active")
    throw new ApiError(403, {
      reasons: [
        st === null
          ? "you are not enrolled in this course"
          : `your enrolment is not live here (${st.replace("_", " ")}) — no participation until it is`,
      ],
    });
};

const meSummary = (user) => ({
  user,
  is_admin: isAdmin(user.id),
  teaches: taughtCourseIds(user.id),
  enrolled: COURSES.filter((c) => !c.deleted && effectiveStatus(user.id, c.id) !== null).map((c) => c.id),
});

// ---- student per-activity status ----------------------------------------

function myActivityStatus(activity, userId) {
  if (activity.activity_type === "assign") {
    const s = SUBMISSIONS.find((x) => x.activity_id === activity.id && x.user_id === userId);
    return {
      kind: "assign",
      submission_status: s?.status ?? "none",
      grade: s?.grade ?? null,
      feedback: s?.feedback ?? null,
    };
  }
  if (activity.activity_type === "quiz") {
    const quiz = quizForActivity(activity.id);
    const mine = QUIZ_ATTEMPTS.filter((a) => a.activity_id === activity.id && a.user_id === userId);
    const best = mine.filter((a) => a.total != null).reduce((m, a) => Math.max(m, a.total), -1);
    return {
      kind: "quiz",
      attempts_used: mine.length,
      attempts_allowed: quiz?.attempts_allowed ?? 1,
      in_progress: mine.some((a) => a.state === "in_progress"),
      awaiting_marking: mine.some((a) => a.state === "finished"),
      best_score: best < 0 ? null : best,
      max_score: quiz ? quiz.questions.reduce((s, q) => s + q.points, 0) : null,
    };
  }
  return { kind: activity.activity_type };
}

const stripAnswers = (quiz) => ({
  activity_id: quiz.activity_id,
  attempts_allowed: quiz.attempts_allowed,
  grade_to_pass: quiz.grade_to_pass,
  max_score: quiz.questions.reduce((s, q) => s + q.points, 0),
  questions: quiz.questions.map(({ answer: _drop, ...q }) => q),
});

function finishAttempt(attempt) {
  const quiz = quizForActivity(attempt.activity_id);
  let auto = 0;
  let hasEssay = false;
  for (const q of quiz.questions) {
    if (q.type === "essay") {
      hasEssay = true;
      continue;
    }
    // loose equality on purpose: radio values arrive as strings
    if (attempt.answers[q.id] == q.answer) auto += q.points; // eslint-disable-line eqeqeq
  }
  attempt.auto_score = auto;
  attempt.finished_at = new Date().toISOString();
  if (hasEssay) {
    attempt.state = "finished"; // essay awaits manual marking
    attempt.total = null;
  } else {
    attempt.state = "graded";
    attempt.total = auto;
  }
  return attempt;
}

// ---- routes --------------------------------------------------------------

export const routes = [
  // == auth: Moodle email-based self-registration, condensed ==============
  {
    method: "POST",
    pattern: /^\/api\/auth\/signup$/,
    handler: (m, body) => {
      const { username, first_name, last_name, password } = body;
      if (!username || !first_name || !last_name || !password)
        throw new ApiError(400, { detail: "username, first_name, last_name and password are all required" });
      if (USERS.some((u) => u.username === username))
        throw new ApiError(409, { detail: `username '${username}' is taken — pick another` });
      const user = {
        id: nextId(USERS),
        username,
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        suspended: false,
      };
      USERS.push(user);
      CREDENTIALS.set(user.id, { password, confirmed: false });
      // Moodle sends a confirmation email; we surface the same gate in-app.
      return { user, confirmation_required: true };
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/confirm$/,
    handler: (m, body) => {
      const cred = CREDENTIALS.get(Number(body.user_id));
      if (!cred) throw new ApiError(404, { detail: "unknown account" });
      cred.confirmed = true;
      return { confirmed: true };
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/login$/,
    handler: (m, body) => {
      const user = USERS.find((u) => u.username === body.username);
      if (!user || !body.password)
        throw new ApiError(401, { detail: "invalid username or password" });
      const cred = CREDENTIALS.get(user.id);
      if (cred && cred.password !== body.password)
        throw new ApiError(401, { detail: "invalid username or password" });
      if (cred && !cred.confirmed)
        throw new ApiError(403, { reasons: ["account not confirmed yet — click the confirmation link first (we mock Moodle's confirmation email in-app)"] });
      if (user.suspended)
        throw new ApiError(403, { reasons: ["this account is suspended site-wide — sign-in refused, exactly like Moodle; enrolments and grades are kept"] });
      return meSummary(user);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/me$/,
    handler: (m, body, query) => {
      const user = userById(Number(query.user_id));
      if (!user) throw new ApiError(404, { detail: "unknown user" });
      return meSummary(user);
    },
  },

  // == teacher: roster management =========================================
  {
    // Manual enrolment from the roster — Moodle's Participants "Enrol users".
    // enrol/manual:enrol belongs to editing teachers; non-editing refused.
    method: "POST",
    pattern: /^\/api\/lms\/courses\/(\d+)\/enrol$/,
    handler: (m, body) => {
      const course = courseById(Number(m[1]));
      if (!course) throw new ApiError(404, { detail: "course not found" });
      const actorId = Number(body.actor_id);
      const t = teacherRoleAt(actorId, course.id);
      if (!isAdmin(actorId) && !t.editing)
        throw new ApiError(403, {
          reasons: [
            t.nonEditing
              ? "non-editing teachers cannot enrol users (enrol/manual:enrol is an editing-teacher capability)"
              : "you do not teach this course",
          ],
        });
      const user = userById(Number(body.user_id));
      if (!user) throw new ApiError(404, { detail: "user not found" });
      if (effectiveStatus(user.id, course.id) === "active")
        throw new ApiError(409, { detail: `${user.full_name} is already enrolled here` });
      const manual = METHODS.find(
        (mm) => mm.course_id === course.id && mm.method === "manual" && mm.status === "enabled",
      );
      if (!manual)
        throw new ApiError(409, { detail: "manual enrolment is disabled in this course — enable it first" });
      const roleId = Number(body.role_id) || manual.default_role_id;
      if (![3, 4].includes(roleId) && !isAdmin(actorId))
        throw new ApiError(403, {
          reasons: ["a teacher may only enrol with roles below their own (student, non-editing teacher)"],
        });
      ENROLMENTS.push({ id: nextId(ENROLMENTS), method_id: manual.id, user_id: user.id, status: "active", time_start: null, time_end: null });
      const ctx = contextForCourse(course.id);
      ROLE_ASSIGNMENTS.push({ id: nextId(ROLE_ASSIGNMENTS), user_id: user.id, role_id: roleId, context_id: ctx.id, component: "", item_id: manual.id });
      return { enrolled: true, user_id: user.id, role: roleById(roleId)?.short_name };
    },
  },
  {
    // Suspend / reactivate one enrolment path. Suspend blocks access but
    // KEEPS everything — the reversible lever, unlike unenrol.
    method: "PATCH",
    pattern: /^\/api\/lms\/enrolments\/(\d+)$/,
    handler: (m, body) => {
      const e = ENROLMENTS.find((x) => x.id === Number(m[1]));
      if (!e) throw new ApiError(404, { detail: "enrolment not found" });
      const mm = METHODS.find((x) => x.id === e.method_id);
      const actorId = Number(body.actor_id);
      const t = teacherRoleAt(actorId, mm.course_id);
      if (!isAdmin(actorId) && !t.editing)
        throw new ApiError(403, { reasons: ["only editing teachers may change enrolment status"] });
      if (mm.method === "cohort")
        throw new ApiError(403, {
          reasons: ["this path is owned by cohort sync — suspending it here would be undone on next sync; remove the cohort membership instead"],
        });
      if (!["active", "suspended"].includes(body.status))
        throw new ApiError(400, { detail: "status must be active or suspended" });
      e.status = body.status;
      return { ...e, method: mm.method };
    },
  },
  {
    // Unenrol one path. Cohort paths refuse (sync recreates them). The
    // response says out loud what Moodle buries: completions survive.
    method: "DELETE",
    pattern: /^\/api\/lms\/enrolments\/(\d+)$/,
    handler: (m, body, query) => {
      const e = ENROLMENTS.find((x) => x.id === Number(m[1]));
      if (!e) throw new ApiError(404, { detail: "enrolment not found" });
      const mm = METHODS.find((x) => x.id === e.method_id);
      const actorId = Number(query.actor_id);
      const t = teacherRoleAt(actorId, mm.course_id);
      if (!isAdmin(actorId) && !t.editing)
        throw new ApiError(403, { reasons: ["only editing teachers may unenrol users"] });
      if (mm.method === "cohort")
        throw new ApiError(403, {
          reasons: ["this path is owned by cohort sync — it would be recreated on next sync; remove the cohort membership instead"],
        });
      ENROLMENTS.splice(ENROLMENTS.indexOf(e), 1);
      const ra = ROLE_ASSIGNMENTS.find(
        (a) => a.user_id === e.user_id && a.item_id === mm.id && a.component !== "enrol_cohort",
      );
      if (ra) ROLE_ASSIGNMENTS.splice(ROLE_ASSIGNMENTS.indexOf(ra), 1);
      return null; // 204
    },
  },
  {
    // Remove a course role (e.g. demote a non-editing teacher). Machine-owned
    // assignments refuse, mirroring /api/roles/assignments provenance guard.
    method: "POST",
    pattern: /^\/api\/lms\/courses\/(\d+)\/remove-role$/,
    handler: (m, body) => {
      const course = courseById(Number(m[1]));
      const ctx = contextForCourse(course?.id);
      if (!ctx) throw new ApiError(404, { detail: "course not found" });
      const actorId = Number(body.actor_id);
      const t = teacherRoleAt(actorId, course.id);
      if (!isAdmin(actorId) && !t.editing)
        throw new ApiError(403, { reasons: ["only editing teachers may remove roles here"] });
      const ra = ROLE_ASSIGNMENTS.find(
        (a) => a.user_id === Number(body.user_id) && a.role_id === Number(body.role_id) && a.context_id === ctx.id,
      );
      if (!ra) throw new ApiError(404, { detail: "no such role assignment at this course" });
      if (ra.component.startsWith("enrol_"))
        throw new ApiError(403, {
          reasons: [`assignment is owned by '${ra.component}' — remove the enrolment path instead`],
        });
      ROLE_ASSIGNMENTS.splice(ROLE_ASSIGNMENTS.indexOf(ra), 1);
      return null;
    },
  },
  {
    // Revert a submission to draft — the other half of "submit locks it".
    method: "POST",
    pattern: /^\/api\/lms\/submissions\/(\d+)\/revert$/,
    handler: (m, body) => {
      const s = SUBMISSIONS.find((x) => x.id === Number(m[1]));
      if (!s) throw new ApiError(404, { detail: "submission not found" });
      const activity = activityById(s.activity_id);
      gradeGate(Number(body.actor_id), activity.course_id, s.user_id);
      if (s.status === "draft") throw new ApiError(409, { detail: "already a draft" });
      s.status = "draft";
      s.submitted_at = null;
      return s; // grade/feedback kept — reverting is not un-marking
    },
  },
  {
    // Show/hide an activity — editing teachers only; students' world
    // changes instantly (hidden = does not exist for them).
    method: "PATCH",
    pattern: /^\/api\/lms\/activities\/(\d+)$/,
    handler: (m, body) => {
      const activity = activityById(Number(m[1]));
      if (!activity) throw new ApiError(404, { detail: "activity not found" });
      const actorId = Number(body.actor_id);
      const t = teacherRoleAt(actorId, activity.course_id);
      if (!isAdmin(actorId) && !t.editing)
        throw new ApiError(403, {
          reasons: [
            t.nonEditing
              ? "non-editing teachers may not alter activities (grade-only role)"
              : "you do not teach this course",
          ],
        });
      if (typeof body.visible === "boolean") activity.visible = body.visible;
      return activity;
    },
  },

  // == catalog + enrolment options ========================================
  {
    method: "GET",
    pattern: /^\/api\/lms\/catalog$/,
    handler: (m, body, query) => {
      const userId = Number(query.user_id);
      return COURSES.filter((c) => c.visible && !c.deleted).map((c) => {
        const methods = METHODS.filter((mm) => mm.course_id === c.id);
        const self = methods.find((mm) => mm.method === "self" && mm.status === "enabled");
        const manual = methods.find((mm) => mm.method === "manual" && mm.status === "enabled");
        const pending = ENROL_REQUESTS.some(
          (r) => r.course_id === c.id && r.user_id === userId && r.status === "pending",
        );
        return {
          course: c,
          my_status: effectiveStatus(userId, c.id),
          // role ≠ enrolment (Moodle rule): teachers appear via role assignment
          teaching: teaches(userId, c.id),
          request_pending: pending,
          options: {
            self_enrol: self ? { requires_key: Boolean(self.config.key) } : null,
            can_request: Boolean(manual), // our improvement — core Moodle has no request-to-enrol
          },
        };
      });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/courses\/(\d+)\/self-enrol$/,
    handler: (m, body) => {
      const course = courseById(Number(m[1]));
      const userId = Number(body.user_id);
      const user = userById(userId);
      if (!course || !user) throw new ApiError(404, { detail: "unknown course or user" });
      if (user.suspended)
        throw new ApiError(403, { reasons: ["suspended accounts cannot enrol"] });
      const method = METHODS.find(
        (mm) => mm.course_id === course.id && mm.method === "self" && mm.status === "enabled",
      );
      if (!method)
        throw new ApiError(403, { reasons: ["self enrolment is not enabled in this course — ask to be enrolled instead"] });
      if (method.config.key && method.config.key !== body.key)
        throw new ApiError(403, { reasons: ["incorrect enrolment key"] });
      if (effectiveStatus(userId, course.id) === "active")
        throw new ApiError(409, { detail: "already enrolled in this course" });
      ENROLMENTS.push({ id: nextId(ENROLMENTS), method_id: method.id, user_id: userId, status: "active", time_start: null, time_end: null });
      const ctx = contextForCourse(course.id);
      ROLE_ASSIGNMENTS.push({
        id: nextId(ROLE_ASSIGNMENTS),
        user_id: userId,
        role_id: method.default_role_id,
        context_id: ctx.id,
        component: "enrol_self",
        item_id: method.id,
      });
      return { enrolled: true, course_id: course.id, role: roleById(method.default_role_id)?.short_name };
    },
  },
  {
    // Moodle-faithful: only a SELF-enrolled path may be self-removed
    // (enrol/self:unenrolself). Manual/cohort paths refuse with the reason.
    // Completions and grades survive — unenrolment never rewrites the past.
    method: "POST",
    pattern: /^\/api\/lms\/courses\/(\d+)\/unenrol-self$/,
    handler: (m, body) => {
      const course = courseById(Number(m[1]));
      const userId = Number(body.user_id);
      if (!course || !userById(userId)) throw new ApiError(404, { detail: "unknown course or user" });
      const paths = ENROLMENTS.map((e) => ({ e, mm: METHODS.find((x) => x.id === e.method_id) })).filter(
        ({ e, mm }) => e.user_id === userId && mm && mm.course_id === course.id,
      );
      if (!paths.length) throw new ApiError(409, { detail: "you are not enrolled in this course" });
      const selfPaths = paths.filter(({ mm }) => mm.method === "self");
      if (!selfPaths.length)
        throw new ApiError(403, {
          reasons: [
            `your enrolment here was created by ${paths.map(({ mm }) => mm.method).join(" + ")} — only self-enrolled students may unenrol themselves (enrol/self:unenrolself); ask your teacher`,
          ],
        });
      for (const { e, mm } of selfPaths) {
        ENROLMENTS.splice(ENROLMENTS.indexOf(e), 1);
        const ra = ROLE_ASSIGNMENTS.find(
          (a) => a.user_id === userId && a.component === "enrol_self" && a.item_id === mm.id,
        );
        if (ra) ROLE_ASSIGNMENTS.splice(ROLE_ASSIGNMENTS.indexOf(ra), 1);
      }
      const still = paths.length > selfPaths.length;
      return {
        unenrolled: !still,
        note: still
          ? "self-enrolment path removed — other enrolment paths keep you in this course (any-active wins)"
          : "unenrolled — your completions and grades are kept; re-enrol any time and they return",
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/lms\/my-requests$/,
    handler: (m, body, query) =>
      ENROL_REQUESTS.filter((r) => r.user_id === Number(query.user_id)).map((r) => ({
        ...r,
        course: courseById(r.course_id),
      })),
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/courses\/(\d+)\/enrol-request$/,
    handler: (m, body) => {
      const course = courseById(Number(m[1]));
      const userId = Number(body.user_id);
      if (!course || !userById(userId)) throw new ApiError(404, { detail: "unknown course or user" });
      if (effectiveStatus(userId, course.id) === "active")
        throw new ApiError(409, { detail: "already enrolled in this course" });
      if (ENROL_REQUESTS.some((r) => r.course_id === course.id && r.user_id === userId && r.status === "pending"))
        throw new ApiError(409, { detail: "you already have a pending request for this course" });
      const row = {
        id: nextId(ENROL_REQUESTS),
        course_id: course.id,
        user_id: userId,
        message: body.message ?? "",
        status: "pending",
        requested_at: new Date().toISOString(),
        decided_by: null,
      };
      ENROL_REQUESTS.push(row);
      return row;
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/lms\/courses\/(\d+)\/enrol-requests$/,
    handler: (m, body, query) => {
      const courseId = Number(m[1]);
      if (!teaches(Number(query.actor_id), courseId))
        throw new ApiError(403, { reasons: ["only this course's teachers may review enrolment requests"] });
      return ENROL_REQUESTS.filter((r) => r.course_id === courseId).map((r) => ({
        ...r,
        user: userById(r.user_id),
      }));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/enrol-requests\/(\d+)\/(approve|deny)$/,
    handler: (m, body) => {
      const req = ENROL_REQUESTS.find((r) => r.id === Number(m[1]));
      if (!req) throw new ApiError(404, { detail: "request not found" });
      if (req.status !== "pending") throw new ApiError(409, { detail: `request already ${req.status}` });
      const actorId = Number(body.actor_id);
      if (!teaches(actorId, req.course_id))
        throw new ApiError(403, { reasons: ["only this course's teachers may decide enrolment requests"] });
      req.decided_by = actorId;
      if (m[2] === "deny") {
        req.status = "denied";
        return req;
      }
      const manual = METHODS.find(
        (mm) => mm.course_id === req.course_id && mm.method === "manual" && mm.status === "enabled",
      );
      if (!manual)
        throw new ApiError(409, { detail: "manual enrolment is disabled in this course — enable it first" });
      ENROLMENTS.push({ id: nextId(ENROLMENTS), method_id: manual.id, user_id: req.user_id, status: "active", time_start: null, time_end: null });
      const ctx = contextForCourse(req.course_id);
      ROLE_ASSIGNMENTS.push({
        id: nextId(ROLE_ASSIGNMENTS),
        user_id: req.user_id,
        role_id: manual.default_role_id,
        context_id: ctx.id,
        component: "",
        item_id: manual.id,
      });
      req.status = "approved";
      return req;
    },
  },

  // == course activities, student view ====================================
  {
    method: "GET",
    pattern: /^\/api\/lms\/courses\/(\d+)\/activities$/,
    handler: (m, body, query) => {
      const courseId = Number(m[1]);
      const userId = Number(query.user_id);
      const asTeacher = teaches(userId, courseId);
      return ACTIVITIES.filter((a) => a.course_id === courseId)
        .filter((a) => asTeacher || a.visible) // hidden activities vanish for students, exactly like Moodle
        .map((a) => ({ ...a, mine: myActivityStatus(a, userId) }));
    },
  },

  // == assignment submission (file/image upload, draft → submit) ==========
  {
    method: "GET",
    pattern: /^\/api\/lms\/activities\/(\d+)\/submission$/,
    handler: (m, body, query) =>
      SUBMISSIONS.find(
        (s) => s.activity_id === Number(m[1]) && s.user_id === Number(query.user_id),
      ) ?? { status: "none" },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/activities\/(\d+)\/submission$/,
    handler: (m, body) => {
      const activity = activityById(Number(m[1]));
      if (!activity || activity.activity_type !== "assign")
        throw new ApiError(404, { detail: "no such assignment" });
      const userId = Number(body.user_id);
      requireActiveStudent(userId, activity.course_id);
      if (!activity.visible)
        throw new ApiError(403, { reasons: ["this activity is hidden — students cannot submit to it"] });
      const files = body.files ?? [];
      if (files.length > 5) throw new ApiError(400, { detail: "at most 5 files per submission" });
      let s = SUBMISSIONS.find((x) => x.activity_id === activity.id && x.user_id === userId);
      if (s && (s.status === "submitted" || s.status === "graded"))
        throw new ApiError(409, { detail: "already submitted — ask your teacher to revert to draft if you need changes" });
      if (!s) {
        s = { id: nextId(SUBMISSIONS), activity_id: activity.id, user_id: userId, status: "draft", text: "", files: [], statement_accepted: false, submitted_at: null, grade: null, feedback: null, graded_by: null };
        SUBMISSIONS.push(s);
      }
      s.text = body.text ?? "";
      s.files = files;
      if (body.action === "submit") {
        // Moodle's submission statement: no declaration, no hand-in.
        if (!body.statement_accepted)
          throw new ApiError(403, { reasons: ["you must accept the submission statement (\"this is my own work\") before submitting"] });
        s.statement_accepted = true;
        s.status = "submitted";
        s.submitted_at = new Date().toISOString();
      }
      return s;
    },
  },

  // == quiz: view, attempt, answer, finish ================================
  {
    method: "GET",
    pattern: /^\/api\/lms\/activities\/(\d+)\/quiz$/,
    handler: (m, body, query) => {
      const quiz = quizForActivity(Number(m[1]));
      if (!quiz) throw new ApiError(404, { detail: "no such quiz" });
      const userId = Number(query.user_id);
      return {
        ...stripAnswers(quiz),
        my_attempts: QUIZ_ATTEMPTS.filter(
          (a) => a.activity_id === quiz.activity_id && a.user_id === userId,
        ),
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/activities\/(\d+)\/attempts$/,
    handler: (m, body) => {
      const activity = activityById(Number(m[1]));
      const quiz = quizForActivity(Number(m[1]));
      if (!activity || !quiz) throw new ApiError(404, { detail: "no such quiz" });
      const userId = Number(body.user_id);
      requireActiveStudent(userId, activity.course_id);
      const mine = QUIZ_ATTEMPTS.filter((a) => a.activity_id === quiz.activity_id && a.user_id === userId);
      if (mine.some((a) => a.state === "in_progress"))
        throw new ApiError(409, { detail: "you already have an attempt in progress — finish it first" });
      if (mine.length >= quiz.attempts_allowed)
        throw new ApiError(403, { reasons: [`no attempts left (${quiz.attempts_allowed} allowed)`] });
      const attempt = {
        id: nextId(QUIZ_ATTEMPTS),
        activity_id: quiz.activity_id,
        user_id: userId,
        state: "in_progress",
        started_at: new Date().toISOString(),
        finished_at: null,
        answers: {},
        auto_score: null,
        essay_scores: {},
        total: null,
      };
      QUIZ_ATTEMPTS.push(attempt);
      return attempt;
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/lms\/attempts\/(\d+)$/,
    handler: (m, body) => {
      const attempt = QUIZ_ATTEMPTS.find((a) => a.id === Number(m[1]));
      if (!attempt) throw new ApiError(404, { detail: "attempt not found" });
      if (attempt.state !== "in_progress")
        throw new ApiError(409, { detail: "attempt is closed" });
      Object.assign(attempt.answers, body.answers ?? {});
      return attempt;
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/attempts\/(\d+)\/finish$/,
    handler: (m) => {
      const attempt = QUIZ_ATTEMPTS.find((a) => a.id === Number(m[1]));
      if (!attempt) throw new ApiError(404, { detail: "attempt not found" });
      if (attempt.state !== "in_progress")
        throw new ApiError(409, { detail: "attempt already finished" });
      return finishAttempt(attempt);
    },
  },

  // == teacher: submissions + grading (HC-3 group scope enforced) =========
  {
    method: "GET",
    pattern: /^\/api\/lms\/activities\/(\d+)\/submissions$/,
    handler: (m, body, query) => {
      const activity = activityById(Number(m[1]));
      if (!activity) throw new ApiError(404, { detail: "activity not found" });
      const actorId = Number(query.actor_id);
      if (!teaches(actorId, activity.course_id))
        throw new ApiError(403, { reasons: ["only this course's teachers may view submissions"] });
      return SUBMISSIONS.filter((s) => s.activity_id === activity.id).map((s) => ({
        ...s,
        user: userById(s.user_id),
        can_grade: (() => {
          try {
            gradeGate(actorId, activity.course_id, s.user_id);
            return true;
          } catch {
            return false;
          }
        })(),
      }));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/submissions\/(\d+)\/grade$/,
    handler: (m, body) => {
      const s = SUBMISSIONS.find((x) => x.id === Number(m[1]));
      if (!s) throw new ApiError(404, { detail: "submission not found" });
      const activity = activityById(s.activity_id);
      gradeGate(Number(body.actor_id), activity.course_id, s.user_id);
      if (s.status === "draft")
        throw new ApiError(409, { detail: "cannot grade a draft — the student has not submitted yet" });
      const grade = Number(body.grade);
      if (!(grade >= 0 && grade <= 100))
        throw new ApiError(400, { detail: "grade must be 0–100" });
      s.grade = grade;
      s.feedback = body.feedback ?? "";
      s.graded_by = Number(body.actor_id);
      s.status = "graded";
      return s;
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/lms\/activities\/(\d+)\/attempts$/,
    handler: (m, body, query) => {
      const activity = activityById(Number(m[1]));
      const quiz = quizForActivity(Number(m[1]));
      if (!activity || !quiz) throw new ApiError(404, { detail: "quiz not found" });
      const actorId = Number(query.actor_id);
      if (!teaches(actorId, activity.course_id))
        throw new ApiError(403, { reasons: ["only this course's teachers may view attempts"] });
      return QUIZ_ATTEMPTS.filter((a) => a.activity_id === activity.id).map((a) => ({
        ...a,
        user: userById(a.user_id),
        questions: quiz.questions, // marking view includes the key
        can_grade: (() => {
          try {
            gradeGate(actorId, activity.course_id, a.user_id);
            return true;
          } catch {
            return false;
          }
        })(),
      }));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/attempts\/(\d+)\/grade-essay$/,
    handler: (m, body) => {
      const attempt = QUIZ_ATTEMPTS.find((a) => a.id === Number(m[1]));
      if (!attempt) throw new ApiError(404, { detail: "attempt not found" });
      const activity = activityById(attempt.activity_id);
      gradeGate(Number(body.actor_id), activity.course_id, attempt.user_id);
      if (attempt.state !== "finished")
        throw new ApiError(409, { detail: attempt.state === "graded" ? "attempt already fully graded" : "attempt still in progress" });
      const quiz = quizForActivity(attempt.activity_id);
      const q = quiz.questions.find((x) => x.id === Number(body.question_id) && x.type === "essay");
      if (!q) throw new ApiError(404, { detail: "no such essay question" });
      const points = Number(body.points);
      if (!(points >= 0 && points <= q.points))
        throw new ApiError(400, { detail: `points must be 0–${q.points}` });
      attempt.essay_scores[q.id] = points;
      const essays = quiz.questions.filter((x) => x.type === "essay");
      if (essays.every((x) => attempt.essay_scores[x.id] != null)) {
        attempt.total =
          attempt.auto_score + essays.reduce((sum, x) => sum + attempt.essay_scores[x.id], 0);
        attempt.state = "graded";
      }
      return attempt;
    },
  },

  // == teacher: create activities (editing teacher only) ==================
  {
    method: "POST",
    pattern: /^\/api\/lms\/courses\/(\d+)\/activities$/,
    handler: (m, body) => {
      const course = courseById(Number(m[1]));
      if (!course) throw new ApiError(404, { detail: "course not found" });
      const actorId = Number(body.actor_id);
      const t = teacherRoleAt(actorId, course.id);
      if (!isAdmin(actorId) && !t.editing)
        throw new ApiError(403, {
          reasons: [
            t.nonEditing
              ? "non-editing teachers may grade but not add or edit activities (that's the whole point of the role)"
              : "you do not teach this course",
          ],
        });
      if (!body.name) throw new ApiError(400, { detail: "name is required" });
      const type = body.activity_type;
      if (!["assign", "quiz"].includes(type))
        throw new ApiError(400, { detail: "activity_type must be assign or quiz" });
      const activity = {
        id: nextId(ACTIVITIES),
        course_id: course.id,
        name: body.name,
        activity_type: type,
        group_mode: null,
        grouping_id: null,
        visible: true,
        completion_enabled: false,
      };
      ACTIVITIES.push(activity);
      const courseCtx = contextForCourse(course.id);
      CONTEXTS.push({
        id: Math.max(...CONTEXTS.map((c) => c.id)) + 1,
        level: "activity",
        instance_id: activity.id,
        label: `activity:${activity.name}`,
        path: `${courseCtx.path}/${Math.max(...CONTEXTS.map((c) => c.id)) + 1}`,
      });
      if (type === "quiz") {
        const questions = (body.questions ?? []).map((q, i) => ({
          id: i + 1,
          type: q.type,
          text: q.text,
          points: Number(q.points) || 1,
          options: q.type === "multichoice" ? q.options ?? [] : undefined,
          answer: q.type === "essay" ? null : q.answer,
        }));
        if (!questions.length)
          throw new ApiError(400, { detail: "a quiz needs at least one question" });
        QUIZZES.push({
          activity_id: activity.id,
          attempts_allowed: Number(body.attempts_allowed) || 1,
          grade_to_pass: Number(body.grade_to_pass) || 0,
          questions,
        });
      }
      return activity;
    },
  },

  // == course creation: the Moodle answer, embodied =======================
  {
    method: "POST",
    pattern: /^\/api\/lms\/courses$/,
    handler: (m, body) => {
      const actorId = Number(body.actor_id);
      if (!isAdmin(actorId))
        throw new ApiError(403, {
          reasons: [
            "teachers cannot create courses in Moodle — moodle/course:create belongs to Manager and Course creator at category level by default",
            "you can request a course instead (moodle/course:request); approval makes you its teacher",
          ],
        });
      if (!body.full_name || !body.short_name)
        throw new ApiError(400, { detail: "full_name and short_name are required" });
      if (COURSES.some((c) => c.short_name === body.short_name))
        throw new ApiError(409, { detail: `short name '${body.short_name}' already exists` });
      const course = {
        id: nextId(COURSES),
        short_name: body.short_name,
        full_name: body.full_name,
        visible: true,
        group_mode: "none",
        force_group_mode: false,
        deleted: false,
      };
      COURSES.push(course);
      const ctxId = Math.max(...CONTEXTS.map((c) => c.id)) + 1;
      CONTEXTS.push({ id: ctxId, level: "course", instance_id: course.id, label: `course:${course.short_name}`, path: `/1/${ctxId}` });
      METHODS.push({ id: nextId(METHODS), course_id: course.id, method: "manual", status: "enabled", default_role_id: 4, cohort_id: null, config: {} });
      return course;
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/course-requests$/,
    handler: (m, body) => {
      if (!body.full_name || !body.short_name)
        throw new ApiError(400, { detail: "full_name and short_name are required" });
      const row = {
        id: nextId(COURSE_REQUESTS),
        requester_id: Number(body.actor_id),
        full_name: body.full_name,
        short_name: body.short_name,
        reason: body.reason ?? "",
        status: "pending",
        decided_by: null,
      };
      COURSE_REQUESTS.push(row);
      return row;
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/lms\/course-requests$/,
    handler: (m, body, query) =>
      COURSE_REQUESTS.map((r) => ({ ...r, requester: userById(r.requester_id) })).filter(
        (r) => isAdmin(Number(query.actor_id)) || r.requester_id === Number(query.actor_id),
      ),
  },
  {
    method: "POST",
    pattern: /^\/api\/lms\/course-requests\/(\d+)\/(approve|reject)$/,
    handler: (m, body) => {
      const req = COURSE_REQUESTS.find((r) => r.id === Number(m[1]));
      if (!req) throw new ApiError(404, { detail: "request not found" });
      const actorId = Number(body.actor_id);
      if (!isAdmin(actorId))
        throw new ApiError(403, { reasons: ["only a manager may decide course requests"] });
      if (req.status !== "pending") throw new ApiError(409, { detail: `request already ${req.status}` });
      req.decided_by = actorId;
      if (m[2] === "reject") {
        req.status = "rejected";
        return req;
      }
      const course = {
        id: nextId(COURSES),
        short_name: req.short_name,
        full_name: req.full_name,
        visible: true,
        group_mode: "none",
        force_group_mode: false,
        deleted: false,
      };
      COURSES.push(course);
      const ctxId = Math.max(...CONTEXTS.map((c) => c.id)) + 1;
      CONTEXTS.push({ id: ctxId, level: "course", instance_id: course.id, label: `course:${course.short_name}`, path: `/1/${ctxId}` });
      METHODS.push({ id: nextId(METHODS), course_id: course.id, method: "manual", status: "enabled", default_role_id: 4, cohort_id: null, config: {} });
      // Moodle-faithful: approving a course request makes the requester its teacher.
      ROLE_ASSIGNMENTS.push({ id: nextId(ROLE_ASSIGNMENTS), user_id: req.requester_id, role_id: 2, context_id: ctxId, component: "", item_id: 0 });
      req.status = "approved";
      return { ...req, course };
    },
  },
];
