// Permission Checker — the demo star. Feeds the four-gate pipeline and
// renders exactly what the API returns: a verdict banner, every gate in
// order (a passed capability gate stays green right beside a failed group
// gate — the display never short-circuits), the per-role capability
// resolution, and the reasons. No business rules live in this component.
import { useEffect, useState } from "react";
import { apiPost } from "../../api";
import { cachedGet } from "../../lib/catalog";
import { useActingUser } from "../../context/ActingUser";
import UserSelect from "../common/UserSelect";
import ContextPath from "../common/ContextPath";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

// Each gate gets a plain-words subtitle — a first-time viewer should read the
// pipeline without knowing Moodle's vocabulary.
const GATE_SUBTITLES = {
  enrolment: "are they in this course?",
  role: "do they hold a role here?",
  capability: "does the role allow this action?",
  group: "is the target within their group scope?",
};

function GatePipeline({ gates }) {
  return gates.map((g) => (
    <div key={g.gate} className={`gate-row gate-row--${g.passed ? "pass" : "fail"}`}>
      <div className="gate-row__name">
        {g.gate}
        <div className="muted" style={{ fontWeight: 400, fontSize: "0.75rem" }}>
          {GATE_SUBTITLES[g.gate]}
        </div>
      </div>
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

// One human sentence summarizing the machine verdict — pure presentation of
// the gates the API returned, no rule logic of its own.
function plainVerdict(result, actorName) {
  const who = actorName || "This user";
  const failed = result.gates.filter((g) => !g.passed);
  if (failed.length === 0) return `${who} may do this here — every gate passed.`;
  const capPassed = result.gates.find((g) => g.gate === "capability")?.passed;
  const groupFail = failed.find((g) => g.gate === "group");
  if (capPassed && groupFail) {
    return (
      `${who}'s role ALLOWS this action — but not on this target: ` +
      `${groupFail.evidence[0] ?? "outside their group scope"}. ` +
      `Allowed in general, blocked for THIS person. That contrast is the story.`
    );
  }
  const first = failed[0];
  return `Blocked at the "${first.gate}" gate (${GATE_SUBTITLES[first.gate] ?? ""}): ${
    first.evidence[0] ?? "no evidence line"
  }`;
}

// First gate whose pass/fail differs between two results, matched by gate name
// (not index) so it survives any ordering. Powers the compare contrast line.
function firstDivergentGate(ra, rb) {
  return ra.gates.find((ga) => {
    const gb = rb.gates.find((x) => x.gate === ga.gate);
    return gb && ga.passed !== gb.passed;
  })?.gate;
}

// One compare column: actor header, then loading / error / full verdict —
// reusing GatePipeline + plainVerdict so both sides read identically to the
// single check above. `col` is {result} or {error}, undefined while loading.
function CompareColumn({ name, col, loading }) {
  return (
    <div>
      <div className="panel__title">{name}</div>
      {loading ? (
        <div className="muted">checking…</div>
      ) : col?.error ? (
        <div className="error-banner">{col.error}</div>
      ) : col?.result ? (
        <>
          <div className={`verdict-banner verdict-banner--${col.result.verdict}`}>
            {col.result.verdict.toUpperCase()}
          </div>
          <GatePipeline gates={col.result.gates} />
          <p>{plainVerdict(col.result, col.name)}</p>
        </>
      ) : null}
    </div>
  );
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
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    Promise.all([
      cachedGet("/api/roles/capabilities"),
      cachedGet("/api/roles/contexts"),
      cachedGet("/api/roles"),
      cachedGet("/api/users"),
    ])
      .then(([caps, ctxs, rs, us]) => {
        setCapabilities(caps);
        setContexts(ctxs);
        setRoles(rs);
        setUsers(us);
        if (caps.length) setCapability((cur) => cur ?? caps[0]);
        if (ctxs.length) setContextId((cur) => cur ?? ctxs[0].id);
        setCompareA((cur) => cur ?? us.find((u) => u.username === "ta.a")?.id ?? null);
        setCompareB((cur) => cur ?? us.find((u) => u.username === "ta.allgroups")?.id ?? null);
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

  // Two checks, same question, different actor. Each call resolves to its own
  // {result} or {error} so one column failing never blanks the other. Shared
  // fields mirror submit()'s body; simulate_role is left out on purpose — the
  // point is contrasting two real personas' own roles.
  function runCompare() {
    setComparing(true);
    setCompareResult(null);
    const shared = {
      capability,
      context_id: contextId,
      target_user_id: targetUserId || undefined,
      activity_id: activityId || undefined,
    };
    const nameFor = (id) => users.find((u) => u.id === id)?.full_name ?? "—";
    const call = (id) =>
      apiPost("/api/permissions/check", { actor_id: id, ...shared })
        .then((result) => ({ result }))
        .catch((e) => ({ error: e.message }));
    Promise.all([call(compareA), call(compareB)]).then(([a, b]) => {
      setCompareResult({
        a: { name: nameFor(compareA), ...a },
        b: { name: nameFor(compareB), ...b },
      });
      setComparing(false);
    });
  }

  const activityContexts = contexts.filter((c) => c.level === "activity");
  const nameA = users.find((u) => u.id === compareA)?.full_name ?? "Actor A";
  const nameB = users.find((u) => u.id === compareB)?.full_name ?? "Actor B";

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
            onClick={() => submit()}
            disabled={!actorId || !capability || !contextId || submitting}
          >
            {submitting ? "Checking…" : "Check"}
          </button>
        </div>
        <ContextPath contextId={contextId} contexts={contexts} />
        {error && <div className="error-banner">{error}</div>}
      </div>

      {result && (
        <div className="panel">
          <div className={`verdict-banner verdict-banner--${result.verdict}`}>
            {result.verdict.toUpperCase()}
          </div>
          <p>
            {plainVerdict(
              result,
              users.find((u) => u.id === Number(actorId))?.full_name,
            )}
          </p>

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

      <div className="panel">
        <div className="panel__title">Compare personas — side by side</div>
        <div className="form-row">
          <label>Compare:</label>
          <UserSelect value={compareA} onChange={setCompareA} ariaLabel="Compare actor A" />
          <span>vs</span>
          <UserSelect value={compareB} onChange={setCompareB} ariaLabel="Compare actor B" />
          <button
            className="btn btn--primary"
            onClick={runCompare}
            disabled={!compareA || !compareB || !capability || !contextId || comparing}
          >
            {comparing ? "Checking…" : "Run both"}
          </button>
        </div>
        <div className="muted">uses the capability/context/target chosen above</div>
      </div>

      {(comparing || compareResult) && (
        <div className="panel">
          <div className="panel__title">Side-by-side result</div>
          {!comparing &&
            compareResult?.a?.result &&
            compareResult?.b?.result &&
            compareResult.a.result.verdict !== compareResult.b.result.verdict && (
              <div className="banner-info">
                Same question, different person: {compareResult.a.name} is{" "}
                {compareResult.a.result.verdict}, {compareResult.b.name} is{" "}
                {compareResult.b.result.verdict} — the difference is the{" "}
                {firstDivergentGate(compareResult.a.result, compareResult.b.result)} gate.
              </div>
            )}
          <div className="compare-grid">
            <CompareColumn name={compareResult?.a?.name ?? nameA} col={compareResult?.a} loading={comparing} />
            <CompareColumn name={compareResult?.b?.name ?? nameB} col={compareResult?.b} loading={comparing} />
          </div>
        </div>
      )}
    </div>
  );
}
