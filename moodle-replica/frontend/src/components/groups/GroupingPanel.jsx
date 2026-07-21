// Groupings are sets of groups (never users) — the banner states it because it
// is the thing everyone gets wrong. One .panel per grouping, group chips inside.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";

export default function GroupingPanel({ courseId }) {
  const [groupings, setGroupings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/groups/courses/${courseId}/groupings`)
      .then(setGroupings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <div>
      <div className="banner-info">groupings contain groups, not users</div>
      {loading && <p className="muted">Loading groupings…</p>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && !error && groupings.length === 0 && (
        <p className="muted">No groupings in this course.</p>
      )}
      {!loading &&
        !error &&
        groupings.map((g) => (
          <div className="panel" key={g.id}>
            <div className="panel__title">{g.name}</div>
            <div>
              {g.groups.length === 0 && <span className="muted">no groups</span>}
              {g.groups.map((grp) => (
                <span className="chip" key={grp.id}>
                  {grp.name}
                </span>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
