import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "../api";
import ProgressBar from "./ProgressBar";

/**
 * Course progress & completion dashboard.
 * Shows every participant's calculated % and their manual-completion toggle.
 */
export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [users, setUsers] = useState({}); // id -> name
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load courses + users once.
  useEffect(() => {
    Promise.all([apiGet("/api/courses"), apiGet("/api/users")])
      .then(([cs, us]) => {
        setCourses(cs);
        if (cs.length) setCourseId(cs[0].id);
        const map = {};
        us.forEach((u) => {
          map[u.id] = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username;
        });
        setUsers(map);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const load = useCallback(() => {
    if (courseId == null) return;
    setLoading(true);
    apiGet(`/api/progress/course/${courseId}`)
      .then(setRows)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleManual(row) {
    setError(null);
    const q = `?user_id=${row.user_id}&course_id=${row.course_id}`;
    try {
      if (row.manually_completed) {
        await apiDelete(`/api/progress/complete${q}`);
      } else {
        await apiPost("/api/progress/complete", {
          user_id: row.user_id,
          course_id: row.course_id,
        });
      }
      load();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div>
      <h1>Course Progress &amp; Completion</h1>

      <div className="controls">
        <label>
          Course:{" "}
          <select
            value={courseId ?? ""}
            onChange={(e) => setCourseId(Number(e.target.value))}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.short_name} — {c.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">Error: {error}</p>}
      {loading && <p className="placeholder">Loading…</p>}

      {!loading && rows.length === 0 && (
        <p className="placeholder">No participants tracked for this course yet.</p>
      )}

      {rows.length > 0 && (
        <table className="grid">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Progress</th>
              <th>Activities</th>
              <th>Status</th>
              <th>Manual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id}>
                <td>{users[r.user_id] || `User ${r.user_id}`}</td>
                <td style={{ minWidth: 200 }}>
                  {/* Bar reflects overall completion: manual completion fills it to 100%. */}
                  <ProgressBar percent={r.completed ? 100 : r.percent_complete} />
                </td>
                <td>
                  {r.activities_done}/{r.activities_total}
                </td>
                <td>
                  {r.completed ? (
                    <span className="badge badge--done">
                      Completed{r.manually_completed && !r.calculated_complete ? " (manual)" : ""}
                    </span>
                  ) : (
                    <span className="badge badge--wip">In progress</span>
                  )}
                </td>
                <td>
                  <button className="btn" onClick={() => toggleManual(r)}>
                    {r.manually_completed ? "Unmark" : "Mark complete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
