// Dashboard — the app's thesis made visible: everything you see and can do
// depends on who you are. Carries the WhoCan brand from the login splash
// (navy/orange, bilingual EN | AR, tone-coloured cards). Headline counts read
// LIVE from the database (/api/stats + /api/health) and Recent activity from
// the real permission-decision log (/api/permissions/decisions) — no invented
// endpoints, no hard-coded production numbers.
import { useEffect, useRef, useState } from "react";
import { apiGet } from "../api";
import { fetchOverview } from "../lib/progressApi";
import { useActingUser } from "../context/ActingUser";
import { useSession } from "../context/Session";
import { navFor } from "./index";
import Badge from "../components/common/Badge";
import { PERSONAS, personaLabel } from "../lib/personas";

// Tone by role keyword — mirrors the login persona cards (blue/orange/purple).
function toneFor(username = "") {
  if (username.startsWith("admin")) return "navy";
  if (username.startsWith("teacher")) return "orange";
  if (username.startsWith("ta")) return "purple";
  return "blue";
}

// Role archetype (bilingual) from a username — used by the persona selector so
// each option reads as a Moodle role, not a raw account name.
function roleOf(username = "") {
  if (username.startsWith("admin")) return { en: "Admin", ar: "مدير" };
  if (username.startsWith("teacher")) return { en: "Teacher", ar: "مدرّس" };
  if (username.startsWith("ta")) return { en: "TA", ar: "مساعد تدريس" };
  if (username.startsWith("student")) return { en: "Student", ar: "طالب" };
  return { en: personaLabel(username), ar: "" };
}

// Thousands-formatted so a large count never overflows a card.
const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : n);

// created_at (ISO) → "YYYY-MM-DD HH:mm", the format the activity table uses.
function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? "");
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---- line icons (currentColor) — same stroke family as the login glyphs --- */
const G = {
  people: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6" />
      <path d="M16 4.7a3.3 3.3 0 0 1 0 6.6" />
      <path d="M18.5 14.2c2.2.6 3.5 2.6 3.5 5" />
    </>
  ),
  cap: (
    <>
      <path d="M12 4L2.5 8.5 12 13l9.5-4.5z" />
      <path d="M6 10.5V15c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.5" />
      <path d="M21.5 8.5v5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M8.5 11l1.7 1.7 3.3-3.4" />
      <path d="M8.5 16.5h4" />
    </>
  ),
  userplus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.5 0 2.9.5 4 1.3" />
      <path d="M16 12v6M19 15h-6" />
    </>
  ),
  group: (
    <>
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="16" cy="9" r="2.6" />
      <path d="M3.5 19c0-2.5 2-4.3 4.5-4.3S12.5 16.5 12.5 19" />
      <path d="M11.5 19c0-2.5 2-4.3 4.5-4.3s4.5 1.8 4.5 4.3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  lockshield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <rect x="9" y="11" width="6" height="5" rx="1" />
      <path d="M10.3 11V9.7a1.7 1.7 0 0 1 3.4 0V11" />
    </>
  ),
  shielduser: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <circle cx="12" cy="10" r="2.2" />
      <path d="M8.4 16.2c0-2 1.6-3.2 3.6-3.2s3.6 1.2 3.6 3.2" />
    </>
  ),
  trending: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l3.5-4 3 2.5L21 7" />
      <path d="M21 11V7h-4" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-.9 4.5" />
      <path d="M20 5v6h-6" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12.5l4 4 10-10" />,
};

function Icon({ d, className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {G[d]}
    </svg>
  );
}

// The four headline counts (spec §Statistics). `key` maps into /api/stats; `nav`
// (when the current role may open it) makes the card a shortcut into its page.
const STATS = [
  { key: "users", en: "Users", ar: "المستخدمون", icon: "people", tone: "blue", nav: "Enrolment" },
  { key: "courses", en: "Courses", ar: "المقررات", icon: "cap", tone: "orange", nav: "Courses" },
  { key: "enrolments", en: "Enrolments", ar: "التسجيلات", icon: "clipboard", tone: "cyan", nav: "Enrolment" },
  { key: "groups", en: "Groups", ar: "المجموعات", icon: "group", tone: "purple", nav: "Groups" },
];

// "First five minutes" — five things a new admin does, in order. Each row jumps
// to the real page that does it (gated by the role's nav).
const QUICKSTART = [
  { n: 1, en: "Add a user", ar: "إضافة مستخدم", de: "Create users and set basic details.", da: "أنشئ المستخدمين وحدد البيانات الأساسية.", icon: "userplus", tone: "blue", nav: "Enrolment" },
  { n: 2, en: "Create a course", ar: "إنشاء مقرر", de: "Set up your first course.", da: "قم بإعداد مقررك الأول.", icon: "cap", tone: "blue", nav: "Courses" },
  { n: 3, en: "Enrol users", ar: "تسجيل المستخدمين", de: "Add learners to your courses.", da: "أضف المتعلمين إلى مقرراتك.", icon: "userplus", tone: "green", nav: "Enrolment" },
  { n: 4, en: "Create a group", ar: "إنشاء مجموعة", de: "Organize learners into groups.", da: "نظّم المتعلمين ضمن مجموعات.", icon: "group", tone: "cyan", nav: "Groups" },
  { n: 5, en: "Track progress", ar: "تتبّع التقدم", de: "View activity and completion.", da: "اعرض النشاط وحالة الإكمال.", icon: "trending", tone: "blue", nav: "Progress" },
];

function ProgressBar({ percent }) {
  if (percent === null || percent === undefined) {
    return <span className="dash-prog__none">no completion tracking · لا يوجد تتبّع</span>;
  }
  return (
    <div className="dash-prog__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="dash-prog__fill" style={{ width: `${percent}%` }} />
      <span className="dash-prog__pct">{percent}%</span>
    </div>
  );
}

/* ---- persona selector — "Who are you acting as?" ------------------------- */
// Radio-group pattern (roving tabindex + arrow keys). In explore/demo mode it
// switches the acting user; in a real sign-in it is read-only — the frontend
// is never a security boundary, and impersonation isn't offered when signed in.
function PersonaSelector({ personas, actingUser, setActingUserId, explore }) {
  const refs = useRef([]);
  const activeIdx = Math.max(0, personas.findIndex((u) => u.id === actingUser?.id));
  const activeRole = actingUser ? roleOf(actingUser.username) : null;

  function onKey(e) {
    if (!explore) return;
    const last = personas.length - 1;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = activeIdx >= last ? 0 : activeIdx + 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = activeIdx <= 0 ? last : activeIdx - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setActingUserId(personas[next].id);
    refs.current[next]?.focus();
  }

  return (
    <section className="panel-card persona-picker" aria-labelledby="persona-h">
      <header className="panel-card__head">
        <span className="panel-card__ic panel-card__ic--blue" aria-hidden="true">
          <Icon d="shielduser" />
        </span>
        <h2 id="persona-h" className="panel-card__title">
          Who are you acting as?<span className="dash-ar">من تمثّل؟</span>
        </h2>
      </header>

      <div
        className="persona-picker__grid"
        role="radiogroup"
        aria-label="Acting persona / تمثيل الشخصية"
        onKeyDown={onKey}
      >
        {personas.map((u, i) => {
          const on = u.id === actingUser?.id;
          const role = roleOf(u.username);
          const tone = toneFor(u.username);
          const selectable = explore || on;
          return (
            <button
              key={u.id}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={!selectable}
              tabIndex={on ? 0 : -1}
              disabled={!selectable}
              title={PERSONAS[u.username]?.blurb}
              className={`persona-opt persona-opt--${tone} ${on ? "persona-opt--on" : ""}`}
              onClick={() => selectable && setActingUserId(u.id)}
            >
              {on && (
                <span className="persona-opt__badge" aria-hidden="true">
                  <Icon d="check" />
                </span>
              )}
              <span className="persona-opt__avatar" aria-hidden="true">
                {(u.full_name?.[0] ?? "?").toUpperCase()}
              </span>
              <span className="persona-opt__role">{role.en}</span>
              <span className="persona-opt__role-ar" lang="ar">{role.ar}</span>
            </button>
          );
        })}
      </div>

      <div className="persona-picker__note">
        <p>
          You are viewing the system as <strong>{activeRole?.en ?? "—"}</strong>.
          <span className="dash-ar" lang="ar">
            أنت تتصفح النظام بصفة <strong>{activeRole?.ar ?? "—"}</strong>.
          </span>
        </p>
        {!explore && (
          <p className="persona-picker__locked">
            Sign out to act as someone else.
            <span className="dash-ar" lang="ar">سجّل الخروج لتتصرف بصفة شخص آخر.</span>
          </p>
        )}
        <Icon d="shielduser" className="persona-picker__art" />
      </div>
    </section>
  );
}

/* ---- recent activity — real permission-decision log ---------------------- */
function RecentActivity({ onNavigate, canViewAll }) {
  const [rows, setRows] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(null);
    apiGet("/api/permissions/decisions?limit=6")
      .then((r) => alive && setRows(Array.isArray(r) ? r : []))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [reload]);

  return (
    <section className="panel-card activity" aria-labelledby="activity-h">
      <header className="panel-card__head">
        <span className="panel-card__ic panel-card__ic--blue" aria-hidden="true">
          <Icon d="clock" />
        </span>
        <h2 id="activity-h" className="panel-card__title">
          Recent activity<span className="dash-ar">النشاط الأخير</span>
        </h2>
        <span className="activity__src">permission decisions · قرارات الصلاحيات</span>
      </header>

      {error ? (
        <div className="panel-card__state">
          <div className="error-banner">{error}</div>
          <button className="dash-retry" onClick={() => setReload((k) => k + 1)}>
            <Icon d="refresh" /> Retry<span className="dash-ar">إعادة</span>
          </button>
        </div>
      ) : rows && rows.length === 0 ? (
        <div className="panel-card__state dash-empty dash-empty--inset">
          <Icon d="clock" className="dash-empty__icon" />
          <p>
            No recent activity yet.<span className="dash-ar">لا يوجد نشاط حديث بعد.</span>
          </p>
        </div>
      ) : (
        <div className="activity__scroll">
          <table className="activity__table">
            <thead>
              <tr>
                <th scope="col">Time <span className="dash-ar">الوقت</span></th>
                <th scope="col">Event <span className="dash-ar">الحدث</span></th>
                <th scope="col">Details <span className="dash-ar">التفاصيل</span></th>
                <th scope="col">Actor <span className="dash-ar">المنفّذ</span></th>
              </tr>
            </thead>
            <tbody>
              {rows === null
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="activity__row activity__row--skel">
                      <td colSpan={4}><span className="activity__skel" /></td>
                    </tr>
                  ))
                : rows.map((r) => {
                    const ok = r.verdict === "allowed";
                    return (
                      <tr className="activity__row" key={r.id}>
                        <td data-label="Time">
                          <span className="activity__time">{fmtTime(r.created_at)}</span>
                        </td>
                        <td data-label="Event">
                          <span className="activity__event">
                            <span className={`activity__dot activity__dot--${ok ? "ok" : "no"}`} aria-hidden="true">
                              <Icon d="shield" />
                            </span>
                            <span>
                              Permission check
                              <span className="dash-ar">فحص صلاحية</span>
                              <Badge variant={ok ? "green" : "red"}>{r.verdict}</Badge>
                            </span>
                          </span>
                        </td>
                        <td data-label="Details">
                          <span className="activity__cap">{r.capability}</span>
                          {r.context_label && (
                            <span className="activity__sub">{r.context_label}</span>
                          )}
                        </td>
                        <td data-label="Actor">{r.actor?.full_name ?? "—"}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {canViewAll && (
        <footer className="panel-card__foot">
          <button className="dash-link" onClick={() => onNavigate("Roles")}>
            View all activity<span className="dash-ar">عرض كل النشاط</span>
            <Icon d="arrow" className="dash-link__arw" />
          </button>
        </footer>
      )}
    </section>
  );
}

/* ---- permission-aware access — static explainer -------------------------- */
function PermissionAwareCard({ onNavigate, canLearnMore }) {
  return (
    <section className="panel-card permcard" aria-labelledby="perm-h">
      <span className="permcard__badge" aria-hidden="true">
        <Icon d="lockshield" />
      </span>
      <h2 id="perm-h" className="permcard__title">
        Permission-aware access
        <span className="dash-ar" lang="ar">الوصول وفق الصلاحيات</span>
      </h2>
      <p className="permcard__body" lang="en">
        Your view and actions are limited to what you are permitted to see and do.
        Content and data shown here reflect your current role and permissions.
      </p>
      <p className="permcard__body permcard__body--ar" lang="ar" dir="rtl">
        عرضك وإجراءاتك مقيّدة بما يُسمح لك برؤيته والقيام به. المحتوى والبيانات
        المعروضة هنا تعكس دورك وصلاحياتك الحالية.
      </p>
      {canLearnMore && (
        <footer className="panel-card__foot">
          <button className="dash-link" onClick={() => onNavigate("Roles")}>
            Learn more<span className="dash-ar">اعرف المزيد</span>
            <Icon d="arrow" className="dash-link__arw" />
          </button>
        </footer>
      )}
    </section>
  );
}

export default function DashboardPage({ onNavigate }) {
  const { actingUser, users, setActingUserId } = useActingUser();
  const { session } = useSession();
  const explore = session?.mode === "explore";
  const allowed = navFor(session);

  const [live, setLive] = useState(null); // { users, courses, enrolments, groups, roles, capabilities }
  const [liveError, setLiveError] = useState(null);
  const [reload, setReload] = useState(0);
  const [overview, setOverview] = useState([]);
  const [overviewError, setOverviewError] = useState(null);

  // Live counts straight from the DB: /api/stats + the DB block of /api/health.
  useEffect(() => {
    let alive = true;
    setLive(null);
    setLiveError(null);
    Promise.all([apiGet("/api/stats"), apiGet("/api/health").catch(() => null)])
      .then(([stats, health]) => {
        if (!alive) return;
        const db = health && typeof health.database === "object" ? health.database : {};
        setLive({ ...stats, roles: db.roles, capabilities: db.capabilities });
      })
      .catch((e) => alive && setLiveError(e.message));
    return () => {
      alive = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!actingUser) return;
    setOverview([]);
    setOverviewError(null);
    fetchOverview(actingUser.id)
      .then(({ rows }) => setOverview(rows))
      .catch((e) => setOverviewError(e.message));
  }, [actingUser]);

  const firstName = actingUser?.full_name?.split(" ")[0];
  const roleLabel = actingUser ? personaLabel(actingUser.username) : null;
  const personas = users.filter((u) => PERSONAS[u.username]);
  // A signed-in user who isn't a seeded persona still appears (as themselves).
  if (actingUser && !PERSONAS[actingUser.username] && !personas.some((u) => u.id === actingUser.id)) {
    personas.unshift(actingUser);
  }

  return (
    <div className="dash">
      {/* PAGE TITLE — one clear h1, bilingual */}
      <div className="dash-title">
        <h1>
          Dashboard<span className="dash-title__ar" lang="ar">لوحة التحكم</span>
        </h1>
      </div>

      {/* HERO — greeting + the whole app's thesis, bilingual like the login */}
      <section className="dash-hero">
        <div className="dash-hero__text">
          <p className="dash-hero__eyebrow">
            people &amp; enrolment <span className="dash-ar">الأشخاص والتسجيل</span>
          </p>
          <p className="dash-hero__title">
            {explore ? "Try being someone" : firstName ? `Welcome back, ${firstName}` : "Welcome"}
            <span className="dash-hero__title-ar" lang="ar">
              {explore ? "جرّب أن تكون شخصاً آخر" : firstName ? `أهلاً ${firstName}` : "أهلاً"}
            </span>
          </p>
          <p className="dash-hero__lede">
            Everything you can see and do depends on who you are.
            <span className="dash-ar" lang="ar">كل ما تراه وما يمكنك فعله يعتمد على هويتك.</span>
          </p>
        </div>
        {actingUser && (
          <div className={`dash-whoami dash-whoami--${toneFor(actingUser.username)}`}>
            <span className="dash-whoami__avatar" aria-hidden="true">
              {(firstName?.[0] ?? "?").toUpperCase()}
            </span>
            <span className="dash-whoami__meta">
              <span className="dash-whoami__name">{actingUser.full_name}</span>
              {roleLabel && <span className="dash-whoami__role">{roleLabel}</span>}
            </span>
          </div>
        )}
      </section>

      {/* YOUR WORLD — the four live headline counts */}
      <section className="dash-section" aria-labelledby="world-h">
        <div className="dash-section__head">
          <h2 id="world-h">
            Your world <span className="dash-ar">عالمك</span>
          </h2>
          <span className={`dash-live ${liveError ? "dash-live--off" : ""}`} title={liveError ?? "Counts read live from the database"}>
            <span className="dash-live__dot" />
            {liveError ? "database unreachable" : "live from database"}
            <span className="dash-ar">{liveError ? "تعذّر الوصول" : "مباشر من قاعدة البيانات"}</span>
          </span>
        </div>

        {liveError && (
          <div className="dash-staterow">
            <div className="error-banner">{liveError}</div>
            <button className="dash-retry" onClick={() => setReload((k) => k + 1)}>
              <Icon d="refresh" /> Retry<span className="dash-ar">إعادة</span>
            </button>
          </div>
        )}

        <div className="stat-grid">
          {STATS.map((s) => {
            const val = live ? live[s.key] : undefined;
            const canNav = allowed.includes(s.nav);
            const missing = live && (val === undefined || val === null);
            const Tag = canNav ? "button" : "div";
            return (
              <Tag
                key={s.key}
                className={`stat stat--${s.tone} ${canNav ? "stat--nav" : ""}`}
                {...(canNav
                  ? { type: "button", onClick: () => onNavigate(s.nav), "aria-label": `${s.en}: ${live ? fmt(val) : "loading"} — open ${s.nav}` }
                  : {})}
              >
                <span className="stat__icon" aria-hidden="true">
                  <Icon d={s.icon} />
                </span>
                <span className="stat__body">
                  <span className="stat__label">
                    {s.en}
                    <span className="dash-ar">{s.ar}</span>
                  </span>
                  <span className="stat__value">
                    {live === null && !liveError ? (
                      <span className="stat__skel" />
                    ) : liveError || missing ? (
                      "—"
                    ) : (
                      fmt(val)
                    )}
                  </span>
                </span>
                {canNav && <Icon d="arrow" className="stat__go" />}
                <span className="stat__accent" aria-hidden="true" />
              </Tag>
            );
          })}
        </div>

        {live && (live.roles != null || live.capabilities != null) && (
          <p className="dash-alsolive">
            Also live:{" "}
            {live.roles != null && <><strong>{fmt(live.roles)}</strong> roles</>}
            {live.roles != null && live.capabilities != null && " · "}
            {live.capabilities != null && <><strong>{fmt(live.capabilities)}</strong> capabilities</>}
            <span className="dash-ar">أيضاً مباشر: الأدوار والصلاحيات</span>
          </p>
        )}
      </section>

      {/* SECOND ROW — first five minutes + who are you acting as */}
      <div className="dash-row dash-row--40-60">
        <section className="panel-card quickstart" aria-labelledby="qs-h">
          <header className="panel-card__head">
            <span className="panel-card__ic panel-card__ic--blue" aria-hidden="true">
              <Icon d="clock" />
            </span>
            <h2 id="qs-h" className="panel-card__title">
              First five minutes<span className="dash-ar">أول خمس دقائق</span>
            </h2>
          </header>
          <ol className="quickstart__list">
            {QUICKSTART.map((q) => {
              const canNav = allowed.includes(q.nav);
              const Tag = canNav ? "button" : "div";
              return (
                <li key={q.n}>
                  <Tag
                    className={`qs-row qs-row--${q.tone} ${canNav ? "qs-row--nav" : "qs-row--static"}`}
                    {...(canNav ? { type: "button", onClick: () => onNavigate(q.nav) } : {})}
                  >
                    <span className="qs-row__step" aria-hidden="true">{q.n}</span>
                    <span className="qs-row__ic" aria-hidden="true">
                      <Icon d={q.icon} />
                    </span>
                    <span className="qs-row__text">
                      <span className="qs-row__title">
                        {q.en}<span className="dash-ar">{q.ar}</span>
                      </span>
                      <span className="qs-row__desc">
                        {q.de}<span className="dash-ar" lang="ar">{q.da}</span>
                      </span>
                    </span>
                    {canNav && <Icon d="arrow" className="qs-row__go" />}
                  </Tag>
                </li>
              );
            })}
          </ol>
          {allowed.includes("Demos") && (
            <footer className="panel-card__foot">
              <button className="dash-link" onClick={() => onNavigate("Demos")}>
                View all guides<span className="dash-ar">عرض كل الأدلة</span>
                <Icon d="arrow" className="dash-link__arw" />
              </button>
            </footer>
          )}
        </section>

        <PersonaSelector
          personas={personas}
          actingUser={actingUser}
          setActingUserId={setActingUserId}
          explore={explore}
        />
      </div>

      {/* THIRD ROW — recent activity + permission-aware access */}
      <div className="dash-row dash-row--70-30">
        <RecentActivity onNavigate={onNavigate} canViewAll={allowed.includes("Roles")} />
        <PermissionAwareCard onNavigate={onNavigate} canLearnMore={allowed.includes("Roles")} />
      </div>

      {/* MY PROGRESS — real per-user completion (kept from the existing app) */}
      <section className="dash-section" aria-labelledby="prog-h">
        <div className="dash-section__head">
          <h2 id="prog-h">
            My progress <span className="dash-ar">تقدّمي</span>
            {actingUser && <small className="dash-section__sub">{actingUser.full_name}</small>}
          </h2>
        </div>
        {overviewError && <div className="error-banner">{overviewError}</div>}
        {!overviewError && overview.length === 0 && (
          <div className="dash-empty">
            <Icon d="spark" className="dash-empty__icon" />
            <p>
              No course enrolments yet.
              <span className="dash-ar" lang="ar">لا توجد تسجيلات بعد.</span>
            </p>
            {allowed.includes("Courses") && (
              <button className="dash-empty__cta" onClick={() => onNavigate("Courses")}>
                Browse courses <Icon d="arrow" className="dash-link__arw" />
              </button>
            )}
          </div>
        )}
        {overview.length > 0 && (
          <div className="progress-deck">
            {overview.map((row) => (
              <article className="prog-card" key={row.course.id}>
                <header className="prog-card__head">
                  <span className="prog-card__name">{row.course.short_name}</span>
                  {row.course.deleted && (
                    <Badge variant="amber" title="served from snapshots">
                      archived
                    </Badge>
                  )}
                </header>
                <ProgressBar percent={row.percent} />
                {row.completed_at && (
                  <p className="prog-card__done">completed {row.completed_at}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
