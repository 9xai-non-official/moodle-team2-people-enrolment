// Dashboard "first five minutes" checklist — five things to try, self-ticked,
// each jumps you there. All five ticked → collapse to a done line + hide.
import { useState } from "react";

const STEPS = [
  { slug: "tour", label: "Take the tour", go: () => window.dispatchEvent(new CustomEvent("open-tour")) },
  { slug: "persona", label: "Become somebody else", hint: "use the chips above" },
  { slug: "roles", label: "Run a permission scenario", nav: "Roles" },
  { slug: "demos", label: "Drop & return a student, live", nav: "Demos" },
  { slug: "progress", label: "Find the hidden activity", nav: "Progress" },
];

export default function FirstFiveMinutes({ onNavigate }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem("ffm-hidden") === "1");
  const [done, setDone] = useState(() =>
    Object.fromEntries(
      STEPS.map((s) => [s.slug, localStorage.getItem(`ffm-${s.slug}`) === "1"]),
    ),
  );

  if (hidden) return null;

  function toggle(slug) {
    setDone((d) => {
      const next = { ...d, [slug]: !d[slug] };
      localStorage.setItem(`ffm-${slug}`, next[slug] ? "1" : "0");
      return next;
    });
  }

  function hide() {
    localStorage.setItem("ffm-hidden", "1");
    setHidden(true);
  }

  const allDone = STEPS.every((s) => done[s.slug]);

  return (
    <div className="panel">
      <div className="panel__title ffm__head">
        {allDone ? "You've seen the whole story ✓" : "Your first five minutes"}
        {allDone && (
          <button className="page-intro__more ffm__hide" onClick={hide}>
            hide
          </button>
        )}
      </div>
      {STEPS.map((s) => (
        <div className="ffm__row" key={s.slug}>
          <label className="ffm__check">
            <input
              type="checkbox"
              checked={done[s.slug]}
              onChange={() => toggle(s.slug)}
            />
            {s.label}
          </label>
          {s.hint ? (
            <span className="muted">{s.hint}</span>
          ) : (
            <button
              className="btn"
              onClick={s.nav ? () => onNavigate(s.nav) : s.go}
            >
              go →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
