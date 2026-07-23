// Role Capabilities tab — a role's RESOLVED capability sheet at one context.
// The sheet (effective permission, override flag, where it was decided) comes
// straight from GET /api/roles/{id}/capabilities?context_id=… ; component /
// type / min-context / risks are merged in from the capability catalogue.
//
// Editing writes with PUT /api/roles/{id}/capabilities {context_id, capability,
// permission} — the REAL method (never POST). permission=null CLEARS the row
// (back to "not set" / inherit). Allow / Prevent / Prohibit stay four DISTINCT
// states. Nothing is optimistic: a write refetches the sheet on success, and on
// failure the visible value is untouched and the backend reason is shown.
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../../api";
import { useLang } from "../../context/Lang";
import Icon from "./icons";
import {
  Combo,
  CopyBtn,
  EmptyState,
  PermBadge,
  PermSegmented,
  RiskChips,
  ScopedError,
  SectionCard,
  SkeletonRows,
  Tag,
  Tech,
  both,
  pick,
  useIsNarrow,
} from "./ui";
import { ContextOption, ctxLevelLabel, useCatalogs } from "./data";

const FILTERS = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "allow", en: "Allow", ar: "سماح" },
  { key: "prevent", en: "Prevent", ar: "منع" },
  { key: "prohibit", en: "Prohibit", ar: "حظر" },
  { key: "notset", en: "Not set", ar: "غير محدد" },
  { key: "override", en: "Overridden", ar: "متجاوَز" },
];

function RoleChips({ roles, roleId, onPick, lang }) {
  return (
    <div className="rl-rolechips" role="group" aria-label={both("Roles", "الأدوار")}>
      {roles.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`rl-rolechip ${roleId === r.id ? "rl-rolechip--on" : ""}`}
          aria-pressed={roleId === r.id}
          title={r.archetype ? `${pick(lang, "archetype", "النموذج")}: ${r.archetype}` : undefined}
          onClick={() => onPick(r.id)}
        >
          <Icon name="shield" size={13} />
          {r.short_name}
        </button>
      ))}
    </div>
  );
}

export default function CapabilityEditor() {
  const { lang } = useLang();
  const { roles, contexts, capabilities, courses, loading: catLoading, error: catError, reload } =
    useCatalogs();
  const narrow = useIsNarrow();

  const [roleId, setRoleId] = useState(null);
  const [contextId, setContextId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [writing, setWriting] = useState(null); // capability currently being written
  const [writeError, setWriteError] = useState(null);

  // defaults
  useEffect(() => {
    if (roleId == null && roles.length) setRoleId(roles[0].id);
    if (contextId == null && contexts.length) setContextId(contexts[0].id);
  }, [roles, contexts, roleId, contextId]);

  // catalogue lookup for component / min-context (sheet doesn't carry them)
  const capMeta = useMemo(() => {
    const m = new Map();
    for (const c of capabilities) m.set(c.name, c);
    return m;
  }, [capabilities]);

  useEffect(() => {
    if (!roleId || !contextId) return;
    let live = true;
    setLoading(true);
    setError(null);
    apiGet(`/api/roles/${roleId}/capabilities?context_id=${contextId}`)
      .then((data) => live && setRows(data))
      .catch((e) => live && setError(e))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [roleId, contextId, tick]);

  const setPermission = useCallback(
    (capability, permission) => {
      setWriting(capability);
      setWriteError(null);
      apiPut(`/api/roles/${roleId}/capabilities`, { context_id: contextId, capability, permission })
        .then(() => setTick((t) => t + 1)) // refetch — sheet is the source of truth
        .catch((e) => setWriteError({ capability, error: e }))
        .finally(() => setWriting(null));
    },
    [roleId, contextId],
  );

  const merged = useMemo(
    () =>
      rows.map((r) => {
        const meta = capMeta.get(r.capability);
        return {
          ...r,
          component: meta?.component ?? "—",
          min_context_level: meta?.min_context_level ?? "—",
        };
      }),
    [rows, capMeta],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merged.filter((r) => {
      if (q && !(`${r.capability} ${r.component}`.toLowerCase().includes(q))) return false;
      if (filter === "all") return true;
      if (filter === "override") return r.is_override;
      if (filter === "notset") return r.permission == null;
      return r.permission === filter;
    });
  }, [merged, query, filter]);

  const selectedCtx = contexts.find((c) => c.id === contextId);
  const selectedRole = roles.find((r) => r.id === roleId);

  if (catError) {
    return (
      <SectionCard icon="shieldPlus" title="Role capabilities" titleAr="صلاحيات الدور">
        <ScopedError error={catError} onRetry={reload} lang={lang} />
      </SectionCard>
    );
  }

  const rowSource = (r) =>
    r.decided_at ? (
      <span className="rl-source">
        {r.is_override && <Tag tone="prevent">{pick(lang, "override", "تجاوز")}</Tag>}
        <span className="rl-muted">
          {pick(lang, "at", "عند")} <Tech>{r.decided_at}</Tech>
        </span>
      </span>
    ) : (
      <span className="rl-muted">{pick(lang, "inherited / default", "موروث / افتراضي")}</span>
    );

  return (
    <SectionCard
      icon="shieldPlus"
      title="Role capabilities"
      titleAr="صلاحيات الدور"
      actions={
        <span className="rl-count">
          {selectedRole && (
            <>
              <Tech>{selectedRole.short_name}</Tech> · {filtered.length}/{merged.length}
            </>
          )}
        </span>
      }
    >
      <RoleChips roles={roles} roleId={roleId} onPick={setRoleId} lang={lang} />

      <div className="rl-controls">
        <label className="rl-field rl-field--grow">
          <span className="rl-field__label">
            <Icon name="folder" size={14} />
            <T2 en="Context" ar="السياق" />
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
            loading={catLoading}
            lang={lang}
          />
        </label>

        <label className="rl-field rl-field--grow">
          <span className="rl-field__label">
            <Icon name="search" size={14} />
            <T2 en="Search" ar="بحث" />
          </span>
          <div className="rl-searchbox">
            <Icon name="search" size={15} className="rl-searchbox__ic" />
            <input
              className="rl-input rl-input--search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pick(lang, "capability or component", "الصلاحية أو المكوّن")}
              dir="ltr"
              aria-label={both("Search capabilities", "بحث في الصلاحيات")}
            />
          </div>
        </label>

        <div className="rl-field">
          <span className="rl-field__label">
            <Icon name="filter" size={14} />
            <T2 en="State" ar="الحالة" />
          </span>
          <div className="rl-filterchips" role="group" aria-label={both("Filter by state", "تصفية حسب الحالة")}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`rl-filterchip ${filter === f.key ? "rl-filterchip--on" : ""}`}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {pick(lang, f.en, f.ar)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedCtx && (
        <p className="rl-scopeline">
          <Icon name="info" size={13} />
          <span>
            {pick(lang, "Editing sets the value at", "التعديل يضبط القيمة عند")}{" "}
            <Tech>{selectedCtx.label}</Tech>
            {" — "}
            {pick(
              lang,
              "clearing (Not set) returns the row to inheritance.",
              "المسح (غير محدد) يعيد الصف إلى الوراثة.",
            )}
          </span>
        </p>
      )}

      {writeError && (
        <ScopedError
          error={writeError.error}
          lang={lang}
          compact
        />
      )}

      {error ? (
        <ScopedError error={error} onRetry={() => setTick((t) => t + 1)} lang={lang} />
      ) : loading ? (
        <SkeletonRows lines={6} />
      ) : merged.length === 0 ? (
        <EmptyState icon="shieldQuestion" en="No capabilities are available." ar="لا صلاحيات متاحة." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" en="No capabilities match your search." ar="لا صلاحيات تطابق البحث." compact />
      ) : narrow ? (
        <div className="rl-capcards">
          {filtered.map((r) => (
            <div key={r.capability} className="rl-capcard">
              <div className="rl-capcard__head">
                <span className="rl-capcard__cap">
                  <Tech>{r.capability}</Tech>
                  <CopyBtn text={r.capability} lang={lang} />
                </span>
                <PermBadge permission={r.permission} lang={lang} />
              </div>
              <div className="rl-capcard__meta">
                <Tag>{r.cap_type}</Tag>
                <Tag>
                  <Tech>{r.component}</Tech>
                </Tag>
                <Tag title={both("Minimum context level", "أدنى مستوى سياق")}>
                  {ctxLevelLabel(r.min_context_level, lang)}
                </Tag>
                <RiskChips risks={r.risks} lang={lang} />
              </div>
              <div className="rl-capcard__source">{rowSource(r)}</div>
              <PermSegmented
                value={r.permission}
                onChange={(p) => setPermission(r.capability, p)}
                busy={writing === r.capability}
                lang={lang}
                ariaLabel={`${both("Set", "ضبط")} ${r.capability}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rl-tablewrap">
          <table className="rl-table rl-table--caps">
            <thead>
              <tr>
                <th scope="col">{pick(lang, "Capability", "الصلاحية")}</th>
                <th scope="col">{pick(lang, "Type", "النوع")}</th>
                <th scope="col">{pick(lang, "Min context", "أدنى سياق")}</th>
                <th scope="col">{pick(lang, "Effective", "الفعلي")}</th>
                <th scope="col">{pick(lang, "Source", "المصدر")}</th>
                <th scope="col">{pick(lang, "Set at this context", "الضبط عند هذا السياق")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.capability} className={writing === r.capability ? "rl-row--busy" : ""}>
                  <td>
                    <span className="rl-cap">
                      <Tech>{r.capability}</Tech>
                      <CopyBtn text={r.capability} lang={lang} />
                    </span>
                    <span className="rl-cap__meta">
                      <Tech>{r.component}</Tech>
                      <RiskChips risks={r.risks} lang={lang} />
                    </span>
                  </td>
                  <td>{r.cap_type}</td>
                  <td>{ctxLevelLabel(r.min_context_level, lang)}</td>
                  <td>
                    <PermBadge permission={r.permission} lang={lang} />
                  </td>
                  <td>{rowSource(r)}</td>
                  <td>
                    <PermSegmented
                      value={r.permission}
                      onChange={(p) => setPermission(r.capability, p)}
                      busy={writing === r.capability}
                      lang={lang}
                      ariaLabel={`${both("Set", "ضبط")} ${r.capability}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// tiny local bilingual span (avoids importing T just for labels here)
function T2({ en, ar }) {
  return (
    <span>
      {en}
      <span className="rl-ar" lang="ar">
        {ar}
      </span>
    </span>
  );
}
