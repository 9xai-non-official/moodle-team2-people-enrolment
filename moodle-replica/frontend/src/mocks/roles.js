// Roles / Permissions mocks — a FAITHFUL stand-in for the hardened backend.
// Every response here mirrors the REAL contract (app/routers/roles.py,
// app/routers/permissions.py, app/schemas_roles.py):
//   • /check returns the §17.3 evidence object: {allowed, decision,
//     blocking_reasons, supporting_reasons, roles_considered, contexts_considered,
//     capability_values{role:{value,decided_at}}, prohibits_found, group_scope,
//     admin_bypass, simulated_role, enrolment_paths} — never a bare verdict/gates.
//   • request field is actor_user_id (not actor_id).
//   • capability writes use PUT with permission=null to clear.
//   • /assignable is principal-relative (ctx.actingUserId) and returns
//     {matrix, can_assign, based_on_role, assignable:[short_name]}.
//   • decisions rows: {id, actor_id, capability, context_id, target_id, allowed,
//     reasons:{…full response…}, decided_at}.
// The header still shows a MOCK DATA badge — this is never presented as live.
import { ApiError } from "../errors";
import {
  ROLES,
  CONTEXTS,
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
const ADMIN_IDS = new Set([1]); // admin1 — config-list admin (like the backend)
const GUEST_IDS = new Set([]); // no seeded guest persona
const STAFF_ARCHETYPES = ["manager", "editingteacher", "teacher"];
const GUEST_BLOCK_RISKS = new Set(["xss", "config", "dataloss"]);

// Capability catalogue metadata (mirrors seed.sql risks/types).
const CAP_META = {
  "course:view": { cap_type: "read", component: "core", min_context_level: "course", risks: [] },
  "course:viewparticipants": { cap_type: "read", component: "core", min_context_level: "course", risks: ["personal"] },
  "site:accessallgroups": { cap_type: "read", component: "core", min_context_level: "course", risks: ["personal"] },
  "activity:grade": { cap_type: "write", component: "core", min_context_level: "activity", risks: [] },
  "activity:submit": { cap_type: "write", component: "core", min_context_level: "activity", risks: [] },
  "activity:view": { cap_type: "read", component: "core", min_context_level: "activity", risks: [] },
  "progress:viewall": { cap_type: "read", component: "core", min_context_level: "course", risks: ["personal"] },
  "progress:viewown": { cap_type: "read", component: "core", min_context_level: "course", risks: [] },
  "completion:override": { cap_type: "write", component: "core", min_context_level: "course", risks: [] },
  "group:manage": { cap_type: "write", component: "core", min_context_level: "course", risks: [] },
  "enrol:manual": { cap_type: "write", component: "enrol_manual", min_context_level: "course", risks: [] },
  "enrol:unenrol": { cap_type: "write", component: "enrol_manual", min_context_level: "course", risks: ["dataloss"] },
  "role:assign": { cap_type: "write", component: "core", min_context_level: "course", risks: ["spam", "personal"] },
  "role:override": { cap_type: "write", component: "core", min_context_level: "course", risks: [] },
  "role:manage": { cap_type: "write", component: "core", min_context_level: "system", risks: [] },
  "user:viewdetails": { cap_type: "read", component: "core", min_context_level: "user", risks: ["personal"] },
};
const CAP_NAMES = Object.keys(CAP_META);

// Staff capability defaults the real seed carries but the shared mock seed
// omits — added locally so role:assign / role:override / user:viewdetails
// demos work. Mutations (PUT) live on this local copy, never the shared seed.
const EXTRA_CAPS = [
  ["manager", ["role:assign", "role:override", "role:manage", "user:viewdetails", "course:view", "course:viewparticipants", "enrol:manual", "activity:view", "activity:grade"]],
  ["editingteacher", ["role:assign", "role:override", "user:viewdetails", "course:view", "course:viewparticipants", "enrol:manual", "activity:view"]],
  ["teacher", ["user:viewdetails", "course:view", "course:viewparticipants", "activity:view"]],
];
const CAPS = [...ROLE_CAPABILITIES];
for (const [sn, caps] of EXTRA_CAPS) {
  const r = ROLES.find((x) => x.short_name === sn);
  if (!r) continue;
  for (const cap of caps) {
    if (!CAPS.some((c) => c.role_id === r.id && c.context_id === SYSTEM_CONTEXT_ID && c.capability === cap))
      CAPS.push({ role_id: r.id, context_id: SYSTEM_CONTEXT_ID, capability: cap, permission: "allow" });
  }
}

const lbl = (ctx) => (ctx ? `${ctx.level}:${ctx.instance_id}` : "—");
const isAdmin = (id) => ADMIN_IDS.has(id);
const isGuest = (id) => GUEST_IDS.has(id);
// context ids on the path, MOST-SPECIFIC-FIRST (e.g. [110, 10, 1]).
const pathIds = (ctx) => ctx.path.split("/").filter(Boolean).map(Number).reverse();

// Resolve one capability for one role along a path → {value, decided_at, is_override}.
function resolveForRole(roleId, capability, ids) {
  const rows = CAPS.filter(
    (r) => r.role_id === roleId && r.capability === capability && ids.includes(r.context_id),
  );
  if (!rows.length) return { value: null, decided_at: null, is_override: false };
  const idx = (cid) => ids.indexOf(cid); // 0 = most specific
  const prohibit = rows.find((r) => r.permission === "prohibit");
  const winner = prohibit ?? rows.reduce((best, r) => (idx(r.context_id) < idx(best.context_id) ? r : best));
  const wctx = contextById(winner.context_id);
  return {
    value: winner.permission,
    decided_at: lbl(wctx),
    is_override: winner.context_id !== SYSTEM_CONTEXT_ID,
    decided_ctx: winner.context_id,
  };
}

// The roles an actor holds for evaluation (with the virtual 'user' role).
function heldRoles(actorId, ctx, ids, simulateRoleId) {
  if (simulateRoleId) {
    const r = roleById(simulateRoleId);
    return [
      {
        role_id: simulateRoleId,
        role: r?.short_name ?? String(simulateRoleId),
        context: lbl(ctx),
        provenance: "simulated (role switch)",
      },
    ];
  }
  const held = ROLE_ASSIGNMENTS.filter((a) => a.user_id === actorId && ids.includes(a.context_id)).map((a) => ({
    role_id: a.role_id,
    role: roleById(a.role_id)?.short_name ?? String(a.role_id),
    context: lbl(contextById(a.context_id)),
    provenance: a.component || "manual",
  }));
  if (!isGuest(actorId)) {
    held.push({ role_id: -1, role: "user", context: lbl(contextById(SYSTEM_CONTEXT_ID)), provenance: "virtual (authenticated user)" });
  }
  return held;
}

// Does `userId` hold `capability` at `ctx`? (used for the other-user gate.)
function hasCap(userId, capability, ctx) {
  if (isAdmin(userId)) return true;
  const ids = pathIds(ctx);
  const held = heldRoles(userId, ctx, ids, null);
  const decisions = held.map((h) => resolveForRole(h.role_id, capability, ids));
  if (decisions.some((d) => d.value === "prohibit")) return false;
  return decisions.some((d) => d.value === "allow");
}

const courseCtxOf = (ctx, ids) => ids.map(contextById).find((c) => c && c.level === "course");
const activityCtxOf = (ctx, ids) => ids.map(contextById).find((c) => c && c.level === "activity");

function activePaths(actorId, courseId) {
  const user = userById(actorId);
  return ENROLMENTS.filter((e) => e.user_id === actorId)
    .map((e) => ({ e, m: METHODS.find((m) => m.id === e.method_id) }))
    .filter(({ e, m }) => m && m.course_id === courseId && pathLive(e, m, user))
    .map(({ e, m }) => ({ kind: m.method, status: e.status }));
}

// ---- the full check pipeline, returning the REAL evidence contract --------
function buildDecision(body) {
  const actor = userById(body.actor_user_id);
  const ctx = contextById(body.context_id);
  if (!actor || !ctx) throw new ApiError(400, { detail: "unknown actor or context" });

  const ids = pathIds(ctx);
  const simulate = body.simulate_role_id ?? null;
  const held = heldRoles(actor.id, ctx, ids, simulate);
  const heldIds = held.map((h) => h.role_id);
  const roleName = Object.fromEntries(held.map((h) => [h.role_id, h.role]));

  const cap = CAP_META[body.capability];
  const capKnown = !!cap;
  const admin = isAdmin(actor.id) && simulate == null;
  const guest = isGuest(actor.id);

  // capability resolution (for evidence) across held roles
  const capability_values = {};
  const prohibits_found = [];
  const perRole = {};
  for (const h of held) {
    const d = resolveForRole(h.role_id, body.capability, ids);
    perRole[h.role_id] = d;
    capability_values[h.role] = { value: d.value, decided_at: d.value != null ? d.decided_at : null };
    if (d.value === "prohibit") prohibits_found.push({ role: h.role, context: d.decided_at });
  }
  const capAllowed = !prohibits_found.length && Object.values(perRole).some((d) => d.value === "allow");

  const contexts_considered = ids.map((id) => lbl(contextById(id)));
  const courseCtx = courseCtxOf(ctx, ids);
  const activityCtx = activityCtxOf(ctx, ids);
  const courseId = courseCtx?.instance_id ?? null;
  const hasCourse = !!(courseCtx || activityCtx);
  let activityId = body.activity_id ?? (activityCtx ? activityCtx.instance_id : null);

  const enrolment_paths = courseId != null ? activePaths(actor.id, courseId) : [];
  const courseViewAllowed =
    !prohibits_found.length &&
    heldIds.some((rid) => resolveForRole(rid, "course:view", ids).value === "allow");

  const blocking = [];
  const supporting = [];
  let admin_bypass = false;
  const simulated_role = simulate ? roleName[simulate] ?? null : null;

  // group scope evidence
  const group_scope = { mode: null, actor_groups: [], target_groups: [], shared: null, access_all_groups: false };

  const finalize = () => ({
    allowed: blocking.length === 0,
    decision: blocking.length === 0 ? "ALLOW" : "DENY",
    blocking_reasons: blocking,
    supporting_reasons: supporting,
    enrolment_paths,
    roles_considered: held.map((h) => ({ role: h.role, context: h.context, provenance: h.provenance })),
    contexts_considered,
    capability_values,
    prohibits_found,
    group_scope,
    admin_bypass,
    simulated_role,
  });

  // gate 1: account + capability validity
  if (actor.deleted_at) {
    blocking.push("Account is deleted — no access");
    return finalize();
  }
  if (actor.suspended) {
    blocking.push("Account is suspended — cannot log in");
    return finalize();
  }
  if (!capKnown) {
    blocking.push(`Unknown capability '${body.capability}' — not in the catalogue`);
    return finalize();
  }
  supporting.push("Account active (not suspended, not deleted)");

  // gate 2: admin bypass
  if (admin) {
    admin_bypass = true;
    supporting.push("Site administrator bypass (config list, not a role) — all checks pass");
    return finalize();
  }
  if (isAdmin(actor.id) && simulate != null) {
    supporting.push(`Admin bypass SUPPRESSED — previewing as role '${simulated_role}' (honest preview)`);
  }

  // gate 3: guest gate
  if (guest && (cap.cap_type === "write" || cap.risks.some((r) => GUEST_BLOCK_RISKS.has(r)))) {
    blocking.push(`Guest is hard-blocked from write/risky actions (capability '${body.capability}' is ${cap.cap_type})`);
  } else if (guest) {
    supporting.push("Guest allowed for this read/low-risk capability");
  }

  // gate 4: course door
  if (hasCourse) {
    if (enrolment_paths.length) supporting.push(`Course door: actively enrolled via ${enrolment_paths.length} path(s)`);
    else if (courseViewAllowed) supporting.push("Course door: opened via course:view — not a participant / not enrolled");
    else {
      // staff role on path bypasses enrolment
      const staff = held.find((h) => STAFF_ARCHETYPES.includes(roleById(h.role_id)?.archetype));
      if (staff) supporting.push(`Course door: role '${staff.role}' at ${staff.context} bypasses enrolment`);
      else blocking.push("Course door: not enrolled and no course:view — cannot enter the course");
    }
  }

  // gate 5: capability
  if (prohibits_found.length) blocking.push(`PROHIBIT veto by role ${prohibits_found[0].role} at ${prohibits_found[0].context} — un-overridable anywhere below`);
  else if (!capAllowed) blocking.push(`Capability '${body.capability}': no role grants this capability here (default deny)`);
  else supporting.push(`Capability '${body.capability}': granted by role (allow); no role prohibits`);

  // gate 6: target participation
  if (body.target_user_id != null && hasCourse) {
    const targetActive = effectiveStatus(body.target_user_id, courseId) === "active";
    if (targetActive) supporting.push(`Target user ${body.target_user_id} is actively enrolled`);
    else blocking.push(`Target user ${body.target_user_id} is not a participant of this course`);
  }

  // gate 7: group scope
  if (body.target_user_id != null && activityId != null && hasCourse) {
    const activity = ACTIVITIES.find((a) => a.id === activityId);
    const course = courseById(courseId);
    const mode = course?.force_group_mode ? course.group_mode : activity?.group_mode ?? course?.group_mode ?? null;
    const accessAll =
      !prohibits_found.length && heldIds.some((rid) => resolveForRole(rid, "site:accessallgroups", ids).value === "allow");
    const mine = groupsOfUser(actor.id, courseId).map((g) => g.name);
    const theirs = groupsOfUser(body.target_user_id, courseId).map((g) => g.name);
    const shared = mine.some((g) => theirs.includes(g));
    group_scope.mode = mode;
    group_scope.actor_groups = mine;
    group_scope.target_groups = theirs;
    group_scope.shared = shared;
    group_scope.access_all_groups = accessAll;
    if (accessAll) supporting.push("Group scope: accessallgroups — may act across all groups");
    else if (mode !== "separate") supporting.push(`Group scope: group mode '${mode}' imposes no separation`);
    else if (shared) supporting.push("Group scope: actor and target share a group");
    else blocking.push("Target is outside the actor's allowed groups (separate mode, no accessallgroups)");
  }

  // gate 8: activity state
  if (activityId != null) {
    const activity = ACTIVITIES.find((a) => a.id === activityId);
    if (activity && activity.visible === false) blocking.push(`Activity ${activityId} is hidden`);
    else if (activity) supporting.push(`Activity ${activityId} is visible`);
  }

  return finalize();
}

// ---- decision log ---------------------------------------------------------
const DECISIONS = [];
let decisionSeq = 1;
function logDecision(body, response) {
  DECISIONS.unshift({
    id: decisionSeq++,
    actor_id: body.actor_user_id,
    capability: body.capability,
    context_id: body.context_id,
    target_id: body.target_user_id ?? null,
    allowed: response.allowed,
    reasons: response,
    decided_at: new Date().toISOString(),
  });
}

// ---- assignments ----------------------------------------------------------
const ALLOW_ASSIGN = {
  manager: ["manager", "editingteacher", "teacher", "student"],
  editingteacher: ["teacher", "student"],
};
function assignableFor(actorId, ctx) {
  if (isAdmin(actorId)) {
    return {
      matrix: "hardcoded default",
      can_assign: true,
      based_on_role: "admin (site administrator)",
      assignable: ROLES.map((r) => r.short_name),
    };
  }
  const ids = pathIds(ctx);
  const canAssign = hasCap(actorId, "role:assign", ctx);
  const myRoles = ROLE_ASSIGNMENTS.filter((a) => a.user_id === actorId && ids.includes(a.context_id))
    .map((a) => roleById(a.role_id)?.short_name)
    .filter(Boolean);
  let strongest = null;
  for (const sn of ["manager", "editingteacher"]) if (myRoles.includes(sn)) { strongest = sn; break; }
  return {
    matrix: "hardcoded default",
    can_assign: canAssign,
    based_on_role: strongest,
    assignable: canAssign ? ALLOW_ASSIGN[strongest] ?? [] : [],
  };
}

const assignmentRow = (a) => ({
  assignment_id: a.id,
  user: { id: userById(a.user_id).id, full_name: userById(a.user_id).full_name },
  role: { id: roleById(a.role_id).id, short_name: roleById(a.role_id).short_name },
  context: { id: contextById(a.context_id).id, label: lbl(contextById(a.context_id)) },
  component: a.component,
  item_id: a.item_id,
});

export const routes = [
  // ---- role CRUD ----
  {
    method: "GET",
    pattern: /^\/api\/roles$/,
    handler: () => ROLES.map((r) => ({ description: "", sort_order: r.id, ...r })),
  },
  {
    method: "POST",
    pattern: /^\/api\/roles$/,
    handler: (m, body) => {
      const short = (body.short_name ?? "").trim();
      const name = (body.name ?? "").trim();
      if (!short || !name) throw new ApiError(422, { detail: "short_name and name are required" });
      if (ROLES.some((r) => r.short_name === short))
        throw new ApiError(409, {
          detail: "role short_name already exists",
          reasons: [`role short_name '${short}' already exists — pick another`],
        });
      const id = Math.max(0, ...ROLES.map((r) => r.id)) + 1;
      const role = { id, short_name: short, name, description: body.description ?? "", archetype: body.archetype ?? null, sort_order: id };
      ROLES.push(role);
      return role;
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/roles\/(\d+)\/clone$/,
    handler: (m, body) => {
      const srcId = Number(m[1]);
      const src = roleById(srcId);
      if (!src) throw new ApiError(404, { detail: "source role not found" });
      const short = (body.short_name ?? "").trim();
      const name = (body.name ?? "").trim();
      if (!short || !name) throw new ApiError(422, { detail: "short_name and name are required" });
      if (ROLES.some((r) => r.short_name === short))
        throw new ApiError(409, { detail: "role short_name already exists", reasons: [`'${short}' already exists`] });
      const id = Math.max(0, ...ROLES.map((r) => r.id)) + 1;
      const role = { id, short_name: short, name, description: body.description ?? "", archetype: src.archetype, sort_order: id };
      ROLES.push(role);
      // copy ONLY system-context rows (mirrors clone_role)
      const copied = CAPS.filter((c) => c.role_id === srcId && c.context_id === SYSTEM_CONTEXT_ID);
      copied.forEach((c) => CAPS.push({ ...c, role_id: id }));
      return { role, capabilities_copied: copied.length };
    },
  },

  // ---- catalogues ----
  {
    method: "GET",
    pattern: /^\/api\/roles\/capabilities$/,
    handler: () => CAP_NAMES.map((name) => ({ name, ...CAP_META[name] })),
  },
  {
    method: "GET",
    pattern: /^\/api\/roles\/contexts$/,
    handler: () =>
      CONTEXTS.map((c) => ({
        id: c.id,
        level: c.level,
        instance_id: c.instance_id,
        path: c.path,
        depth: c.path.split("/").filter(Boolean).length,
        label: lbl(c),
      })),
  },

  // ---- capability sheet ----
  {
    method: "GET",
    pattern: /^\/api\/roles\/(\d+)\/capabilities$/,
    handler: (m, body, query) => {
      const roleId = Number(m[1]);
      const ctx = contextById(Number(query.context_id));
      if (!ctx) throw new ApiError(422, { detail: "context_id required" });
      const ids = pathIds(ctx);
      return CAP_NAMES.map((capability) => {
        const meta = CAP_META[capability];
        const d = resolveForRole(roleId, capability, ids);
        return {
          capability,
          cap_type: meta.cap_type,
          risks: meta.risks,
          permission: d.value,
          is_override: d.value != null && d.decided_ctx !== SYSTEM_CONTEXT_ID,
          decided_at: d.value != null ? d.decided_at : null,
        };
      });
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/roles\/(\d+)\/capabilities$/,
    handler: (m, body) => {
      const roleId = Number(m[1]);
      const { context_id, capability, permission } = body;
      if (!CAP_META[capability]) throw new ApiError(400, { detail: `unknown capability '${capability}'` });
      const idx = CAPS.findIndex((r) => r.role_id === roleId && r.context_id === context_id && r.capability === capability);
      if (permission == null) {
        const was = idx >= 0;
        if (idx >= 0) CAPS.splice(idx, 1);
        return { action: "cleared", was_present: was, note: "row removed — capability is now 'not set' (inherit)" };
      }
      if (!["allow", "prevent", "prohibit"].includes(permission)) throw new ApiError(400, { detail: `invalid permission '${permission}'` });
      if (idx >= 0) CAPS[idx].permission = permission;
      else CAPS.push({ role_id: roleId, context_id, capability, permission });
      return { action: "set", row: { role_id: roleId, context_id, capability, permission } };
    },
  },

  // ---- assignments ----
  {
    method: "GET",
    pattern: /^\/api\/roles\/assignable$/,
    handler: (m, body, query, ctx) => {
      const c = contextById(Number(query.context_id));
      if (!c) return { matrix: "hardcoded default", can_assign: false, based_on_role: null, assignable: [] };
      const principal = ctx?.actingUserId;
      if (principal == null) throw new ApiError(401, { detail: "no principal" });
      return assignableFor(principal, c);
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
    handler: (m, body, query, ctx) => {
      const c = contextById(body.context_id);
      if (!c) throw new ApiError(404, { detail: "unknown context" });
      const principal = ctx?.actingUserId;
      if (principal == null) throw new ApiError(401, { detail: "no principal" });
      const allow = assignableFor(principal, c);
      const targetRole = roleById(body.role_id);
      if (!targetRole) throw new ApiError(404, { detail: "role not found" });
      if (!allow.can_assign)
        throw new ApiError(403, { reasons: [`actor lacks role:assign at this context — cannot assign roles`] });
      if (!allow.assignable.includes(targetRole.short_name))
        throw new ApiError(403, {
          reasons: [`may not assign role '${targetRole.short_name}' here (assignable: ${allow.assignable.join(", ")})`],
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
      return { created: true, assignment: { id: row.id, ...row } };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/roles\/assignments\/(\d+)$/,
    handler: (m) => {
      const idx = ROLE_ASSIGNMENTS.findIndex((a) => a.id === Number(m[1]));
      if (idx < 0) throw new ApiError(404, { detail: "assignment not found" });
      const { component } = ROLE_ASSIGNMENTS[idx];
      if (component)
        throw new ApiError(403, {
          reasons: [`assignment was created by '${component}' (an enrolment sync) — remove it via enrolment, not the roles UI`],
        });
      ROLE_ASSIGNMENTS.splice(idx, 1);
      return { deleted: true, assignment_id: Number(m[1]) };
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/roles\/users\/(\d+)\/assignments$/,
    handler: (m) => {
      const userId = Number(m[1]);
      return ROLE_ASSIGNMENTS.filter((a) => a.user_id === userId).map((a) => {
        const c = contextById(a.context_id);
        return {
          assignment_id: a.id,
          role_id: a.role_id,
          role: roleById(a.role_id)?.short_name,
          context: lbl(c),
          context_id: a.context_id,
          context_path: c?.path,
          provenance: a.component || "manual",
          item_id: a.item_id,
          assigned_at: null,
        };
      });
    },
  },

  // ---- permission check + decisions ----
  {
    method: "POST",
    pattern: /^\/api\/permissions\/check$/,
    handler: (m, body, query, ctx) => {
      const principal = ctx?.actingUserId;
      // other-user inspection needs user:viewdetails (admin bypasses)
      if (principal != null && body.actor_user_id !== principal) {
        const c = contextById(body.context_id);
        if (c && !hasCap(principal, "user:viewdetails", c))
          throw new ApiError(403, {
            detail: `actor ${principal} may not inspect another user's permissions here (requires 'user:viewdetails')`,
          });
      }
      const response = buildDecision(body);
      logDecision(body, response);
      return response;
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/permissions\/decisions$/,
    handler: (m, body, query) => {
      let list = DECISIONS;
      if (query.actor_id) list = list.filter((d) => d.actor_id === Number(query.actor_id));
      const limit = query.limit ? Number(query.limit) : 50;
      return list.slice(0, limit);
    },
  },

  // ---- dev-login (mock stand-in): mint a throwaway token ----
  {
    method: "POST",
    pattern: /^\/api\/permissions\/dev-login$/,
    handler: (m, body) => ({ token: `mock.${body.user_id ?? body.username ?? "anon"}`, user: { id: body.user_id ?? null } }),
  },
];
