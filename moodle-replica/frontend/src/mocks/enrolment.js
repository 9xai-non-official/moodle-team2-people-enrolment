// Enrolment mocks (task 06 §4.2). STATEFUL: handlers mutate the seed arrays in
// place so demo flows survive refetches — deleting cohort method 43 really
// drops its enrolments + role rows (HC-1), self-enrol really appends a row.
// Every response is derived from seed.js; never invent parallel fixtures.
import { ApiError } from "../errors";
import {
  METHODS,
  ENROLMENTS,
  COHORTS,
  ROLE_ASSIGNMENTS,
  LAST_ACCESS,
  userById,
  courseById,
  roleById,
  contextForCourse,
  groupsOfUser,
  pathLive,
  effectiveStatus,
} from "./seed";

const cohortById = (id) => COHORTS.find((c) => c.id === id) || null;
const nextEnrolmentId = () => Math.max(0, ...ENROLMENTS.map((e) => e.id)) + 1;
const nextAssignmentId = () =>
  Math.max(0, ...ROLE_ASSIGNMENTS.map((r) => r.id)) + 1;
const nextMethodId = () => Math.max(0, ...METHODS.map((m) => m.id)) + 1;
const nextCohortId = () => Math.max(0, ...COHORTS.map((c) => c.id)) + 1;

// short_names of a user's role assignments at the course context (deduped).
const rolesOfUserAtCourse = (userId, courseId) => {
  const ctx = contextForCourse(courseId);
  const shorts = ROLE_ASSIGNMENTS.filter(
    (ra) => ctx && ra.user_id === userId && ra.context_id === ctx.id,
  )
    .map((ra) => roleById(ra.role_id)?.short_name)
    .filter(Boolean);
  return [...new Set(shorts)];
};

// (enrolment, method) pairs for one user restricted to one course.
const pathsOfUserInCourse = (userId, courseId) =>
  ENROLMENTS.filter((e) => e.user_id === userId)
    .map((e) => ({ e, m: METHODS.find((m) => m.id === e.method_id) }))
    .filter(({ m }) => m && m.course_id === courseId);

const enrolledUserIds = (courseId) => [
  ...new Set(
    ENROLMENTS.map((e) => ({ e, m: METHODS.find((m) => m.id === e.method_id) }))
      .filter(({ m }) => m && m.course_id === courseId)
      .map(({ e }) => e.user_id),
  ),
];

const buildParticipant = (userId, courseId) => {
  const user = userById(userId);
  const paths = pathsOfUserInCourse(userId, courseId).map(({ e, m }) => ({
    enrolment_id: e.id,
    method_id: m.id,
    method: m.method,
    method_status: m.status,
    status: e.status,
    time_start: e.time_start,
    time_end: e.time_end,
  }));
  const la = LAST_ACCESS.find(
    (a) => a.user_id === userId && a.course_id === courseId,
  );
  return {
    user_id: userId,
    full_name: user?.full_name,
    username: user?.username,
    roles: rolesOfUserAtCourse(userId, courseId),
    paths,
    effective_status: effectiveStatus(userId, courseId),
    groups: groupsOfUser(userId, courseId).map((g) => ({ id: g.id, name: g.name })),
    last_access: la ? la.accessed_at : null,
  };
};

const mapMethod = (mm) => {
  const r = roleById(mm.default_role_id);
  const c = mm.cohort_id ? cohortById(mm.cohort_id) : null;
  return {
    id: mm.id,
    method: mm.method,
    status: mm.status,
    default_role: r ? { id: r.id, short_name: r.short_name } : null,
    cohort: c ? { id: c.id, name: c.name } : null,
    config: mm.config,
    enrolled_count: ENROLMENTS.filter((e) => e.method_id === mm.id).length,
  };
};

export const routes = [
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/courses\/(\d+)\/participants$/,
    handler: (m, body, query) => {
      const courseId = Number(m[1]);
      const status = query.status || "active";
      const rows = enrolledUserIds(courseId).map((id) =>
        buildParticipant(id, courseId),
      );
      // Filter on enrolment status (Moodle's Active/Suspended), NOT effective:
      // an expired or account-suspended user still has an active user_enrolment
      // and stays on the "active" roster (C-6).
      if (status === "active")
        return rows.filter((r) => r.paths.some((p) => p.status === "active"));
      if (status === "suspended")
        return rows.filter((r) => !r.paths.some((p) => p.status === "active"));
      return rows;
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/courses\/(\d+)\/other-users$/,
    handler: (m) => {
      const courseId = Number(m[1]);
      const ctx = contextForCourse(courseId);
      const enrolled = new Set(enrolledUserIds(courseId));
      const ids = [
        ...new Set(
          ROLE_ASSIGNMENTS.filter((ra) => ctx && ra.context_id === ctx.id).map(
            (ra) => ra.user_id,
          ),
        ),
      ].filter((id) => !enrolled.has(id));
      return ids.map((id) => ({
        user_id: id,
        full_name: userById(id)?.full_name,
        roles: rolesOfUserAtCourse(id, courseId),
        note: "Has a role at course level but no enrolment.",
      }));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/courses\/(\d+)\/methods$/,
    handler: (m) => {
      const courseId = Number(m[1]);
      return METHODS.filter((mm) => mm.course_id === courseId).map(mapMethod);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/enrolment\/courses\/(\d+)\/methods$/,
    handler: (m, body) => {
      const courseId = Number(m[1]);
      const b = body || {};
      if (b.method === "cohort" && !b.cohort_id)
        throw new ApiError(422, {
          detail: "cohort_id required for cohort method",
        });
      const created = {
        id: nextMethodId(),
        course_id: courseId,
        method: b.method,
        status: b.status || "enabled",
        default_role_id: b.default_role_id ?? null,
        cohort_id: b.method === "cohort" ? b.cohort_id : null,
        config: b.config || {},
      };
      METHODS.push(created);
      return mapMethod(created);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/guest-preview\/(\d+)$/,
    handler: (m) => {
      const courseId = Number(m[1]);
      const guest = METHODS.find(
        (mm) => mm.course_id === courseId && mm.method === "guest",
      );
      if (!guest)
        return {
          guest_access: false,
          method_id: null,
          has_password: false,
          reason: "no guest method instance in this course",
        };
      return {
        guest_access: guest.status === "enabled",
        method_id: guest.id,
        has_password: !!guest.config?.password,
        reason:
          guest.status === "enabled" ? null : "guest method instance is disabled",
      };
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/enrolment\/methods\/(\d+)$/,
    handler: (m, body) => {
      const method = METHODS.find((mm) => mm.id === Number(m[1]));
      if (!method) throw new ApiError(404, { detail: "method not found" });
      if (body?.status) method.status = body.status;
      return mapMethod(method);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/enrolment\/methods\/(\d+)\/sync$/,
    handler: (m) => {
      const method = METHODS.find((mm) => mm.id === Number(m[1]));
      if (!method || method.method !== "cohort" || !method.cohort_id)
        throw new ApiError(409, {
          detail: "not a cohort method",
          reasons: ["Sync is only available on cohort enrolment methods."],
        });
      const cohort = cohortById(method.cohort_id);
      const target = new Set(cohort ? cohort.member_ids : []);
      const current = ENROLMENTS.filter((e) => e.method_id === method.id);
      const currentIds = new Set(current.map((e) => e.user_id));
      const kept = [];
      const removed = [];
      for (const e of current)
        (target.has(e.user_id) ? kept : removed).push(e.user_id);
      for (const uid of removed) {
        const i = ENROLMENTS.findIndex(
          (e) => e.method_id === method.id && e.user_id === uid,
        );
        if (i >= 0) ENROLMENTS.splice(i, 1);
      }
      const added = [];
      for (const uid of target) {
        if (currentIds.has(uid)) continue;
        added.push(uid);
        ENROLMENTS.push({
          id: nextEnrolmentId(),
          method_id: method.id,
          user_id: uid,
          status: "active",
          time_start: null,
          time_end: null,
        });
      }
      return { added, removed, kept };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/methods\/(\d+)\/enrolments$/,
    handler: (m) => {
      const methodId = Number(m[1]);
      return ENROLMENTS.filter((e) => e.method_id === methodId).map((e) => ({
        enrolment_id: e.id,
        user_id: e.user_id,
        full_name: userById(e.user_id)?.full_name,
        status: e.status,
        time_start: e.time_start,
        time_end: e.time_end,
      }));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/enrolment\/courses\/(\d+)\/enrol$/,
    handler: (m, body) => {
      const courseId = Number(m[1]);
      const b = body || {};
      if (!b.user_id)
        throw new ApiError(422, { detail: "user_id is required" });
      const method = b.method_id
        ? METHODS.find((mm) => mm.id === b.method_id)
        : METHODS.find(
            (mm) => mm.course_id === courseId && mm.method === "manual",
          );
      if (!method)
        throw new ApiError(409, {
          detail: "no enrolment method",
          reasons: ["This course has no matching enrolment method."],
        });
      // one row per (user, method) — refuse a duplicate path (surfaces reasons).
      if (
        ENROLMENTS.some(
          (e) => e.method_id === method.id && e.user_id === b.user_id,
        )
      )
        throw new ApiError(409, {
          detail: "already enrolled",
          reasons: [
            `${userById(b.user_id)?.full_name} already has an enrolment via the ${method.method} method.`,
          ],
        });
      ENROLMENTS.push({
        id: nextEnrolmentId(),
        method_id: method.id,
        user_id: b.user_id,
        status: "active",
        time_start: b.time_start || null,
        time_end: b.time_end || null,
      });
      // assign the chosen role at course context so the Roles column populates.
      const ctx = contextForCourse(courseId);
      const roleId = b.role_id || method.default_role_id;
      if (
        ctx &&
        !ROLE_ASSIGNMENTS.some(
          (ra) =>
            ra.user_id === b.user_id &&
            ra.context_id === ctx.id &&
            ra.role_id === roleId,
        )
      )
        ROLE_ASSIGNMENTS.push({
          id: nextAssignmentId(),
          user_id: b.user_id,
          role_id: roleId,
          context_id: ctx.id,
          component: "",
          item_id: method.id,
        });
      return buildParticipant(b.user_id, courseId);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/enrolment\/enrolments\/(\d+)$/,
    handler: (m, body) => {
      const e = ENROLMENTS.find((x) => x.id === Number(m[1]));
      if (!e) throw new ApiError(404, { detail: "enrolment not found" });
      if (body?.status) e.status = body.status;
      return {
        enrolment_id: e.id,
        user_id: e.user_id,
        full_name: userById(e.user_id)?.full_name,
        status: e.status,
        time_start: e.time_start,
        time_end: e.time_end,
      };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/enrolment\/enrolments\/(\d+)$/,
    handler: (m) => {
      const i = ENROLMENTS.findIndex((x) => x.id === Number(m[1]));
      if (i >= 0) ENROLMENTS.splice(i, 1);
      return null; // 204
    },
  },
  {
    // Per-path unenrol, Yaman's canonical form (HC-2 stepper uses it).
    // Removes the enrolment row + ITS provenance role_assignment only;
    // completion rows are never touched — that IS hard case #2.
    method: "DELETE",
    pattern: /^\/api\/enrolment\/methods\/(\d+)\/enrolments\/(\d+)$/,
    handler: (m) => {
      const methodId = Number(m[1]);
      const userId = Number(m[2]);
      const i = ENROLMENTS.findIndex(
        (x) => x.method_id === methodId && x.user_id === userId,
      );
      if (i < 0)
        throw new ApiError(404, {
          detail: `user ${userId} has no enrolment via method ${methodId}`,
        });
      ENROLMENTS.splice(i, 1);
      for (let r = ROLE_ASSIGNMENTS.length - 1; r >= 0; r--) {
        const ra = ROLE_ASSIGNMENTS[r];
        if (ra.user_id === userId && ra.item_id === methodId) {
          ROLE_ASSIGNMENTS.splice(r, 1);
        }
      }
      return null; // 204
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/enrolment\/methods\/(\d+)$/,
    handler: (m) => {
      const methodId = Number(m[1]);
      const i = METHODS.findIndex((mm) => mm.id === methodId);
      if (i >= 0) METHODS.splice(i, 1);
      // HC-1: removing the method removes ONLY this path's enrolments and the
      // component-owned (enrol_cohort/enrol_self) role rows it created — the
      // user's other paths (e.g. salma's manual row) survive.
      for (let j = ENROLMENTS.length - 1; j >= 0; j--)
        if (ENROLMENTS[j].method_id === methodId) ENROLMENTS.splice(j, 1);
      for (let j = ROLE_ASSIGNMENTS.length - 1; j >= 0; j--)
        if (
          ROLE_ASSIGNMENTS[j].item_id === methodId &&
          ROLE_ASSIGNMENTS[j].component !== ""
        )
          ROLE_ASSIGNMENTS.splice(j, 1);
      return null; // 204
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/enrolment\/self\/(\d+)$/,
    handler: (m, body) => {
      const courseId = Number(m[1]);
      const b = body || {};
      const method = METHODS.find(
        (mm) => mm.course_id === courseId && mm.method === "self",
      );
      const alreadyEnrolled = ENROLMENTS.some(
        (e) =>
          e.user_id === b.user_id &&
          METHODS.find((mm) => mm.id === e.method_id)?.course_id === courseId,
      );
      const keyMatches = !!method && (method.config.key || "") === (b.key || "");
      // Evaluate ALL gates (no stop-at-first-fail); enrolled = every gate passed.
      const gates = [
        {
          gate: "method_enabled",
          passed: !!method && method.status === "enabled",
          reason: !method
            ? "No self-enrolment method on this course."
            : method.status === "enabled"
              ? "Self enrolment is enabled."
              : "Self enrolment method is disabled.",
        },
        { gate: "window_open", passed: true, reason: "Enrolment period is open." },
        {
          gate: "key_match",
          passed: keyMatches,
          reason: !method
            ? "No method to match a key against."
            : keyMatches
              ? "Enrolment key matches."
              : "Enrolment key does not match.",
        },
        {
          gate: "not_already_enrolled",
          passed: !alreadyEnrolled,
          reason: alreadyEnrolled
            ? "User is already enrolled in this course."
            : "User is not yet enrolled.",
        },
        { gate: "capacity", passed: true, reason: "Capacity available." },
      ];
      const enrolled = gates.every((g) => g.passed);
      const blocking_reasons = gates
        .filter((g) => !g.passed)
        .map((g) => g.reason);
      if (enrolled && method) {
        ENROLMENTS.push({
          id: nextEnrolmentId(),
          method_id: method.id,
          user_id: b.user_id,
          status: "active",
          time_start: null,
          time_end: null,
        });
        const ctx = contextForCourse(courseId);
        if (ctx)
          ROLE_ASSIGNMENTS.push({
            id: nextAssignmentId(),
            user_id: b.user_id,
            role_id: method.default_role_id,
            context_id: ctx.id,
            component: "enrol_self",
            item_id: method.id,
          });
      }
      return { enrolled, gates, blocking_reasons };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/users\/(\d+)\/enrolments$/,
    handler: (m) => {
      const userId = Number(m[1]);
      const user = userById(userId);
      return ENROLMENTS.filter((e) => e.user_id === userId).map((e) => {
        const method = METHODS.find((mm) => mm.id === e.method_id);
        const course = method ? courseById(method.course_id) : null;
        return {
          course: course
            ? {
                id: course.id,
                short_name: course.short_name,
                deleted: course.deleted,
              }
            : null,
          enrolment_id: e.id,
          method_id: e.method_id,
          method: method?.method,
          method_status: method?.status,
          status: e.status,
          time_start: e.time_start,
          time_end: e.time_end,
          live: method && user ? pathLive(e, method, user) : false,
        };
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/cohorts$/,
    handler: () =>
      COHORTS.map((c) => ({
        id: c.id,
        name: c.name,
        id_number: c.id_number,
        member_count: c.member_ids.length,
        synced_courses: METHODS.filter((mm) => mm.cohort_id === c.id)
          .map((mm) => courseById(mm.course_id)?.short_name)
          .filter(Boolean),
      })),
  },
  {
    method: "GET",
    pattern: /^\/api\/enrolment\/cohorts\/(\d+)\/members$/,
    handler: (m) => {
      const c = COHORTS.find((x) => x.id === Number(m[1]));
      if (!c) throw new ApiError(404, { detail: `cohort ${m[1]} not found` });
      return c.member_ids.map((id) => {
        const u = userById(id);
        return { user_id: id, username: u?.username, full_name: u?.full_name };
      });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/enrolment\/cohorts$/,
    handler: (m, body) => {
      const b = body || {};
      if (!b.name) throw new ApiError(422, { detail: "name is required" });
      const created = {
        id: nextCohortId(),
        name: b.name,
        id_number: b.id_number || null,
        member_ids: [],
      };
      COHORTS.push(created);
      return {
        id: created.id,
        name: created.name,
        id_number: created.id_number,
        member_count: 0,
        synced_courses: [],
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/enrolment\/cohorts\/(\d+)\/members$/,
    handler: (m, body) => {
      const cohort = cohortById(Number(m[1]));
      if (!cohort) throw new ApiError(404, { detail: `cohort ${m[1]} not found` });
      const b = body || {};
      if (!b.user_id) throw new ApiError(422, { detail: "user_id is required" });
      if (!cohort.member_ids.includes(b.user_id))
        cohort.member_ids.push(b.user_id);
      // Cohort sync side effect: enrol the user into every course whose cohort
      // method points here, adding the enrol_cohort provenance role row — this
      // is how salma gets her HC-1 second path.
      const synced = [];
      for (const method of METHODS.filter((mm) => mm.cohort_id === cohort.id)) {
        if (
          !ENROLMENTS.some(
            (e) => e.method_id === method.id && e.user_id === b.user_id,
          )
        )
          ENROLMENTS.push({
            id: nextEnrolmentId(),
            method_id: method.id,
            user_id: b.user_id,
            status: "active",
            time_start: null,
            time_end: null,
          });
        const ctx = contextForCourse(method.course_id);
        if (
          ctx &&
          !ROLE_ASSIGNMENTS.some(
            (ra) =>
              ra.user_id === b.user_id &&
              ra.context_id === ctx.id &&
              ra.component === "enrol_cohort" &&
              ra.item_id === method.id,
          )
        )
          ROLE_ASSIGNMENTS.push({
            id: nextAssignmentId(),
            user_id: b.user_id,
            role_id: method.default_role_id,
            context_id: ctx.id,
            component: "enrol_cohort",
            item_id: method.id,
          });
        const short = courseById(method.course_id)?.short_name;
        if (short && !synced.includes(short)) synced.push(short);
      }
      return { added: [b.user_id], synced_courses: synced };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/enrolment\/cohorts\/(\d+)\/members\/(\d+)$/,
    handler: (m) => {
      const cohort = cohortById(Number(m[1]));
      if (!cohort) throw new ApiError(404, { detail: `cohort ${m[1]} not found` });
      const userId = Number(m[2]);
      const i = cohort.member_ids.indexOf(userId);
      if (i >= 0) cohort.member_ids.splice(i, 1);
      // Policy UNENROL: drop this user's enrolments + enrol_cohort role rows for
      // every cohort method pointing here — mirrors the DELETE method handler,
      // and leaves any other path (e.g. salma's manual row) untouched (HC-1).
      const methodIds = new Set(
        METHODS.filter((mm) => mm.cohort_id === cohort.id).map((mm) => mm.id),
      );
      for (let j = ENROLMENTS.length - 1; j >= 0; j--)
        if (
          methodIds.has(ENROLMENTS[j].method_id) &&
          ENROLMENTS[j].user_id === userId
        )
          ENROLMENTS.splice(j, 1);
      for (let j = ROLE_ASSIGNMENTS.length - 1; j >= 0; j--)
        if (
          ROLE_ASSIGNMENTS[j].component === "enrol_cohort" &&
          methodIds.has(ROLE_ASSIGNMENTS[j].item_id) &&
          ROLE_ASSIGNMENTS[j].user_id === userId
        )
          ROLE_ASSIGNMENTS.splice(j, 1);
      return null; // 204
    },
  },
];
