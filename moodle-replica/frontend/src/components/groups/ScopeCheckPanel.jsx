// HC-3: the same actor/target pair returns three different outcomes depending on
// group scope. The verdict + reasons come straight from the API — no rule logic
// lives here. Quick-toggle swaps the actor between the scoped and all-groups TA.
import { useEffect, useState } from "react";
import { fetchActivityPolicies, accessCheck } from "../../lib/groupsApi";
import { cachedGet } from "../../lib/catalog";
import { useActingUser } from "../../context/ActingUser";
import UserSelect from "../common/UserSelect";
import ReasonList from "../common/ReasonList";

export default function ScopeCheckPanel({ courseId }) {
  const { actingUser } = useActingUser();
  const [actorId, setActorId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityId, setActivityId] = useState(null);
  const [listError, setListError] = useState(null);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);

  // actor defaults to the acting user (task 06 §4.4).
  useEffect(() => {
    if (actingUser) setActorId((cur) => cur ?? actingUser.id);
  }, [actingUser]);

  // Quick-toggle personas resolved by USERNAME — ids differ between the mock
  // seed and the real DB (hardcoded ids broke real mode; caught in testing).
  const [personas, setPersonas] = useState({});
  useEffect(() => {
    cachedGet("/api/users")
      .then((us) =>
        setPersonas(
          Object.fromEntries(
            us
              .filter((u) => ["ta.a", "ta.allgroups"].includes(u.username))
              .map((u) => [u.username, u.id]),
          ),
        ),
      )
      .catch(() => setPersonas({}));
  }, []);

  // activity options reuse the policy list — one source of the effective mode.
  useEffect(() => {
    setListError(null);
    setResult(null);
    fetchActivityPolicies(courseId)
      .then((rows) => {
        setActivities(rows);
        setActivityId(rows.length ? rows[0].activity_id : null);
      })
      .catch((e) => setListError(e.message));
  }, [courseId]);

  async function check() {
    if (!actorId || !targetId || !activityId) return;
    setChecking(true);
    setCheckError(null);
    setResult(null);
    try {
      const r = await accessCheck({
        actor_id: actorId,
        target_user_id: targetId,
        activity_id: activityId,
      });
      setResult(r);
    } catch (e) {
      setCheckError(e.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel__title">Can I act on them?</div>
      <p className="muted">
        Action, not just sight: whether this actor may grade one specific target.
      </p>
      <div className="form-row">
        <button
          className="btn"
          disabled={!personas["ta.a"]}
          onClick={() => setActorId(personas["ta.a"])}
        >
          as ta.a
        </button>
        <button
          className="btn"
          disabled={!personas["ta.allgroups"]}
          onClick={() => setActorId(personas["ta.allgroups"])}
        >
          as ta.allgroups
        </button>
      </div>

      <div className="form-row">
        <label>Actor</label>
        <UserSelect value={actorId} onChange={setActorId} placeholder="— actor —" />
        <label>Target</label>
        <UserSelect value={targetId} onChange={setTargetId} placeholder="— target —" />
        <label>Activity</label>
        <select
          className="select"
          value={activityId ?? ""}
          onChange={(e) => setActivityId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— activity —</option>
          {activities.map((a) => (
            <option key={a.activity_id} value={a.activity_id}>
              {a.name} ({a.effective_mode})
            </option>
          ))}
        </select>
        <button
          className="btn btn--primary"
          onClick={check}
          disabled={!actorId || !targetId || !activityId || checking}
        >
          {checking ? "Checking…" : "Check access"}
        </button>
      </div>

      {listError && <div className="error-banner">{listError}</div>}
      {checkError && <div className="error-banner">{checkError}</div>}

      {result && (
        <>
          <div
            className={`verdict-banner verdict-banner--${
              result.outcome === "allowed" ? "allowed" : "denied"
            }`}
          >
            {result.outcome === "invisible" ? "not even visible" : result.outcome}
          </div>
          <ReasonList
            reasons={result.reasons}
            tone={result.outcome === "allowed" ? "ok" : "error"}
          />
        </>
      )}
    </div>
  );
}
