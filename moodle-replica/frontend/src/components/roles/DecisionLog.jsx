// Decision Log tab — the append-only audit of every /check, newest first, from
// GET /api/permissions/decisions. A row stores {id, actor_id, capability,
// context_id, target_id, allowed, reasons:{full §17.3 evidence}, decided_at}.
// The result comes from `allowed` (never colour alone). Actor + limit are
// SERVER filters; result / capability / context are honest IN-VIEW filters over
// the fetched page (we never claim a server-side total we don't have).
// A row can be replayed into the Permission Checker with its stored inputs
// (activity / simulated role are NOT recorded — noted in the details).
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "../../api";
import { useLang } from "../../context/Lang";
import Icon from "./icons";
import {
  Btn,
  Combo,
  EmptyState,
  Pagination,
  ResultBadge,
  ScopedError,
  SectionCard,
  SkeletonRows,
  T,
  Tech,
  both,
  pick,
} from "./ui";
import ReasonList from "../common/ReasonList";
import { UserOption, findCtx, useCatalogs, userById } from "./data";

const RESULTS = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "allow", en: "Allowed", ar: "مسموح" },
  { key: "deny", en: "Denied", ar: "مرفوض" },
];
const LIMITS = [25, 50, 100, 200];
const PAGE_SIZE = 10;

function relTime(iso, lang) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  const ar = lang === "ar";
  if (s < 45) return ar ? "الآن" : "just now";
  const m = Math.round(s / 60);
  if (m < 60) return ar ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return ar ? `قبل ${h} س` : `${h}h ago`;
  return ar ? `قبل ${Math.round(h / 24)} ي` : `${Math.round(h / 24)}d ago`;
}

function DecisionDetails({ d, users, lang }) {
  const r = d.reasons ?? {};
  const gs = r.group_scope ?? {};
  const target = d.target_id != null ? userById(users, d.target_id)?.full_name ?? `#${d.target_id}` : null;
  return (
    <div className="rl-decdetail">
      {r.blocking_reasons?.length > 0 && (
        <ReasonList reasons={r.blocking_reasons} tone="error" title={pick(lang, "Blocking reasons", "أسباب الحظر")} />
      )}
      {r.supporting_reasons?.length > 0 && (
        <ReasonList reasons={r.supporting_reasons} tone="ok" title={pick(lang, "Supporting reasons", "أسباب داعمة")} />
      )}
      <dl className="rl-ev-dl rl-ev-dl--wide">
        {r.roles_considered?.length > 0 && (
          <div>
            <dt>{pick(lang, "Roles", "الأدوار")}</dt>
            <dd>{r.roles_considered.map((x) => x.role).join(", ")}</dd>
          </div>
        )}
        {r.prohibits_found?.length > 0 && (
          <div>
            <dt>{pick(lang, "Prohibits", "الحظر")}</dt>
            <dd>
              {r.prohibits_found.map((p, i) => (
                <span key={i}>
                  {p.role} @ <Tech>{p.context}</Tech>{" "}
                </span>
              ))}
            </dd>
          </div>
        )}
        {gs.mode != null && (
          <div>
            <dt>{pick(lang, "Group scope", "نطاق المجموعة")}</dt>
            <dd>
              <Tech>{gs.mode}</Tech>
              {gs.access_all_groups ? " · accessallgroups" : ""}
              {gs.shared === true ? ` · ${pick(lang, "shared group", "مجموعة مشتركة")}` : ""}
              {gs.shared === false ? ` · ${pick(lang, "no common group", "لا مجموعة مشتركة")}` : ""}
            </dd>
          </div>
        )}
        {target && (
          <div>
            <dt>{pick(lang, "Target", "الهدف")}</dt>
            <dd>{target}</dd>
          </div>
        )}
        {r.admin_bypass && (
          <div>
            <dt>{pick(lang, "Admin", "المدير")}</dt>
            <dd>{pick(lang, "administrator bypass", "تجاوز المدير")}</dd>
          </div>
        )}
        {r.simulated_role && (
          <div>
            <dt>{pick(lang, "Simulated", "محاكى")}</dt>
            <dd>{r.simulated_role}</dd>
          </div>
        )}
      </dl>
      <p className="rl-decdetail__note">
        <Icon name="info" size={12} />
        {pick(
          lang,
          "Replay reuses actor · capability · context · target. Activity and simulated role are not recorded.",
          "الإعادة تستخدم الممثل · الصلاحية · السياق · الهدف. النشاط والدور المحاكى غير مسجّلين.",
        )}
      </p>
    </div>
  );
}

export default function DecisionLog({ onReplay }) {
  const { lang } = useLang();
  const { users, contexts } = useCatalogs();

  const [actorId, setActorId] = useState(null);
  const [limit, setLimit] = useState(50);
  const [result, setResult] = useState("all");
  const [capQuery, setCapQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (actorId != null) q.set("actor_id", String(actorId));
    q.set("limit", String(limit));
    apiGet(`/api/permissions/decisions?${q.toString()}`)
      .then((data) => live && setRows(Array.isArray(data) ? data : []))
      .catch((e) => live && setError(e))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [actorId, limit, tick]);

  const filtered = useMemo(() => {
    const q = capQuery.trim().toLowerCase();
    return rows.filter((d) => {
      if (result === "allow" && !d.allowed) return false;
      if (result === "deny" && d.allowed) return false;
      if (q && !String(d.capability).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, result, capQuery]);

  useEffect(() => setPage(1), [actorId, limit, result, capQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pageRows = filtered.slice(from - 1, to);

  const replay = useCallback(
    (d) => {
      onReplay?.({
        actor_user_id: d.actor_id,
        capability: d.capability,
        context_id: d.context_id,
        target_user_id: d.target_id ?? null,
        nonce: Date.now(),
      });
    },
    [onReplay],
  );

  const clientFiltered = result !== "all" || capQuery.trim() !== "";

  return (
    <SectionCard
      icon="clipboardClock"
      title="Decision log"
      titleAr="سجل القرارات"
      actions={
        <Btn variant="ghost" size="sm" icon="refreshCw" onClick={() => setTick((t) => t + 1)}>
          {pick(lang, "Refresh", "تحديث")}
        </Btn>
      }
    >
      <div className="rl-logfilters">
        <label className="rl-field">
          <span className="rl-field__label">
            <Icon name="userRound" size={14} />
            <T en="Actor" ar="الممثل" />
            <span className="rl-field__opt">({pick(lang, "server", "خادم")})</span>
          </span>
          <Combo
            items={users}
            value={actorId}
            onChange={(id) => setActorId(id)}
            itemKey={(u) => u.id}
            itemLabel={(u) => u.full_name}
            itemSearch={(u) => `${u.full_name} ${u.username}`}
            renderItem={(u) => <UserOption u={u} lang={lang} />}
            leadingIcon="userRound"
            ariaLabel={both("Filter by actor", "تصفية حسب الممثل")}
            placeholder={pick(lang, "Any actor", "أي ممثل")}
            clearable
            lang={lang}
          />
        </label>

        <div className="rl-field">
          <span className="rl-field__label">
            <Icon name="filter" size={14} />
            <T en="Result" ar="النتيجة" />
          </span>
          <div className="rl-filterchips" role="group" aria-label={both("Filter by result", "تصفية حسب النتيجة")}>
            {RESULTS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`rl-filterchip ${result === r.key ? "rl-filterchip--on" : ""}`}
                aria-pressed={result === r.key}
                onClick={() => setResult(r.key)}
              >
                {pick(lang, r.en, r.ar)}
              </button>
            ))}
          </div>
        </div>

        <label className="rl-field">
          <span className="rl-field__label">
            <Icon name="search" size={14} />
            <T en="Capability" ar="الصلاحية" />
          </span>
          <div className="rl-searchbox">
            <Icon name="search" size={15} className="rl-searchbox__ic" />
            <input
              className="rl-input rl-input--search"
              value={capQuery}
              onChange={(e) => setCapQuery(e.target.value)}
              placeholder={pick(lang, "search capability", "بحث في الصلاحيات")}
              dir="ltr"
              aria-label={both("Search capability", "بحث في الصلاحيات")}
            />
          </div>
        </label>

        <label className="rl-field rl-field--narrow">
          <span className="rl-field__label">
            <Icon name="clipboardList" size={14} />
            <T en="Fetch" ar="جلب" />
          </span>
          <select
            className="rl-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label={both("Rows to fetch", "عدد الصفوف")}
          >
            {LIMITS.map((n) => (
              <option key={n} value={n}>
                {pick(lang, `last ${n}`, `آخر ${n}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {clientFiltered && !loading && !error && (
        <p className="rl-scopeline">
          <Icon name="info" size={13} />
          {pick(
            lang,
            `Result / capability filters apply to the fetched ${rows.length} rows only (in-view).`,
            `تصفية النتيجة / الصلاحية تنطبق على الصفوف المجلوبة (${rows.length}) فقط.`,
          )}
        </p>
      )}

      {error ? (
        <ScopedError error={error} onRetry={() => setTick((t) => t + 1)} lang={lang} />
      ) : loading ? (
        <SkeletonRows lines={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="clipboardClock"
          en="No permission decisions have been recorded."
          ar="لم تُسجَّل أي قرارات صلاحيات."
          hint={pick(lang, "Run a check in the Permission Checker.", "شغّل فحصاً في فاحص الصلاحيات.")}
        />
      ) : (
        <>
          <div className="rl-tablewrap rl-tablewrap--log">
            <table className="rl-table rl-table--log">
              <thead>
                <tr>
                  <th scope="col">{pick(lang, "Time", "الوقت")}</th>
                  <th scope="col">{pick(lang, "Actor", "الممثل")}</th>
                  <th scope="col">{pick(lang, "Capability", "الصلاحية")}</th>
                  <th scope="col">{pick(lang, "Context", "السياق")}</th>
                  <th scope="col">{pick(lang, "Target", "الهدف")}</th>
                  <th scope="col">{pick(lang, "Result", "النتيجة")}</th>
                  <th scope="col" className="rl-th-actions">
                    {pick(lang, "Details", "التفاصيل")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((d) => {
                  const who = userById(users, d.actor_id)?.full_name ?? `#${d.actor_id}`;
                  const ctx = findCtx(contexts, d.context_id);
                  const target = d.target_id != null ? userById(users, d.target_id)?.full_name ?? `#${d.target_id}` : null;
                  const open = expanded === d.id;
                  return (
                    <Fragment key={d.id}>
                      <tr className={open ? "rl-row--open" : ""}>
                        <td title={new Date(d.decided_at).toLocaleString()}>{relTime(d.decided_at, lang)}</td>
                        <td>{who}</td>
                        <td>
                          <Tech>{d.capability}</Tech>
                        </td>
                        <td>
                          <Tech>{ctx?.label ?? `ctx:${d.context_id}`}</Tech>
                        </td>
                        <td>{target ?? <span className="rl-muted">—</span>}</td>
                        <td>
                          <ResultBadge allowed={d.allowed} size={13} lang={lang} />
                        </td>
                        <td>
                          <div className="rl-rowactions">
                            <button
                              type="button"
                              className="rl-iconbtn"
                              aria-expanded={open}
                              aria-label={both("Toggle evidence", "تبديل الأدلة")}
                              onClick={() => setExpanded(open ? null : d.id)}
                            >
                              <Icon name={open ? "chevronUp" : "chevronDown"} size={16} />
                            </button>
                            <button
                              type="button"
                              className="rl-iconbtn"
                              aria-label={both("Replay in checker", "إعادة في الفاحص")}
                              title={pick(lang, "Replay", "إعادة")}
                              onClick={() => replay(d)}
                            >
                              <Icon name="rotateCw" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="rl-row--detail">
                          <td colSpan={7}>
                            <DecisionDetails d={d} users={users} lang={lang} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={filtered.length}
            from={from}
            to={to}
            onPage={setPage}
            lang={lang}
          />
        </>
      )}
    </SectionCard>
  );
}
