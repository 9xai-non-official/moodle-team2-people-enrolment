// Enrolment workspace (task 06 §4.2, spec §12-15). A bilingual, RTL-aware page
// that reuses the shared shell: it owns its own `dir` (the shell forces .content
// LTR off-Dashboard) and reads the shared Lang/SelectedCourse contexts. Layout:
// one h1, a course selector, then an accessible 5-tab tablist — Participants
// (roster + contextual rail), Methods, Cohorts, Self-enrol demo, Guest preview.
// "Other users" is not a tab; it lives in the Participants rail (spec §16).
import { useEffect, useRef, useState } from "react";
import { cachedGet } from "../lib/catalog";
import { useLang } from "../context/Lang";
import { useSelectedCourse } from "../context/SelectedCourse";
import ParticipantsTable from "../components/enrolment/ParticipantsTable";
import MethodsPanel from "../components/enrolment/MethodsPanel";
import CohortManager from "../components/enrolment/CohortManager";
import SelfEnrolDemo from "../components/enrolment/SelfEnrolDemo";
import GuestPreview from "../components/enrolment/GuestPreview";
import Icon from "../components/enrolment/icons";
import { ScopedError, T, both } from "../components/enrolment/ui";

const TABS = [
  { key: "participants", icon: "users", en: "Participants", ar: "المشاركون" },
  { key: "methods", icon: "workflow", en: "Methods", ar: "طرق التسجيل" },
  { key: "cohorts", icon: "usersRound", en: "Cohorts", ar: "الأفواج" },
  { key: "self", icon: "userPlus", en: "Self enrol demo", ar: "التسجيل الذاتي" },
  { key: "guest", icon: "eye", en: "Guest preview", ar: "معاينة الضيف" },
];
const TAB_KEYS = TABS.map((t) => t.key);

/* Course selector (spec §14): leading Database icon, selected value, chevron.
   Fed by /api/courses via the cached catalog; keeps the SelectedCourse context
   in sync so the choice persists across pages. */
function CourseSelector({ courseId, onChange, lang }) {
  const [courses, setCourses] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    cachedGet("/api/courses")
      .then((list) => {
        if (!alive) return;
        setCourses(list);
        if (list.length && !courseId) onChange(list[0].id);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error)
    return (
      <span className="inline-error">
        {lang === "ar" ? `تعذّر تحميل المقررات: ${error}` : `Couldn't load courses: ${error}`}
      </span>
    );

  return (
    <div className="enr-courseselect">
      <span className="enr-courseselect__ic" aria-hidden="true">
        <Icon name="database" size={18} />
      </span>
      <select
        className="enr-courseselect__sel"
        aria-label={both("Course", "المقرر")}
        value={courseId ?? ""}
        disabled={!courses}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        {!courses && <option value="">{lang === "ar" ? "جارٍ التحميل…" : "Loading…"}</option>}
        {courses && courses.length === 0 && (
          <option value="">{lang === "ar" ? "لا توجد مقررات" : "No courses"}</option>
        )}
        {courses &&
          courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name || c.short_name}
              {c.short_name && c.full_name ? ` · ${c.short_name}` : ""}
            </option>
          ))}
      </select>
      <span className="enr-courseselect__chev" aria-hidden="true">
        <Icon name="chevronDown" size={16} />
      </span>
    </div>
  );
}

/* Accessible tablist (spec §15): roving tabindex, ←/→ + Home/End move & select,
   aria-selected + aria-controls, horizontal scroll on small screens. */
function TabStrip({ active, onChange, dir }) {
  const ref = useRef(null);
  const onKeyDown = (e) => {
    const i = TAB_KEYS.indexOf(active);
    // Mirror the horizontal arrows in RTL so the visual left/right always match
    // (WAI-ARIA tablist requirement): in RTL, ArrowLeft advances, ArrowRight goes back.
    const rtl = dir === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === forward) next = (i + 1) % TAB_KEYS.length;
    else if (e.key === backward) next = (i - 1 + TAB_KEYS.length) % TAB_KEYS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TAB_KEYS.length - 1;
    if (next == null) return;
    e.preventDefault();
    onChange(TAB_KEYS[next]);
    ref.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return (
    <div className="enr-tabs" role="tablist" aria-label={both("Enrolment sections", "أقسام التسجيل")} ref={ref} onKeyDown={onKeyDown}>
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`enr-tab-${t.key}`}
            aria-selected={on}
            aria-controls={`enr-panel-${t.key}`}
            tabIndex={on ? 0 : -1}
            className={`enr-tab ${on ? "enr-tab--on" : ""}`}
            onClick={() => onChange(t.key)}
          >
            <Icon name={t.icon} size={18} />
            <span className="enr-tab__label">
              <T en={t.en} ar={t.ar} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function EnrolmentPage({ onNavigate }) {
  const { lang, dir } = useLang();
  const { courseId, setCourseId } = useSelectedCourse();
  const [courseMeta, setCourseMeta] = useState(null);
  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem("enrol-tab");
    return TAB_KEYS.includes(saved) ? saved : "participants";
  });

  useEffect(() => {
    localStorage.setItem("enrol-tab", tab);
  }, [tab]);

  // Resolve the selected course's display name (for dialogs / header). Cached.
  useEffect(() => {
    if (!courseId) {
      setCourseMeta(null);
      return;
    }
    let alive = true;
    cachedGet("/api/courses")
      .then((list) => alive && setCourseMeta(list.find((c) => c.id === courseId) ?? null))
      .catch(() => alive && setCourseMeta(null));
    return () => {
      alive = false;
    };
  }, [courseId]);

  const courseName = courseMeta?.short_name || courseMeta?.full_name || null;

  return (
    <div className="enr-page" dir={dir}>
      <header className="enr-page__head">
        <h1 className="enr-h1">
          <T en="Enrolment" ar="التسجيل" />
        </h1>
        <CourseSelector courseId={courseId} onChange={setCourseId} lang={lang} />
      </header>

      {!courseId ? (
        <div className="enr-card">
          <div className="enr-card__body">
            <ScopedError
              message={lang === "ar" ? "اختر مقررًا لإدارة التسجيل." : "Select a course to manage enrolment."}
              lang={lang}
            />
          </div>
        </div>
      ) : (
        <>
          <TabStrip active={tab} onChange={setTab} dir={dir} />

          {/* One tabpanel is mounted at a time; keyed by course so a course
              switch fully resets each tab's data + selection (spec §14). */}
          <div
            id={`enr-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`enr-tab-${tab}`}
            tabIndex={0}
            className="enr-panel"
          >
            {tab === "participants" && (
              <ParticipantsTable
                key={`p-${courseId}`}
                courseId={courseId}
                courseName={courseName}
                onNavigate={onNavigate}
                lang={lang}
                dir={dir}
              />
            )}
            {tab === "methods" && <MethodsPanel key={`m-${courseId}`} courseId={courseId} />}
            {tab === "cohorts" && <CohortManager />}
            {tab === "self" && <SelfEnrolDemo key={`s-${courseId}`} courseId={courseId} />}
            {tab === "guest" && <GuestPreview key={`g-${courseId}`} courseId={courseId} />}
          </div>
        </>
      )}
    </div>
  );
}
