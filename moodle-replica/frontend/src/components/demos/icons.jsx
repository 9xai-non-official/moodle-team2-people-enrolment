// One consistent line-icon family for the Demos workspace — same stroke style
// (currentColor, 1.75 stroke, 24-box) as the shell nav glyphs and the Dashboard
// icons, so Demos reads as the same product. No emoji, no external deps.
//
// Icons are decorative by default (aria-hidden) — icon-only BUTTONS carry their
// own accessible name. Directional glyphs (chevron/arrow/maximize) take
// `dir` so the page can flip them under RTL via the `.di` marker class
// (CSS: [dir="rtl"] .di { transform: scaleX(-1) }).
const GLYPHS = {
  // people / roles
  userRound: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  userCog: (
    <>
      <circle cx="9" cy="7" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6.3 6.5-6.3 1 0 2 .2 2.8.6" />
      <circle cx="17.5" cy="16.5" r="2.6" />
      <path d="M17.5 12.7v1M17.5 20.3v-1M21 16.5h-1M15 16.5h-1M20 14l-.8.8M15.8 18.2l-.8.8M20 19l-.8-.8M15.8 14.8l-.8-.8" />
    </>
  ),
  users: (
    <>
      <circle cx="8.5" cy="8.5" r="3" />
      <path d="M2.5 19c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6" />
      <path d="M16 6a3 3 0 0 1 0 5.9" />
      <path d="M18 13.6c2.1.5 3.5 2.3 3.5 4.7" />
    </>
  ),
  usersThree: (
    <>
      <circle cx="12" cy="7.5" r="2.7" />
      <circle cx="5" cy="10" r="2.3" />
      <circle cx="19" cy="10" r="2.3" />
      <path d="M8 19c0-2.3 1.8-4 4-4s4 1.7 4 4" />
      <path d="M1.5 18.5c0-2 1.4-3.4 3.5-3.4M22.5 18.5c0-2-1.4-3.4-3.5-3.4" />
    </>
  ),
  gitBranch: (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="7" r="2.4" />
      <path d="M6 8.4v7.2" />
      <path d="M18 9.4c0 4-3.4 4.8-6 5.2" />
    </>
  ),
  hand: (
    <>
      <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10" />
      <path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V10" />
      <path d="M14 10V6a1.5 1.5 0 0 1 3 0v7c0 3.9-2.6 7-6.5 7A6.5 6.5 0 0 1 4 13.5l.4-.7a1.6 1.6 0 0 1 2.7.2L8 14.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  unlink: (
    <>
      <path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l2.5-2.5" />
      <path d="M14.5 9.5 17 7a3.5 3.5 0 0 1 5 5l-2.5 2.5" />
      <path d="M8 4.5V2M4.5 8H2M16 19.5V22M19.5 16H22" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
    </>
  ),
  combine: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <path d="M15 5h5M15 8h3" />
      <path d="M7 15v5M4 17h6" />
      <path d="M14 16l3 3 3-3M17 13v6" />
    </>
  ),
  listChecks: (
    <>
      <path d="M4 6l1.5 1.5L8.5 4" />
      <path d="M4 13l1.5 1.5L8.5 10" />
      <path d="M4 19.5 5.5 21 8.5 17.5" />
      <path d="M12 6h9M12 13h9M12 20h9" />
    </>
  ),
  // lifecycle / actions
  rotate: (
    <>
      <path d="M4 11a8 8 0 1 1 1.2 4.2" />
      <path d="M4 5v6h6" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 3l3 3-3 3" />
      <path d="M20 6H8a4 4 0 0 0-4 4v1" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M4 18h12a4 4 0 0 0 4-4v-1" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-.9 4.5" />
      <path d="M20 5v6h-6" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5z" />,
  undo: (
    <>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h11a5 5 0 0 1 0 10h-2" />
    </>
  ),
  // selectors
  bookOpen: (
    <>
      <path d="M12 6.5C10.5 5 8.5 4.5 4 4.5V18c4.5 0 6.5.5 8 2" />
      <path d="M12 6.5C13.5 5 15.5 4.5 20 4.5V18c-4.5 0-6.5.5-8 2" />
      <path d="M12 6.5V20" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  chevronDown: { d: <path d="m6 9 6 6 6-6" /> },
  chevron: { dir: true, d: <path d="m9 6 6 6-6 6" /> },
  arrow: { dir: true, d: <path d="M4 12h15M13 6l6 6-6 6" /> },
  maximize: { dir: true, d: <path d="M15 3h6v6M9 21H3v-6M21 3l-8 8M3 21l8-8" /> },
  // log
  terminal: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  loader: (
    <>
      <path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </>
  ),
  // progress / feedback
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21 19H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  cloudOff: (
    <>
      <path d="M6.5 18H17a4 4 0 0 0 1.5-7.7A6 6 0 0 0 8 8" />
      <path d="M6.5 18a3.5 3.5 0 0 1-.6-6.95" />
      <path d="m3 3 18 18" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L20 6.5" />,
  circle: <circle cx="12" cy="12" r="8" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  // shields / evidence
  shieldCheck: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  shieldX: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="m9.7 9.7 4.6 4.6M14.3 9.7l-4.6 4.6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <path d="M8.4 18H14a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.6" />
    </>
  ),
  fileSearch: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M14 3v5h5" />
      <circle cx="15.5" cy="15.5" r="2.6" />
      <path d="m18 18 2 2" />
    </>
  ),
  clipboardCheck: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="m8.5 12 2 2 3.5-3.8" />
    </>
  ),
  penLine: (
    <>
      <path d="M4 20h16" />
      <path d="M15 4.5 19.5 9 9 19.5 4 20l.5-5z" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9.5V3" />
      <path d="M7.5 14h9" />
    </>
  ),
};

export default function Icon({ name, className = "", title, dir = false }) {
  const g = GLYPHS[name];
  if (!g) return null;
  const isMeta = g && typeof g === "object" && "d" in g;
  const body = isMeta ? g.d : g;
  const directional = dir || (isMeta && g.dir);
  const cls = `dm-ic${directional ? " di" : ""}${className ? ` ${className}` : ""}`;
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {body}
    </svg>
  );
}
