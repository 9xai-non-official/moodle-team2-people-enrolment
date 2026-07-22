// Decision Log: every permission check, newest first. A row click replays
// the stored decision — its CheckResponse verdict, reasons, and capability
// resolution — in a modal.
import { useEffect, useState } from "react";
import { apiGet } from "../../api";
import DataTable from "../common/DataTable";
import Modal from "../common/Modal";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

export default function DecisionLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiGet("/api/permissions/decisions?limit=100")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "actor", label: "Actor", render: (r) => r.actor_id },
    { key: "capability", label: "Capability" },
    { key: "context", label: "Context", render: (r) => r.context_id },
    {
      key: "verdict",
      label: "Verdict",
      render: (r) => (
        <Badge variant={r.allowed ? "green" : "red"}>{r.allowed ? "ALLOW" : "DENY"}</Badge>
      ),
    },
    {
      key: "when",
      label: "When",
      render: (r) => (r.decided_at ? new Date(r.decided_at).toLocaleString() : "—"),
    },
  ];

  const reasons = selected?.reasons ?? null;
  const capValues = Object.entries(reasons?.capability_values || {});

  return (
    <div>
      <p className="muted">Every permission check is logged here. Click a row to replay its decision.</p>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        empty="No checks run yet — try the Permission Checker."
        rowKey={(r) => r.id}
        onRowClick={setSelected}
      />
      <Modal
        open={!!selected}
        title={selected ? `${selected.capability} — ${selected.allowed ? "ALLOW" : "DENY"}` : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div>
            {reasons ? (
              <>
                <div
                  className={`verdict-banner verdict-banner--${
                    reasons.decision === "ALLOW" ? "allowed" : "denied"
                  }`}
                >
                  {reasons.decision}
                </div>
                <ReasonList
                  reasons={reasons?.supporting_reasons || []}
                  tone="ok"
                  title="Supporting"
                />
                <ReasonList
                  reasons={reasons?.blocking_reasons || []}
                  tone="error"
                  title="Blocking"
                />
                {capValues.length > 0 && (
                  <div className="reason-list reason-list--neutral">
                    <div className="reason-list__title">Capability resolution</div>
                    <ul>
                      {capValues.map(([role, v]) => (
                        <li key={role}>
                          {role} → {v?.value ?? "not set"}
                          {v?.decided_at && (
                            <div className="reason-list__evidence">{v.decided_at}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">No stored decision detail for this check.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
