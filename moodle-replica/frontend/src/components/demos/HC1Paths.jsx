// HC1 — Manual + cohort. A read-only proof that course membership is the OR of
// a person's LIVE enrolment paths: a student enrolled by hand AND via cohort
// sync keeps access when one path is removed, because the other is still live.
// It reads the real paths (GET /api/enrolment/users/{id}/enrolments) and, for
// each path, computes what removing it would leave — proving the rule without
// mutating anything. Live path management stays on the Enrolment page.
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../../api";
import Icon from "./icons";
import DemoSelect from "./DemoSelect";
import ApiEventLog from "./ApiEventLog";
import { useApiLog } from "./useApiLog";
import { useCatalog } from "./useCatalog";
import { Bi, Callout, EmptyState, ErrorState, SkeletonRows, ProvenanceChip, pick } from "./ui";
import { WorkspaceIntro, DataSourceNote, ContextLink } from "./workspace";

export default function HC1Paths({ lang = "en", dir = "ltr", onNavigate }) {
  const users = useCatalog("/api/users");
  const courses = useCatalog("/api/courses");
  const [userId, setUserId] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [state, setState] = useState({ paths: null, loading: false, error: null });
  const { entries, record, clear } = useApiLog();
  const reqId = useRef(0);

  // Default to the canonical two-path persona by USERNAME / SHORT NAME (ids
  // differ across DBs); fall back to nothing so the user just picks.
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
    () =>
      (courses.list ?? []).map((c) => ({
        value: c.id,
        text: `${c.full_name} · ${c.short_name}${c.deleted ? pick(lang, " (deleted)", " (محذوف)") : ""}`,
      })),
    [courses.list, lang],
  );

  async function load() {
    if (!userId || !courseId) return;
    const my = ++reqId.current;
    setState({ paths: null, loading: true, error: null });
    clear();
    try {
      const all = await record(
        "GET",
        `/api/enrolment/users/${userId}/enrolments`,
        () => apiGet(`/api/enrolment/users/${userId}/enrolments`),
        {
          step: "read paths",
          summarize: (rows) => ({ paths: rows.length, in_course: rows.filter((r) => r.course?.id === courseId).length }),
        },
      );
      if (my !== reqId.current) return;
      const paths = all.filter((p) => p.course?.id === courseId);
      setState({ paths, loading: false, error: null });
    } catch (e) {
      if (my !== reqId.current) return;
      setState({ paths: null, loading: false, error: e.message });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, courseId]);

  const paths = state.paths ?? [];
  const livePaths = paths.filter((p) => p.live);
  const enrolled = livePaths.length > 0;
  const courseShort = courses.list?.find((c) => c.id === courseId)?.short_name ?? "";

  return (
    <section className="dm-ws" aria-labelledby="dm-hc1-h">
      <WorkspaceIntro
        headingId="dm-hc1-h"
        code="HC1"
        icon="gitBranch"
        en="Manual + cohort"
        ar="يدوي + فوج"
        subEn="Two ways into one course — remove one, still enrolled."
        subAr="طريقان إلى مقرر واحد — احذف واحدًا، يبقى مسجّلًا."
      />
      <DataSourceNote />

      <div className="dm-selectors">
        <DemoSelect
          id="hc1-user"
          labelEn="User"
          labelAr="المستخدم"
          icon="userRound"
          value={userId}
          onChange={setUserId}
          options={userOptions}
          loading={users.loading}
          error={users.error}
          lang={lang}
        />
        <DemoSelect
          id="hc1-course"
          labelEn="Course"
          labelAr="المقرر"
          icon="bookOpen"
          value={courseId}
          onChange={setCourseId}
          options={courseOptions}
          loading={courses.loading}
          error={courses.error}
          lang={lang}
        />
        <button type="button" className="btn dm-recheck" onClick={load} disabled={!userId || !courseId || state.loading}>
          <Icon name="refresh" />
          <Bi en="Re-check" ar="إعادة الفحص" />
        </button>
      </div>

      {!userId || !courseId ? (
        <EmptyState icon="gitBranch" en="Pick a student and a course to trace their paths." ar="اختر طالبًا ومقررًا لتتبّع مساراته." />
      ) : state.error ? (
        <ErrorState en="We couldn't load enrolment paths." ar="تعذّر تحميل مسارات التسجيل." detail={state.error} onRetry={load} lang={lang} />
      ) : state.loading || state.paths === null ? (
        <SkeletonRows lines={3} />
      ) : paths.length === 0 ? (
        <EmptyState
          icon="unlink"
          en={`No enrolment path into ${courseShort}.`}
          ar="لا يوجد مسار تسجيل في هذا المقرر."
          hint={pick(lang, "HC1 needs at least one path (ideally two) — pick a course this student is enrolled in.", "يحتاج HC1 مسارًا واحدًا على الأقل.")}
        />
      ) : (
        <>
          <div className="dm-pathgrid">
            {paths.map((p) => {
              const remaining = paths.filter((x) => x !== p);
              const stillLive = remaining.some((x) => x.live);
              return (
                <div key={p.method_id} className={`dm-pathcard${p.live ? " dm-pathcard--live" : ""}`}>
                  <div className="dm-pathcard__head">
                    <ProvenanceChip method={p.method} live={p.live} />
                    <code className="dm-pathcard__mid">method {p.method_id}</code>
                  </div>
                  <dl className="dm-pathcard__meta">
                    <dt><Bi en="Enrolment" ar="التسجيل" /></dt>
                    <dd>{p.status}</dd>
                    <dt><Bi en="Method" ar="الأسلوب" /></dt>
                    <dd>{p.method_status}</dd>
                  </dl>
                  <p className="dm-pathcard__preview">
                    <Icon name={stillLive ? "shieldCheck" : "alert"} />
                    {stillLive ? (
                      <Bi en="Remove this path → still enrolled." ar="احذف هذا المسار ← يبقى مسجّلًا." />
                    ) : (
                      <Bi en="Remove this path → last live path; access ends." ar="احذف هذا المسار ← آخر مسار حيّ؛ ينتهي الوصول." />
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <Callout tone={enrolled ? "ok" : "danger"} role="status">
            <strong>
              {enrolled ? (
                <Bi en="Enrolled — access granted." ar="مسجّل — الوصول ممنوح." />
              ) : (
                <Bi en="Not enrolled — no live path." ar="غير مسجّل — لا يوجد مسار حيّ." />
              )}
            </strong>{" "}
            <Bi
              en={`Effective membership is the OR of live paths: ${livePaths.length} of ${paths.length} live.`}
              ar={`العضوية الفعلية هي اتحاد المسارات الحيّة: ${livePaths.length} من ${paths.length}.`}
            />
          </Callout>

          <Callout tone="info">
            <Bi
              en="Membership = OR of live paths (§6.10). A role justified by one path survives while another live path stands."
              ar="العضوية = اتحاد المسارات الحيّة. الدور المبرَّر بمسار يبقى ما دام مسار آخر حيًّا."
            />
            {paths.some((p) => p.method === "cohort" && p.live) && (
              <span className="dm-note">
                <Icon name="info" />
                <Bi
                  en="A live cohort path can't be manually unenrolled (R-COHORT / ENR-013) — remove the user from the cohort instead."
                  ar="لا يمكن إلغاء مسار الفوج الحيّ يدويًا — أزِل المستخدم من الفوج بدلًا من ذلك."
                />
              </span>
            )}
          </Callout>

          <ContextLink onNavigate={onNavigate} page="Enrolment" en="Manage these paths live on Enrolment" ar="أدر المسارات في صفحة التسجيل" lang={lang} />
        </>
      )}

      <ApiEventLog entries={entries} lang={lang} dir={dir} />
    </section>
  );
}
