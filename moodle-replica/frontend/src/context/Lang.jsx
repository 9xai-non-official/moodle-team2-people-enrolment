// Scoped bilingual direction. The app is inline-bilingual (EN + AR shown
// together), so there is no translation layer here — this context only carries
// the reading DIRECTION so the shell chrome (header + sidebar) and the
// Dashboard can mirror to RTL when Arabic is chosen. It deliberately never sets
// `document.documentElement.dir`: forcing RTL onto the whole <html> would flip
// every teammate's page too. Callers apply `dir` to the specific regions they
// own instead. Preference persists in localStorage.
import { createContext, useContext, useEffect, useState } from "react";

const KEY = "lang";
const LangContext = createContext({ lang: "en", dir: "ltr", setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() =>
    localStorage.getItem(KEY) === "ar" ? "ar" : "en",
  );

  const setLang = (next) => {
    const l = next === "ar" ? "ar" : "en";
    localStorage.setItem(KEY, l);
    setLangState(l);
  };

  // <html lang> is safe to set (assistive tech reads it); <html dir> is NOT —
  // see the file header. Direction is applied per-region by consumers.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <LangContext.Provider value={{ lang, dir, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
