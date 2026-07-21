// Criteria tab: edit a course's completion criteria (aggregation + item list).
// Activity options are read from the report's activities (no dedicated
// endpoint exists — reuse rather than invent one). Refetch after every write.
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";
import { useActingUser } from "../../context/ActingUser";

const KINDS = ["activity", "self", "date", "grade"];

export default function CriteriaEditor({ courseId }) {
  const { actingUser } = useActingUser();
  const actorId = actingUser?.id;

  const [criteria, setCriteria] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [kind, setKind] = useState("activity");
  const [activityId, setActivityId] = useState("");
  const [threshold, setThreshold] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/progress/courses/${courseId}/criteria`)
      .then(setCriteria)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, reloadKey]);

  useEffect(() => {
    if (!actorId) return;
    apiGet(`/api/progress/courses/${courseId}/report?actor_id=${actorId}`)
      .then((r) => setActivities(r.activities || []))
      .catch(() => setActivities([]));
  }, [courseId, actorId]);

  function setAggregation(aggregation) {
    apiPost(`/api/progress/courses/${courseId}/criteria`, { aggregation })
      .then(() => setReloadKey((k) => k + 1))
      .catch((e) => setError(e.message));
  }

  function addItem() {
    const body = { kind };
    if (kind === "activity") body.activity_id = activityId ? Number(activityId) : null;
    if (kind === "grade") body.threshold = threshold ? Number(threshold) : null;
    apiPost(`/api/progress/courses/${courseId}/criteria`, body)
      .then(() => {
        setReloadKey((k) => k + 1);
        setActivityId("");
        setThreshold("");
      })
      .catch((e) => setError(e.message));
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="panel">
      <div className="panel__title">Completion criteria</div>

      <div className="form-row">
        <span>Aggregation:</span>
        <button
          className={`btn ${criteria.aggregation === "all" ? "btn--primary" : ""}`}
          onClick={() => setAggregation("all")}
        >
          ALL
        </button>
        <button
          className={`btn ${criteria.aggregation === "any" ? "btn--primary" : ""}`}
          onClick={() => setAggregation("any")}
        >
          ANY
        </button>
        <span className="muted">
          {criteria.aggregation === "all"
            ? "every criterion must be met"
            : "any one criterion completes the course"}
        </span>
      </div>

      {criteria.items.length === 0 ? (
        <p className="muted">No criteria yet — this course has no completion tracking.</p>
      ) : (
        <ul>
          {criteria.items.map((it) => (
            <li key={it.id}>
              <span className="chip">{it.kind}</span> {it.label}
              {it.threshold != null && <span className="muted"> (≥ {it.threshold})</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="form-row">
        <label>Add criterion</label>
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        {kind === "activity" && (
          <select
            className="select"
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
          >
            <option value="">— activity —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        {kind === "grade" && (
          <input
            className="input"
            type="number"
            placeholder="threshold"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        )}
        <button
          className="btn btn--primary"
          disabled={kind === "activity" && !activityId}
          onClick={addItem}
        >
          Add
        </button>
      </div>
    </div>
  );
}
