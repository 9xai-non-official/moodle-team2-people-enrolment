// Groups data adapter — same sanctioned API-layer seam as progressApi.js.
// Contract paths first (mock mode serves them); on 404 fall back to Mahmoud's
// LIVE routes (merged PR #5) and map shapes:
//   his GET /api/groups?course_id=       → board (members fetched per group)
//   his GET /api/groups/groupings?course_id=
//   his GET /api/groups/activities/{id}/policy (per activity; bulk built here
//        from GET /api/courses/{id}/activities — bootstrap endpoint)
//   his POST /api/groups/access-check {actor_user_id,…} →
//        {visible, action_allowed, …} mapped to the contract's
//        {outcome: allowed|denied|invisible, reasons}.
import { apiGet, apiPost, apiPatch, apiDelete } from "../api";

const is404 = (e) => e.status === 404;

export async function fetchGroupsBoard(courseId) {
  try {
    return await apiGet(`/api/groups/courses/${courseId}/groups`);
  } catch (e) {
    if (!is404(e)) throw e;
  }
  const groups = await apiGet(`/api/groups?course_id=${courseId}`);
  return Promise.all(
    groups.map(async (g) => {
      const members = await apiGet(`/api/groups/${g.id}/members`);
      return {
        id: g.id,
        name: g.name,
        enrolment_key: g.has_enrolment_key ?? false,
        participation: g.participation,
        members: members.map((m) => ({
          user_id: m.user_id,
          full_name: `${m.first_name} ${m.last_name}`,
          provenance: m.component ?? "",
          item_id: m.item_id,
        })),
      };
    }),
  );
}

export async function fetchGroupings(courseId) {
  try {
    return await apiGet(`/api/groups/courses/${courseId}/groupings`);
  } catch (e) {
    if (!is404(e)) throw e;
  }
  const [groupings, groups] = await Promise.all([
    apiGet(`/api/groups/groupings?course_id=${courseId}`),
    apiGet(`/api/groups?course_id=${courseId}`),
  ]);
  const nameOf = (id) => groups.find((g) => g.id === id)?.name ?? `#${id}`;
  return groupings.map((gr) => ({
    id: gr.id,
    name: gr.name,
    groups: (gr.group_ids ?? []).map((id) => ({ id, name: nameOf(id) })),
  }));
}

export async function fetchActivityPolicies(courseId) {
  try {
    return await apiGet(`/api/groups/courses/${courseId}/activity-policies`);
  } catch (e) {
    if (!is404(e)) throw e;
  }
  const activities = await apiGet(`/api/courses/${courseId}/activities`);
  return Promise.all(
    activities.map(async (a) => {
      const pol = await apiGet(`/api/groups/activities/${a.id}/policy`);
      return {
        activity_id: a.id,
        name: a.name,
        configured_mode: pol.configured_mode,
        effective_mode: pol.effective_mode,
        forced: pol.course_mode_forced ?? pol.forced ?? false,
        grouping: pol.grouping ?? null,
      };
    }),
  );
}

export async function accessCheck({ actor_id, target_user_id, activity_id }) {
  try {
    return await apiPost("/api/groups/access-check", {
      actor_id,
      target_user_id,
      activity_id,
    });
  } catch (e) {
    // same path in both worlds: mock takes the contract body; the live route
    // 422s on it (wants actor_user_id) — fall through on 422 as well as 404
    if (!is404(e) && e.status !== 422) throw e;
  }
  const v = await apiPost("/api/groups/access-check", {
    actor_user_id: actor_id,
    target_user_id,
    activity_id,
    action: "grade",
  });
  const outcome = !v.visible ? "invisible" : v.action_allowed ? "allowed" : "denied";
  return { outcome, reasons: v.reasons ?? [] };
}

export async function createGroup(courseId, body) {
  try {
    return await apiPost(`/api/groups/courses/${courseId}/groups`, body);
  } catch (e) {
    if (!is404(e)) throw e;
  }
  return apiPost("/api/groups", { course_id: courseId, ...body });
}

// Same path in both worlds; removes group + memberships only (GRP-001).
export function deleteGroup(groupId) {
  return apiDelete(`/api/groups/${groupId}`);
}

// null is meaningful (= inherit course / no grouping); omit a key to keep it.
// Same path live and mock. Caller refetches, so the returned policy is unused.
export function patchActivityPolicy(activityId, changes) {
  return apiPatch(`/api/groups/activities/${activityId}`, changes);
}

// Defensive: the live shape is unconfirmed — accept the group list, the
// all-groups flag, and the reason under whatever key/type they arrive in.
function normalizeAllowed(raw) {
  const list = raw.groups ?? raw.allowed_groups ?? [];
  const groups = list.map((g) =>
    typeof g === "string" ? { name: g } : { id: g.id, name: g.name ?? g.group_name ?? `#${g.id}` },
  );
  const all = raw.all_groups ?? raw.access_all_groups ?? raw.accessallgroups ?? false;
  const reason =
    raw.reason ?? (Array.isArray(raw.reasons) ? raw.reasons.join(" · ") : raw.reasons ?? null);
  return { groups, all_groups: !!all, reason };
}

export async function fetchAllowedGroups(activityId, actorId) {
  const base = `/api/groups/activities/${activityId}/allowed`;
  try {
    return normalizeAllowed(await apiGet(`${base}?actor_id=${actorId}`));
  } catch (e) {
    if (!is404(e) && e.status !== 422) throw e;
  }
  return normalizeAllowed(await apiGet(`${base}?user_id=${actorId}`));
}
