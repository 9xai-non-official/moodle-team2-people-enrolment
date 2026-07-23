// Create Role tab — create a role from scratch, or CLONE an existing one.
//   • create : POST /api/roles {short_name, name, description, archetype}
//   • clone  : POST /api/roles/{id}/clone {short_name, name, description}
// Cloning copies only the source role's SYSTEM-context definition (its
// role_capability rows) — deeper overrides are NOT copied; the UI says so and
// never pretends otherwise. Both require role:manage at system (admin bypasses),
// enforced server-side. We ALSO pre-gate the form with a real /check so an
// unauthorized user sees an honest disabled state, but the backend stays
// authoritative (a 403 is surfaced verbatim). No edit/delete is offered — the
// backend supports neither, so neither is invented.
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../api";
import { cachedGet } from "../../lib/catalog";
import { useActingUser } from "../../context/ActingUser";
import { useLang } from "../../context/Lang";
import Icon from "./icons";
import {
  Btn,
  EmptyState,
  ScopedError,
  SectionCard,
  SkeletonRows,
  Spinner,
  T,
  Tag,
  Tech,
  both,
  pick,
} from "./ui";

const ARCHETYPES = ["manager", "editingteacher", "teacher", "student", "guest"];
const SHORTNAME_RE = /^[a-z][a-z0-9_-]*$/;

export default function RoleCreateForm() {
  const { actingUser } = useActingUser();
  const { lang } = useLang();

  const [mode, setMode] = useState("create"); // create | clone
  const [shortName, setShortName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [archetype, setArchetype] = useState("");
  const [sourceId, setSourceId] = useState("");

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(null);
  const [systemCtxId, setSystemCtxId] = useState(null);

  const [gate, setGate] = useState({ checking: true, canManage: false, reason: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // roles list — apiGet (NOT cached): a created role must appear immediately.
  const loadRoles = useCallback(() => {
    setRolesLoading(true);
    apiGet("/api/roles")
      .then((r) => setRoles(r))
      .catch((e) => setRolesError(e))
      .finally(() => setRolesLoading(false));
  }, []);
  useEffect(() => loadRoles(), [loadRoles]);

  useEffect(() => {
    cachedGet("/api/roles/contexts")
      .then((cs) => setSystemCtxId(cs.find((c) => c.level === "system")?.id ?? cs[0]?.id ?? null))
      .catch(() => setSystemCtxId(null));
  }, []);

  // Authorization pre-gate: does the PRINCIPAL hold role:manage at system?
  useEffect(() => {
    if (!actingUser || systemCtxId == null) return;
    let live = true;
    setGate({ checking: true, canManage: false, reason: null });
    apiPost("/api/permissions/check", {
      actor_user_id: actingUser.id,
      capability: "role:manage",
      context_id: systemCtxId,
    })
      .then((res) => {
        if (!live) return;
        setGate({
          checking: false,
          canManage: res.allowed,
          reason: res.allowed ? null : res.blocking_reasons?.[0] ?? null,
        });
      })
      .catch((e) => live && setGate({ checking: false, canManage: false, reason: e.message }));
    return () => {
      live = false;
    };
  }, [actingUser, systemCtxId]);

  const shortErr =
    shortName && !SHORTNAME_RE.test(shortName.trim())
      ? pick(lang, "Lowercase letters, digits, - and _ only (must start with a letter).", "أحرف صغيرة وأرقام و- و_ فقط (تبدأ بحرف).")
      : null;
  const canSubmit =
    gate.canManage &&
    !submitting &&
    shortName.trim() &&
    name.trim() &&
    !shortErr &&
    (mode === "create" || sourceId);

  const reset = () => {
    setShortName("");
    setName("");
    setDescription("");
    setArchetype("");
    setSourceId("");
    setError(null);
    setSuccess(null);
  };

  const submit = useCallback(() => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const body = { short_name: shortName.trim(), name: name.trim(), description: description.trim() };
    const req =
      mode === "clone"
        ? apiPost(`/api/roles/${sourceId}/clone`, body)
        : apiPost("/api/roles", { ...body, archetype: archetype || null });
    req
      .then((res) => {
        const created = res?.role ?? res;
        setSuccess({
          name: created?.name ?? name.trim(),
          shortName: created?.short_name ?? shortName.trim(),
          copied: res?.capabilities_copied,
          cloned: mode === "clone",
        });
        reset();
        loadRoles();
      })
      .catch((e) => setError(e)) // preserves the form on failure
      .finally(() => setSubmitting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, shortName, name, description, archetype, sourceId, loadRoles]);

  const sourceRole = useMemo(() => roles.find((r) => String(r.id) === String(sourceId)), [roles, sourceId]);

  return (
    <div className="rl-create">
      <SectionCard icon="circlePlus" tone="blue" title="Create role" titleAr="إنشاء دور">
        {/* authz banner */}
        {gate.checking ? (
          <Spinner label={pick(lang, "Checking permission…", "جارٍ فحص الصلاحية…")} lang={lang} />
        ) : !gate.canManage ? (
          <div className="rl-authgate" role="note">
            <Icon name="shieldX" size={18} />
            <div>
              <strong>{pick(lang, "You cannot create or clone roles.", "لا يمكنك إنشاء أو استنساخ الأدوار.")}</strong>
              <p>
                {pick(lang, "This requires ", "يتطلب هذا ")}
                <Tech>role:manage</Tech>
                {pick(lang, " at the system context (a site administrator). ", " في سياق النظام (مدير موقع). ")}
                {gate.reason && <span className="rl-muted">{gate.reason}</span>}
              </p>
            </div>
          </div>
        ) : null}

        <div className={`rl-createform ${!gate.canManage ? "rl-createform--disabled" : ""}`}>
          <div className="rl-modeseg" role="group" aria-label={both("Creation mode", "وضع الإنشاء")}>
            <button
              type="button"
              className={`rl-modeseg__opt ${mode === "create" ? "rl-modeseg__opt--on" : ""}`}
              aria-pressed={mode === "create"}
              disabled={!gate.canManage}
              onClick={() => setMode("create")}
            >
              <Icon name="circlePlus" size={15} />
              {pick(lang, "Create from scratch", "إنشاء من الصفر")}
            </button>
            <button
              type="button"
              className={`rl-modeseg__opt ${mode === "clone" ? "rl-modeseg__opt--on" : ""}`}
              aria-pressed={mode === "clone"}
              disabled={!gate.canManage}
              onClick={() => setMode("clone")}
            >
              <Icon name="copy" size={15} />
              {pick(lang, "Duplicate existing", "استنساخ موجود")}
            </button>
          </div>

          <div className="rl-formgrid rl-formgrid--create">
            {mode === "clone" && (
              <label className="rl-field rl-field--wide">
                <span className="rl-field__label">
                  <Icon name="copy" size={14} />
                  <T en="Duplicate from" ar="استنساخ من" />
                </span>
                <select
                  className="rl-select"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  disabled={!gate.canManage}
                >
                  <option value="">{pick(lang, "— select source role —", "— اختر الدور المصدر —")}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.short_name})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="rl-field">
              <span className="rl-field__label">
                <Icon name="code" size={14} />
                <T en="Short name" ar="الاسم المختصر" />
                <span className="rl-field__req">*</span>
              </span>
              <input
                className={`rl-input ${shortErr ? "rl-input--invalid" : ""}`}
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="teacher_allgroups"
                dir="ltr"
                disabled={!gate.canManage}
                aria-invalid={shortErr ? true : undefined}
              />
              {shortErr && <span className="rl-field__err">{shortErr}</span>}
            </label>

            <label className="rl-field">
              <span className="rl-field__label">
                <Icon name="shield" size={14} />
                <T en="Display name" ar="الاسم المعروض" />
                <span className="rl-field__req">*</span>
              </span>
              <input
                className="rl-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={pick(lang, "TA (all groups)", "مساعد (كل المجموعات)")}
                disabled={!gate.canManage}
              />
            </label>

            {mode === "create" && (
              <label className="rl-field">
                <span className="rl-field__label">
                  <Icon name="layers" size={14} />
                  <T en="Archetype" ar="النموذج" />
                </span>
                <select
                  className="rl-select"
                  value={archetype}
                  onChange={(e) => setArchetype(e.target.value)}
                  disabled={!gate.canManage}
                >
                  <option value="">{pick(lang, "none", "لا شيء")}</option>
                  {ARCHETYPES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="rl-field rl-field--wide">
              <span className="rl-field__label">
                <Icon name="alignLeft" size={14} />
                <T en="Description" ar="الوصف" />
              </span>
              <textarea
                className="rl-input rl-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder={pick(lang, "What this role is for", "الغرض من هذا الدور")}
                disabled={!gate.canManage}
              />
            </label>
          </div>

          {mode === "clone" && (
            <p className="rl-scopeline">
              <Icon name="info" size={13} />
              {sourceRole ? (
                <span>
                  {pick(lang, "Copies", "ينسخ")} <Tech>{sourceRole.short_name}</Tech>
                  {pick(
                    lang,
                    "’s system-context capability definition. Deeper context overrides are NOT copied.",
                    " تعريف الصلاحيات عند سياق النظام. تجاوزات السياقات الأعمق لا تُنسخ.",
                  )}
                </span>
              ) : (
                pick(lang, "Cloning copies the source's system-context definition only.", "الاستنساخ ينسخ تعريف سياق النظام فقط.")
              )}
            </p>
          )}

          <div className="rl-form-actions">
            <Btn variant="ghost" onClick={reset} disabled={submitting || !gate.canManage}>
              {pick(lang, "Reset", "إعادة تعيين")}
            </Btn>
            <Btn
              variant="primary"
              icon={submitting ? "loader" : mode === "clone" ? "copy" : "circlePlus"}
              disabled={!canSubmit}
              onClick={submit}
            >
              {submitting
                ? pick(lang, "Saving", "جارٍ الحفظ")
                : mode === "clone"
                  ? pick(lang, "Clone role", "استنساخ الدور")
                  : pick(lang, "Create role", "إنشاء دور")}
            </Btn>
          </div>

          {success && (
            <div className="rl-success" role="status">
              <Icon name="circleCheck" size={16} />
              <span>
                {success.cloned
                  ? pick(lang, "Cloned", "تم الاستنساخ")
                  : pick(lang, "Created", "تم الإنشاء")}{" "}
                <strong>{success.name}</strong> (<Tech>{success.shortName}</Tech>)
                {success.cloned && success.copied != null && (
                  <span className="rl-muted">
                    {" "}
                    · {success.copied} {pick(lang, "capabilities copied", "صلاحية منسوخة")}
                  </span>
                )}
              </span>
            </div>
          )}
          {error && <ScopedError error={error} lang={lang} compact />}
        </div>
      </SectionCard>

      {/* existing roles (read-only reference; clone shortcut only) */}
      <SectionCard icon="shield" title="Existing roles" titleAr="الأدوار الموجودة">
        {rolesError ? (
          <ScopedError error={rolesError} onRetry={loadRoles} lang={lang} />
        ) : rolesLoading ? (
          <SkeletonRows lines={4} />
        ) : roles.length === 0 ? (
          <EmptyState icon="shieldX" en="No roles are available." ar="لا أدوار متاحة." />
        ) : (
          <div className="rl-tablewrap">
            <table className="rl-table">
              <thead>
                <tr>
                  <th scope="col">{pick(lang, "Role", "الدور")}</th>
                  <th scope="col">{pick(lang, "Short name", "الاسم المختصر")}</th>
                  <th scope="col">{pick(lang, "Archetype", "النموذج")}</th>
                  <th scope="col">{pick(lang, "Description", "الوصف")}</th>
                  <th scope="col" className="rl-th-actions" />
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      <span className="rl-muted"> · #{r.id}</span>
                    </td>
                    <td>
                      <Tech>{r.short_name}</Tech>
                    </td>
                    <td>{r.archetype ? <Tag>{r.archetype}</Tag> : <span className="rl-muted">—</span>}</td>
                    <td className="rl-desc">{r.description || <span className="rl-muted">—</span>}</td>
                    <td>
                      <button
                        type="button"
                        className="rl-iconbtn"
                        aria-label={`${both("Clone", "استنساخ")} ${r.short_name}`}
                        title={pick(lang, "Clone this role", "استنساخ هذا الدور")}
                        disabled={!gate.canManage}
                        onClick={() => {
                          setMode("clone");
                          setSourceId(String(r.id));
                          setShortName(`${r.short_name}_copy`);
                          setName(`${r.name} (copy)`);
                          setSuccess(null);
                          setError(null);
                        }}
                      >
                        <Icon name="copy" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
