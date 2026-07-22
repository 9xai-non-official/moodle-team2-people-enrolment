// Report tab: tracked users (rows) × activities (columns) completion matrix.
// All business rules (glyph state, can_override, group filter) come from the
// API — this component only renders and fires writes, then refetches.
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";
import { ApiError } from "../../errors";
import { useActingUser } from "../../context/ActingUser";
import Badge from "../common/Badge";
import DataTable from "../common/DataTable";
import ExportCsvButton from "../common/ExportCsvButton";
import Modal from "../common/Modal";
import ReasonList from "../common/ReasonList";

const STATES = ["incomplete", "complete", "complete_pass", "complete_fail"];

function Glyph({ cell }) {
  if (cell.overridden_by) {
    return (
      <span className="glyph glyph--locked" title={`overridden by ${cell.overridden_by.full_name}`}>
        🔒
      </span>
    );
  }
  if (cell.state === "complete_pass") return <span className="glyph glyph--pass">✓P</span>;
  if (cell.state === "complete_fail") return <span className="glyph glyph--fail">✗F</span>;
  if (cell.state === "complete") return <span className="glyph">✓</span>;
  return <span className="glyph">○</span>;
}

export default function CompletionGrid({ courseId }) {
  const { actingUser } = useActingUser();
  const actorId = actingUser?.id;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(
    () => localStorage.getItem(`grid-group-${courseId}`) ?? "",
  );
  const [viewAs, setViewAs] = useState(false);
  const [target, setTarget] = useState(null); // override modal: {userId, activityId}
  const [overrideState, setOverrideState] = useState("complete");
  const [refusal, setRefusal] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!actorId) return;
    setLoading(true);
    setError(null);
    const q = `actor_id=${actorId}${groupId ? `&group_id=${groupId}` : ""}`;
    apiGet(`/api/progress/courses/${courseId}/report?${q}`)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, groupId, actorId, reloadKey]);

  // Group options come from the Groups domain — cross-domain GET is fine (§4.5).
  useEffect(() => {
    apiGet(`/api/groups/courses/${courseId}/groups`)
      .then((list) => setGroups(Array.isArray(list) ? list : []))
      .catch(() => setGroups([]));
  }, [courseId]);

  // Remember the last group filter per course (§4.5 flow) — restore on course
  // change, persist on user change. ponytail: a since-deleted group id lingers
  // until re-picked; per-course keying keeps it from bleeding across courses.
  useEffect(() => {
    setGroupId(localStorage.getItem(`grid-group-${courseId}`) ?? "");
  }, [courseId]);
  const changeGroup = (v) => {
    setGroupId(v);
    if (v) localStorage.setItem(`grid-group-${courseId}`, v);
    else localStorage.removeItem(`grid-group-${courseId}`);
  };

  async function manualTick(activityId) {
    try {
      await apiPost(`/api/progress/activities/${activityId}/toggle`, { user_id: actorId });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitOverride() {
    setRefusal(null);
    try {
      await apiPost(`/api/progress/activities/${target.activityId}/override`, {
        user_id: target.userId,
        state: overrideState,
        actor_id: actorId,
      });
      setTarget(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.reasons.length) setRefusal(e.reasons);
      else setError(e.message);
    }
  }

  const activities = report?.activities ?? [];
  const canOverride = report?.can_override ?? false;
  const columns = [
    { key: "user", label: "User", render: (row) => row.full_name },
    ...activities.map((a) => ({
      key: `a${a.id}`,
      label: (
        <span>
          {a.name}{" "}
          {a.hidden && (
            <Badge variant="amber" title="in this report, excluded from dashboard %">
              hidden
            </Badge>
          )}
        </span>
      ),
      render: (row) => {
        const cell =
          row.cells.find((c) => c.activity_id === a.id) ||
          { activity_id: a.id, state: "incomplete", overridden_by: null, viewed: false };
        const own = row.user_id === actorId;
        return (
          <div>
            <Glyph cell={cell} />
            {cell.viewed && <span className="muted"> seen</span>}
            <div>
              <button
                className="btn"
                disabled={viewAs || !canOverride}
                title={!canOverride ? report.cannot_override_reason : undefined}
                onClick={() => {
                  setRefusal(null);
                  setOverrideState(cell.state === "incomplete" ? "complete" : cell.state);
                  setTarget({ userId: row.user_id, activityId: a.id });
                }}
              >
                Override
              </button>
              {own && !viewAs && (
                <button className="btn" onClick={() => manualTick(a.id)}>
                  Tick
                </button>
              )}
            </div>
          </div>
        );
      },
    })),
    {
      key: "cc",
      label: "Course complete",
      render: (row) =>
        row.course_complete.done ? (
          <span className="glyph glyph--pass">✓ {row.course_complete.at}</span>
        ) : (
          <span className="glyph">○</span>
        ),
    },
  ];

  return (
    <div>
      <div className="form-row">
        <label>Group</label>
        <select className="select" value={groupId} onChange={(e) => changeGroup(e.target.value)}>
          <option value="">all groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => setViewAs((v) => !v)}>
          {viewAs ? "Exit student view" : `View as ${actingUser?.full_name ?? "student"}`}
        </button>
        <ExportCsvButton
          filename={`completion-course-${courseId}.csv`}
          rows={report?.rows ?? []}
          columns={[
            { key: "full_name", label: "user" },
            ...activities.map((a) => ({
              key: `a${a.id}`,
              label: a.name + (a.hidden ? " (hidden)" : ""),
              value: (r) => {
                const cell = r.cells.find((c) => c.activity_id === a.id);
                const state = cell?.state ?? "incomplete";
                return cell?.overridden_by ? `${state} (overridden)` : state;
              },
            })),
            {
              key: "course_complete",
              label: "course_complete",
              value: (r) => (r.course_complete?.done ? r.course_complete.at : "no"),
            },
          ]}
        />
      </div>

      {viewAs && (
        <div className="banner-info">
          viewing as {actingUser?.full_name} — actions disabled (student simulation)
          <button
            className="btn"
            style={{ marginLeft: "0.6rem" }}
            onClick={() => setViewAs(false)}
          >
            Exit student view
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={report?.rows ?? []}
        loading={loading}
        error={error}
        empty="No tracked users in this course."
        rowKey={(r) => r.user_id}
      />

      <Modal
        open={!!target}
        title="Override completion"
        onClose={() => setTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)}>
              Cancel
            </button>
            <button className="btn btn--primary" onClick={submitOverride}>
              Override
            </button>
          </>
        }
      >
        <div className="form-row">
          <label>New state</label>
          <select
            className="select"
            value={overrideState}
            onChange={(e) => setOverrideState(e.target.value)}
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {refusal && <ReasonList reasons={refusal} title="Override refused" />}
      </Modal>
    </div>
  );
}
