// Manual enrolment (task 06 §4.2). Role options come from GET /api/roles
// (Khaled's domain); default is the manual method's default_role. Backend
// refusals are shown verbatim via ReasonList — never swallowed.
//
// RE-ENROL INTENT
// Re-enrolling someone who is currently SUSPENDED must not quietly reactivate
// them — suspension is a deliberate act and undoing it should be too. So the
// request carries `activate` only when the operator ticks the box, and the
// field is omitted entirely otherwise rather than sent as false.
//
// BLOCKED ON BACKEND: services/enrolment.py:236-241 upserts with a hardcoded
// `set status = 'active'`, so today EVERY re-enrol reactivates regardless of
// what this sends, and EnrolRequest (schemas_enrolment.py:40-44) has no
// `activate` field to receive. The control below expresses the intent and is
// wired, but it cannot change behaviour until that lands. Raised with the
// enrolment backend engineer — see the shared-diff request in the handover.
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost, ApiError } from "../../api";
import Modal from "../common/Modal";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";

export default function EnrolUserModal({ open, courseId, onClose, onEnrolled }) {
  const fieldsRef = useRef(null);
  const [roles, setRoles] = useState([]);
  const [method, setMethod] = useState(null);
  const [userId, setUserId] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [activate, setActivate] = useState(false); // never defaults to true
  const [reasons, setReasons] = useState(null);
  const [failure, setFailure] = useState(null); // the ApiError, for its status
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasons(null);
    setFailure(null);
    setError(null);
    setUserId(null);
    setTimeStart("");
    setTimeEnd("");
    setActivate(false); // re-arm on every open: intent is per-action
    apiGet("/api/roles")
      .then(setRoles)
      .catch(() => setRoles([])); // fall back to the method's default role below
    apiGet(`/api/enrolment/courses/${courseId}/methods`)
      .then((ms) => {
        const manual = ms.find((mm) => mm.method === "manual") || ms[0] || null;
        setMethod(manual);
        setRoleId(manual?.default_role?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, [open, courseId]);

  // Autofocus the user select whenever the modal opens — it's the first
  // control and the field every enrolment must start from.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      () => fieldsRef.current?.querySelector("select")?.focus(),
      0,
    );
    return () => clearTimeout(t);
  }, [open]);

  // Keep the modal usable even if /api/roles isn't served yet.
  const roleOptions = roles.length
    ? roles
    : method?.default_role
      ? [{ id: method.default_role.id, name: method.default_role.short_name }]
      : [];

  const submit = () => {
    setBusy(true);
    setReasons(null);
    setFailure(null);
    setError(null);
    apiPost(`/api/enrolment/courses/${courseId}/enrol`, {
      user_id: userId,
      role_id: roleId || undefined,
      method_id: method?.id,
      time_start: timeStart || undefined,
      time_end: timeEnd || undefined,
      // Omitted unless deliberately chosen — an absent field cannot be read as
      // "reactivate", which `activate: false` eventually might be.
      ...(activate ? { activate: true } : {}),
    })
      .then(() => onEnrolled())
      .catch((e) => {
        if (e instanceof ApiError) {
          setFailure(e);
          setReasons(e.reasons);
        } else setError(e.message);
      })
      .finally(() => setBusy(false));
  };

  // The server's status decides the heading; the reasons themselves stay
  // verbatim. 409 is the duplicate/guest conflict, 403 a capability refusal,
  // 401 no verified identity (Khaled's D-AUTH).
  const refusalTitle = (status) =>
    ({
      401: "Not signed in",
      403: "Not permitted",
      409: "Conflict — already enrolled or not allowed here",
    })[status] ?? "Could not enrol";

  // Enter anywhere in the form submits once a user is chosen (the only
  // required field); selects and datetime inputs otherwise swallow it.
  const onFormKeyDown = (e) => {
    if (e.key === "Enter" && userId && !busy) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Modal
      open={open}
      title="Enrol user"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            disabled={busy || !userId}
            onClick={submit}
          >
            Enrol
          </button>
        </>
      }
    >
      <div ref={fieldsRef} onKeyDown={onFormKeyDown}>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-row">
        <label>User</label>
        <UserSelect value={userId} onChange={setUserId} />
      </div>
      <div className="form-row">
        <label>Role</label>
        <select
          className="select"
          value={roleId ?? ""}
          onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
        >
          {roleOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>Start</label>
        <input
          className="input"
          type="datetime-local"
          value={timeStart}
          onChange={(e) => setTimeStart(e.target.value)}
        />
      </div>
      <div className="form-row">
        <label>End</label>
        <input
          className="input"
          type="datetime-local"
          value={timeEnd}
          onChange={(e) => setTimeEnd(e.target.value)}
        />
      </div>
      {/* INSUFFICIENT EVIDENCE — requires staging inspection.
          Placement is a guess: this sits after the date fields because it
          qualifies the write, but whether it belongs here, beside the user
          select (where the operator learns the user is suspended), or only
          appears once the chosen user IS suspended, is not decidable from the
          code. The last of those is probably best and needs the participant's
          effective_status at selection time, which UserSelect does not
          currently provide. */}
      <div className="form-row">
        <label htmlFor="reenrol-activate">Reactivate</label>
        <span>
          <input
            id="reenrol-activate"
            type="checkbox"
            checked={activate}
            onChange={(e) => setActivate(e.target.checked)}
          />{" "}
          <span className="muted">
            If this user is currently suspended, reactivate them. Leave
            unticked to re-enrol without lifting the suspension.
          </span>
        </span>
      </div>
      {reasons && (
        <ReasonList
          reasons={reasons}
          tone="error"
          title={refusalTitle(failure?.status)}
        />
      )}
      </div>
    </Modal>
  );
}
