// One hard case, one card: the rule it proves + a jump to where it already
// lives. Presentational only — the demo logic is on the target page.
export default function HardCaseCard({ title, rule, target, onNavigate }) {
  return (
    <div className="card">
      <div className="card__title">{title}</div>
      <p className="muted">{rule}</p>
      <button className="btn" onClick={() => onNavigate(target)}>
        Open {target} →
      </button>
    </div>
  );
}
