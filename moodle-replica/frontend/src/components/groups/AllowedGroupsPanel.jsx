// "Who can I see here?" — for an actor + activity, the groups the API says
// that actor may see. Verdict comes straight from the backend (all-groups
// badge, group chips, reason verbatim). Auto-runs once both are chosen.
import { useEffect, useState } from "react";
import { fetchActivityPolicies, fetchAllowedGroups } from "../../lib/groupsApi";
import { useActingUser } from "../../context/ActingUser";
import UserSelect from "../common/UserSelect";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

export default function AllowedGroupsPanel({ courseId }) {
  const { actingUser } = useActingUser();
  const [actorId, setActorId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityId, setActivityId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // actor defaults to the acting user.
  useEffect(() => {
    if (actingUser) setActorId((cur) => cur ?? actingUser.id);
  }, [actingUser]);

  // activity options reuse the policy list — one source of the effective mode.
  useEffect(() => {
    setResult(null);
    setError(null);
    fetchActivityPolicies(courseId)
      .then((rows) => {
        setActivities(rows);
        setActivityId(rows.length ? rows[0].activity_id : null);
      })
      .catch((e) => setError(e.message));
  }, [courseId]);

  useEffect(() => {
    if (!actorId || !activityId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    fetchAllowedGroups(activityId, actorId)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [actorId, activityId]);

  return (
    <div className="panel">
      <div className="panel__title">Who can I see here?</div>
      <div className="form-row">
        <label>Actor</label>
        <UserSelect value={actorId} onChange={setActorId} placeholder="— actor —" />
        <label>Activity</label>
        <select
          className="select"
          value={activityId ?? ""}
          onChange={(e) => setActivityId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— activity —</option>
          {activities.map((a) => (
            <option key={a.activity_id} value={a.activity_id}>
              {a.name} ({a.effective_mode})
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Checking…</p>}
      {error && <div className="error-banner">{error}</div>}
      {result && (
        <div>
          <div>
            {result.all_groups && (
              <Badge variant="green" title="sees every group in this course">
                all groups
              </Badge>
            )}
            {!result.all_groups && result.groups.length === 0 && (
              <span className="muted">no groups visible</span>
            )}
            {result.groups.map((g, i) => (
              <span className="chip" key={g.id ?? i}>
                {g.name}
              </span>
            ))}
          </div>
          {result.reason && <ReasonList reasons={[result.reason]} tone="info" />}
        </div>
      )}
    </div>
  );
}
