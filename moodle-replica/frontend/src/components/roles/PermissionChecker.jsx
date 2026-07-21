// Permission Checker — the demo star. Feeds the four-gate pipeline and
// renders exactly what the API returns: a verdict banner, every gate in
// order (a passed capability gate stays green right beside a failed group
// gate — the display never short-circuits), the per-role capability
// resolution, and the reasons. No business rules live in this component.
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";
import { useActingUser } from "../../context/ActingUser";
import UserSelect from "../common/UserSelect";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

function GatePipeline({ gates }) {
  return gates.map((g) => (
    <div key={g.gate} className={`gate-row gate-row--${g.passed ? "pass" : "fail"}`}>
      <div className="gate-row__name">{g.gate}</div>
      <div>
        {g.evidence.map((ev, i) => (
          <div key={i} className="gate-row__evidence">
            {ev}
          </div>
        ))}
      </div>
    </div>
  ));
}

export default function PermissionChecker({ replay }) {
  const { actingUser } = useActingUser();
  const [capabilities, setCapabilities] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [actorId, setActorId] = useState(null);
  const [actorTouched, setActorTouched] = useState(false);
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
      apiGet("/api/users"),
    ])
      .then(([caps, ctxs, rs, us]) => {
        setCapabilities(caps);
        setContexts(ctxs);
        setRoles(rs);
        setUsers(us);
        if (caps.length) setCapability((cur) => cur ?? caps[0]);
        if (ctxs.length) setContextId((cur) => cur ?? ctxs[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  // actor defaults to the acting user and follows it until the user picks one.
  useEffect(() => {
    if (!actorTouched && actingUser) setActorId(actingUser.id);
  }, [actingUser, actorTouched]);

  // Replay from the Decision Log: prefill the stored inputs and re-run.
  useEffect(() => {
    const inputs = replay?.inputs;
    if (!inputs) return;
    setActorId(inputs.actor_id);
    setActorTouched(true);
    setCapability(inputs.capability);
    setContextId(inputs.context_id);
    setTargetUserId(inputs.target_user_id ?? null);
    setActivityId(inputs.activity_id ?? null);
    setSimulateRoleId(inputs.simulate_role_id ?? null);
    submit(inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay?.nonce]);

  function submit(payload) {
    setError(null);
    setResult(null);
    setSubmitting(true);
    apiPost("/api/permissions/check", payload ?? {
      actor_id: actorId,
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

  // One-click hard-case walkthroughs. Resolved by username / context label so
  // they work in mock AND real-DB mode (ids differ between the two worlds).
  const SCENARIOS = [
    { label: "HC-3: scoped TA grades other group", actor: "ta.a", cap: "activity:grade", ctx: "Assignment 1", target: "student.b" },
    { label: "HC-3: all-groups TA, same check", actor: "ta.allgroups", cap: "activity:grade", ctx: "Assignment 1", target: "student.b" },
    { label: "HC-4: TA grades student in two groups", actor: "ta.a", cap: "activity:grade", ctx: "Assignment 1", target: "student.multi" },
    { label: "Prohibit: guest tries to submit", actor: "student.a", cap: "activity:submit", ctx: "Assignment 1", simulateRole: "guest" },
  ];

  function runScenario(s) {
    const actor = users.find((u) => u.username === s.actor);
    const ctx = contexts.find((c) => c.label.includes(s.ctx));
    const target = s.target ? users.find((u) => u.username === s.target) : null;
    const simRole = s.simulateRole ? roles.find((r) => (r.short_name ?? r.shortname) === s.simulateRole) : null;
    if (!actor || !ctx) {
      setError(`scenario needs user '${s.actor}' + context '${s.ctx}' — not found in this dataset`);
      return;
    }
    setActorId(actor.id);
    setActorTouched(true);
    setCapability(s.cap);
    setContextId(ctx.id);
    setTargetUserId(target?.id ?? null);
    setActivityId(ctx.level === "activity" ? ctx.instance_id : null);
    setSimulateRoleId(simRole?.id ?? null);
    submit({
      actor_id: actor.id,
      capability: s.cap,
      context_id: ctx.id,
      target_user_id: target?.id ?? undefined,
      activity_id: ctx.level === "activity" ? ctx.instance_id : undefined,
      simulate_role_id: simRole?.id ?? undefined,
    });
  }

  return (
    <div>
      <div className="panel">
        <div className="panel__title">Demo scenarios — one click per hard case</div>
        <div className="form-row">
          {SCENARIOS.map((s) => (
            <button key={s.label} className="btn" onClick={() => runScenario(s)} disabled={submitting}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">Check a permission</div>
        <div className="form-row">
          <label>Actor</label>
          <UserSelect
            value={actorId}
            onChange={(v) => {
              setActorId(v);
              setActorTouched(true);
            }}
          />
          <label>Capability</label>
          <select
            className="select"
            value={capability ?? ""}
            onChange={(e) => setCapability(e.target.value)}
          >
            {capabilities.map((c) => (
              <option key={c} value={c}>
                {c}
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
          <label>Simulate role</label>
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
            disabled={!actorId || !capability || !contextId || submitting}
          >
            {submitting ? "Checking…" : "Check"}
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </div>

      {result && (
        <div className="panel">
          <div className={`verdict-banner verdict-banner--${result.verdict}`}>
            {result.verdict.toUpperCase()}
          </div>

          <div className="panel__title">Gate pipeline</div>
          <GatePipeline gates={result.gates} />

          {result.capability_values.length > 0 && (
            <>
              <div className="panel__title">Capability resolution</div>
              {result.capability_values.map((v, i) => (
                <div key={i} className="form-row">
                  <span>
                    {v.role} → <strong>{v.permission}</strong>
                  </span>
                  {v.decided_at ? (
                    <Badge variant="blue">decided at {v.decided_at.label}</Badge>
                  ) : (
                    <span className="muted">not set</span>
                  )}
                </div>
              ))}
            </>
          )}

          <ReasonList
            reasons={result.reasons}
            tone={result.verdict === "allowed" ? "ok" : "error"}
            title="Reasons"
          />
        </div>
      )}
    </div>
  );
}
