// The four hard-case selector cards, as a real ARIA tablist (spec §13/§18):
// roving tabindex, Arrow/Home/End navigation (mirrored under RTL), aria-selected
// + aria-controls, a check badge on the active card, and per-scenario accent
// colour (HC2 — the live mutating demo — is orange; the read-only proofs blue).
// Selection follows focus (automatic activation), the standard tablist pattern.
import { useRef } from "react";
import Icon from "./icons";

export default function ScenarioTabs({ scenarios, active, onChange, panelId, lang = "en", dir = "ltr" }) {
  const btnRefs = useRef([]);
  const activeIdx = Math.max(0, scenarios.findIndex((s) => s.id === active));

  function focusTo(idx) {
    const s = scenarios[idx];
    if (!s) return;
    onChange(s.id);
    btnRefs.current[idx]?.focus();
  }

  function onKeyDown(e) {
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === forward || e.key === "ArrowDown") next = (activeIdx + 1) % scenarios.length;
    else if (e.key === back || e.key === "ArrowUp") next = (activeIdx - 1 + scenarios.length) % scenarios.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = scenarios.length - 1;
    if (next === null) return;
    e.preventDefault();
    focusTo(next);
  }

  return (
    <div
      role="tablist"
      aria-label={lang === "ar" ? "الحالات الصعبة — Hard cases" : "Hard cases — الحالات الصعبة"}
      aria-orientation="horizontal"
      className="dm-scenarios"
      onKeyDown={onKeyDown}
    >
      {scenarios.map((s, i) => {
        const on = s.id === active;
        return (
          <button
            key={s.id}
            ref={(el) => (btnRefs.current[i] = el)}
            role="tab"
            id={`dm-tab-${s.id}`}
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            className={`dm-scn dm-scn--${s.accent}${on ? " dm-scn--on" : ""}`}
            onClick={() => onChange(s.id)}
          >
            {on && (
              <span className="dm-scn__check" aria-hidden="true">
                <Icon name="check" />
              </span>
            )}
            <span className="dm-scn__top">
              <span className="dm-scn__code">{s.id}</span>
              <span className="dm-scn__icon">
                <Icon name={s.icon} />
              </span>
            </span>
            <span className="dm-scn__title">
              <span className="dm-scn__en">{s.en}</span>
              <span className="dm-scn__ar" lang="ar">
                {s.ar}
              </span>
            </span>
            <span className="dm-scn__desc">
              {s.descEn}
              <span className="dm-scn__desc-ar" lang="ar">
                {s.descAr}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
