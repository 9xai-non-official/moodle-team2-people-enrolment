// My progress tab: per-course completion cards for the acting user, from
// GET /api/progress/users/{id}/overview. Percent, exclusion and self-criterion
// all come from the API; this only renders and fires self-complete.
import { useEffect, useState } from "react";
import { apiPost } from "../../api";
import { fetchOverview } from "../../lib/progressApi";
import { ApiError } from "../../errors";
import { useActingUser } from "../../context/ActingUser";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

function Bar({ percent, counted, total, excluded }) {
  // null percent → NO bar (Moodle shows nothing, not 0%) — matches DashboardPage.
  if (percent === null || percent === undefined) {
    return <span className="muted">no completion tracking</span>;
  }
  return (
    <div className="bar" title={`${counted} counted / ${total} total / ${excluded} excluded`}>
      <div className="bar__fill" style={{ width: `${percent}%` }} />
      <span className="bar__label">{percent}%</span>
    </div>
  );
}

export default function MyProgress() {
  const { actingUser } = useActingUser();
  const userId = actingUser?.id;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refusal, setRefusal] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetchOverview(userId)
      .then(({ rows: r }) => setRows(r))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, reloadKey]);

  async function selfComplete(courseId) {
    setRefusal(null);
    try {
      await apiPost(`/api/progress/courses/${courseId}/self-complete`, { user_id: userId });
      setReloadKey((k) => k + 1); // refetch — no optimistic UI
    } catch (e) {
      if (e instanceof ApiError && e.reasons.length) setRefusal(e.reasons);
      else setError(e.message);
    }
  }

  // Live-backend model (Mahdi): manual completion via POST /api/progress/complete.
  async function manualComplete(courseId) {
    setRefusal(null);
    try {
      await apiPost("/api/progress/complete", { user_id: userId, course_id: courseId });
      setReloadKey((k) => k + 1);
    } catch (e) {
      if (e instanceof ApiError && e.reasons.length) setRefusal(e.reasons);
      else setError(e.message);
    }
  }

  if (!userId) return <p className="muted">No acting user.</p>;
  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (rows.length === 0)
    return <p className="muted">No course completion for {actingUser.full_name}.</p>;

  return (
    <div>
      {refusal && <ReasonList reasons={refusal} title="Cannot self-complete" />}
      <div className="progress-strip">
        {rows.map((row) => (
          <div className="card" key={row.course.id}>
            <div className="card__title">
              {row.course.short_name}
              {row.course.deleted && (
                <span className="progress-deleted-flag">
                  <Badge variant="amber" title="served from snapshots">
                    deleted — served from snapshots
                  </Badge>
                </span>
              )}
            </div>
            <Bar
              percent={row.percent}
              counted={row.counted}
              total={row.total}
              excluded={row.excluded}
            />
            {row.percent !== null && row.percent !== undefined && (
              <div className="muted">
                {row.counted}/{row.total} criteria met
                {row.excluded > 0 && ` · ${row.excluded} hidden, excluded from %`}
              </div>
            )}
            {row.completed_at && (
              <div>
                <Badge variant="green" title={String(row.completed_at)}>
                  ✓ completed {String(row.completed_at).slice(0, 10)}
                </Badge>
              </div>
            )}
            {row.has_self_criterion && (
              <button
                className="btn"
                style={{ marginTop: "0.5rem" }}
                onClick={() => selfComplete(row.course.id)}
              >
                Complete course
              </button>
            )}
            {row.manual_completable && !row.completed && (
              <button
                className="btn"
                style={{ marginTop: "0.5rem" }}
                onClick={() => manualComplete(row.course.id)}
              >
                Mark complete (manual)
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
