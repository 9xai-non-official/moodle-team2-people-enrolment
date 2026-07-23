// Horizontal (→ vertical on mobile) lifecycle timeline that reflects REAL
// execution state: completed nodes get a check, the active node a pulsing
// number, failed a cross. State is exposed to assistive tech as text
// ("Completed/Current/Pending/Failed"), never by colour alone; connectors turn
// solid as their preceding node completes. Direction follows the page (RTL
// mirrors the row); motion respects prefers-reduced-motion (CSS). Spec §23.
import Icon from "./icons";
import { pick } from "./ui";

const STATE_TEXT = {
  done: { en: "Completed", ar: "مكتملة" },
  current: { en: "Current", ar: "الحالية" },
  pending: { en: "Pending", ar: "قيد الانتظار" },
  failed: { en: "Failed", ar: "فشلت" },
};

export default function Lifecycle({ steps, completedCount = 0, activeIndex = -1, failedIndex = -1, lang = "en", titleId }) {
  return (
    <ol className="dm-timeline" aria-labelledby={titleId}>
      {steps.map((s, i) => {
        const state =
          failedIndex === i
            ? "failed"
            : i < completedCount
              ? "done"
              : i === activeIndex
                ? "current"
                : "pending";
        const connDone = i > 0 && i - 1 < completedCount;
        return (
          <li key={i} className={`dm-tl__item dm-tl__item--${state}`}>
            {i > 0 && <span className={`dm-tl__conn${connDone ? " dm-tl__conn--done" : ""}`} aria-hidden="true" />}
            <span className="dm-tl__node" aria-hidden="true">
              {state === "done" ? (
                <Icon name="check" />
              ) : state === "failed" ? (
                <Icon name="x" />
              ) : (
                <span className="dm-tl__num">{i + 1}</span>
              )}
            </span>
            <span className="dm-tl__label">
              <span className="dm-tl__en">{s.en}</span>
              <span className="dm-tl__ar" lang="ar">
                {s.ar}
              </span>
              <span className="dm-visually-hidden">
                {" — "}
                {pick(lang, STATE_TEXT[state].en, STATE_TEXT[state].ar)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
