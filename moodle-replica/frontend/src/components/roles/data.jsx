// Shared catalogue loading + option renderers + context helpers for the Roles
// tabs. Read-only config lists go through cachedGet (30s TTL, deduped across
// tabs). Nothing here decides a permission — it only fetches and formats the
// catalogues the pickers render.
import { useCallback, useEffect, useState } from "react";
import { cachedGet } from "../../lib/catalog";
import { Tech, RiskChips, pick } from "./ui";

// Load every catalogue a Roles tab might need. Each is independent so one
// failing (e.g. courses) never blanks the others.
export function useCatalogs() {
  const [state, setState] = useState({
    users: [],
    roles: [],
    contexts: [],
    capabilities: [],
    courses: [],
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      cachedGet("/api/users"),
      cachedGet("/api/roles"),
      cachedGet("/api/roles/contexts"),
      cachedGet("/api/roles/capabilities"),
      cachedGet("/api/courses").catch(() => []),
    ])
      .then(([users, roles, contexts, capabilities, courses]) => {
        if (!live) return;
        setState({ users, roles, contexts, capabilities, courses, loading: false, error: null });
      })
      .catch((error) => live && setState((s) => ({ ...s, loading: false, error })));
    return () => {
      live = false;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

// ---- context helpers ------------------------------------------------------
export const findCtx = (contexts, id) => contexts.find((c) => c.id === Number(id)) ?? null;

// The course instance id governing a context (course level → itself; activity →
// its course ancestor via the path). Null for system/category/user contexts.
export function ctxCourseId(ctx, contexts) {
  if (!ctx) return null;
  if (ctx.level === "course") return ctx.instance_id;
  const ids = (ctx.path || "").split("/").filter(Boolean).map(Number);
  for (const id of ids) {
    const c = contexts.find((x) => x.id === id);
    if (c?.level === "course") return c.instance_id;
  }
  return null;
}

export function courseName(courses, instanceId) {
  const c = courses.find((x) => x.id === instanceId);
  return c?.full_name ?? c?.short_name ?? null;
}

export const userById = (users, id) => users.find((u) => u.id === Number(id)) ?? null;
export const roleByShort = (roles, sn) => roles.find((r) => r.short_name === sn) ?? null;

const CTX_LEVEL_AR = {
  system: "النظام",
  category: "التصنيف",
  course: "المقرر",
  activity: "النشاط",
  user: "المستخدم",
};
export const ctxLevelLabel = (level, lang) => (lang === "ar" ? CTX_LEVEL_AR[level] ?? level : level);

// ---- option renderers -----------------------------------------------------
export function UserOption({ u, lang }) {
  return (
    <span className="rl-opt">
      <span className="rl-opt__main">{u.full_name}</span>
      <span className="rl-opt__sec">
        <Tech>@{u.username}</Tech>
        {u.suspended && (
          <span className="rl-opt__flag">{pick(lang, "suspended", "موقوف")}</span>
        )}
      </span>
    </span>
  );
}

export function CapabilityOption({ c, lang }) {
  return (
    <span className="rl-opt">
      <span className="rl-opt__main">
        <Tech>{c.name}</Tech>
      </span>
      <span className="rl-opt__sec">
        <span>{c.cap_type}</span>
        <span>·</span>
        <Tech>{c.component}</Tech>
        <span>·</span>
        <span>
          {pick(lang, "min", "الأدنى")} {ctxLevelLabel(c.min_context_level, lang)}
        </span>
        <RiskChips risks={c.risks} lang={lang} />
      </span>
    </span>
  );
}

export function ContextOption({ ctx, courses, lang }) {
  const cid = ctx.level === "course" ? ctx.instance_id : null;
  const cname = cid != null ? courseName(courses, cid) : null;
  return (
    <span className="rl-opt">
      <span className="rl-opt__main">
        <Tech>{ctx.label}</Tech>
        {cname && <span className="rl-opt__name">{cname}</span>}
      </span>
      <span className="rl-opt__sec">
        <span>{ctxLevelLabel(ctx.level, lang)}</span>
        <span>·</span>
        <Tech>{ctx.path}</Tech>
      </span>
    </span>
  );
}

// Human context title for headings: "course:3 · Intro to CS" (label LTR).
export function ctxTitle(ctx, courses) {
  if (!ctx) return "—";
  const cid = ctx.level === "course" ? ctx.instance_id : null;
  const cname = cid != null ? courseName(courses, cid) : null;
  return { label: ctx.label, name: cname };
}
