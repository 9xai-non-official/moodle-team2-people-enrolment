// Per-activity group policy. Highlighted rows are where the configured mode is
// silently ignored because the course forces its own mode (rule GRP-012).
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";

const COLUMNS = [
  { key: "name", label: "Activity" },
  {
    key: "configured_mode",
    label: "Configured mode",
    render: (r) => r.configured_mode ?? "— (inherit)",
  },
  { key: "effective_mode", label: "Effective mode", render: (r) => r.effective_mode ?? "none" },
  {
    key: "forced",
    label: "Forced?",
    render: (r) => (r.forced ? <Badge variant="amber">forced</Badge> : ""),
  },
  { key: "grouping", label: "Grouping", render: (r) => r.grouping?.name ?? "—" },
];

export default function ActivityPolicyTable({ courseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/groups/courses/${courseId}/activity-policies`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        error={error}
        empty="No activities in this course."
        rowKey={(r) => r.activity_id}
        rowClassName={(r) =>
          r.configured_mode && r.configured_mode !== r.effective_mode ? "row--highlight" : ""
        }
      />
      <p className="muted">
        highlighted = configured setting silently ignored (course forces group mode)
      </p>
    </div>
  );
}
