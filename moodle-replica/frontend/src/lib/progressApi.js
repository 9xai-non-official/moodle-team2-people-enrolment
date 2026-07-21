// Progress data adapter — API layer, not component logic (task 06 §9 keeps
// reshaping OUT of components; this is the one sanctioned seam).
//
// The frozen contract says GET /api/progress/users/{id}/overview. Mahdi's
// live backend ships GET /api/progress/user/{id} (different path + shape).
// Until the team aligns contract vs. endpoint, try the contract first
// (mock mode serves it), then fall back to the live endpoint and map it.
//
// Mapping notes (differences worth keeping visible):
// - percent_complete → percent; his view has no "no criteria → null" concept,
//   so total 0 maps to null (preserves the Moodle "no bar" rule).
// - excluded is always 0: v_course_progress counts HIDDEN activities too —
//   flagged to Mahdi (contract excludes them from the dashboard %).
// - manual completion exists in his model (POST /api/progress/complete),
//   surfaced as `manual_completable` so MyProgress can show the button.
import { apiGet } from "../api";

export async function fetchOverview(userId) {
  try {
    const rows = await apiGet(`/api/progress/users/${userId}/overview`);
    return { rows, source: "contract" };
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const live = await apiGet(`/api/progress/user/${userId}`);
  return {
    source: "live",
    rows: live.map((r) => ({
      course: { id: r.course_id, short_name: r.short_name, deleted: false },
      percent: r.activities_total > 0 ? r.percent_complete : null,
      counted: r.activities_done,
      total: r.activities_total,
      excluded: 0,
      completed_at: r.time_completed,
      completed: r.completed,
      has_self_criterion: false,
      manual_completable: true,
    })),
  };
}
