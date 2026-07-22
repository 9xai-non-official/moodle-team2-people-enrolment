// Guest-access preview (task 06 §4.2): does this course let guests in, and is
// a password required? Read-only derived verdict from the backend — the reason
// text is shown verbatim, never rephrased. Refetch reruns the check.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import Badge from "../common/Badge";

export default function GuestPreview({ courseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/guest-preview/${courseId}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId]);

  return (
    <div className="panel">
      <div className="panel__title">Guest access?</div>
      {loading && <p className="muted">Loading…</p>}
      {!loading && error && <div className="error-banner">{error}</div>}
      {!loading && !error && data && (
        <div className="form-row">
          {data.guest_access ? (
            <>
              <Badge variant="green">enabled</Badge>
              <Badge variant={data.has_password ? "amber" : "neutral"}>
                {data.has_password ? "password required" : "no password"}
              </Badge>
            </>
          ) : (
            <Badge variant="grey">disabled</Badge>
          )}
          {data.reason && <span className="muted">{data.reason}</span>}
          <button className="btn" onClick={load}>
            Refetch
          </button>
        </div>
      )}
    </div>
  );
}
