// The context spine, visualized: "System › course:CS101 › activity:Assignment 1".
// Pure render over an already-loaded contexts list (path is '/1/10/110').
// This chain IS the permission model — capability definitions at any link
// apply to everything to its right; prohibit anywhere sticks.
export default function ContextPath({ contextId, contexts }) {
  const ctx = contexts.find((c) => c.id === contextId);
  if (!ctx || !ctx.path) return null;
  const chain = ctx.path
    .split("/")
    .filter(Boolean)
    .map((id) => contexts.find((c) => c.id === Number(id)))
    .filter(Boolean);
  if (chain.length < 2) return null;
  return (
    <div className="muted" title="capability definitions at any level apply to everything below it">
      {chain.map((c, i) => (
        <span key={c.id}>
          {i > 0 && " › "}
          {c.label}
        </span>
      ))}
    </div>
  );
}
