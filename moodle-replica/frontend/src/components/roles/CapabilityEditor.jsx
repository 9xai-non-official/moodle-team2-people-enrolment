// Roles tab: the capability sheet for one role at one context. Each row's
// four-state control POSTs on change and refetches (no optimistic UI); the
// resolved sheet — override chips, defined_at, prohibit stickiness — comes
// straight from the API, nothing is computed here.
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";
import DataTable from "../common/DataTable";

const PERMISSIONS = [
  { value: "notset", label: "Not set" },
  { value: "allow", label: "Allow" },
  { value: "prevent", label: "Prevent" },
  { value: "prohibit", label: "Prohibit" },
];
const SYSTEM_CONTEXT_ID = 1;

export default function CapabilityEditor() {
  const [roles, setRoles] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [roleId, setRoleId] = useState(null);
  const [contextId, setContextId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Promise.all([apiGet("/api/roles"), apiGet("/api/roles/contexts")])
      .then(([r, c]) => {
        setRoles(r);
        setContexts(c);
        if (r.length) setRoleId((cur) => cur ?? r[0].id);
        if (c.length) setContextId((cur) => cur ?? c[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!roleId || !contextId) return;
    setLoading(true);
    setError(null);
    apiGet(`/api/roles/${roleId}/capabilities?context_id=${contextId}`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roleId, contextId, tick]);

  function setPermission(capability, permission) {
    apiPost(`/api/roles/${roleId}/capabilities`, { context_id: contextId, capability, permission })
      .then(() => setTick((t) => t + 1)) // refetch — never trust local state
      .catch((e) => setError(e.message));
  }

  const atSystem = contextId === SYSTEM_CONTEXT_ID;
  const columns = [
    { key: "capability", label: "Capability" },
    {
      key: "permission",
      label: "Permission",
      render: (row) => (
        <>
          <select
            className="select"
            value={row.permission}
            onChange={(e) => setPermission(row.capability, e.target.value)}
          >
            {PERMISSIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {row.permission === "prohibit" && (
            <div className="inline-error">cannot be overridden anywhere below</div>
          )}
        </>
      ),
    },
    {
      key: "override",
      label: "",
      render: (row) =>
        row.is_override && !atSystem ? <span className="chip">override</span> : null,
    },
    {
      key: "defined_at",
      label: "Defined at",
      render: (row) =>
        row.defined_at ? (
          <span className="muted">decided at {row.defined_at.label}</span>
        ) : (
          <span className="muted">—</span>
        ),
    },
  ];

  return (
    <div>
      <div className="form-row">
        <label>Role</label>
        <select
          className="select"
          value={roleId ?? ""}
          onChange={(e) => setRoleId(Number(e.target.value))}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <label>Context</label>
        <select
          className="select"
          value={contextId ?? ""}
          onChange={(e) => setContextId(Number(e.target.value))}
        >
          {contexts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty="No capabilities."
        rowKey={(row) => row.capability}
      />
    </div>
  );
}
