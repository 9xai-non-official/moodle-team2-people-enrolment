// Self-enrolment gate chain (task 06 §4.2). The API evaluates every gate
// (never stop-at-first-fail) and we render each pass/fail verbatim, plus a
// green verdict on success and blocking_reasons via ReasonList on denial.
import { useState } from "react";
import { apiPost } from "../../api";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";

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
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="panel">
      <div className="panel__title">Self-enrolment gate demo</div>
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

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div>
          {result.enrolled && (
            <div className="verdict-banner verdict-banner--allowed">Enrolled</div>
          )}
          {result.gates.map((g) => (
            <div
              key={g.gate}
              className={`gate-row gate-row--${g.passed ? "pass" : "fail"}`}
            >
              <span className="gate-row__name">{g.gate.replace(/_/g, " ")}</span>
              <span className="gate-row__evidence">{g.reason}</span>
            </div>
          ))}
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
