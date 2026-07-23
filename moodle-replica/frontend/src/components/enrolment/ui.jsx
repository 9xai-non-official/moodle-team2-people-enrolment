// Shared enrolment UI primitives. One place for the inline-bilingual label,
// initials avatar, status/method/role vocab, the accessible menu + dialog, the
// segmented filter, pagination, and the empty/error/loading states — so every
// enrolment surface reads and behaves the same and themes/mirrors together.
//
// Nothing here invents data. Status/method/role vocab maps the backend's own
// values to readable bilingual text + an icon; unknown values are humanised,
// never shown as raw ids.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Icon from "./icons";

/* ---- bilingual text ------------------------------------------------------ */
// Inline EN + AR, exactly like the shell nav labels. Direction-agnostic: the
// AR span carries lang="ar" so shaping + fonts are correct in both themes.
export function T({ en, ar }) {
  return (
    <>
      {en}
      {ar ? (
        <span className="enr-ar" lang="ar">
          {ar}
        </span>
      ) : null}
    </>
  );
}

// String forms for aria-label / title (no JSX). `both` = "EN · AR".
export const both = (en, ar) => (ar ? `${en} · ${ar}` : en);
export const pick = (lang, en, ar) => (lang === "ar" && ar ? ar : en);

// Turn an API failure into a message a user should read. A 403 here means the
// signed-in person has no teaching/management role in THIS course — a normal,
// expected outcome (e.g. a teacher opening a course they don't teach), not a
// bug to file. Show a plain sentence instead of the raw self-locating error
// ("GET /api/... → 403: actor N lacks capability 'course:viewparticipants'").
// Any other error keeps its verbatim message (which names the endpoint).
export function friendlyError(e, lang) {
  if (e?.status === 403) {
    return pick(
      lang,
      "You don’t have access to this course. Enrolment tools are only available for courses where you’re a teacher or manager.",
      "ليس لديك صلاحية الوصول إلى هذا المقرر. أدوات التسجيل متاحة فقط للمقررات التي تكون فيها معلمًا أو مديرًا.",
    );
  }
  if (e?.status === 401) {
    return pick(lang, "Please sign in to continue.", "يرجى تسجيل الدخول للمتابعة.");
  }
  return e?.message ?? String(e);
}

/* ---- initials avatar ----------------------------------------------------- */
function initialsOf(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}
// Stable per-name hue so the same person keeps the same colour.
function hueOf(name) {
  let h = 0;
  for (const ch of String(name ?? "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
export function Avatar({ name, size = 34, src }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    return (
      <img
        className="enr-avatar enr-avatar--img"
        style={style}
        src={src}
        alt=""
      />
    );
  }
  const h = hueOf(name);
  return (
    <span
      className="enr-avatar"
      style={{
        ...style,
        "--enr-av-bg": `hsl(${h} 58% 92%)`,
        "--enr-av-fg": `hsl(${h} 52% 34%)`,
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

/* ---- dates --------------------------------------------------------------- */
const EM_DASH = "—";
const isValid = (d) => d instanceof Date && !Number.isNaN(d.getTime());

export function fmtDate(iso, lang) {
  if (!iso) return EM_DASH;
  const d = new Date(iso);
  if (!isValid(d)) return EM_DASH;
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function dtTitle(iso, lang) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (!isValid(d)) return undefined;
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

// Relative-ish last access: "Today, 10:24" / "Yesterday, 16:18" / absolute.
export function relTime(iso, lang) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!isValid(d)) return null;
  const now = new Date();
  const dayMs = 86_400_000;
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOf(now) - startOf(d)) / dayMs);
  let time = "";
  try {
    time = new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    time = "";
  }
  if (diffDays === 0) return `${pick(lang, "Today", "اليوم")}, ${time}`;
  if (diffDays === 1) return `${pick(lang, "Yesterday", "أمس")}, ${time}`;
  return `${fmtDate(iso, lang)}, ${time}`;
}

/* ---- status / method / role vocabulary ----------------------------------- */
// effective_status → badge. Enrolment-suspended (orange) and account-suspended
// (red) are kept as DISTINCT domain states (spec §23, backend C-6).
export const STATUS_META = {
  active: { tone: "green", icon: "circleCheck", en: "Active", ar: "نشط" },
  suspended: { tone: "orange", icon: "pauseCircle", en: "Suspended", ar: "موقوف" },
  expired: { tone: "amber", icon: "calendarClock", en: "Expired", ar: "منتهٍ" },
  method_disabled: {
    tone: "amber",
    icon: "plug",
    en: "Method off",
    ar: "الطريقة معطّلة",
    titleEn: "Enrolment method is disabled",
    titleAr: "طريقة التسجيل معطّلة",
  },
  account_suspended: {
    tone: "red",
    icon: "circleX",
    en: "Account suspended",
    ar: "الحساب موقوف",
    titleEn: "The account is suspended — the user stays on the roster",
    titleAr: "الحساب موقوف — يبقى المستخدم في القائمة",
  },
};

export function StatusBadge({ status, size = 15, muted = false, title: titleOverride }) {
  const key = String(status ?? "").toLowerCase();
  const m = STATUS_META[key] ?? {
    tone: "grey",
    icon: "info",
    en: String(status ?? "unknown").replace(/_/g, " "),
    ar: "",
  };
  // `muted` renders a de-emphasised outline instead of the tone fill — used when
  // a stronger fact (e.g. account suspension) is the effective reality (§23).
  const title = titleOverride ?? (m.titleEn ? both(m.titleEn, m.titleAr) : undefined);
  return (
    <span className={`enr-badge enr-badge--${muted ? "ghost" : m.tone}`} title={title}>
      <Icon name={m.icon} size={size} />
      <span className="enr-badge__txt">
        <T en={m.en} ar={m.ar} />
      </span>
    </span>
  );
}

// Two-axis status (spec §23, backend C-6): the ENROLMENT status (active /
// suspended / expired / method_disabled) is the primary badge; account
// suspension is a SEPARATE flag shown beside it, never a replacement — so an
// account-suspended user with an active enrolment still reads "Active" under
// the Active filter, with a distinct "Account suspended" chip.
export function EnrolmentStatus({ row, size = 15, compact = false }) {
  // Prefer the backend's separate fields; degrade gracefully if only the
  // folded effective_status is present (never surface account_suspended here).
  let enrol = row.enrolment_status;
  if (!enrol) {
    enrol =
      row.effective_status === "account_suspended"
        ? row.paths?.some((p) => p.status === "active")
          ? "active"
          : "suspended"
        : row.effective_status;
  }
  const acct = row.account_suspended ?? row.effective_status === "account_suspended";

  // No account suspension → the enrolment status is the whole story.
  if (!acct) {
    return (
      <span className="enr-statuscell">
        <StatusBadge status={enrol} size={size} />
      </span>
    );
  }

  // Account suspended (spec §23, C-6): the suspended ACCOUNT is the effective
  // reality — no course access regardless of enrolment state. Lead with it (red)
  // and show the enrolment status DE-EMPHASISED (muted outline) so a locked-out
  // account never reads as a healthy green "Active". The two states stay DISTINCT
  // (never merged) — we only change prominence.
  const acctTitle = both(
    "Account suspended — the user cannot access the course; they stay on the roster",
    "الحساب موقوف — لا يمكن للمستخدم الوصول إلى المقرر؛ يبقى في القائمة",
  );
  const enrolTitle = both(
    "Enrolment is active, but the suspended account blocks access",
    "التسجيل نشط، لكن إيقاف الحساب يمنع الوصول",
  );
  return (
    <span className="enr-statuscell">
      {compact ? (
        // Dense table: an icon-only red flag (tooltip + SR text) keeps the
        // Status column narrow so the full roster fits without clipping.
        <span className="enr-badge enr-badge--red enr-badge--icononly" title={acctTitle}>
          <Icon name="circleX" size={13} />
          <span className="enr-sr">
            <T en="Account suspended" ar="الحساب موقوف" />
          </span>
        </span>
      ) : (
        <span className="enr-badge enr-badge--red" title={acctTitle}>
          <Icon name="circleX" size={13} />
          <T en="Account suspended" ar="الحساب موقوف" />
        </span>
      )}
      <StatusBadge status={enrol} size={size} muted title={enrolTitle} />
    </span>
  );
}

const METHOD_META = {
  manual: { icon: "userRound", en: "Manual", ar: "يدوي" },
  self: { icon: "userPlus", en: "Self enrol", ar: "تسجيل ذاتي" },
  cohort: { icon: "usersRound", en: "Cohort sync", ar: "مزامنة الفوج" },
  guest: { icon: "eye", en: "Guest", ar: "ضيف" },
};
const humanize = (v) =>
  String(v ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "—";

export function methodMeta(method) {
  const key = String(method ?? "").toLowerCase();
  return METHOD_META[key] ?? { icon: "plug", en: humanize(method), ar: "" };
}

const ROLE_META = {
  student: { icon: "graduationCap", en: "Student", ar: "طالب" },
  editingteacher: { icon: "presentation", en: "Teacher", ar: "مدرّس" },
  teacher: { icon: "presentation", en: "Non-editing teacher", ar: "مدرّس مساعد" },
  "teacher-allgroups": { icon: "userCog", en: "TA (all groups)", ar: "مساعد (كل المجموعات)" },
  ta: { icon: "userCog", en: "Teaching Assistant", ar: "مساعد تدريس" },
  teachingassistant: { icon: "userCog", en: "Teaching Assistant", ar: "مساعد تدريس" },
  manager: { icon: "shield", en: "Manager", ar: "مدير" },
  guest: { icon: "userRound", en: "Guest", ar: "ضيف" },
};
export function roleMeta(shortName) {
  const key = String(shortName ?? "").toLowerCase();
  return ROLE_META[key] ?? { icon: "userRound", en: humanize(shortName), ar: "" };
}

/* ---- accessible popover menu -------------------------------------------- */
// items: [{ kind:"heading"|"item"|"sep", label?, ar?, icon?, danger?, onSelect? }]
export function ActionsMenu({ label, items, align = "end" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const focusables = () =>
      Array.from(popRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? []);
    focusables()[0]?.focus();
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key === "Tab") {
        // WAI-ARIA menu-button pattern: Tab closes the menu. Hand focus back to
        // the trigger first (a stable element) so the browser's default Tab then
        // advances from there — otherwise, when the popup unmounts, focus would
        // strand on <body>.
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      const els = focusables();
      if (!els.length) return;
      const i = els.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        (els[i + 1] ?? els[0]).focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        (els[i - 1] ?? els[els.length - 1]).focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        els[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        els[els.length - 1].focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const usable = items.filter(Boolean);
  return (
    <div className="enr-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="enr-iconbtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="ellipsisVertical" size={18} />
      </button>
      {open && (
        <div
          ref={popRef}
          className={`enr-menu__pop enr-menu__pop--${align}`}
          role="menu"
          aria-label={label}
        >
          {usable.map((it, i) => {
            if (it.kind === "sep") return <div key={`s${i}`} className="enr-menu__sep" />;
            if (it.kind === "heading")
              return (
                <div key={`h${i}`} className="enr-menu__heading">
                  <T en={it.label} ar={it.ar} />
                </div>
              );
            return (
              <button
                key={`i${i}`}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                title={it.title}
                aria-disabled={it.disabled || undefined}
                className={`enr-menu__item ${it.danger ? "enr-menu__item--danger" : ""}`}
                onClick={() => {
                  setOpen(false);
                  // Restore focus to the trigger before running the action so a
                  // keyboard activation doesn't strand focus on <body>. If the
                  // action opens a dialog, it captures the trigger as its opener.
                  btnRef.current?.focus();
                  it.onSelect?.();
                }}
              >
                {it.icon && <Icon name={it.icon} size={16} />}
                <span className="enr-menu__label">
                  <T en={it.label} ar={it.ar} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- accessible dialog (focus trap, Escape, scroll-lock, restore) -------- */
export function Dialog({ open, onClose, title, titleAr, icon, children, footer, dir, size = "md", variant }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  useLayoutEffect(() => {
    if (open) openerRef.current = document.activeElement;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.disabled && el.offsetParent !== null);
    const t = setTimeout(() => (focusables()[0] ?? panelRef.current)?.focus(), 0);
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
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
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="enr-dialog__scrim" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className={`enr-dialog enr-dialog--${size} ${variant ? `enr-dialog--${variant}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={both(title, titleAr)}
        dir={dir}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="enr-dialog__head">
          {icon && (
            <span className={`enr-dialog__ic ${variant === "danger" ? "enr-dialog__ic--danger" : ""}`}>
              <Icon name={icon} size={20} />
            </span>
          )}
          <h2 className="enr-dialog__title">
            <T en={title} ar={titleAr} />
          </h2>
          <button type="button" className="enr-iconbtn" aria-label={both("Close", "إغلاق")} onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="enr-dialog__body">{children}</div>
        {footer && <div className="enr-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---- mobile side sheet (backdrop + focus trap; children own the header) --- */
// Desktop keeps the rail structural; on mobile the same content becomes an
// accessible full-height sheet (spec §56). Children render their own header.
export function Sheet({ open, onClose, dir, ariaLabel, children }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  useLayoutEffect(() => {
    if (open) openerRef.current = document.activeElement;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.disabled && el.offsetParent !== null);
    const t = setTimeout(() => (focusables()[0] ?? panelRef.current)?.focus(), 0);
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
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
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="enr-sheet__scrim" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="enr-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        dir={dir}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ---- segmented control (status filters) ---------------------------------- */
// options: [{ value, en, ar, tone }]
export function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div className="enr-seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            className={`enr-seg__opt ${on ? `enr-seg__opt--on enr-seg__opt--${o.tone}` : ""}`}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
          >
            {o.icon && <Icon name={o.icon} size={15} />}
            <T en={o.en} ar={o.ar} />
          </button>
        );
      })}
    </div>
  );
}

/* ---- pagination ---------------------------------------------------------- */
export function Pagination({ page, pageCount, total, from, to, pageSize, onPage, onPageSize, lang }) {
  if (pageCount <= 0) return null;
  const nums = pageWindow(page, pageCount);
  const Btn = ({ to: target, icon, label, disabled }) => (
    <button
      type="button"
      className="enr-page-btn"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={() => onPage(target)}
    >
      <Icon name={icon} size={16} />
    </button>
  );
  return (
    <div className="enr-pager">
      <div className="enr-pager__count" aria-live="polite">
        <T
          en={`Showing ${total ? from : 0} to ${to} of ${total} entries`}
          ar={`عرض ${total ? from : 0} إلى ${to} من أصل ${total}`}
        />
      </div>
      <div className="enr-pager__right">
        <label className="enr-pager__size">
          <select
            className="enr-select enr-select--sm"
            value={pageSize}
            aria-label={both("Rows per page", "لكل صفحة")}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {pick(lang, `${n} per page`, `${n} لكل صفحة`)}
              </option>
            ))}
          </select>
        </label>
        <div className="enr-pager__nav" role="group" aria-label={both("Pagination", "ترقيم الصفحات")}>
          <Btn to={1} icon="chevronsLeft" label={both("First page", "الأولى")} disabled={page <= 1} />
          <Btn to={page - 1} icon="chevronLeft" label={both("Previous page", "السابقة")} disabled={page <= 1} />
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="enr-page-ellipsis">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={`enr-page-btn enr-page-num ${n === page ? "enr-page-num--on" : ""}`}
                aria-current={n === page ? "page" : undefined}
                aria-label={both(`Page ${n}`, `صفحة ${n}`)}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <Btn to={page + 1} icon="chevronRight" label={both("Next page", "التالية")} disabled={page >= pageCount} />
          <Btn to={pageCount} icon="chevronsRight" label={both("Last page", "الأخيرة")} disabled={page >= pageCount} />
        </div>
      </div>
    </div>
  );
}
function pageWindow(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(count - 1, page + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < count - 1) out.push("…");
  out.push(count);
  return out;
}

/* ---- empty / error / loading -------------------------------------------- */
export function EmptyState({ icon = "info", en, ar, action }) {
  return (
    <div className="enr-empty">
      <span className="enr-empty__ic">
        <Icon name={icon} size={26} />
      </span>
      <p className="enr-empty__msg">
        <T en={en} ar={ar} />
      </p>
      {action}
    </div>
  );
}

export function ScopedError({ message, onRetry }) {
  return (
    <div className="enr-scoped-error" role="alert">
      <span className="enr-scoped-error__ic">
        <Icon name="triangleAlert" size={22} />
      </span>
      <div className="enr-scoped-error__body">
        <span className="error-banner enr-scoped-error__msg">{message}</span>
      </div>
      {onRetry && (
        <button type="button" className="enr-btn enr-btn--ghost" onClick={onRetry}>
          <Icon name="refreshCw" size={15} />
          <T en="Retry" ar="إعادة المحاولة" />
        </button>
      )}
    </div>
  );
}

export function Spinner({ label, lang }) {
  return (
    <div className="enr-spinner" role="status">
      <Icon name="loader" size={18} className="enr-spin" />
      <span>{label ?? pick(lang, "Loading…", "جارٍ التحميل…")}</span>
    </div>
  );
}

/* ---- section card (tab workspaces) --------------------------------------- */
export function SectionCard({ icon, tone = "blue", title, titleAr, actions, children, foot }) {
  return (
    <section className="enr-card">
      {(title || actions) && (
        <header className="enr-card__head">
          {icon && (
            <span className={`enr-card__ic enr-card__ic--${tone}`}>
              <Icon name={icon} size={19} />
            </span>
          )}
          {title && (
            <h2 className="enr-card__title">
              <T en={title} ar={titleAr} />
            </h2>
          )}
          {actions && <div className="enr-card__actions">{actions}</div>}
        </header>
      )}
      <div className="enr-card__body">{children}</div>
      {foot && <div className="enr-card__foot">{foot}</div>}
    </section>
  );
}

/* ---- toggle switch ------------------------------------------------------- */
export function Switch({ checked, onChange, label, ar, id }) {
  return (
    <label className="enr-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="enr-switch__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="enr-switch__track" aria-hidden="true">
        <span className="enr-switch__thumb" />
      </span>
      <span className="enr-switch__label">
        <T en={label} ar={ar} />
      </span>
    </label>
  );
}

/* ---- searchable user combobox -------------------------------------------- */
// Shared by the enrol modal and the cohort member picker. Caller supplies the
// users list (fetched once via the cached catalog). Keyboard: type to filter,
// ↑/↓ move, Enter picks, Escape closes the list.
export function UserCombo({ users, value, onChange, required = false, ariaLabel, placeholderEn = "Search users…", placeholderAr = "ابحث عن مستخدم…" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const rootRef = useRef(null);
  const listId = useId();
  const optId = (id) => `${listId}-o${id}`;
  const selected = users.find((u) => u.id === value) || null;

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? users.filter(
          (u) => u.full_name?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s),
        )
      : users;
    return list.slice(0, 40);
  }, [q, users]);

  useEffect(() => {
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const label = selected ? `${selected.full_name} (${selected.username})` : "";
  return (
    <div className="enr-combo" ref={rootRef}>
      <span className="enr-field__lead" aria-hidden="true">
        <Icon name="userRound" size={16} />
      </span>
      <input
        className="enr-input enr-input--lead"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && matches[hi] ? optId(matches[hi].id) : undefined}
        aria-required={required || undefined}
        aria-label={ariaLabel ?? both(placeholderEn, placeholderAr)}
        placeholder={selected ? label : both(placeholderEn, placeholderAr)}
        value={open ? q : label}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && matches[hi]) {
            e.preventDefault();
            onChange(matches[hi].id);
            setQ("");
            setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul className="enr-combo__list" role="listbox" id={listId}>
          {matches.length === 0 && <li className="enr-combo__empty">{both("No users match", "لا نتائج")}</li>}
          {matches.map((u, i) => (
            <li
              key={u.id}
              id={optId(u.id)}
              role="option"
              aria-selected={u.id === value}
              className={`enr-combo__opt ${i === hi ? "enr-combo__opt--hi" : ""} ${
                u.id === value ? "enr-combo__opt--on" : ""
              }`}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(u.id);
                setQ("");
                setOpen(false);
              }}
            >
              <span className="enr-combo__name">{u.full_name}</span>
              <span className="enr-combo__user">{u.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- viewport hook (mirrors the shell's 900px breakpoint) ---------------- */
export function useIsNarrow(query = "(max-width: 900px)") {
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
