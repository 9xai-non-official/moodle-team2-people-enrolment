export default function ProgressBar({ percent }) {
  const pct = Math.max(0, Math.min(100, percent ?? 0));
  const done = pct >= 100;
  return (
    <div className="progress">
      <div
        className={`progress__fill ${done ? "progress__fill--done" : ""}`}
        style={{ width: `${pct}%` }}
      />
      <span className="progress__label">{pct}%</span>
    </div>
  );
}
