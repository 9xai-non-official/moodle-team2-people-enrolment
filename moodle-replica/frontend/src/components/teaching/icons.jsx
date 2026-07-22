// Teaching icon set — one consistent line-icon family, same stroke style as the
// shell nav glyphs and the Dashboard/Courses icons (viewBox 24, fill none,
// stroke currentColor, width 1.8, round caps). No emoji, no external library
// (spec §45). Colour always comes from the parent via currentColor.
//
// Directional glyphs (chevron/arrow) are marked with `dir` so callers can add
// the mirror class; App.css flips `.t-ic--dir` under [dir="rtl"].

const P = {
  // shell / tabs
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.2 3.2 0 0 1 0 6.4" />
      <path d="M18 14c2.3.6 4 2.7 4 5.2" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.6 0 3 .5 4.2 1.4" />
      <path d="M17 11v6M20 14h-6" />
    </>
  ),
  userRound: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </>
  ),
  userCheck: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.2 0 2.3.3 3.3.8" />
      <path d="M16 12l2 2 4-4" />
    </>
  ),
  userX: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7 1.2 0 2.3.3 3.3.8" />
      <path d="M17 12l4 4M21 12l-4 4" />
    </>
  ),
  clipboardList: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  clipboardCheck: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 13l2 2 4-4" />
    </>
  ),
  folder: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  folderPlus: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M12 11v5M9.5 13.5h5" />
    </>
  ),
  // course selector leading
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  graduationCap: (
    <>
      <path d="M12 3 2 8l10 5 10-5z" />
      <path d="M6 10v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5" />
      <path d="M12 6.5C13.5 5 16 4.5 20 5v13c-4-.5-6.5 0-8 1.5z" />
    </>
  ),
  // summary
  pauseCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  // table + actions
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
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
  // requests
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 12l3-7h12l3 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M3 12h5l1.5 2.5h5L16 12h5" />
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
  // activities
  assignment: (
    <>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 3v5h5" />
      <path d="M8 13h7M8 16.5h5" />
    </>
  ),
  quiz: (
    <>
      <path d="M5 5h14M5 12h14M5 19h9" />
      <path d="M4 5h.01M4 12h.01M4 19h.01" />
    </>
  ),
  forum: (
    <>
      <path d="M4 5h13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </>
  ),
  lesson: (
    <>
      <path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5" />
      <path d="M12 6.5C13.5 5 16 4.5 20 5v13c-4-.5-6.5 0-8 1.5z" />
    </>
  ),
  page: (
    <>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 3v5h5" />
    </>
  ),
  url: (
    <>
      <path d="M9.5 14.5l5-5" />
      <path d="M12 7l1.5-1.5a3.5 3.5 0 0 1 5 5L17 12" />
      <path d="M12 17l-1.5 1.5a3.5 3.5 0 0 1-5-5L7 12" />
    </>
  ),
  generic: (
    <>
      <path d="M12 3l3 5.5H9z" />
      <circle cx="6.5" cy="16" r="3" />
      <rect x="13" y="13" width="6" height="6" rx="1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    </>
  ),
  usersRound: (
    <>
      <circle cx="10" cy="8" r="3.4" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M17 4.5a3.4 3.4 0 0 1 0 6.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  // grading
  fileCheck: (
    <>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 3v5h5" />
      <path d="M8.5 15l2 2 3.5-4" />
    </>
  ),
  penLine: (
    <>
      <path d="M4 20h16" />
      <path d="M14.5 5.5l3 3L8 18l-4 1 1-4z" />
    </>
  ),
  star: <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.9 7.2 19l.9-5.4L4.2 9.7l5.4-.8z" />,
  save: (
    <>
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M8 4v5h7V4" />
      <path d="M8 15h8v6H8z" />
    </>
  ),
  // feedback
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
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4z" />,
  fileX: (
    <>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 3v5h5" />
      <path d="M9.5 12.5l5 5M14.5 12.5l-5 5" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    </>
  ),
  loader: <path d="M12 3a9 9 0 1 0 9 9" />,
};

// Names whose meaning depends on reading direction (mirrored under RTL).
const DIRECTIONAL = new Set(["chevronRight", "chevronLeft", "arrowRight"]);

export default function Icon({ name, size = 18, className = "", title }) {
  const glyph = P[name] ?? P.generic;
  return (
    <svg
      className={`t-ic ${DIRECTIONAL.has(name) ? "t-ic--dir" : ""} ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
