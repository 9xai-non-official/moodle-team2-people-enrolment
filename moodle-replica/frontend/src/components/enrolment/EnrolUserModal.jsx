// Manual enrolment (task 06 §4.2). Role options come from GET /api/roles
// (Khaled's domain); default is the manual method's default_role. Backend
// refusals are shown verbatim via ReasonList — never swallowed.
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
  const [reasons, setReasons] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasons(null);
    setError(null);
    setUserId(null);
    setTimeStart("");
    setTimeEnd("");
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
    setError(null);
    apiPost(`/api/enrolment/courses/${courseId}/enrol`, {
      user_id: userId,
      role_id: roleId || undefined,
      method_id: method?.id,
      time_start: timeStart || undefined,
      time_end: timeEnd || undefined,
    })
      .then(() => onEnrolled())
      .catch((e) => {
        if (e instanceof ApiError) setReasons(e.reasons);
        else setError(e.message);
      })
      .finally(() => setBusy(false));
  };

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
      {reasons && (
        <ReasonList reasons={reasons} tone="error" title="Could not enrol" />
      )}
      </div>
    </Modal>
  );
}
