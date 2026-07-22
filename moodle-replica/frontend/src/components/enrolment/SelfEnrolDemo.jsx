// Self-enrol demo tab (spec §48). Runs the backend gate chain for a course and
// renders every gate pass/fail verbatim, plus a green verdict on success or the
// blocking reasons on denial. The backend requires principal == target, so we
// default the user to the acting persona and say so plainly — a frontend
// selection cannot self-enrol as someone else (the server refuses, verbatim).
import { useEffect, useState } from "react";
import { apiPost } from "../../api";
import { cachedGet } from "../../lib/catalog";
import { useActingUser } from "../../context/ActingUser";
import { useLang } from "../../context/Lang";
import ReasonList from "../common/ReasonList";
import Icon from "./icons";
import { EmptyState, ScopedError, T, UserCombo, both } from "./ui";

export default function SelfEnrolDemo({ courseId }) {
  const { lang } = useLang();
  const { actingUser } = useActingUser();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [key, setKey] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cachedGet("/api/users").then(setUsers).catch(() => setUsers([]));
  }, []);
  useEffect(() => {
    if (actingUser?.id) setUserId((cur) => cur ?? actingUser.id);
  }, [actingUser]);

  const notSelf = actingUser && userId && userId !== actingUser.id;

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
    <section className="enr-card">
      <header className="enr-card__head">
        <span className="enr-card__ic enr-card__ic--orange">
          <Icon name="userPlus" size={19} />
        </span>
        <h2 className="enr-card__title">
          <T en="Self-enrol demo" ar="التسجيل الذاتي" />
        </h2>
      </header>

      <div className="enr-card__body">
        <p className="enr-lead">
          <T
            en="Runs the self-enrolment gate chain for the selected course. Self-enrolment always applies to the signed-in principal."
            ar="يُشغّل سلسلة بوابات التسجيل الذاتي للمقرر المحدد. يُطبَّق التسجيل الذاتي دائمًا على المستخدم الحالي."
          />
        </p>

        <div className="enr-field-grid">
          <div className="enr-field">
            <label className="enr-field__label">
              <T en="User (principal)" ar="المستخدم (الأساسي)" />
            </label>
            <UserCombo users={users} value={userId} onChange={setUserId} ariaLabel={both("User (principal)", "المستخدم")} />
          </div>
          <div className="enr-field">
            <label className="enr-field__label" htmlFor="se-key">
              <T en="Enrolment key" ar="مفتاح التسجيل" />
            </label>
            <div className="enr-field__wrap">
              <span className="enr-field__lead" aria-hidden="true">
                <Icon name="key" size={16} />
              </span>
              <input
                id="se-key"
                className="enr-input enr-input--lead"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={both("if required", "إن لزم")}
              />
            </div>
          </div>
        </div>

        {notSelf && (
          <p className="enr-confirm__note enr-confirm__note--warn">
            <Icon name="info" size={16} />
            <T
              en="This user differs from the acting persona — the backend only lets a principal self-enrol themselves, so expect a refusal."
              ar="هذا المستخدم يختلف عن الشخصية الحالية — يسمح الخادم بالتسجيل الذاتي للمستخدم نفسه فقط، لذا توقّع الرفض."
            />
          </p>
        )}

        <div className="enr-form-actions enr-form-actions--start">
          <button type="button" className="enr-btn enr-btn--primary" disabled={busy || !userId} onClick={submit}>
            {busy && <Icon name="loader" size={15} className="enr-spin" />}
            <Icon name="userPlus" size={16} />
            <T en="Test self enrolment" ar="اختبار التسجيل الذاتي" />
          </button>
        </div>

        {error && <ScopedError message={error} onRetry={submit} lang={lang} />}

        {result && (
          <div className="enr-verdict">
            {result.enrolled ? (
              <div className="enr-verdict__head enr-verdict__head--ok">
                <Icon name="circleCheck" size={20} />
                <T en="Enrolled — every gate passed." ar="تم التسجيل — اجتازت كل البوابات." />
                {result.method_id != null && (
                  <span className="enr-muted">
                    <T en={`method #${result.method_id}`} ar={`الطريقة #${result.method_id}`} />
                  </span>
                )}
              </div>
            ) : (
              <div className="enr-verdict__head enr-verdict__head--no">
                <Icon name="circleX" size={20} />
                <T en="Not enrolled — a gate blocked it." ar="لم يتم التسجيل — منعت إحدى البوابات ذلك." />
              </div>
            )}

            <ul className="enr-gates">
              {result.gates.map((g) => (
                <li key={g.gate} className={`enr-gate enr-gate--${g.passed ? "pass" : "fail"}`}>
                  <Icon name={g.passed ? "circleCheck" : "circleX"} size={16} />
                  <span className="enr-gate__name">{g.gate.replace(/_/g, " ")}</span>
                  {/* Backend sends reason="" for passed gates — label them rather
                      than render an empty cell. */}
                  <span className="enr-gate__why">
                    {g.reason ? g.reason : g.passed ? <T en="Passed" ar="اجتاز" /> : null}
                  </span>
                </li>
              ))}
            </ul>

            {!result.enrolled && result.blocking_reasons?.length > 0 && (
              <ReasonList reasons={result.blocking_reasons} tone="error" title={both("Enrolment blocked", "تم حظر التسجيل")} />
            )}
          </div>
        )}

        {!result && !error && !busy && (
          <EmptyState
            icon="userPlus"
            en="Run the test to see the gate-by-gate verdict."
            ar="شغّل الاختبار لعرض نتيجة كل بوابة."
          />
        )}
      </div>
    </section>
  );
}
