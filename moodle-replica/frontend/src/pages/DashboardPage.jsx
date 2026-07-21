// Dashboard (task 06 §4.1): seeded counts, acting user's progress strip,
// API health recap + links into the four sections.
import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { fetchOverview } from "../lib/progressApi";
import { useActingUser } from "../context/ActingUser";
import Badge from "../components/common/Badge";
import PageIntro from "../components/common/PageIntro";
import FirstFiveMinutes from "../components/common/FirstFiveMinutes";
import { PERSONAS, personaLabel } from "../lib/personas";

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
  const { actingUser, users, setActingUserId } = useActingUser();
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
      <PageIntro line="The overview: counts, your progress, and who you can be." />

      {statsError && <div className="error-banner">{statsError}</div>}
      <div className="grid-cards">
        {["users", "courses", "enrolments", "groups"].map((k) => (
          <div className="card card--stat" key={k}>
            <div className="card__number">{stats ? stats[k] : "…"}</div>
            <div className="card__label">{k}</div>
          </div>
        ))}
      </div>

      <h2>Try being somebody</h2>
      <div className="form-row persona-chips">
        {users
          .filter((u) => PERSONAS[u.username])
          .map((u) => (
            <span
              key={u.id}
              className="chip"
              title={PERSONAS[u.username].blurb}
              onClick={() => setActingUserId(u.id)}
              style={
                actingUser?.id === u.id
                  ? { outline: "2px solid #1a73e8" }
                  : undefined
              }
            >
              {personaLabel(u.username)}
            </span>
          ))}
      </div>
      <p className="muted">
        Everything in this app depends on who you are — switch and watch pages
        change.
      </p>

      <FirstFiveMinutes onNavigate={onNavigate} />

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
