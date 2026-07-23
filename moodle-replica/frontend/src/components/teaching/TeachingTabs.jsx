// Teaching tab bar — full WAI-ARIA tabs pattern (spec §14): role=tablist/tab,
// aria-selected, aria-controls, roving tabindex, Arrow/Home/End keys, and the
// active tab scrolled into view on change. Horizontally scrollable on narrow
// screens without ever compressing labels away. Distinct from the shared
// <Tabs/> (which is a plain button strip used by teammates' pages) because this
// one carries icons + the richer keyboard model this page needs.
import { useEffect, useRef } from "react";
import Icon from "./icons";

export const tabPanelId = (key) => `teach-panel-${key}`;
const tabId = (key) => `teach-tab-${key}`;

export default function TeachingTabs({ tabs, active, onChange, lang }) {
  const listRef = useRef(null);
  const activeRef = useRef(null);

  // Keep the selected tab visible when it changes (spec §14).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  function onKeyDown(e) {
    const keys = tabs.map((t) => t.key);
    const i = keys.indexOf(active);
    let next = null;
    if (e.key === "ArrowRight") next = keys[(i + 1) % keys.length];
    else if (e.key === "ArrowLeft") next = keys[(i - 1 + keys.length) % keys.length];
    else if (e.key === "Home") next = keys[0];
    else if (e.key === "End") next = keys[keys.length - 1];
    if (next == null) return;
    e.preventDefault();
    onChange(next);
    // move focus to the newly selected tab (automatic activation)
    window.requestAnimationFrame(() =>
      listRef.current?.querySelector(`#${CSS.escape(tabId(next))}`)?.focus(),
    );
  }

  return (
    <div className="t-tabs" role="tablist" aria-label={lang === "ar" ? "أقسام التدريس" : "Teaching sections"} ref={listRef} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            id={tabId(t.key)}
            ref={on ? activeRef : null}
            role="tab"
            type="button"
            aria-selected={on}
            aria-controls={tabPanelId(t.key)}
            tabIndex={on ? 0 : -1}
            className={`t-tab ${on ? "t-tab--on" : ""}`}
            onClick={() => onChange(t.key)}
          >
            <Icon name={t.icon} size={18} />
            <span className="t-tab__label">
              <span>{t.en}</span>
              <span className="teach-ar" lang="ar">
                {t.ar}
              </span>
            </span>
            {t.badge != null && t.badge > 0 ? <span className="t-tab__badge">{t.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
