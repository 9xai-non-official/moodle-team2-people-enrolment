// Roles & Permissions icon set. One consistent line-icon family (currentColor,
// 1.8 stroke, round caps) matching the shell's nav glyphs and the enrolment /
// teaching icon kits. Non-directional glyphs (shield, user, folder, ban, …)
// are NEVER mirrored; the few directional ones carry `rl-ic--dir` so App.css
// flips them under RTL. Icon-only buttons must still supply an accessible name
// via the calling component; a decorative icon here is aria-hidden.
const P = {
  // --- tabs -------------------------------------------------------------
  shieldSearch: (
    <>
      <path d="M11 21C6.5 19 4 15.5 4 11V6l7-3 7 3v3.5" />
      <circle cx="16.5" cy="15.5" r="3" />
      <path d="M18.7 17.7 21 20" />
    </>
  ),
  shieldPlus: (
    <>
      <path d="M12 21c-4.5-2-7-5.5-7-10V6l7-3 7 3v5c0 4.5-2.5 8-7 10Z" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  shield: <path d="M12 21c-4.5-2-7-5.5-7-10V6l7-3 7 3v5c0 4.5-2.5 8-7 10Z" />,
  shieldCheck: (
    <>
      <path d="M12 21c-4.5-2-7-5.5-7-10V6l7-3 7 3v5c0 4.5-2.5 8-7 10Z" />
      <path d="m9 11.5 2 2 4-4" />
    </>
  ),
  shieldX: (
    <>
      <path d="M12 21c-4.5-2-7-5.5-7-10V6l7-3 7 3v5c0 4.5-2.5 8-7 10Z" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </>
  ),
  shieldQuestion: (
    <>
      <path d="M12 21c-4.5-2-7-5.5-7-10V6l7-3 7 3v5c0 4.5-2.5 8-7 10Z" />
      <path d="M10.3 9.3a1.8 1.8 0 0 1 2.7 1.5c0 1.2-1.8 1.5-1.8 2.7" />
      <path d="M11.2 16h.01" />
    </>
  ),
  shieldAlert: (
    <>
      <path d="M12 21c-4.5-2-7-5.5-7-10V6l7-3 7 3v5c0 4.5-2.5 8-7 10Z" />
      <path d="M12 8.5v4M12 15.5h.01" />
    </>
  ),
  clipboardClock: (
    <>
      <path d="M9 4h6M9 4a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1" />
      <path d="M16 5h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2" />
      <circle cx="12" cy="14" r="3" />
      <path d="M12 12.8V14l1 .8" />
    </>
  ),
  circlePlus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  // --- checker fields ---------------------------------------------------
  userRound: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  userRoundSearch: (
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M4 20a7 7 0 0 1 9.5-6.5" />
      <circle cx="17" cy="16" r="2.6" />
      <path d="m19 18 1.8 1.8" />
    </>
  ),
  folder: <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />,
  folderTree: (
    <>
      <path d="M3 5a1 1 0 0 1 1-1h3l1.5 1.5H12a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M13 7h3l1.5 1.5H21" />
      <path d="M13 7v10a1 1 0 0 0 1 1h3" />
      <path d="M17 16h4v3h-4z" />
    </>
  ),
  folderX: (
    <>
      <path d="M4 7a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="m10.5 12.5 4 4M14.5 12.5l-4 4" />
    </>
  ),
  network: (
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-2h12v2" />
    </>
  ),
  activity: <path d="M3 12h4l2 6 4-14 2 8h6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  loader: <path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
  // --- evidence ---------------------------------------------------------
  circleCheck: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  circleMinus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  circleX: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  rotateCw: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 4v4h-4" />
    </>
  ),
  cornerDownRight: <path d="M4 5v6a2 2 0 0 0 2 2h14M15 9l5 4-5 4" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.6a3.2 3.2 0 0 1 0 6.3" />
      <path d="M18 14.2c2.3.6 4 2.6 4 5.1" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" />
    </>
  ),
  clipboardList: (
    <>
      <path d="M9 4h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M16 5h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  fileSearch: (
    <>
      <path d="M6 3h7l5 5v6" />
      <path d="M13 3v5h5" />
      <path d="M6 3a1 1 0 0 0-1 1v9" />
      <circle cx="10" cy="17" r="3" />
      <path d="m12.2 19.2 1.8 1.8M5 21h4" />
    </>
  ),
  // --- comparison -------------------------------------------------------
  scale: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M12 6 5 8m7-2 7 2" />
      <path d="M5 8 2.5 13a2.5 2.5 0 0 0 5 0Z" />
      <path d="M19 8l-2.5 5a2.5 2.5 0 0 0 5 0Z" />
    </>
  ),
  arrowLeftRight: <path d="M7 8H3m0 0 3-3M3 8l3 3M17 16h4m0 0-3-3m3 3-3 3" />,
  // --- capability mgmt / create -----------------------------------------
  filter: <path d="M3 5h18l-7 8v5l-4 2v-7Z" />,
  pencil: (
    <>
      <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17Z" />
      <path d="M14 7l3 3" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  code: <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" />,
  alignLeft: <path d="M4 6h16M4 10h10M4 14h13M4 18h8" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" />,
  // --- assignments ------------------------------------------------------
  userRoundPlus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 20a7 7 0 0 1 12-4.9" />
      <path d="M17 14v6M20 17h-6" />
    </>
  ),
  userMinus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 20a7 7 0 0 1 12-4.9" />
      <path d="M16 17h6" />
    </>
  ),
  gitBranch: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <path d="M6 8.5v7M18 10.5a6 6 0 0 1-6 6H8.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trash2: (
    <>
      <path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14" />
      <path d="M10 10v6M14 10v6" />
    </>
  ),
  // --- feedback / nav ---------------------------------------------------
  triangleAlert: (
    <>
      <path d="M12 4 2.5 20h19Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  cloudOff: (
    <>
      <path d="M7 18h9a4 4 0 0 0 1.4-7.8A6 6 0 0 0 7.5 8.2" />
      <path d="m3 3 18 18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  refreshCw: (
    <>
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 12A9 9 0 0 1 18.3 5.6L21 8" />
      <path d="M21 4v4h-4M3 20v-4h4" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronsRight: <path d="m6 6 6 6-6 6M13 6l6 6-6 6" />,
  chevronsLeft: <path d="m18 6-6 6 6 6M11 6l-6 6 6 6" />,
  generic: <circle cx="12" cy="12" r="3" />,
};

// Directional glyphs mirror under RTL (App.css: .roles[dir="rtl"] .rl-ic--dir).
const DIRECTIONAL = new Set([
  "chevronRight",
  "chevronLeft",
  "chevronsRight",
  "chevronsLeft",
  "cornerDownRight",
]);

export const ICON_NAMES = Object.keys(P);

export default function Icon({
  name,
  size = 18,
  className = "",
  title,
  strokeWidth = 1.8,
  spin = false,
}) {
  const dir = DIRECTIONAL.has(name) ? " rl-ic--dir" : "";
  const spinCls = spin ? " rl-ic--spin" : "";
  return (
    <svg
      className={`rl-ic${dir}${spinCls} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {P[name] ?? P.generic}
    </svg>
  );
}
