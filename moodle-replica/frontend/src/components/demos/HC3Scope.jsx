// HC3 — TA group marking. A read-only proof that in separate-groups mode a
// non-privileged teacher/TA may grade only students in a group they share,
// unless their role holds access-all-groups. Nothing is faked in the frontend:
// the verdict comes from POST /api/groups/access-check and the reachable set
// from GET .../allowed — both returned by the backend, reasons shown verbatim.
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./icons";
import DemoSelect from "./DemoSelect";
import ApiEventLog from "./ApiEventLog";
import { useApiLog } from "./useApiLog";
import { useCatalog } from "./useCatalog";
import { fetchActivityPolicies, fetchGroupsBoard, accessCheck, fetchAllowedGroups } from "../../lib/groupsApi";
import { Bi, Callout, EmptyState, ErrorState, SkeletonRows, pick } from "./ui";
import { WorkspaceIntro, DataSourceNote, ContextLink } from "./workspace";

const OUTCOME = {
  allowed: { tone: "ok", icon: "shieldCheck", en: "Allowed — may grade this student.", ar: "مسموح — يمكنه تقييم هذا الطالب." },
  denied: { tone: "danger", icon: "shieldX", en: "Denied — outside the allowed group scope.", ar: "مرفوض — خارج نطاق المجموعة المسموح." },
  invisible: { tone: "warn", icon: "shieldX", en: "Invisible — separate groups hide this student.", ar: "غير مرئي — المجموعات المنفصلة تُخفي هذا الطالب." },
};

export default function HC3Scope({ lang = "en", dir = "ltr", onNavigate }) {
  const users = useCatalog("/api/users");
  const courses = useCatalog("/api/courses");
  const { entries, record, clear } = useApiLog();

  const [courseId, setCourseId] = useState(null);
  const [actorId, setActorId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [activityId, setActivityId] = useState(null);

  const [ctx, setCtx] = useState({ activities: null, groups: null, loading: false, error: null });
  const [result, setResult] = useState(null); // { outcome, reasons }
  const [allowed, setAllowed] = useState(null); // { groups, all_groups, reason }
  const [checking, setChecking] = useState(false);
  const reqId = useRef(0);

  // Defaults by name (ids differ across DBs): CS101, the scoped TA, a Group-B
  // student — the trio that yields the "invisible" teaching moment.
  useEffect(() => {
    if (courseId == null && courses.list) {
      const c = courses.list.find((x) => x.short_name === "CS101");
      if (c) setCourseId(c.id);
    }
  }, [courses.list, courseId]);
  useEffect(() => {
    if (actorId == null && users.list) {
      const a = users.list.find((u) => u.username === "ta.a");
      if (a) setActorId(a.id);
    }
  }, [users.list, actorId]);

  // Load the course's activities (with effective group mode) + groups board.
  async function loadCtx() {
    if (!courseId) return;
    const my = ++reqId.current;
    setCtx({ activities: null, groups: null, loading: true, error: null });
    setResult(null);
    setAllowed(null);
    clear();
    try {
      const activities = await record("GET", `/api/groups/courses/${courseId}/activity-policies`, () => fetchActivityPolicies(courseId), {
        step: "load activities",
        summarize: (a) => ({ activities: a.length }),
      });
      const groups = await record("GET", `/api/groups/courses/${courseId}/groups`, () => fetchGroupsBoard(courseId), {
        step: "load groups",
        summarize: (g) => ({ groups: g.length }),
      });
      if (my !== reqId.current) return;
      setCtx({ activities, groups, loading: false, error: null });
      // default activity: prefer a separate-mode one (that's where isolation bites)
      const sep = activities.find((a) => a.effective_mode === "separate") || activities[0];
      if (sep) setActivityId((cur) => cur ?? sep.activity_id);
    } catch (e) {
      if (my !== reqId.current) return;
      setCtx({ activities: null, groups: null, loading: false, error: e.message });
    }
  }
  useEffect(() => {
    loadCtx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Default target: a Group-B member (the "invisible" case) once groups + users
  // are loaded — kept out of loadCtx so a late users fetch can't re-run it.
  useEffect(() => {
    if (targetId != null || !ctx.groups || !users.list) return;
    const members = ctx.groups.flatMap((g) => g.members);
    const b = users.list.find((u) => u.username === "student.b");
    const chosen = (b && members.some((m) => m.user_id === b.id) && b.id) || members[0]?.user_id;
    if (chosen != null) setTargetId(chosen);
  }, [ctx.groups, users.list, targetId]);

  const activity = ctx.activities?.find((a) => a.activity_id === activityId) || null;

  // Target options come from the course's group members (labelled with their
  // group), so a target is always someone in the course's group structure.
  const targetOptions = useMemo(() => {
    if (!ctx.groups) return [];
    const byUser = new Map();
    for (const g of ctx.groups) {
      for (const m of g.members) {
        const cur = byUser.get(m.user_id) || { name: m.full_name, groups: [] };
        cur.groups.push(g.name);
        byUser.set(m.user_id, cur);
      }
    }
    return [...byUser.entries()].map(([id, v]) => ({ value: id, text: `${v.name} · ${v.groups.join(" + ")}` }));
  }, [ctx.groups]);

  const actorOptions = useMemo(
    () => (users.list ?? []).map((u) => ({ value: u.id, text: `${u.full_name} (${u.username})` })),
    [users.list],
  );
  const activityOptions = useMemo(
    () =>
      (ctx.activities ?? []).map((a) => ({
        value: a.activity_id,
        text: `${a.name} · ${pick(lang, "mode", "الوضع")}: ${a.effective_mode}`,
      })),
    [ctx.activities, lang],
  );

  // Evaluate: allowed-groups for the actor + the actor↔target verdict.
  async function evaluate() {
    if (!actorId || !activityId) return;
    const my = ++reqId.current;
    setChecking(true);
    try {
      const al = await record("GET", `/api/groups/activities/${activityId}/allowed?user_id=${actorId}`, () => fetchAllowedGroups(activityId, actorId), {
        step: "allowed groups",
        summarize: (r) => ({ all_groups: r.all_groups, groups: r.groups.map((g) => g.name) }),
      });
      let res = null;
      if (targetId) {
        res = await record("POST", "/api/groups/access-check", () => accessCheck({ actor_id: actorId, target_user_id: targetId, activity_id: activityId }), {
          step: "access-check",
          summarize: (r) => ({ outcome: r.outcome }),
        });
      }
      if (my !== reqId.current) return;
      setAllowed(al);
      setResult(res);
    } catch (e) {
      if (my !== reqId.current) return;
      setResult({ outcome: "error", reasons: [e.message] });
    } finally {
      if (my === reqId.current) setChecking(false);
    }
  }
  useEffect(() => {
    evaluate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId, targetId, activityId]);

  const actorGroups = ctx.groups?.filter((g) => g.members.some((m) => m.user_id === actorId)).map((g) => g.name) ?? [];
  const targetGroups = ctx.groups?.filter((g) => g.members.some((m) => m.user_id === targetId)).map((g) => g.name) ?? [];
  const oc = result && OUTCOME[result.outcome];

  return (
    <section className="dm-ws" aria-labelledby="dm-hc3-h">
      <WorkspaceIntro
        headingId="dm-hc3-h"
        code="HC3"
        icon="clipboardCheck"
        en="TA group marking"
        ar="تقييم مجموعات المساعد"
        subEn="A TA may grade only the groups their capability and group scope allow."
        subAr="يقيّم المساعد المجموعات التي تسمح بها صلاحيته ونطاق مجموعته فقط."
      />
      <DataSourceNote />

      <div className="dm-selectors dm-selectors--4">
        <DemoSelect id="hc3-course" labelEn="Course" labelAr="المقرر" icon="bookOpen" value={courseId} onChange={setCourseId} options={(courses.list ?? []).map((c) => ({ value: c.id, text: c.short_name }))} loading={courses.loading} error={courses.error} lang={lang} />
        <DemoSelect id="hc3-actor" labelEn="Teaching assistant" labelAr="مساعد التدريس" icon="userCog" value={actorId} onChange={setActorId} options={actorOptions} loading={users.loading} error={users.error} lang={lang} />
        <DemoSelect id="hc3-activity" labelEn="Activity" labelAr="النشاط" icon="clipboardCheck" value={activityId} onChange={setActivityId} options={activityOptions} loading={ctx.loading} lang={lang} />
        <DemoSelect id="hc3-target" labelEn="Target student" labelAr="الطالب الهدف" icon="userRound" value={targetId} onChange={setTargetId} options={targetOptions} loading={ctx.loading} lang={lang} />
      </div>

      {!courseId ? (
        <EmptyState icon="users" en="Pick a course to load its groups and activities." ar="اختر مقررًا لتحميل مجموعاته وأنشطته." />
      ) : ctx.error ? (
        <ErrorState en="We couldn't load groups/activities." ar="تعذّر تحميل المجموعات/الأنشطة." detail={ctx.error} onRetry={loadCtx} lang={lang} />
      ) : ctx.loading || ctx.groups === null ? (
        <SkeletonRows lines={4} />
      ) : (ctx.groups?.length ?? 0) === 0 ? (
        <EmptyState icon="users" en="This course has no groups — HC3 needs separate groups to prove scope." ar="لا مجموعات في هذا المقرر — يحتاج HC3 مجموعات منفصلة." />
      ) : (
        <>
          {activity && (
            <p className="dm-modeline">
              <Icon name="route" />
              <Bi en="Group mode" ar="وضع المجموعات" />: <strong>{activity.effective_mode}</strong>
              {activity.forced && <span className="badge badge--amber">{pick(lang, "forced by course", "مفروض من المقرر")}</span>}
              {activity.effective_mode !== "separate" && (
                <span className="muted"> · {pick(lang, "no isolation in this mode", "لا عزل في هذا الوضع")}</span>
              )}
            </p>
          )}

          <div className="dm-scope">
            <div className="dm-panel">
              <div className="dm-panel__head">
                <h3 className="dm-panel__title"><Icon name="fileSearch" /><Bi en="Evidence" ar="الأدلة" /></h3>
              </div>
              <dl className="dm-evi">
                <dt><Bi en="TA groups" ar="مجموعات المساعد" /></dt>
                <dd>{actorGroups.length ? actorGroups.join(", ") : pick(lang, "none in this course", "لا شيء")}</dd>
                <dt><Bi en="Target groups" ar="مجموعات الهدف" /></dt>
                <dd>{targetGroups.length ? targetGroups.join(", ") : pick(lang, "none", "لا شيء")}</dd>
                <dt><Bi en="May mark" ar="يمكنه تقييم" /></dt>
                <dd>
                  {allowed
                    ? allowed.all_groups
                      ? pick(lang, "all groups (access-all-groups)", "كل المجموعات (وصول لكل المجموعات)")
                      : allowed.groups.length
                        ? allowed.groups.map((g) => g.name).join(", ")
                        : pick(lang, "no groups", "لا مجموعات")
                    : "—"}
                </dd>
              </dl>
            </div>

            <div className="dm-panel">
              <div className="dm-panel__head">
                <h3 className="dm-panel__title"><Icon name="clipboardCheck" /><Bi en="Verdict" ar="القرار" /></h3>
              </div>
              {checking ? (
                <SkeletonRows lines={2} />
              ) : !targetId ? (
                <EmptyState icon="userRound" en="Pick a target student to check grading access." ar="اختر طالبًا هدفًا للتحقق من صلاحية التقييم." />
              ) : result?.outcome === "error" ? (
                <Callout tone="danger" icon="alert">{result.reasons?.[0]}</Callout>
              ) : oc ? (
                <>
                  <Callout tone={oc.tone} icon={oc.icon} role="status">
                    <strong><Bi en={oc.en} ar={oc.ar} /></strong>
                  </Callout>
                  {result.reasons?.length > 0 && (
                    <ul className="dm-reasons">{result.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <Callout tone="info">
            <Bi
              en="Authorization is decided by the backend (access-check), not the UI. A role can hold access-all-groups everywhere yet lose it via an override in one course (§C-17)."
              ar="الترخيص يقرره الخادم لا الواجهة. قد يملك الدور الوصول لكل المجموعات ثم يفقده بتجاوز في مقرر واحد."
            />
          </Callout>

          <ContextLink onNavigate={onNavigate} page="Groups" en="Explore scope on the Groups board" ar="استكشف النطاق في صفحة المجموعات" lang={lang} />
        </>
      )}

      <ApiEventLog entries={entries} lang={lang} dir={dir} />
    </section>
  );
}
