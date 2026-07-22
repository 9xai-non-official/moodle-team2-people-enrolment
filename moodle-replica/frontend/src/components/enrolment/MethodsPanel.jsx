// Enrolment method instances (task 06 §4.2): one .panel per method, with
// enable/disable, cohort sync, and remove. Every mutation refetches — no
// optimistic UI. Remove deletes only this path's enrolments (HC-1).
//
// EXPIRY / CAPACITY CONFIGURATION
// Only what the backend actually honours is editable here. Phase F asked for
// four fields; three of them do not exist in the contract, and shipping inputs
// that silently do nothing is worse than not shipping them:
//
//   max_enrolled   SUPPORTED — the capacity gate reads config.max_enrolled
//                  (services/enrolment.py:435-444). Self-enrol only: that is
//                  the sole path the gate chain runs on.
//   enrol_start /  SUPPORTED — real MethodOut columns, accepted by
//   enrol_end      MethodPatch. This is the "enrolment period".
//   expiredaction  NOT IN CONTRACT — no reference anywhere in app/.
//   longtimenosee  NOT IN CONTRACT — schemas_enrolment.py:27 mentions an
//                  `inactivity_days` config key, but no service code reads it,
//                  so it is a comment rather than a feature.
//
// The two missing ones are requested in the Phase F handover. Do not add
// inputs for them until a backend engineer confirms they are read.
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiDelete } from "../../api";
import Badge from "../common/Badge";
import MethodCreateForm from "./MethodCreateForm";
import GuestPreview from "./GuestPreview";

// datetime-local wants "YYYY-MM-DDTHH:mm"; the API returns ISO-8601.
const toLocal = (iso) => (iso ? String(iso).slice(0, 16) : "");

// A window that is already set CANNOT be cleared through the API:
// update_method builds `enrol_start = coalesce($4, enrol_start)`
// (services/enrolment.py:597-598), so a null means "leave it alone", not
// "unset it". PATCH still returns 200, so a cleared field looks saved and
// silently is not. VERIFIED: set 2030-01-01, PATCH null, value unchanged.
//
// Rather than ship a control that lies, we detect the case and say so.
// Fix belongs in the backend (exclude_unset, or a sentinel for "clear").
const clearsExisting = (m, d) =>
  (!!m.enrol_start && !d.enrol_start) || (!!m.enrol_end && !d.enrol_end);

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
      // Server reason, not just the transport line.
      .catch((e) =>
        setError(e.reasons?.length ? e.reasons.join(" · ") : e.message),
      )
      .finally(() => setBusy(false));
  };

  // Per-method draft edits, keyed by method id. Absent = not being edited.
  const [draft, setDraft] = useState({});
  const editing = (m) =>
    draft[m.id] ?? {
      enrol_start: toLocal(m.enrol_start),
      enrol_end: toLocal(m.enrol_end),
      max_enrolled: m.config?.max_enrolled ?? "",
    };
  const edit = (m, patch) =>
    setDraft((d) => ({ ...d, [m.id]: { ...editing(m), ...patch } }));

  const saveConfig = (m) => {
    const d = editing(m);
    const body = {
      enrol_start: d.enrol_start || null,
      enrol_end: d.enrol_end || null,
    };
    if (m.method === "self") {
      // Merge, never replace: config also carries `key` and `sync_group_id`,
      // and PATCH overwrites the whole object.
      body.config = {
        ...(m.config ?? {}),
        max_enrolled: d.max_enrolled === "" ? null : Number(d.max_enrolled),
      };
    }
    run(apiPatch(`/api/enrolment/methods/${m.id}`, body), () =>
      setDraft((s) => {
        const { [m.id]: _drop, ...rest } = s;
        return rest;
      }),
    );
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

            {/* INSUFFICIENT EVIDENCE — requires staging inspection.
                Rendered inline under each method as a plain form-row, matching
                the surrounding panels. Whether these belong inline, behind a
                "Configure" disclosure, or in the create form only, is not
                decidable from the code. Field SET is contract-driven, not a
                guess; only the LAYOUT is uncertain. */}
            <div className="form-row">
              <label>Enrol from</label>
              <input
                className="input"
                type="datetime-local"
                value={editing(m).enrol_start}
                onChange={(e) => edit(m, { enrol_start: e.target.value })}
              />
              <label>until</label>
              <input
                className="input"
                type="datetime-local"
                value={editing(m).enrol_end}
                onChange={(e) => edit(m, { enrol_end: e.target.value })}
              />
              {m.method === "self" && (
                <>
                  <label>Max enrolled</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    style={{ width: "7rem" }}
                    placeholder="unlimited"
                    value={editing(m).max_enrolled ?? ""}
                    onChange={(e) => edit(m, { max_enrolled: e.target.value })}
                  />
                </>
              )}
              <button
                className="btn"
                disabled={busy || !draft[m.id]}
                onClick={() => saveConfig(m)}
              >
                Save
              </button>
            </div>
            {draft[m.id] && clearsExisting(m, editing(m)) && (
              <div className="banner-info">
                Clearing a date that is already set will not take effect — the
                API treats an empty value as “leave unchanged”, so the save
                will report success and the window will stay as it is. Other
                edits in this row still save normally.
              </div>
            )}
            <div className="muted">
              The window feeds the <code>window_open</code> gate
              {m.method === "self" && (
                <>
                  ; max enrolled feeds <code>capacity</code>
                </>
              )}
              . Expiry action and long-time-no-see are not implemented in the
              backend and are deliberately not shown.
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
