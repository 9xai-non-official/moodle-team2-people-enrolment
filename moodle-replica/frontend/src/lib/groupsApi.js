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
import { apiGet, apiPost } from "../api";

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
