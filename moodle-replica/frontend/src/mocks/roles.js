// Roles / Permissions mocks (task 06 §4.3). Implements Moodle's real
// capability resolution over the shared seed: a context-tree walk with
// "deepest wins, prohibit sticky", the assignable-role matrix, and the
// four-gate permission pipeline (enrolment · role · capability · group)
// that fn_can models in the deployed schema. Stateful — POSTs mutate the
// seed arrays in place so the demo's edits persist within a session.
import { ApiError } from "../errors";
import {
  ROLES,
  CONTEXTS,
  CAPABILITIES,
  ROLE_CAPABILITIES,
  ROLE_ASSIGNMENTS,
  ACTIVITIES,
  ENROLMENTS,
  METHODS,
  userById,
  courseById,
  roleById,
  contextById,
  groupsOfUser,
  pathLive,
  effectiveStatus,
} from "./seed";

const SYSTEM_CONTEXT_ID = 1;
// Staff reach a course by role assignment, not enrolment (managers, teachers).
const STAFF_ARCHETYPES = ["manager", "editingteacher", "teacher"];

// context path "/1/10/110" → ancestor context ids [1, 10, 110] (root → leaf).
const idsInPath = (ctx) => ctx.path.split("/").filter(Boolean).map(Number);

// Resolve one capability for one role at a context: walk the path, the
// deepest row wins — but a prohibit anywhere on the path is sticky, and
// absence of any row means "notset".
function resolveCapability(roleId, capability, ctx) {
  const ancestors = idsInPath(ctx);
  const rows = ROLE_CAPABILITIES.filter(
    (r) =>
      r.role_id === roleId &&
      r.capability === capability &&
      ancestors.includes(r.context_id),
  );
  if (!rows.length)
    return { permission: "notset", is_override: false, defined_at: null };
  const prohibit = rows.find((r) => r.permission === "prohibit");
  const winner =
    prohibit ??
    rows.reduce((deep, r) =>
      ancestors.indexOf(r.context_id) > ancestors.indexOf(deep.context_id)
        ? r
        : deep,
    );
  const wctx = contextById(winner.context_id);
  return {
    permission: winner.permission,
    is_override: winner.context_id !== SYSTEM_CONTEXT_ID,
    defined_at: { context_id: wctx.id, label: wctx.label },
  };
}

// The assignable-role matrix (the "acting as a teacher shrinks the list" demo).
function assignableRoleIds(actorId, ctx) {
  const ancestors = idsInPath(ctx);
  const myRoles = ROLE_ASSIGNMENTS.filter(
    (a) => a.user_id === actorId && ancestors.includes(a.context_id),
  ).map((a) => a.role_id);
  if (myRoles.includes(1)) return [1, 2, 3, 4, 5, 6]; // manager → everything
  if (myRoles.includes(2)) return [3, 4, 5, 6]; // editingteacher
  if (myRoles.includes(3) || myRoles.includes(6)) return [4, 5]; // non-editing teacher
  return []; // student / guest / none
}

// short_name of the actor's governing role, for the refusal message.
function governingRole(actorId, ctx) {
  const ancestors = idsInPath(ctx);
  const myRoles = ROLE_ASSIGNMENTS.filter(
    (a) => a.user_id === actorId && ancestors.includes(a.context_id),
  ).map((a) => a.role_id);
  for (const id of [1, 2, 3, 6])
    if (myRoles.includes(id)) return roleById(id).short_name;
  return myRoles.length ? roleById(myRoles[0]).short_name : "none";
}

const assignmentRow = (a) => ({
  id: a.id,
  user: { id: userById(a.user_id).id, full_name: userById(a.user_id).full_name },
  role: { id: roleById(a.role_id).id, short_name: roleById(a.role_id).short_name },
  context: { id: contextById(a.context_id).id, label: contextById(a.context_id).label },
  component: a.component,
  item_id: a.item_id,
});

// ---- permission pipeline (mirrors fn_can) --------------------------------

function enrolmentGate(actorId, ctx) {
  const ancestors = idsInPath(ctx);
  const courseCtx = ancestors
    .map(contextById)
    .find((c) => c && c.level === "course");
  if (!courseCtx)
    return {
      gate: "enrolment",
      passed: true,
      evidence: ["not a course context — enrolment not required"],
    };
  const course = courseById(courseCtx.instance_id);
  if (effectiveStatus(actorId, course.id) === "active") {
    const user = userById(actorId);
    const live = ENROLMENTS.filter((e) => e.user_id === actorId)
      .map((e) => ({ e, m: METHODS.find((m) => m.id === e.method_id) }))
      .filter(({ e, m }) => m && m.course_id === course.id && pathLive(e, m, user));
    const methods = live.map(({ m }) => m.method);
    return {
      gate: "enrolment",
      passed: true,
      evidence: [
        `${live.length} active enrolment path${live.length === 1 ? "" : "s"} (${methods.join(", ")})`,
      ],
    };
  }
  const staff = ROLE_ASSIGNMENTS.find(
    (a) =>
      a.user_id === actorId &&
      ancestors.includes(a.context_id) &&
      STAFF_ARCHETYPES.includes(roleById(a.role_id)?.archetype),
  );
  if (staff) {
    const sctx = contextById(staff.context_id);
    return {
      gate: "enrolment",
      passed: true,
      evidence: [
        `no enrolment in ${course.short_name}; role '${roleById(staff.role_id).short_name}' at ${sctx.label} bypasses`,
      ],
    };
  }
  return {
    gate: "enrolment",
    passed: false,
    evidence: [`no active enrolment in ${course.short_name}`],
  };
}

function roleGate(actorId, ctx, simulateRoleId) {
  const ancestors = idsInPath(ctx);
  const assigned = ROLE_ASSIGNMENTS.filter(
    (a) => a.user_id === actorId && ancestors.includes(a.context_id),
  );
  const roleIds = [
    ...new Set(
      assigned.map((a) => a.role_id).concat(simulateRoleId ? [simulateRoleId] : []),
    ),
  ];
  const parts = [];
  if (assigned.length) {
    const names = [...new Set(assigned.map((a) => roleById(a.role_id).short_name))];
    parts.push(`roles: ${names.join(", ")}`);
  }
  if (simulateRoleId) parts.push(`simulated role ${roleById(simulateRoleId)?.short_name}`);
  return {
    gate: "role",
    passed: roleIds.length > 0,
    evidence: parts.length
      ? [parts.join(" + ")]
      : ["no role assignment at this context or above"],
    roleIds,
  };
}

function capabilityGate(roleIds, capability, ctx) {
  const values = roleIds.map((rid) => {
    const r = resolveCapability(rid, capability, ctx);
    return { role: roleById(rid)?.short_name, permission: r.permission, decided_at: r.defined_at };
  });
  // pass iff no role is prohibited and at least one is allowed.
  const passed =
    !values.some((v) => v.permission === "prohibit") &&
    values.some((v) => v.permission === "allow");
  const evidence = values.length
    ? values.map((v) => {
        const override =
          v.decided_at && v.decided_at.context_id !== SYSTEM_CONTEXT_ID
            ? ` (override at ${v.decided_at.label})`
            : "";
        return `${v.role}: ${v.permission}${override}`;
      })
    : ["no roles to resolve capability"];
  return { gate: "capability", passed, evidence, capability_values: values };
}

// accessallgroups resolved across the actor's roles: prohibit > allow > prevent.
function effectiveAccessAllGroups(roleIds, ctx) {
  const vals = roleIds.map((rid) => resolveCapability(rid, "site:accessallgroups", ctx));
  return (
    vals.find((v) => v.permission === "prohibit") ??
    vals.find((v) => v.permission === "allow") ??
    vals.find((v) => v.permission === "prevent") ??
    vals[0] ?? { permission: "notset", defined_at: null }
  );
}

function groupGate(actorId, roleIds, activityId, targetUserId, ctx) {
  const activity = ACTIVITIES.find((a) => a.id === activityId);
  if (!activity)
    return { gate: "group", passed: true, evidence: ["activity not found — no group check"] };
  const course = courseById(activity.course_id);
  // force_group_mode makes the course value win over any per-activity mode.
  const mode = course.force_group_mode
    ? course.group_mode
    : (activity.group_mode ?? course.group_mode);
  if (mode !== "separate")
    return { gate: "group", passed: true, evidence: [`group mode '${mode}' — no isolation`] };
  const aag = effectiveAccessAllGroups(roleIds, ctx);
  if (aag.permission === "allow")
    return { gate: "group", passed: true, evidence: ["accessallgroups: allow — sees all groups"] };
  const mine = groupsOfUser(actorId, course.id);
  const targets = groupsOfUser(targetUserId, course.id);
  const shared = mine.find((g) => targets.some((t) => t.id === g.id));
  if (shared) return { gate: "group", passed: true, evidence: [`shares ${shared.name}`] };
  const override =
    aag.defined_at && aag.defined_at.context_id !== SYSTEM_CONTEXT_ID
      ? ` (override at ${aag.defined_at.label})`
      : "";
  return {
    gate: "group",
    passed: false,
    evidence: [`no common group; accessallgroups: ${aag.permission}${override}`],
  };
}

const DECISIONS = [];
let decisionSeq = 1;

function runCheck(body) {
  const actor = userById(body.actor_id);
  const ctx = contextById(body.context_id);
  if (!actor || !ctx) throw new ApiError(400, { detail: "unknown actor or context" });

  const g1 = enrolmentGate(actor.id, ctx);
  const g2 = roleGate(actor.id, ctx, body.simulate_role_id ?? null);
  const g3 = capabilityGate(g2.roleIds, body.capability, ctx);
  const g4 =
    body.target_user_id && body.activity_id
      ? groupGate(actor.id, g2.roleIds, body.activity_id, body.target_user_id, ctx)
      : null;

  // Every gate is evaluated and returned even after one fails — the UI shows
  // the full pipeline (capability-pass beside group-fail is the whole story).
  const gates = [g1, g2, g3, g4]
    .filter(Boolean)
    .map((g) => ({ gate: g.gate, passed: g.passed, evidence: g.evidence }));
  const verdict = gates.every((g) => g.passed) ? "allowed" : "denied";
  const reasons =
    verdict === "allowed"
      ? ["all gates passed"]
      : gates.filter((g) => !g.passed).flatMap((g) => g.evidence);

  const decision = {
    id: decisionSeq++,
    actor: { id: actor.id, full_name: actor.full_name },
    capability: body.capability,
    context_label: ctx.label,
    verdict,
    created_at: new Date().toISOString(),
    reasons,
    gates,
    capability_values: g3.capability_values,
    inputs: { ...body }, // original request — lets the UI replay the check
  };
  DECISIONS.unshift(decision); // newest first
  return decision;
}

export const routes = [
  { method: "GET", pattern: /^\/api\/roles$/, handler: () => ROLES },
  {
    method: "POST",
    pattern: /^\/api\/roles$/,
    handler: (m, body) => {
      const short = (body.short_name ?? "").trim();
      const name = (body.name ?? "").trim();
      if (!short || !name)
        throw new ApiError(400, { detail: "short_name and name are required" });
      if (ROLES.some((r) => r.short_name === short))
        throw new ApiError(409, {
          detail: "role short_name already exists",
          reasons: [
            `role short_name '${short}' already exists — short names are the unique key; pick another`,
          ],
        });
      const nextId = Math.max(0, ...ROLES.map((r) => r.id)) + 1;
      const role = {
        id: nextId,
        sort_order: nextId,
        short_name: short,
        name,
        archetype: body.archetype ?? null,
      };
      ROLES.push(role);
      // Moodle's "duplicate role" copies the source role's WHOLE definition:
      // its system-context defaults AND every context override (including
      // CS101's accessallgroups=prevent). Copy-everything is the whole point —
      // you get a faithful clone, then override the COPY, never the original.
      // This is exactly how ta.allgroups exists: a scoped duplicate of 'teacher'.
      if (body.duplicate_of != null)
        ROLE_CAPABILITIES.filter((r) => r.role_id === body.duplicate_of).forEach((r) =>
          ROLE_CAPABILITIES.push({ ...r, role_id: nextId }),
        );
      return role;
    },
  },
  { method: "GET", pattern: /^\/api\/roles\/contexts$/, handler: () => CONTEXTS },
  { method: "GET", pattern: /^\/api\/roles\/capabilities$/, handler: () => CAPABILITIES },
  {
    method: "GET",
    pattern: /^\/api\/roles\/(\d+)\/capabilities$/,
    handler: (m, body, query) => {
      const roleId = Number(m[1]);
      const ctx = contextById(Number(query.context_id));
      if (!ctx) throw new ApiError(400, { detail: "context_id required" });
      return CAPABILITIES.map((capability) => {
        const r = resolveCapability(roleId, capability, ctx);
        return {
          capability,
          permission: r.permission,
          is_override: r.is_override,
          defined_at: r.defined_at,
        };
      });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/roles\/(\d+)\/capabilities$/,
    handler: (m, body) => {
      const roleId = Number(m[1]);
      const { context_id, capability, permission } = body;
      const idx = ROLE_CAPABILITIES.findIndex(
        (r) => r.role_id === roleId && r.context_id === context_id && r.capability === capability,
      );
      // "notset" clears the override at this context so it inherits again.
      if (permission === "notset") {
        if (idx >= 0) ROLE_CAPABILITIES.splice(idx, 1);
        return { role_id: roleId, context_id, capability, permission: "notset" };
      }
      if (idx >= 0) ROLE_CAPABILITIES[idx].permission = permission;
      else ROLE_CAPABILITIES.push({ role_id: roleId, context_id, capability, permission });
      return { role_id: roleId, context_id, capability, permission };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/roles\/assignable$/,
    handler: (m, body, query) => {
      const ctx = contextById(Number(query.context_id));
      if (!ctx) return [];
      return assignableRoleIds(Number(query.actor_id), ctx).map((id) => {
        const r = roleById(id);
        return { role_id: r.id, short_name: r.short_name, name: r.name };
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/roles\/assignments$/,
    handler: (m, body, query) => {
      const cid = query.context_id ? Number(query.context_id) : null;
      return ROLE_ASSIGNMENTS.filter((a) => cid == null || a.context_id === cid).map(assignmentRow);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/roles\/assignments$/,
    handler: (m, body) => {
      const ctx = contextById(body.context_id);
      if (!ctx) throw new ApiError(400, { detail: "unknown context" });
      if (!assignableRoleIds(body.actor_id, ctx).includes(body.role_id))
        throw new ApiError(403, {
          reasons: [
            `role '${governingRole(body.actor_id, ctx)}' may not assign role '${roleById(body.role_id)?.short_name}' here (assignable matrix)`,
          ],
        });
      const row = {
        id: Math.max(0, ...ROLE_ASSIGNMENTS.map((a) => a.id)) + 1,
        user_id: body.user_id,
        role_id: body.role_id,
        context_id: body.context_id,
        component: "",
        item_id: 0,
      };
      ROLE_ASSIGNMENTS.push(row);
      return assignmentRow(row);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/roles\/assignments\/(\d+)$/,
    handler: (m) => {
      const idx = ROLE_ASSIGNMENTS.findIndex((a) => a.id === Number(m[1]));
      if (idx < 0) throw new ApiError(404, { detail: "assignment not found" });
      // Provenance guard: enrol_* rows are machine-created by an enrolment
      // method's sync. Deleting one here is futile — the next sync recreates it.
      const { component } = ROLE_ASSIGNMENTS[idx];
      if (component.startsWith("enrol_"))
        throw new ApiError(403, {
          reasons: [
            `assignment is owned by '${component}' (auto-created by an enrolment method) — remove the enrolment path instead; deleting it here would be recreated on next sync`,
          ],
        });
      ROLE_ASSIGNMENTS.splice(idx, 1);
      return null; // 204
    },
  },
  { method: "POST", pattern: /^\/api\/permissions\/check$/, handler: (m, body) => runCheck(body) },
  {
    method: "GET",
    pattern: /^\/api\/permissions\/decisions$/,
    handler: (m, body, query) =>
      query.limit ? DECISIONS.slice(0, Number(query.limit)) : DECISIONS,
  },
];
