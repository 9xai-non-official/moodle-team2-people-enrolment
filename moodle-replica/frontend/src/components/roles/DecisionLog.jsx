// Decision Log: every permission check, newest first. A row click replays
// the stored decision — its full gate pipeline and reasons — in a modal.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import DataTable from "../common/DataTable";
import Modal from "../common/Modal";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

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
    { key: "actor", label: "Actor", render: (r) => r.actor.full_name },
    { key: "capability", label: "Capability" },
    { key: "context_label", label: "Context" },
    {
      key: "verdict",
      label: "Verdict",
      render: (r) => (
        <Badge variant={r.verdict === "allowed" ? "green" : "red"}>{r.verdict}</Badge>
      ),
    },
    { key: "created_at", label: "When", render: (r) => new Date(r.created_at).toLocaleString() },
    {
      key: "replay",
      label: "",
      render: (r) =>
        onReplay && (
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
      <p className="muted">Every permission check is logged here. Click a row to replay its gates.</p>
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
        title={selected ? `${selected.capability} — ${selected.verdict}` : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div>
            <div className={`verdict-banner verdict-banner--${selected.verdict}`}>
              {selected.verdict.toUpperCase()}
            </div>
            {selected.gates.map((g) => (
              <div key={g.gate} className={`gate-row gate-row--${g.passed ? "pass" : "fail"}`}>
                <div className="gate-row__name">{g.gate}</div>
                <div>
                  {g.evidence.map((ev, i) => (
                    <div key={i} className="gate-row__evidence">
                      {ev}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <ReasonList
              reasons={selected.reasons}
              tone={selected.verdict === "allowed" ? "ok" : "error"}
              title="Reasons"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
