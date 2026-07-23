// Permission Checker — the project centrepiece. Builds the real
// POST /api/permissions/check payload (actor_user_id, NOT actor_id) and renders
// exactly what the backend's §17.3 evidence contract returns: a verdict, the
// structured gate evidence (role grants · overrides · prohibits · group scope),
// a side-by-side actor comparison, and the live decision log. No permission
// rule is computed here — the verdict and every reason come from the server.
//
// Identity vs subject (§7): the authenticated PRINCIPAL is the acting user
// (api.js mints its Bearer). The ACTOR field is the SUBJECT being explained —
// inspecting someone other than yourself needs user:viewdetails, which the
// backend enforces (a 403 we surface verbatim, never hide).
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../../api";
import { useActingUser } from "../../context/ActingUser";
import { useLang } from "../../context/Lang";
import Icon from "./icons";
import {
  Avatar,
  Btn,
  Combo,
  EmptyState,
  PermBadge,
  ResultBadge,
  ScopedError,
  SectionCard,
  SkeletonRows,
  Spinner,
  T,
  Tech,
  both,
  pick,
  useAnnounce,
} from "./ui";
import ReasonList from "../common/ReasonList";
import {
  CapabilityOption,
  ContextOption,
  UserOption,
  ctxCourseId,
  findCtx,
  useCatalogs,
  userById,
} from "./data";

const SYSTEM_LABEL_FALLBACK = "system:0";

// ---- verdict card ---------------------------------------------------------
function VerdictCard({ state, result, error, actorName, capability, lang, onRetry }) {
  let tone = "idle";
  let icon = "shieldQuestion";
  let head = pick(lang, "Not checked", "لم يُفحص");
  let sub = pick(lang, "Choose an actor, capability, and context.", "اختر ممثلاً وصلاحية وسياقاً.");
  let ar = null;

  if (state === "loading") {
    tone = "loading";
    icon = "loader";
    head = pick(lang, "Checking permission", "جارٍ فحص الصلاحية");
    sub = null;
  } else if (state === "error") {
    tone = "error";
    icon = "triangleAlert";
    head = pick(lang, "Check failed", "فشل الفحص");
    sub = null;
  } else if (result) {
    const allowed = result.allowed;
    tone = allowed ? "allow" : "deny";
    icon = allowed ? "shieldCheck" : "shieldX";
    head = allowed ? "ALLOWED" : "DENIED";
    ar = allowed ? "مسموح" : "مرفوض";
    if (allowed) {
      sub = result.admin_bypass
        ? pick(lang, "Allowed — site administrator bypass.", "مسموح — تجاوز مدير الموقع.")
        : result.simulated_role
          ? pick(lang, `Allowed while previewing as “${result.simulated_role}”.`, `مسموح أثناء المعاينة كدور «${result.simulated_role}».`)
          : result.supporting_reasons?.[0] ?? pick(lang, "All gates passed.", "اجتاز كل البوابات.");
    } else {
      sub = result.blocking_reasons?.[0] ?? pick(lang, "Blocked.", "محظور.");
    }
  }

  return (
    <div className={`rl-verdict rl-verdict--${tone}`} aria-live="off">
      <div className="rl-verdict__icon">
        <Icon name={icon} size={38} spin={tone === "loading"} />
      </div>
      <div className="rl-verdict__text">
        <div className="rl-verdict__head">
          <span>{head}</span>
          {ar && (
            <span className="rl-ar" lang="ar">
              {ar}
            </span>
          )}
        </div>
        {tone === "loading" && actorName && (
          <div className="rl-verdict__sub">
            {pick(lang, "Evaluating for", "يتم التقييم لـ")} {actorName}…
          </div>
        )}
        {sub && <div className="rl-verdict__sub">{sub}</div>}
        {state === "error" && (
          <div className="rl-verdict__err">
            <ScopedError error={error} onRetry={onRetry} lang={lang} compact />
          </div>
        )}
        {result && capability && (
          <div className="rl-verdict__cap">
            <Tech>{capability}</Tech>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- one expandable evidence row ------------------------------------------
function EvidenceRow({ icon, tone, labelEn, labelAr, summary, detail, dominant }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(detail);
  return (
    <div className={`rl-ev rl-ev--${tone} ${dominant ? "rl-ev--dominant" : ""}`}>
      <div className="rl-ev__main">
        <span className="rl-ev__ic">
          <Icon name={icon} size={16} />
        </span>
        <span className="rl-ev__label">
          <T en={labelEn} ar={labelAr} />
        </span>
        <span className="rl-ev__summary">{summary}</span>
        {hasDetail && (
          <button
            type="button"
            className="rl-ev__toggle"
            aria-expanded={open}
            aria-label={both(open ? "Hide details" : "Show details", open ? "إخفاء التفاصيل" : "عرض التفاصيل")}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? "chevronUp" : "chevronDown"} size={16} />
          </button>
        )}
      </div>
      {hasDetail && open && <div className="rl-ev__detail">{detail}</div>}
    </div>
  );
}

// ---- evidence panel (pure render of the real response) --------------------
function EvidencePanel({ result, lang }) {
  const rootLabel = result.contexts_considered?.[result.contexts_considered.length - 1] ?? SYSTEM_LABEL_FALLBACK;
  const capEntries = Object.entries(result.capability_values ?? {});
  const grants = capEntries.filter(([, v]) => v.value === "allow");
  const overrides = capEntries.filter(([, v]) => v.decided_at && v.decided_at !== rootLabel);
  const prohibits = result.prohibits_found ?? [];
  const gs = result.group_scope ?? {};

  // context path — render root→leaf (contexts_considered is leaf→root), LTR.
  const ctxChain = [...(result.contexts_considered ?? [])].reverse();

  const rolesTable = (
    <table className="rl-ev-table">
      <thead>
        <tr>
          <th scope="col">{pick(lang, "Role", "الدور")}</th>
          <th scope="col">{pick(lang, "Context", "السياق")}</th>
          <th scope="col">{pick(lang, "Provenance", "المصدر")}</th>
          <th scope="col">{pick(lang, "This capability", "هذه الصلاحية")}</th>
        </tr>
      </thead>
      <tbody>
        {(result.roles_considered ?? []).map((r, i) => {
          const cv = result.capability_values?.[r.role];
          return (
            <tr key={i}>
              <td>{r.role}</td>
              <td>
                <Tech>{r.context ?? "—"}</Tech>
              </td>
              <td className="rl-ev-table__prov">{r.provenance || "manual"}</td>
              <td>
                {cv ? (
                  <span className="rl-ev-table__val">
                    <PermBadge permission={cv.value} lang={lang} />
                    {cv.decided_at && (
                      <span className="rl-muted">
                        @ <Tech>{cv.decided_at}</Tech>
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="rl-muted">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // group scope summary
  let gsSummary;
  let gsTone = "info";
  if (gs.mode == null) {
    gsSummary = pick(lang, "Not applicable", "غير منطبق");
    gsTone = "neutral";
  } else if (gs.access_all_groups) {
    gsSummary = pick(lang, "All groups (accessallgroups)", "كل المجموعات");
  } else if (gs.mode !== "separate") {
    gsSummary = pick(lang, `No separation (mode: ${gs.mode})`, `دون فصل (النمط: ${gs.mode})`);
  } else if (gs.shared === true) {
    gsSummary = pick(lang, "Shares a group with target", "يشترك في مجموعة مع الهدف");
  } else if (gs.shared === false) {
    gsSummary = pick(lang, "No common group", "لا مجموعة مشتركة");
    gsTone = "deny";
  } else {
    gsSummary = pick(lang, "Group-scoped", "محدد بالمجموعة");
  }

  const enrol = result.enrolment_paths ?? [];

  return (
    <div className="rl-evidence">
      <EvidenceRow
        icon="folderTree"
        tone="neutral"
        labelEn="Context path"
        labelAr="مسار السياق"
        summary={
          <span className="rl-ev-path" dir="ltr">
            {ctxChain.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="rl-ev-path__sep"> › </span>}
                <Tech>{c}</Tech>
              </span>
            ))}
          </span>
        }
      />

      <EvidenceRow
        icon="circleCheck"
        tone={grants.length ? "allow" : "neutral"}
        labelEn="Role grants"
        labelAr="منح الأدوار"
        summary={
          grants.length
            ? grants.map(([r]) => r).join(", ")
            : pick(lang, "No role grants this capability", "لا دور يمنح هذه الصلاحية")
        }
        detail={rolesTable}
      />

      <EvidenceRow
        icon="cornerDownRight"
        tone={overrides.length ? "prevent" : "neutral"}
        labelEn="Overrides"
        labelAr="التجاوزات"
        summary={
          overrides.length ? (
            <span className="rl-ev-chips">
              {overrides.map(([r, v]) => (
                <span key={r} className="rl-ev-chip">
                  {r}: <PermBadge permission={v.value} lang={lang} /> @ <Tech>{v.decided_at}</Tech>
                </span>
              ))}
            </span>
          ) : (
            <span className="rl-muted">{pick(lang, "None", "لا يوجد")}</span>
          )
        }
      />

      <EvidenceRow
        icon="ban"
        tone={prohibits.length ? "prohibit" : "neutral"}
        dominant={prohibits.length > 0 && !result.allowed}
        labelEn="Prohibits"
        labelAr="الحظر"
        summary={
          prohibits.length ? (
            <span className="rl-ev-chips">
              {prohibits.map((p, i) => (
                <span key={i} className="rl-ev-chip rl-ev-chip--danger">
                  {p.role} @ <Tech>{p.context}</Tech>
                </span>
              ))}
            </span>
          ) : (
            <span className="rl-muted">{pick(lang, "None", "لا يوجد")}</span>
          )
        }
      />

      <EvidenceRow
        icon="users"
        tone={gsTone}
        labelEn="Group scope"
        labelAr="نطاق المجموعة"
        summary={gsSummary}
        detail={
          gs.mode != null ? (
            <dl className="rl-ev-dl">
              <div>
                <dt>{pick(lang, "Mode", "النمط")}</dt>
                <dd>
                  <Tech>{gs.mode}</Tech>
                </dd>
              </div>
              <div>
                <dt>{pick(lang, "Actor groups", "مجموعات الممثل")}</dt>
                <dd>{gs.actor_groups?.length ? gs.actor_groups.join(", ") : pick(lang, "none", "لا شيء")}</dd>
              </div>
              <div>
                <dt>{pick(lang, "Target groups", "مجموعات الهدف")}</dt>
                <dd>{gs.target_groups?.length ? gs.target_groups.join(", ") : pick(lang, "none", "لا شيء")}</dd>
              </div>
              <div>
                <dt>accessallgroups</dt>
                <dd>{gs.access_all_groups ? pick(lang, "yes", "نعم") : pick(lang, "no", "لا")}</dd>
              </div>
            </dl>
          ) : null
        }
      />

      {result.simulated_role && (
        <EvidenceRow
          icon="userRound"
          tone="info"
          labelEn="Simulated role"
          labelAr="دور محاكى"
          summary={
            <span>
              {result.simulated_role}
              <span className="rl-muted"> · {pick(lang, "admin bypass suppressed", "تعطيل تجاوز المدير")}</span>
            </span>
          }
        />
      )}

      {result.admin_bypass && (
        <EvidenceRow
          icon="shieldCheck"
          tone="info"
          labelEn="Administrator bypass"
          labelAr="تجاوز المدير"
          summary={pick(lang, "Site administrator — all checks pass", "مدير الموقع — تُجتاز كل الفحوص")}
        />
      )}

      {enrol.length > 0 && (
        <EvidenceRow
          icon="gitBranch"
          tone="allow"
          labelEn="Enrolment paths"
          labelAr="مسارات التسجيل"
          summary={`${enrol.length} ${pick(lang, "active path(s)", "مسار نشط")}`}
          detail={
            <ul className="rl-ev-list">
              {enrol.map((p, i) => (
                <li key={i}>
                  <Tech>{p.kind ?? p.method ?? "path"}</Tech>
                  {p.status ? ` — ${p.status}` : ""}
                </li>
              ))}
            </ul>
          }
        />
      )}

      {/* verbatim backend "why" — never rephrased or swallowed */}
      {result.blocking_reasons?.length > 0 && (
        <ReasonList reasons={result.blocking_reasons} tone="error" title={pick(lang, "Blocking reasons", "أسباب الحظر")} />
      )}
      {result.supporting_reasons?.length > 0 && (
        <ReasonList reasons={result.supporting_reasons} tone="ok" title={pick(lang, "Supporting reasons", "أسباب داعمة")} />
      )}
    </div>
  );
}

// ---- one comparison column -------------------------------------------------
function CompareColumn({ name, roleLabel, col, loading, lang }) {
  return (
    <div className="rl-compare__col">
      <div className="rl-compare__id">
        <Avatar name={name} size={30} />
        <div>
          <div className="rl-compare__name">{name}</div>
          {roleLabel && <div className="rl-compare__role">{roleLabel}</div>}
        </div>
      </div>
      {loading ? (
        <Spinner lang={lang} />
      ) : col?.error ? (
        <ScopedError error={col.error} lang={lang} compact />
      ) : col?.result ? (
        <>
          <ResultBadge allowed={col.result.allowed} lang={lang} />
          <p className="rl-compare__reason">
            {col.result.allowed
              ? col.result.supporting_reasons?.slice(-1)[0]
              : col.result.blocking_reasons?.[0]}
          </p>
        </>
      ) : null}
    </div>
  );
}

export default function PermissionChecker({ replay, onReplayConsumed }) {
  const { actingUser } = useActingUser();
  const { lang } = useLang();
  const { users, roles, contexts, capabilities, courses, loading: catLoading, error: catError, reload } =
    useCatalogs();

  const [actorId, setActorId] = useState(null);
  const [actorTouched, setActorTouched] = useState(false);
  const [capability, setCapability] = useState(null);
  const [contextId, setContextId] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [activityId, setActivityId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [simulateRoleId, setSimulateRoleId] = useState(null);
  const [action, setAction] = useState("");
  const [advanced, setAdvanced] = useState(false);

  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [compareBId, setCompareBId] = useState(null);
  const [compare, setCompare] = useState(null); // {a, b}
  const [comparing, setComparing] = useState(false);

  const [decisions, setDecisions] = useState([]);
  const seqRef = useRef(0);
  const [live, announce] = useAnnounce();

  // Defaults once catalogues land.
  useEffect(() => {
    if (capability == null && capabilities.length) {
      setCapability(capabilities.find((c) => c.name === "course:view")?.name ?? capabilities[0].name);
    }
    if (contextId == null && contexts.length) setContextId(contexts[0].id);
  }, [capabilities, contexts, capability, contextId]);

  // Actor defaults to the acting principal and follows it until the user picks.
  useEffect(() => {
    if (!actorTouched && actingUser) setActorId(actingUser.id);
  }, [actingUser, actorTouched]);

  // Activities for the selected context's course; reset a stale activity.
  useEffect(() => {
    const ctx = findCtx(contexts, contextId);
    const courseId = ctxCourseId(ctx, contexts);
    if (courseId == null) {
      setActivities([]);
      setActivityId(null);
      return;
    }
    let live2 = true;
    apiGet(`/api/courses/${courseId}/activities`)
      .then((list) => {
        if (!live2) return;
        setActivities(list);
        setActivityId((cur) => (list.some((a) => a.id === cur) ? cur : null));
      })
      .catch(() => live2 && setActivities([]));
    return () => {
      live2 = false;
    };
  }, [contextId, contexts]);

  const loadDecisions = useCallback(() => {
    apiGet("/api/permissions/decisions?limit=6")
      .then(setDecisions)
      .catch(() => setDecisions([]));
  }, []);
  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  const buildPayload = useCallback(
    (overrides = {}) => {
      const p = {
        actor_user_id: overrides.actorId ?? actorId,
        capability: overrides.capability ?? capability,
        context_id: overrides.contextId ?? contextId,
      };
      const target = overrides.targetUserId ?? targetUserId;
      const act = overrides.activityId ?? activityId;
      const sim = overrides.simulateRoleId ?? simulateRoleId;
      const actn = (overrides.action ?? action).trim?.() ?? "";
      if (target) p.target_user_id = target;
      if (act) p.activity_id = act;
      if (sim) p.simulate_role_id = sim;
      if (actn) p.action = actn;
      return p;
    },
    [actorId, capability, contextId, targetUserId, activityId, simulateRoleId, action],
  );

  const submit = useCallback(
    (payload) => {
      const body = payload ?? buildPayload();
      if (!body.actor_user_id || !body.capability || !body.context_id) return;
      const seq = ++seqRef.current;
      setState("loading");
      setError(null);
      apiPost("/api/permissions/check", body)
        .then((res) => {
          if (seq !== seqRef.current) return; // stale — a newer check superseded
          setResult(res);
          setState("done");
          const who = userById(users, body.actor_user_id)?.full_name ?? `#${body.actor_user_id}`;
          announce(`${res.allowed ? "Allowed" : "Denied"}: ${body.capability} for ${who}`);
          loadDecisions();
        })
        .catch((e) => {
          if (seq !== seqRef.current) return;
          setError(e);
          setState("error");
          announce(pick(lang, "Check failed", "فشل الفحص"));
        });
    },
    [buildPayload, users, announce, loadDecisions, lang],
  );

  // Replay from the Decision Log: prefill the stored inputs and re-run.
  useEffect(() => {
    if (!replay) return;
    setActorId(replay.actor_user_id);
    setActorTouched(true);
    setCapability(replay.capability);
    setContextId(replay.context_id);
    setTargetUserId(replay.target_user_id ?? null);
    setActivityId(null);
    setSimulateRoleId(null);
    submit({
      actor_user_id: replay.actor_user_id,
      capability: replay.capability,
      context_id: replay.context_id,
      ...(replay.target_user_id ? { target_user_id: replay.target_user_id } : {}),
    });
    onReplayConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay?.nonce]);

  function runCompare() {
    if (!compareBId) return;
    setComparing(true);
    setCompare(null);
    const shared = { capability, context_id: contextId };
    if (targetUserId) shared.target_user_id = targetUserId;
    if (activityId) shared.activity_id = activityId;
    const call = (id) =>
      apiPost("/api/permissions/check", { actor_user_id: id, ...shared })
        .then((result) => ({ result }))
        .catch((error) => ({ error }));
    Promise.all([call(actorId), call(compareBId)]).then(([a, b]) => {
      setCompare({ a, b });
      setComparing(false);
      loadDecisions();
    });
  }

  const actorName = userById(users, actorId)?.full_name;
  const principalName = actingUser?.full_name;
  const isOtherSubject = actorId != null && actingUser && actorId !== actingUser.id;
  const canCheck = actorId && capability && contextId && state !== "loading";
  const compareBName = userById(users, compareBId)?.full_name ?? pick(lang, "Actor B", "الممثل ب");

  if (catError) {
    return (
      <SectionCard icon="shieldSearch" title="Permission checker" titleAr="فاحص الصلاحيات">
        <ScopedError error={catError} onRetry={reload} lang={lang} />
      </SectionCard>
    );
  }

  return (
    <div className="rl-checker">
      {live}

      {/* ---- check form ---- */}
      <SectionCard icon="shieldSearch" title="Permission checker" titleAr="فاحص الصلاحيات">
        <p className="rl-lead">
          <T
            en="Ask “can this person do this, here — and why?”. The verdict and every reason come from the backend, gate by gate."
            ar="اسأل: هل يستطيع هذا الشخص فعل ذلك هنا — ولماذا؟ النتيجة وكل سبب يأتيان من الخادم، بوابةً بوابة."
          />
        </p>

        <div className="rl-formgrid">
          <label className="rl-field">
            <span className="rl-field__label">
              <Icon name="userRound" size={14} />
              <T en="Actor" ar="الممثل" />
              <span
                className="rl-field__hint"
                title={pick(lang, "The user whose permission is being evaluated.", "المستخدم الذي تُقيَّم صلاحيته.")}
              >
                <Icon name="info" size={13} />
              </span>
            </span>
            <Combo
              items={users}
              value={actorId}
              onChange={(id) => {
                setActorId(id);
                setActorTouched(true);
              }}
              itemKey={(u) => u.id}
              itemLabel={(u) => u.full_name}
              itemSearch={(u) => `${u.full_name} ${u.username}`}
              renderItem={(u) => <UserOption u={u} lang={lang} />}
              leadingIcon="userRound"
              ariaLabel={both("Actor", "الممثل")}
              placeholder={pick(lang, "Select actor", "اختر ممثلاً")}
              loading={catLoading}
              lang={lang}
              invalid={!actorId}
            />
          </label>

          <label className="rl-field">
            <span className="rl-field__label">
              <Icon name="shield" size={14} />
              <T en="Capability" ar="الصلاحية" />
            </span>
            <Combo
              items={capabilities}
              value={capability}
              onChange={(name) => setCapability(name)}
              itemKey={(c) => c.name}
              itemLabel={(c) => c.name}
              itemSearch={(c) => `${c.name} ${c.component} ${c.cap_type}`}
              renderItem={(c) => <CapabilityOption c={c} lang={lang} />}
              leadingIcon="shield"
              ariaLabel={both("Capability", "الصلاحية")}
              placeholder={pick(lang, "Select capability", "اختر صلاحية")}
              loading={catLoading}
              lang={lang}
              invalid={!capability}
            />
          </label>

          <label className="rl-field">
            <span className="rl-field__label">
              <Icon name="folder" size={14} />
              <T en="Context" ar="السياق" />
            </span>
            <Combo
              items={contexts}
              value={contextId}
              onChange={(id) => setContextId(id)}
              itemKey={(c) => c.id}
              itemLabel={(c) => c.label}
              itemSearch={(c) => `${c.label} ${c.level} ${c.path}`}
              renderItem={(c) => <ContextOption ctx={c} courses={courses} lang={lang} />}
              leadingIcon="folder"
              ariaLabel={both("Context", "السياق")}
              placeholder={pick(lang, "Select context", "اختر سياقاً")}
              loading={catLoading}
              lang={lang}
              invalid={!contextId}
            />
          </label>

          <label className="rl-field">
            <span className="rl-field__label">
              <Icon name="userRoundSearch" size={14} />
              <T en="Target user" ar="المستخدم المستهدف" />
              <span className="rl-field__opt">({pick(lang, "optional", "اختياري")})</span>
            </span>
            <Combo
              items={users}
              value={targetUserId}
              onChange={(id) => setTargetUserId(id)}
              itemKey={(u) => u.id}
              itemLabel={(u) => u.full_name}
              itemSearch={(u) => `${u.full_name} ${u.username}`}
              renderItem={(u) => <UserOption u={u} lang={lang} />}
              leadingIcon="userRoundSearch"
              ariaLabel={both("Target user (optional)", "المستخدم المستهدف (اختياري)")}
              placeholder={pick(lang, "Select user (optional)", "اختر مستخدماً (اختياري)")}
              clearable
              lang={lang}
            />
          </label>

          <label className="rl-field">
            <span className="rl-field__label">
              <Icon name="activity" size={14} />
              <T en="Activity" ar="النشاط" />
              <span className="rl-field__opt">({pick(lang, "optional", "اختياري")})</span>
            </span>
            <Combo
              items={activities}
              value={activityId}
              onChange={(id) => setActivityId(id)}
              itemKey={(a) => a.id}
              itemLabel={(a) => a.name}
              itemSearch={(a) => `${a.name} ${a.activity_type}`}
              renderItem={(a) => (
                <span className="rl-opt">
                  <span className="rl-opt__main">{a.name}</span>
                  <span className="rl-opt__sec">
                    <span>{a.activity_type}</span>
                    <span>·</span>
                    <span>{pick(lang, "group mode", "نمط المجموعة")}: {String(a.group_mode ?? "—")}</span>
                  </span>
                </span>
              )}
              leadingIcon="activity"
              ariaLabel={both("Activity (optional)", "النشاط (اختياري)")}
              placeholder={
                activities.length
                  ? pick(lang, "Select activity (optional)", "اختر نشاطاً (اختياري)")
                  : pick(lang, "No activities in this context", "لا أنشطة في هذا السياق")
              }
              clearable
              disabled={activities.length === 0}
              lang={lang}
            />
          </label>

          <div className="rl-field rl-field--check">
            <Btn
              variant="primary"
              icon={state === "loading" ? "loader" : "search"}
              disabled={!canCheck}
              onClick={() => submit()}
              aria-label={both("Check", "تحقق")}
            >
              {state === "loading" ? pick(lang, "Checking", "جارٍ التحقق") : pick(lang, "Check", "تحقق")}
            </Btn>
          </div>
        </div>

        {/* advanced: simulate role + action (real payload fields) */}
        <div className="rl-adv">
          <button
            type="button"
            className="rl-adv__toggle"
            aria-expanded={advanced}
            onClick={() => setAdvanced((a) => !a)}
          >
            <Icon name={advanced ? "chevronUp" : "chevronDown"} size={15} />
            <T en="Advanced (simulate role · action)" ar="متقدم (محاكاة دور · إجراء)" />
          </button>
          {advanced && (
            <div className="rl-adv__row">
              <label className="rl-field">
                <span className="rl-field__label">
                  <Icon name="userRound" size={14} />
                  <T en="Simulate role" ar="محاكاة دور" />
                </span>
                <select
                  className="rl-select"
                  value={simulateRoleId ?? ""}
                  onChange={(e) => setSimulateRoleId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{pick(lang, "— none —", "— لا شيء —")}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.short_name})
                    </option>
                  ))}
                </select>
              </label>
              <label className="rl-field">
                <span className="rl-field__label">
                  <Icon name="alignLeft" size={14} />
                  <T en="Action" ar="الإجراء" />
                </span>
                <input
                  className="rl-input"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder={pick(lang, "optional action label", "وسم إجراء اختياري")}
                  dir="ltr"
                />
              </label>
            </div>
          )}
        </div>

        {/* principal vs subject honesty note */}
        <div className="rl-idnote">
          <Icon name="info" size={14} />
          <span>
            {pick(lang, "Signed in as", "مسجّل الدخول كـ")} <strong>{principalName ?? "—"}</strong>
            {isOtherSubject && (
              <>
                {" · "}
                {pick(lang, "checking permissions for", "فحص الصلاحيات لـ")} <strong>{actorName ?? "—"}</strong>
                {" — "}
                {pick(lang, "inspecting another user requires ", "فحص مستخدم آخر يتطلب ")}
                <Tech>user:viewdetails</Tech>
                {pick(lang, " (enforced by the backend).", " (يفرضه الخادم).")}
              </>
            )}
          </span>
        </div>
      </SectionCard>

      {/* ---- verdict + evidence ---- */}
      <div className="rl-result-grid">
        <SectionCard icon="shieldCheck" tone="green" title="Verdict" titleAr="النتيجة">
          <VerdictCard
            state={state}
            result={result}
            error={error}
            actorName={actorName}
            capability={result ? capability : null}
            lang={lang}
            onRetry={() => submit()}
          />
        </SectionCard>

        <SectionCard icon="folderTree" tone="blue" title="Evidence" titleAr="الأدلة">
          {state === "loading" ? (
            <SkeletonRows lines={5} />
          ) : result ? (
            <EvidencePanel result={result} lang={lang} />
          ) : state === "error" ? (
            <EmptyState icon="triangleAlert" en="The check did not complete." ar="لم يكتمل الفحص." compact />
          ) : (
            <EmptyState
              icon="fileSearch"
              en="No evidence yet."
              ar="لا أدلة بعد."
              hint={pick(lang, "Run a check to see the gate-by-gate evidence.", "شغّل فحصاً لعرض الأدلة بوابةً بوابة.")}
              compact
            />
          )}
        </SectionCard>
      </div>

      {/* ---- side comparison ---- */}
      <SectionCard
        icon="scale"
        tone="blue"
        title="Side comparison"
        titleAr="مقارنة جانبية"
        actions={
          <div className="rl-compare__pick">
            <Combo
              items={users.filter((u) => u.id !== actorId)}
              value={compareBId}
              onChange={(id) => setCompareBId(id)}
              itemKey={(u) => u.id}
              itemLabel={(u) => u.full_name}
              itemSearch={(u) => `${u.full_name} ${u.username}`}
              renderItem={(u) => <UserOption u={u} lang={lang} />}
              leadingIcon="userRound"
              ariaLabel={both("Compare with", "قارن مع")}
              placeholder={pick(lang, "Compare with…", "قارن مع…")}
              lang={lang}
            />
            <Btn variant="outline" icon="scale" size="sm" disabled={!compareBId || !capability || !contextId || comparing} onClick={runCompare}>
              {comparing ? pick(lang, "Comparing", "جارٍ المقارنة") : pick(lang, "Compare actors", "مقارنة الممثلين")}
            </Btn>
          </div>
        }
      >
        {compare || comparing ? (
          <div className="rl-compare">
            <CompareColumn name={actorName ?? pick(lang, "Actor A", "الممثل أ")} col={compare?.a} loading={comparing} lang={lang} />
            <div className="rl-compare__vs" aria-hidden="true">
              <Icon name="arrowLeftRight" size={18} />
            </div>
            <CompareColumn name={compareBName} col={compare?.b} loading={comparing} lang={lang} />
          </div>
        ) : (
          <EmptyState
            icon="scale"
            en="Compare two actors on the same capability and context."
            ar="قارن ممثلَين على الصلاحية والسياق نفسيهما."
            hint={pick(lang, "Real checks — each subject is authorized independently.", "فحوص حقيقية — كل موضوع يُصرَّح له بشكل مستقل.")}
            compact
          />
        )}
      </SectionCard>

      {/* ---- recent decision log ---- */}
      <SectionCard icon="clipboardClock" tone="orange" title="Recent decision log" titleAr="سجل القرارات الأخيرة">
        {decisions.length === 0 ? (
          <EmptyState icon="clipboardClock" en="No permission decisions recorded yet." ar="لم تُسجَّل أي قرارات بعد." compact />
        ) : (
          <ul className="rl-reclog">
            {decisions.map((d) => {
              const who = userById(users, d.actor_id)?.full_name ?? `#${d.actor_id}`;
              const ctx = findCtx(contexts, d.context_id);
              return (
                <li key={d.id} className="rl-reclog__row">
                  <ResultBadge allowed={d.allowed} size={13} lang={lang} />
                  <span className="rl-reclog__cap">
                    <Tech>{d.capability}</Tech>
                  </span>
                  <span className="rl-reclog__who">{who}</span>
                  <span className="rl-reclog__ctx">
                    <Tech>{ctx?.label ?? `ctx:${d.context_id}`}</Tech>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
