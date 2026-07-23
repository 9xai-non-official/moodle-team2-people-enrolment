import { useEffect, useRef, useState } from "react";
import { apiGet, USE_MOCKS } from "./api";
import { ActingUserProvider, useActingUser } from "./context/ActingUser";
import { SelectedCourseProvider } from "./context/SelectedCourse";
import { SessionProvider, useSession } from "./context/Session";
import { LangProvider, useLang } from "./context/Lang";
import { ThemeProvider, useTheme } from "./context/Theme";
import { PAGES, navFor } from "./pages";
import AuthPage from "./pages/AuthPage";
import WelcomeTour, { tourSeen } from "./components/common/WelcomeTour";
import CommandPalette from "./components/common/CommandPalette";
import PersonaStrip from "./components/common/PersonaStrip";
import { personaBlurb, personaLabel } from "./lib/personas";
import { SCRIPT } from "./lib/presenterScript";
import "./App.css";

function ActingUserSelect() {
  const { users, actingUser, setActingUserId, error } = useActingUser();
  if (error) return <span className="acting-user">users: {error}</span>;
  return (
    <label
      className="acting-user"
      title={
        personaBlurb(actingUser?.username) ??
        "Everything you see and may do depends on who you are."
      }
    >
      Acting as
      <select
        className="select select--header"
        value={actingUser?.id ?? ""}
        onChange={(e) => setActingUserId(Number(e.target.value))}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name} — {personaLabel(u.username)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActivityBar() {
  const [busy, setBusy] = useState(0);
  useEffect(() => {
    const h = (e) => setBusy(e.detail);
    window.addEventListener("api-activity", h);
    return () => window.removeEventListener("api-activity", h);
  }, []);
  return busy > 0 ? <div className="activity-bar" /> : null;
}

function WriteToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let timer;
    const h = (e) => {
      const { method, path } = e.detail;
      const verb =
        method === "DELETE" ? "Removed" : method === "PATCH" ? "Updated" : "Saved";
      setMsg(`${verb} ✓ ${path.split("?")[0]}`);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2200);
    };
    window.addEventListener("api-write", h);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("api-write", h);
    };
  }, []);
  return msg ? <div className="toast">{msg}</div> : null;
}

function PresenterCard({ page }) {
  const steps = SCRIPT[page];
  if (!steps) return null;
  return (
    <div className="presenter-card">
      <div className="presenter-card__title">🎤 {page}</div>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

/* ---- WhoCan brand + nav icons (currentColor, no external deps) ----------
   Mirrors the login splash (AuthPage): navy "Who" + orange "Can" wordmark,
   three-figure logo mark, and one line-icon per nav page. Icons use the same
   stroke style as the login glyphs so the shell reads as the same product. */
function LogoMark() {
  return (
    <svg className="wc-logo-mark" viewBox="0 0 48 40" aria-hidden="true">
      <circle cx="24" cy="7" r="5.5" fill="#ef7d2e" />
      <path d="M14 30c0-6 4.5-10 10-10s10 4 10 10v3H14z" fill="#ef7d2e" />
      <circle cx="9" cy="11" r="4.5" fill="#2f6fd6" />
      <path d="M1 32c0-5 3.6-8.5 8-8.5s8 3.5 8 8.5v2H1z" fill="#2f6fd6" />
      <circle cx="39" cy="11" r="4.5" fill="#22285f" />
      <path d="M31 32c0-5 3.6-8.5 8-8.5s8 3.5 8 8.5v2H31z" fill="#22285f" />
    </svg>
  );
}

// Panel-left toggle — clearly reads as "collapse/expand the side panel". The
// bar mirrors under RTL and the whole glyph rotates when collapsed (CSS).
function PanelIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

function ChevronDown(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const NAV_GLYPHS = {
  Dashboard: (
    <>
      <path d="M12 13a2 2 0 0 0 1.7-3l3-2.7-3.6 1.8A2 2 0 0 0 10 13z" />
      <path d="M4.2 17.5a9 9 0 1 1 15.6 0" />
    </>
  ),
  Courses: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H5.5A1.5 1.5 0 0 1 4 16z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6h5.9A1.5 1.5 0 0 0 20 16z" />
    </>
  ),
  Teaching: (
    <>
      <rect x="3" y="3" width="18" height="12" rx="1.5" />
      <path d="M7 20h10M12 15v5" />
      <path d="M7 8h6M7 11h4" />
    </>
  ),
  Demos: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
      <path d="M11 8l3.5 2L11 12z" />
    </>
  ),
  Enrolment: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.6 0 3 .5 4.2 1.4" />
      <path d="M17 11v6M20 14h-6" />
    </>
  ),
  Roles: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <rect x="9.5" y="11" width="5" height="4.5" rx="1" />
      <path d="M10.6 11V9.9a1.4 1.4 0 0 1 2.8 0V11" />
    </>
  ),
  Groups: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.2 3.2 0 0 1 0 6.4" />
      <path d="M18 14c2.3.6 4 2.7 4 5.2" />
    </>
  ),
  Progress: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l3.5-4 3 2.5L21 7" />
      <path d="M21 11V7h-4" />
    </>
  ),
};

// Arabic nav labels — shown beside the English label (inline bilingual).
const NAV_AR = {
  Dashboard: "لوحة التحكم",
  Courses: "المقررات",
  Teaching: "التدريس",
  Demos: "العروض",
  Enrolment: "التسجيل",
  Roles: "الأدوار",
  Groups: "المجموعات",
  "My Groups": "مجموعاتي",
  Progress: "التقدّم",
};

function NavIcon({ name }) {
  return (
    <svg className="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {NAV_GLYPHS[name] ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}

// Backend health pill — text carries the state (never colour alone); the dot
// is a redundant cue and pulses while checking. Tooltip is bilingual.
const HEALTH_LABEL = {
  checking: { en: "API Checking", ar: "جارٍ الفحص" },
  online: { en: "API Online", ar: "متصل" },
  degraded: { en: "API Degraded", ar: "محدود" },
  offline: { en: "API Offline", ar: "غير متصل" },
};
function ApiStatus({ health }) {
  const m = HEALTH_LABEL[health] ?? HEALTH_LABEL.checking;
  return (
    <div
      className={`api-status api-status--${health}`}
      role="status"
      title={`Backend health — ${m.en} · ${m.ar}`}
    >
      <span className="dot" aria-hidden="true" />
      <span className="api-status__txt">{m.en}</span>
    </div>
  );
}

// EN | العربية switch. Sets reading direction for the shell + Dashboard only
// (see context/Lang.jsx); the active language is orange, the other light.
function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language — اللغة">
      <button
        type="button"
        lang="en"
        className={`lang-switch__opt ${lang === "en" ? "lang-switch__opt--on" : ""}`}
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <span className="lang-switch__div" aria-hidden="true" />
      <button
        type="button"
        lang="ar"
        className={`lang-switch__opt ${lang === "ar" ? "lang-switch__opt--on" : ""}`}
        aria-pressed={lang === "ar"}
        onClick={() => setLang("ar")}
      >
        العربية
      </button>
    </div>
  );
}

/* ---- theme + notification icons (same stroke family as the nav glyphs) --- */
function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}
function MonitorIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

// Light / Dark / System segmented control. The active option is orange (brand),
// each option carries a bilingual accessible name, and aria-pressed marks the
// current choice. Non-directional icons, so they are not mirrored under RTL.
const THEME_OPTS = [
  { key: "light", icon: SunIcon, en: "Use light theme", ar: "استخدام الوضع الفاتح" },
  { key: "dark", icon: MoonIcon, en: "Use dark theme", ar: "استخدام الوضع الداكن" },
  { key: "system", icon: MonitorIcon, en: "Use system theme", ar: "استخدام إعداد النظام" },
];
function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { lang } = useLang();
  return (
    <div className="theme-switch" role="group" aria-label={lang === "ar" ? "سمة العرض — Theme" : "Theme — سمة العرض"}>
      {THEME_OPTS.map((o) => {
        const Ic = o.icon;
        const on = theme === o.key;
        return (
          <button
            key={o.key}
            type="button"
            className={`theme-switch__opt ${on ? "theme-switch__opt--on" : ""}`}
            aria-pressed={on}
            aria-label={lang === "ar" ? o.ar : o.en}
            title={`${o.en} · ${o.ar}`}
            onClick={() => setTheme(o.key)}
          >
            <Ic className="theme-switch__ic" />
          </button>
        );
      })}
    </div>
  );
}

// Notification bell. Honest by design: this build has no notifications backend
// (see the inspection — only /api/permissions/decisions is real, and it is the
// Dashboard's activity feed), so the bell is a presentational control that opens
// an accessible popover with a truthful empty state rather than a fabricated
// count. No fake badge — status is never implied by a number that isn't real.
function NotificationBell() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const label = lang === "ar" ? "الإشعارات، لا توجد إشعارات جديدة" : "Notifications, no new notifications";

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="notif" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="notif__btn"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon className="notif__ic" />
      </button>
      {open && (
        <div className="notif__pop" role="dialog" aria-label={lang === "ar" ? "الإشعارات" : "Notifications"}>
          <div className="notif__head">
            <span>Notifications</span>
            <span className="dash-ar" lang="ar">الإشعارات</span>
          </div>
          <div className="notif__empty">
            <BellIcon className="notif__empty-ic" />
            <p>
              You're all caught up.
              <span className="dash-ar" lang="ar">لا توجد إشعارات جديدة.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Acting-user avatar + dropdown. Identity is obvious in the trigger; the menu
// holds the meta actions that used to be emoji buttons (tour, presenter, exit).
// Persona SWITCHING stays in the header select / PersonaStrip / Dashboard.
function AvatarMenu({ session, signOut }) {
  const { actingUser } = useActingUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const explore = session.mode === "explore";
  const person = explore ? actingUser : session.user;
  const name = person?.full_name ?? (explore ? "Explorer" : "You");
  const role = person ? personaLabel(person.username) : explore ? "explore mode" : "";
  const initial = (name?.[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    popRef.current?.querySelector("[role='menuitem']")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="user-menu__meta">
          <span className="user-menu__eyebrow">{explore ? "Acting as" : "Signed in"}</span>
          <span className="user-menu__name">{name}</span>
        </span>
        <ChevronDown className="user-menu__chev" />
      </button>

      {open && (
        <div className="user-menu__pop" role="menu" ref={popRef}>
          <div className="user-menu__id">
            <span className="user-menu__avatar user-menu__avatar--lg" aria-hidden="true">
              {initial}
            </span>
            <span className="user-menu__idtext">
              <span className="user-menu__name">{name}</span>
              {role && <span className="user-menu__role">{role}</span>}
            </span>
          </div>
          <div className="user-menu__sep" />
          <button
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent("open-tour"));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.3a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.3 1-1.3 1.8v.3" />
              <path d="M12 16.6h.01" />
            </svg>
            What is this app?
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-presenter"))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="12" rx="1.5" />
              <path d="M8 20h8M12 16v4" />
            </svg>
            Presenter mode
          </button>
          <div className="user-menu__sep" />
          <button
            type="button"
            role="menuitem"
            className="user-menu__item user-menu__item--danger"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
              <path d="M10 8l-4 4 4 4M6 12h9" />
            </svg>
            {explore ? "Leave explore mode" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { session, signOut } = useSession();
  const { setActingUserId } = useActingUser();
  const { lang, dir } = useLang();
  const [active, setActive] = useState("Dashboard");
  const [health, setHealth] = useState("checking");
  const navItems = navFor(session);
  const [tourOpen, setTourOpen] = useState(() => !tourSeen());
  const [presenter, setPresenter] = useState(
    () => localStorage.getItem("presenter") === "1",
  );
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "1",
  );
  // Below the tablet breakpoint the sidebar becomes an off-canvas drawer.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarRef = useRef(null);
  const toggleRef = useRef(null);
  const wasDrawerOpen = useRef(false);

  function toggleSidebar() {
    setCollapsed((c) => {
      localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  // The one toggle button drives collapse on desktop, drawer on mobile.
  function handleToggle() {
    if (isMobile) setDrawerOpen((o) => !o);
    else toggleSidebar();
  }

  function goTo(item) {
    setActive(item);
    if (isMobile) setDrawerOpen(false);
  }

  // Track the tablet breakpoint; leaving mobile always closes the drawer.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const h = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setDrawerOpen(false);
    };
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // Mobile drawer: lock body scroll, trap Tab focus, Escape closes.
  useEffect(() => {
    if (!(isMobile && drawerOpen)) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.disabled);
    focusables()[0]?.focus();
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setDrawerOpen(false);
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
    };
  }, [isMobile, drawerOpen]);

  // Return focus to the toggle when the drawer closes.
  useEffect(() => {
    if (wasDrawerOpen.current && !drawerOpen) toggleRef.current?.focus();
    wasDrawerOpen.current = drawerOpen;
  }, [drawerOpen]);

  // Keyboard nav: 1..N switch pages (ignored while typing in a field).
  useEffect(() => {
    function onKey(e) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < navItems.length) setActive(navItems[idx]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navItems]);

  // Signing out (or a role losing a page) never strands you on a dead page.
  useEffect(() => {
    if (!navItems.includes(active)) setActive("Dashboard");
  }, [navItems, active]);

  // Session drives identity: signed-in users ACT as themselves everywhere.
  useEffect(() => {
    if (session?.mode === "user" && session.user) setActingUserId(session.user.id);
  }, [session, setActingUserId]);

  // Command-palette meta actions dispatch these; Shell owns the state they touch.
  useEffect(() => {
    const openTour = () => setTourOpen(true);
    const togglePres = () =>
      setPresenter((p) => {
        localStorage.setItem("presenter", p ? "0" : "1");
        return !p;
      });
    window.addEventListener("open-tour", openTour);
    window.addEventListener("toggle-presenter", togglePres);
    return () => {
      window.removeEventListener("open-tour", openTour);
      window.removeEventListener("toggle-presenter", togglePres);
    };
  }, []);

  useEffect(() => {
    apiGet("/api/health")
      .then((data) => setHealth(data.status === "ok" ? "online" : "degraded"))
      .catch(() => setHealth("offline"));
  }, []);

  // Any error banner, clicked → bug-report line on the clipboard
  // ("[page] message") ready to paste at the owning teammate (task 06 §5).
  useEffect(() => {
    function copyError(e) {
      const banner = e.target.closest(".error-banner");
      if (!banner) return;
      const page = document.querySelector(".nav-item--active")?.textContent ?? "?";
      navigator.clipboard?.writeText(`[${page}] ${banner.textContent}`);
      const prev = banner.textContent;
      banner.textContent = "copied for bug report ✓";
      setTimeout(() => {
        banner.textContent = prev;
      }, 800);
    }
    document.addEventListener("click", copyError);
    return () => document.removeEventListener("click", copyError);
  }, []);

  if (!session) return <AuthPage />;

  const Page = PAGES[active];
  const desktopCollapsed = !isMobile && collapsed;
  const toggleLabel = isMobile
    ? drawerOpen
      ? lang === "ar" ? "طي القائمة الجانبية" : "Close sidebar"
      : lang === "ar" ? "فتح القائمة الجانبية" : "Open sidebar"
    : collapsed
      ? lang === "ar" ? "فتح القائمة الجانبية" : "Expand sidebar"
      : lang === "ar" ? "طي القائمة الجانبية" : "Collapse sidebar";

  return (
    <div
      className={`app ${desktopCollapsed ? "app--collapsed" : ""} ${
        isMobile && drawerOpen ? "app--drawer-open" : ""
      }`}
    >
      <header className="app-header" dir={dir}>
        <div className="app-header__left">
          <button
            ref={toggleRef}
            className={`sidebar-toggle ${desktopCollapsed ? "sidebar-toggle--collapsed" : ""}`}
            aria-label={toggleLabel}
            aria-expanded={isMobile ? drawerOpen : !collapsed}
            aria-controls="app-sidebar"
            title={toggleLabel}
            onClick={handleToggle}
          >
            <PanelIcon width="22" height="22" />
          </button>
          <div className="wc-brand">
            <LogoMark />
            <span className="wc-brand__text">
              <span className="wc-brand__name">
                <span className="wc-brand__who">Who</span>
                <span className="wc-brand__can">Can</span>
              </span>
              <span className="wc-brand__sub">people &amp; enrolment</span>
            </span>
          </div>
          {USE_MOCKS && <span className="mock-badge">MOCK DATA</span>}
        </div>

        <div className="app-header__right">
          <ApiStatus health={health} />
          <ThemeSwitcher />
          <LanguageSwitcher />
          {session.mode === "explore" && <ActingUserSelect />}
          <NotificationBell />
          <span className="app-header__sep" aria-hidden="true" />
          <AvatarMenu session={session} signOut={signOut} />
        </div>
      </header>
      {session.mode === "explore" && <PersonaStrip />}
      <WelcomeTour open={tourOpen} onClose={() => setTourOpen(false)} />
      <CommandPalette onNavigate={setActive} />
      <ActivityBar />
      <WriteToast />
      {presenter && <PresenterCard page={active} />}

      <div className="app-body">
        {isMobile && drawerOpen && (
          <div
            className="sidebar-backdrop"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
        )}
        <nav
          id="app-sidebar"
          ref={sidebarRef}
          className={`sidebar ${desktopCollapsed ? "sidebar--collapsed" : ""} ${
            isMobile ? "sidebar--drawer" : ""
          }`}
          aria-label="Sections — الأقسام"
          aria-hidden={isMobile && !drawerOpen ? true : undefined}
          dir={dir}
        >
          {navItems.map((item, i) => (
            <button
              key={item}
              className={`nav-item ${active === item ? "nav-item--active" : ""}`}
              title={desktopCollapsed ? `${item} · ${NAV_AR[item]}` : undefined}
              aria-current={active === item ? "page" : undefined}
              tabIndex={isMobile && !drawerOpen ? -1 : undefined}
              onClick={() => goTo(item)}
            >
              <NavIcon name={item} />
              <span className="nav-item__label">
                <span className="nav-item__en">{item}</span>
                <span className="nav-item__ar" lang="ar">{NAV_AR[item]}</span>
              </span>
              <kbd className="nav-item__key">{i + 1}</kbd>
            </button>
          ))}

          {/* Logout lives at the foot of the sidebar (spec §10), separated from
              navigation; it reuses the session's sign-out action. The avatar
              menu keeps its own sign-out too — this is the always-visible one. */}
          <div className="sidebar__spacer" aria-hidden="true" />
          <button
            className="nav-item nav-item--logout"
            title={desktopCollapsed ? (lang === "ar" ? "تسجيل الخروج · Logout" : "Logout · تسجيل الخروج") : undefined}
            tabIndex={isMobile && !drawerOpen ? -1 : undefined}
            onClick={signOut}
          >
            <svg className="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
              <path d="M10 8l-4 4 4 4M6 12h9" />
            </svg>
            <span className="nav-item__label">
              <span className="nav-item__en">{session.mode === "explore" ? "Leave" : "Logout"}</span>
              <span className="nav-item__ar" lang="ar">تسجيل الخروج</span>
            </span>
          </button>
        </nav>

        <main className="content" dir={active === "Dashboard" ? dir : "ltr"} lang={active === "Dashboard" ? lang : undefined}>
          <Page onNavigate={setActive} />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <LangProvider>
          <ActingUserProvider>
            <SelectedCourseProvider>
              <Shell />
            </SelectedCourseProvider>
          </ActingUserProvider>
        </LangProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
