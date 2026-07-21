import { useEffect, useState } from "react";
import { apiGet } from "./api";
import Dashboard from "./components/Dashboard";
import "./App.css";

// Placeholder navigation — just the Dashboard for now; add sections later.
const NAV_ITEMS = ["Dashboard"];

function App() {
  const [active, setActive] = useState("Dashboard");
  const [health, setHealth] = useState("checking");

  useEffect(() => {
    apiGet("/api/health")
      .then((data) => setHealth(data.status === "ok" ? "online" : "degraded"))
      .catch(() => setHealth("offline"));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">Moodle Replica</div>
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
          {active === "Dashboard" ? (
            <Dashboard />
          ) : (
            <p className="placeholder">Nothing here yet.</p>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
