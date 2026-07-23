// Participants tab — the primary Teaching state (spec §15-29): summary cards,
// a sortable + paginated participant table (with a mobile card fallback), the
// pending-requests side panel, and the course-activities overview below. Row
// actions (enrolment paths, suspend/reactivate/unenrol, promote to non-editing
// teacher) use the REAL enrolment/roles endpoints; the backend decides and any
// refusal is shown verbatim.
import { useEffect, useMemo, useState } from "react";
import { apiPatch, apiDelete, apiPost } from "../../api";
import Icon from "./icons";
import {
  Avatar,
  Bi,
  Dialog,
  EmptyState,
  ErrorState,
  Menu,
  Pagination,
  ProgressBar,
  SortHeader,
  StatusPill,
  SummaryCard,
  TonePill,
} from "./ui";
import ReasonList from "../common/ReasonList";
import PendingRequestsPanel from "./PendingRequestsPanel";
import CourseActivitiesTable from "./CourseActivitiesTable";
import {
  errReasons,
  formatLastAccess,
  formatDate,
  isStudentRow,
  primaryRole,
  roleLabel,
  methodLabel,
} from "../../lib/teaching";

const PAGE_SIZE = 8;
const STATUS_RANK = { active: 0, suspended: 1, expired: 2, method_disabled: 3, account_suspended: 4 };

// ---- role cell ------------------------------------------------------------
function RoleCell({ roles }) {
  if (!roles.length) return <span className="t-muted">—</span>;
  const primary = primaryRole(roles);
  const pl = roleLabel(primary);
  const extra = roles.filter((r) => r !== primary);
  const allTitle = roles.map((r) => roleLabel(r).en).join(" · ");
  return (
    <span className="t-role" title={allTitle}>
      <Bi en={pl.en} ar={pl.ar} />
      {extra.length > 0 ? <span className="t-role__more">+{extra.length}</span> : null}
    </span>
  );
}

// ---- name cell ------------------------------------------------------------
function NameCell({ p }) {
  return (
    <div className="t-who">
      <Avatar name={p.fullName} size={34} />
      <div className="t-who__txt">
        <span className="t-who__name">{p.fullName}</span>
        {p.username ? <span className="t-who__sub">@{p.username}</span> : null}
      </div>
    </div>
  );
}

// ---- enrolment paths dialog (view + per-path mutate) ----------------------
function EnrolmentPathsDialog({ participant, lang, dir, onClose, onChanged }) {
  const [busy, setBusy] = useState(null); // `${verb}:${enrolmentId}`
  const [confirmUnenrol, setConfirmUnenrol] = useState(null);
  const [error, setError] = useState(null);

  async function run(key, fn, done) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      onChanged?.(done);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const suspend = (path) =>
    run(`sus:${path.enrolmentId}`, () => apiPatch(`/api/enrolment/enrolments/${path.enrolmentId}`, { status: "suspended" }),
      lang === "ar" ? `تم إيقاف مسار ${participant.fullName}` : `Suspended a path for ${participant.fullName}`);
  const reactivate = (path) =>
    run(`act:${path.enrolmentId}`, () => apiPatch(`/api/enrolment/enrolments/${path.enrolmentId}`, { status: "active" }),
      lang === "ar" ? `تمت إعادة تفعيل مسار ${participant.fullName}` : `Reactivated a path for ${participant.fullName}`);
  const unenrol = (path) =>
    run(`del:${path.enrolmentId}`, async () => {
      await apiDelete(`/api/enrolment/enrolments/${path.enrolmentId}`);
      setConfirmUnenrol(null);
    }, lang === "ar" ? `تم إلغاء تسجيل ${participant.fullName}` : `Unenrolled ${participant.fullName} from one path`);

  return (
    <Dialog
      open
      onClose={onClose}
      dir={dir}
      size="md"
      titleEn={`Enrolment paths — ${participant.fullName}`}
      titleAr={"مسارات التسجيل"}
    >
      <p className="t-dialog__note">
        <Bi
          en="Each row is one enrolment path (Moodle allows several per person). Actions apply to that path only."
          ar={"كل صف مسار تسجيل واحد؛ تنطبق الإجراءات على ذلك المسار فقط."}
        />
      </p>
      {participant.paths.length === 0 ? (
        <EmptyState icon="userPlus" en="No enrolment paths." ar={"لا توجد مسارات تسجيل."} compact />
      ) : (
        <ul className="t-paths">
          {participant.paths.map((path) => {
            const m = methodLabel(path.method);
            const active = path.status === "active";
            return (
              <li className="t-path" key={path.enrolmentId}>
                <div className="t-path__info">
                  <span className="t-path__method">
                    <Bi en={m.en} ar={m.ar} />
                    {path.methodStatus === "disabled" ? (
                      <TonePill tone="grey" en="method disabled" ar={"طريقة معطّلة"} />
                    ) : null}
                  </span>
                  <span className="t-path__meta">
                    <StatusPill status={active ? "active" : "suspended"} lang={lang} />
                    {path.timeStart || path.timeEnd ? (
                      <span className="t-path__win">
                        {formatDate(path.timeStart, lang)} → {path.timeEnd ? formatDate(path.timeEnd, lang) : "…"}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="t-path__actions">
                  {confirmUnenrol === path.enrolmentId ? (
                    <>
                      <button
                        type="button"
                        className="t-btn t-btn--danger t-btn--sm"
                        disabled={busy != null}
                        onClick={() => unenrol(path)}
                      >
                        {busy === `del:${path.enrolmentId}` ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="x" size={14} />}
                        <Bi en="Confirm unenrol" ar={"تأكيد الإلغاء"} />
                      </button>
                      <button type="button" className="t-btn t-btn--ghost t-btn--sm" onClick={() => setConfirmUnenrol(null)}>
                        <Bi en="Cancel" ar={"إلغاء"} />
                      </button>
                    </>
                  ) : (
                    <>
                      {active ? (
                        <button type="button" className="t-btn t-btn--ghost t-btn--sm" disabled={busy != null} onClick={() => suspend(path)}>
                          {busy === `sus:${path.enrolmentId}` ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="pauseCircle" size={14} />}
                          <Bi en="Suspend" ar={"إيقاف"} />
                        </button>
                      ) : (
                        <button type="button" className="t-btn t-btn--ghost t-btn--sm" disabled={busy != null} onClick={() => reactivate(path)}>
                          {busy === `act:${path.enrolmentId}` ? <Icon name="loader" size={14} className="t-spin" /> : <Icon name="checkCircle" size={14} />}
                          <Bi en="Reactivate" ar={"إعادة تفعيل"} />
                        </button>
                      )}
                      <button type="button" className="t-btn t-btn--danger-outline t-btn--sm" disabled={busy != null} onClick={() => setConfirmUnenrol(path.enrolmentId)}>
                        <Icon name="x" size={14} />
                        <Bi en="Unenrol" ar={"إلغاء التسجيل"} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error && <ReasonList reasons={errReasons(error)} />}
    </Dialog>
  );
}

// ---- assign-role confirm dialog -------------------------------------------
function AssignRoleDialog({ participant, course, courseCtxId, actorId, lang, dir, onClose, onChanged, announce }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      // role 3 = non-editing teacher; the server's assignable matrix refuses
      // anything the actor's own role may not grant.
      await apiPost("/api/roles/assignments", {
        actor_id: actorId,
        user_id: participant.userId,
        role_id: 3,
        context_id: courseCtxId,
      });
      announce?.(lang === "ar" ? `تم تعيين ${participant.fullName} معلّمًا غير محرِّر` : `${participant.fullName} is now a non-editing teacher`);
      onChanged?.();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      dir={dir}
      size="sm"
      titleEn={`Assign a role — ${participant.fullName}`}
      titleAr={"تعيين دور"}
      footer={
        <>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose} disabled={busy}>
            <Bi en="Cancel" ar={"إلغاء"} />
          </button>
          <button type="button" className="t-btn t-btn--primary" onClick={assign} disabled={busy || !courseCtxId}>
            {busy ? <Icon name="loader" size={15} className="t-spin" /> : <Icon name="shield" size={15} />}
            <Bi en="Assign role" ar={"تعيين الدور"} />
          </button>
        </>
      }
    >
      <p className="t-dialog__note">
        <Bi
          en={`Make ${participant.fullName} a non-editing teacher in ${course.short_name}? They can view and grade students' work but never alter activities — Moodle's grade-only role. A teacher may only assign roles below their own.`}
          ar={"يصبح معلّمًا غير محرِّر في هذا المقرر: يطّلع ويقيّم دون تعديل الأنشطة. لا يمكن للمعلّم تعيين دور أعلى من دوره."}
        />
      </p>
      {!courseCtxId && (
        <ReasonList reasons={[lang === "ar" ? "تعذّر تحديد سياق المقرر." : "Couldn't resolve the course context."]} />
      )}
      {error && <ReasonList reasons={errReasons(error)} />}
    </Dialog>
  );
}

// ---- participant table ----------------------------------------------------
function ParticipantsTable({ rows, progress, lang, onSort, sort, onAction }) {
  const th = (key, en, ar, align) => (
    <th scope="col" className={align === "end" ? "t-th-end" : undefined} aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <SortHeader label={en} ar={ar} active={sort.key === key} dir={sort.dir} onSort={() => onSort(key)} align={align} />
    </th>
  );
  return (
    <div className="t-table-wrap t-only-wide">
      <table className="t-table t-table--parts">
        <thead>
          <tr>
            {th("name", "Name", "الاسم")}
            {th("role", "Role", "الدور")}
            {th("status", "Status", "الحالة")}
            {th("access", "Last access", "آخر دخول")}
            {th("progress", "Progress", "التقدم")}
            <th scope="col" className="t-col-actions"><Bi en="Actions" ar={"الإجراءات"} /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const la = formatLastAccess(p.lastAccess, lang);
            return (
              <tr key={p.userId} className={p.accountSuspended ? "t-tr-warn" : undefined}>
                <td><NameCell p={p} /></td>
                <td><RoleCell roles={p.roles} lang={lang} /></td>
                <td>
                  <StatusPill
                    status={p.status}
                    lang={lang}
                    note={p.accountSuspended ? (lang === "ar" ? "الحساب موقوف على مستوى الموقع؛ التسجيل محفوظ." : "Account suspended site-wide; enrolment kept.") : undefined}
                  />
                </td>
                <td>
                  <span className={la.never ? "t-muted" : undefined} title={la.title ?? undefined}>{la.text}</span>
                </td>
                <td>{isStudentRow(p.roles) ? <ProgressBar percent={progress.get(p.userId)?.percent} lang={lang} /> : <span className="t-muted" title={lang === "ar" ? "لا ينطبق على أعضاء التدريس" : "Not applicable for staff"}>—</span>}</td>
                <td className="t-col-actions">{onAction(p)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- mobile participant cards ---------------------------------------------
function ParticipantCards({ rows, progress, lang, onAction }) {
  return (
    <ul className="t-cards t-only-narrow">
      {rows.map((p) => {
        const la = formatLastAccess(p.lastAccess, lang);
        return (
          <li className="t-card" key={p.userId}>
            <div className="t-card__head">
              <Avatar name={p.fullName} size={38} />
              <span className="t-card__title">
                {p.fullName}
                {p.username ? <span className="t-who__sub">@{p.username}</span> : null}
              </span>
              <span className="t-card__act">{onAction(p)}</span>
            </div>
            <dl className="t-card__grid">
              <div><dt><Bi en="Role" ar={"الدور"} /></dt><dd><RoleCell roles={p.roles} lang={lang} /></dd></div>
              <div><dt><Bi en="Status" ar={"الحالة"} /></dt><dd><StatusPill status={p.status} lang={lang} /></dd></div>
              <div><dt><Bi en="Last access" ar={"آخر دخول"} /></dt><dd className={la.never ? "t-muted" : undefined}>{la.text}</dd></div>
              <div><dt><Bi en="Progress" ar={"التقدم"} /></dt><dd>{isStudentRow(p.roles) ? <ProgressBar percent={progress.get(p.userId)?.percent} lang={lang} /> : <span className="t-muted">—</span>}</dd></div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

// ---- other-users disclosure ----------------------------------------------
function OtherUsers({ users }) {
  if (!users.length) return null;
  return (
    <details className="t-others">
      <summary>
        <Icon name="userRound" size={16} />
        <Bi en={`Other users with a role but no enrolment (${users.length})`} ar={`مستخدمون لديهم دور دون تسجيل (${users.length})`} />
      </summary>
      <ul className="t-others__list">
        {users.map((u) => (
          <li key={u.userId}>
            <Avatar name={u.fullName} size={28} />
            <span className="t-others__name">{u.fullName}</span>
            <span className="t-others__roles">{u.roles.map((r) => roleLabel(r).en).join(" · ") || "—"}</span>
            <span className="t-others__note">{u.note}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// ---- tab ------------------------------------------------------------------
export default function ParticipantsTab({
  course,
  actorId,
  courseCtxId,
  lang,
  dir,
  participants,
  otherUsers,
  progress,
  activities,
  requests,
  reload,
  onGoToTab,
  onGradeActivity,
  announce,
}) {
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pathsFor, setPathsFor] = useState(null);
  const [assignFor, setAssignFor] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [course.id]);

  const data = participants.data ?? [];

  const activeCount = data.filter((p) => p.status === "active").length;
  const suspendedCount = data.filter((p) => p.status && p.status !== "active").length;
  const otherCount = (otherUsers.data ?? []).length;

  const sorted = useMemo(() => {
    const arr = [...(participants.data ?? [])];
    const dirMul = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av;
      let bv;
      if (sort.key === "name") return dirMul * a.fullName.localeCompare(b.fullName);
      if (sort.key === "role") return dirMul * roleLabel(primaryRole(a.roles) ?? "").en.localeCompare(roleLabel(primaryRole(b.roles) ?? "").en);
      if (sort.key === "status") { av = STATUS_RANK[a.status] ?? 9; bv = STATUS_RANK[b.status] ?? 9; }
      else if (sort.key === "access") { av = a.lastAccess ? new Date(a.lastAccess).getTime() : -Infinity; bv = b.lastAccess ? new Date(b.lastAccess).getTime() : -Infinity; }
      else if (sort.key === "progress") { av = progress.get(a.userId)?.percent ?? -1; bv = progress.get(b.userId)?.percent ?? -1; }
      else return 0;
      return dirMul * (av - bv);
    });
    return arr;
  }, [participants.data, sort, progress]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function onSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  }

  // Row actions menu — real, permission-gated items only.
  function actionMenu(p) {
    const isTeacher = p.roles.includes("teacher") || p.roles.includes("editingteacher") || p.roles.includes("manager");
    const items = [
      {
        key: "paths",
        icon: "eye",
        en: "View enrolment paths",
        ar: "عرض مسارات التسجيل",
        disabled: p.paths.length === 0,
        disabledReason: lang === "ar" ? "لا توجد مسارات" : "No enrolment paths",
        onSelect: () => setPathsFor(p),
      },
    ];
    if (!isTeacher) {
      items.push({
        key: "assign",
        icon: "shield",
        en: "Assign non-editing teacher",
        ar: "تعيين معلّم غير محرِّر",
        onSelect: () => setAssignFor(p),
      });
    }
    return (
      <Menu
        triggerLabel={lang === "ar" ? `إجراءات ${p.fullName}` : `Actions for ${p.fullName}`}
        items={items}
        lang={lang}
        align={dir === "rtl" ? "start" : "end"}
      />
    );
  }

  return (
    <div className="t-parts">
      <div className="t-parts__grid">
        <div className="t-parts__main">
          {/* summary cards */}
          <div className="t-sumgrid">
            <SummaryCard tone="blue" icon="users" value={activeCount} en="Active" ar="نشطون" loading={participants.loading} />
            <SummaryCard tone="orange" icon="pauseCircle" value={suspendedCount} en="Suspended" ar="موقوفون" loading={participants.loading} />
            <SummaryCard tone="navy" icon="userRound" value={otherCount} en="Other users" ar="مستخدمون آخرون" loading={otherUsers.loading} />
          </div>

          {/* participant table / states */}
          {participants.error ? (
            <ErrorState error={participants.error} onRetry={() => reload("participants")} lang={lang} />
          ) : participants.loading ? (
            <div className="t-skel-rows" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div className="t-skel-row" key={i} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState icon="users" en="No participants are enrolled." ar={"لا يوجد مشاركون مسجلون."} />
          ) : (
            <>
              <ParticipantsTable rows={pageRows} progress={progress} lang={lang} dir={dir} onSort={onSort} sort={sort} onAction={actionMenu} />
              <ParticipantCards rows={pageRows} progress={progress} lang={lang} onAction={actionMenu} />
              <Pagination
                page={page}
                pageCount={pageCount}
                total={sorted.length}
                pageSize={PAGE_SIZE}
                onPage={setPage}
                lang={lang}
                nounEn="participants"
                nounAr="مشاركًا"
              />
              <OtherUsers users={otherUsers.data ?? []} lang={lang} />
            </>
          )}
        </div>

        <div className="t-parts__side">
          <PendingRequestsPanel
            requests={requests.data ?? []}
            loading={requests.loading}
            error={requests.error}
            onRetry={() => reload("requests")}
            actorId={actorId}
            lang={lang}
            announce={announce}
            onDecided={() => {
              reload("requests");
              reload("participants");
              reload("progress");
            }}
            onViewAll={() => onGoToTab("requests")}
          />
        </div>
      </div>

      {/* course activities overview */}
      <section className="t-actsec" aria-labelledby="teach-activities-head">
        <h2 id="teach-activities-head" className="t-sec-title">
          <Icon name="clipboardList" size={19} />
          <Bi en="Course activities" ar={"أنشطة المقرر"} />
        </h2>
        <div className="t-surface">
          <CourseActivitiesTable
            activities={activities.data ?? []}
            lang={lang}
            loading={activities.loading}
            error={activities.error}
            onRetry={() => reload("activities")}
            onGrade={(a) => {
              onGradeActivity?.(a);
              onGoToTab("grading");
            }}
          />
        </div>
      </section>

      {pathsFor && (
        <EnrolmentPathsDialog
          participant={pathsFor}
          lang={lang}
          dir={dir}
          onClose={() => setPathsFor(null)}
          onChanged={(msg) => {
            announce?.(msg);
            reload("participants");
            reload("progress");
          }}
        />
      )}
      {assignFor && (
        <AssignRoleDialog
          participant={assignFor}
          course={course}
          courseCtxId={courseCtxId}
          actorId={actorId}
          lang={lang}
          dir={dir}
          announce={announce}
          onClose={() => setAssignFor(null)}
          onChanged={() => {
            reload("participants");
            reload("otherUsers");
          }}
        />
      )}
    </div>
  );
}
