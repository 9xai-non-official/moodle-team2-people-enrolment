// The soul of the app (task 06 §3.5): every verdict, refusal, and gate
// explanation renders through this. Accepts an array of strings or objects
// ({reason, evidence?} / {gate, passed, reason}) and shows them verbatim —
// backend "why" text is never rephrased or swallowed.
export default function ReasonList({ reasons, tone = "error", title }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div className={`reason-list reason-list--${tone}`}>
      {title && <div className="reason-list__title">{title}</div>}
      <ul>
        {reasons.map((r, i) => {
          if (typeof r === "string") return <li key={i}>{r}</li>;
          const text = r.reason ?? r.message ?? JSON.stringify(r);
          return (
            <li key={i}>
              {text}
              {r.evidence && (
                <div className="reason-list__evidence">
                  {Array.isArray(r.evidence) ? r.evidence.join(" · ") : r.evidence}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
