// Add an enrolment method to a course (task 06 §4.2). Collapsed to a button
// until opened; POSTs MethodCreate then hands back to the parent to refetch —
// no optimistic UI. Roles come from the cached catalog; cohorts are fetched
// fresh (they're mutable, so never cached). Refusals show verbatim reasons.
import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "../../api";
import { cachedGet } from "../../lib/catalog";
import ReasonList from "../common/ReasonList";

const KINDS = ["manual", "self", "cohort", "guest"];

export default function MethodCreateForm({ courseId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [kind, setKind] = useState("manual");
  const [roleId, setRoleId] = useState(null);
  const [cohortId, setCohortId] = useState(null);
  const [key, setKey] = useState("");
  const [maxEnrolled, setMaxEnrolled] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reasons, setReasons] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    cachedGet("/api/roles")
      .then(setRoles)
      .catch(() => setRoles([]));
    apiGet("/api/enrolment/cohorts")
      .then(setCohorts)
      .catch(() => setCohorts([]));
  }, [open]);

  const submit = () => {
    setBusy(true);
    setReasons(null);
    setError(null);
    const body = {
      method: kind,
      default_role_id: roleId || undefined,
      enrol_start: start || undefined,
      enrol_end: end || undefined,
    };
    if (kind === "cohort") body.cohort_id = cohortId || undefined;
    if (kind === "self") {
      body.config = { key };
      if (maxEnrolled) body.config.max_enrolled = Number(maxEnrolled);
    }
    apiPost(`/api/enrolment/courses/${courseId}/methods`, body)
      .then(() => {
        setOpen(false);
        setKind("manual");
        setKey("");
        setMaxEnrolled("");
        setStart("");
        setEnd("");
        onCreated();
      })
      .catch((e) => {
        if (e instanceof ApiError) setReasons(e.reasons);
        else setError(e.message);
      })
      .finally(() => setBusy(false));
  };

  if (!open)
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Add method
      </button>
    );

  return (
    <div className="panel">
      <div className="panel__title">Add enrolment method</div>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <label>Method</label>
        <select
          className="select"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <label>Default role</label>
        <select
          className="select"
          value={roleId ?? ""}
          onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— default —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {kind === "cohort" && (
        <div className="form-row">
          <label>Cohort</label>
          <select
            className="select"
            value={cohortId ?? ""}
            onChange={(e) =>
              setCohortId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">— cohort —</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {kind === "self" && (
        <div className="form-row">
          <label>Enrolment key</label>
          <input
            className="input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="enrolment key"
          />
          <label>Max enrolled</label>
          <input
            className="input"
            type="number"
            value={maxEnrolled}
            onChange={(e) => setMaxEnrolled(e.target.value)}
            placeholder="optional"
          />
        </div>
      )}

      <div className="form-row">
        <label>Start</label>
        <input
          className="input"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <label>End</label>
        <input
          className="input"
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>

      <div className="form-row">
        <button className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          className="btn btn--primary"
          disabled={busy || (kind === "cohort" && !cohortId)}
          onClick={submit}
        >
          Create method
        </button>
      </div>

      {reasons && (
        <ReasonList reasons={reasons} tone="error" title="Could not add method" />
      )}
    </div>
  );
}
