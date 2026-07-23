// Teaching-page data + i18n seam (spec §48/§49; task 06 §9 keeps reshaping OUT
// of components). This is the ONE place live-backend and mock response shapes
// are normalised, and the ONE place the page's bilingual vocabulary lives — so
// the tab components stay presentational and no JSX carries business logic.
//
// Two shapes are reconciled here on purpose (see inspection):
//   • participants: real ParticipantOut splits enrolment_status + account_suspended,
//     the mock folds both into effective_status. We read either.
//   • progress: mock serves /api/progress/courses/{id}/report, the live backend
//     serves /api/progress/course/{id} (percent_complete). We try both, degrade
//     to "no data" (an em dash in the cell) rather than break the table.
import { apiGet } from "../api";

// ---- bilingual vocabulary -------------------------------------------------
// { en, ar } pairs, shown inline together (the app has no translation layer —
// English + Arabic appear side by side, matching Dashboard/Courses).

const titleCase = (s) =>
  String(s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Moodle role short_names → friendly bilingual labels. `teacher` is Moodle's
// non-editing (grade-only) teacher; `editingteacher` is the full teacher.
export const ROLE_LABELS = {
  manager: { en: "Manager", ar: "مدير" },
  editingteacher: { en: "Teacher", ar: "معلّم" },
  teacher: { en: "Non-editing teacher", ar: "معلّم غير محرِّر" },
  "teacher-allgroups": { en: "TA · all groups", ar: "مساعد · كل المجموعات" },
  student: { en: "Student", ar: "طالب" },
  guest: { en: "Guest", ar: "زائر" },
  coursecreator: { en: "Course creator", ar: "منشئ مقررات" },
};
export const roleLabel = (short) =>
  ROLE_LABELS[short] ?? { en: titleCase(short), ar: "" };

// Enrolment / effective status vocabulary. Account-suspension is deliberately
// distinct from enrolment-suspension (spec §20): different domain state, colour
// and tooltip.
export const STATUS_LABELS = {
  active: { en: "Active", ar: "نشط", tone: "green", icon: "checkCircle" },
  suspended: { en: "Suspended", ar: "موقوف", tone: "amber", icon: "pauseCircle" },
  expired: { en: "Expired", ar: "منتهٍ", tone: "amber", icon: "pauseCircle" },
  method_disabled: { en: "Method disabled", ar: "طريقة معطّلة", tone: "grey", icon: "pauseCircle" },
  account_suspended: { en: "Account suspended", ar: "حساب موقوف", tone: "red", icon: "userX" },
};
export const statusLabel = (status) =>
  STATUS_LABELS[status] ?? { en: titleCase(status), ar: "", tone: "grey", icon: "pauseCircle" };

export const ACTIVITY_TYPE_LABELS = {
  assign: { en: "Assignment", ar: "تكليف", icon: "assignment", tone: "blue" },
  quiz: { en: "Quiz", ar: "اختبار", icon: "quiz", tone: "orange" },
  forum: { en: "Forum", ar: "منتدى", icon: "forum", tone: "purple" },
  lesson: { en: "Lesson", ar: "درس", icon: "lesson", tone: "cyan" },
  page: { en: "Page", ar: "صفحة", icon: "page", tone: "navy" },
  url: { en: "URL", ar: "رابط", icon: "url", tone: "navy" },
};
export const activityType = (type) =>
  ACTIVITY_TYPE_LABELS[type] ?? { en: titleCase(type), ar: "", icon: "generic", tone: "navy" };

export const GROUP_MODE_LABELS = {
  none: { en: "No groups", ar: "بلا مجموعات", icon: "user" },
  separate: { en: "Separate groups", ar: "مجموعات منفصلة", icon: "users" },
  visible: { en: "Visible groups", ar: "مجموعات مرئية", icon: "usersRound" },
};
export const groupModeLabel = (mode) =>
  GROUP_MODE_LABELS[mode] ?? GROUP_MODE_LABELS.none;

export const METHOD_LABELS = {
  manual: { en: "Manual", ar: "يدوي" },
  self: { en: "Self", ar: "ذاتي" },
  cohort: { en: "Cohort", ar: "مجموعة نظامية" },
  guest: { en: "Guest", ar: "زائر" },
};
export const methodLabel = (m) => METHOD_LABELS[m] ?? { en: titleCase(m), ar: "" };

// Request status (shared by enrolment requests + course requests). Moodle uses
// "denied" for enrol requests and "rejected" for course requests — both map to
// the same red pill.
export const REQUEST_STATUS = {
  pending: { en: "Pending", ar: "معلّق", tone: "blue", icon: "clock" },
  approved: { en: "Approved", ar: "مقبول", tone: "green", icon: "checkCircle" },
  denied: { en: "Denied", ar: "مرفوض", tone: "red", icon: "xCircle" },
  rejected: { en: "Rejected", ar: "مرفوض", tone: "red", icon: "xCircle" },
};
export const requestStatus = (s) =>
  REQUEST_STATUS[s] ?? { en: titleCase(s), ar: "", tone: "grey", icon: "clock" };

export const SUBMISSION_STATUS = {
  none: { en: "No submission", ar: "لا يوجد تسليم", tone: "grey" },
  draft: { en: "Draft", ar: "مسودة", tone: "grey" },
  submitted: { en: "Submitted", ar: "مُسلَّم", tone: "blue" },
  graded: { en: "Graded", ar: "مُقيَّم", tone: "green" },
};
export const submissionStatus = (s) =>
  SUBMISSION_STATUS[s] ?? { en: titleCase(s), ar: "", tone: "grey" };

export const ATTEMPT_STATE = {
  in_progress: { en: "In progress", ar: "قيد التنفيذ", tone: "grey" },
  finished: { en: "Awaiting marking", ar: "بانتظار التقييم", tone: "amber" },
  graded: { en: "Graded", ar: "مُقيَّم", tone: "green" },
};
export const attemptState = (s) =>
  ATTEMPT_STATE[s] ?? { en: titleCase(s), ar: "", tone: "grey" };

// ---- role helpers ---------------------------------------------------------

const STAFF_ROLES = new Set([
  "manager",
  "editingteacher",
  "teacher",
  "teacher-allgroups",
  "coursecreator",
]);

// Course progress is only meaningful for students. A row with any staff role
// (or with no student role) shows an em dash, never a fabricated 0% (spec §22).
export const isStudentRow = (roles = []) =>
  roles.includes("student") && !roles.some((r) => STAFF_ROLES.has(r));

// Primary role to show in the cell; the rest go to a tooltip/secondary line.
export function primaryRole(roles = []) {
  if (!roles.length) return null;
  const order = ["manager", "editingteacher", "teacher", "teacher-allgroups", "student", "guest"];
  const sorted = [...roles].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return sorted[0];
}

// ---- avatars --------------------------------------------------------------

const AVATAR_TONES = ["blue", "orange", "purple", "navy", "cyan", "green"];

// Stable tone from the name so a given person always gets the same colour.
export function avatarTone(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---- dates ----------------------------------------------------------------

const clampPct = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
};
export { clampPct };

// Locale-aware last-access text + exact-timestamp tooltip (spec §21).
// Never renders an invalid date; missing access → bilingual "Never".
export function formatLastAccess(iso, lang = "en") {
  const ar = lang === "ar";
  if (!iso) return { text: ar ? "لم يدخل" : "Never", title: null, never: true };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { text: "—", title: null };

  const locale = ar ? "ar-EG" : "en-US";
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
  const full = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);

  let text;
  if (dayDiff === 0) text = `${ar ? "اليوم" : "Today"}, ${time}`;
  else if (dayDiff === 1) text = `${ar ? "أمس" : "Yesterday"}, ${time}`;
  else if (dayDiff > 1 && dayDiff < 7)
    text = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d) + `, ${time}`;
  else
    text = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);

  return { text, title: full };
}

export function formatDate(iso, lang = "en") {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

// ---- error helper ---------------------------------------------------------

// Verbatim backend reasons for ReasonList; falls back to the self-locating
// message. Never swallows the "why" (task 06 §6).
export const errReasons = (e) =>
  e?.reasons?.length ? e.reasons : [e?.message ?? "Something went wrong."];

// ---- normalisers (live + mock) --------------------------------------------

const asRoleShort = (r) =>
  typeof r === "string" ? r : r?.short_name ?? r?.name ?? String(r);

export function normPath(p) {
  return {
    enrolmentId: p.enrolment_id,
    methodId: p.method_id,
    method: p.method,
    methodStatus: p.method_status,
    status: p.status,
    timeStart: p.time_start ?? null,
    timeEnd: p.time_end ?? null,
    live: p.live, // present on live backend only
  };
}

export function normParticipant(p) {
  const roles = Array.isArray(p.roles) ? p.roles.map(asRoleShort) : [];
  const status = p.effective_status ?? p.status ?? null;
  return {
    userId: p.user_id,
    fullName: p.full_name ?? p.fullname ?? `User ${p.user_id}`,
    username: p.username ?? null,
    roles,
    status,
    // Live backend exposes account_suspended separately; mock folds it into
    // effective_status. Read whichever is present.
    accountSuspended:
      typeof p.account_suspended === "boolean"
        ? p.account_suspended
        : status === "account_suspended",
    enrolmentStatus: p.enrolment_status ?? null,
    groups: Array.isArray(p.groups)
      ? p.groups.map((g) => ({ id: g.id, name: g.name }))
      : [],
    lastAccess: p.last_access ?? p.last_accessed ?? null,
    paths: Array.isArray(p.paths) ? p.paths.map(normPath) : [],
  };
}

export function normOtherUser(o) {
  return {
    userId: o.user_id,
    fullName: o.full_name ?? `User ${o.user_id}`,
    roles: Array.isArray(o.roles) ? o.roles.map(asRoleShort) : [],
    note: o.note ?? "",
  };
}

// Effective activity group mode: a forced course mode overrides any per-activity
// setting (spec §32 — don't confuse the course default with an activity override).
export function effectiveGroupMode(activity, course) {
  if (course?.force_group_mode)
    return { mode: course.group_mode ?? "none", forced: true };
  return {
    mode: activity.group_mode ?? course?.group_mode ?? "none",
    forced: false,
  };
}

export function normActivity(a, course) {
  const gm = effectiveGroupMode(a, course);
  return {
    id: a.id,
    courseId: a.course_id ?? course?.id,
    name: a.name,
    type: a.activity_type ?? a.type ?? "generic",
    groupMode: gm.mode,
    groupModeForced: gm.forced,
    groupingId: a.grouping_id ?? null,
    visible: a.visible !== false,
    completionEnabled: Boolean(a.completion_enabled),
  };
}

export function normEnrolRequest(r) {
  return {
    id: r.id,
    courseId: r.course_id,
    userId: r.user_id,
    name: r.user?.full_name ?? r.full_name ?? `User ${r.user_id}`,
    message: r.message ?? "",
    status: r.status,
    requestedAt: r.requested_at ?? null,
    decidedBy: r.decided_by ?? null,
  };
}

export function normCourseRequest(r) {
  return {
    id: r.id,
    requesterId: r.requester_id,
    requesterName: r.requester?.full_name ?? `User ${r.requester_id}`,
    fullName: r.full_name,
    shortName: r.short_name,
    reason: r.reason ?? "",
    status: r.status,
    decidedBy: r.decided_by ?? null,
  };
}

// ---- course progress (per participant %) ----------------------------------
// Returns Map(userId → { percent|null, done, total }). Best-effort and
// non-fatal: any failure yields an empty map so the participant table renders
// with em dashes rather than an error (spec §22/§40/§48).
export async function fetchCourseProgress(courseId, actorId) {
  const out = new Map();
  // 1) mock/contract route: activity-completion cells → percent.
  try {
    const report = await apiGet(
      `/api/progress/courses/${courseId}/report${actorId ? `?actor_id=${actorId}` : ""}`,
    );
    const total = Array.isArray(report?.activities) ? report.activities.length : 0;
    for (const row of report?.rows ?? []) {
      const done = (row.cells ?? []).filter((c) =>
        String(c.state ?? "").startsWith("complete"),
      ).length;
      out.set(row.user_id, {
        percent: total > 0 ? clampPct((100 * done) / total) : null,
        done,
        total,
      });
    }
    return out;
  } catch {
    /* fall through to the live backend shape */
  }
  // 2) live backend: GET /api/progress/course/{id} → list[CourseProgress].
  try {
    const rows = await apiGet(`/api/progress/course/${courseId}`);
    for (const r of rows ?? []) {
      out.set(r.user_id, {
        percent: r.activities_total > 0 ? clampPct(r.percent_complete) : null,
        done: r.activities_done,
        total: r.activities_total,
      });
    }
  } catch {
    /* no progress source reachable — leave the map empty (cells show "—") */
  }
  return out;
}
