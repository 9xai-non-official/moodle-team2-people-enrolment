// User enrolment paths (spec §33-35, HC-1). The desktop right rail (structural)
// and the mobile sheet both render this. Provenance comes from the real
// endpoint GET /api/enrolment/users/{id}/enrolments — one row per path, with
// {course, method, method_status, status, time_start, time_end, live}. There is
// no server-side event history, so the timeline shows the CURRENT path rows as
// honest provenance nodes (never a fabricated audit trail). "View full history"
// lists every path across every course — again, only what the API returns.
import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../api";
import Icon from "./icons";
import {
  Avatar,
  Dialog,
  EmptyState,
  ScopedError,
  Spinner,
  T,
  both,
  fmtDate,
  methodMeta,
} from "./ui";

// Timeline node colour by provenance method (spec §34).
const NODE_TONE = { manual: "green", cohort: "blue", self: "orange", guest: "purple" };
const nodeTone = (method) => NODE_TONE[String(method ?? "").toLowerCase()] ?? "grey";

function PathNode({ p, lang }) {
  const mm = methodMeta(p.method);
  const tone = nodeTone(p.method);
  return (
    <li className={`enr-tl__item enr-tl__item--${tone}`}>
      <span className="enr-tl__dot">
        <Icon name={mm.icon} size={15} />
      </span>
      <div className="enr-tl__card">
        <div className="enr-tl__title">
          <T en={mm.en} ar={mm.ar} />
        </div>
        <dl className="enr-tl__meta">
          {p.course?.short_name && (
            <div>
              <dt><T en="Course" ar="المقرر" /></dt>
              <dd>
                {p.course.short_name}
                {p.course.deleted && (
                  <span className="enr-badge enr-badge--amber enr-badge--xs">
                    <T en="deleted" ar="محذوف" />
                  </span>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt><T en="Start" ar="البداية" /></dt>
            <dd>{fmtDate(p.time_start, lang)}</dd>
          </div>
          {p.time_end && (
            <div>
              <dt><T en="End" ar="النهاية" /></dt>
              <dd>{fmtDate(p.time_end, lang)}</dd>
            </div>
          )}
          <div>
            <dt><T en="State" ar="الحالة" /></dt>
            <dd>
              <span
                className={`enr-badge enr-badge--xs enr-badge--${
                  p.status === "active" ? "green" : "orange"
                }`}
              >
                {p.status === "active" ? <T en="active" ar="نشط" /> : <T en="suspended" ar="موقوف" />}
              </span>
              <span
                className={`enr-badge enr-badge--xs enr-badge--${p.live ? "green" : "grey"}`}
                title={both(
                  p.live ? "This path currently grants access" : "This path is not currently live",
                  p.live ? "هذا المسار يمنح الوصول حاليًا" : "هذا المسار غير فعّال حاليًا",
                )}
              >
                {p.live ? <T en="live" ar="فعّال" /> : <T en="not live" ar="غير فعّال" />}
              </span>
            </dd>
          </div>
        </dl>
        <div className="enr-tl__tech">
          <T en={`method #${p.method_id}`} ar={`الطريقة #${p.method_id}`} /> · {p.method_status}
        </div>
      </div>
    </li>
  );
}

export default function UserPathsPanel({ user, courseId, onClose, lang, dir }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // Guards against out-of-order responses: selecting user A then B must never
  // paint A's paths under B's name if A's slower response lands last (the panel
  // is reused across users, not remounted). Mirrors ParticipantsTable's guard.
  const reqId = useRef(0);

  const load = () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/users/${user.user_id}/enrolments`)
      .then((data) => {
        if (id === reqId.current) setRows(data);
      })
      .catch((e) => {
        if (id === reqId.current) setError(e.message);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  };

  useEffect(load, [user.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inCourse = rows.filter((r) => r.course?.id === courseId);

  return (
    <aside className="enr-rail__panel enr-paths" aria-label={both("User enrolment paths", "مسارات تسجيل المستخدم")}>
      <header className="enr-rail__head">
        <h2 className="enr-rail__title">
          <T en="User enrolment paths" ar="مسارات تسجيل المستخدم" />
        </h2>
        <button
          type="button"
          className="enr-iconbtn"
          aria-label={both("Close enrolment paths", "إغلاق مسارات التسجيل")}
          onClick={onClose}
        >
          <Icon name="x" size={18} />
        </button>
      </header>
      <p className="enr-rail__intro">
        <T
          en="How this user was enrolled in this course."
          ar="كيفية تسجيل هذا المستخدم في هذا المقرر."
        />
      </p>

      <div className="enr-paths__user">
        <Avatar name={user.full_name} size={40} />
        <div className="enr-paths__id">
          <span className="enr-paths__name">{user.full_name}</span>
          <span className="enr-paths__user-sub">{user.username}</span>
        </div>
      </div>

      <div className="enr-rail__scroll">
        {loading && <Spinner lang={lang} />}
        {!loading && error && <ScopedError message={error} onRetry={load} lang={lang} />}
        {!loading && !error && inCourse.length === 0 && (
          <EmptyState
            icon="gitBranch"
            en="No enrolment paths in this course."
            ar="لا توجد مسارات تسجيل في هذا المقرر."
          />
        )}
        {!loading && !error && inCourse.length > 0 && (
          <ol className="enr-tl">
            {inCourse.map((p) => (
              <PathNode key={p.method_id} p={p} lang={lang} />
            ))}
          </ol>
        )}
      </div>

      {!loading && !error && rows.length > 0 && (
        <footer className="enr-rail__foot">
          <button type="button" className="enr-link" onClick={() => setShowHistory(true)}>
            <Icon name="history" size={16} />
            <T en="View full history" ar="عرض السجل الكامل" />
          </button>
        </footer>
      )}

      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        dir={dir}
        icon="history"
        title="Enrolment history"
        titleAr="سجل التسجيل"
        size="lg"
      >
        <p className="enr-dialog__lead">
          <T
            en={`Every enrolment path ${user.full_name} has, across all courses. Only rows the backend returns are shown — no synthetic audit events.`}
            ar={`جميع مسارات تسجيل ${user.full_name} في كل المقررات. تُعرض السجلات التي يعيدها الخادم فقط.`}
          />
        </p>
        {rows.length === 0 ? (
          <EmptyState icon="gitBranch" en="No enrolment paths." ar="لا توجد مسارات تسجيل." />
        ) : (
          <ol className="enr-tl enr-tl--flat">
            {rows.map((p) => (
              <PathNode key={`${p.course?.id}-${p.method_id}`} p={p} lang={lang} />
            ))}
          </ol>
        )}
      </Dialog>
    </aside>
  );
}
