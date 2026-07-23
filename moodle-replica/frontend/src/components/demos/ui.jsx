// Shared presentational primitives for the Demos workspace. Inline-bilingual
// (EN + AR shown together, the app's established idiom — Lang only carries
// direction, there is no translation layer), theme-aware via the shell's
// --wc-* tokens, and accessible by construction. No business logic lives here.
import { useEffect, useRef, useState } from "react";
import Icon from "./icons";

// lang → the right side of a bilingual pair, for aria-labels / titles / option
// text where only ONE string fits. Exported as a const so the lint rule
// (only-export-components / allowConstantExport) stays happy.
export const pick = (lang, en, ar) => (lang === "ar" ? ar : en);

// Inline bilingual label: English then a muted Arabic sibling (the .dash-ar
// idiom used across the shell + Dashboard). `block` renders the Arabic under
// the English (for headings/callouts) instead of beside it.
export function Bi({ en, ar, className = "", block = false }) {
  return (
    <span className={`dm-bi${block ? " dm-bi--block" : ""}${className ? ` ${className}` : ""}`}>
      <span className="dm-bi__en">{en}</span>
      {ar && (
        <span className="dm-bi__ar" lang="ar">
          {ar}
        </span>
      )}
    </span>
  );
}

// Focusable info affordance with an accessible tooltip (spec §31/§32). Not a
// button — it performs no action — but keyboard-reachable so its text is
// discoverable, and exposed to assistive tech via aria-label.
export function InfoDot({ label }) {
  return (
    <span className="dm-info" tabIndex={0} role="img" aria-label={label} title={label}>
      <Icon name="info" />
    </span>
  );
}

// Copy-to-clipboard chip. Announces success politely; never throws if the
// Clipboard API is unavailable (older/embedded webviews).
export function CopyButton({ text, label = "Copy", copiedLabel = "Copied" }) {
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard?.writeText(text);
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1200);
    } catch {
      /* clipboard blocked — no-op, the row text stays selectable */
    }
  }
  return (
    <button type="button" className="dm-copy" onClick={copy} aria-label={done ? copiedLabel : label} title={done ? copiedLabel : label}>
      <Icon name={done ? "check" : "copy"} />
    </button>
  );
}

// HTTP method badge — colour + always-visible text (never colour alone),
// monospaced and fixed-width for a tidy log column.
const METHOD_VARIANT = { GET: "blue", POST: "green", PATCH: "amber", DELETE: "red" };
export function MethodBadge({ method }) {
  const v = METHOD_VARIANT[method] || "neutral";
  return <span className={`dm-method dm-method--${v}`}>{method}</span>;
}

// HTTP status badge. `pending` shows a spinner + text; 2xx green, 4xx amber,
// 5xx/other red. Numeric status stays visible in every state.
export function StatusBadge({ status, reason, lang = "en" }) {
  if (status === "pending") {
    return (
      <span className="dm-status dm-status--pending">
        <Icon name="loader" className="dm-spin" />
        {pick(lang, "Pending", "قيد التنفيذ")}
      </span>
    );
  }
  const n = Number(status);
  const tone = !Number.isFinite(n) ? "err" : n < 300 ? "ok" : n < 500 ? "warn" : "err";
  return (
    <span className={`dm-status dm-status--${tone}`} title={reason || undefined}>
      {String(status)}
    </span>
  );
}

// Enrolment/path provenance chip (manual / self / cohort / guest).
const METHOD_LABEL = {
  manual: { en: "manual", ar: "يدوي" },
  self: { en: "self", ar: "ذاتي" },
  cohort: { en: "cohort", ar: "فوج" },
  guest: { en: "guest", ar: "زائر" },
};
export function ProvenanceChip({ method, live }) {
  const m = METHOD_LABEL[method] || { en: method, ar: "" };
  return (
    <span className={`dm-prov dm-prov--${method}`}>
      <Icon name={method === "cohort" ? "users" : method === "self" ? "hand" : method === "manual" ? "userRound" : "userRound"} />
      <span className="dm-prov__txt">
        {m.en}
        {m.ar && (
          <span className="dm-prov__ar" lang="ar">
            {" "}
            · {m.ar}
          </span>
        )}
      </span>
      <span className={`dm-dot dm-dot--${live ? "live" : "dead"}`} aria-hidden="true" />
      <span className="dm-prov__state">{live ? "live" : "not live"}</span>
    </span>
  );
}

// Accessible progress bar. Clamps to 0–100, never renders NaN%. `null` percent
// means the course has no completion tracking (Moodle's "no bar" rule) and is
// shown as text, not a zero bar (which would read as "0% done").
export function ProgressBar({ percent, label, lang = "en" }) {
  if (percent === null || percent === undefined || Number.isNaN(Number(percent))) {
    return <span className="muted">{pick(lang, "no completion tracking", "لا يوجد تتبّع للإكمال")}</span>;
  }
  const p = Math.max(0, Math.min(100, Math.round(Number(percent))));
  return (
    <div
      className="bar dm-bar"
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${p}%`}
    >
      <div className="bar__fill" style={{ width: `${p}%` }} />
      <span className="bar__label">{p}%</span>
    </div>
  );
}

// Tone-coloured callout with a leading icon. Tones map to the app's semantic
// palette; status is carried by icon + text, not colour alone.
const CALLOUT_ICON = { info: "info", ok: "checkCircle", warn: "alert", danger: "xCircle", neutral: "info", shield: "shieldCheck" };
export function Callout({ tone = "info", role = "note", icon, children }) {
  return (
    <div className={`dm-callout dm-callout--${tone}`} role={role}>
      <Icon name={icon || CALLOUT_ICON[tone] || "info"} className="dm-callout__ic" />
      <div className="dm-callout__body">{children}</div>
    </div>
  );
}

// Standard empty state (icon + bilingual message). Neutral by default.
export function EmptyState({ icon = "info", en, ar, hint }) {
  return (
    <div className="dm-empty" role="status">
      <Icon name={icon} className="dm-empty__ic" />
      <p className="dm-empty__msg">
        {en}
        {ar && (
          <span className="dash-ar" lang="ar">
            {ar}
          </span>
        )}
      </p>
      {hint && <p className="dm-empty__hint">{hint}</p>}
    </div>
  );
}

// Error surface with an optional retry. The error banner text stays visible
// (the shell also lets a click copy it as a bug-report line).
export function ErrorState({ en, ar, detail, onRetry, lang = "en" }) {
  return (
    <div className="dm-errorstate" role="alert">
      <Icon name="cloudOff" className="dm-errorstate__ic" />
      <div>
        <p className="dm-errorstate__msg">
          {en}
          {ar && (
            <span className="dash-ar" lang="ar">
              {ar}
            </span>
          )}
        </p>
        {detail && <p className="dm-errorstate__detail">{detail}</p>}
      </div>
      {onRetry && (
        <button type="button" className="btn dm-retry" onClick={onRetry}>
          <Icon name="refresh" />
          {pick(lang, "Retry", "إعادة المحاولة")}
        </button>
      )}
    </div>
  );
}

// Skeleton lines that match final content height (spec §44). `lines` blocks of
// the shimmering .skeleton primitive.
export function SkeletonRows({ lines = 3 }) {
  return (
    <div className="dm-skel" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="skeleton dm-skel__line" />
      ))}
    </div>
  );
}
