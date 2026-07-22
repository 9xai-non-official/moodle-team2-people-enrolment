// Enrolment icon set — one consistent line-icon family, the same stroke style
// as the shell nav glyphs and the Teaching/Demos icon sets (viewBox 24, fill
// none, stroke currentColor, width 1.8, round caps). No emoji, no external
// library (spec §58). Colour always comes from the parent via currentColor.
//
// Directional glyphs (chevrons / arrows / branch) carry `enr-ic--dir` so
// App.css mirrors them under [dir="rtl"]; non-directional icons never flip.

const P = {
  // ---- tabs + course selector ----
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5" />
      <path d="M12 6.5C13.5 5 16 4.5 20 5v13c-4-.5-6.5 0-8 1.5z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.2 3.2 0 0 1 0 6.4" />
      <path d="M18 14c2.3.6 4 2.7 4 5.2" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <path d="M6.5 10v3.5a2 2 0 0 0 2 2H14" />
    </>
  ),
  usersRound: (
    <>
      <circle cx="10" cy="8" r="3.4" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M17 4.5a3.4 3.4 0 0 1 0 6.6" />
    </>
  ),
  usersRoundPlus: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20a6.5 6.5 0 0 1 12 0" />
      <path d="M17 9v6M20 12h-6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.3 6.3A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.85" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),

  // ---- people ----
  userRound: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.6 0 3 .5 4.2 1.4" />
      <path d="M17 11v6M20 14h-6" />
    </>
  ),
  userMinus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.6 0 3 .5 4.2 1.4" />
      <path d="M14 14h6" />
    </>
  ),
  userCog: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.5 21c0-3.6 2.9-6.5 6.5-6.5 1 0 2 .25 2.9.7" />
      <circle cx="18" cy="16" r="2.4" />
      <path d="M18 12.6v1M18 18.4v1M21 16h-1M15 16h-1M20 14l-.7.7M16.7 17.3l-.7.7M20 18l-.7-.7M16.7 14.7l-.7-.7" />
    </>
  ),
  hand: (
    <>
      <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 11V6a1.5 1.5 0 0 1 3 0v7c0 3.9-2.5 8-7 8-2.7 0-4.2-1.2-5.5-3L3 15.5a1.5 1.5 0 0 1 2.6-1.5L8 17" />
    </>
  ),
  graduationCap: (
    <>
      <path d="M12 3 2 8l10 5 10-5z" />
      <path d="M6 10v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
    </>
  ),
  presentation: (
    <>
      <rect x="3" y="3" width="18" height="12" rx="1.5" />
      <path d="M7 20h10M12 15v5" />
      <path d="M8 8l3 2-3 2z" />
    </>
  ),
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,

  // ---- status / method glyphs ----
  circleCheck: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  circleX: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  circleMinus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  pauseCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  playCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0z" />
      <path d="M12 16v5" />
    </>
  ),

  // ---- dates ----
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
    </>
  ),
  calendarClock: (
    <>
      <path d="M20.5 10V6.5a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2H12" />
      <path d="M3.5 9h13M8 3v3M15 3v3" />
      <circle cx="17.5" cy="16.5" r="4" />
      <path d="M17.5 15v1.5l1 1" />
    </>
  ),

  // ---- table + actions ----
  ellipsisVertical: (
    <>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </>
  ),
  arrowUpDown: (
    <>
      <path d="M8 4v16M8 4L5 7M8 4l3 3" />
      <path d="M16 20V4M16 20l-3-3M16 20l3-3" />
    </>
  ),
  arrowUp: <path d="M12 20V5M12 5l-5 5M12 5l5 5" />,
  arrowDown: <path d="M12 4v15M12 19l-5-5M12 19l5-5" />,
  gitBranch: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <path d="M6 8.5v7" />
      <path d="M18 10.5c0 3.5-3 4.5-6 4.5" />
    </>
  ),
  chartBar: (
    <>
      <path d="M3 3v18h18" />
      <path d="M8 17v-5M13 17V8M18 17v-8" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M14 6l4 4" />
    </>
  ),
  trash2: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  refreshCw: (
    <>
      <path d="M20 11a8 8 0 0 0-14-4.5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 11a8.5 8.5 0 1 1 2 6.5L3.5 15" />
      <path d="M3.5 20v-5h5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3" />
      <path d="M16 7l2.5 2.5M14 9l2.5 2.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,

  // ---- feedback ----
  triangleAlert: (
    <>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  cloudOff: (
    <>
      <path d="M7 17a4 4 0 0 1-.7-7.94A5 5 0 0 1 15 7" />
      <path d="M17 8a4 4 0 0 1 1 7.87" />
      <path d="M3 3l18 18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  loader: <path d="M12 3a9 9 0 1 0 9 9" />,

  // ---- pagination + chevrons (directional) ----
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronsRight: <path d="M7 6l6 6-6 6M13 6l6 6-6 6" />,
  chevronsLeft: <path d="M17 6l-6 6 6 6M11 6l-6 6 6 6" />,

  generic: <circle cx="12" cy="12" r="3" />,
};

// Meaning depends on reading direction → mirror under RTL.
const DIRECTIONAL = new Set([
  "chevronRight",
  "chevronLeft",
  "chevronsRight",
  "chevronsLeft",
  "gitBranch",
]);

export default function Icon({ name, size = 18, className = "", title, strokeWidth = 1.8 }) {
  const glyph = P[name] ?? P.generic;
  return (
    <svg
      className={`enr-ic ${DIRECTIONAL.has(name) ? "enr-ic--dir" : ""} ${className}`.trim()}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {glyph}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(P);
