// Per-activity group policy. Highlighted rows are where the configured mode is
// silently ignored because the course forces its own mode (rule GRP-012).
import { useCallback, useEffect, useState } from "react";
import { fetchActivityPolicies } from "../../lib/groupsApi";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import ActivityPolicyEditor from "./ActivityPolicyEditor";

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
  const [editing, setEditing] = useState(null);
  const [flashId, setFlashId] = useState(null); // row to flash once after a save

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchActivityPolicies(courseId)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // Clear the post-save flash so the same row can flash again on the next save.
  useEffect(() => {
    if (flashId == null) return undefined;
    const t = setTimeout(() => setFlashId(null), 900);
    return () => clearTimeout(t);
  }, [flashId]);

  return (
    <div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        error={error}
        empty="No activities in this course."
        rowKey={(r) => r.activity_id}
        onRowClick={setEditing}
        rowClassName={(r) => {
          const hi =
            r.configured_mode && r.configured_mode !== r.effective_mode ? "row--highlight" : "";
          return r.activity_id === flashId ? `${hi} gp-row-flash`.trim() : hi;
        }}
      />
      <p className="muted">
        highlighted = configured setting silently ignored (course forces group mode)
      </p>
      {editing && (
        <ActivityPolicyEditor
          activity={editing}
          courseId={courseId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setFlashId(editing.activity_id);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
