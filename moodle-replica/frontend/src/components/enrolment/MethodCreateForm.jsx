// Enrolment-method form (spec §43). One component, two modes: CREATE (POST
// /courses/{id}/methods) and EDIT (PATCH /methods/{id}). Fields follow the real
// MethodCreate/MethodPatch schema; conditional fields appear only where the
// method supports them (self → key/capacity, cohort → cohort select, guest →
// password). Validates date ordering and the required cohort. Renders its own
// action buttons so it drops straight into a Dialog. Refusals show verbatim.
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, ApiError } from "../../api";
import { cachedGet } from "../../lib/catalog";
import ReasonList from "../common/ReasonList";
import Icon from "./icons";
import { T, both, methodMeta } from "./ui";

const KINDS = ["manual", "self", "cohort", "guest"];
const toLocal = (iso) => (iso ? String(iso).slice(0, 16) : "");

export default function MethodCreateForm({ courseId, method = null, onSaved, onCancel }) {
  const editing = !!method;
  const [roles, setRoles] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [kind, setKind] = useState(method?.method ?? "manual");
  const [statusOn, setStatusOn] = useState(method ? method.status === "enabled" : true);
  const [roleId, setRoleId] = useState(method?.default_role?.id ?? null);
  const [cohortId, setCohortId] = useState(method?.cohort?.id ?? null);
  const [key, setKey] = useState(method?.config?.key ?? "");
  const [maxEnrolled, setMaxEnrolled] = useState(method?.config?.max_enrolled ?? "");
  // Guest password is stored under config.key on the backend (services/
  // enrolment.py guest_access_enabled reads config['key']) — NOT config.password.
  const [password, setPassword] = useState(method?.config?.key ?? "");
  const [start, setStart] = useState(toLocal(method?.enrol_start));
  const [end, setEnd] = useState(toLocal(method?.enrol_end));
  const [reasons, setReasons] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cachedGet("/api/roles").then(setRoles).catch(() => setRoles([]));
    apiGet("/api/enrolment/cohorts").then(setCohorts).catch(() => setCohorts([]));
  }, []);

  const datesValid = !start || !end || new Date(start) < new Date(end);
  const cohortOk = kind !== "cohort" || !!cohortId;
  const canSubmit = datesValid && cohortOk && !busy;

  const submit = () => {
    if (!canSubmit) return;
    setBusy(true);
    setReasons(null);
    setError(null);

    const config = {};
    if (kind === "self") {
      if (key) config.key = key;
      if (maxEnrolled) config.max_enrolled = Number(maxEnrolled);
    }
    if (kind === "guest" && password) config.key = password; // backend reads config.key

    const done = () => onSaved();
    const fail = (e) => {
      if (e instanceof ApiError) setReasons(e.reasons);
      else setError(e.message);
    };

    if (editing) {
      apiPatch(`/api/enrolment/methods/${method.id}`, {
        status: statusOn ? "enabled" : "disabled",
        default_role_id: roleId || undefined,
        enrol_start: start || null,
        enrol_end: end || null,
        config: Object.keys(config).length ? config : undefined,
      })
        .then(done)
        .catch(fail)
        .finally(() => setBusy(false));
    } else {
      const body = {
        method: kind,
        status: statusOn ? "enabled" : "disabled",
        default_role_id: roleId || undefined,
        enrol_start: start || undefined,
        enrol_end: end || undefined,
        config,
      };
      if (kind === "cohort") body.cohort_id = cohortId || undefined;
      apiPost(`/api/enrolment/courses/${courseId}/methods`, body)
        .then(done)
        .catch(fail)
        .finally(() => setBusy(false));
    }
  };

  return (
    <div className="enr-form">
      {error && <div className="error-banner">{error}</div>}

      <div className="enr-field-grid">
        <div className="enr-field">
          <label className="enr-field__label" htmlFor="mf-kind">
            <T en="Method" ar="الطريقة" />
          </label>
          <select
            id="mf-kind"
            className="enr-select"
            value={kind}
            disabled={editing}
            onChange={(e) => setKind(e.target.value)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {methodMeta(k).en}
              </option>
            ))}
          </select>
        </div>

        <div className="enr-field">
          <label className="enr-field__label" htmlFor="mf-role">
            <T en="Default role" ar="الدور الافتراضي" />
          </label>
          <select
            id="mf-role"
            className="enr-select"
            value={roleId ?? ""}
            onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{both("— default —", "— الافتراضي —")}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {kind === "cohort" && (
          <div className="enr-field">
            <label className="enr-field__label" htmlFor="mf-cohort">
              <T en="Cohort" ar="الفوج" />
            </label>
            <select
              id="mf-cohort"
              className="enr-select"
              value={cohortId ?? ""}
              disabled={editing}
              onChange={(e) => setCohortId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{both("— select cohort —", "— اختر فوجًا —")}</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!cohortOk && (
              <span className="enr-field__err">
                <T en="A cohort is required." ar="يلزم اختيار فوج." />
              </span>
            )}
          </div>
        )}

        {kind === "self" && (
          <>
            <div className="enr-field">
              <label className="enr-field__label" htmlFor="mf-key">
                <T en="Enrolment key" ar="مفتاح التسجيل" />
              </label>
              <div className="enr-field__wrap">
                <span className="enr-field__lead" aria-hidden="true">
                  <Icon name="key" size={16} />
                </span>
                <input
                  id="mf-key"
                  className="enr-input enr-input--lead"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={both("optional", "اختياري")}
                />
              </div>
            </div>
            <div className="enr-field">
              <label className="enr-field__label" htmlFor="mf-max">
                <T en="Max enrolled" ar="الحد الأقصى" />
              </label>
              <input
                id="mf-max"
                className="enr-input"
                type="number"
                min="0"
                value={maxEnrolled}
                onChange={(e) => setMaxEnrolled(e.target.value)}
                placeholder={both("optional", "اختياري")}
              />
            </div>
          </>
        )}

        {kind === "guest" && (
          <div className="enr-field">
            <label className="enr-field__label" htmlFor="mf-pass">
              <T en="Guest password" ar="كلمة مرور الضيف" />
            </label>
            <div className="enr-field__wrap">
              <span className="enr-field__lead" aria-hidden="true">
                <Icon name="lock" size={16} />
              </span>
              <input
                id="mf-pass"
                className="enr-input enr-input--lead"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={both("optional", "اختياري")}
              />
            </div>
          </div>
        )}

        <div className="enr-field">
          <label className="enr-field__label" htmlFor="mf-start">
            <T en="Enrol start" ar="بداية التسجيل" />
          </label>
          <div className="enr-field__wrap">
            <span className="enr-field__lead" aria-hidden="true">
              <Icon name="calendar" size={16} />
            </span>
            <input
              id="mf-start"
              className="enr-input enr-input--lead"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
        </div>

        <div className="enr-field">
          <label className="enr-field__label" htmlFor="mf-end">
            <T en="Enrol end" ar="نهاية التسجيل" />
          </label>
          <div className="enr-field__wrap">
            <span className="enr-field__lead" aria-hidden="true">
              <Icon name="calendarClock" size={16} />
            </span>
            <input
              id="mf-end"
              className="enr-input enr-input--lead"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          {!datesValid && (
            <span className="enr-field__err">
              <T en="End must be after start." ar="يجب أن تكون النهاية بعد البداية." />
            </span>
          )}
        </div>
      </div>

      <label className="enr-check">
        <input type="checkbox" checked={statusOn} onChange={(e) => setStatusOn(e.target.checked)} />
        <T en="Enabled" ar="مفعّلة" />
      </label>

      {reasons && (
        <ReasonList
          reasons={reasons}
          tone="error"
          title={editing ? both("Could not save method", "تعذّر حفظ الطريقة") : both("Could not add method", "تعذّر إضافة الطريقة")}
        />
      )}

      <div className="enr-form-actions">
        <button type="button" className="enr-btn" onClick={onCancel}>
          <T en="Cancel" ar="إلغاء" />
        </button>
        <button type="button" className="enr-btn enr-btn--primary" disabled={!canSubmit} onClick={submit}>
          {busy && <Icon name="loader" size={15} className="enr-spin" />}
          {editing ? <T en="Save method" ar="حفظ الطريقة" /> : <T en="Create method" ar="إنشاء الطريقة" />}
        </button>
      </div>
    </div>
  );
}
