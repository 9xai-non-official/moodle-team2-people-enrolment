// Enrolment method instances (task 06 §4.2): one .panel per method, with
// enable/disable, cohort sync, and remove. Every mutation refetches — no
// optimistic UI. Remove deletes only this path's enrolments (HC-1).
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiDelete } from "../../api";
import Badge from "../common/Badge";
import MethodCreateForm from "./MethodCreateForm";
import GuestPreview from "./GuestPreview";

export default function MethodsPanel({ courseId }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncResult, setSyncResult] = useState({}); // method id → {added,removed,kept}

  const load = () => {
    setLoading(true);
    setError(null);
    apiGet(`/api/enrolment/courses/${courseId}/methods`)
      .then(setMethods)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId]);

  const run = (promise, after) => {
    setBusy(true);
    setError(null);
    promise
      .then((res) => {
        if (after) after(res);
        load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div>
      <div className="panel__title">Enrolment methods</div>
      <MethodCreateForm courseId={courseId} onCreated={load} />

      {loading && <p className="muted">Loading…</p>}
      {!loading && error && <div className="error-banner">{error}</div>}
      {!loading && !error && !methods.length && (
        <p className="muted">No enrolment methods.</p>
      )}

      {!loading &&
        !error &&
        methods.map((m) => {
        const res = syncResult[m.id];
        return (
          <div className="panel" key={m.id}>
            <div className="panel__title">
              {m.method}{" "}
              <Badge variant={m.status === "enabled" ? "green" : "grey"}>
                {m.status}
              </Badge>
              <span className="muted"> · {m.enrolled_count} enrolled</span>
            </div>

            {m.method === "self" && (
              <div className="muted">
                Enrolment key: <code>{m.config?.key || "—"}</code>
              </div>
            )}
            {m.cohort && <div className="muted">Cohort: {m.cohort.name}</div>}

            <div className="form-row">
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  run(
                    apiPatch(`/api/enrolment/methods/${m.id}`, {
                      status: m.status === "enabled" ? "disabled" : "enabled",
                    }),
                  )
                }
              >
                {m.status === "enabled" ? "Disable" : "Enable"}
              </button>
              {m.method === "cohort" && (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    run(apiPost(`/api/enrolment/methods/${m.id}/sync`), (r) =>
                      setSyncResult((s) => ({ ...s, [m.id]: r })),
                    )
                  }
                >
                  Sync now
                </button>
              )}
              <button
                className="btn btn--danger"
                disabled={busy}
                onClick={() =>
                  window.confirm(
                    `Remove the ${m.method} method?\n\nEveryone enrolled ONLY via this ` +
                    "method leaves the course (their completion records survive). " +
                    "People with another path stay enrolled — that's hard case #1.",
                  ) && run(apiDelete(`/api/enrolment/methods/${m.id}`))
                }
              >
                Remove method
              </button>
            </div>
            <div className="muted">
              Removes only this path’s enrolments — HC-1.
            </div>

            {res && (
              <div className="banner-info">
                Sync: +{res.added.length} added · −{res.removed.length} removed ·{" "}
                {res.kept.length} kept
              </div>
            )}
          </div>
        );
      })}

      <GuestPreview courseId={courseId} />
    </div>
  );
}
