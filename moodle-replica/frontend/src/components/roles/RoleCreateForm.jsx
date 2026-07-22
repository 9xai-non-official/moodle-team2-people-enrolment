// Create a role — Moodle's real answer to per-person scope. "Duplicate
// capabilities from" copies the source role's WHOLE definition (system
// defaults + every context override); you then override the COPY. That is
// exactly how ta.allgroups exists: a scoped duplicate of 'teacher'.
//
// The duplicate-from dropdown reads /api/roles with apiGet, NOT cachedGet:
// roles became a mutated list the moment POST /api/roles landed, and
// lib/catalog.js's own rule forbids caching mutated lists. Re-opening the
// form always shows freshly-created roles as duplication sources — no TTL.
import { useState } from "react";
import { apiGet, apiPost, ApiError } from "../../api";
import ReasonList from "../common/ReasonList";

const ARCHETYPES = ["manager", "editingteacher", "teacher", "student", "guest"];

export default function RoleCreateForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [shortName, setShortName] = useState("");
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const [reasons, setReasons] = useState([]);

  function expand() {
    setOpen(true);
    apiGet("/api/roles")
      .then(setRoles)
      .catch((e) => setReasons([e.message]));
  }

  function submit() {
    setReasons([]);
    apiPost("/api/roles", {
      short_name: shortName.trim(),
      name: name.trim(),
      archetype: archetype || null,
      duplicate_of: duplicateOf ? Number(duplicateOf) : null,
    })
      .then(() => {
        setShortName("");
        setName("");
        setArchetype("");
        setDuplicateOf("");
        setOpen(false);
        onCreated?.();
      })
      .catch((e) => setReasons(e instanceof ApiError ? e.reasons : [e.message]));
  }

  if (!open)
    return (
      <button className="btn" onClick={expand}>
        + New role
      </button>
    );

  const canSubmit = shortName.trim() && name.trim();

  return (
    <div className="panel">
      <div className="panel__title">New role</div>
      <div className="form-row">
        <label>Short name</label>
        <input
          className="input"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          placeholder="teacher-allgroups"
        />
        <label>Display name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="TA (all groups)"
        />
        <label>Archetype</label>
        <select
          className="select"
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
        >
          <option value="">none</option>
          {ARCHETYPES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <label>Duplicate capabilities from</label>
        <select
          className="select"
          value={duplicateOf}
          onChange={(e) => setDuplicateOf(e.target.value)}
        >
          <option value="">none (blank role)</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
          Create
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <div className="muted">
        per-person TA scope = duplicate the role, then override the copy — this is Moodle&apos;s
        actual answer (see ta.allgroups).
      </div>
      {reasons.length > 0 && <ReasonList reasons={reasons} tone="error" title="Refused" />}
    </div>
  );
}
