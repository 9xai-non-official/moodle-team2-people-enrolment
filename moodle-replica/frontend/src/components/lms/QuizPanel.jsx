// Student's quiz workspace: start an attempt (limited attempts, one open at
// a time), answer, finish → auto-marked instantly except essays, which wait
// for the teacher ("finished" vs "graded" — Moodle's manual-marking split).
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch } from "../../api";
import Badge from "../common/Badge";
import ReasonList from "../common/ReasonList";

export default function QuizPanel({ activity, userId }) {
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null); // the open/in-focus attempt
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setError(null);
    apiGet(`/api/lms/activities/${activity.id}/quiz?user_id=${userId}`)
      .then((q) => {
        setQuiz(q);
        const open = q.my_attempts.find((a) => a.state === "in_progress");
        setAttempt(open ?? null);
        setAnswers(open?.answers ?? {});
      })
      .catch(setError);
  }
  useEffect(load, [activity.id, userId]);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const a = await apiPost(`/api/lms/activities/${activity.id}/attempts`, { user_id: userId });
      setAttempt(a);
      setAnswers({});
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setError(null);
    setBusy(true);
    try {
      await apiPatch(`/api/lms/attempts/${attempt.id}`, { answers });
      await apiPost(`/api/lms/attempts/${attempt.id}/finish`);
      load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  if (!quiz) return error ? <ReasonList reasons={error.reasons ?? [error.message]} /> : <p className="muted">loading…</p>;

  const used = quiz.my_attempts.filter((a) => a.state !== "in_progress").length;
  const left = quiz.attempts_allowed - quiz.my_attempts.length;

  return (
    <div className="panel">
      <div className="panel__title">
        🧪 {activity.name}
        <Badge variant="neutral">
          {used}/{quiz.attempts_allowed} attempts used
        </Badge>
        <Badge variant="neutral">max {quiz.max_score} pts</Badge>
      </div>

      {attempt ? (
        <>
          {quiz.questions.map((q, i) => (
            <div className="quiz-q" key={q.id}>
              <div className="quiz-q__text">
                {i + 1}. {q.text} <span className="muted">({q.points} pts)</span>
              </div>
              {q.type === "multichoice" &&
                q.options.map((opt, oi) => (
                  <label className="quiz-opt" key={oi}>
                    <input
                      type="radio"
                      name={`q${q.id}`}
                      checked={String(answers[q.id]) === String(oi)}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    />
                    {opt}
                  </label>
                ))}
              {q.type === "truefalse" &&
                [true, false].map((v) => (
                  <label className="quiz-opt" key={String(v)}>
                    <input
                      type="radio"
                      name={`q${q.id}`}
                      checked={answers[q.id] === v}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                    />
                    {v ? "True" : "False"}
                  </label>
                ))}
              {q.type === "essay" && (
                <textarea
                  className="input input--area"
                  rows={3}
                  placeholder="Your answer — a teacher marks this by hand"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="form-row">
            <button
              className="btn"
              disabled={busy}
              onClick={() => apiPatch(`/api/lms/attempts/${attempt.id}`, { answers }).catch(setError)}
            >
              Save progress
            </button>
            <button className="btn btn--primary" disabled={busy} onClick={finish}>
              Finish attempt
            </button>
          </div>
        </>
      ) : (
        <div className="form-row">
          <button className="btn btn--primary" disabled={busy || left <= 0} onClick={start}>
            {quiz.my_attempts.length ? "Start another attempt" : "Start attempt"}
          </button>
          {left <= 0 && <span className="muted">no attempts left</span>}
        </div>
      )}

      {quiz.my_attempts.filter((a) => a.state !== "in_progress").length > 0 && (
        <>
          <h3>My attempts</h3>
          {quiz.my_attempts
            .filter((a) => a.state !== "in_progress")
            .map((a) => (
              <div className="form-row" key={a.id}>
                <span>{a.finished_at?.slice(0, 16).replace("T", " ")}</span>
                <span>auto: {a.auto_score} pts</span>
                {a.state === "graded" ? (
                  <Badge variant={a.total >= quiz.grade_to_pass ? "green" : "red"}>
                    total {a.total}/{quiz.max_score}
                  </Badge>
                ) : (
                  <Badge variant="amber" title="essay answers wait for a teacher">
                    essay awaiting marking
                  </Badge>
                )}
              </div>
            ))}
        </>
      )}
      {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}
    </div>
  );
}
