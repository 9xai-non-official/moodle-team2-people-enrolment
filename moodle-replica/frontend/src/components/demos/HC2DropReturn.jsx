// HC2 — Drop and return, run LIVE against the API. A student drops out (week 10)
// and returns (week 12); the load-bearing fact this proves is that unenrolment
// removes enrolment PATHS but never the completion rows — progress survives the
// gap and resumes with the same numbers (nothing recomputed from zero).
//
// Every step fetches its own evidence fresh and logs the calls it made — the
// API trail IS the proof. Safety first: it validates a restorable baseline and
// confirms before mutating, and on a mid-run refusal (e.g. the R-COHORT guard,
// which forbids manually unenrolling a live cohort path) it stops, surfaces the
// backend reason verbatim, and attempts to restore access — never hiding a
// partial failure (spec §24/§25/§28/§34/§37/§40).
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, apiDelete, ApiError, USE_MOCKS } from "../../api";
import { fetchOverview } from "../../lib/progressApi";
import { useActingUser } from "../../context/ActingUser";
import Icon from "./icons";
import DemoSelect from "./DemoSelect";
import ApiEventLog from "./ApiEventLog";
import Dialog from "./Dialog";
import Lifecycle from "./Lifecycle";
import SnapshotTable from "./SnapshotTable";
import { useApiLog } from "./useApiLog";
import { useCatalog } from "./useCatalog";
import { Bi, Callout, EmptyState, ErrorState, SkeletonRows, ProvenanceChip, InfoDot, pick } from "./ui";
import { WorkspaceIntro, DataSourceNote, ContextLink } from "./workspace";

const LIFECYCLE = [
  { en: "Enrolled", ar: "مسجّل" },
  { en: "Dropped", ar: "منسحب" },
  { en: "Progress preserved", ar: "تم حفظ التقدم" },
  { en: "Re-enrolled", ar: "أُعيد تسجيله" },
];

// phase → which lifecycle nodes are done / active. Kept pure + module-level.
function lifecycleState(phase, baselineLoaded, failedIndex) {
  if (phase === "failed") return { completedCount: Math.max(0, failedIndex), activeIndex: -1, failedIndex };
  const map = {
    idle: { completedCount: baselineLoaded ? 1 : 0, activeIndex: -1 },
    validating: { completedCount: 1, activeIndex: 1 },
    dropping: { completedCount: 1, activeIndex: 1 },
    verifying: { completedCount: 1, activeIndex: 1 },
    "reading-preserved": { completedCount: 2, activeIndex: 2 },
    reenrolling: { completedCount: 3, activeIndex: 3 },
    "reading-restored": { completedCount: 3, activeIndex: 3 },
    done: { completedCount: 4, activeIndex: -1 },
  };
  return { failedIndex: -1, ...(map[phase] || map.idle) };
}

function stepOf(phase) {
  if (phase === "dropping" || phase === "verifying") return 2;
  if (phase === "reading-preserved") return 3;
  if (phase === "reenrolling" || phase === "reading-restored") return 4;
  return null;
}

// Preservation verdict (spec §34) — compared on stable numbers, never on
// formatted text. Returns one of preserved | partial | not | unknown.
function comparePreserved(before, after) {
  if (!before || !after) return "unknown";
  const same =
    before.counted === after.counted &&
    before.total === after.total &&
    before.percent === after.percent &&
    (before.completed_at || null) === (after.completed_at || null);
  if (same) return "preserved";
  const decreased =
    after.counted < before.counted ||
    (after.percent != null && before.percent != null && after.percent < before.percent);
  return decreased ? "not" : "partial";
}

export default function HC2DropReturn({ lang = "en", dir = "ltr", onNavigate }) {
  const users = useCatalog("/api/users");
  const courses = useCatalog("/api/courses");
  const { actingUser } = useActingUser();

  const [userId, setUserId] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [failedIndex, setFailedIndex] = useState(-1);

  const [baseline, setBaseline] = useState({ paths: null, row: null, loading: false, error: null });
  const [afterDrop, setAfterDrop] = useState(null); // { row, stillListed }
  const [afterReturn, setAfterReturn] = useState(null); // { row, paths }
  const [error, setError] = useState(null);
  const [reasons, setReasons] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [plan, setPlan] = useState(null); // { droppable, restoreMethod }
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { entries, record, clear } = useApiLog();
  const reqId = useRef(0);
  const confirmBtnRef = useRef(null);

  const running = !["idle", "done", "failed"].includes(phase);
  const say = (en, ar) => setStatusMsg(pick(lang, en, ar));
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const dwell = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  // Defaults by USERNAME / SHORT NAME (ids differ across DBs) — student.a on
  // CS101, the two-path persona whose CS101 completion is the proof.
  useEffect(() => {
    if (userId == null && users.list) {
      const s = users.list.find((u) => u.username === "student.a");
      if (s) setUserId(s.id);
    }
  }, [users.list, userId]);
  useEffect(() => {
    if (courseId == null && courses.list) {
      const c = courses.list.find((x) => x.short_name === "CS101");
      if (c) setCourseId(c.id);
    }
  }, [courses.list, courseId]);

  const userOptions = useMemo(
    () =>
      (users.list ?? []).map((u) => ({
        value: u.id,
        text: `${u.full_name} (${u.username})${u.suspended ? pick(lang, " — suspended", " — موقوف") : ""}`,
      })),
    [users.list, lang],
  );
  const courseOptions = useMemo(
    () => (courses.list ?? []).map((c) => ({ value: c.id, text: `${c.full_name} · ${c.short_name}` })),
    [courses.list],
  );

  const readPaths = (uid, cid, step) =>
    record(
      "GET",
      `/api/enrolment/users/${uid}/enrolments`,
      async () => (await apiGet(`/api/enrolment/users/${uid}/enrolments`)).filter((p) => p.course?.id === cid),
      { step, summarize: (p) => ({ paths: p.length, live: p.filter((x) => x.live).length }) },
    );
  const readProgress = (uid, cid, step) =>
    record("GET", `/api/progress/user/${uid}`, async () => {
      const { rows } = await fetchOverview(uid);
      return rows.find((r) => r.course.id === cid) || null;
    }, { step, summarize: (r) => (r ? { percent: r.percent, counted: r.counted, total: r.total, completed: r.completed } : { found: false }) });

  // Read the enrolled baseline (read-only) whenever persona/course changes.
  async function loadBaseline() {
    if (!userId || !courseId) return;
    const my = ++reqId.current;
    setPhase("idle");
    setFailedIndex(-1);
    setAfterDrop(null);
    setAfterReturn(null);
    setError(null);
    setReasons(null);
    setRecovery(null);
    setStatusMsg("");
    clear();
    setBaseline({ paths: null, row: null, loading: true, error: null });
    try {
      const paths = await readPaths(userId, courseId, "baseline: paths");
      const row = await readProgress(userId, courseId, "baseline: progress");
      if (my !== reqId.current) return;
      setBaseline({ paths, row, loading: false, error: null });
    } catch (e) {
      if (my !== reqId.current) return;
      setBaseline({ paths: null, row: null, loading: false, error: e.message });
    }
  }
  useEffect(() => {
    loadBaseline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, courseId]);

  // --- Run: validate → confirm → execute ------------------------------------
  async function onRunClick() {
    setError(null);
    setReasons(null);
    setRecovery(null);
    setFailedIndex(-1);
    setPhase("validating");
    say("Validating prerequisites", "جارٍ التحقق من المتطلبات");
    try {
      const paths = baseline.paths ?? (await readPaths(userId, courseId, "validate: paths"));
      // Trust boundary: never DELETE /methods/undefined/... — a path with no
      // method_id can't be unenrolled through the live API.
      if (paths.some((p) => p.method_id == null)) {
        throw new ApiError(0, { detail: "A path has no method_id — cannot unenrol it (live API required)." });
      }
      const droppable = paths.filter((p) => p.method_id != null);
      if (droppable.length === 0) {
        setError(pick(lang, "This student has no enrolment path to drop — nothing to demo.", "لا يوجد مسار تسجيل لإسقاطه."));
        setPhase("idle");
        return;
      }
      const methods = await record(
        "GET",
        `/api/enrolment/courses/${courseId}/methods`,
        () => apiGet(`/api/enrolment/courses/${courseId}/methods`),
        { step: "validate: restore method", summarize: (ms) => ({ methods: ms.map((m) => m.method) }) },
      );
      const restoreMethod = methods.find((m) => m.method === "manual" && m.status === "enabled") || methods.find((m) => m.method === "manual");
      if (!restoreMethod) {
        setError(pick(lang, "No manual enrolment method on this course — access can't be guaranteed restorable, so the demo won't run.", "لا يوجد أسلوب تسجيل يدوي — تعذّر ضمان الاستعادة."));
        setPhase("idle");
        return;
      }
      setPlan({ droppable, restoreMethod });
      setPhase("idle");
      setConfirmOpen(true);
    } catch (e) {
      setError(e.message);
      if (e instanceof ApiError && e.reasons?.length) setReasons(e.reasons);
      setPhase("idle");
    }
  }

  async function restoreAccess(step) {
    // Re-enrol via the course's manual method (POST resolves it server-side).
    // 409 "already enrolled" means a path still stands → access is intact.
    try {
      await record("POST", `/api/enrolment/courses/${courseId}/enrol`, () => apiPost(`/api/enrolment/courses/${courseId}/enrol`, { user_id: userId }), { step, status: 201 });
      const paths = await readPaths(userId, courseId, `${step}: verify`);
      return { restored: paths.some((p) => p.live) };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) return { restored: true, note: "already-enrolled" };
      return { restored: false, reason: e.message };
    }
  }

  async function handleFailure(nodeIndex, err, droppedCount) {
    const rs = err instanceof ApiError && err.reasons?.length ? err.reasons : [err.message];
    setError(err.message);
    setReasons(rs);
    setFailedIndex(nodeIndex);
    say("Failed — see the reason below", "فشل — انظر السبب أدناه");
    if (droppedCount > 0) {
      const rec = await restoreAccess("recover: restore access");
      setRecovery(rec);
    } else {
      setRecovery({ restored: true, note: "nothing-changed" });
    }
    setPhase("failed");
  }

  async function execute() {
    setConfirmOpen(false);
    const { droppable } = plan || {};
    if (!droppable) return;
    setError(null);
    setReasons(null);
    setRecovery(null);

    // Step 2 — drop each path.
    setPhase("dropping");
    say("Dropping enrolment paths", "جارٍ إسقاط مسارات التسجيل");
    let dropped = 0;
    try {
      for (const p of droppable) {
        await record("DELETE", `/api/enrolment/methods/${p.method_id}/enrolments/${userId}`, () => apiDelete(`/api/enrolment/methods/${p.method_id}/enrolments/${userId}`), { step: `drop ${p.method} path` });
        dropped += 1;
      }
    } catch (e) {
      await handleFailure(1, e, dropped);
      return;
    }

    // Verify the roster no longer lists them.
    setPhase("verifying");
    say("Verifying participant access", "جارٍ التحقق من وصول المشارك");
    let stillListed = false;
    try {
      const parts = await record("GET", `/api/enrolment/courses/${courseId}/participants?status=all`, () => apiGet(`/api/enrolment/courses/${courseId}/participants?status=all`), { step: "verify roster", summarize: (rows) => ({ rows: rows.length, still_listed: rows.some((r) => r.user_id === userId) }) });
      stillListed = parts.some((p) => p.user_id === userId);
    } catch (e) {
      await handleFailure(1, e, dropped);
      return;
    }

    // Step 3 — read preserved progress (after the drop).
    setPhase("reading-preserved");
    say("Reading preserved progress", "جارٍ قراءة التقدّم المحفوظ");
    try {
      const row = await readProgress(userId, courseId, "after drop: progress");
      setAfterDrop({ row, stillListed });
    } catch (e) {
      await handleFailure(2, e, dropped);
      return;
    }

    await dwell(1100);

    // Step 4 — re-enrol and read restored state.
    setPhase("reenrolling");
    say("Re-enrolling the student", "جارٍ إعادة تسجيل الطالب");
    try {
      await record("POST", `/api/enrolment/courses/${courseId}/enrol`, () => apiPost(`/api/enrolment/courses/${courseId}/enrol`, { user_id: userId }), { step: "re-enrol", status: 201, summarize: () => ({ user_id: userId }) });
    } catch (e) {
      await handleFailure(3, e, dropped);
      return;
    }
    setPhase("reading-restored");
    say("Reading restored state", "جارٍ قراءة الحالة المستعادة");
    try {
      const paths = await readPaths(userId, courseId, "after re-enrol: paths");
      const row = await readProgress(userId, courseId, "after re-enrol: progress");
      setAfterReturn({ paths, row });
    } catch (e) {
      await handleFailure(3, e, dropped);
      return;
    }

    setPhase("done");
    say("Completed", "اكتمل");
  }

  // Reset — restore an enrolled baseline (re-enrol if needed) + clear the log.
  async function reset() {
    setPhase("validating");
    say("Resetting", "إعادة الضبط");
    clear();
    setAfterDrop(null);
    setAfterReturn(null);
    setError(null);
    setReasons(null);
    setRecovery(null);
    setFailedIndex(-1);
    try {
      const paths = await readPaths(userId, courseId, "reset: paths");
      if (!paths.some((p) => p.live)) {
        await restoreAccess("reset: restore access");
      }
    } catch {
      /* best-effort; loadBaseline below reports any read error */
    }
    await loadBaseline();
  }

  // --- derived --------------------------------------------------------------
  const { completedCount, activeIndex, failedIndex: flIdx } = lifecycleState(phase, !!baseline.paths, failedIndex);
  const beforeVerdict = comparePreserved(baseline.row, afterDrop?.row);
  const afterVerdict = comparePreserved(baseline.row, afterReturn?.row);
  const step = stepOf(phase);
  const runLabel =
    phase === "validating"
      ? pick(lang, "Validating…", "جارٍ التحقق…")
      : running
        ? pick(lang, `Running step ${step} of 4`, `تنفيذ الخطوة ${step} من 4`)
        : phase === "done"
          ? pick(lang, "Run again", "تشغيل مرة أخرى")
          : phase === "failed"
            ? pick(lang, "Retry demo", "إعادة المحاولة")
            : pick(lang, "Run demo", "تشغيل العرض");
  const userName = users.list?.find((u) => u.id === userId)?.full_name ?? "";
  const courseName = courses.list?.find((c) => c.id === courseId)?.full_name ?? "";

  const ready = userId && courseId && !baseline.loading && !baseline.error;

  return (
    <section className="dm-ws" aria-labelledby="dm-hc2-h">
      <WorkspaceIntro
        headingId="dm-hc2-h"
        code="HC2"
        icon="repeat"
        en="Drop and return"
        ar="الانسحاب والعودة"
        subEn="A student leaves, then returns — access changes, history does not."
        subAr="طالب ينسحب ثم يعود — يتغيّر الوصول، لا يتغيّر السجل."
      />
      <DataSourceNote live />

      <fieldset className="dm-selectors dm-fieldset" disabled={running}>
        <DemoSelect id="hc2-user" labelEn="User" labelAr="المستخدم" icon="userRound" value={userId} onChange={setUserId} options={userOptions} loading={users.loading} error={users.error} lang={lang} />
        <DemoSelect id="hc2-course" labelEn="Course" labelAr="المقرر" icon="bookOpen" value={courseId} onChange={setCourseId} options={courseOptions} loading={courses.loading} error={courses.error} lang={lang} />
      </fieldset>

      {!userId || !courseId ? (
        <EmptyState icon="repeat" en="Pick a student and a course to begin." ar="اختر طالبًا ومقررًا للبدء." />
      ) : baseline.error ? (
        <ErrorState en="We couldn't load the baseline." ar="تعذّر تحميل الحالة الأساسية." detail={baseline.error} onRetry={loadBaseline} lang={lang} />
      ) : baseline.loading || !baseline.paths ? (
        <SkeletonRows lines={4} />
      ) : (
        <>
          {/* Baseline anchor */}
          <div className="dm-baseline">
            <span className="dm-baseline__label">
              <Bi en="Baseline" ar="الحالة الأساسية" />
            </span>
            <span className="dm-baseline__paths">
              {baseline.paths.length ? (
                baseline.paths.map((p) => <ProvenanceChip key={p.method_id} method={p.method} live={p.live} />)
              ) : (
                <span className="muted"><Bi en="no paths — not enrolled" ar="لا مسارات — غير مسجّل" /></span>
              )}
            </span>
          </div>

          {/* Lifecycle */}
          <div className="dm-tl-wrap" aria-labelledby="dm-hc2-tl">
            <div className="dm-subhead" id="dm-hc2-tl">
              <Icon name="route" />
              <Bi en="Lifecycle" ar="دورة الحياة" />
            </div>
            <Lifecycle steps={LIFECYCLE} completedCount={completedCount} activeIndex={activeIndex} failedIndex={flIdx} lang={lang} titleId="dm-hc2-tl" />
          </div>

          {/* Before / After snapshots */}
          <div className="dm-compare">
            <div className="dm-panel">
              <div className="dm-panel__head">
                <h3 className="dm-panel__title"><Bi en="Before (after drop)" ar="قبل (بعد الانسحاب)" /></h3>
                <InfoDot label={pick(lang, "Progress read AFTER the enrolment paths were removed — proving completion survives unenrolment.", "يُقرأ التقدّم بعد إزالة مسارات التسجيل — لإثبات بقاء الإكمال.")} />
              </div>
              {afterDrop ? (
                <>
                  <SnapshotTable row={afterDrop.row} lang={lang} />
                  <p className="muted dm-roster">
                    <Bi en="Still on the roster?" ar="ما زال على القائمة؟" />{" "}
                    <strong>{afterDrop.stillListed ? pick(lang, "listed", "مُدرج") : pick(lang, "not listed", "غير مُدرج")}</strong>
                  </p>
                  {beforeVerdict === "preserved" ? (
                    <Callout tone="warn" role="status"><Bi en="Progress is preserved after drop." ar="يتم حفظ التقدم بعد الانسحاب." /></Callout>
                  ) : beforeVerdict === "unknown" ? (
                    <Callout tone="neutral"><Bi en="Progress state unknown — no comparable record." ar="حالة التقدّم غير معروفة." /></Callout>
                  ) : (
                    <Callout tone="danger" role="status"><Bi en="Progress changed after drop — not the expected result." ar="تغيّر التقدّم بعد الانسحاب — نتيجة غير متوقعة." /></Callout>
                  )}
                </>
              ) : (
                <EmptyState icon="chart" en="Run the demo to read progress after the drop." ar="شغّل العرض لقراءة التقدّم بعد الانسحاب." />
              )}
            </div>

            <div className="dm-panel">
              <div className="dm-panel__head">
                <h3 className="dm-panel__title"><Bi en="After (after re-enrolment)" ar="بعد (بعد إعادة التسجيل)" /></h3>
                <InfoDot label={pick(lang, "Progress read AFTER re-enrolment — the same completion is still there, nothing recomputed from zero.", "يُقرأ التقدّم بعد إعادة التسجيل — نفس الإكمال دون إعادة حساب.")} />
              </div>
              {afterReturn ? (
                <>
                  <SnapshotTable row={afterReturn.row} lang={lang} />
                  <p className="muted dm-roster">
                    {afterReturn.paths.map((p) => <ProvenanceChip key={p.method_id} method={p.method} live={p.live} />)}
                  </p>
                  {afterVerdict === "preserved" ? (
                    <Callout tone="ok" role="status"><Bi en="Preserved progress remains available after re-enrolment." ar="يبقى التقدم المحفوظ متاحًا بعد إعادة التسجيل." /></Callout>
                  ) : afterVerdict === "unknown" ? (
                    <Callout tone="neutral"><Bi en="Progress state unknown after re-enrolment." ar="حالة التقدّم غير معروفة بعد إعادة التسجيل." /></Callout>
                  ) : (
                    <Callout tone="danger" role="status"><Bi en="Progress differs after re-enrolment — inspect the numbers." ar="يختلف التقدّم بعد إعادة التسجيل — افحص الأرقام." /></Callout>
                  )}
                </>
              ) : (
                <EmptyState icon="chart" en="Run the demo to read progress after re-enrolment." ar="شغّل العرض لقراءة التقدّم بعد إعادة التسجيل." />
              )}
            </div>
          </div>

          {/* Failure + recovery */}
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {reasons && reasons.length > 0 && (
            <Callout tone="danger">
              <strong><Bi en="Refused" ar="مرفوض" /></strong>
              <ul className="dm-reasons">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </Callout>
          )}
          {recovery && (
            <Callout tone={recovery.restored ? "shield" : "danger"} role="status">
              {recovery.note === "nothing-changed" ? (
                <Bi en="Nothing was changed — original state intact." ar="لم يتغيّر شيء — الحالة الأصلية سليمة." />
              ) : recovery.restored ? (
                <Bi en="Recovery: access was restored via the manual method." ar="الاستعادة: أُعيد الوصول عبر الأسلوب اليدوي." />
              ) : (
                <span>
                  <Bi en="Recovery could not confirm restoration — restore manually on Enrolment." ar="تعذّر تأكيد الاستعادة — استعِد يدويًا من صفحة التسجيل." />
                  {recovery.reason ? <span className="dm-note">{recovery.reason}</span> : null}
                </span>
              )}
            </Callout>
          )}

          {phase === "done" && (
            <Callout tone="ok" role="status">
              <Bi
                en="Work survived the gap — completion is a fact about the past; enrolment is a fact about the present."
                ar="بقي العمل عبر الفجوة — الإكمال حقيقة عن الماضي؛ والتسجيل حقيقة عن الحاضر."
              />
            </Callout>
          )}

          {/* Run controls */}
          <div className="dm-runbar">
            <button type="button" className="btn dm-run" onClick={onRunClick} disabled={!ready || running}>
              <Icon name={running ? "loader" : phase === "done" ? "check" : phase === "failed" ? "rotate" : "play"} className={running ? "dm-spin" : ""} />
              {runLabel}
            </button>
            <button type="button" className="btn dm-reset" onClick={reset} disabled={running}>
              <Icon name="undo" />
              <Bi en="Reset" ar="إعادة ضبط" />
            </button>
            <p className="dm-run__status" role="status" aria-live="polite">
              {statusMsg}
            </p>
          </div>

          <ContextLink onNavigate={onNavigate} page="Enrolment" en="Do this by hand on Enrolment" ar="نفّذ هذا يدويًا في صفحة التسجيل" lang={lang} />
        </>
      )}

      <ApiEventLog entries={entries} lang={lang} dir={dir} />

      {/* Confirmation before the mutating run */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} labelledBy="dm-hc2-confirm-title" className="dm-dialog--confirm" dir={dir} initialFocusRef={confirmBtnRef}>
        <div className="dm-dialog__head">
          <h2 id="dm-hc2-confirm-title" className="dm-dialog__title">
            <Icon name="flask" />
            <Bi en="Run Drop and Return demo?" ar="تشغيل عرض الانسحاب والعودة؟" />
          </h2>
        </div>
        <div className="dm-dialog__body">
          <Callout tone={USE_MOCKS ? "info" : "warn"} icon="alert">
            {USE_MOCKS ? (
              <Bi en="Mock mode: this changes only in-browser fixtures, then restores them." ar="وضع المحاكاة: يغيّر نماذج داخل المتصفح فقط ثم يستعيدها." />
            ) : (
              <Bi en="This really unenrols then re-enrols on the shared database. It attempts to restore the original access." ar="هذا يلغي التسجيل فعليًا ثم يعيده على قاعدة البيانات المشتركة، ويحاول استعادة الوصول الأصلي." />
            )}
          </Callout>
          <dl className="dm-confirm__facts">
            <dt><Icon name="userRound" /><Bi en="User" ar="المستخدم" /></dt>
            <dd>{userName}</dd>
            <dt><Icon name="bookOpen" /><Bi en="Course" ar="المقرر" /></dt>
            <dd>{courseName}</dd>
            <dt><Icon name="gitBranch" /><Bi en="Paths removed" ar="المسارات المُزالة" /></dt>
            <dd>{(plan?.droppable ?? []).map((p) => `${p.method} (method ${p.method_id})`).join(", ") || "—"}</dd>
            <dt><Icon name="link" /><Bi en="Restored via" ar="تُستعاد عبر" /></dt>
            <dd>{plan?.restoreMethod ? `${plan.restoreMethod.method} (method ${plan.restoreMethod.id})` : "—"}</dd>
            <dt><Icon name="userCog" /><Bi en="Running as" ar="يعمل باسم" /></dt>
            <dd>{actingUser?.full_name ?? pick(lang, "current principal", "المستخدم الحالي")}</dd>
          </dl>
        </div>
        <div className="dm-dialog__foot">
          <button type="button" className="btn" onClick={() => setConfirmOpen(false)}>
            <Bi en="Cancel" ar="إلغاء" />
          </button>
          <button ref={confirmBtnRef} type="button" className="btn btn--primary dm-run" onClick={execute}>
            <Icon name="play" />
            <Bi en="Run demo" ar="تشغيل العرض" />
          </button>
        </div>
      </Dialog>
    </section>
  );
}
