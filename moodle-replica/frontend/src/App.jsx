import { useEffect, useState } from "react";
import { apiGet, USE_MOCKS } from "./api";
import { ActingUserProvider, useActingUser } from "./context/ActingUser";
import { SelectedCourseProvider } from "./context/SelectedCourse";
import { SessionProvider, useSession } from "./context/Session";
import { PAGES, navFor } from "./pages";
import AuthPage from "./pages/AuthPage";
import WelcomeTour, { tourSeen } from "./components/common/WelcomeTour";
import CommandPalette from "./components/common/CommandPalette";
import PersonaStrip from "./components/common/PersonaStrip";
import { personaBlurb, personaLabel } from "./lib/personas";
import { SCRIPT } from "./lib/presenterScript";
import "./App.css";

function ActingUserSelect() {
  const { users, actingUser, setActingUserId, error } = useActingUser();
  if (error) return <span className="acting-user">users: {error}</span>;
  return (
    <label
      className="acting-user"
      title={
        personaBlurb(actingUser?.username) ??
        "Everything you see and may do depends on who you are."
      }
    >
      Acting as
      <select
        className="select select--header"
        value={actingUser?.id ?? ""}
        onChange={(e) => setActingUserId(Number(e.target.value))}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name} — {personaLabel(u.username)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActivityBar() {
  const [busy, setBusy] = useState(0);
  useEffect(() => {
    const h = (e) => setBusy(e.detail);
    window.addEventListener("api-activity", h);
    return () => window.removeEventListener("api-activity", h);
  }, []);
  return busy > 0 ? <div className="activity-bar" /> : null;
}

function WriteToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let timer;
    const h = (e) => {
      const { method, path } = e.detail;
      const verb =
        method === "DELETE" ? "Removed" : method === "PATCH" ? "Updated" : "Saved";
      setMsg(`${verb} ✓ ${path.split("?")[0]}`);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2200);
    };
    window.addEventListener("api-write", h);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("api-write", h);
    };
  }, []);
  return msg ? <div className="toast">{msg}</div> : null;
}

function PresenterCard({ page }) {
  const steps = SCRIPT[page];
  if (!steps) return null;
  return (
    <div className="presenter-card">
      <div className="presenter-card__title">🎤 {page}</div>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function Shell() {
  const { session, signOut } = useSession();
  const { setActingUserId } = useActingUser();
  const [active, setActive] = useState("Dashboard");
  const [health, setHealth] = useState("checking");
  const navItems = navFor(session);
  const [tourOpen, setTourOpen] = useState(() => !tourSeen());
  const [presenter, setPresenter] = useState(
    () => localStorage.getItem("presenter") === "1",
  );

  function togglePresenter() {
    setPresenter((p) => {
      localStorage.setItem("presenter", p ? "0" : "1");
      return !p;
    });
  }

  // Keyboard nav: 1..N switch pages (ignored while typing in a field).
  useEffect(() => {
    function onKey(e) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < navItems.length) setActive(navItems[idx]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navItems]);

  // Signing out (or a role losing a page) never strands you on a dead page.
  useEffect(() => {
    if (!navItems.includes(active)) setActive("Dashboard");
  }, [navItems, active]);

  // Session drives identity: signed-in users ACT as themselves everywhere.
  useEffect(() => {
    if (session?.mode === "user" && session.user) setActingUserId(session.user.id);
  }, [session, setActingUserId]);

  // Command-palette meta actions dispatch these; Shell owns the state they touch.
  useEffect(() => {
    const openTour = () => setTourOpen(true);
    const togglePres = () =>
      setPresenter((p) => {
        localStorage.setItem("presenter", p ? "0" : "1");
        return !p;
      });
    window.addEventListener("open-tour", openTour);
    window.addEventListener("toggle-presenter", togglePres);
    return () => {
      window.removeEventListener("open-tour", openTour);
      window.removeEventListener("toggle-presenter", togglePres);
    };
  }, []);

  useEffect(() => {
    apiGet("/api/health")
      .then((data) => setHealth(data.status === "ok" ? "online" : "degraded"))
      .catch(() => setHealth("offline"));
  }, []);

  // Any error banner, clicked → bug-report line on the clipboard
  // ("[page] message") ready to paste at the owning teammate (task 06 §5).
  useEffect(() => {
    function copyError(e) {
      const banner = e.target.closest(".error-banner");
      if (!banner) return;
      const page = document.querySelector(".nav-item--active")?.textContent ?? "?";
      navigator.clipboard?.writeText(`[${page}] ${banner.textContent}`);
      const prev = banner.textContent;
      banner.textContent = "copied for bug report ✓";
      setTimeout(() => {
        banner.textContent = prev;
      }, 800);
    }
    document.addEventListener("click", copyError);
    return () => document.removeEventListener("click", copyError);
  }, []);

  if (!session) return <AuthPage />;

  const Page = PAGES[active];

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          WhoCan
          <span className="brand__sub">people &amp; enrolment</span>
          {USE_MOCKS && <span className="mock-badge">MOCK DATA</span>}
        </div>
        {session.mode === "explore" ? (
          <ActingUserSelect />
        ) : (
          <span className="acting-user" title="You act as yourself — sign out to switch people.">
            👤 {session.user?.full_name}
          </span>
        )}
        <button className="btn help-btn" title={session.mode === "explore" ? "Leave explore mode" : "Sign out"} onClick={signOut}>
          ⎋
        </button>
        <div className={`api-status api-status--${health}`}>
          <span className="dot" /> API: {health}
        </div>
        <button
          className={`btn help-btn ${presenter ? "help-btn--on" : ""}`}
          title="Presenter mode — pins the demo script for the current page"
          onClick={togglePresenter}
        >
          🎤
        </button>
        <button
          className="btn help-btn"
          title="What is this app? (tour)"
          onClick={() => setTourOpen(true)}
        >
          ?
        </button>
      </header>
      {session.mode === "explore" && <PersonaStrip />}
      <WelcomeTour open={tourOpen} onClose={() => setTourOpen(false)} />
      <CommandPalette onNavigate={setActive} />
      <ActivityBar />
      <WriteToast />
      {presenter && <PresenterCard page={active} />}

      <div className="app-body">
        <nav className="sidebar">
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-item ${active === item ? "nav-item--active" : ""}`}
              onClick={() => setActive(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <main className="content">
          <Page onNavigate={setActive} />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <ActingUserProvider>
        <SelectedCourseProvider>
          <Shell />
        </SelectedCourseProvider>
      </ActingUserProvider>
    </SessionProvider>
  );
}

export default App;
