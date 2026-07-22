// Guest-preview tab (spec §49). Read-only verdict from the deliberately PUBLIC
// endpoint GET /api/enrolment/guest-preview/{course_id} — does this course let
// guests in, and is a password required? The reason text is shown verbatim,
// never rephrased. Loading / error states are scoped; refetch reruns the check.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import { useLang } from "../../context/Lang";
import Icon from "./icons";
import { ScopedError, Spinner, T } from "./ui";

export default function GuestPreview({ courseId }) {
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/guest-preview/${courseId}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const allowed = !!data?.guest_access;
  // A guest METHOD may exist yet be disabled (guest_access=false, method_id set,
  // no reason) — distinct from having no guest method at all (reason present).
  const hasMethod = data?.method_id != null;

  return (
    <section className="enr-card">
      <header className="enr-card__head">
        <span className="enr-card__ic enr-card__ic--blue">
          <Icon name="eye" size={19} />
        </span>
        <h2 className="enr-card__title">
          <T en="Guest preview" ar="معاينة الضيف" />
        </h2>
        <div className="enr-card__actions">
          <button type="button" className="enr-btn enr-btn--ghost" onClick={load} disabled={loading}>
            <Icon name="refreshCw" size={15} />
            <T en="Refresh" ar="تحديث" />
          </button>
        </div>
      </header>

      <div className="enr-card__body">
        {loading && <Spinner lang={lang} />}
        {!loading && error && <ScopedError message={error} onRetry={load} lang={lang} />}

        {!loading && !error && data && (
          <div className={`enr-guest ${allowed ? "enr-guest--ok" : "enr-guest--no"}`}>
            <span className="enr-guest__ic">
              <Icon name={allowed ? "eye" : "eyeOff"} size={28} />
            </span>
            <div className="enr-guest__body">
              <div className="enr-guest__verdict">
                {allowed ? (
                  <T en="Guests can access this course" ar="يمكن للضيوف الوصول لهذا المقرر" />
                ) : hasMethod ? (
                  <T en="Guest access is disabled" ar="وصول الضيوف معطّل" />
                ) : (
                  <T en="No guest access on this course" ar="لا يوجد وصول ضيوف لهذا المقرر" />
                )}
              </div>
              <div className="enr-guest__badges">
                <span
                  className={`enr-badge enr-badge--${allowed ? "green" : hasMethod ? "orange" : "grey"}`}
                >
                  <Icon name={allowed ? "circleCheck" : hasMethod ? "circleMinus" : "circleX"} size={14} />
                  {allowed ? (
                    <T en="Guest method enabled" ar="طريقة الضيف مفعّلة" />
                  ) : hasMethod ? (
                    <T en="Guest method disabled" ar="طريقة الضيف معطّلة" />
                  ) : (
                    <T en="No guest method" ar="لا توجد طريقة ضيف" />
                  )}
                </span>
                {allowed && (
                  <span className={`enr-badge enr-badge--${data.has_password ? "amber" : "neutral"}`}>
                    <Icon name={data.has_password ? "lock" : "info"} size={14} />
                    {data.has_password ? (
                      <T en="Password required" ar="كلمة مرور مطلوبة" />
                    ) : (
                      <T en="No password" ar="بدون كلمة مرور" />
                    )}
                  </span>
                )}
              </div>
              {/* Backend returns a reason only for the no-method case; a present-
                  but-disabled method carries none, so we supply the explanation. */}
              {data.reason ? (
                <p className="enr-guest__reason">
                  <Icon name="info" size={15} />
                  <span>{data.reason}</span>
                </p>
              ) : !allowed && hasMethod ? (
                <p className="enr-guest__reason">
                  <Icon name="info" size={15} />
                  <T en="A guest method exists but is currently disabled." ar="توجد طريقة ضيف لكنها معطّلة حاليًا." />
                </p>
              ) : null}
              {hasMethod && (
                <p className="enr-muted">
                  <T en={`Guest method #${data.method_id}`} ar={`طريقة الضيف #${data.method_id}`} />
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
