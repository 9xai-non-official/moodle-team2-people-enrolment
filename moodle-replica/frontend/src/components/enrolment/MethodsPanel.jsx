// Methods tab (spec §40-44, §47). One card per enrolment-method instance with
// its status, default role, cohort, window, config indication (never the raw
// key), and enrolment count. Actions gate on the backend: enable/disable, sync
// (cohort only), view enrolments, edit, delete. Sync shows the real SyncResult
// counts; delete carries a strong last-path warning. Every write refetches.
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiDelete, ApiError } from "../../api";
import { useLang } from "../../context/Lang";
import ReasonList from "../common/ReasonList";
import Icon from "./icons";
import MethodCreateForm from "./MethodCreateForm";
import {
  ActionsMenu,
  Avatar,
  Dialog,
  EmptyState,
  ScopedError,
  Spinner,
  T,
  both,
  fmtDate,
  methodMeta,
  roleMeta,
} from "./ui";

const NODE_TONE = { manual: "green", self: "orange", cohort: "blue", guest: "purple" };

function MethodStatus({ status }) {
  const on = status === "enabled";
  return (
    <span className={`enr-badge enr-badge--${on ? "green" : "orange"}`}>
      <Icon name={on ? "circleCheck" : "circleMinus"} size={14} />
      {on ? <T en="Enabled" ar="مفعّلة" /> : <T en="Disabled" ar="معطّلة" />}
    </span>
  );
}

export default function MethodsPanel({ courseId }) {
  const { lang, dir } = useLang();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionReasons, setActionReasons] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncResult, setSyncResult] = useState({});
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null); // method whose enrolments to list
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/courses/${courseId}/methods`)
      .then(setMethods)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (promise, after) => {
    setBusy(true);
    setActionError(null);
    setActionReasons(null);
    promise
      .then((res) => {
        after?.(res);
        load();
      })
      .catch((e) => {
        // Surface the backend's prescriptive reasons verbatim (e.g. the R-COHORT
        // 409 "suspend it first, or remove the user from the cohort") — a
        // single-line message would lose multi-reason refusals (spec §51, §3).
        if (e instanceof ApiError && e.reasons?.length) setActionReasons(e.reasons);
        else setActionError(e.message);
      })
      .finally(() => setBusy(false));
  };

  const doDelete = () => {
    const m = deleting;
    setDeleting(null);
    run(apiDelete(`/api/enrolment/methods/${m.id}`));
  };

  const menuItems = (m) => {
    const items = [
      { kind: "item", icon: "pencil", label: "Edit", ar: "تعديل", onSelect: () => setEditing(m) },
      m.status === "enabled"
        ? {
            kind: "item",
            icon: "pauseCircle",
            label: "Disable",
            ar: "تعطيل",
            disabled: busy,
            onSelect: () => run(apiPatch(`/api/enrolment/methods/${m.id}`, { status: "disabled" })),
          }
        : {
            kind: "item",
            icon: "playCircle",
            label: "Enable",
            ar: "تفعيل",
            disabled: busy,
            onSelect: () => run(apiPatch(`/api/enrolment/methods/${m.id}`, { status: "enabled" })),
          },
      m.method === "cohort"
        ? {
            kind: "item",
            icon: "refreshCw",
            label: "Sync now",
            ar: "مزامنة الآن",
            disabled: busy,
            onSelect: () =>
              run(apiPost(`/api/enrolment/methods/${m.id}/sync`), (r) =>
                setSyncResult((s) => ({ ...s, [m.id]: r })),
              ),
          }
        : null,
      { kind: "item", icon: "eye", label: "View enrolments", ar: "عرض التسجيلات", onSelect: () => setViewing(m) },
      { kind: "sep" },
      { kind: "item", icon: "trash2", label: "Delete", ar: "حذف", danger: true, onSelect: () => setDeleting(m) },
    ];
    return items;
  };

  return (
    <section className="enr-card">
      <header className="enr-card__head">
        <span className="enr-card__ic enr-card__ic--blue">
          <Icon name="workflow" size={19} />
        </span>
        <h2 className="enr-card__title">
          <T en="Enrolment methods" ar="طرق التسجيل" />
        </h2>
        <div className="enr-card__actions">
          <button type="button" className="enr-btn enr-btn--primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} />
            <T en="Add method" ar="إضافة طريقة" />
          </button>
        </div>
      </header>

      <div className="enr-card__body">
        {actionReasons && (
          <ReasonList reasons={actionReasons} tone="error" title={both("Action refused", "تعذّر الإجراء")} />
        )}
        {actionError && <ScopedError message={actionError} onRetry={() => setActionError(null)} lang={lang} />}
        {loading && <Spinner lang={lang} />}
        {!loading && error && <ScopedError message={error} onRetry={load} lang={lang} />}
        {!loading && !error && methods.length === 0 && (
          <EmptyState icon="workflow" en="No enrolment methods on this course." ar="لا توجد طرق تسجيل في هذا المقرر." />
        )}

        {!loading && !error && methods.length > 0 && (
          <div className="enr-methods">
            {methods.map((m) => {
              const mm = methodMeta(m.method);
              const tone = NODE_TONE[m.method] ?? "grey";
              const res = syncResult[m.id];
              const rm = m.default_role ? roleMeta(m.default_role.short_name) : null;
              return (
                <article className="enr-method" key={m.id}>
                  <div className="enr-method__top">
                    <span className={`enr-method__ic enr-method__ic--${tone}`}>
                      <Icon name={mm.icon} size={20} />
                    </span>
                    <div className="enr-method__head">
                      <div className="enr-method__name">
                        <T en={mm.en} ar={mm.ar} />
                      </div>
                      <div className="enr-method__sub">
                        <MethodStatus status={m.status} />
                        <span className="enr-muted">
                          <Icon name="users" size={13} /> {m.enrolled_count}{" "}
                          <T en="enrolled" ar="مسجّل" />
                        </span>
                      </div>
                    </div>
                    <ActionsMenu
                      label={both(`Actions for the ${mm.en} method`, `إجراءات طريقة ${mm.ar || mm.en}`)}
                      items={menuItems(m)}
                      lang={lang}
                    />
                  </div>

                  <dl className="enr-method__facts">
                    {rm && (
                      <div>
                        <dt><T en="Default role" ar="الدور الافتراضي" /></dt>
                        <dd><Icon name={rm.icon} size={14} /> <T en={rm.en} ar={rm.ar} /></dd>
                      </div>
                    )}
                    {m.cohort && (
                      <div>
                        <dt><T en="Cohort" ar="الفوج" /></dt>
                        <dd><Icon name="usersRound" size={14} /> {m.cohort.name}</dd>
                      </div>
                    )}
                    {m.method === "self" && (
                      <div>
                        <dt><T en="Key" ar="المفتاح" /></dt>
                        <dd>
                          {m.config?.key ? (
                            <span className="enr-badge enr-badge--xs enr-badge--amber">
                              <Icon name="lock" size={12} /> <T en="Key required" ar="مفتاح مطلوب" />
                            </span>
                          ) : (
                            <span className="enr-muted"><T en="No key" ar="بدون مفتاح" /></span>
                          )}
                        </dd>
                      </div>
                    )}
                    {m.method === "guest" && (
                      <div>
                        <dt><T en="Password" ar="كلمة المرور" /></dt>
                        <dd>
                          {m.config?.key ? (
                            <span className="enr-badge enr-badge--xs enr-badge--amber">
                              <Icon name="lock" size={12} /> <T en="Required" ar="مطلوبة" />
                            </span>
                          ) : (
                            <span className="enr-muted"><T en="None" ar="لا شيء" /></span>
                          )}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt><T en="Start" ar="البداية" /></dt>
                      <dd>{fmtDate(m.enrol_start, lang)}</dd>
                    </div>
                    <div>
                      <dt><T en="End" ar="النهاية" /></dt>
                      <dd>{fmtDate(m.enrol_end, lang)}</dd>
                    </div>
                  </dl>

                  {res && (
                    <div className={`enr-sync ${res.skipped ? "enr-sync--warn" : "enr-sync--ok"}`}>
                      <Icon name={res.skipped ? "info" : "circleCheck"} size={15} />
                      {res.skipped ? (
                        <T en={`Sync skipped — ${res.reason ?? "no changes"}`} ar={`تم تخطي المزامنة — ${res.reason ?? "لا تغييرات"}`} />
                      ) : (
                        <T
                          en={`Sync done · +${res.added.length} added · ${res.kept.length} kept · −${res.removed.length} removed`}
                          ar={`تمت المزامنة · +${res.added.length} مضاف · ${res.kept.length} مُبقى · −${res.removed.length} مُزال`}
                        />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Add method */}
      <Dialog open={adding} onClose={() => setAdding(false)} dir={dir} icon="plus" title="Add enrolment method" titleAr="إضافة طريقة تسجيل" size="lg">
        <MethodCreateForm
          courseId={courseId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      </Dialog>

      {/* Edit method */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} dir={dir} icon="pencil" title="Edit enrolment method" titleAr="تعديل طريقة التسجيل" size="lg">
        {editing && (
          <MethodCreateForm
            courseId={courseId}
            method={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Dialog>

      {/* View enrolments */}
      <Dialog
        open={!!viewing}
        onClose={() => setViewing(null)}
        dir={dir}
        icon="eye"
        title="Method enrolments"
        titleAr="تسجيلات الطريقة"
        size="lg"
      >
        {viewing && <MethodEnrolments methodId={viewing.id} lang={lang} />}
      </Dialog>

      {/* Delete method */}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        dir={dir}
        icon="triangleAlert"
        variant="danger"
        title="Delete enrolment method?"
        titleAr="حذف طريقة التسجيل؟"
        footer={
          <>
            <button type="button" className="enr-btn" onClick={() => setDeleting(null)}>
              <T en="Cancel" ar="إلغاء" />
            </button>
            <button type="button" className="enr-btn enr-btn--danger" onClick={doDelete}>
              <Icon name="trash2" size={15} />
              <T en="Delete method" ar="حذف الطريقة" />
            </button>
          </>
        }
      >
        {deleting && (
          <div className="enr-confirm">
            <p className="enr-confirm__note enr-confirm__note--warn">
              <Icon name="triangleAlert" size={16} />
              <T
                en={`The ${methodMeta(deleting.method).en} method will be removed. Each enrolment through it is unenrolled: users with no other valid path leave the course roster; users with another path stay enrolled. Completion records are kept.`}
                ar={`ستُزال طريقة ${methodMeta(deleting.method).ar || methodMeta(deleting.method).en}. سيُلغى كل تسجيل عبرها: من ليس له مسار آخر يغادر القائمة، ومن له مسار آخر يبقى مسجّلاً. تُحفظ سجلات الإنجاز.`}
              />
            </p>
            <p className="enr-muted">
              <T
                en={`${deleting.enrolled_count} enrolment${deleting.enrolled_count === 1 ? "" : "s"} go through this method.`}
                ar={`${deleting.enrolled_count} تسجيل عبر هذه الطريقة.`}
              />
            </p>
          </div>
        )}
      </Dialog>
    </section>
  );
}

function MethodEnrolments({ methodId, lang }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/methods/${methodId}/enrolments`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [methodId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner lang={lang} />;
  if (error) return <ScopedError message={error} onRetry={load} lang={lang} />;
  if (!rows.length)
    return <EmptyState icon="users" en="No enrolments through this method." ar="لا توجد تسجيلات عبر هذه الطريقة." />;

  return (
    <ul className="enr-mlist">
      {rows.map((r) => (
        <li key={r.enrolment_id} className="enr-mlist__row">
          <Avatar name={r.full_name} size={32} />
          <span className="enr-mlist__name">{r.full_name}</span>
          <span
            className={`enr-badge enr-badge--xs enr-badge--${r.status === "active" ? "green" : "orange"}`}
          >
            {r.status === "active" ? <T en="active" ar="نشط" /> : <T en="suspended" ar="موقوف" />}
          </span>
        </li>
      ))}
    </ul>
  );
}
