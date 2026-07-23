// Teaching — the teacher workspace. Everything an authorized teacher / TA /
// manager / admin does for one course: participants + enrolment requests,
// activities, grading (group-scoped, hard case 3), and the Moodle course-
// creation truth (teachers REQUEST, managers create).
//
// This page owns per-course data fetching (participants, other-users,
// activities, enrol-requests, course-requests, progress) in ONE place with
// stale-response guarding, and hands slices + a reload() to the tab panels
// (spec §48/§49). Direction is scoped to this page's root — the shell forces
// LTR on non-Dashboard <main>, so we re-earn RTL here exactly like Courses.
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../api";
import { cachedGet } from "../lib/catalog";
import { useActingUser } from "../context/ActingUser";
import { useSelectedCourse } from "../context/SelectedCourse";
import { useLang } from "../context/Lang";
import Icon from "../components/teaching/icons";
import TeachingTabs, { tabPanelId } from "../components/teaching/TeachingTabs";
import { Bi, EmptyState, ErrorState, useAnnounce } from "../components/teaching/ui";
import ParticipantsTab from "../components/teaching/ParticipantsTab";
import EnrolmentRequestsTab from "../components/teaching/EnrolmentRequestsTab";
import ActivitiesTab from "../components/teaching/ActivitiesTab";
import GradingTab from "../components/teaching/GradingTab";
import CourseRequestsTab from "../components/teaching/CourseRequestsTab";
import {
  normActivity,
  normCourseRequest,
  normEnrolRequest,
  normOtherUser,
  normParticipant,
  fetchCourseProgress,
} from "../lib/teaching";

const SLICE_KEYS = ["participants", "otherUsers", "activities", "requests", "courseRequests"];
const emptySlices = () =>
  Object.fromEntries(SLICE_KEYS.map((k) => [k, { data: [], loading: true, error: null }]));

// ---- per-course data bundle (single fetch point + stale guarding) ---------
function useCourseData(course, actorId) {
  const ref = useRef({ course, actorId });
  ref.current = { course, actorId };
  const token = useRef(0);
  const [slices, setSlices] = useState(emptySlices);
  const [progress, setProgress] = useState(() => new Map());

  const fetchSlice = useCallback((slice, tk) => {
    const { course, actorId } = ref.current;
    const courseId = course?.id;
    if (courseId == null) return;
    const commit = (patch) =>
      setSlices((s) => (tk === token.current ? { ...s, [slice]: { ...s[slice], ...patch } } : s));
    commit({ loading: true, error: null });
    let p;
    if (slice === "participants")
      p = apiGet(`/api/enrolment/courses/${courseId}/participants?status=all`).then((r) => r.map(normParticipant));
    else if (slice === "otherUsers")
      p = apiGet(`/api/enrolment/courses/${courseId}/other-users`).then((r) => r.map(normOtherUser));
    else if (slice === "activities")
      p = apiGet(`/api/lms/courses/${courseId}/activities?user_id=${actorId}`).then((r) => r.map((a) => normActivity(a, course)));
    else if (slice === "requests")
      p = apiGet(`/api/lms/courses/${courseId}/enrol-requests?actor_id=${actorId}`).then((r) => r.map(normEnrolRequest));
    else if (slice === "courseRequests")
      p = apiGet(`/api/lms/course-requests?actor_id=${actorId}`).then((r) => r.map(normCourseRequest));
    else return;
    p.then((data) => commit({ data, loading: false, error: null })).catch((error) =>
      commit({ loading: false, error }),
    );
  }, []);

  const loadProgress = useCallback((tk) => {
    const { course, actorId } = ref.current;
    if (course?.id == null) return;
    fetchCourseProgress(course.id, actorId).then((map) => {
      if (tk === token.current) setProgress(map);
    });
  }, []);

  const reload = useCallback(
    (slice = "all") => {
      const tk = token.current;
      if (slice === "all") {
        SLICE_KEYS.forEach((s) => fetchSlice(s, tk));
        loadProgress(tk);
      } else if (slice === "progress") loadProgress(tk);
      else fetchSlice(slice, tk);
    },
    [fetchSlice, loadProgress],
  );

  // Course/actor change: invalidate in-flight responses, clear stale data,
  // reload from scratch (spec §12 — never let an old course overwrite the new).
  useEffect(() => {
    token.current += 1;
    setSlices(emptySlices());
    setProgress(new Map());
    reload("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, actorId]);

  return { slices, progress, reload };
}

// ---- styled course selector (native <select> for full a11y) ---------------
function CourseSelect({ courses, value, onChange, lang, dir }) {
  return (
    <div className="t-courseselect">
      <Icon name="database" size={19} className="t-courseselect__lead" />
      <select
        className="t-courseselect__native"
        aria-label={lang === "ar" ? "المقرر" : "Course"}
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        dir={dir}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.short_name} — {c.full_name}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={18} className="t-courseselect__chev" />
    </div>
  );
}

export default function TeachingPage() {
  const { actingUser } = useActingUser();
  const { courseId, setCourseId } = useSelectedCourse();
  const { lang, dir } = useLang();
  const [announceNode, announce] = useAnnounce();

  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [courseCtxId, setCourseCtxId] = useState(null);
  const [tab, setTab] = useState("participants");
  const [gradeActivityId, setGradeActivityId] = useState(null);
  const bootToken = useRef(0);

  // identity + teachable catalog (mock-only /api/auth/me + /api/lms/catalog)
  const loadBoot = useCallback(() => {
    if (!actingUser) return;
    const tk = ++bootToken.current;
    setBootLoading(true);
    setBootError(null);
    Promise.all([
      apiGet(`/api/auth/me?user_id=${actingUser.id}`),
      apiGet(`/api/lms/catalog?user_id=${actingUser.id}`),
    ])
      .then(([meRes, catalog]) => {
        if (tk !== bootToken.current) return;
        setMe(meRes);
        setCourses(catalog.map((r) => r.course));
        setBootLoading(false);
      })
      .catch((e) => {
        if (tk !== bootToken.current) return;
        setBootError(e);
        setBootLoading(false);
      });
  }, [actingUser]);

  useEffect(loadBoot, [loadBoot]);

  const teachable = courses.filter((c) => me && (me.is_admin || me.teaches.includes(c.id)));
  const course = teachable.find((c) => c.id === courseId) ?? teachable[0] ?? null;

  // keep the shared SelectedCourse context pointed at a course we can actually teach
  useEffect(() => {
    if (course && course.id !== courseId) setCourseId(course.id);
  }, [course, courseId, setCourseId]);

  // resolve the course context id for role assignment (real /api/roles/contexts)
  useEffect(() => {
    if (!course) return;
    let ignore = false;
    cachedGet("/api/roles/contexts")
      .then((rows) => {
        if (ignore) return;
        const ctx = rows.find((c) => c.level === "course" && c.instance_id === course.id);
        setCourseCtxId(ctx?.id ?? null);
      })
      .catch(() => !ignore && setCourseCtxId(null));
    return () => {
      ignore = true;
    };
  }, [course?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { slices, progress, reload } = useCourseData(course, actingUser?.id);

  const pendingRequests = (slices.requests.data ?? []).filter((r) => r.status === "pending").length;
  const pendingCourseReqs = me?.is_admin
    ? (slices.courseRequests.data ?? []).filter((r) => r.status === "pending").length
    : 0;

  const goToTab = (key) => setTab(key);
  const gradeActivity = (a) => setGradeActivityId(a.id);

  if (!actingUser) return null;

  const title = (
    <h1 className="t-title">
      <span>Teaching</span>
      <span className="t-title__ar" lang="ar">التدريس</span>
    </h1>
  );

  // --- boot states: keep the title visible, swap the body -------------------
  if (bootError)
    return (
      <div className="teaching" dir={dir} lang={lang}>
        <div className="t-titlerow">{title}</div>
        <div className="t-workspace t-surface">
          <ErrorState error={bootError} onRetry={loadBoot} lang={lang} />
        </div>
      </div>
    );

  if (bootLoading || !me)
    return (
      <div className="teaching" dir={dir} lang={lang}>
        <div className="t-titlerow">
          {title}
          <div className="t-courseselect t-courseselect--skel" aria-hidden="true" />
        </div>
        <div className="t-workspace t-surface">
          <div className="t-skel-rows" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div className="t-skel-row" key={i} />
            ))}
          </div>
        </div>
      </div>
    );

  if (!teachable.length)
    return (
      <div className="teaching" dir={dir} lang={lang}>
        <div className="t-titlerow">{title}</div>
        <div className="t-workspace t-surface">
          <EmptyState icon="bookOpen" en="No teaching courses are available." ar={"لا توجد مقررات متاحة للتدريس."}>
            <p className="t-empty__hint">
              <Bi
                en={`${actingUser.full_name} teaches nowhere yet. A teacher role is assigned per course — ask a manager, or switch persona.`}
                ar={"لا يُدرّس هذا المستخدم أي مقرر بعد. دور المعلّم يُسنَد لكل مقرر — اطلب من مدير، أو بدّل الشخصية."}
              />
            </p>
          </EmptyState>
        </div>
      </div>
    );

  const TABS = [
    { key: "participants", en: "Participants", ar: "المشاركون", icon: "users" },
    { key: "requests", en: "Enrolment requests", ar: "طلبات التسجيل", icon: "userPlus", badge: pendingRequests },
    { key: "activities", en: "Activities", ar: "الأنشطة", icon: "clipboardList" },
    { key: "grading", en: "Grading", ar: "التقييم", icon: "clipboardCheck" },
    { key: "courserequests", en: "Course requests", ar: "طلبات المقررات", icon: "folder", badge: pendingCourseReqs },
  ];

  const shared = { course, actorId: actingUser.id, me, lang, dir, announce };

  return (
    <div className="teaching" dir={dir} lang={lang}>
      <div className="t-titlerow">
        {title}
        <CourseSelect courses={teachable} value={course?.id} onChange={setCourseId} lang={lang} dir={dir} />
      </div>

      <div className="t-workspace t-surface">
        <TeachingTabs tabs={TABS} active={tab} onChange={setTab} lang={lang} />

        <div
          className="t-tabpanel"
          role="tabpanel"
          id={tabPanelId(tab)}
          aria-labelledby={`teach-tab-${tab}`}
          tabIndex={0}
        >
          {tab === "participants" && (
            <ParticipantsTab
              {...shared}
              courseCtxId={courseCtxId}
              participants={slices.participants}
              otherUsers={slices.otherUsers}
              progress={progress}
              activities={slices.activities}
              requests={slices.requests}
              reload={reload}
              onGoToTab={goToTab}
              onGradeActivity={gradeActivity}
            />
          )}
          {tab === "requests" && (
            <EnrolmentRequestsTab {...shared} requests={slices.requests} reload={reload} />
          )}
          {tab === "activities" && (
            <ActivitiesTab
              {...shared}
              activities={slices.activities}
              reload={reload}
              onGradeActivity={gradeActivity}
              onGoToTab={goToTab}
            />
          )}
          {tab === "grading" && (
            <GradingTab {...shared} activities={slices.activities} initialActivityId={gradeActivityId} />
          )}
          {tab === "courserequests" && (
            <CourseRequestsTab {...shared} courseRequests={slices.courseRequests} reload={reload} />
          )}
        </div>
      </div>

      {announceNode}
    </div>
  );
}
