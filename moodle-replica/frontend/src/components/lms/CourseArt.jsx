// Course thumbnail artwork — decorative line-art scenes on a deep-navy
// technical backdrop, in the WhoCan stroke family (currentColor-free; the
// accent is passed in). Purely presentational: rendered aria-hidden with the
// course title always adjacent, so it carries no informational alt text
// (spec §24). No text is drawn inside the art. `kind` comes from the
// presentation layer; `accent` selects the line colour.

const ACCENT = {
  blue: "#4a9cff",
  purple: "#b79af0",
  cyan: "#5fc8e8",
  orange: "#ff922e",
  green: "#43c77a",
};

// Each scene is a function of the accent colour, drawn in a 320×180 (16:9) box.
// preserveAspectRatio="xMidYMid slice" lets the same art fill both the wide
// details image and the shorter row thumbnail without distortion.
const SCENES = {
  cs: (a) => (
    <>
      <rect x="70" y="44" width="180" height="104" rx="10" fill="none" stroke={a} strokeWidth="3" />
      <path d="M70 66h180" stroke={a} strokeWidth="3" opacity="0.7" />
      <circle cx="84" cy="55" r="3" fill={a} />
      <circle cx="96" cy="55" r="3" fill={a} opacity="0.6" />
      <circle cx="108" cy="55" r="3" fill={a} opacity="0.4" />
      <path d="M118 96l-14 12 14 12M202 96l14 12-14 12M150 92l-20 40" fill="none" stroke={a} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  math: (a) => (
    <>
      {/* graph-theory nodes + edges — the face of discrete maths */}
      <path d="M96 60l64 20M160 80l52 -18M160 80l-40 56M160 80l52 40M120 136l92 24" stroke={a} strokeWidth="2.6" opacity="0.65" />
      <circle cx="96" cy="60" r="12" fill="none" stroke={a} strokeWidth="3" />
      <circle cx="160" cy="80" r="14" fill={a} opacity="0.9" />
      <circle cx="212" cy="62" r="11" fill="none" stroke={a} strokeWidth="3" />
      <circle cx="120" cy="136" r="11" fill="none" stroke={a} strokeWidth="3" />
      <circle cx="212" cy="120" r="12" fill="none" stroke={a} strokeWidth="3" />
      <circle cx="212" cy="160" r="9" fill={a} opacity="0.75" />
    </>
  ),
  lab: (a) => (
    <>
      <path d="M138 50v34l-30 52a8 8 0 0 0 7 12h74a8 8 0 0 0 7-12l-30-52V50" fill="none" stroke={a} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M128 50h36" stroke={a} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M120 120h56" stroke={a} strokeWidth="3" opacity="0.6" />
      <circle cx="140" cy="128" r="4" fill={a} />
      <circle cx="158" cy="118" r="3" fill={a} opacity="0.8" />
      <circle cx="150" cy="138" r="3" fill={a} opacity="0.7" />
    </>
  ),
  history: (a) => (
    <>
      <rect x="86" y="52" width="148" height="86" rx="8" fill="none" stroke={a} strokeWidth="3" />
      <path d="M132 138h56M160 138v14M140 152h40" stroke={a} strokeWidth="3" strokeLinecap="round" />
      <circle cx="160" cy="95" r="24" fill="none" stroke={a} strokeWidth="3" />
      <path d="M160 82v13l9 6" stroke={a} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  database: (a) => (
    <>
      <ellipse cx="160" cy="58" rx="42" ry="14" fill="none" stroke={a} strokeWidth="3" />
      <path d="M118 58v64c0 7.7 18.8 14 42 14s42-6.3 42-14V58" fill="none" stroke={a} strokeWidth="3" />
      <path d="M118 90c0 7.7 18.8 14 42 14s42-6.3 42-14" fill="none" stroke={a} strokeWidth="3" opacity="0.7" />
      <path d="M214 78h28M214 108h28" stroke={a} strokeWidth="2.6" opacity="0.6" />
      <rect x="240" y="70" width="26" height="18" rx="3" fill="none" stroke={a} strokeWidth="2.6" opacity="0.6" />
      <rect x="240" y="100" width="26" height="18" rx="3" fill="none" stroke={a} strokeWidth="2.6" opacity="0.6" />
    </>
  ),
  web: (a) => (
    <>
      <rect x="88" y="48" width="144" height="90" rx="8" fill="none" stroke={a} strokeWidth="3" />
      <path d="M88 68h144" stroke={a} strokeWidth="3" opacity="0.7" />
      <path d="M74 150h172" stroke={a} strokeWidth="3" strokeLinecap="round" />
      <path d="M132 92l-16 14 16 14M188 92l16 14-16 14M162 86l-12 40" fill="none" stroke={a} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  generic: (a) => (
    <>
      <path d="M160 58c-16-10-40-10-56 0v76c16-10 40-10 56 0M160 58c16-10 40-10 56 0v76c-16-10-40-10-56 0" fill="none" stroke={a} strokeWidth="3" strokeLinejoin="round" />
      <path d="M160 58v76" stroke={a} strokeWidth="3" opacity="0.7" />
    </>
  ),
};

export default function CourseArt({ kind = "generic", accent = "blue", className = "" }) {
  const a = ACCENT[accent] ?? ACCENT.blue;
  const scene = SCENES[kind] ?? SCENES.generic;
  const gid = `cart-${kind}-${accent}`;
  return (
    <svg
      className={`course-art__svg ${className}`}
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0c2246" />
          <stop offset="1" stopColor="#081428" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gid})`} />
      <g opacity="0.16" stroke={a} strokeWidth="1">
        <path d="M0 45h320M0 90h320M0 135h320M80 0v180M160 0v180M240 0v180" />
      </g>
      {scene(a)}
    </svg>
  );
}
