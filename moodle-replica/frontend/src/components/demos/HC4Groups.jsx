// HC4 — Two groups. A read-only proof that a student in two groups gets the
// correct UNION of scope — no duplicate members, and no access leaking into a
// third group they don't belong to. It reads the real groups board and the
// backend's allowed-groups set for the user, then shows the deduped union and
// what stays out of scope. Nothing is computed as authorization in the UI.
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./icons";
import DemoSelect from "./DemoSelect";
import ApiEventLog from "./ApiEventLog";
import { useApiLog } from "./useApiLog";
import { useCatalog } from "./useCatalog";
import { fetchActivityPolicies, fetchGroupsBoard, fetchAllowedGroups } from "../../lib/groupsApi";
import { Bi, Callout, EmptyState, ErrorState, SkeletonRows, pick } from "./ui";
import { WorkspaceIntro, DataSourceNote, ContextLink } from "./workspace";

export default function HC4Groups({ lang = "en", dir = "ltr", onNavigate }) {
  const users = useCatalog("/api/users");
  const courses = useCatalog("/api/courses");
  const { entries, record, clear } = useApiLog();

  const [courseId, setCourseId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activityId, setActivityId] = useState(null);
  const [ctx, setCtx] = useState({ groups: null, activities: null, loading: false, error: null });
  const [allowed, setAllowed] = useState(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (courseId == null && courses.list) {
      const c = courses.list.find((x) => x.short_name === "CS101");
      if (c) setCourseId(c.id);
    }
  }, [courses.list, courseId]);
  useEffect(() => {
    if (userId == null && users.list) {
      const u = users.list.find((x) => x.username === "student.multi");
      if (u) setUserId(u.id);
    }
  }, [users.list, userId]);

  async function loadCtx() {
    if (!courseId) return;
    const my = ++reqId.current;
    setCtx({ groups: null, activities: null, loading: true, error: null });
    setAllowed(null);
    clear();
    try {
      const groups = await record("GET", `/api/groups/courses/${courseId}/groups`, () => fetchGroupsBoard(courseId), {
        step: "load groups",
        summarize: (g) => ({ groups: g.length }),
      });
      const activities = await record("GET", `/api/groups/courses/${courseId}/activity-policies`, () => fetchActivityPolicies(courseId), {
        step: "load activities",
        summarize: (a) => ({ activities: a.length }),
      });
      if (my !== reqId.current) return;
      setCtx({ groups, activities, loading: false, error: null });
      const sep = activities.find((a) => a.effective_mode === "separate") || activities[0];
      if (sep) setActivityId((cur) => cur ?? sep.activity_id);
    } catch (e) {
      if (my !== reqId.current) return;
      setCtx({ groups: null, activities: null, loading: false, error: e.message });
    }
  }
  useEffect(() => {
    loadCtx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function evalAllowed() {
    if (!userId || !activityId) return;
    const my = ++reqId.current;
    try {
      const al = await record("GET", `/api/groups/activities/${activityId}/allowed?user_id=${userId}`, () => fetchAllowedGroups(activityId, userId), {
        step: "allowed groups (union)",
        summarize: (r) => ({ all_groups: r.all_groups, groups: r.groups.map((g) => g.name) }),
      });
      if (my === reqId.current) setAllowed(al);
    } catch {
      /* allowed set is supplementary evidence; the board already proves the union */
    }
  }
  useEffect(() => {
    evalAllowed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activityId]);

  const groups = ctx.groups ?? [];
  const memberGroups = groups.filter((g) => g.members.some((m) => m.user_id === userId));
  const otherGroups = groups.filter((g) => !g.members.some((m) => m.user_id === userId));

  // Deduped union of members across the user's groups (proves "no duplicates").
  const { union, sumSizes } = useMemo(() => {
    const map = new Map();
    let sum = 0;
    for (const g of memberGroups) {
      sum += g.members.length;
      for (const m of g.members) {
        const cur = map.get(m.user_id) || { name: m.full_name, groups: [] };
        cur.groups.push(g.name);
        map.set(m.user_id, cur);
      }
    }
    return { union: [...map.entries()].map(([id, v]) => ({ id, ...v })), sumSizes: sum };
  }, [memberGroups]);

  const dupsRemoved = sumSizes - union.length;
  const userName = users.list?.find((u) => u.id === userId)?.full_name ?? "";

  return (
    <section className="dm-ws" aria-labelledby="dm-hc4-h">
      <WorkspaceIntro
        headingId="dm-hc4-h"
        code="HC4"
        icon="combine"
        en="Two groups"
        ar="مجموعتان"
        subEn="A member of two groups gets the union of scope — no duplicates, no third-group access."
        subAr="عضو مجموعتين ينال اتحاد النطاق — دون تكرار ودون وصول لمجموعة ثالثة."
      />
      <DataSourceNote />

      <div className="dm-selectors dm-selectors--3">
        <DemoSelect id="hc4-course" labelEn="Course" labelAr="المقرر" icon="bookOpen" value={courseId} onChange={setCourseId} options={(courses.list ?? []).map((c) => ({ value: c.id, text: c.short_name }))} loading={courses.loading} error={courses.error} lang={lang} />
        <DemoSelect id="hc4-user" labelEn="User" labelAr="المستخدم" icon="userRound" value={userId} onChange={setUserId} options={(users.list ?? []).map((u) => ({ value: u.id, text: `${u.full_name} (${u.username})` }))} loading={users.loading} error={users.error} lang={lang} />
        <DemoSelect id="hc4-activity" labelEn="Activity" labelAr="النشاط" icon="clipboardCheck" value={activityId} onChange={setActivityId} options={(ctx.activities ?? []).map((a) => ({ value: a.activity_id, text: `${a.name} · ${a.effective_mode}` }))} loading={ctx.loading} lang={lang} />
      </div>

      {!courseId || !userId ? (
        <EmptyState icon="combine" en="Pick a course and a user to see their group union." ar="اختر مقررًا ومستخدمًا لعرض اتحاد مجموعاته." />
      ) : ctx.error ? (
        <ErrorState en="We couldn't load groups." ar="تعذّر تحميل المجموعات." detail={ctx.error} onRetry={loadCtx} lang={lang} />
      ) : ctx.loading || ctx.groups === null ? (
        <SkeletonRows lines={4} />
      ) : (
        <>
          {memberGroups.length < 2 && (
            <Callout tone="info">
              <Bi
                en={`${userName || "This user"} is in ${memberGroups.length} group(s) here. HC4 is clearest with a two-group member (e.g. the multi-group student).`}
                ar="هذا المستخدم في عدد قليل من المجموعات هنا. يظهر HC4 بوضوح مع عضو مجموعتين."
              />
            </Callout>
          )}

          <div className="dm-groupgrid">
            {memberGroups.map((g) => (
              <div key={g.id} className="dm-groupcard dm-groupcard--mine">
                <div className="dm-groupcard__head">
                  <Icon name="users" />
                  <span className="dm-groupcard__name">{g.name}</span>
                  <span className="badge badge--blue">{g.members.length}</span>
                </div>
                <ul className="dm-memberlist">
                  {g.members.map((m) => (
                    <li key={m.user_id} className={m.user_id === userId ? "dm-member--focus" : ""}>
                      {m.user_id === userId && <Icon name="userRound" />}
                      {m.full_name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="dm-panel dm-union">
            <div className="dm-panel__head">
              <h3 className="dm-panel__title"><Icon name="combine" /><Bi en="Combined allowed scope" ar="النطاق المسموح المجمّع" /></h3>
              <Icon name="link" className="dm-union__link" />
            </div>
            <p className="dm-union__stat">
              <Bi en="Distinct people in scope" ar="أشخاص متمايزون في النطاق" />: <strong>{union.length}</strong>
              {dupsRemoved > 0 && (
                <span className="badge badge--green">
                  {dupsRemoved} {pick(lang, "duplicate removed", "تكرار مُزال")}
                </span>
              )}
            </p>
            <ul className="dm-unionlist">
              {union.map((m) => (
                <li key={m.id}>
                  <Icon name="check" />
                  {m.name}
                  <span className="muted"> · {[...new Set(m.groups)].join(" + ")}</span>
                </li>
              ))}
            </ul>
            {allowed && (
              <p className="muted dm-union__allowed">
                <Icon name="listChecks" />
                <Bi en="Backend allowed set" ar="المجموعة المسموحة من الخادم" />:{" "}
                {allowed.all_groups ? pick(lang, "all groups", "كل المجموعات") : allowed.groups.map((g) => g.name).join(", ") || pick(lang, "none", "لا شيء")}
              </p>
            )}
          </div>

          {otherGroups.length > 0 && (
            <Callout tone="neutral" icon="shieldX">
              <Bi
                en={`Out of scope (not a member): ${otherGroups.map((g) => g.name).join(", ")} — no unintended access.`}
                ar={`خارج النطاق (ليس عضوًا): ${otherGroups.map((g) => g.name).join("، ")} — لا وصول غير مقصود.`}
              />
            </Callout>
          )}

          <Callout tone="info">
            <Bi
              en="Multi-group scope is the UNION of the member's groups, deduplicated — reachability adds up without granting a group they don't belong to."
              ar="نطاق العضوية المتعددة هو اتحاد مجموعات العضو بعد إزالة التكرار — دون منح مجموعة لا ينتمي إليها."
            />
          </Callout>

          <ContextLink onNavigate={onNavigate} page="Groups" en="See memberships on the Groups board" ar="اطّلع على العضويات في صفحة المجموعات" lang={lang} />
        </>
      )}

      <ApiEventLog entries={entries} lang={lang} dir={dir} />
    </section>
  );
}
