// One .panel per group: name, key/participation flags, member chips (provenance
// badge + remove ×), and an add-member row. Backend refusals (403 non-enrolled,
// 409 machine-owned) render verbatim; machine-owned rows get a Force remove.
// No optimistic UI — every successful mutation refetches.
import { useCallback, useEffect, useState } from "react";
import { apiPost, apiDelete } from "../../api";
import { fetchGroupsBoard, deleteGroup as apiDeleteGroup } from "../../lib/groupsApi";
import { useActingUser } from "../../context/ActingUser";
import Badge from "../common/Badge";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";
import GroupCreateForm from "./GroupCreateForm";

// provenance: '' = added by hand; enrol_* = owned by an enrolment sync.
const PROVENANCE = {
  "": { label: "manual", variant: "neutral" },
  enrol_cohort: { label: "enrol_cohort", variant: "blue" },
  enrol_self: { label: "enrol_self", variant: "blue" },
};

export default function GroupsBoard({ courseId }) {
  const { actingUser } = useActingUser();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addSel, setAddSel] = useState({}); // groupId -> selected user id
  const [notice, setNotice] = useState(null); // { groupId, reasons, retry? }

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchGroupsBoard(courseId)
      .then(setGroups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addMember(groupId) {
    const userId = addSel[groupId];
    if (!userId) return;
    setNotice(null);
    try {
      await apiPost(`/api/groups/${groupId}/members`, {
        user_id: userId,
        actor_id: actingUser?.id,
      });
      setAddSel((s) => ({ ...s, [groupId]: null }));
      load();
    } catch (e) {
      setNotice({ groupId, reasons: e.reasons?.length ? e.reasons : [e.message] });
    }
  }

  async function removeGroup(groupId, name) {
    if (
      !window.confirm(
        `Delete "${name}"? This removes the group and its memberships — users and enrolments untouched (GRP-001).`,
      )
    )
      return;
    setNotice(null);
    try {
      await apiDeleteGroup(groupId);
      load();
    } catch (e) {
      setNotice({ groupId, reasons: e.reasons?.length ? e.reasons : [e.message] });
    }
  }

  async function removeMember(groupId, userId, force = false) {
    setNotice(null);
    try {
      await apiDelete(
        `/api/groups/${groupId}/members/${userId}?actor_id=${actingUser?.id ?? ""}${force ? "&force=1" : ""}`,
      );
      load();
    } catch (e) {
      setNotice({
        groupId,
        reasons: e.reasons?.length ? e.reasons : [e.message],
        retry: e.payload?.machine_owned ? () => removeMember(groupId, userId, true) : undefined,
      });
    }
  }

  return (
    <div>
      <GroupCreateForm courseId={courseId} onCreated={load} />
      {loading && <p className="muted">Loading groups…</p>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && !error && groups.length === 0 && (
        <p className="muted">No groups in this course.</p>
      )}
      {!loading &&
        !error &&
        groups.map((g) => (
        <div className="panel" key={g.id}>
          <div className="panel__title">
            {g.name}
            {g.enrolment_key && (
              <Badge variant="amber" title="group has an enrolment key">
                key
              </Badge>
            )}
            {!g.participation && (
              <Badge variant="grey" title="non-participation group">
                no participation
              </Badge>
            )}
            <button className="btn btn--danger" onClick={() => removeGroup(g.id, g.name)}>
              Delete group
            </button>
          </div>

          <div>
            {g.members.length === 0 && <span className="muted">no members</span>}
            {g.members.map((mm) => {
              const prov = PROVENANCE[mm.provenance] ?? PROVENANCE[""];
              // HC-4: membership in several groups of one course is legal —
              // count across the whole board (API data, only counted here).
              const inGroups = groups.filter((og) =>
                og.members.some((m) => m.user_id === mm.user_id),
              ).length;
              return (
                <span className="chip" key={mm.user_id}>
                  {mm.full_name}
                  <Badge variant={prov.variant}>{prov.label}</Badge>
                  {inGroups > 1 && (
                    <Badge variant="amber" title="member of several groups at once — HC-4; 'separate' mode shows the union">
                      ×{inGroups}
                    </Badge>
                  )}
                  <button
                    className="modal-close"
                    title="remove"
                    aria-label={`remove ${mm.full_name}`}
                    onClick={() => removeMember(g.id, mm.user_id)}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>

          <div className="form-row">
            <UserSelect
              value={addSel[g.id] ?? null}
              onChange={(v) => setAddSel((s) => ({ ...s, [g.id]: v }))}
              placeholder="— add member —"
            />
            <button className="btn" onClick={() => addMember(g.id)} disabled={!addSel[g.id]}>
              Add
            </button>
          </div>

          {notice?.groupId === g.id && (
            <>
              <ReasonList reasons={notice.reasons} tone="error" title="Refused" />
              {notice.retry && (
                <button className="btn btn--danger" onClick={notice.retry}>
                  Force remove
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
