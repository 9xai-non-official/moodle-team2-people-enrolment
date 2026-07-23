// Roles & Permissions UI kit — the page-local primitives, matching the
// enrolment / teaching / demos `ui.jsx` convention so the page reads as the
// same product. Everything here is presentation only: no permission rule is
// ever decided in this file. Bilingual (inline EN + AR), theme via var(--wc-*)
// / var(--rl-*) tokens, RTL-aware, and accessible.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Icon from "./icons";
import ReasonList from "../common/ReasonList";

// ---- language helpers -----------------------------------------------------
export const pick = (lang, en, ar) => (lang === "ar" ? ar : en);
export const both = (en, ar) => `${en} · ${ar}`;

// Inline bilingual label: EN then a smaller AR span (assistive-tech reads its
// lang). The AR half is hidden when not provided.
export function T({ en, ar, className }) {
  return (
    <span className={className}>
      {en}
      {ar && (
        <span className="rl-ar" lang="ar">
          {ar}
        </span>
      )}
    </span>
  );
}

// Technical strings (capability ids, context paths/labels, API paths, numeric
// ids) stay LTR and monospaced even inside an RTL region — never translated,
// never reversed.
export function Tech({ children, className = "" }) {
  return (
    <span className={`rl-tech ${className}`.trim()} dir="ltr">
      {children}
    </span>
  );
}

// ---- hooks ----------------------------------------------------------------
export function useIsNarrow(query = "(max-width: 860px)") {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e) => setNarrow(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return narrow;
}

// Polite live region for announcing the verdict once per check (not every
// evidence render). Returns [node, announce].
export function useAnnounce() {
  const [msg, setMsg] = useState("");
  const node = (
    <div className="rl-sr-only" role="status" aria-live="polite">
      {msg}
    </div>
  );
  return [node, setMsg];
}

// ---- role label vocab (display only) --------------------------------------
export const ROLE_AR = {
  manager: "مدير",
  editingteacher: "مدرّس",
  teacher: "مدرّس مساعد",
  student: "طالب",
  guest: "زائر",
  user: "مستخدم",
};

// ---- accessible tablist ---------------------------------------------------
export const tabId = (k) => `roles-tab-${k}`;
export const panelId = (k) => `roles-panel-${k}`;

// tabs: [{ key, en, ar, icon }]. Roving tabindex, arrow keys mirrored under
// RTL, Home/End, horizontal scroll on overflow. Selecting moves focus.
export function RolesTabs({ tabs, active, onChange, dir = "ltr" }) {
  const ref = useRef(null);
  const rtl = dir === "rtl";

  function onKeyDown(e) {
    const keys = tabs.map((t) => t.key);
    const i = keys.indexOf(active);
    if (i < 0) return;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === forward) next = (i + 1) % keys.length;
    else if (e.key === backward) next = (i - 1 + keys.length) % keys.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = keys.length - 1;
    if (next == null) return;
    e.preventDefault();
    onChange(keys[next]);
    ref.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      className="rl-tabs"
      role="tablist"
      aria-label={both("Roles sections", "أقسام الأدوار")}
      ref={ref}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={tabId(t.key)}
            aria-selected={on}
            aria-controls={panelId(t.key)}
            tabIndex={on ? 0 : -1}
            className={`rl-tab ${on ? "rl-tab--on" : ""}`}
            onClick={() => onChange(t.key)}
          >
            <Icon name={t.icon} size={18} />
            <span className="rl-tab__label">
              <span className="rl-tab__en">{t.en}</span>
              <span className="rl-tab__ar" lang="ar">
                {t.ar}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---- avatar ---------------------------------------------------------------
const AV_HUES = [210, 260, 24, 150, 330, 190, 45, 285];
function avatarHue(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_HUES[h % AV_HUES.length];
}
export function Avatar({ name = "?", size = 32, suspended = false }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const hue = avatarHue(name);
  return (
    <span
      className={`rl-avatar ${suspended ? "rl-avatar--suspended" : ""}`}
      style={{
        width: size,
        height: size,
        "--rl-av-h": hue,
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

// ---- badges ---------------------------------------------------------------
// The final verdict — never colour alone (icon + word), bilingual.
export function ResultBadge({ allowed, size = 15, lang = "en" }) {
  return (
    <span className={`rl-verdict-badge rl-verdict-badge--${allowed ? "allow" : "deny"}`}>
      <Icon name={allowed ? "circleCheck" : "circleMinus"} size={size} />
      <span>{allowed ? pick(lang, "ALLOWED", "مسموح") : pick(lang, "DENIED", "مرفوض")}</span>
    </span>
  );
}

// One role_capability permission value. Prevent and Prohibit are DISTINCT
// (never merged): prevent = orange, prohibit = red/ban, allow = green,
// not-set = neutral. `permission` is "allow"|"prevent"|"prohibit"|null.
const PERM_META = {
  allow: { icon: "circleCheck", tone: "allow", en: "Allow", ar: "سماح" },
  prevent: { icon: "circleMinus", tone: "prevent", en: "Prevent", ar: "منع" },
  prohibit: { icon: "ban", tone: "prohibit", en: "Prohibit", ar: "حظر" },
  notset: { icon: "minus", tone: "notset", en: "Not set", ar: "غير محدد" },
};
export function permMeta(permission) {
  return PERM_META[permission ?? "notset"] ?? PERM_META.notset;
}
export function PermBadge({ permission, size = 14, lang = "en", title }) {
  const m = permMeta(permission);
  return (
    <span className={`rl-perm rl-perm--${m.tone}`} title={title}>
      <Icon name={m.icon} size={size} />
      <span>{pick(lang, m.en, m.ar)}</span>
    </span>
  );
}

// Capability risk chips — only ever rendered from real `risks` values.
const RISK_META = {
  personal: { en: "Personal data", ar: "بيانات شخصية", icon: "userRound" },
  dataloss: { en: "Data loss", ar: "فقدان بيانات", icon: "triangleAlert" },
  spam: { en: "Spam", ar: "بريد مزعج", icon: "shieldAlert" },
  xss: { en: "XSS", ar: "XSS", icon: "shieldAlert" },
  config: { en: "Config", ar: "إعدادات", icon: "shieldAlert" },
};
export function RiskChips({ risks, lang = "en" }) {
  if (!risks || risks.length === 0) return null;
  return (
    <span className="rl-risks">
      {risks.map((r) => {
        const m = RISK_META[r] ?? { en: r, ar: r, icon: "shieldAlert" };
        return (
          <span
            key={r}
            className="rl-risk"
            title={`${pick(lang, "Risk", "خطر")}: ${pick(lang, m.en, m.ar)}`}
          >
            <Icon name={m.icon} size={12} />
            <span dir="ltr">{r}</span>
          </span>
        );
      })}
    </span>
  );
}

// A neutral tone chip (component, type, context level…).
export function Tag({ children, tone = "neutral", title }) {
  return (
    <span className={`rl-tag rl-tag--${tone}`} title={title}>
      {children}
    </span>
  );
}

// ---- section card ---------------------------------------------------------
export function SectionCard({ icon, tone = "blue", title, titleAr, actions, children, foot, id }) {
  return (
    <section className="rl-card" id={id}>
      {(title || actions) && (
        <header className="rl-card__head">
          <div className="rl-card__titlewrap">
            {icon && (
              <span className={`rl-card__ic rl-card__ic--${tone}`}>
                <Icon name={icon} size={18} />
              </span>
            )}
            <h2 className="rl-card__title">
              <span>{title}</span>
              {titleAr && (
                <span className="rl-card__title-ar" lang="ar">
                  {titleAr}
                </span>
              )}
            </h2>
          </div>
          {actions && <div className="rl-card__actions">{actions}</div>}
        </header>
      )}
      <div className="rl-card__body">{children}</div>
      {foot && <div className="rl-card__foot">{foot}</div>}
    </section>
  );
}

// ---- feedback states ------------------------------------------------------
export function EmptyState({ icon = "info", en, ar, hint, action, compact = false }) {
  return (
    <div className={`rl-empty ${compact ? "rl-empty--compact" : ""}`}>
      <span className="rl-empty__ic">
        <Icon name={icon} size={compact ? 22 : 30} />
      </span>
      <p className="rl-empty__msg">
        <span>{en}</span>
        {ar && (
          <span className="rl-ar" lang="ar">
            {ar}
          </span>
        )}
      </p>
      {hint && <p className="rl-empty__hint">{hint}</p>}
      {action && <div className="rl-empty__action">{action}</div>}
    </div>
  );
}

// Scoped error: shows the backend "why" verbatim (via ReasonList) + retry.
// `error` is an ApiError (has .reasons/.status) or a string.
export function ScopedError({ error, onRetry, lang = "en", compact = false }) {
  const reasons = error?.reasons?.length ? error.reasons : [error?.message ?? String(error)];
  const offline = error?.status === 0 || error?.name === "TypeError";
  return (
    <div className={`rl-error ${compact ? "rl-error--compact" : ""}`} role="alert">
      <span className="rl-error__ic">
        <Icon name={offline ? "cloudOff" : "triangleAlert"} size={compact ? 18 : 22} />
      </span>
      <div className="rl-error__body">
        <ReasonList reasons={reasons} tone="error" />
        {onRetry && (
          <button type="button" className="rl-btn rl-btn--ghost rl-btn--sm" onClick={onRetry}>
            <Icon name="refreshCw" size={14} />
            {pick(lang, "Retry", "إعادة المحاولة")}
          </button>
        )}
      </div>
    </div>
  );
}

export function Spinner({ label, lang = "en" }) {
  return (
    <div className="rl-spinner" role="status">
      <Icon name="loader" size={18} spin />
      <span>{label ?? pick(lang, "Loading…", "جارٍ التحميل…")}</span>
    </div>
  );
}

export function SkeletonRows({ lines = 3, className = "" }) {
  return (
    <div className={`rl-skel ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="rl-skel__line" />
      ))}
    </div>
  );
}

// ---- searchable combobox --------------------------------------------------
// Generic accessible combobox for large lists (capabilities, users, contexts).
// value = selected key (or null). Items are opaque; the caller provides
// key/label/search/render accessors. Keyboard: type to filter, ↑/↓ move,
// Enter selects, Esc closes.
export function Combo({
  items,
  value,
  onChange,
  itemKey,
  itemLabel,
  itemSearch,
  renderItem,
  placeholder = "Select…",
  ariaLabel,
  leadingIcon,
  disabled = false,
  loading = false,
  clearable = false,
  lang = "en",
  invalid = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selected = useMemo(
    () => items.find((it) => String(itemKey(it)) === String(value)),
    [items, value, itemKey],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => itemSearch(it).toLowerCase().includes(q));
  }, [items, query, itemSearch]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) setActiveIdx(0);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelectorAll('[role="option"]')[activeIdx];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  function choose(it) {
    onChange(itemKey(it), it);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[activeIdx]) {
        e.preventDefault();
        choose(filtered[activeIdx]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.stopPropagation();
        setOpen(false);
        setQuery("");
      }
    }
  }

  const displayValue = open ? query : selected ? itemLabel(selected) : "";

  return (
    <div
      className={`rl-combo ${open ? "rl-combo--open" : ""} ${invalid ? "rl-combo--invalid" : ""}`}
      ref={rootRef}
    >
      <div className="rl-combo__control">
        {leadingIcon && <Icon name={leadingIcon} size={16} className="rl-combo__lead" />}
        <input
          ref={inputRef}
          type="text"
          className="rl-combo__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          disabled={disabled || loading}
          placeholder={loading ? pick(lang, "Loading…", "جارٍ التحميل…") : placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {clearable && selected && !disabled && (
          <button
            type="button"
            className="rl-combo__clear"
            aria-label={pick(lang, "Clear", "مسح")}
            onClick={() => {
              onChange(null, null);
              setQuery("");
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
        <button
          type="button"
          className="rl-combo__toggle"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled || loading}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
        >
          <Icon name="chevronDown" size={16} />
        </button>
      </div>
      {open && (
        <ul className="rl-combo__list" role="listbox" id={listId} ref={listRef}>
          {filtered.length === 0 && (
            <li className="rl-combo__none" aria-disabled="true">
              {pick(lang, "No matches", "لا نتائج")}
            </li>
          )}
          {filtered.map((it, i) => {
            const k = itemKey(it);
            const sel = String(k) === String(value);
            return (
              <li
                key={k}
                role="option"
                aria-selected={sel}
                className={`rl-combo__opt ${i === activeIdx ? "rl-combo__opt--active" : ""} ${
                  sel ? "rl-combo__opt--sel" : ""
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(it);
                }}
              >
                {renderItem ? renderItem(it) : itemLabel(it)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---- permission segmented control (edit) ----------------------------------
// Not set / Allow / Prevent / Prohibit — four distinct states, accessible.
// value is "allow"|"prevent"|"prohibit"|null; onChange gets the same.
const SEG_OPTS = [
  { key: null, ...PERM_META.notset },
  { key: "allow", ...PERM_META.allow },
  { key: "prevent", ...PERM_META.prevent },
  { key: "prohibit", ...PERM_META.prohibit },
];
export function PermSegmented({ value, onChange, disabled = false, busy = false, lang = "en", ariaLabel }) {
  return (
    <div className="rl-seg" role="group" aria-label={ariaLabel} aria-busy={busy || undefined}>
      {SEG_OPTS.map((o) => {
        const on = (o.key ?? null) === (value ?? null);
        return (
          <button
            key={o.key ?? "notset"}
            type="button"
            className={`rl-seg__opt rl-seg__opt--${o.tone} ${on ? "rl-seg__opt--on" : ""}`}
            aria-pressed={on}
            disabled={disabled || busy}
            title={pick(lang, o.en, o.ar)}
            onClick={() => !on && onChange(o.key)}
          >
            {busy && on ? <Icon name="loader" size={13} spin /> : <Icon name={o.icon} size={13} />}
            <span className="rl-seg__lbl">{pick(lang, o.en, o.ar)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---- dialog (focus-trapped) -----------------------------------------------
export function Dialog({ open, onClose, title, titleAr, icon, dir = "ltr", size = "md", children, footer }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.disabled && el.offsetParent !== null);
    focusables()[0]?.focus();
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="rl-dialog__scrim" onMouseDown={onClose}>
      <div
        className={`rl-dialog rl-dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir={dir}
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="rl-dialog__head">
          <div className="rl-dialog__titlewrap">
            {icon && <Icon name={icon} size={18} className="rl-dialog__ic" />}
            <h3 className="rl-dialog__title">
              <span>{title}</span>
              {titleAr && (
                <span className="rl-ar" lang="ar">
                  {titleAr}
                </span>
              )}
            </h3>
          </div>
          <button type="button" className="rl-dialog__close" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="rl-dialog__body">{children}</div>
        {footer && <div className="rl-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---- pagination -----------------------------------------------------------
export function Pagination({ page, pageCount, total, from, to, onPage, lang = "en" }) {
  if (pageCount <= 1 && total <= (to - from + 1 || total)) {
    // still show the count line for a single page
  }
  const btn = (p, icon, labelEn, labelAr, dis) => (
    <button
      type="button"
      className="rl-pager__btn"
      disabled={dis}
      aria-label={both(labelEn, labelAr)}
      onClick={() => onPage(p)}
    >
      <Icon name={icon} size={16} />
    </button>
  );
  return (
    <div className="rl-pager">
      <span className="rl-pager__count">
        {total === 0
          ? pick(lang, "No entries", "لا مدخلات")
          : `${pick(lang, "Showing", "عرض")} ${from}–${to} ${pick(lang, "of", "من")} ${total}`}
      </span>
      <div className="rl-pager__ctrls">
        {btn(1, "chevronsLeft", "First", "الأول", page <= 1)}
        {btn(page - 1, "chevronLeft", "Previous", "السابق", page <= 1)}
        <span className="rl-pager__page" aria-current="page">
          {pick(lang, "Page", "صفحة")} {page} / {Math.max(1, pageCount)}
        </span>
        {btn(page + 1, "chevronRight", "Next", "التالي", page >= pageCount)}
        {btn(pageCount, "chevronsRight", "Last", "الأخير", page >= pageCount)}
      </div>
    </div>
  );
}

// ---- misc buttons ---------------------------------------------------------
export function Btn({ variant = "primary", size, icon, iconRight, children, ...rest }) {
  const cls = [
    "rl-btn",
    `rl-btn--${variant}`,
    size ? `rl-btn--${size}` : "",
    rest.className || "",
  ]
    .filter(Boolean)
    .join(" ");
  const props = { ...rest };
  delete props.className;
  return (
    <button className={cls} {...props}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </button>
  );
}

// Copy-to-clipboard button for a technical string.
export function CopyBtn({ text, lang = "en" }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    });
  }, [text]);
  return (
    <button
      type="button"
      className="rl-copy"
      aria-label={both("Copy", "نسخ")}
      title={done ? pick(lang, "Copied", "تم النسخ") : pick(lang, "Copy", "نسخ")}
      onClick={copy}
    >
      <Icon name={done ? "circleCheck" : "copy"} size={13} />
    </button>
  );
}
