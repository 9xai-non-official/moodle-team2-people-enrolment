// Dashboard (task 06 §4.1): the page reads as a story — you are somebody →
// try being someone else → here's your world. The persona switch leads (the
// whole app's thesis is that everything depends on who you are); seeded counts,
// your progress and the section jumps follow as "your world".
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../api";
import { fetchOverview } from "../lib/progressApi";
import { useActingUser } from "../context/ActingUser";
import { useSession } from "../context/Session";
import { navFor } from "./index";
import Badge from "../components/common/Badge";
import PageIntro from "../components/common/PageIntro";
import FirstFiveMinutes from "../components/common/FirstFiveMinutes";
import ReasonList from "../components/common/ReasonList";
import { PERSONAS, personaLabel } from "../lib/personas";

// Own-account maintenance — name + password, right on the dashboard.
// Any signed-in role; explore mode doesn't own an account to edit.
function ProfileEditor({ user }) {
  const { addUser } = useActingUser();
  const { session, signIn } = useSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const updated = await apiPatch("/api/auth/profile", {
        user_id: user.id,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        current_password: form.current_password,
        new_password: form.new_password || undefined,
      });
      addUser(updated);
      signIn({ ...session, user: updated });
      setSaved(true);
      setForm({});
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="panel">
      <button className="panel__title panel__toggle" onClick={() => setOpen((v) => !v)}>
        ⚙️ My account {open ? "▾" : "▸"}
      </button>
      {open && (
        <form onSubmit={save}>
          <div className="form-row">
            <input className="input" placeholder={user.first_name} value={form.first_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            <input className="input" placeholder={user.last_name} value={form.last_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="form-row">
            <input className="input" type="password" placeholder="Current password" autoComplete="current-password" value={form.current_password ?? ""} onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))} />
            <input className="input" type="password" placeholder="New password (optional)" autoComplete="new-password" value={form.new_password ?? ""} onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))} />
            <button className="btn btn--primary">Save</button>
          </div>
          {saved && <p className="muted">✓ saved</p>}
          {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}
        </form>
      )}
    </div>
  );
}

// After a switch, point the user at the page where that persona's story is most
// visible. Presentational navigation hint only — no permission logic here.
const PERSONA_LOOK = {
  admin1: "Enrolment",
  "teacher.a": "Enrolment",
  "ta.a": "Groups",
  "ta.allgroups": "Groups",
  "student.a": "Enrolment",
  "student.multi": "Groups",
  "student.b": "Progress",
  "student.susp": "Enrolment",
};

// Each headline count opens the page it belongs to.
const STAT_NAV = {
  users: "Enrolment",
  courses: "Enrolment",
  enrolments: "Enrolment",
  groups: "Groups",
};

// Section jump-cards; the two we already hold a count for show it live.
const SECTIONS = [
  { name: "Enrolment", stat: "enrolments" },
  { name: "Roles", stat: null },
  { name: "Groups", stat: "groups" },
  { name: "Progress", stat: null },
];

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
  const { session } = useSession();
  const explore = session?.mode === "explore";
  const allowed = navFor(session); // students never get dead links to hidden pages
  // Site-wide counts are staff furniture — a student's dashboard is THEIR
  // world: courses, progress, and what they're still waiting on.
  const plainStudent =
    session?.mode === "user" && !session.is_admin && !(session.teaches?.length > 0);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [overview, setOverview] = useState([]);
  const [overviewError, setOverviewError] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [myGrades, setMyGrades] = useState([]);

  useEffect(() => {
    if (plainStudent) return;
    apiGet("/api/stats").then(setStats).catch((e) => setStatsError(e.message));
  }, [plainStudent]);

  useEffect(() => {
    if (!plainStudent || !actingUser) return;
    apiGet(`/api/lms/my-requests?user_id=${actingUser.id}`)
      .then(setMyRequests)
      .catch(() => setMyRequests([]));
    apiGet(`/api/lms/my-grades?user_id=${actingUser.id}`)
      .then(setMyGrades)
      .catch(() => setMyGrades([]));
  }, [plainStudent, actingUser]);

  useEffect(() => {
    if (!actingUser) return;
    setOverview([]);
    setOverviewError(null);
    fetchOverview(actingUser.id)
      .then(({ rows }) => setOverview(rows))
      .catch((e) => setOverviewError(e.message));
  }, [actingUser]);

  const lookAt = actingUser ? PERSONA_LOOK[actingUser.username] : null;

  return (
    <div>
      <h1>Dashboard</h1>
      <PageIntro
        line={
          explore
            ? "You are somebody — try being someone else, then explore your world."
            : "Your world at a glance — everything here is scoped to you."
        }
      />

      {/* TRY BEING SOMEONE ELSE — the hero in explore mode: everything
          downstream depends on who you are, so the switch leads. Signed-in
          users are locked to themselves (that's what signing in means). */}
      {explore ? (
        <>
          <h2>Try being somebody</h2>
          {actingUser && (
            <p className="muted">
              Right now you are <strong>{actingUser.full_name}</strong>. Switch
              below to see the app through someone else&apos;s eyes.
            </p>
          )}
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
        </>
      ) : (
        actingUser && (
          <p className="muted">
            Welcome back, <strong>{actingUser.full_name}</strong> — this whole
            app shows only what <em>you</em> may see and do.
          </p>
        )
      )}
      {explore && lookAt && (
        <p className="look-at" key={actingUser.id}>
          now look at:{" "}
          <button
            className="page-intro__more"
            onClick={() => onNavigate(lookAt)}
          >
            {lookAt} →
          </button>
        </p>
      )}

      {!explore && actingUser && <ProfileEditor user={actingUser} />}
      {explore && <FirstFiveMinutes onNavigate={onNavigate} />}

      {/* HERE'S YOUR WORLD — staff see site counts; a student sees what
          THEY are waiting on and where to go next. */}
      {plainStudent ? (
        <>
          {myRequests.length > 0 && (
            <>
              <h2>My enrolment requests</h2>
              {myRequests.map((r) => (
                <div className="form-row" key={r.id}>
                  <strong>{r.course?.short_name}</strong>
                  <span className="muted">“{r.message}”</span>
                  <Badge
                    variant={r.status === "pending" ? "blue" : r.status === "approved" ? "green" : "red"}
                  >
                    {r.status === "pending" ? "waiting for a teacher" : r.status}
                  </Badge>
                </div>
              ))}
            </>
          )}
          <div className="grid-cards">
            <button className="card card--link" onClick={() => onNavigate("Courses")}>
              <div className="card__title">My courses →</div>
              <span className="muted">continue working, or find a new course</span>
            </button>
            <button className="card card--link" onClick={() => onNavigate("Progress")}>
              <div className="card__title">My progress →</div>
              <span className="muted">what counts, and how far you are</span>
            </button>
          </div>
          {myGrades.length > 0 && (
            <>
              <h2>My grades</h2>
              {myGrades.map((g, i) => (
                <div className="form-row" key={i}>
                  <Badge variant="neutral">{g.course}</Badge>
                  <span>{g.activity}</span>
                  <Badge variant="green">
                    {g.score}/{g.max}
                  </Badge>
                  {g.feedback && <span className="muted">“{g.feedback}”</span>}
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          <h2>Your world</h2>
          {statsError && <div className="error-banner">{statsError}</div>}
          <div className="grid-cards">
            {["users", "courses", "enrolments", "groups"].map((k) => (
              <button
                className="card card--stat"
                key={k}
                title={allowed.includes(STAT_NAV[k]) ? `Open ${STAT_NAV[k]} →` : undefined}
                onClick={() => allowed.includes(STAT_NAV[k]) && onNavigate(STAT_NAV[k])}
              >
                <div className="card__number">{stats ? stats[k] : "…"}</div>
                <div className="card__label">{k}</div>
              </button>
            ))}
          </div>
        </>
      )}

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

      {!plainStudent && (
        <>
          <h2>Sections</h2>
          <div className="grid-cards">
            {SECTIONS.filter((s) => allowed.includes(s.name)).map((s) => (
              <button
                key={s.name}
                className="card card--link section-card"
                onClick={() => onNavigate(s.name)}
              >
                <span>{s.name} →</span>
                {s.stat && stats && <span className="muted">{stats[s.stat]}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
