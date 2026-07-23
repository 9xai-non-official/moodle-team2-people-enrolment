// Manual enrolment (spec §38). Opens from the toolbar "Enrol users" button and
// from the Other-users panel (prefilled). Fields come from real endpoints:
// users (/api/users), the course's methods, roles (/api/roles). The default
// role is the chosen method's default_role. Backend refusals (409 already
// enrolled, 403 capability, 404 no method) surface verbatim via ReasonList —
// never swallowed. Accessible dialog: focus trap + Escape + focus restore.
import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "../../api";
import { cachedGet } from "../../lib/catalog";
import { useLang } from "../../context/Lang";
import ReasonList from "../common/ReasonList";
import Icon from "./icons";
import { Dialog, Switch, T, UserCombo, both, methodMeta, roleMeta } from "./ui";

export default function EnrolUserModal({ open, courseId, presetUserId, onClose, onEnrolled }) {
  const { dir } = useLang();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [methods, setMethods] = useState([]);
  const [userId, setUserId] = useState(null);
  const [methodId, setMethodId] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [activate, setActivate] = useState(true);
  const [reasons, setReasons] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [methodsLoaded, setMethodsLoaded] = useState(false);

  const method = methods.find((m) => m.id === methodId) || null;

  useEffect(() => {
    if (!open) return;
    setReasons(null);
    setError(null);
    setMethodsLoaded(false);
    setUserId(presetUserId ?? null);
    setTimeStart("");
    setTimeEnd("");
    setActivate(true);
    cachedGet("/api/users")
      .then(setUsers)
      .catch(() => setUsers([]));
    cachedGet("/api/roles")
      .then(setRoles)
      .catch(() => setRoles([]));
    apiGet(`/api/enrolment/courses/${courseId}/methods`)
      .then((ms) => {
        setMethods(ms);
        // Prefer an enabled manual method, else any manual, else first.
        const pref =
          ms.find((m) => m.method === "manual" && m.status === "enabled") ||
          ms.find((m) => m.method === "manual") ||
          ms[0] ||
          null;
        setMethodId(pref?.id ?? null);
        setRoleId(pref?.default_role?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setMethodsLoaded(true));
  }, [open, courseId, presetUserId]);

  // When the method changes, default the role to that method's default role.
  useEffect(() => {
    if (method?.default_role?.id) setRoleId(method.default_role.id);
  }, [methodId]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleOptions = roles.length
    ? roles
    : method?.default_role
      ? [{ id: method.default_role.id, name: method.default_role.short_name }]
      : [];

  const datesValid = !timeStart || !timeEnd || new Date(timeStart) < new Date(timeEnd);
  const canSubmit = !!userId && !!methodId && datesValid && !busy;

  const submit = () => {
    if (!canSubmit) return;
    setBusy(true);
    setReasons(null);
    setError(null);
    apiPost(`/api/enrolment/courses/${courseId}/enrol`, {
      user_id: userId,
      role_id: roleId || undefined,
      method_id: methodId || undefined,
      time_start: timeStart || undefined,
      time_end: timeEnd || undefined,
      activate,
    })
      .then(() => onEnrolled())
      .catch((e) => {
        if (e instanceof ApiError) setReasons(e.reasons);
        else setError(e.message);
      })
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dir={dir}
      icon="userPlus"
      title="Enrol users"
      titleAr="تسجيل مستخدمين"
      footer={
        <>
          <button type="button" className="enr-btn" onClick={onClose}>
            <T en="Cancel" ar="إلغاء" />
          </button>
          <button
            type="submit"
            form="enrol-user-form"
            className="enr-btn enr-btn--primary"
            disabled={!canSubmit}
          >
            {busy && <Icon name="loader" size={15} className="enr-spin" />}
            <T en="Enrol user" ar="تسجيل المستخدم" />
          </button>
        </>
      }
    >
      {/* A real form so Enter submits and the fields are grouped; the footer's
          submit button binds via its form="enrol-user-form" attribute. */}
      <form
        id="enrol-user-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
      {error && <div className="error-banner">{error}</div>}

      {methodsLoaded && methods.length === 0 && (
        <p className="enr-field__err" role="status">
          <T
            en="This course has no enrolment methods — add one in the Methods tab first."
            ar="لا توجد طرق تسجيل في هذا المقرر — أضف طريقة من تبويب «طرق التسجيل» أولاً."
          />
        </p>
      )}

      <div className="enr-field">
        <label className="enr-field__label">
          <T en="User" ar="المستخدم" />
          <span className="enr-req" aria-hidden="true">*</span>
        </label>
        <UserCombo
          users={users}
          value={userId}
          onChange={setUserId}
          required
          ariaLabel={both("User", "المستخدم")}
        />
      </div>

      <div className="enr-field-grid">
        <div className="enr-field">
          <label className="enr-field__label" htmlFor="enr-method">
            <T en="Enrolment method" ar="طريقة التسجيل" />
            <span className="enr-req" aria-hidden="true">*</span>
          </label>
          <div className="enr-field__wrap">
            <span className="enr-field__lead" aria-hidden="true">
              <Icon name="workflow" size={16} />
            </span>
            <select
              id="enr-method"
              className="enr-select enr-select--lead"
              value={methodId ?? ""}
              aria-required="true"
              onChange={(e) => setMethodId(e.target.value ? Number(e.target.value) : null)}
            >
              {methods.map((m) => {
                const mm = methodMeta(m.method);
                return (
                  <option key={m.id} value={m.id}>
                    {mm.en}
                    {m.status !== "enabled" ? " — disabled" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="enr-field">
          <label className="enr-field__label" htmlFor="enr-role">
            <T en="Role" ar="الدور" />
          </label>
          <div className="enr-field__wrap">
            <span className="enr-field__lead" aria-hidden="true">
              <Icon name="shield" size={16} />
            </span>
            <select
              id="enr-role"
              className="enr-select enr-select--lead"
              value={roleId ?? ""}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
            >
              {roleOptions.length === 0 && <option value="">—</option>}
              {roleOptions.map((r) => {
                const rm = roleMeta(r.short_name ?? r.name);
                return (
                  <option key={r.id} value={r.id}>
                    {r.name ?? rm.en}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="enr-field">
          <label className="enr-field__label" htmlFor="enr-start">
            <T en="Start date" ar="تاريخ البدء" />
          </label>
          <div className="enr-field__wrap">
            <span className="enr-field__lead" aria-hidden="true">
              <Icon name="calendar" size={16} />
            </span>
            <input
              id="enr-start"
              className="enr-input enr-input--lead"
              type="datetime-local"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
            />
          </div>
        </div>

        <div className="enr-field">
          <label className="enr-field__label" htmlFor="enr-end">
            <T en="End date" ar="تاريخ الانتهاء" />
          </label>
          <div className="enr-field__wrap">
            <span className="enr-field__lead" aria-hidden="true">
              <Icon name="calendarClock" size={16} />
            </span>
            <input
              id="enr-end"
              className="enr-input enr-input--lead"
              type="datetime-local"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
            />
          </div>
          {!datesValid && (
            <span className="enr-field__err">
              <T en="End must be after start." ar="يجب أن يكون الانتهاء بعد البدء." />
            </span>
          )}
        </div>
      </div>

      <Switch
        id="enr-activate"
        checked={activate}
        onChange={setActivate}
        label="Activate immediately"
        ar="تفعيل مباشرة"
      />

      {reasons && <ReasonList reasons={reasons} tone="error" title={both("Could not enrol", "تعذّر التسجيل")} />}
      </form>
    </Dialog>
  );
}
