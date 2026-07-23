// Courses — the WhoCan course catalog. Browse courses, get IN (self-enrol with
// a key, or request enrolment where only manual exists — our improvement over
// stock Moodle's "You cannot enrol yourself" dead end), then open a course and
// work through its activities.
//
// DATA SOURCES (see the inspection notes):
//   • Authoritative, from the API (mock in this build; the real backend has no
//     /api/lms/* router yet): GET /api/lms/catalog?user_id= gives each course's
//     id/short_name/full_name/visible/group_mode + my enrolment status, whether
//     I teach it, a pending request flag, and my enrolment OPTIONS. Progress is a
//     SEPARATE real read: GET /api/progress/users/{id}/overview.
//   • Presentation only (lib/coursePresentation): Arabic titles, descriptions,
//     key topics, and thumbnail artwork. Never treated as a source of truth.
//   • Teacher is deliberately NOT shown as a name — the contract exposes none,
//     so the UI says "not assigned" instead of inventing one.
//
// Mutations reuse the existing endpoints: POST /api/lms/courses/{id}/self-enrol
// and POST /api/lms/courses/{id}/enrol-request. Backend refusal reasons are
// surfaced verbatim (never swallowed).
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "../api";
import { useActingUser } from "../context/ActingUser";
import { useSelectedCourse } from "../context/SelectedCourse";
import { useLang } from "../context/Lang";
import { useSession } from "../context/Session";
import { coursePresentation } from "../lib/coursePresentation";
import { fetchOverview } from "../lib/progressApi";
import TeamsChip from "../components/TeamsChip";
import CourseArt from "../components/lms/CourseArt";
import AssignmentPanel from "../components/lms/AssignmentPanel";
import QuizPanel from "../components/lms/QuizPanel";

/* ---- icon set (one SVG family, currentColor, no emoji) ------------------- */
const P = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.3 4.1M6.1 6.2A17 17 0 0 0 2 12s3.6 7 10 7a10.4 10.4 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  group: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 4.5a3.2 3.2 0 0 1 0 6.4" /><path d="M18 14c2.3.6 4 2.7 4 5.2" /></>,
  userCheck: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7 1.3 0 2.5.3 3.5.9" /><path d="M15.5 18l2 2 4-4" /></>,
  userPlus: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7 1.6 0 3 .5 4.2 1.4" /><path d="M17 11v6M20 14h-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  hourglass: <><path d="M7 3h10M7 21h10" /><path d="M7 3c0 4 2 5 5 9 3-4 5-5 5-9M7 21c0-4 2-5 5-9 3 4 5 5 5 9" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" /></>,
  send: <><path d="M21 3L10.5 13.5M21 3l-6.5 18-4-8-8-4z" /></>,
  chart: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12.5" y="8" width="3" height="10" /><rect x="18" y="5" width="3" height="13" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  code: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 9l-2.5 3L9 15M15 9l2.5 3L15 15" /></>,
  teacher: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-.9 4.5" /><path d="M20 5v6h-6" /></>,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 18h.01" /></>,
  cloudOff: <><path d="M3 3l18 18" /><path d="M7.5 8A5 5 0 0 1 17 9a4 4 0 0 1 2.5 7.2M6 16.5A3.5 3.5 0 0 1 6 9.5" /></>,
  book: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H5.5A1.5 1.5 0 0 1 4 16z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6h5.9A1.5 1.5 0 0 0 20 16z" /></>,
  searchX: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /><path d="M9 9l4 4M13 9l-4 4" /></>,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.5 12.5L20 3M17 6l2.5 2.5M14 9l2 2" /></>,
  check: <path d="M5 12.5l4 4 10-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  fileText: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4" /><path d="M9 13h6M9 17h6M9 9h2" /></>,
  listChecks: <><path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" /><path d="M11 6h9M11 12h9M11 18h9" /></>,
  message: <><path d="M4 5h16v11H8l-4 4z" /></>,
  shapes: <><rect x="4" y="13" width="7" height="7" rx="1" /><circle cx="17.5" cy="16.5" r="3.5" /><path d="M8 3l4 7H4z" /></>,
};
function Ic({ n, className = "" }) {
  return (
    <svg className={`cat-ic ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[n] ?? P.book}
    </svg>
  );
}
function Spinner({ className = "" }) {
  return (
    <svg className={`cat-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* ---- inline bilingual helper (EN + AR shown together, shell strategy) ----- */
function Bi({ en, ar }) {
  return (
    <>
      {en}
      {ar && <span className="cat-bi-ar" lang="ar">{ar}</span>}
    </>
  );
}

/* ---- static bilingual strings -------------------------------------------- */
const GROUP_MODE = {
  none: { en: "No groups", ar: "بلا مجموعات" },
  separate: { en: "Separate groups", ar: "مجموعات منفصلة" },
  visible: { en: "Visible groups", ar: "مجموعات مرئية" },
};
const STATE_META = {
  teaching: { en: "Teaching", ar: "تدريس", tone: "blue", icon: "teacher" },
  enrolled: { en: "Enrolled", ar: "مسجّل", tone: "green", icon: "userCheck" },
  completed: { en: "Completed", ar: "مكتمل", tone: "green", icon: "check" },
  suspended: { en: "Suspended", ar: "موقوف", tone: "grey", icon: "lock" },
  expired: { en: "Expired", ar: "منتهٍ", tone: "amber", icon: "clock" },
  method_disabled: { en: "Method disabled", ar: "طريقة معطّلة", tone: "amber", icon: "alert" },
  account_suspended: { en: "Account suspended", ar: "الحساب موقوف", tone: "red", icon: "alert" },
  available: { en: "Available", ar: "متاح", tone: "orange", icon: "userPlus" },
  request: { en: "Request access", ar: "طلب التحاق", tone: "orange", icon: "mail" },
  pending: { en: "Request pending", ar: "الطلب قيد المراجعة", tone: "amber", icon: "clock" },
  unavailable: { en: "Unavailable", ar: "غير متاح", tone: "muted", icon: "lock" },
};
const FILTERS = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "enrolled", en: "Enrolled", ar: "مسجّل" },
  { key: "available", en: "Available", ar: "متاح" },
  { key: "request", en: "Request access", ar: "طلب التحاق" },
];

/* ---- derive one course's state from the contract ------------------------- */
function deriveState(row, prog) {
  if (row.teaching) return "teaching";
  const s = row.my_status;
  if (s === "active") return prog && prog.completed_at ? "completed" : "enrolled";
  if (s === "account_suspended") return "account_suspended";
  if (s === "suspended") return "suspended";
  if (s === "expired") return "expired";
  if (s === "method_disabled") return "method_disabled";
  if (s) return "enrolled"; // any other recognised enrolment
  if (row.request_pending) return "pending";
  if (row.options?.self_enrol) return "available";
  if (row.options?.can_request) return "request";
  return "unavailable";
}
const ENROLLED_STATES = new Set([
  "teaching", "enrolled", "completed", "suspended", "expired",
  "method_disabled", "account_suspended",
]);
// Progress applies to a learner's own enrolment — NOT to a teaching role
// (role != enrolment; a teacher has no learner completion metric here).
const PROGRESS_STATES = new Set([
  "enrolled", "completed", "suspended", "expired", "method_disabled", "account_suspended",
]);

function clampPct(p) {
  if (p === null || p === undefined || Number.isNaN(Number(p))) return null;
  return Math.max(0, Math.min(100, Math.round(Number(p))));
}

/* ---- small building blocks ----------------------------------------------- */
function StatusPill({ state, className = "" }) {
  const m = STATE_META[state] ?? STATE_META.unavailable;
  return (
    <span className={`course-status course-status--${m.tone} ${className}`}>
      <Ic n={m.icon} className="course-status__ic" />
      <span className="course-status__txt"><Bi en={m.en} ar={m.ar} /></span>
    </span>
  );
}

// Row progress. The track is decorative (aria-hidden): this whole block lives
// INSIDE the row's <button>, whose subtree is presentational to AT, so a
// role="progressbar" here would be dead. The visible "42%" / "Not started"
// text carries the value (and is part of the button's accessible name). The
// real, exposed progressbar is in the details panel, which is not in a button.
function CourseProgress({ state, prog }) {
  if (!PROGRESS_STATES.has(state)) return null;
  const pct = clampPct(prog?.percent);
  return (
    <div className="course-prog">
      <div className="course-prog__row">
        <span className="course-prog__label"><Bi en="Progress" ar="التقدم" /></span>
        <span className="course-prog__pct">
          {pct === null ? <span className="course-prog__na"><Bi en="Not started" ar="لم يبدأ" /></span> : `${pct}%`}
        </span>
      </div>
      <div className={`course-prog__track ${pct === null ? "course-prog__track--empty" : ""}`} aria-hidden="true">
        {pct !== null && <div className="course-prog__fill" style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
}

// The primary action. `block` = full-width (details panel); otherwise compact
// (row). Loading spinner + disabled state prevent duplicate submissions.
function CourseAction({ vm, busy, block, onOpen, onSelfEnrol, onRequest }) {
  const base = `cat-btn ${block ? "cat-btn--block" : ""}`;
  const spin = <Spinner className="cat-btn__spin" />;
  switch (vm.state) {
    case "available":
      return (
        <button type="button" className={`${base} cat-btn--outline`} disabled={busy} onClick={onSelfEnrol}>
          {busy ? spin : <Ic n="userPlus" className="cat-btn__ic" />}
          <span><Bi en="Self enrol" ar="تسجيل ذاتي" /></span>
        </button>
      );
    case "request":
      return (
        <button type="button" className={`${base} cat-btn--warn`} disabled={busy} onClick={onRequest}>
          {busy ? spin : <Ic n="send" className="cat-btn__ic" />}
          <span><Bi en="Request enrolment" ar="طلب التحاق" /></span>
        </button>
      );
    case "pending":
      return (
        <button type="button" className={`${base} cat-btn--muted`} disabled title="A teacher will decide — لا يمكن إرسال طلب مكرر">
          <Ic n="clock" className="cat-btn__ic" />
          <span><Bi en="Request pending" ar="قيد المراجعة" /></span>
        </button>
      );
    case "unavailable":
      return (
        <button type="button" className={`${base} cat-btn--muted`} disabled>
          <Ic n="lock" className="cat-btn__ic" />
          <span><Bi en="Unavailable" ar="غير متاح" /></span>
        </button>
      );
    default: // enrolled-ish → open
      return (
        <button type="button" className={`${base} cat-btn--primary`} onClick={onOpen}>
          <Ic n="arrow" className="cat-btn__ic cat-btn__ic--go" />
          <span><Bi en="Open course" ar="فتح المقرر" /></span>
        </button>
      );
  }
}

/* ---- a course row --------------------------------------------------------- */
function CourseRow({ vm, selected, busy, onSelect, onOpen, onSelfEnrol, onRequest }) {
  const c = vm.course;
  const gm = GROUP_MODE[c.group_mode] ?? { en: c.group_mode, ar: "" };
  return (
    <li className={`course-row ${selected ? "course-row--selected" : ""}`} aria-current={selected ? "true" : undefined}>
      <button
        type="button"
        className="course-row__main"
        aria-pressed={selected}
        onClick={(e) => onSelect(vm, e.currentTarget)}
      >
        <span className="course-thumb">
          <CourseArt kind={vm.pres.art} accent={vm.pres.accent} />
        </span>
        <span className="course-row__body">
          <span className="course-row__titles">
            <span className="course-row__title">
              {c.full_name}
              {vm.pres.name_ar && <span className="course-row__title-ar" lang="ar"> | {vm.pres.name_ar}</span>}
            </span>
            <span className="course-row__code">{c.short_name}</span>
          </span>
          <span className="course-meta">
            <span className="course-meta__item">
              <Ic n={c.visible ? "eye" : "eyeOff"} className="course-meta__ic" />
              <Bi en={c.visible ? "Visible" : "Hidden"} ar={c.visible ? "مرئي" : "مخفي"} />
            </span>
            <span className="course-meta__item">
              <Ic n="group" className="course-meta__ic" />
              <Bi en={gm.en} ar={gm.ar} />
            </span>
            <StatusPill state={vm.state} className="course-status--sm" />
          </span>
          <CourseProgress state={vm.state} prog={vm.prog} />
        </span>
      </button>
      <div className="course-row__action">
        <CourseAction vm={vm} busy={busy} onOpen={onOpen} onSelfEnrol={onSelfEnrol} onRequest={onRequest} />
      </div>
    </li>
  );
}

/* ---- row skeleton (initial load) ----------------------------------------- */
function RowSkeleton() {
  return (
    <li className="course-row course-row--skel" aria-hidden="true">
      <span className="course-thumb skeleton" />
      <span className="course-row__body">
        <span className="sk-line sk-line--title" />
        <span className="sk-line sk-line--sub" />
        <span className="sk-line sk-line--meta" />
        <span className="sk-line sk-line--bar" />
      </span>
      <span className="sk-line sk-line--btn" />
    </li>
  );
}

/* ---- accessible dialog (focus trap, Escape, return focus) ---------------- */
function Dialog({ title, titleAr, busy, onClose, children, footer }) {
  const panelRef = useRef(null);
  const headingId = "cat-dlg-title";
  // Read the changing values through refs so the trap effect can mount ONCE
  // (re-running it on every busy/onClose change would steal focus mid-submit).
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement; // the action button that opened us
    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])') ?? [])
        .filter((el) => !el.disabled && el.offsetParent !== null);
    (panelRef.current?.querySelector("input,textarea,button") ?? panelRef.current)?.focus();
    function onKey(e) {
      if (e.key === "Escape" && !busyRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      opener?.focus?.(); // return focus to the trigger (spec §37/§38)
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div
        className="modal-panel cat-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <strong id={headingId}>{title}{titleAr && <span className="cat-bi-ar" lang="ar">{titleAr}</span>}</strong>
          <button className="modal-close" onClick={onClose} disabled={busy} aria-label="Close · إغلاق">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---- details panel -------------------------------------------------------- */
function MetaRow({ icon, labelEn, labelAr, children }) {
  return (
    <div className="detail-meta">
      <Ic n={icon} className="detail-meta__ic" />
      <span className="detail-meta__label"><Bi en={labelEn} ar={labelAr} /></span>
      <span className="detail-meta__value">{children}</span>
    </div>
  );
}

function DetailsPanel({ vm, busy, isMobile, canManage, teachers, onAssignTeacher, onClose, onOpen, onSelfEnrol, onRequest, headingRef, closeRef }) {
  if (!vm) {
    return (
      <aside className="details details--empty" aria-label="Course details — تفاصيل المقرر">
        <div className="details-empty">
          <Ic n="book" className="details-empty__ic" />
          <p><Bi en="Select a course to view its details." ar="اختر مقررًا لعرض تفاصيله." /></p>
        </div>
      </aside>
    );
  }
  const c = vm.course;
  const gm = GROUP_MODE[c.group_mode] ?? { en: c.group_mode, ar: "" };
  const pct = clampPct(vm.prog?.percent);
  return (
    <aside className="details" aria-label="Course details — تفاصيل المقرر" role={isMobile ? "dialog" : undefined} aria-modal={isMobile ? "true" : undefined}>
      <div className="details__head">
        <h2 className="details__title" tabIndex={-1} ref={headingRef}>
          {c.full_name}
          {vm.pres.name_ar && <span className="details__title-ar" lang="ar"> | {vm.pres.name_ar}</span>}
        </h2>
        <button ref={closeRef} type="button" className="details__close" onClick={onClose} aria-label="Close course details · إغلاق تفاصيل المقرر">
          <Ic n="x" />
        </button>
      </div>

      <div className="details__scroll">
        <div className="details__art">
          <CourseArt kind={vm.pres.art} accent={vm.pres.accent} />
        </div>

        <div className="details__meta">
          <MetaRow icon="code" labelEn="Code" labelAr="الرمز"><code className="detail-code">{c.short_name}</code></MetaRow>
          <MetaRow icon="teacher" labelEn="Teacher" labelAr="المدرس">
            {teachers === null ? <span className="detail-muted">…</span>
              : teachers.length ? teachers.join("، ")
              : <span className="detail-muted"><Bi en="Not assigned" ar="لم يُعيَّن" /></span>}
          </MetaRow>
          <MetaRow icon={c.visible ? "eye" : "eyeOff"} labelEn="Visibility" labelAr="الظهور"><Bi en={c.visible ? "Visible" : "Hidden"} ar={c.visible ? "مرئي" : "مخفي"} /></MetaRow>
          <TeamsChip courseId={c.id} />
          <MetaRow icon="group" labelEn="Group mode" labelAr="وضع المجموعة"><Bi en={gm.en} ar={gm.ar} /></MetaRow>
          <MetaRow icon={STATE_META[vm.state]?.icon ?? "lock"} labelEn="Enrolment status" labelAr="حالة التسجيل"><StatusPill state={vm.state} /></MetaRow>
          {PROGRESS_STATES.has(vm.state) && (
            <MetaRow icon="chart" labelEn="Progress" labelAr="التقدم">
              {pct === null ? <span className="detail-muted"><Bi en="Not started" ar="لم يبدأ" /></span> : (
                <span className="detail-prog">
                  <span className="detail-prog__pct">{pct}%</span>
                  <span className="detail-prog__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${c.full_name} — progress ${pct}%`}>
                    <span className="detail-prog__fill" style={{ width: `${pct}%` }} />
                  </span>
                </span>
              )}
            </MetaRow>
          )}
        </div>

        <section className="details__section">
          <h3 className="details__h3"><Bi en="About this course" ar="وصف المقرر" /></h3>
          {vm.pres.blurb_en || vm.pres.blurb_ar ? (
            <>
              {vm.pres.blurb_en && <p className="details__blurb" lang="en">{vm.pres.blurb_en}</p>}
              {vm.pres.blurb_ar && <p className="details__blurb details__blurb--ar" lang="ar" dir="rtl">{vm.pres.blurb_ar}</p>}
            </>
          ) : (
            <p className="details__blurb detail-muted"><Bi en="No course description available." ar="لا يتوفر وصف لهذا المقرر." /></p>
          )}
        </section>

        {vm.pres.topics.length > 0 && (
          <section className="details__section">
            <h3 className="details__h3"><Bi en="Key topics" ar="المحاور الرئيسية" /></h3>
            <ul className="details__topics">
              {vm.pres.topics.map((t, i) => (
                <li key={i}><Ic n="check" className="details__topic-ic" /><span><Bi en={t.en} ar={t.ar} /></span></li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="details__foot">
        {canManage && (
          <button type="button" className="cat-btn cat-btn--outline cat-btn--block" onClick={onAssignTeacher}>
            <Ic n="userPlus" className="cat-btn__ic" />
            <span>{teachers?.length ? <Bi en="Change teacher" ar="تغيير المدرّس" /> : <Bi en="Assign teacher" ar="تعيين مدرّس" />}</span>
          </button>
        )}
        <CourseAction vm={vm} busy={busy} block onOpen={onOpen} onSelfEnrol={onSelfEnrol} onRequest={onRequest} />
      </div>
    </aside>
  );
}

/* ---- course activities view (preserved from the LMS layer, restyled) ----- */
const ACT_ICON = { assign: "fileText", quiz: "listChecks", forum: "message", page: "book" };
function CourseView({ course, userId, onBack }) {
  const { lang, dir } = useLang();
  const [activities, setActivities] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setOpen(null);
    setActivities(null);
    setError(null);
    apiGet(`/api/lms/courses/${course.id}/activities?user_id=${userId}`)
      .then((a) => alive && setActivities(a))
      .catch((e) => alive && setError(e));
    return () => { alive = false; };
  }, [course.id, userId]);

  return (
    <div className="course-view" dir={dir} lang={lang}>
      <button className="cat-btn cat-btn--ghost" onClick={onBack}>
        <Ic n="arrow" className="cat-btn__ic cat-btn__ic--back" />
        <span><Bi en="All courses" ar="كل المقررات" /></span>
      </button>
      <h1 className="course-view__title">
        {course.full_name} <span className="muted">({course.short_name})</span>
      </h1>
      {error && <div className="error-banner">{error.message}</div>}
      {activities && activities.length === 0 && <p className="muted"><Bi en="No activities yet." ar="لا توجد أنشطة بعد." /></p>}
      {activities === null && !error && <p className="muted"><Bi en="Loading activities…" ar="جارٍ التحميل…" /></p>}
      {activities?.map((a) => (
        <div key={a.id}>
          <button
            className={`card card--link activity-row ${open?.id === a.id ? "activity-row--open" : ""}`}
            aria-expanded={open?.id === a.id}
            aria-controls={`act-panel-${a.id}`}
            onClick={() => setOpen(open?.id === a.id ? null : a)}
          >
            <span className="activity-row__name">
              <Ic n={ACT_ICON[a.activity_type] ?? "shapes"} className="activity-row__ic" />
              {a.name}
              {!a.visible && <span className="course-status course-status--grey course-status--sm"><Bi en="Hidden" ar="مخفي" /></span>}
            </span>
            <span>
              {a.mine?.kind === "assign" && a.mine.submission_status !== "none" && (
                <span className={`course-status course-status--sm course-status--${a.mine.submission_status === "graded" ? "green" : a.mine.submission_status === "submitted" ? "blue" : "amber"}`}>
                  {a.mine.submission_status === "graded" ? `graded ${a.mine.grade}/100` : a.mine.submission_status}
                </span>
              )}
              {a.mine?.kind === "quiz" && (
                <span className={`course-status course-status--sm course-status--${a.mine.awaiting_marking ? "amber" : a.mine.best_score != null ? "green" : "muted"}`}>
                  {a.mine.awaiting_marking ? "awaiting marking" : a.mine.best_score != null ? `best ${a.mine.best_score}/${a.mine.max_score}` : `${a.mine.attempts_used}/${a.mine.attempts_allowed} attempts`}
                </span>
              )}
            </span>
          </button>
          {open?.id === a.id && (
            <div id={`act-panel-${a.id}`}>
              {a.activity_type === "assign" ? <AssignmentPanel activity={a} userId={userId} />
                : a.activity_type === "quiz" ? <QuizPanel activity={a} userId={userId} />
                  : <div className="panel"><p className="muted">{a.activity_type} activities are read-only in this build — see LMS-EXPERIENCE.md.</p></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---- responsive helper ---------------------------------------------------- */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const h = (e) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

/* ============================ page ======================================== */
export default function CatalogPage() {
  const { actingUser } = useActingUser();
  const { courseId, setCourseId } = useSelectedCourse();
  const { lang, dir } = useLang();
  const { session } = useSession();
  const isMobile = useIsMobile();
  // Course creation is a manager capability. Show the affordance to admins and
  // in explore/demo mode; the backend (POST /api/lms/courses) still enforces it
  // and refuses non-managers with the documented Moodle reason.
  const canCreate = session?.is_admin === true || session?.mode === "explore";

  const [rows, setRows] = useState(null); // null = loading
  const [progress, setProgress] = useState({}); // course_id → { percent, completed_at }
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(courseId ?? null);
  const [openCourse, setOpenCourse] = useState(null);

  const [busyId, setBusyId] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind:'key'|'request', vm }
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [teachers, setTeachers] = useState(null); // selected course's teacher names (from roles); null = loading
  const [teacherReload, setTeacherReload] = useState(0);

  const loadSeq = useRef(0);
  const triggerRef = useRef(null); // element to refocus when details close (mobile)
  const detailHeadingRef = useRef(null);
  const detailCloseRef = useRef(null);
  const detailsColRef = useRef(null); // focus-trap boundary for the mobile sheet
  const searchRef = useRef(null);
  const dialogRef = useRef(null); // lets the mobile-sheet key handler defer to any open dialog
  dialogRef.current = Boolean(dialog || createOpen || assignOpen);

  // Load catalog + progress together; ignore stale responses (fast persona swaps).
  useEffect(() => {
    if (!actingUser) return;
    const seq = ++loadSeq.current;
    setRows(null);
    setProgress({}); // drop the previous user's progress so rows never join stale data
    setError(null);
    apiGet(`/api/lms/catalog?user_id=${actingUser.id}`)
      .then((data) => { if (seq === loadSeq.current) setRows(Array.isArray(data) ? data : []); })
      .catch((e) => { if (seq === loadSeq.current) setError(e); });
    // Progress is secondary — never block the catalog on it.
    //
    // Go through lib/progressApi.fetchOverview, NOT a bare apiGet. The contract
    // path /api/progress/users/{id}/overview does not exist on the live backend
    // (it ships /api/progress/user/{id}, different path AND shape) — so calling
    // it directly 404s, the .catch() below blanks the map, and every course card
    // silently loses its progress bar. fetchOverview owns that fallback and the
    // shape mapping in one place; MyProgress already used it.
    fetchOverview(actingUser.id)
      .then(({ rows: list }) => {
        if (seq !== loadSeq.current) return;
        const map = {};
        for (const r of list ?? []) map[r.course?.id ?? r.course_id] = { percent: r.percent, completed_at: r.completed_at };
        setProgress(map);
      })
      .catch(() => { if (seq === loadSeq.current) setProgress({}); });
  }, [actingUser?.id, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function reload() { setReloadKey((k) => k + 1); }

  // Build view models once per data change.
  const vms = useMemo(() => {
    if (!rows) return null;
    return rows.map((row) => {
      const pres = coursePresentation(row.course.short_name);
      const prog = progress[row.course.id];
      return { ...row, pres, prog, state: deriveState(row, prog) };
    });
  }, [rows, progress]);

  // Search + filter.
  const visible = useMemo(() => {
    if (!vms) return null;
    const q = search.trim().toLowerCase();
    return vms.filter((vm) => {
      if (q) {
        const hay = [vm.course.full_name, vm.course.short_name, vm.pres.name_ar].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "enrolled") return ENROLLED_STATES.has(vm.state);
      if (filter === "available") return vm.state === "available";
      if (filter === "request") return vm.state === "request" || vm.state === "pending";
      return true;
    });
  }, [vms, search, filter]);

  // Selection must never show stale details from a course that isn't visible.
  useEffect(() => {
    if (selectedId == null || !visible) return;
    if (!visible.some((vm) => vm.course.id === selectedId)) setSelectedId(null);
  }, [visible, selectedId]);

  const selectedVm = visible?.find((vm) => vm.course.id === selectedId) ?? null;

  // Mobile details sheet: lock scroll, trap Tab inside the sheet, Escape closes,
  // return focus on close. When a dialog is open on top, defer all keys to it
  // (its own trap/Escape own the interaction) so one Escape can't close both.
  useEffect(() => {
    if (!(isMobile && selectedVm)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detailHeadingRef.current?.focus();
    const focusables = () =>
      Array.from(detailsColRef.current?.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])') ?? [])
        .filter((el) => !el.disabled && el.offsetParent !== null);
    function onKey(e) {
      if (dialogRef.current) return; // a dialog owns the keyboard while open
      if (e.key === "Escape") { e.stopPropagation(); closeDetails(); return; }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [isMobile, selectedVm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Who teaches the selected course? The catalog contract has no teacher, but
  // the role assignments do — read the editingteacher role holders at the
  // course context so the details panel shows real teachers (and refreshes
  // after an assignment). One fetch per selection; ignore stale responses.
  useEffect(() => {
    const cid = selectedVm?.course.id;
    if (cid == null) { setTeachers(null); return; }
    let alive = true;
    setTeachers(null);
    (async () => {
      try {
        const contexts = await apiGet("/api/roles/contexts");
        const ctx = contexts.find((x) => x.level === "course" && x.instance_id === cid);
        if (!ctx) { if (alive) setTeachers([]); return; }
        const rows = await apiGet(`/api/roles/assignments?context_id=${ctx.id}`);
        if (!alive) return;
        setTeachers(rows.filter((r) => r.role?.short_name === "editingteacher").map((r) => r.user?.full_name).filter(Boolean));
      } catch {
        if (alive) setTeachers([]); // roles read unavailable — show "not assigned" gracefully
      }
    })();
    return () => { alive = false; };
  }, [selectedVm?.course.id, teacherReload]); // eslint-disable-line react-hooks/exhaustive-deps

  function select(vm, el) {
    triggerRef.current = el ?? null;
    setSelectedId(vm.course.id);
    setCourseId(vm.course.id); // shared across pages (Enrolment/Groups/Progress)
    setMutationError(null);
  }
  function closeDetails() {
    setSelectedId(null);
    triggerRef.current?.focus?.();
  }

  // --- mutations (existing endpoints) ---
  async function selfEnrolNoKey(vm) {
    setBusyId(vm.course.id);
    setMutationError(null);
    try {
      await apiPost(`/api/lms/courses/${vm.course.id}/self-enrol`, { user_id: actingUser.id, key: "" });
      reload();
    } catch (e) {
      setMutationError({ id: vm.course.id, err: e });
    } finally {
      setBusyId(null);
    }
  }
  function startSelfEnrol(vm) {
    setMutationError(null);
    if (vm.options?.self_enrol?.requires_key) setDialog({ kind: "key", vm });
    else selfEnrolNoKey(vm);
  }
  function startRequest(vm) {
    setMutationError(null);
    setDialog({ kind: "request", vm });
  }

  if (!actingUser) return null;
  if (openCourse) return <CourseView course={openCourse} userId={actingUser.id} onBack={() => setOpenCourse(null)} />;

  const dialogVm = dialog?.vm;
  const skeletons = Array.from({ length: 6 });

  return (
    <div className={`catalog ${selectedVm ? "catalog--has-selection" : ""}`} dir={dir} lang={lang}>
      <div className="catalog__head">
        <h1 className="catalog__title">
          Course catalog
          <span className="cat-bi-ar" lang="ar">| دليل المقررات</span>
        </h1>
        {canCreate && (
          <button type="button" className="cat-btn cat-btn--primary catalog__create" onClick={() => setCreateOpen(true)}>
            <Ic n="plus" className="cat-btn__ic" />
            <span><Bi en="Create course" ar="إنشاء مقرر" /></span>
          </button>
        )}
      </div>

      {/* search */}
      <div className="course-search">
        <Ic n="search" className="course-search__ic" />
        <input
          ref={searchRef}
          type="search"
          className="course-search__input"
          placeholder={lang === "ar" ? "ابحث في المقررات" : "Search courses  ·  ابحث في المقررات"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape" && search) { e.preventDefault(); setSearch(""); } }}
          aria-label={lang === "ar" ? "ابحث في المقررات" : "Search courses"}
        />
        {search && (
          <button type="button" className="course-search__clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }} aria-label={lang === "ar" ? "مسح بحث المقررات" : "Clear course search"}>
            <Ic n="x" />
          </button>
        )}
      </div>

      {/* filters */}
      <div className="course-filters" role="group" aria-label={lang === "ar" ? "تصفية المقررات" : "Filter courses"}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-pill ${filter === f.key ? "filter-pill--on" : ""}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            <Bi en={f.en} ar={f.ar} />
          </button>
        ))}
      </div>

      {/* body: catalog + details */}
      <div className="catalog__body">
        <section className="catalog__list-col" aria-label={lang === "ar" ? "قائمة المقررات" : "Course list"}>
          {error ? (
            <div className="cat-state cat-state--error">
              <Ic n="cloudOff" className="cat-state__ic" />
              <p className="cat-state__title"><Bi en="We couldn’t load the course catalog." ar="تعذر تحميل دليل المقررات." /></p>
              {error.reasons?.length ? <p className="cat-state__detail">{error.reasons[0]}</p> : error.message ? <p className="cat-state__detail">{error.message}</p> : null}
              <button type="button" className="cat-btn cat-btn--outline" onClick={reload}>
                <Ic n="refresh" className="cat-btn__ic" /><span><Bi en="Retry" ar="إعادة المحاولة" /></span>
              </button>
            </div>
          ) : visible === null ? (
            <ul className="course-list">{skeletons.map((_, i) => <RowSkeleton key={i} />)}</ul>
          ) : vms.length === 0 ? (
            <div className="cat-state">
              <Ic n="book" className="cat-state__ic" />
              <p className="cat-state__title"><Bi en="No courses are available." ar="لا توجد مقررات متاحة." /></p>
              <p className="cat-state__detail"><Bi en="There are no courses you can see right now." ar="لا توجد مقررات يمكنك رؤيتها الآن." /></p>
            </div>
          ) : visible.length === 0 ? (
            <div className="cat-state">
              <Ic n="searchX" className="cat-state__ic" />
              <p className="cat-state__title">
                {search ? <Bi en="No courses match your search." ar="لا توجد مقررات تطابق بحثك." /> : <Bi en="No courses in this filter." ar="لا توجد مقررات ضمن هذا التصنيف." />}
              </p>
              <button type="button" className="cat-btn cat-btn--outline" onClick={() => { setSearch(""); setFilter("all"); }}>
                <span>{search ? <Bi en="Clear search" ar="مسح البحث" /> : <Bi en="Show all" ar="عرض الكل" />}</span>
              </button>
            </div>
          ) : (
            <ul className="course-list">
              {mutationError && (
                <li className="cat-inline-error error-banner" role="alert">
                  {(() => {
                    if (mutationError.message) return mutationError.message;
                    const e = mutationError.err;
                    return e?.reasons?.length ? e.reasons[0] : e?.message ?? "Something went wrong.";
                  })()}
                </li>
              )}
              {visible.map((vm) => (
                <CourseRow
                  key={vm.course.id}
                  vm={vm}
                  selected={selectedId === vm.course.id}
                  busy={busyId === vm.course.id}
                  onSelect={select}
                  onOpen={() => { setCourseId(vm.course.id); setOpenCourse(vm.course); }}
                  onSelfEnrol={() => startSelfEnrol(vm)}
                  onRequest={() => startRequest(vm)}
                />
              ))}
            </ul>
          )}
        </section>

        {(!isMobile || selectedVm) && (
          <>
            {isMobile && selectedVm && <div className="details-backdrop" onClick={closeDetails} aria-hidden="true" />}
            <div ref={detailsColRef} className={`catalog__details-col ${isMobile ? "catalog__details-col--sheet" : ""}`}>
              <DetailsPanel
                vm={selectedVm}
                busy={busyId === selectedVm?.course.id}
                isMobile={isMobile}
                canManage={canCreate}
                teachers={teachers}
                onAssignTeacher={() => setAssignOpen(true)}
                onClose={closeDetails}
                onOpen={() => selectedVm && (setCourseId(selectedVm.course.id), setOpenCourse(selectedVm.course))}
                onSelfEnrol={() => selectedVm && startSelfEnrol(selectedVm)}
                onRequest={() => selectedVm && startRequest(selectedVm)}
                headingRef={detailHeadingRef}
                closeRef={detailCloseRef}
              />
            </div>
          </>
        )}
      </div>

      {/* dialogs */}
      {dialog?.kind === "key" && (
        <SelfEnrolDialog
          vm={dialogVm}
          userId={actingUser.id}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); reload(); }}
        />
      )}
      {dialog?.kind === "request" && (
        <RequestDialog
          vm={dialogVm}
          userId={actingUser.id}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); reload(); }}
        />
      )}
      {createOpen && (
        <CreateCourseDialog
          actorId={actingUser.id}
          onClose={() => setCreateOpen(false)}
          onDone={() => { setCreateOpen(false); reload(); }}
          onPartial={(message) => { setMutationError({ message }); setCreateOpen(false); reload(); }}
        />
      )}
      {assignOpen && selectedVm && (
        <AssignTeacherDialog
          course={selectedVm.course}
          actorId={actingUser.id}
          current={teachers ?? []}
          onClose={() => setAssignOpen(false)}
          onDone={() => { setAssignOpen(false); setTeacherReload((t) => t + 1); }}
        />
      )}
    </div>
  );
}

/* ---- self-enrol (key) dialog --------------------------------------------- */
function SelfEnrolDialog({ vm, userId, onClose, onDone }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await apiPost(`/api/lms/courses/${vm.course.id}/self-enrol`, { user_id: userId, key });
      onDone();
    } catch (ex) {
      setErr(ex);
      setBusy(false);
    }
  }

  return (
    <Dialog title="Self enrol" titleAr="التسجيل الذاتي" busy={busy} onClose={onClose}
      footer={
        <>
          <button type="button" className="cat-btn cat-btn--ghost" onClick={onClose} disabled={busy}><Bi en="Cancel" ar="إلغاء" /></button>
          <button type="button" className="cat-btn cat-btn--primary" onClick={submit} disabled={busy}>
            {busy && <Spinner className="cat-btn__spin" />}<span><Bi en="Enrol" ar="تسجيل" /></span>
          </button>
        </>
      }
    >
      <p className="cat-dialog__course">{vm.course.full_name} <span className="muted">({vm.course.short_name})</span></p>
      <form onSubmit={submit}>
        <label className="cat-field">
          <span className="cat-field__label"><Bi en="Enrolment key" ar="مفتاح التسجيل" /></span>
          <span className="cat-field__input">
            <Ic n="key" className="cat-field__ic" />
            <input className="input" value={key} onChange={(e) => setKey(e.target.value)} autoFocus autoComplete="off" />
          </span>
        </label>
      </form>
      {err && <div className="reason-list reason-list--error"><ul>{(err.reasons?.length ? err.reasons : [err.message]).map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
    </Dialog>
  );
}

/* ---- enrolment request dialog -------------------------------------------- */
function RequestDialog({ vm, userId, onClose, onDone }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await apiPost(`/api/lms/courses/${vm.course.id}/enrol-request`, { user_id: userId, message });
      onDone();
    } catch (ex) {
      setErr(ex); // keep the typed message on failure
      setBusy(false);
    }
  }

  return (
    <Dialog title="Request enrolment" titleAr="طلب التحاق" busy={busy} onClose={onClose}
      footer={
        <>
          <button type="button" className="cat-btn cat-btn--ghost" onClick={onClose} disabled={busy}><Bi en="Cancel" ar="إلغاء" /></button>
          <button type="button" className="cat-btn cat-btn--warn" onClick={submit} disabled={busy}>
            {busy ? <Spinner className="cat-btn__spin" /> : <Ic n="send" className="cat-btn__ic" />}<span><Bi en="Send request" ar="إرسال الطلب" /></span>
          </button>
        </>
      }
    >
      <p className="cat-dialog__course">{vm.course.full_name} <span className="muted">({vm.course.short_name})</span></p>
      <p className="cat-dialog__note"><Bi en="A teacher or manager will review your request." ar="سيقوم مدرّس أو مدير بمراجعة طلبك." /></p>
      <form onSubmit={submit}>
        <label className="cat-field">
          <span className="cat-field__label"><Bi en="Message" ar="الرسالة" /> <span className="muted">(<Bi en="optional" ar="اختياري" />)</span></span>
          <textarea className="input input--area" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} autoFocus />
        </label>
      </form>
      {err && <div className="reason-list reason-list--error"><ul>{(err.reasons?.length ? err.reasons : [err.message]).map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
    </Dialog>
  );
}

/* ---- create course (+ optional teacher) dialog --------------------------- */
// Admin action. Creates via the existing POST /api/lms/courses (manager-gated
// server-side), then — if a teacher is chosen — makes that user the course's
// teacher the Moodle-correct way: a Teacher (editingteacher) ROLE assignment at
// the new course context (role != enrolment), reusing the roles contract.
function CreateCourseDialog({ actorId, onClose, onDone, onPartial }) {
  const { users } = useActingUser();
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const valid = fullName.trim() !== "" && shortName.trim() !== "";

  async function submit(e) {
    e?.preventDefault?.();
    if (busy || !valid) return;
    setBusy(true);
    setErr(null);
    let course;
    try {
      course = await apiPost("/api/lms/courses", {
        actor_id: actorId,
        full_name: fullName.trim(),
        short_name: shortName.trim(),
      });
    } catch (ex) {
      setErr(ex); // non-manager 403 / duplicate short-name 409 — shown verbatim
      setBusy(false);
      return;
    }
    // Best-effort teacher assignment: the course already exists, so a failure
    // here is surfaced (via onPartial) without losing the created course.
    if (teacherId) {
      try {
        const [roles, contexts] = await Promise.all([apiGet("/api/roles"), apiGet("/api/roles/contexts")]);
        const teacherRole = roles.find((r) => r.archetype === "editingteacher");
        const ctx = contexts.find((c) => c.level === "course" && c.instance_id === course.id);
        if (!teacherRole || !ctx) throw new Error("could not resolve the Teacher role or the new course's context");
        await apiPost("/api/roles/assignments", {
          actor_id: actorId,
          user_id: Number(teacherId),
          role_id: teacherRole.id,
          context_id: ctx.id,
        });
      } catch (ex) {
        const why = ex?.reasons?.length ? ex.reasons[0] : ex?.message ?? "unknown error";
        onPartial(`Course "${course.short_name}" created, but assigning the teacher failed: ${why} — assign one from the Roles tab.`);
        return;
      }
    }
    onDone();
  }

  return (
    <Dialog title="Create course" titleAr="إنشاء مقرر" busy={busy} onClose={onClose}
      footer={
        <>
          <button type="button" className="cat-btn cat-btn--ghost" onClick={onClose} disabled={busy}><Bi en="Cancel" ar="إلغاء" /></button>
          <button type="button" className="cat-btn cat-btn--primary" onClick={submit} disabled={busy || !valid}>
            {busy ? <Spinner className="cat-btn__spin" /> : <Ic n="plus" className="cat-btn__ic" />}<span><Bi en="Create" ar="إنشاء" /></span>
          </button>
        </>
      }
    >
      <p className="cat-dialog__note">
        <Bi en="Managers create courses directly. A new course starts with a manual enrolment method and no teacher — pick one below or assign later from Roles." ar="يُنشئ المديرون المقررات مباشرة. يبدأ المقرر الجديد بطريقة تسجيل يدوية وبدون مدرّس — اختر مدرّسًا أدناه أو عيّنه لاحقًا من الأدوار." />
      </p>
      <form onSubmit={submit}>
        <label className="cat-field">
          <span className="cat-field__label"><Bi en="Full name" ar="اسم المقرر" /></span>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Advanced Computer Science" autoFocus />
        </label>
        <label className="cat-field">
          <span className="cat-field__label"><Bi en="Short name (code)" ar="الرمز" /></span>
          <input className="input" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="CS201" autoComplete="off" />
        </label>
        <label className="cat-field">
          <span className="cat-field__label"><Bi en="Teacher" ar="المدرّس" /> <span className="muted">(<Bi en="optional" ar="اختياري" />)</span></span>
          <select className="select" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— No teacher · بدون مدرّس —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </label>
      </form>
      {err && <div className="reason-list reason-list--error"><ul>{(err.reasons?.length ? err.reasons : [err.message]).map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
    </Dialog>
  );
}

/* ---- assign teacher to an existing course dialog ------------------------- */
// Admin action from the details panel: make any user the course's teacher by
// assigning the Teacher (editingteacher) ROLE at the course context. Reuses the
// roles contract; the backend's assignable matrix still enforces who may assign.
function AssignTeacherDialog({ course, actorId, current, onClose, onDone }) {
  const { users } = useActingUser();
  const [teacherId, setTeacherId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e?.preventDefault?.();
    if (busy || !teacherId) return;
    setBusy(true);
    setErr(null);
    try {
      const [roles, contexts] = await Promise.all([apiGet("/api/roles"), apiGet("/api/roles/contexts")]);
      const teacherRole = roles.find((r) => r.archetype === "editingteacher");
      const ctx = contexts.find((c) => c.level === "course" && c.instance_id === course.id);
      if (!teacherRole || !ctx) throw new Error("could not resolve the Teacher role or this course's context");
      await apiPost("/api/roles/assignments", {
        actor_id: actorId,
        user_id: Number(teacherId),
        role_id: teacherRole.id,
        context_id: ctx.id,
      });
      onDone();
    } catch (ex) {
      setErr(ex);
      setBusy(false);
    }
  }

  return (
    <Dialog title="Assign teacher" titleAr="تعيين مدرّس" busy={busy} onClose={onClose}
      footer={
        <>
          <button type="button" className="cat-btn cat-btn--ghost" onClick={onClose} disabled={busy}><Bi en="Cancel" ar="إلغاء" /></button>
          <button type="button" className="cat-btn cat-btn--primary" onClick={submit} disabled={busy || !teacherId}>
            {busy ? <Spinner className="cat-btn__spin" /> : <Ic n="userCheck" className="cat-btn__ic" />}<span><Bi en="Assign" ar="تعيين" /></span>
          </button>
        </>
      }
    >
      <p className="cat-dialog__course">{course.full_name} <span className="muted">({course.short_name})</span></p>
      {current.length > 0 && (
        <p className="cat-dialog__note"><Bi en="Current teacher" ar="المدرّس الحالي" />: {current.join("، ")}</p>
      )}
      <p className="cat-dialog__note"><Bi en="Grants the Teacher (editing teacher) role at this course — role, not enrolment." ar="يمنح دور المدرّس (مدرّس محرِّر) في هذا المقرر — دور، وليس تسجيلًا." /></p>
      <form onSubmit={submit}>
        <label className="cat-field">
          <span className="cat-field__label"><Bi en="Teacher" ar="المدرّس" /></span>
          <select className="select" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} autoFocus>
            <option value="">— Select a user · اختر مستخدمًا —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </label>
      </form>
      {err && <div className="reason-list reason-list--error"><ul>{(err.reasons?.length ? err.reasons : [err.message]).map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
    </Dialog>
  );
}
