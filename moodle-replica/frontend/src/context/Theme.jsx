// Light / Dark / System theme — the shared shell's colour scheme control.
//
// The app previously had ONLY OS-driven dark mode (App.css @media
// (prefers-color-scheme: dark)) with no way to override it. This context adds
// an explicit, persisted preference while KEEPING the "follow the OS" option:
//
//   preference (whocan-theme) : "light" | "dark" | "system"   (what the user picked)
//   resolved theme            : "light" | "dark"              (what actually renders)
//
// System resolves through matchMedia and re-resolves live when the OS flips.
// The RESOLVED value is written to <html data-theme> and <html style.color-scheme>
// — App.css keys every dark rule off [data-theme="dark"], so System reproduces
// today's OS behaviour exactly (no regression for any page) while explicit
// Light/Dark now win. Unlike Lang (which is deliberately scoped so it can't
// flip teammates' pages), colour scheme was already global via the media query,
// so driving it globally here changes nothing structurally — it just hands the
// user the switch the OS used to hold alone.
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const KEY = "whocan-theme";
const VALID = new Set(["light", "dark", "system"]);
const DARK_MQ = "(prefers-color-scheme: dark)";

function readPreference() {
  try {
    const v = localStorage.getItem(KEY);
    return VALID.has(v) ? v : "system";
  } catch {
    return "system";
  }
}

function systemIsDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(DARK_MQ).matches
  );
}

function resolve(pref) {
  return pref === "system" ? (systemIsDark() ? "dark" : "light") : pref;
}

// Write the resolved scheme to the document root. Kept side-effect-only so both
// the synchronous boot below and the React effect can share it.
function apply(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved; // native form controls / scrollbars follow
}

// No-FOUC boot: runs at MODULE EVALUATION time, before React's first paint
// (main.jsx → App.jsx imports this), so the correct theme is on <html> before
// anything renders. No dependency on index.html, so no shared-entry edits.
if (typeof document !== "undefined") {
  apply(resolve(readPreference()));
}

const ThemeContext = createContext({
  theme: "system", // the preference
  resolved: "light", // what is actually shown
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readPreference);
  const [resolved, setResolved] = useState(() => resolve(readPreference()));

  const setTheme = useCallback((next) => {
    const pref = VALID.has(next) ? next : "system";
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* private mode / storage disabled — preference just won't persist */
    }
    setThemeState(pref);
  }, []);

  // Re-resolve + apply whenever the preference changes, and — while on System —
  // whenever the OS scheme flips. matchMedia's listener keeps System live.
  useEffect(() => {
    const commit = () => {
      const r = resolve(theme);
      setResolved(r);
      apply(r);
    };
    commit();

    if (theme !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(DARK_MQ);
    mq.addEventListener("change", commit);
    return () => mq.removeEventListener("change", commit);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
