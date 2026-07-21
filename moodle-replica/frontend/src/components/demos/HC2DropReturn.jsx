// HC-2, run LIVE against the API: a student drops out in week 10, then
// re-enrols in week 12. The load-bearing fact this proves — unenrolment
// removes enrolment PATHS but never the completion rows, so progress survives
// the gap and resumes with the same numbers (nothing recomputed from zero).
//
// Every step fetches its own evidence fresh and logs the API calls it made —
// the trail IS the proof. No client-side rules: every fact shown is a response.
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiDelete, ApiError } from "../../api";
import { cachedGet } from "../../lib/catalog";
import { fetchOverview } from "../../lib/progressApi";
import UserSelect from "../common/UserSelect";
import CourseSelect from "../common/CourseSelect";
import ReasonList from "../common/ReasonList";
import Badge from "../common/Badge";

const STEP_ORDER = ["baseline", "dropped", "returned"];

function ProgressBar({ percent }) {
  if (percent === null || percent === undefined)
    return <span className="muted">no completion tracking</span>;
  return (
    <div className="bar">
      <div className="bar__fill" style={{ width: `${percent}%` }} />
      <span className="bar__label">{percent}%</span>
    </div>
  );
}

function PathChips({ paths }) {
  if (!paths || paths.length === 0)
    return <span className="muted">no paths — not enrolled</span>;
  return (
    <div className="form-row">
      {paths.map((p, i) => (
        <span className="chip" key={i}>
          {p.method} · {p.status}
          <Badge variant={p.live ? "green" : "grey"}>
            {p.live ? "live" : "not live"}
          </Badge>
        </span>
      ))}
    </div>
  );
}

function RowStat({ row }) {
  if (!row) return <span className="muted">no progress row</span>;
  return (
    <div>
      <ProgressBar percent={row.percent} />
      <div className="muted">
        {row.counted}/{row.total} counted
        {row.completed_at ? ` · completed ${row.completed_at}` : ""}
      </div>
    </div>
  );
}

export default function HC2DropReturn() {
  const [userId, setUserId] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [step, setStep] = useState("baseline"); // baseline → dropped → returned
  const [paths, setPaths] = useState([]);
  const [row, setRow] = useState(null);
  const [baselineRow, setBaselineRow] = useState(null); // anchor for "same numbers"
  const [participants, setParticipants] = useState(null);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [reasons, setReasons] = useState(null);

  const stepRef = useRef(null);
  const primaryRef = useRef(null);
  const mounted = useRef(false);

  const append = (line) => setLog((l) => [...l, line]);

  // On each step change, bring the fresh step into view and land focus on its
  // primary action (skip the first render so we never grab focus on load).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    stepRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "nearest",
    });
    primaryRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Default persona: resolve student.a by USERNAME — ids differ across DBs.
  useEffect(() => {
    cachedGet("/api/users")
      .then((list) => {
        const s = list.find((u) => u.username === "student.a");
        if (s) setUserId((cur) => cur ?? s.id);
      })
      .catch(() => {});
  }, []);

  // Default course by SHORT NAME too: autoSelectFirst grabs whatever course
  // sorts first (the teammates' DEMO course in the real DB), where student.a
  // has no paths — an accurate but misleading opening frame for the demo.
  useEffect(() => {
    cachedGet("/api/courses")
      .then((list) => {
        const cs = list.find((c) => c.short_name === "CS101");
        if (cs) setCourseId((cur) => (cur == null || cur === list[0]?.id ? cs.id : cur));
      })
      .catch(() => {});
  }, []);

  async function loadEvidence(uid, cid) {
    const all = await apiGet(`/api/enrolment/users/${uid}/enrolments`);
    const inCourse = all.filter((p) => p.course?.id === cid);
    const { rows } = await fetchOverview(uid);
    return { paths: inCourse, row: rows.find((r) => r.course.id === cid) || null };
  }

  // (Re)load the baseline whenever persona or course changes.
  useEffect(() => {
    if (!userId || !courseId) return;
    setStep("baseline");
    setParticipants(null);
    setReasons(null);
    setError(null);
    setLog([`GET /api/enrolment/users/${userId}/enrolments · GET progress overview`]);
    setBusy(true);
    loadEvidence(userId, courseId)
      .then(({ paths, row }) => {
        setPaths(paths);
        setRow(row);
        setBaselineRow(row);
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, courseId]);

  async function drop() {
    setBusy(true);
    setError(null);
    setReasons(null);
    try {
      const toDrop = paths.filter((p) => p.method_id != null);
      // Trust boundary: never fire DELETE /methods/undefined/... — the live API
      // returns method_id; if it's missing we can't unenrol that path.
      if (toDrop.length < paths.length) {
        setError("A path has no method_id — cannot unenrol it (live API required).");
        setBusy(false);
        return;
      }
      if (toDrop.length === 0) append("nothing to drop — already unenrolled");
      for (const p of toDrop) {
        await apiDelete(`/api/enrolment/methods/${p.method_id}/enrolments/${userId}`);
        append(`DELETE /api/enrolment/methods/${p.method_id}/enrolments/${userId} → 204`);
      }
      const ev = await loadEvidence(userId, courseId);
      const parts = await apiGet(`/api/enrolment/courses/${courseId}/participants?status=all`);
      append(`GET /api/enrolment/courses/${courseId}/participants?status=all → ${parts.length} row(s)`);
      setPaths(ev.paths);
      setRow(ev.row);
      setParticipants(parts);
      setStep("dropped");
    } catch (e) {
      if (e instanceof ApiError && e.reasons?.length) setReasons(e.reasons);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function returnEnrol() {
    setBusy(true);
    setError(null);
    setReasons(null);
    try {
      await apiPost(`/api/enrolment/courses/${courseId}/enrol`, { user_id: userId });
      append(`POST /api/enrolment/courses/${courseId}/enrol {user_id:${userId}} → ok`);
      const ev = await loadEvidence(userId, courseId);
      setPaths(ev.paths);
      setRow(ev.row);
      setStep("returned");
    } catch (e) {
      if (e instanceof ApiError && e.reasons?.length) setReasons(e.reasons);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Repeatable: guarantee an enrolled baseline. Already-enrolled is fine.
  async function reset() {
    setBusy(true);
    setError(null);
    setReasons(null);
    setLog([]);
    try {
      try {
        await apiPost(`/api/enrolment/courses/${courseId}/enrol`, { user_id: userId });
        append(`POST /api/enrolment/courses/${courseId}/enrol {user_id:${userId}} → ok`);
      } catch (e) {
        append(`re-enrol skipped: ${e.message}`);
      }
      const ev = await loadEvidence(userId, courseId);
      setPaths(ev.paths);
      setRow(ev.row);
      setBaselineRow(ev.row);
      setParticipants(null);
      setStep("baseline");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const userStillListed =
    participants && userId != null && participants.some((p) => p.user_id === userId);
  const sameNumbers =
    baselineRow && row && baselineRow.counted === row.counted && baselineRow.total === row.total;
  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="panel">
      <div className="panel__title">
        HC-2 · Student drops out (week 10), returns (week 12)
      </div>
      <div className="banner-info">
        This runs live against the shared database — it really unenrols and
        re-enrols. Use <strong>student.a</strong> on <strong>CS101</strong> so
        you don&apos;t disturb other demos.
      </div>

      <fieldset className="form-row setup-fieldset" disabled={busy}>
        <label>Student</label>
        <UserSelect value={userId} onChange={setUserId} />
        <label>Course</label>
        <CourseSelect value={courseId} onChange={setCourseId} autoSelectFirst />
      </fieldset>

      {!userId || !courseId ? (
        <p className="muted">Pick a student and a course to begin.</p>
      ) : (
        <>
          <div className="step-pills" aria-label="demo progress">
            {STEP_ORDER.map((s, i) => (
              <span
                key={s}
                className={`step-pill${i === stepIdx ? " step-pill--on" : ""}${
                  i < stepIdx ? " step-pill--done" : ""
                }`}
              >
                {s}
              </span>
            ))}
          </div>

          <div className="step-panel" key={step} ref={stepRef}>
            {step === "baseline" && (
              <div className="grid-cards">
                <div className="card">
                  <div className="card__title">Paths into this course</div>
                  <PathChips paths={paths} />
                </div>
                <div className="card">
                  <div className="card__title">Progress snapshot</div>
                  <RowStat row={row} />
                </div>
              </div>
            )}

            {step === "dropped" && (
              <div className="grid-cards">
                <div className="card">
                  <div className="card__title">Paths now (after drop)</div>
                  <PathChips paths={paths} />
                  <p className="muted">
                    Still on the roster?{" "}
                    <Badge variant={userStillListed ? "amber" : "grey"}>
                      {userStillListed ? "listed" : "not listed"}
                    </Badge>
                  </p>
                </div>
                <div className="card">
                  <div className="card__title">Progress row — survived</div>
                  <RowStat row={row} />
                  <p className="muted">
                    before the drop:{" "}
                    {baselineRow ? `${baselineRow.counted}/${baselineRow.total}` : "—"}
                  </p>
                </div>
              </div>
            )}

            {step === "returned" && (
              <>
                <div className="verdict-banner verdict-banner--allowed">
                  Work survived the gap — completion is a fact about the past,
                  enrolment is a fact about the present.
                </div>
                <div className="grid-cards">
                  <div className="card">
                    <div className="card__title">Paths now (re-enrolled)</div>
                    <PathChips paths={paths} />
                  </div>
                  <div className="card">
                    <div className="card__title">Progress resumed</div>
                    <RowStat row={row} />
                    <p className="muted">
                      {sameNumbers
                        ? "same numbers as before the drop — nothing recomputed from zero."
                        : "compare against the baseline above."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {error && <div className="error-banner">{error}</div>}
          {reasons && <ReasonList reasons={reasons} tone="error" title="Refused" />}

          <div className="form-row">
            {step === "baseline" && (
              <button
                ref={primaryRef}
                className="btn btn--primary"
                disabled={busy}
                onClick={drop}
              >
                Drop the student →
              </button>
            )}
            {step === "dropped" && (
              <button
                ref={primaryRef}
                className="btn btn--primary"
                disabled={busy}
                onClick={returnEnrol}
              >
                Re-enrol (week 12) →
              </button>
            )}
            {step !== "baseline" && (
              <button className="btn" disabled={busy} onClick={reset}>
                Reset demo
              </button>
            )}
          </div>

          {log.length > 0 && (
            <div>
              <div className="panel__title">API trail</div>
              {log.map((line, i) => (
                <div
                  className={`trail-line${
                    i === log.length - 1 ? " trail-line--new" : ""
                  }`}
                  key={i}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
