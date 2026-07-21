// History tab (HC-5): completion snapshots over time. Must render courses that
// exist nowhere else in the UI (HIST9 is deleted and its only user, ghada, is
// hidden from /api/users) — so user + course are both optional filters and the
// default query (no user) returns every snapshot, including the orphaned ones.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import Badge from "../common/Badge";
import UserSelect from "../common/UserSelect";
import CourseSelect from "../common/CourseSelect";

export default function HistoryTimeline() {
  const [userId, setUserId] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [snaps, setSnaps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function run(fromOverride) {
    setLoading(true);
    setError(null);
    const effFrom = fromOverride !== undefined ? fromOverride : from;
    const params = new URLSearchParams();
    if (userId) params.set("user_id", userId);
    if (courseId) params.set("course_id", courseId);
    if (effFrom) params.set("from", effFrom);
    if (to) params.set("to", to);
    const qs = params.toString();
    apiGet(`/api/progress/snapshots${qs ? `?${qs}` : ""}`)
      .then(setSnaps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    run(); // initial: all snapshots, chronological
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="form-row">
        <label>User</label>
        <UserSelect value={userId} onChange={setUserId} placeholder="— all users —" />
        <label>Course</label>
        <CourseSelect value={courseId} onChange={setCourseId} includeDeleted autoSelectFirst={false} />
        <label>From</label>
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <label>To</label>
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="btn btn--primary" onClick={() => run()}>
          Search
        </button>
      </div>
      <div className="form-row">
        {[
          { label: "All time", years: null },
          { label: "Past year", years: 1 },
          { label: "Past 3 years", years: 3 },
        ].map((r) => (
          <button
            key={r.label}
            className="btn"
            onClick={() => {
              const f = r.years
                ? new Date(Date.now() - r.years * 365 * 86400e3).toISOString().slice(0, 10)
                : "";
              setFrom(f);
              run(f);
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="muted">
        tip: query without a user to see all snapshots — including users hidden from the directory
        (e.g. deleted-course history).
      </p>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && !error && snaps && snaps.length === 0 && (
        <p className="muted">
          No snapshots for this query — clear the filters ("All time", no user)
          to see everything, including deleted-course history.
        </p>
      )}
      {!loading &&
        !error &&
        snaps &&
        snaps.map((s) => (
          <div className="panel" key={s.id}>
            <div className="panel__title">
              {s.taken_at} ({(() => {
                const y = (Date.now() - new Date(s.taken_at)) / (365 * 86400e3);
                return y < 1 ? "this year" : `${Math.round(y)}y ago`;
              })()}) — {s.course.short_name}
              {s.course.deleted && (
                <Badge variant="amber" title="served from snapshots">
                  deleted — served from snapshots
                </Badge>
              )}
            </div>
            <div className="bar" style={{ maxWidth: "260px" }}>
              <div className="bar__fill" style={{ width: `${s.percent}%` }} />
              <span className="bar__label">{s.percent}%</span>
            </div>
            {s.note && <div className="muted">{s.note}</div>}
          </div>
        ))}
    </div>
  );
}
