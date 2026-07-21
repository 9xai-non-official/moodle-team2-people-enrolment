// Colour-variant badge. Variants map to the status vocabulary used across
// the app (task 06 §4.2): green=active, grey=suspended, amber=expired/
// method-disabled, red=account-suspended/denied, blue=info, neutral=default.
const VARIANTS = new Set(["green", "grey", "amber", "red", "blue", "neutral"]);

export default function Badge({ variant = "neutral", title, children }) {
  const v = VARIANTS.has(variant) ? variant : "neutral";
  return (
    <span className={`badge badge--${v}`} title={title}>
      {children}
    </span>
  );
}
