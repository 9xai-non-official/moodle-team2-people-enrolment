// Assignments tab: assign a role, and list the assignments in a context.
// The role dropdown is fed by the assignable matrix of the SIGNED-IN principal
// (carried by the session token) — signing in as a non-editing teacher visibly
// shrinks the options. Refusals from the backend render verbatim through
// ReasonList; manual assignments can be removed, enrol_%-owned ones cannot.
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete, ApiError } from "../../api";
import { useActingUser } from "../../context/ActingUser";
import DataTable from "../common/DataTable";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";

export default function AssignRoleForm() {
  const { actingUser, signedIn } = useActingUser();
  const [contexts, setContexts] = useState([]);
  const [contextId, setContextId] = useState(null);
  const [rolesByShort, setRolesByShort] = useState({});
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

  // Role catalogue: map short_name -> {id, name} so the assignable short_names
  // coming back from the matrix can be resolved to full role options.
  useEffect(() => {
    apiGet("/api/roles")
      .then((list) => {
        const by = {};
        for (const role of list) by[role.short_name] = role;
        setRolesByShort(by);
      })
      .catch((e) => setReasons([e.message]));
  }, []);

  // Assignable roles reflect the signed-in principal's role:assign matrix at this
  // context (identity comes from the session token — no actor_id is sent). Gated
  // on `signedIn` so it does not fire before the token is minted (which would
  // 401 and never recover); it re-runs once sign-in completes.
  useEffect(() => {
    if (!contextId || !actingUser || !signedIn) return;
    setAssignable([]);
    setRoleId(null);
    apiGet(`/api/roles/assignable?context_id=${contextId}`)
      .then((res) => {
        const opts = (res.assignable || [])
          .map((sn) => {
            const role = rolesByShort[sn];
            return role ? { role_id: role.id, name: role.name, short_name: sn } : null;
          })
          .filter(Boolean);
        setAssignable(opts);
        if (opts.length) setRoleId(opts[0].role_id);
      })
      .catch((e) => setReasons(e instanceof ApiError ? e.reasons : [e.message]));
  }, [contextId, actingUser, signedIn, rolesByShort]);

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

  function remove(row) {
    setTableError(null);
    apiDelete(`/api/roles/assignments/${row.assignment_id}`)
      .then(() => setTick((t) => t + 1)) // refetch table
      .catch((e) => setTableError(e instanceof ApiError ? e.message : e.message));
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
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        r.component === "" ? (
          <button className="btn btn--danger" onClick={() => remove(r)}>
            Remove
          </button>
        ) : null,
    },
  ];

  const canSubmit = actingUser && signedIn && contextId && roleId && userId;

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
            Signed in as {actingUser?.full_name} — assignable roles reflect your role:assign
            matrix at this context.
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
