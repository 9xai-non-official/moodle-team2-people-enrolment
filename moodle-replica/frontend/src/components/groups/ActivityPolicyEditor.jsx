// Edit one activity's configured group mode + grouping. Sends ONLY the fields
// the user changed; null is meaningful (inherit course / no grouping). On a
// force_group_mode course the banner is the GRP-012 demo: configure anything
// here and the effective column ignores it. onSaved closes + refetches.
import { useEffect, useState } from "react";
import { fetchGroupings, patchActivityPolicy } from "../../lib/groupsApi";
import Modal from "../common/Modal";
import ReasonList from "../common/ReasonList";

const MODES = ["none", "separate", "visible"];

export default function ActivityPolicyEditor({ activity, courseId, onClose, onSaved }) {
  const origMode = activity.configured_mode ?? "";
  const origGrouping = activity.grouping ? String(activity.grouping.id) : "";
  const [mode, setMode] = useState(origMode);
  const [grouping, setGrouping] = useState(origGrouping);
  const [groupings, setGroupings] = useState([]);
  const [reasons, setReasons] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchGroupings(courseId)
      .then(setGroupings)
      .catch(() => setGroupings([]));
  }, [courseId]);

  // "" in either select means null (inherit course / no grouping).
  const changes = {};
  if (mode !== origMode) changes.group_mode = mode === "" ? null : mode;
  if (grouping !== origGrouping) changes.grouping_id = grouping === "" ? null : Number(grouping);
  const dirty = Object.keys(changes).length > 0;

  async function save() {
    setBusy(true);
    setReasons(null);
    try {
      await patchActivityPolicy(activity.activity_id, changes);
      onSaved();
    } catch (e) {
      setReasons(e.reasons?.length ? e.reasons : [e.message]);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={`Group policy — ${activity.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={!dirty || busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {activity.forced && (
        <div className="banner-info">
          course forces group mode — whatever you configure here will be silently ignored
          (GRP-012); watch the effective column stay put.
        </div>
      )}
      <div className="form-row">
        <label>Configured mode</label>
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">— (inherit course)</option>
          {MODES.map((mm) => (
            <option key={mm} value={mm}>
              {mm}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>Grouping</label>
        <select className="select" value={grouping} onChange={(e) => setGrouping(e.target.value)}>
          <option value="">— (no grouping)</option>
          {groupings.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      {reasons && <ReasonList reasons={reasons} tone="error" title="Could not save" />}
    </Modal>
  );
}
