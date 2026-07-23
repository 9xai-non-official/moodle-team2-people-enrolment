// The Participants tab (spec §16-32). Toolbar (enrol / status filters / export)
// + sortable, paginated roster + contextual rail (selected user's paths, other
// users). The Status badge shows effective_status EXACTLY as the API returns it
// — no client status logic. Row actions act per enrolment PATH (HC-1): a user
// with two ways in gets a suspend/reactivate/unenrol control for each. Every
// mutation refetches (no optimistic UI) and surfaces backend reasons verbatim.
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPatch, apiDelete, ApiError } from "../../api";
import { useActingUser } from "../../context/ActingUser";
import ReasonList from "../common/ReasonList";
import Icon from "./icons";
import EnrolUserModal from "./EnrolUserModal";
import UserPathsPanel from "./UserPathsPanel";
import OtherUsersPanel from "./OtherUsersPanel";
import {
  ActionsMenu,
  Avatar,
  Dialog,
  EmptyState,
  Pagination,
  ScopedError,
  friendlyError,
  EnrolmentStatus,
  Segmented,
  Sheet,
  T,
  both,
  dtTitle,
  fmtDate,
  methodMeta,
  pick,
  relTime,
  roleMeta,
  useIsNarrow,
} from "./ui";

const STATUS_OPTS = [
  { value: "active", en: "Active", ar: "نشط", tone: "green", icon: "circleCheck" },
  { value: "suspended", en: "Suspended", ar: "موقوف", tone: "orange", icon: "pauseCircle" },
  { value: "all", en: "All", ar: "الكل", tone: "blue", icon: "users" },
];
const STATUS_RANK = { active: 0, suspended: 1, expired: 2, method_disabled: 3, account_suspended: 4 };
const SORTABLE = new Set(["name", "username", "status", "start", "end", "last_access"]);

const primaryPath = (r) => r.paths?.find((p) => p.status === "active") ?? r.paths?.[0] ?? null;

function csvField(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ParticipantsTable({ courseId, courseName, onNavigate, lang, dir }) {
  const { setActingUserId } = useActingUser();
  const isMobile = useIsNarrow("(max-width: 900px)"); // paths open as a sheet
  const compact = useIsNarrow("(max-width: 1599px)"); // roster becomes cards

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionReasons, setActionReasons] = useState(null);
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [lastChanged, setLastChanged] = useState(null);
  const [selected, setSelected] = useState(null); // participant for rail/sheet
  const [showEnrol, setShowEnrol] = useState(false);
  const [presetUser, setPresetUser] = useState(null);
  const [confirmUnenrol, setConfirmUnenrol] = useState(null); // { row, path }
  const [otherTick, setOtherTick] = useState(0);

  const reqId = useRef(0); // guards against stale responses (fast course/filter changes)

  const load = () => {
    const id = ++reqId.current;
    setLoading(true);
    setLoadError(null);
    apiGet(`/api/enrolment/courses/${courseId}/participants?status=${status}`)
      .then((data) => {
        if (id !== reqId.current) return; // a newer request superseded this one
        setRows(data);
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        setLoadError(friendlyError(e, lang));
        setRows([]);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  };

  useEffect(load, [courseId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Course change clears the selected user + resets paging (spec §14).
  useEffect(() => {
    setSelected(null);
    setPage(1);
    setActionError(null);
  }, [courseId]);

  useEffect(() => setPage(1), [status, sort, pageSize]);

  // Keep the rail's selected participant in sync with fresh data, or drop it
  // when they leave the current filter/roster (e.g. after a suspend removes them
  // from the Active view) — otherwise the rail lingers on a user no longer shown.
  useEffect(() => {
    if (!selected) return;
    const fresh = rows.find((r) => r.user_id === selected.user_id);
    if (fresh) {
      if (fresh !== selected) setSelected(fresh);
    } else if (!loading && !loadError) {
      setSelected(null);
    }
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = (promise, userId, onOk) => {
    setBusy(true);
    setActionError(null);
    setActionReasons(null);
    promise
      .then(() => {
        onOk?.();
        load();
        setOtherTick((t) => t + 1);
        if (userId != null) {
          setLastChanged(userId);
          setTimeout(() => setLastChanged(null), 900);
        }
      })
      .catch((e) => {
        // Surface the backend's exact refusal — e.g. the R-COHORT 409 ("suspend
        // it first, or remove the user from the cohort") or a last-path warning.
        // A multi-reason refusal goes to the ReasonList; else the located message.
        if (e instanceof ApiError && e.reasons?.length) setActionReasons(e.reasons);
        else setActionError(e.message);
      })
      .finally(() => setBusy(false));
  };

  const setStatusOf = (path, next, userId) =>
    mutate(apiPatch(`/api/enrolment/enrolments/${path.enrolment_id}`, { status: next }), userId);

  const doUnenrol = () => {
    const { row, path } = confirmUnenrol;
    setConfirmUnenrol(null);
    mutate(apiDelete(`/api/enrolment/enrolments/${path.enrolment_id}`), row.user_id);
  };

  const openEnrol = (userId = null) => {
    setPresetUser(userId);
    setShowEnrol(true);
  };

  /* ---- sort + paginate (client-side; server returns the full filtered set) */
  const sorted = useMemo(() => {
    const dirMul = sort.dir === "desc" ? -1 : 1;
    const val = (r) => {
      const p = primaryPath(r);
      switch (sort.key) {
        case "name": return (r.full_name ?? "").toLowerCase();
        case "username": return (r.username ?? "").toLowerCase();
        case "status": return STATUS_RANK[r.effective_status] ?? 99;
        case "start": return p?.time_start ? new Date(p.time_start).getTime() : null;
        case "end": return p?.time_end ? new Date(p.time_end).getTime() : null;
        case "last_access": return r.last_access ? new Date(r.last_access).getTime() : null;
        default: return "";
      }
    };
    return rows
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const av = val(a.r);
        const bv = val(b.r);
        if (av === null && bv === null) return a.i - b.i; // stable
        if (av === null) return 1; // nulls last
        if (bv === null) return -1;
        if (av < bv) return -1 * dirMul;
        if (av > bv) return 1 * dirMul;
        return a.i - b.i; // stable tiebreak
      })
      .map((x) => x.r);
  }, [rows, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const from = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(from, from + pageSize);

  const toggleSort = (key) => {
    if (!SORTABLE.has(key)) return;
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };
  const ariaSort = (key) => (sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none");
  const sortIcon = (key) =>
    sort.key !== key ? "arrowUpDown" : sort.dir === "asc" ? "arrowUp" : "arrowDown";

  const exportCsv = () => {
    const cols = [
      ["username", (r) => r.username],
      ["name", (r) => r.full_name],
      ["roles", (r) => (r.roles ?? []).join("|")],
      ["methods", (r) => (r.paths ?? []).map((p) => `${p.method}:${p.status}`).join("|")],
      ["effective_status", (r) => r.effective_status],
      ["start", (r) => primaryPath(r)?.time_start ?? ""],
      ["end", (r) => primaryPath(r)?.time_end ?? ""],
      ["last_access", (r) => r.last_access ?? ""],
    ];
    const head = cols.map((c) => csvField(c[0])).join(",");
    const body = sorted.map((r) => cols.map((c) => csvField(c[1](r))).join(","));
    // UTF-8 BOM keeps Arabic names intact when opened in Excel (spec §19).
    const blob = new Blob(["﻿" + [head, ...body].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `participants-course-${courseId}-${status}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ---- per-user actions menu (path-scoped, HC-1) ------------------------- */
  const menuItems = (r) => {
    const items = [
      {
        kind: "item",
        icon: "gitBranch",
        label: "View enrolment paths",
        ar: "عرض مسارات التسجيل",
        onSelect: () => setSelected(r),
      },
    ];
    (r.paths ?? []).forEach((p) => {
      const mm = methodMeta(p.method);
      items.push({ kind: "heading", label: `${mm.en} path`, ar: `مسار ${mm.ar || mm.en}` });
      if (p.status === "active")
        items.push({
          kind: "item",
          icon: "pauseCircle",
          label: "Suspend enrolment",
          ar: "إيقاف التسجيل",
          disabled: busy,
          onSelect: () => setStatusOf(p, "suspended", r.user_id),
        });
      else
        items.push({
          kind: "item",
          icon: "playCircle",
          label: "Reactivate enrolment",
          ar: "إعادة تفعيل التسجيل",
          disabled: busy,
          onSelect: () => setStatusOf(p, "active", r.user_id),
        });
      // R-COHORT (ENR-013): an active cohort-synced path can't be unenrolled
      // directly — the server refuses it (409). Offer it disabled with the
      // reason instead of a button that only fails, matching the paths panel.
      const cohortLocked = p.method === "cohort" && p.status === "active";
      items.push({
        kind: "item",
        icon: "userMinus",
        label: "Unenrol",
        ar: "إلغاء التسجيل",
        danger: true,
        disabled: busy || cohortLocked,
        title: cohortLocked
          ? both(
              "Synced from a cohort — suspend it first, or remove the user from the cohort.",
              "مُزامَن من فوج — أوقفه أولاً أو أزل المستخدم من الفوج.",
            )
          : undefined,
        onSelect: cohortLocked
          ? undefined
          : () => setConfirmUnenrol({ row: r, path: p }),
      });
    });
    items.push({ kind: "sep" });
    if (onNavigate)
      items.push({
        kind: "item",
        icon: "chartBar",
        label: "View progress",
        ar: "عرض التقدم",
        onSelect: () => onNavigate("Progress"),
      });
    items.push({
      kind: "item",
      icon: "userRound",
      label: "Act as this user",
      ar: "التمثيل كهذا المستخدم",
      onSelect: () => setActingUserId(r.user_id),
    });
    return items;
  };

  /* ---- cells ------------------------------------------------------------- */
  const NameCell = ({ r }) => (
    <button
      type="button"
      className={`enr-name ${selected?.user_id === r.user_id ? "enr-name--on" : ""}`}
      onClick={() => setSelected(r)}
      title={both("View enrolment paths", "عرض مسارات التسجيل")}
    >
      <Avatar name={r.full_name} size={34} />
      <span className="enr-name__txt">
        <span className="enr-name__full">{r.full_name}</span>
      </span>
    </button>
  );

  const MethodCell = ({ r }) => {
    const p = primaryPath(r);
    if (!p) return <span className="enr-muted">—</span>;
    const mm = methodMeta(p.method);
    const extra = (r.paths?.length ?? 0) - 1;
    return (
      <span className="enr-inline">
        <Icon name={mm.icon} size={16} className="enr-inline__ic" />
        <T en={mm.en} ar={mm.ar} />
        {extra > 0 && (
          <span
            className="enr-badge enr-badge--xs enr-badge--purple"
            title={both(
              `${r.paths.length} enrolment paths — open the panel for all`,
              `${r.paths.length} مسارات تسجيل`,
            )}
          >
            +{extra}
          </span>
        )}
      </span>
    );
  };

  const RoleCell = ({ r }) => {
    if (!r.roles?.length) return <span className="enr-muted">—</span>;
    const rm = roleMeta(r.roles[0]);
    const extra = r.roles.length - 1;
    return (
      <span className="enr-inline" title={r.roles.join(", ")}>
        <Icon name={rm.icon} size={16} className="enr-inline__ic" />
        <T en={rm.en} ar={rm.ar} />
        {extra > 0 && <span className="enr-badge enr-badge--xs enr-badge--neutral">+{extra}</span>}
      </span>
    );
  };

  const LastAccessCell = ({ r }) =>
    r.last_access ? (
      <span title={dtTitle(r.last_access, lang)}>{relTime(r.last_access, lang)}</span>
    ) : (
      <span className="enr-muted">
        <T en="Never" ar="لم يدخل" />
      </span>
    );

  const columns = [
    { key: "name", label: "Name", ar: "الاسم", cell: (r) => <NameCell r={r} /> },
    { key: "username", label: "Username", ar: "اسم المستخدم", cell: (r) => <span className="enr-user">{r.username}</span> },
    { key: "status", label: "Status", ar: "الحالة", cell: (r) => <EnrolmentStatus row={r} compact /> },
    { key: "method", label: "Method", ar: "الطريقة", cell: (r) => <MethodCell r={r} /> },
    { key: "role", label: "Role", ar: "الدور", cell: (r) => <RoleCell r={r} /> },
    { key: "start", label: "Start", ar: "البداية", cell: (r) => fmtDate(primaryPath(r)?.time_start, lang) },
    { key: "end", label: "End", ar: "النهاية", cell: (r) => fmtDate(primaryPath(r)?.time_end, lang) },
    { key: "last_access", label: "Last access", ar: "آخر دخول", cell: (r) => <LastAccessCell r={r} /> },
  ];

  const emptyState = () => {
    if (status === "suspended")
      return (
        <EmptyState
          icon="pauseCircle"
          en="No suspended enrolments for this course."
          ar="لا توجد تسجيلات موقوفة في هذا المقرر."
          action={
            <button type="button" className="enr-btn enr-btn--ghost" onClick={() => setStatus("all")}>
              <T en="Show all statuses" ar="عرض كل الحالات" />
            </button>
          }
        />
      );
    if (status === "active")
      return (
        <EmptyState
          icon="users"
          en="No active participants match this filter."
          ar="لا يوجد مشاركون نشطون يطابقون هذا الفلتر."
          action={
            <div className="enr-empty__actions">
              <button type="button" className="enr-btn enr-btn--ghost" onClick={() => setStatus("all")}>
                <T en="Show all statuses" ar="عرض كل الحالات" />
              </button>
              <button type="button" className="enr-btn enr-btn--primary" onClick={() => openEnrol()}>
                <Icon name="userPlus" size={15} />
                <T en="Enrol users" ar="تسجيل مستخدمين" />
              </button>
            </div>
          }
        />
      );
    return (
      <EmptyState
        icon="users"
        en="No participants yet."
        ar="لا يوجد مشاركون بعد."
        action={
          <button type="button" className="enr-btn enr-btn--primary" onClick={() => openEnrol()}>
            <Icon name="userPlus" size={15} />
            <T en="Enrol users" ar="تسجيل مستخدمين" />
          </button>
        }
      />
    );
  };

  /* ---- render ------------------------------------------------------------ */
  const toolbar = (
    <div className="enr-toolbar">
      <div className="enr-toolbar__lead">
        <button
          type="button"
          className="enr-btn enr-btn--primary enr-btn--lg"
          onClick={() => openEnrol()}
          disabled={busy}
        >
          <Icon name="userPlus" size={17} />
          <T en="Enrol users" ar="تسجيل مستخدمين" />
        </button>
        <Segmented
          value={status}
          onChange={setStatus}
          options={STATUS_OPTS}
          ariaLabel={both("Filter by status", "التصفية حسب الحالة")}
        />
      </div>
      <button
        type="button"
        className="enr-btn enr-btn--outline enr-btn--lg"
        onClick={exportCsv}
        disabled={busy || !sorted.length}
        title={both("Exports all rows in the current status filter", "يُصدّر كل الصفوف ضمن فلتر الحالة الحالي")}
      >
        <Icon name="download" size={16} />
        <T en="Export CSV" ar="تصدير CSV" />
      </button>
    </div>
  );

  const table = (
    <div className="enr-tablewrap">
      <table className="enr-table">
        <thead>
          <tr>
            {columns.map((c) => {
              const sortable = SORTABLE.has(c.key);
              return (
                <th key={c.key} scope="col" aria-sort={sortable ? ariaSort(c.key) : undefined}>
                  {sortable ? (
                    <button type="button" className="enr-th-sort" onClick={() => toggleSort(c.key)}>
                      <T en={c.label} ar={c.ar} />
                      <Icon name={sortIcon(c.key)} size={14} className="enr-th-sort__ic" />
                    </button>
                  ) : (
                    <T en={c.label} ar={c.ar} />
                  )}
                </th>
              );
            })}
            <th scope="col" className="enr-th-actions">
              <T en="Actions" ar="الإجراءات" />
            </th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk${i}`} aria-hidden="true" className="enr-skrow">
                {columns.map((c) => (
                  <td key={c.key}>
                    <span className="skeleton" />
                  </td>
                ))}
                <td>
                  <span className="skeleton" />
                </td>
              </tr>
            ))}
          {!loading &&
            pageRows.map((r) => (
              <tr key={r.user_id} className={r.user_id === lastChanged ? "enr-row--flash" : undefined}>
                {columns.map((c) => (
                  <td key={c.key} data-label={pick(lang, c.label, c.ar)}>
                    {c.cell(r)}
                  </td>
                ))}
                <td className="enr-td-actions">
                  <ActionsMenu
                    label={both(`Participant actions for ${r.full_name}`, `إجراءات المشارك ${r.full_name}`)}
                    items={menuItems(r)}
                    lang={lang}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {!loading && !loadError && total === 0 && emptyState()}
    </div>
  );

  const cards = (
    <div className="enr-cards">
      {loading &&
        Array.from({ length: 4 }).map((_, i) => <div key={`skc${i}`} className="enr-pcard enr-pcard--sk" />)}
      {!loading &&
        pageRows.map((r) => {
          const p = primaryPath(r);
          const mm = p ? methodMeta(p.method) : null;
          const rm = r.roles?.length ? roleMeta(r.roles[0]) : null;
          return (
            <div key={r.user_id} className={`enr-pcard ${r.user_id === lastChanged ? "enr-row--flash" : ""}`}>
              <div className="enr-pcard__head">
                <button type="button" className="enr-name" onClick={() => setSelected(r)}>
                  <Avatar name={r.full_name} size={38} />
                  <span className="enr-name__txt">
                    <span className="enr-name__full">{r.full_name}</span>
                    <span className="enr-user">{r.username}</span>
                  </span>
                </button>
                <EnrolmentStatus row={r} />
              </div>
              <dl className="enr-pcard__body">
                <div>
                  <dt><T en="Method" ar="الطريقة" /></dt>
                  <dd>{mm ? <><Icon name={mm.icon} size={15} /> <T en={mm.en} ar={mm.ar} /></> : "—"}</dd>
                </div>
                <div>
                  <dt><T en="Role" ar="الدور" /></dt>
                  <dd>{rm ? <><Icon name={rm.icon} size={15} /> <T en={rm.en} ar={rm.ar} /></> : "—"}</dd>
                </div>
                <div>
                  <dt><T en="Start" ar="البداية" /></dt>
                  <dd>{fmtDate(p?.time_start, lang)}</dd>
                </div>
                <div>
                  <dt><T en="End" ar="النهاية" /></dt>
                  <dd>{fmtDate(p?.time_end, lang)}</dd>
                </div>
                <div>
                  <dt><T en="Last access" ar="آخر دخول" /></dt>
                  <dd>{r.last_access ? relTime(r.last_access, lang) : pick(lang, "Never", "لم يدخل")}</dd>
                </div>
              </dl>
              <div className="enr-pcard__foot">
                <button type="button" className="enr-btn enr-btn--ghost enr-btn--sm" onClick={() => setSelected(r)}>
                  <Icon name="gitBranch" size={15} />
                  <T en="Paths" ar="المسارات" />
                </button>
                <ActionsMenu
                  label={both(`Participant actions for ${r.full_name}`, `إجراءات المشارك ${r.full_name}`)}
                  items={menuItems(r)}
                  lang={lang}
                  align="end"
                />
              </div>
            </div>
          );
        })}
      {!loading && !loadError && total === 0 && emptyState()}
    </div>
  );

  const otherUsers = (
    <OtherUsersPanel courseId={courseId} refreshKey={otherTick} onEnrol={(uid) => openEnrol(uid)} lang={lang} />
  );

  return (
    <div className="enr-parts">
      <div className="enr-parts__main">
        {toolbar}
        {actionReasons && (
          <ReasonList reasons={actionReasons} tone="error" title={both("Action refused", "تعذّر الإجراء")} />
        )}
        {actionError && (
          <ScopedError message={actionError} onRetry={() => setActionError(null)} lang={lang} />
        )}
        {loadError ? (
          <ScopedError message={loadError} onRetry={load} lang={lang} />
        ) : compact ? (
          cards
        ) : (
          table
        )}
        {!loadError && total > 0 && (
          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={total}
            from={from + 1}
            to={Math.min(from + pageSize, total)}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
            lang={lang}
          />
        )}
      </div>

      {/* Contextual rail — CSS seats it beside the table on very wide screens
          and stacks it below otherwise. On phones the paths open as a sheet
          instead (below), so we don't render them twice. */}
      <div className="enr-rail">
        {selected && !isMobile && (
          <UserPathsPanel
            user={selected}
            courseId={courseId}
            onClose={() => setSelected(null)}
            lang={lang}
            dir={dir}
          />
        )}
        {otherUsers}
      </div>

      {isMobile && selected && (
        <Sheet open dir={dir} ariaLabel={both("User enrolment paths", "مسارات تسجيل المستخدم")} onClose={() => setSelected(null)}>
          <UserPathsPanel
            user={selected}
            courseId={courseId}
            onClose={() => setSelected(null)}
            lang={lang}
            dir={dir}
          />
        </Sheet>
      )}

      <EnrolUserModal
        open={showEnrol}
        courseId={courseId}
        presetUserId={presetUser}
        onClose={() => setShowEnrol(false)}
        onEnrolled={() => {
          setShowEnrol(false);
          load();
          setOtherTick((t) => t + 1);
        }}
      />

      <Dialog
        open={!!confirmUnenrol}
        onClose={() => setConfirmUnenrol(null)}
        dir={dir}
        icon="triangleAlert"
        variant="danger"
        title="Unenrol user?"
        titleAr="إلغاء تسجيل المستخدم؟"
        footer={
          <>
            <button type="button" className="enr-btn" onClick={() => setConfirmUnenrol(null)}>
              <T en="Cancel" ar="إلغاء" />
            </button>
            <button type="button" className="enr-btn enr-btn--danger" onClick={doUnenrol}>
              <Icon name="userMinus" size={15} />
              <T en="Unenrol" ar="إلغاء التسجيل" />
            </button>
          </>
        }
      >
        {confirmUnenrol && <UnenrolBody data={confirmUnenrol} courseName={courseName} />}
      </Dialog>
    </div>
  );
}

function UnenrolBody({ data, courseName }) {
  const { row, path } = data;
  const mm = methodMeta(path.method);
  const others = (row.paths ?? []).filter((p) => p.enrolment_id !== path.enrolment_id);
  const otherActive = others.filter((p) => p.status === "active");
  return (
    <div className="enr-confirm">
      <dl className="enr-confirm__facts">
        <div>
          <dt><T en="User" ar="المستخدم" /></dt>
          <dd>{row.full_name} <span className="enr-user">({row.username})</span></dd>
        </div>
        <div>
          <dt><T en="Course" ar="المقرر" /></dt>
          <dd>{courseName ?? "—"}</dd>
        </div>
        <div>
          <dt><T en="Path" ar="المسار" /></dt>
          <dd>
            <Icon name={mm.icon} size={15} /> <T en={mm.en} ar={mm.ar} />
          </dd>
        </div>
      </dl>
      {path.method === "cohort" && path.status === "active" ? (
        <p className="enr-confirm__note enr-confirm__note--warn">
          <Icon name="triangleAlert" size={16} />
          <T
            en="This path is synced from a cohort — it can't be unenrolled directly (R-COHORT). Suspend it first, or remove the user from the cohort. The server will refuse this action."
            ar="هذا المسار مُزامَن من فوج — لا يمكن إلغاؤه مباشرة. أوقفه أولاً، أو أزل المستخدم من الفوج. سيرفض الخادم هذا الإجراء."
          />
        </p>
      ) : others.length > 0 ? (
        <p className="enr-confirm__note enr-confirm__note--ok">
          <Icon name="info" size={16} />
          <T
            en={`This user has ${others.length} other enrolment path${others.length > 1 ? "s" : ""} here${
              otherActive.length ? " (some still active)" : ""
            } — removing this one may not remove their access.`}
            ar={`لدى هذا المستخدم ${others.length} مسار تسجيل آخر هنا — قد لا يؤدي إلغاء هذا المسار إلى منعه من الوصول.`}
          />
        </p>
      ) : (
        <p className="enr-confirm__note enr-confirm__note--warn">
          <Icon name="triangleAlert" size={16} />
          <T
            en="This appears to be their only path — removing it drops them from the roster and affects course access. Completion records are kept."
            ar="يبدو أنه المسار الوحيد — سيؤدي إلغاؤه إلى إزالته من القائمة والتأثير على الوصول للمقرر. تُحفظ سجلات الإنجاز."
          />
        </p>
      )}
    </div>
  );
}
