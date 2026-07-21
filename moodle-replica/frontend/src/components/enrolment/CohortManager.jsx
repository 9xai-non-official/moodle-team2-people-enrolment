// Full Cohorts tab (task 06 §4.2, HC-1 loop from the UI). Lists cohorts with an
// expandable member roster, creates cohorts, and adds/removes members. Every
// membership write triggers a backend cohort sync (enrol on add, UNENROL on
// remove), so we refetch after each write — no optimistic UI — and warn before
// a removal. Refusals show verbatim reasons; the members endpoint may 404 on
// the real backend, which surfaces via the self-locating error banner.
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete, ApiError } from "../../api";
import DataTable from "../common/DataTable";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";

export default function CohortManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [open, setOpen] = useState(null); // expanded cohort id
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);

  const [newName, setNewName] = useState("");
  const [newIdNumber, setNewIdNumber] = useState("");
  const [createError, setCreateError] = useState(null);
  const [createReasons, setCreateReasons] = useState(null);

  const [addUserId, setAddUserId] = useState(null);
  const [memberError, setMemberError] = useState(null);
  const [memberReasons, setMemberReasons] = useState(null);
  const [syncNote, setSyncNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCohorts = () => {
    setLoading(true);
    setError(null);
    apiGet("/api/enrolment/cohorts")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadCohorts, []);

  const loadMembers = (cohortId) => {
    setMembersLoading(true);
    setMembers([]);
    setMembersError(null);
    apiGet(`/api/enrolment/cohorts/${cohortId}/members`)
      .then(setMembers)
      .catch((e) => setMembersError(e.message))
      .finally(() => setMembersLoading(false));
  };

  const toggle = (cohort) => {
    setMemberError(null);
    setMemberReasons(null);
    setSyncNote(null);
    setAddUserId(null);
    if (open === cohort.id) {
      setOpen(null);
      return;
    }
    setOpen(cohort.id);
    loadMembers(cohort.id);
  };

  const createCohort = () => {
    setBusy(true);
    setCreateError(null);
    setCreateReasons(null);
    apiPost("/api/enrolment/cohorts", {
      name: newName,
      id_number: newIdNumber || undefined,
    })
      .then(() => {
        setNewName("");
        setNewIdNumber("");
        loadCohorts();
      })
      .catch((e) => {
        if (e instanceof ApiError) setCreateReasons(e.reasons);
        else setCreateError(e.message);
      })
      .finally(() => setBusy(false));
  };

  const addMember = (cohortId) => {
    setBusy(true);
    setMemberError(null);
    setMemberReasons(null);
    setSyncNote(null);
    apiPost(`/api/enrolment/cohorts/${cohortId}/members`, { user_id: addUserId })
      .then((res) => {
        setAddUserId(null);
        const synced = res?.synced_courses;
        setSyncNote(
          synced && synced.length
            ? `Sync ran — enrolled into: ${synced.join(", ")}. Check Participants.`
            : "Sync ran — check Participants.",
        );
        loadMembers(cohortId);
        loadCohorts();
      })
      .catch((e) => {
        if (e instanceof ApiError) setMemberReasons(e.reasons);
        else setMemberError(e.message);
      })
      .finally(() => setBusy(false));
  };

  const removeMember = (cohortId, userId, name) => {
    if (
      !window.confirm(
        `Remove ${name} from this cohort? Sync may UNENROL them from synced courses.`,
      )
    )
      return;
    setBusy(true);
    setMemberError(null);
    setMemberReasons(null);
    setSyncNote(null);
    apiDelete(`/api/enrolment/cohorts/${cohortId}/members/${userId}`)
      .then(() => {
        loadMembers(cohortId);
        loadCohorts();
      })
      .catch((e) => {
        if (e instanceof ApiError) setMemberReasons(e.reasons);
        else setMemberError(e.message);
      })
      .finally(() => setBusy(false));
  };

  return (
    <div>
      <div className="panel">
        <div className="panel__title">New cohort</div>
        {createError && <div className="error-banner">{createError}</div>}
        <div className="form-row">
          <label>Name</label>
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="cohort name"
          />
          <label>ID number</label>
          <input
            className="input"
            value={newIdNumber}
            onChange={(e) => setNewIdNumber(e.target.value)}
            placeholder="optional"
          />
          <button
            className="btn btn--primary"
            disabled={busy || !newName.trim()}
            onClick={createCohort}
          >
            Create cohort
          </button>
        </div>
        {createReasons && (
          <ReasonList
            reasons={createReasons}
            tone="error"
            title="Could not create cohort"
          />
        )}
      </div>

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        empty="No cohorts."
        columns={[
          { key: "name", label: "Cohort" },
          { key: "id_number", label: "ID number" },
          {
            key: "member_count",
            label: "Members",
            render: (r) => (
              <button className="btn" onClick={() => toggle(r)}>
                {r.member_count} {open === r.id ? "▴" : "▾"}
              </button>
            ),
          },
          {
            key: "synced_courses",
            label: "Synced courses",
            render: (r) =>
              r.synced_courses.length ? r.synced_courses.join(", ") : "—",
          },
        ]}
      />

      {open !== null && (
        <div className="panel">
          <div className="panel__title">Cohort members</div>

          {membersLoading && <span className="muted">Loading…</span>}
          {!membersLoading && membersError && (
            <div className="error-banner">{membersError}</div>
          )}
          {!membersLoading && !membersError && members.length === 0 && (
            <span className="muted">No members yet.</span>
          )}
          {!membersLoading &&
            !membersError &&
            members.map((m) => (
              <span className="chip" key={m.user_id}>
                {m.full_name} <span className="muted">({m.username})</span>{" "}
                <button
                  className="btn btn--danger"
                  disabled={busy}
                  aria-label={`Remove ${m.full_name}`}
                  onClick={() => removeMember(open, m.user_id, m.full_name)}
                >
                  ×
                </button>
              </span>
            ))}

          <div className="form-row">
            <label>Add member</label>
            <UserSelect value={addUserId} onChange={setAddUserId} />
            <button
              className="btn btn--primary"
              disabled={busy || !addUserId}
              onClick={() => addMember(open)}
            >
              Add
            </button>
          </div>

          {syncNote && <div className="banner-info">{syncNote}</div>}
          {memberError && <div className="error-banner">{memberError}</div>}
          {memberReasons && (
            <ReasonList
              reasons={memberReasons}
              tone="error"
              title="Could not update membership"
            />
          )}
        </div>
      )}
    </div>
  );
}
