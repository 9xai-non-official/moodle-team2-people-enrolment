// Groups domain mocks (task 06 §4.4). Handlers mutate the seed arrays in place
// so the demo's add/remove flows are stateful. Delete this file when the real
// /api/groups endpoints land — nothing else changes (task 06 §8).
import { ApiError } from "../errors";
import {
  GROUPS,
  GROUP_MEMBERS,
  GROUPINGS,
  ACTIVITIES,
  ROLE_ASSIGNMENTS,
  ROLE_CAPABILITIES,
  userById,
  courseById,
  contextForCourse,
  groupsOfUser,
  effectiveStatus,
} from "./seed";

// Effective group mode: a course that forces its mode silently overrides every
// per-activity setting (rule GRP-012). Single source so policy + access-check agree.
const effectiveMode = (activity, course) =>
  course.force_group_mode ? course.group_mode : (activity.group_mode ?? course.group_mode);

// site:accessallgroups for one actor at a course context: walk the role
// capability sheet along the context path — deepest override wins, prohibit is
// sticky. Mirrors the resolver the roles domain uses (~15 lines).
function resolvesAccessAllGroups(actorId, course) {
  const ctx = contextForCourse(course.id);
  const pathIds = ctx.path.split("/").filter(Boolean).map(Number); // e.g. [1, 10]
  const roleIds = ROLE_ASSIGNMENTS.filter(
    (a) => a.user_id === actorId && pathIds.includes(a.context_id),
  ).map((a) => a.role_id);
  let permission = "notset";
  let depth = -1;
  for (const rc of ROLE_CAPABILITIES) {
    if (rc.capability !== "site:accessallgroups" || !roleIds.includes(rc.role_id)) continue;
    const d = pathIds.indexOf(rc.context_id);
    if (d < 0) continue;
    if (rc.permission === "prohibit") return false; // sticky — can't be re-granted deeper
    if (d >= depth) {
      depth = d;
      permission = rc.permission;
    }
  }
  return permission === "allow";
}

export const routes = [
  {
    method: "GET",
    pattern: /^\/api\/groups\/courses\/(\d+)\/groups$/,
    handler: (m) => {
      const courseId = Number(m[1]);
      return GROUPS.filter((g) => g.course_id === courseId).map((g) => ({
        id: g.id,
        name: g.name,
        enrolment_key: !!g.enrolment_key,
        participation: g.participation,
        members: GROUP_MEMBERS.filter((mm) => mm.group_id === g.id).map((mm) => ({
          user_id: mm.user_id,
          full_name: userById(mm.user_id)?.full_name ?? `user ${mm.user_id}`,
          provenance: mm.component,
          item_id: mm.item_id,
        })),
      }));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/groups\/courses\/(\d+)\/groups$/,
    handler: (m, body) => {
      const id = Math.max(0, ...GROUPS.map((g) => g.id)) + 1;
      const group = {
        id,
        course_id: Number(m[1]),
        name: body.name,
        enrolment_key: body.enrolment_key || null,
        participation: true,
      };
      GROUPS.push(group);
      return {
        id,
        name: group.name,
        enrolment_key: !!group.enrolment_key,
        participation: true,
        members: [],
      };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/groups\/(\d+)$/,
    handler: (m) => {
      const groupId = Number(m[1]);
      const idx = GROUPS.findIndex((g) => g.id === groupId);
      if (idx < 0) throw new ApiError(404, { detail: "group not found" });
      GROUPS.splice(idx, 1);
      // GRP-001: drop the group and its memberships only — never ENROLMENTS.
      for (let i = GROUP_MEMBERS.length - 1; i >= 0; i--) {
        if (GROUP_MEMBERS[i].group_id === groupId) GROUP_MEMBERS.splice(i, 1);
      }
      for (const gr of GROUPINGS) gr.group_ids = gr.group_ids.filter((gid) => gid !== groupId);
      return null; // 204
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/groups\/(\d+)\/members$/,
    handler: (m, body) => {
      const groupId = Number(m[1]);
      const group = GROUPS.find((g) => g.id === groupId);
      if (!group) throw new ApiError(404, { detail: "group not found" });
      const course = courseById(group.course_id);
      const userId = body.user_id;
      // group membership does not imply enrolment: refuse non-active participants.
      if (effectiveStatus(userId, course.id) !== "active") {
        throw new ApiError(403, {
          reasons: [
            `user is not an active participant of ${course.short_name} — enrol them first (group membership does not imply enrolment)`,
          ],
        });
      }
      // GRP-036 / R-DUP-ADD: duplicate-add is a SILENT no-op (Moodle parity),
      // not a 409 — the backend does on-conflict-do-nothing. (mock retired to
      // match real behaviour — T2-GRP-003 §7 FALSE_SIMILARITY fix.)
      if (GROUP_MEMBERS.some((mm) => mm.group_id === groupId && mm.user_id === userId)) {
        return { ok: true, group_id: groupId, user_id: userId, component: "" };
      }
      // V3: provenance is server-set; the client body carries only {user_id}.
      GROUP_MEMBERS.push({ group_id: groupId, user_id: userId, component: "", item_id: 0 });
      return { ok: true, group_id: groupId, user_id: userId, component: "" };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/groups\/(\d+)\/members\/(\d+)$/,
    handler: (m) => {
      const groupId = Number(m[1]);
      const userId = Number(m[2]);
      const idx = GROUP_MEMBERS.findIndex(
        (mm) => mm.group_id === groupId && mm.user_id === userId,
      );
      // T2-GRP-003 default-allow: a manager removes a manual OR component-owned
      // row; non-member remove is idempotent success (no machine_owned/409).
      if (idx < 0) return { ok: true, idempotent: true };
      const removed = GROUP_MEMBERS[idx].component || null;
      GROUP_MEMBERS.splice(idx, 1);
      return { ok: true, removed_component: removed };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/groups\/courses\/(\d+)\/groupings$/,
    handler: (m) => {
      const courseId = Number(m[1]);
      return GROUPINGS.filter((g) => g.course_id === courseId).map((g) => ({
        id: g.id,
        name: g.name,
        groups: g.group_ids.map((gid) => {
          const grp = GROUPS.find((x) => x.id === gid);
          return { id: gid, name: grp?.name ?? `group ${gid}` };
        }),
      }));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/groups\/courses\/(\d+)\/activity-policies$/,
    handler: (m) => {
      const courseId = Number(m[1]);
      const course = courseById(courseId);
      return ACTIVITIES.filter((a) => a.course_id === courseId).map((a) => {
        const grouping = a.grouping_id ? GROUPINGS.find((g) => g.id === a.grouping_id) : null;
        return {
          activity_id: a.id,
          name: a.name,
          configured_mode: a.group_mode, // null → UI renders "— (inherit)"
          effective_mode: effectiveMode(a, course),
          forced: course.force_group_mode,
          grouping: grouping ? { id: grouping.id, name: grouping.name } : null,
        };
      });
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/groups\/activities\/(\d+)$/,
    handler: (m, body) => {
      const activity = ACTIVITIES.find((a) => a.id === Number(m[1]));
      if (!activity) throw new ApiError(404, { detail: "activity not found" });
      const course = courseById(activity.course_id);
      // null is meaningful (inherit / no grouping); an absent key is left as-is.
      if ("group_mode" in body) activity.group_mode = body.group_mode;
      if ("grouping_id" in body) activity.grouping_id = body.grouping_id;
      const grouping = activity.grouping_id
        ? GROUPINGS.find((g) => g.id === activity.grouping_id)
        : null;
      return {
        configured_mode: activity.group_mode,
        effective_mode: effectiveMode(activity, course),
        course_mode_forced: course.force_group_mode,
        grouping: grouping ? { id: grouping.id, name: grouping.name } : null,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/groups\/activities\/(\d+)\/allowed$/,
    handler: (m, body, query) => {
      const activity = ACTIVITIES.find((a) => a.id === Number(m[1]));
      const course = courseById(activity.course_id);
      const actorId = Number(query.actor_id);
      if (resolvesAccessAllGroups(actorId, course)) {
        return {
          all_groups: true,
          groups: GROUPS.filter((g) => g.course_id === course.id).map((g) => ({
            id: g.id,
            name: g.name,
          })),
          reason: "accessallgroups: allow — sees every group",
        };
      }
      return {
        all_groups: false,
        groups: groupsOfUser(actorId, course.id).map((g) => ({ id: g.id, name: g.name })),
        reason: "restricted to own groups (accessallgroups: prevent)",
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/groups\/access-check$/,
    handler: (m, body) => {
      const activity = ACTIVITIES.find((a) => a.id === body.activity_id);
      const course = courseById(activity.course_id);
      const mode = effectiveMode(activity, course);

      // visible / none modes isolate nobody.
      if (mode !== "separate") {
        return { outcome: "allowed", reasons: [`group mode '${mode}' — no isolation`] };
      }
      // separate mode: accessallgroups sees past the walls.
      if (resolvesAccessAllGroups(body.actor_id, course)) {
        return { outcome: "allowed", reasons: ["accessallgroups: allow"] };
      }
      const actorGroups = groupsOfUser(body.actor_id, course.id);
      const targetGroups = groupsOfUser(body.target_user_id, course.id);
      const shared = actorGroups.filter((ag) => targetGroups.some((tg) => tg.id === ag.id));
      if (shared.length) {
        return { outcome: "allowed", reasons: [`shares ${shared[0].name}`] };
      }
      if (actorGroups.length === 0) {
        return {
          outcome: "denied",
          reasons: ["you belong to no group in this course; separate mode hides everyone"],
        };
      }
      // actor is grouped but shares nothing with the target → the target is invisible.
      const label = contextForCourse(course.id).label;
      const belongs = targetGroups.length
        ? `target belongs to ${targetGroups[0].name} — outside your scope`
        : "target belongs to no group you can see";
      return {
        outcome: "invisible",
        reasons: [
          "separate groups: you see only your own groups",
          belongs,
          `accessallgroups: prevent (override at ${label})`,
        ],
      };
    },
  },
];
