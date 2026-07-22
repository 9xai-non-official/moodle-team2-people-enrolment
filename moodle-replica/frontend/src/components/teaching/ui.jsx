// Teaching UI primitives — small, presentational, accessible building blocks
// shared by every tab. Reuses the shared ReasonList/Badge where they fit and
// adds the pieces the shared kit lacks (focus-trapped dialog, roving-focus
// menu, accessible pagination, status pills, progress bar). All colour comes
// from --wc-* tokens / tone families; dark handled in App.css.
import { useEffect, useRef, useState, useCallback } from "react";
import Icon from "./icons";
import ReasonList from "../common/ReasonList";
import {
  avatarTone,
  initials,
  statusLabel,
  clampPct,
  errReasons,
} from "../../lib/teaching";

// ---- inline bilingual text ------------------------------------------------
export function Bi({ en, ar, className = "" }) {
  return (
    <>
      <span className={className}>{en}</span>
      {ar ? (
        <span className="teach-ar" lang="ar">
          {ar}
        </span>
      ) : null}
    </>
  );
}

// ---- avatar ---------------------------------------------------------------
export function Avatar({ name, size = 36 }) {
  return (
    <span
      className={`t-avatar t-avatar--${avatarTone(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

// ---- status pill (icon + bilingual text + tooltip; never colour-only) -----
export function StatusPill({ status, note }) {
  const s = statusLabel(status);
  return (
    <span className={`t-pill t-pill--${s.tone}`} title={note ?? `${s.en} · ${s.ar}`}>
      <Icon name={s.icon} size={13} />
      <span>{s.en}</span>
      {s.ar ? (
        <span className="teach-ar" lang="ar">
          {s.ar}
        </span>
      ) : null}
    </span>
  );
}

// Generic tone pill for arbitrary bilingual labels (roles, request status…).
export function TonePill({ tone = "grey", icon, en, ar, title }) {
  return (
    <span className={`t-pill t-pill--${tone}`} title={title ?? (ar ? `${en} · ${ar}` : en)}>
      {icon ? <Icon name={icon} size={13} /> : null}
      <span>{en}</span>
      {ar ? (
        <span className="teach-ar" lang="ar">
          {ar}
        </span>
      ) : null}
    </span>
  );
}

// ---- progress bar (accessible; % beside the bar for contrast) -------------
export function ProgressBar({ percent, lang, label }) {
  const pct = clampPct(percent);
  if (pct == null)
    return <span className="t-prog__na" title={lang === "ar" ? "لا ينطبق" : "Not applicable"}>—</span>;
  return (
    <div className="t-prog">
      <div
        className="t-prog__track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? (lang === "ar" ? `التقدّم ${pct}٪` : `Progress ${pct}%`)}
      >
        <div className="t-prog__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="t-prog__pct">{pct}%</span>
    </div>
  );
}

// ---- summary card (fixed height across states — spec §16) -----------------
export function SummaryCard({ tone = "blue", icon, value, en, ar, loading }) {
  return (
    <div className={`t-sum t-sum--${tone}`}>
      <span className="t-sum__ic" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="t-sum__body">
        {loading ? (
          <span className="t-sum__value t-sum__value--skel" aria-hidden="true" />
        ) : (
          <span className="t-sum__value">{value}</span>
        )}
        <span className="t-sum__label">
          <span>{en}</span>
          <span className="teach-ar" lang="ar">
            {ar}
          </span>
        </span>
      </span>
    </div>
  );
}

// ---- empty state ----------------------------------------------------------
export function EmptyState({ icon = "inbox", en, ar, children, compact }) {
  return (
    <div className={`t-empty ${compact ? "t-empty--compact" : ""}`}>
      <Icon name={icon} size={compact ? 26 : 34} className="t-empty__ic" />
      <p>
        <span>{en}</span>
        {ar ? (
          <span className="teach-ar" lang="ar">
            {ar}
          </span>
        ) : null}
      </p>
      {children}
    </div>
  );
}

// ---- error state (retry + verbatim backend reasons) -----------------------
export function ErrorState({ error, onRetry, compact, offline }) {
  return (
    <div className={`t-error ${compact ? "t-error--compact" : ""}`}>
      <Icon name={offline ? "cloudOff" : "triangleAlert"} size={compact ? 24 : 30} className="t-error__ic" />
      <div className="t-error__body">
        <p className="t-error__lead">
          <span>Couldn't load this.</span>
          <span className="teach-ar" lang="ar">تعذّر تحميل البيانات.</span>
        </p>
        <ReasonList reasons={errReasons(error)} />
      </div>
      {onRetry && (
        <button type="button" className="t-btn t-btn--ghost t-btn--sm" onClick={onRetry}>
          <Icon name="refreshCw" size={15} />
          <Bi en="Retry" ar="إعادة المحاولة" />
        </button>
      )}
    </div>
  );
}

// ---- live status line (aria-live for important mutations — spec §46) ------
export function useAnnounce() {
  const [msg, setMsg] = useState("");
  const announce = useCallback((m) => {
    setMsg("");
    // next tick so repeated identical messages are still announced
    window.requestAnimationFrame(() => setMsg(m));
  }, []);
  const node = (
    <span className="t-sr-only" role="status" aria-live="polite">
      {msg}
    </span>
  );
  return [node, announce];
}

// ---- focus-trapped dialog -------------------------------------------------
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, titleEn, titleAr, children, footer, dir, size = "md" }) {
  const panelRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    (focusables()[0] ?? panelRef.current)?.focus();

    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) {
        e.preventDefault();
        return;
      }
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
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="t-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className={`t-dialog t-dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={titleAr ? `${titleEn} · ${titleAr}` : titleEn}
        dir={dir}
        tabIndex={-1}
      >
        <div className="t-dialog__head">
          <strong>
            <Bi en={titleEn} ar={titleAr} />
          </strong>
          <button type="button" className="t-dialog__close" onClick={onClose} aria-label={dir === "rtl" ? "إغلاق" : "Close"}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="t-dialog__body">{children}</div>
        {footer && <div className="t-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---- accessible dropdown menu (roving focus) ------------------------------
// items: [{ key, icon, en, ar, danger, disabled, disabledReason, onSelect }]
export function Menu({ triggerLabel, triggerIcon = "ellipsisVertical", triggerText, items, align = "end", variant = "icon" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, [open]);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  }

  function onKey(e) {
    const nodes = Array.from(listRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const idx = nodes.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nodes[(idx + 1) % nodes.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      nodes[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      nodes[nodes.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="t-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className={variant === "text" ? "t-btn t-btn--ghost t-btn--sm" : "t-iconbtn"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerLabel}
        disabled={!items.length}
        onClick={() => setOpen((o) => !o)}
      >
        {triggerText ? <span>{triggerText}</span> : null}
        <Icon name={variant === "text" ? "chevronDown" : triggerIcon} size={variant === "text" ? 15 : 18} />
      </button>
      {open && (
        <div
          ref={listRef}
          className={`t-menu__pop t-menu__pop--${align}`}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onKey}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={it.disabled || undefined}
              title={it.disabled ? it.disabledReason : undefined}
              className={`t-menu__item ${it.danger ? "t-menu__item--danger" : ""} ${it.disabled ? "t-menu__item--disabled" : ""}`}
              onClick={() => {
                if (it.disabled) return;
                close(false);
                it.onSelect?.();
              }}
            >
              {it.icon ? <Icon name={it.icon} size={16} /> : <span className="t-menu__gap" />}
              <span className="t-menu__label">
                <span>{it.en}</span>
                {it.ar ? (
                  <span className="teach-ar" lang="ar">
                    {it.ar}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- pagination (real buttons, disabled ends, bilingual summary) ----------
export function Pagination({ page, pageCount, total, pageSize, onPage, lang, nounEn = "items", nounAr = "عناصر" }) {
  if (pageCount <= 1 && total <= pageSize) return null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <div className="t-pager">
      <span className="t-pager__count">
        <span>
          {lang === "ar"
            ? `عرض ${from} إلى ${to} من أصل ${total} ${nounAr}`
            : `Showing ${from} to ${to} of ${total} ${nounEn}`}
        </span>
      </span>
      <div className="t-pager__controls">
        <button
          type="button"
          className="t-iconbtn t-pager__btn"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label={lang === "ar" ? "الصفحة السابقة" : "Previous page"}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`t-pager__page ${p === page ? "t-pager__page--on" : ""}`}
            aria-current={p === page ? "page" : undefined}
            aria-label={lang === "ar" ? `الصفحة ${p}` : `Page ${p}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="t-iconbtn t-pager__btn"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label={lang === "ar" ? "الصفحة التالية" : "Next page"}
        >
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  );
}

// ---- sortable column header button ----------------------------------------
export function SortHeader({ label, ar, active, dir, onSort, align }) {
  return (
    <button
      type="button"
      className={`t-sort ${active ? "t-sort--on" : ""} ${align === "end" ? "t-sort--end" : ""}`}
      onClick={onSort}
    >
      <span>
        <span>{label}</span>
        {ar ? (
          <span className="teach-ar" lang="ar">
            {ar}
          </span>
        ) : null}
      </span>
      <Icon name={active ? (dir === "asc" ? "arrowUp" : "arrowDown") : "arrowUpDown"} size={14} />
    </button>
  );
}
