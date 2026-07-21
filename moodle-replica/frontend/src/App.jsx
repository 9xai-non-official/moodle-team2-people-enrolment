import { useEffect, useState } from "react";
import { apiGet, USE_MOCKS } from "./api";
import { ActingUserProvider, useActingUser } from "./context/ActingUser";
import { SelectedCourseProvider } from "./context/SelectedCourse";
import { PAGES, NAV_ITEMS } from "./pages";
import "./App.css";

function ActingUserSelect() {
  const { users, actingUser, setActingUserId, error } = useActingUser();
  if (error) return <span className="acting-user">users: {error}</span>;
  return (
    <label className="acting-user">
      Acting as
      <select
        className="select select--header"
        value={actingUser?.id ?? ""}
        onChange={(e) => setActingUserId(Number(e.target.value))}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name} ({u.username})
          </option>
        ))}
      </select>
    </label>
  );
}

function Shell() {
  const [active, setActive] = useState("Dashboard");
  const [health, setHealth] = useState("checking");

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

  const Page = PAGES[active];

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          Moodle Replica
          {USE_MOCKS && <span className="mock-badge">MOCK DATA</span>}
        </div>
        <ActingUserSelect />
        <div className={`api-status api-status--${health}`}>
          <span className="dot" /> API: {health}
        </div>
      </header>

      <div className="app-body">
        <nav className="sidebar">
          {NAV_ITEMS.map((item) => (
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
    <ActingUserProvider>
      <SelectedCourseProvider>
        <Shell />
      </SelectedCourseProvider>
    </ActingUserProvider>
  );
}

export default App;
