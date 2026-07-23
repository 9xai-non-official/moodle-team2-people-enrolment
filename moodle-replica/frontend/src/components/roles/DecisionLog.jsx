// Decision Log: every permission check, newest first. A row click opens the
// stored decision — its gates or its reason lines — in a modal.
//
// Two sources feed the same table. The live engine stores one row per check and
// serves it with the actor, the context label and the reason lines already
// resolved (blocking_reasons / supporting_reasons); the mock returns the same
// check as a four-gate pipeline. Every field below is read through a fallback so
// one shape never blanks the tab — a log that throws is worse than no log.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import DataTable from "../common/DataTable";
import Modal from "../common/Modal";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

// Relative age of a timestamp, computed at render — presentation only.
function relTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return String(iso);
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// --- one row, whichever source served it ----------------------------------
const actorName = (r) => r.actor?.full_name ?? `user ${r.actor_id ?? "?"}`;
const contextLabel = (r) => r.context_label ?? `context ${r.context_id ?? "?"}`;
const whenOf = (r) => r.created_at ?? r.decided_at ?? null;
const verdictOf = (r) => r.verdict ?? (r.allowed ? "allowed" : "denied");
// The mock ships reasons as strings; the engine ships the whole stored decision
// object there and the reason lines separately.
const reasonLines = (r) => (Array.isArray(r.reasons) ? r.reasons : []);

export default function DecisionLog({ onReplay }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiGet("/api/permissions/decisions")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "actor", label: "Actor", render: actorName },
    { key: "capability", label: "Capability" },
    { key: "context_label", label: "Context", render: contextLabel },
    {
      key: "verdict",
      label: "Verdict",
      render: (r) => (
        <Badge variant={verdictOf(r) === "allowed" ? "green" : "red"}>{verdictOf(r)}</Badge>
      ),
    },
    {
      key: "created_at",
      label: "When",
      render: (r) => (
        <span title={whenOf(r) ? new Date(whenOf(r)).toLocaleString() : ""}>
          {relTime(whenOf(r))}
        </span>
      ),
    },
    {
      key: "replay",
      label: "",
      // Replay needs the original inputs; a row without them isn't replayable.
      render: (r) =>
        onReplay &&
        r.inputs && (
          <button
            className="btn"
            title="Re-run this check in the Permission Checker with the same inputs"
            onClick={(e) => {
              e.stopPropagation(); // row click opens the modal; this jumps tabs
              onReplay(r);
            }}
          >
            Replay
          </button>
        ),
    },
  ];

  return (
    <div>
      <p className="muted">
        Every permission check is logged here. Click a row for the reasons it was
        decided on; Replay re-runs it in the Permission Checker.
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        empty="No checks run yet — try the Permission Checker."
        onRowClick={setSelected}
      />
      <Modal
        open={!!selected}
        title={selected ? `${selected.capability} — ${verdictOf(selected)}` : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div>
            <div className={`verdict-banner verdict-banner--${verdictOf(selected)}`}>
              {verdictOf(selected).toUpperCase()}
            </div>
            <p className="muted">
              {actorName(selected)} · {contextLabel(selected)} ·{" "}
              {whenOf(selected) ? new Date(whenOf(selected)).toLocaleString() : "no timestamp"}
            </p>
            {/* The gate pipeline when the check was recorded with one… */}
            {(selected.gates ?? []).map((g) => (
              <div key={g.gate} className={`gate-row gate-row--${g.passed ? "pass" : "fail"}`}>
                <div className="gate-row__name">{g.gate}</div>
                <div>
                  {(g.evidence ?? []).map((ev, i) => (
                    <div key={i} className="gate-row__evidence">
                      {ev}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* …and the reason lines the engine stored, verbatim, either way. */}
            <ReasonList
              reasons={reasonLines(selected)}
              tone={verdictOf(selected) === "allowed" ? "ok" : "error"}
              title="Reasons"
            />
            <ReasonList reasons={selected.blocking_reasons} tone="error" title="Blocked by" />
            <ReasonList reasons={selected.supporting_reasons} tone="ok" title="What passed" />
          </div>
        )}
      </Modal>
    </div>
  );
}
