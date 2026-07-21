// Dashboard (task 06 §4.1): seeded counts, acting user's progress strip,
// API health recap + links into the four sections.
import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { fetchOverview } from "../lib/progressApi";
import { useActingUser } from "../context/ActingUser";
import Badge from "../components/common/Badge";

const SECTIONS = ["Enrolment", "Roles", "Groups", "Progress"];

function ProgressBar({ percent }) {
  // null percent renders NO bar — exactly like Moodle, not 0% (§4.1).
  if (percent === null || percent === undefined) {
    return <span className="muted">no completion tracking</span>;
  }
  return (
    <div className="bar">
      <div className="bar__fill" style={{ width: `${percent}%` }} />
      <span className="bar__label">{percent}%</span>
    </div>
  );
}

export default function DashboardPage({ onNavigate }) {
  const { actingUser } = useActingUser();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [overview, setOverview] = useState([]);
  const [overviewError, setOverviewError] = useState(null);

  useEffect(() => {
    apiGet("/api/stats").then(setStats).catch((e) => setStatsError(e.message));
  }, []);

  useEffect(() => {
    if (!actingUser) return;
    setOverview([]);
    setOverviewError(null);
    fetchOverview(actingUser.id)
      .then(({ rows }) => setOverview(rows))
      .catch((e) => setOverviewError(e.message));
  }, [actingUser]);

  return (
    <div>
      <h1>Dashboard</h1>

      {statsError && <div className="error-banner">{statsError}</div>}
      <div className="grid-cards">
        {["users", "courses", "enrolments", "groups"].map((k) => (
          <div className="card card--stat" key={k}>
            <div className="card__number">{stats ? stats[k] : "…"}</div>
            <div className="card__label">{k}</div>
          </div>
        ))}
      </div>

      <h2>My progress {actingUser && <small>— {actingUser.full_name}</small>}</h2>
      {overviewError && <div className="error-banner">{overviewError}</div>}
      {!overviewError && overview.length === 0 && (
        <p className="muted">No course enrolments for this user.</p>
      )}
      <div className="progress-strip">
        {overview.map((row) => (
          <div className="card" key={`${row.course.id}`}>
            <div className="card__title">
              {row.course.short_name}
              {row.course.deleted && (
                <Badge variant="amber" title="served from snapshots">
                  deleted
                </Badge>
              )}
            </div>
            <ProgressBar percent={row.percent} />
            {row.completed_at && (
              <div className="muted">completed {row.completed_at}</div>
            )}
          </div>
        ))}
      </div>

      <h2>Sections</h2>
      <div className="grid-cards">
        {SECTIONS.map((s) => (
          <button key={s} className="card card--link" onClick={() => onNavigate(s)}>
            {s} →
          </button>
        ))}
      </div>
    </div>
  );
}
