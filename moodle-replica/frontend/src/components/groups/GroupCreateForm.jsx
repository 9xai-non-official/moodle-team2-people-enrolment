// Inline create row at the top of the board: name + optional enrolment key.
// No optimistic UI — a successful create refetches the board via onCreated.
// Backend refusals render verbatim.
import { useState } from "react";
import { createGroup } from "../../lib/groupsApi";
import ReasonList from "../common/ReasonList";

export default function GroupCreateForm({ courseId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [reasons, setReasons] = useState(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setReasons(null);
    try {
      const body = { name: name.trim() };
      if (key.trim()) body.enrolment_key = key.trim();
      await createGroup(courseId, body);
      setName("");
      setKey("");
      setOpen(false);
      onCreated();
    } catch (e) {
      setReasons(e.reasons?.length ? e.reasons : [e.message]);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + New group
      </button>
    );

  return (
    <div className="panel">
      <div className="panel__title">New group</div>
      <div className="form-row">
        <input
          className="input"
          placeholder="new group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="enrolment key (optional)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button className="btn btn--primary" onClick={create} disabled={!name.trim() || busy}>
          {busy ? "Creating…" : "Create group"}
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {reasons && <ReasonList reasons={reasons} tone="error" title="Could not create group" />}
    </div>
  );
}
