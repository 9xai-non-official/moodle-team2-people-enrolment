// Progress domain mock (task 06 §4.5). Stateful: handlers mutate the seed
// arrays so ticks / overrides / criteria edits persist across a demo session.
// Delete this file when the backend lands — nothing else changes (§8).
import { ApiError } from "../errors";
import {
  ACTIVITIES,
  ACTIVITY_COMPLETIONS,
  COURSE_CRITERIA,
  COURSE_COMPLETIONS,
  SNAPSHOTS,
  GROUP_MEMBERS,
  ROLE_ASSIGNMENTS,
  ROLE_CAPABILITIES,
  userById,
  courseById,
  roleById,
  contextById,
  contextForCourse,
} from "./seed";

// ---- capability resolver (completion:override) ---------------------------
// Tiny Moodle-faithful resolve: walk the context path system→course, deepest
// definition wins per role, prohibit is sticky, then aggregate across roles.
function contextPathIds(contextId) {
  const ctx = contextById(contextId);
  return ctx ? ctx.path.split("/").filter(Boolean).map(Number) : [];
}

function resolveOverride(actorId, courseId) {
  const courseCtx = contextForCourse(courseId);
  if (!courseCtx) return { allow: false, reason: "no course context for this course" };
  const pathIds = contextPathIds(courseCtx.id); // e.g. [1, 10]
  const assignments = ROLE_ASSIGNMENTS.filter(
    (a) => a.user_id === actorId && pathIds.includes(a.context_id),
  ).sort((a, b) => pathIds.indexOf(b.context_id) - pathIds.indexOf(a.context_id));
  const roleIds = [...new Set(assignments.map((a) => a.role_id))];

  const roleValue = (roleId) => {
    let value = "notset";
    let depth = -1;
    for (const rc of ROLE_CAPABILITIES) {
      if (rc.role_id !== roleId || rc.capability !== "completion:override") continue;
      const d = pathIds.indexOf(rc.context_id);
      if (d >= depth) {
        depth = d;
        value = rc.permission;
      }
    }
    return value;
  };

  const values = roleIds.map(roleValue);
  let permission = "notset";
  if (values.includes("prohibit")) permission = "prohibit";
  else if (values.includes("allow")) permission = "allow";
  else if (values.includes("prevent")) permission = "prevent";

  const roleShort = assignments.length
    ? roleById(assignments[0].role_id)?.short_name ?? "?"
    : "(no role)";
  if (permission === "allow") return { allow: true, reason: null };
  const why =
    permission === "prohibit"
      ? "prohibited, cannot be overridden"
      : permission === "prevent"
        ? "prevented at this context"
        : "no allow on the path";
  return {
    allow: false,
    reason: `completion:override → ${permission} for role '${roleShort}' (${why})`,
  };
}

// ---- cell helpers --------------------------------------------------------
function joinCell(userId, activityId) {
  const raw = ACTIVITY_COMPLETIONS.find(
    (c) => c.user_id === userId && c.activity_id === activityId,
  );
  const ob = raw && raw.overridden_by ? userById(raw.overridden_by) : null;
  return {
    activity_id: activityId,
    state: raw ? raw.state : "incomplete",
    overridden_by: ob ? { id: ob.id, full_name: ob.full_name } : null,
    viewed: raw ? raw.viewed : false,
  };
}

function upsertCell(userId, activityId) {
  let cell = ACTIVITY_COMPLETIONS.find(
    (c) => c.user_id === userId && c.activity_id === activityId,
  );
  if (!cell) {
    cell = { activity_id: activityId, user_id: userId, state: "incomplete", overridden_by: null, viewed: false };
    ACTIVITY_COMPLETIONS.push(cell);
  }
  return cell;
}

// ---- percent (dashboard %) -----------------------------------------------
// Moodle's contradiction, on purpose: hidden activities are EXCLUDED from the
// dashboard % denominator but still shown in the report and can still block
// course completion. So a student can read 100% on the bar yet not be
// course-complete (ALL aggregation still counts the hidden criterion).
function isSatisfied(userId, courseId, item) {
  if (item.kind === "activity") {
    const cell = ACTIVITY_COMPLETIONS.find(
      (c) => c.user_id === userId && c.activity_id === item.activity_id,
    );
    if (!cell) return false;
    if (/pass/i.test(item.label)) return cell.state === "complete_pass"; // "Pass Quiz 1"
    return cell.state === "complete" || cell.state === "complete_pass";
  }
  if (item.kind === "self") {
    const cc = COURSE_COMPLETIONS.find((c) => c.user_id === userId && c.course_id === courseId);
    return !!(cc && cc.time_completed);
  }
  return false; // date / grade: no source data seeded — demo-add only
}

function percentFor(userId, courseId) {
  const crit = COURSE_CRITERIA[courseId];
  if (!crit) return { percent: null, counted: 0, total: 0, excluded: 0 };
  let excluded = 0;
  let counted = 0;
  for (const item of crit.items) {
    const act = item.activity_id ? ACTIVITIES.find((a) => a.id === item.activity_id) : null;
    if (act && !act.visible) {
      excluded += 1; // hidden → out of the dashboard % entirely
      continue;
    }
    if (isSatisfied(userId, courseId, item)) counted += 1;
  }
  const total = crit.items.length;
  const denom = total - excluded;
  const percent = denom > 0 ? Math.round((100 * counted) / denom) : null;
  return { percent, counted, total, excluded };
}

function criteriaLabel(kind, activity, threshold) {
  if (kind === "activity") return `Complete ${activity ? activity.name : "activity"}`;
  if (kind === "self") return "Self completion";
  if (kind === "date") return "Reach completion date";
  if (kind === "grade") return `Achieve grade ≥ ${threshold ?? "?"}`;
  return kind;
}

export const routes = [
  {
    method: "GET",
    pattern: /^\/api\/progress\/courses\/(\d+)\/report$/,
    handler: (m, body, query) => {
      const courseId = Number(m[1]);
      const actorId = query.actor_id ? Number(query.actor_id) : null;
      const groupId = query.group_id ? Number(query.group_id) : null;
      const acts = ACTIVITIES.filter((a) => a.course_id === courseId && a.completion_enabled);
      let userIds = COURSE_COMPLETIONS.filter((c) => c.course_id === courseId).map((c) => c.user_id);
      if (groupId) {
        const inGroup = new Set(
          GROUP_MEMBERS.filter((gm) => gm.group_id === groupId).map((gm) => gm.user_id),
        );
        userIds = userIds.filter((uid) => inGroup.has(uid));
      }
      const rows = userIds.map((uid) => {
        const u = userById(uid);
        const cc = COURSE_COMPLETIONS.find((c) => c.user_id === uid && c.course_id === courseId);
        return {
          user_id: uid,
          full_name: u ? u.full_name : `user ${uid}`,
          cells: acts.map((a) => joinCell(uid, a.id)),
          course_complete: { done: !!(cc && cc.time_completed), at: cc ? cc.time_completed : null },
        };
      });
      const ov = resolveOverride(actorId, courseId);
      return {
        activities: acts.map((a) => ({
          id: a.id,
          name: a.name,
          hidden: !a.visible,
          completion_enabled: a.completion_enabled,
        })),
        rows,
        can_override: ov.allow, // added-for-mock: capability decided server-side
        cannot_override_reason: ov.reason, // added-for-mock: honest tooltip text
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/progress\/users\/(\d+)\/overview$/,
    handler: (m) => {
      const userId = Number(m[1]);
      const liveIds = COURSE_COMPLETIONS.filter((c) => c.user_id === userId).map((c) => c.course_id);
      const rows = liveIds.map((courseId) => {
        const c = courseById(courseId);
        const crit = COURSE_CRITERIA[courseId];
        const cc = COURSE_COMPLETIONS.find((x) => x.user_id === userId && x.course_id === courseId);
        const p = percentFor(userId, courseId);
        return {
          course: { id: courseId, short_name: c ? c.short_name : `#${courseId}`, deleted: c ? c.deleted : false },
          percent: p.percent,
          counted: p.counted,
          total: p.total,
          excluded: p.excluded,
          completed_at: cc ? cc.time_completed : null,
          has_self_criterion: !!(crit && crit.items.some((i) => i.kind === "self")), // added-for-mock
        };
      });
      // Deleted courses live on only in snapshots (HC-5): fold in any snapshot
      // course the user has no live completion row for.
      const liveSet = new Set(liveIds);
      const snapIds = [...new Set(SNAPSHOTS.filter((s) => s.user_id === userId).map((s) => s.course_id))].filter(
        (cid) => !liveSet.has(cid),
      );
      for (const cid of snapIds) {
        const latest = SNAPSHOTS.filter((s) => s.user_id === userId && s.course_id === cid).sort((a, b) =>
          a.taken_at < b.taken_at ? 1 : -1,
        )[0];
        const c = courseById(cid);
        rows.push({
          course: { id: cid, short_name: c ? c.short_name : latest.course_short_name, deleted: true },
          percent: latest.percent,
          counted: 0,
          total: 0,
          excluded: 0,
          completed_at: null,
          has_self_criterion: false,
        });
      }
      return rows;
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/progress\/courses\/(\d+)\/criteria$/,
    handler: (m) => {
      const crit = COURSE_CRITERIA[Number(m[1])];
      if (!crit) return { aggregation: "all", items: [] };
      return { aggregation: crit.aggregation, items: crit.items.map((i) => ({ ...i })) };
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/progress\/courses\/(\d+)\/criteria$/,
    handler: (m, body) => {
      const courseId = Number(m[1]);
      if (!COURSE_CRITERIA[courseId]) COURSE_CRITERIA[courseId] = { aggregation: "all", items: [] };
      const crit = COURSE_CRITERIA[courseId];
      if (body.kind) {
        const activity = body.activity_id ? ACTIVITIES.find((a) => a.id === Number(body.activity_id)) : null;
        const nextId = crit.items.reduce((mx, i) => Math.max(mx, i.id), 70) + 1;
        crit.items.push({
          id: nextId,
          kind: body.kind,
          activity_id: activity ? activity.id : null,
          label: criteriaLabel(body.kind, activity, body.threshold),
          ...(body.threshold != null ? { threshold: Number(body.threshold) } : {}),
        });
      } else if (body.aggregation) {
        crit.aggregation = body.aggregation === "any" ? "any" : "all";
      }
      return { aggregation: crit.aggregation, items: crit.items.map((i) => ({ ...i })) };
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/progress\/activities\/(\d+)\/view$/,
    handler: (m, body) => {
      const cell = upsertCell(body.user_id, Number(m[1]));
      cell.viewed = true;
      return joinCell(body.user_id, cell.activity_id);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/progress\/activities\/(\d+)\/toggle$/,
    handler: (m, body) => {
      const cell = upsertCell(body.user_id, Number(m[1]));
      cell.state = cell.state === "incomplete" ? "complete" : "incomplete";
      return joinCell(body.user_id, cell.activity_id);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/progress\/activities\/(\d+)\/override$/,
    handler: (m, body) => {
      const activityId = Number(m[1]);
      const activity = ACTIVITIES.find((a) => a.id === activityId);
      const ov = resolveOverride(body.actor_id, activity ? activity.course_id : null);
      if (!ov.allow) throw new ApiError(403, { reasons: [ov.reason] });
      const cell = upsertCell(body.user_id, activityId);
      cell.state = body.state;
      cell.overridden_by = body.actor_id;
      return joinCell(body.user_id, activityId);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/progress\/courses\/(\d+)\/self-complete$/,
    handler: (m, body) => {
      const courseId = Number(m[1]);
      const crit = COURSE_CRITERIA[courseId];
      if (!crit || !crit.items.some((i) => i.kind === "self")) {
        throw new ApiError(403, {
          reasons: ["Self-completion is not available: this course has no self-completion criterion."],
        });
      }
      let cc = COURSE_COMPLETIONS.find((c) => c.user_id === body.user_id && c.course_id === courseId);
      if (!cc) {
        cc = { user_id: body.user_id, course_id: courseId, time_enrolled: null, time_started: null, time_completed: null };
        COURSE_COMPLETIONS.push(cc);
      }
      cc.time_completed = "2026-07-21";
      return { done: true };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/progress\/snapshots$/,
    handler: (m, body, query) => {
      const userId = query.user_id ? Number(query.user_id) : null;
      const courseId = query.course_id ? Number(query.course_id) : null;
      const from = query.from || null;
      const to = query.to || null;
      return SNAPSHOTS.filter((s) => userId == null || s.user_id === userId)
        .filter((s) => courseId == null || s.course_id === courseId)
        .filter((s) => !from || s.taken_at >= from)
        .filter((s) => !to || s.taken_at <= to)
        .sort((a, b) => (a.taken_at < b.taken_at ? -1 : 1))
        .map((s) => {
          const c = courseById(s.course_id);
          return {
            id: s.id,
            user_id: s.user_id,
            course: c
              ? { id: c.id, short_name: c.short_name, deleted: c.deleted }
              : { id: s.course_id, short_name: s.course_short_name, deleted: true },
            percent: s.percent,
            taken_at: s.taken_at,
            note: s.note,
            source: "snapshot",
          };
        });
    },
  },
];
