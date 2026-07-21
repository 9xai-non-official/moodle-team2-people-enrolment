// Assignments tab: assign a role, and list the assignments in a context.
// The role dropdown is fed by the assignable matrix keyed on the acting
// user — acting as a non-editing teacher visibly shrinks the options.
// Refusals from the backend render verbatim through ReasonList.
import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "../../api";
import { useActingUser } from "../../context/ActingUser";
import DataTable from "../common/DataTable";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";

export default function AssignRoleForm() {
  const { actingUser } = useActingUser();
  const [contexts, setContexts] = useState([]);
  const [contextId, setContextId] = useState(null);
  const [assignable, setAssignable] = useState([]);
  const [roleId, setRoleId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableError, setTableError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    apiGet("/api/roles/contexts")
      .then((c) => {
        setContexts(c);
        if (c.length) setContextId((cur) => cur ?? c[0].id);
      })
      .catch((e) => setTableError(e.message));
  }, []);

  // assignable roles depend on the acting user + context (the matrix demo).
  useEffect(() => {
    if (!contextId || !actingUser) return;
    setAssignable([]);
    setRoleId(null);
    apiGet(`/api/roles/assignable?actor_id=${actingUser.id}&context_id=${contextId}`)
      .then((list) => {
        setAssignable(list);
        if (list.length) setRoleId(list[0].role_id);
      })
      .catch((e) => setReasons([e.message]));
  }, [contextId, actingUser]);

  useEffect(() => {
    if (!contextId) return;
    setLoading(true);
    setTableError(null);
    apiGet(`/api/roles/assignments?context_id=${contextId}`)
      .then(setRows)
      .catch((e) => setTableError(e.message))
      .finally(() => setLoading(false));
  }, [contextId, tick]);

  function submit() {
    setReasons([]);
    apiPost("/api/roles/assignments", {
      actor_id: actingUser.id,
      user_id: userId,
      role_id: roleId,
      context_id: contextId,
    })
      .then(() => {
        setUserId(null);
        setTick((t) => t + 1); // refetch table
      })
      .catch((e) => setReasons(e instanceof ApiError ? e.reasons : [e.message]));
  }

  const columns = [
    { key: "user", label: "User", render: (r) => r.user.full_name },
    { key: "role", label: "Role", render: (r) => r.role.short_name },
    { key: "context", label: "Context", render: (r) => r.context.label },
    {
      key: "provenance",
      label: "Provenance",
      render: (r) => (
        <span className="chip">{r.component ? `${r.component} #${r.item_id}` : "manual"}</span>
      ),
    },
  ];

  const canSubmit = actingUser && contextId && roleId && userId;

  return (
    <div>
      <div className="panel">
        <div className="panel__title">Assign a role</div>
        <div className="form-row">
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
          <label>Role</label>
          <select
            className="select"
            value={roleId ?? ""}
            onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
            disabled={!assignable.length}
          >
            <option value="">{assignable.length ? "— role —" : "none assignable"}</option>
            {assignable.map((r) => (
              <option key={r.role_id} value={r.role_id}>
                {r.name}
              </option>
            ))}
          </select>
          <label>User</label>
          <UserSelect value={userId} onChange={setUserId} />
          <button className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
            Assign
          </button>
        </div>
        {actingUser && (
          <div className="muted">
            acting as {actingUser.full_name} — assignable roles reflect the matrix
          </div>
        )}
        {reasons.length > 0 && <ReasonList reasons={reasons} tone="error" title="Refused" />}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={tableError}
        empty="No assignments in this context."
      />
    </div>
  );
}
