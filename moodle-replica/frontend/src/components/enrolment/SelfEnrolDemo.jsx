// Self-enrolment gate chain (task 06 §4.2).
//
// The backend STOPS AT THE FIRST FAILURE — services/enrolment.py:411-457
// returns immediately from each failed gate, so `gates[]` contains only the
// gates it actually reached. An earlier version of this component claimed the
// opposite ("evaluates every gate, never stop-at-first-fail") and rendered
// gates[] as if it were the whole chain, which made a short array look like
// the later gates had passed silently.
//
// Canonical order (services/enrolment.py:55):
//   course_visible → method_enabled → window_open → capacity → key_match
//
// We render all five in order so the chain is legible, and label the ones the
// server never reached as exactly that. `failing_gate` from the verdict is the
// authority on where it stopped — we do not recompute it.
import { useState } from "react";
import { apiPost } from "../../api";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";

// Mirrors GATES in services/enrolment.py:55. Display order only — pass/fail
// always comes from the server's gates[].
const GATE_CHAIN = [
  "course_visible",
  "method_enabled",
  "window_open",
  "capacity",
  "key_match",
];

export default function SelfEnrolDemo({ courseId }) {
  const [userId, setUserId] = useState(null);
  const [key, setKey] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setBusy(true);
    setError(null);
    setResult(null);
    apiPost(`/api/enrolment/self/${courseId}`, { user_id: userId, key })
      .then(setResult)
      // Keep the ApiError itself, not just its message: 401/403 carry their
      // "why" in reasons[] and dropping it would swallow the server's reason.
      .catch(setError)
      .finally(() => setBusy(false));
  };

  // Server truth, indexed by gate name. Anything absent was never reached.
  const evaluated = new Map((result?.gates ?? []).map((g) => [g.gate, g]));

  return (
    <div className="panel">
      <div className="panel__title">Self-enrolment gate demo</div>
      <p className="muted">
        Gates run in order and stop at the first failure — later gates are not
        evaluated, so &ldquo;not reached&rdquo; does not mean they would pass.
      </p>
      <div className="form-row">
        <label>User</label>
        <UserSelect value={userId} onChange={setUserId} />
        <label>Key</label>
        <input
          className="input"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="enrolment key"
        />
        <button
          className="btn btn--primary"
          disabled={busy || !userId}
          onClick={submit}
        >
          Try self-enrol
        </button>
      </div>

      {error && (
        <>
          <div className="error-banner">{error.message}</div>
          {error.reasons?.length > 0 && (
            <ReasonList
              reasons={error.reasons}
              tone="error"
              title={
                error.status === 401
                  ? "Not signed in"
                  : error.status === 403
                    ? "Not permitted"
                    : "Request refused"
              }
            />
          )}
        </>
      )}

      {result && (
        <div>
          {result.enrolled && (
            <div className="verdict-banner verdict-banner--allowed">Enrolled</div>
          )}
          {GATE_CHAIN.map((name) => {
            const g = evaluated.get(name);
            const state = !g ? "skipped" : g.passed ? "pass" : "fail";
            return (
              <div key={name} className={`gate-row gate-row--${state}`}>
                <span className="gate-row__name">{name.replace(/_/g, " ")}</span>
                <span className="gate-row__evidence">
                  {g ? g.reason : "not reached — an earlier gate stopped the chain"}
                </span>
              </div>
            );
          })}
          {!result.enrolled && result.failing_gate && (
            <p className="muted">
              Stopped at <strong>{result.failing_gate.replace(/_/g, " ")}</strong>.
            </p>
          )}
          {!result.enrolled && result.blocking_reasons.length > 0 && (
            <ReasonList
              reasons={result.blocking_reasons}
              tone="error"
              title="Enrolment blocked"
            />
          )}
        </div>
      )}
    </div>
  );
}
