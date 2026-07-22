// Permission Checker — the demo star. Feeds the permission pipeline and
// renders exactly what the API returns: a verdict banner, the supporting and
// blocking reasons, the per-role capability resolution, the roles considered,
// and the group scope. No business rules live in this component.
//
// WP04: this inspects whether a chosen SUBJECT can perform an action. It does
// NOT change who you are signed in as — identity is carried by the session
// token. Inspecting another user requires user:viewdetails (a 403 otherwise).
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";
import { useActingUser } from "../../context/ActingUser";
import UserSelect from "../common/UserSelect";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

export default function PermissionChecker() {
  const { actingUser, signedIn } = useActingUser();
  const [capabilities, setCapabilities] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [subjectId, setSubjectId] = useState(null);
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [capability, setCapability] = useState(null);
  const [contextId, setContextId] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [activityId, setActivityId] = useState(null);
  const [simulateRoleId, setSimulateRoleId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet("/api/roles/capabilities"),
      apiGet("/api/roles/contexts"),
      apiGet("/api/roles"),
    ])
      .then(([caps, ctxs, rs]) => {
        setCapabilities(caps);
        setContexts(ctxs);
        setRoles(rs);
        if (caps.length) setCapability((cur) => cur ?? caps[0].name);
        if (ctxs.length) setContextId((cur) => cur ?? ctxs[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Subject defaults to the signed-in user and follows it until overridden.
  useEffect(() => {
    if (!subjectTouched && actingUser) setSubjectId(actingUser.id);
  }, [actingUser, subjectTouched]);

  function submit() {
    setError(null);
    setResult(null);
    setSubmitting(true);
    apiPost("/api/permissions/check", {
      actor_user_id: subjectId,
      capability,
      context_id: contextId,
      target_user_id: targetUserId || undefined,
      activity_id: activityId || undefined,
      simulate_role_id: simulateRoleId || undefined,
    })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setSubmitting(false));
  }

  const activityContexts = contexts.filter((c) => c.level === "activity");

  return (
    <div>
      <div className="panel">
        <div className="panel__title">Check a permission</div>
        <div className="form-row">
          <label>Subject (inspect as)</label>
          <UserSelect
            value={subjectId}
            onChange={(v) => {
              setSubjectId(v);
              setSubjectTouched(true);
            }}
          />
          <label>Capability</label>
          <select
            className="select"
            value={capability ?? ""}
            onChange={(e) => setCapability(e.target.value)}
          >
            {capabilities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
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
        <div className="muted">
          Signed in as {actingUser?.full_name}. This inspects whether the
          selected subject can perform the action — it does NOT change who you
          are signed in as. Inspecting another user requires user:viewdetails.
        </div>
        <div className="form-row">
          <label>Target user</label>
          <UserSelect value={targetUserId} onChange={setTargetUserId} placeholder="— none —" />
          <label>Activity</label>
          <select
            className="select"
            value={activityId ?? ""}
            onChange={(e) => setActivityId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— none —</option>
            {activityContexts.map((c) => (
              <option key={c.id} value={c.instance_id}>
                {c.label}
              </option>
            ))}
          </select>
          <label>Preview as role</label>
          <select
            className="select"
            value={simulateRoleId ?? ""}
            onChange={(e) => setSimulateRoleId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— none —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn--primary"
            onClick={submit}
            disabled={!signedIn || !subjectId || !capability || !contextId || submitting}
          >
            {submitting ? "Checking…" : "Check"}
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </div>

      {result && (
        <div className="panel">
          <div
            className={`verdict-banner verdict-banner--${
              result.decision === "ALLOW" ? "allowed" : "denied"
            }`}
          >
            {result.decision}
            {result.admin_bypass && <Badge variant="blue">admin bypass</Badge>}
            {result.simulated_role && (
              <Badge variant="blue">previewing as {result.simulated_role}</Badge>
            )}
          </div>

          <ReasonList reasons={result.supporting_reasons} tone="ok" title="Supporting" />
          <ReasonList reasons={result.blocking_reasons} tone="error" title="Blocking" />

          {Object.entries(result.capability_values || {}).length > 0 && (
            <>
              <div className="panel__title">Capability resolution</div>
              {Object.entries(result.capability_values).map(([role, v]) => (
                <div key={role} className="form-row">
                  <span>
                    {role} → <strong>{v.value ?? "not set"}</strong>
                  </span>
                  {v.decided_at && <Badge variant="blue">decided at {v.decided_at}</Badge>}
                </div>
              ))}
            </>
          )}

          {result.roles_considered && result.roles_considered.length > 0 && (
            <>
              <div className="panel__title">Roles considered</div>
              {result.roles_considered.map((r, i) => (
                <div key={i} className="form-row">
                  <span>
                    {r.role} @ {r.context}, {r.provenance}
                  </span>
                </div>
              ))}
            </>
          )}

          {result.group_scope && result.group_scope.shared !== null && (
            <>
              <div className="panel__title">Group scope</div>
              <div className="form-row">
                <span>mode: {result.group_scope.mode}</span>
                <span>shared: {String(result.group_scope.shared)}</span>
                <span>access_all_groups: {String(result.group_scope.access_all_groups)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
