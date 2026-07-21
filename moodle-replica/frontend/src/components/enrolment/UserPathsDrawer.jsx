// Every enrolment path of one user across all courses (task 06 §4.2, HC-1).
// Before removing a cohort sync a user shows two rows into one course; after,
// one row — membership stays continuous via the surviving path.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import Badge from "../common/Badge";
import DataTable from "../common/DataTable";

const fmtWindow = (r) =>
  !r.time_start && !r.time_end
    ? "—"
    : `${r.time_start || "…"} → ${r.time_end || "…"}`;

export default function UserPathsDrawer({ userId, userName, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/users/${userId}/enrolments`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const columns = [
    {
      key: "course",
      label: "Course",
      render: (r) => (
        <span>
          {r.course?.short_name}{" "}
          {r.course?.deleted && (
            <Badge variant="amber" title="course deleted">
              deleted
            </Badge>
          )}
        </span>
      ),
    },
    { key: "method", label: "Method" },
    {
      key: "method_status",
      label: "Method status",
      render: (r) => (
        <Badge variant={r.method_status === "enabled" ? "green" : "grey"}>
          {r.method_status}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Path status",
      render: (r) => (
        <Badge variant={r.status === "active" ? "green" : "grey"}>
          {r.status}
        </Badge>
      ),
    },
    { key: "window", label: "Window", render: fmtWindow },
    {
      key: "live",
      label: "Live",
      render: (r) => (
        <Badge variant={r.live ? "green" : "grey"}>
          {r.live ? "live" : "not live"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="drawer">
      <button className="drawer__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>Enrolment paths — {userName}</h2>
      <p className="muted">
        Two rows into one course = two ways in (HC-1); removing one keeps the
        user enrolled via the other.
      </p>
      {rows.length > 0 && (
        <div className="form-row">
          {[...new Map(rows.map((r) => [r.course?.short_name, null])).keys()].map((sn) => {
            const paths = rows.filter((r) => r.course?.short_name === sn);
            const live = paths.filter((r) => r.live).length;
            return (
              <span className="chip" key={sn} title={`${live} of ${paths.length} paths live — in the course iff any path is live`}>
                {sn}
                <Badge variant={live > 0 ? "green" : "red"}>
                  {live > 0 ? `IN (${live}/${paths.length} live)` : "OUT"}
                </Badge>
              </span>
            );
          })}
        </div>
      )}
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        empty="No enrolment paths."
        rowKey={(r, i) => i}
        columns={columns}
      />
    </div>
  );
}
