// Teaching — the teacher portal. Everything a teacher does in one place:
// roster + enrolment requests, promote someone to non-editing teacher,
// build assignments and quizzes, grade submissions and essay questions
// (group-scoped, hard case 3), and the course-creation truth: teachers
// REQUEST courses, managers create them (moodle/course:create).
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api";
import { useActingUser } from "../context/ActingUser";
import { useSelectedCourse } from "../context/SelectedCourse";
import { useSession } from "../context/Session";
import Badge from "../components/common/Badge";
import PageIntro from "../components/common/PageIntro";
import ReasonList from "../components/common/ReasonList";
import Tabs from "../components/common/Tabs";

const TABS = ["Roster", "Content", "Grading", "New course"];

const errText = (e) => (e.reasons?.length ? e.reasons : [e.message]);

// ---- Roster: participants, enrolment requests, role promotion -----------

function RosterTab({ course, actorId, onNavigate }) {
  const [rows, setRows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);
  const [assigning, setAssigning] = useState(null); // user being promoted
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [enrolUserId, setEnrolUserId] = useState("");
  const [roles, setRoles] = useState([]);
  const [enrolRoleId, setEnrolRoleId] = useState("");

  function load() {
    setError(null);
    apiGet(`/api/enrolment/courses/${course.id}/participants?status=all`).then(setRows).catch(setError);
    apiGet(`/api/lms/courses/${course.id}/enrol-requests?actor_id=${actorId}`)
      .then(setRequests)
      .catch(() => setRequests([]));
    apiGet("/api/roles/contexts").then(setContexts).catch(() => {});
    apiGet("/api/users").then(setAllUsers).catch(() => {});
    // Roles resolved by short_name from the DB — ids are serial, not a contract.
    apiGet("/api/roles").then((rs) => {
      setRoles(rs);
      setEnrolRoleId((cur) => cur || rs.find((r) => r.short_name === "student")?.id || "");
    }).catch(() => {});
  }
  const reload = () => { setTimeout(load, 450); setTimeout(load, 1600); }; // pooled reads trail fresh writes — double-tap
  useEffect(load, [course.id, actorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const courseCtx = contexts.find((c) => c.level === "course" && c.instance_id === course.id);
  const studentRoleId = roles.find((r) => r.short_name === "student")?.id;
  const teacherRoleId = roles.find((r) => r.short_name === "teacher")?.id;
  const enrolledIds = new Set(rows.map((r) => r.user_id));
  const enrollable = allUsers.filter((u) => !enrolledIds.has(u.id));

  async function decide(req, verb) {
    setError(null);
    try {
      await apiPost(`/api/lms/enrol-requests/${req.id}/${verb}`, { actor_id: actorId });
      reload();
    } catch (e) {
      setError(e);
    }
  }

  async function enrolUser() {
    setError(null);
    try {
      await apiPost(`/api/lms/courses/${course.id}/enrol`, {
        actor_id: actorId,
        user_id: Number(enrolUserId),
        role_id: Number(enrolRoleId),
      });
      setEnrolOpen(false);
      setEnrolUserId("");
      reload();
    } catch (e) {
      setError(e);
    }
  }

  async function pathAction(p, action) {
    setError(null);
    try {
      if (action === "unenrol") {
        await apiDelete(`/api/lms/enrolments/${p.enrolment_id}?actor_id=${actorId}`);
      } else {
        await apiPatch(`/api/lms/enrolments/${p.enrolment_id}`, { actor_id: actorId, status: action });
      }
      reload();
    } catch (e) {
      setError(e);
    }
  }

  async function demote(userId) {
    setError(null);
    try {
      await apiPost(`/api/lms/courses/${course.id}/remove-role`, {
        actor_id: actorId,
        user_id: userId,
        role_id: teacherRoleId,
      });
      reload();
    } catch (e) {
      setError(e);
    }
  }

  async function promote(userId) {
    setError(null);
    try {
      // non-editing teacher role (resolved by short_name); the assignable
      // matrix on the server refuses anything the actor's own role may not grant.
      await apiPost("/api/roles/assignments", {
        actor_id: actorId,
        user_id: userId,
        role_id: teacherRoleId,
        context_id: courseCtx?.id,
      });
      setAssigning(null);
      reload();
    } catch (e) {
      setError(e);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <>
      {pending.length > 0 && (
        <div className="panel panel--attention">
          <div className="panel__title">🔔 Enrolment requests ({pending.length})</div>
          {pending.map((r) => (
            <div className="form-row" key={r.id}>
              <strong>{r.user?.full_name}</strong>
              <span className="muted">“{r.message}”</span>
              <button className="btn btn--primary" onClick={() => decide(r, "approve")}>
                Approve → manual enrol
              </button>
              <button className="btn btn--danger" onClick={() => decide(r, "deny")}>
                Deny
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="form-row">
        <h3 style={{ margin: 0 }}>Participants</h3>
        <span style={{ flex: 1 }} />
        <button className="btn btn--primary" onClick={() => setEnrolOpen((v) => !v)}>
          + Enrol user
        </button>
      </div>
      {enrolOpen && (
        <div className="panel panel--attention">
          <div className="panel__title">Enrol a user into {course.short_name}</div>
          <div className="form-row">
            <select className="select" value={enrolUserId} onChange={(e) => setEnrolUserId(e.target.value)}>
              <option value="">— pick a user —</option>
              {enrollable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.username})
                </option>
              ))}
            </select>
            <select className="select" value={enrolRoleId} onChange={(e) => setEnrolRoleId(e.target.value)}>
              {studentRoleId && <option value={studentRoleId}>as student</option>}
              {teacherRoleId && <option value={teacherRoleId}>as non-editing teacher</option>}
            </select>
            <button className="btn btn--primary" disabled={!enrolUserId} onClick={enrolUser}>
              Enrol
            </button>
          </div>
          <p className="muted">
            Manual enrolment (enrol/manual:enrol) — an editing-teacher power; a
            teacher may only grant roles below their own.
          </p>
        </div>
      )}
      <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>who</th>
            <th>roles</th>
            <th>status</th>
            <th>groups</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.user_id}>
              <td>{p.full_name}</td>
              <td>{p.roles.join(", ") || <span className="muted">—</span>}</td>
              <td>
                <Badge variant={p.effective_status === "active" ? "green" : "amber"}>
                  {p.effective_status?.replace("_", " ")}
                </Badge>
              </td>
              <td>
                {p.groups.map((g) => g.name).join(", ") || <span className="muted">—</span>}{" "}
                {onNavigate && (
                  <button
                    className="btn btn--sm cell-actions"
                    title="Group membership lives on the Groups board — same course stays selected"
                    onClick={() => onNavigate("Groups")}
                  >
                    manage →
                  </button>
                )}
              </td>
              <td>
                <div className="cell-actions">
                  {!p.roles.includes("teacher") && !p.roles.includes("editingteacher") && (
                    <button
                      className="btn btn--sm"
                      title="Make this person a non-editing teacher here — they can grade, never edit (Moodle's grade-only role)"
                      onClick={() => setAssigning(p)}
                    >
                      → non-editing teacher
                    </button>
                  )}
                  {p.roles.includes("teacher") && (
                    <button
                      className="btn btn--sm"
                      title="Remove the non-editing teacher role (their enrolment stays)"
                      onClick={() => demote(p.user_id)}
                    >
                      remove TA role
                    </button>
                  )}
                  {p.paths
                    .filter((path) => path.method !== "cohort")
                    .slice(0, 1)
                    .map((path) => (
                      <span key={path.enrolment_id}>
                        {path.status === "active" ? (
                          <button
                            className="btn btn--sm"
                            title="Suspend: blocks access, keeps every scrap of data — the reversible lever"
                            onClick={() => pathAction(path, "suspended")}
                          >
                            suspend
                          </button>
                        ) : (
                          <button
                            className="btn btn--sm"
                            title="Reactivate this enrolment path"
                            onClick={() => pathAction(path, "active")}
                          >
                            reactivate
                          </button>
                        )}
                        <button
                          className="btn btn--sm btn--danger"
                          title="Unenrol this path — completions survive, but course access ends (cohort paths refuse: sync recreates them)"
                          onClick={() => pathAction(path, "unenrol")}
                        >
                          unenrol
                        </button>
                      </span>
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {assigning && (
        <div className="panel panel--attention">
          <div className="panel__title">
            Promote {assigning.full_name} to non-editing teacher in {course.short_name}?
          </div>
          <p className="muted">
            They will be able to view and grade students&apos; work but never
            alter or delete activities — Moodle&apos;s grade-only role. A
            teacher may only assign roles below their own (non-editing teacher,
            student).
          </p>
          <div className="form-row">
            <button className="btn btn--primary" onClick={() => promote(assigning.user_id)}>
              Assign role
            </button>
            <button className="btn" onClick={() => setAssigning(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <ReasonList reasons={errText(error)} />}
    </>
  );
}

// ---- Content: create assignment / quiz ----------------------------------

const EMPTY_Q = () => ({ type: "multichoice", text: "", points: 2, options: "A, B, C, D", answer: 0 });

function ContentTab({ course, actorId, session }) {
  const [activities, setActivities] = useState([]);
  const [kind, setKind] = useState(null); // "assign" | "quiz" being built
  const [name, setName] = useState("");
  const [attempts, setAttempts] = useState(3);
  const [questions, setQuestions] = useState([EMPTY_Q()]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [editing, setEditing] = useState(null); // activity id being renamed
  const [editName, setEditName] = useState("");
  const [editAttempts, setEditAttempts] = useState(3);

  function load() {
    apiGet(`/api/lms/courses/${course.id}/activities?user_id=${actorId}`).then(setActivities).catch(() => {});
  }
  const reload = () => { setTimeout(load, 450); setTimeout(load, 1600); }; // pooled reads trail fresh writes — double-tap
  useEffect(load, [course.id, actorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    setError(null);
    setDone(null);
    try {
      const body = { actor_id: actorId, activity_type: kind, name };
      if (kind === "quiz") {
        body.attempts_allowed = attempts;
        body.questions = questions.map((q) => ({
          type: q.type,
          text: q.text,
          points: q.points,
          options: q.type === "multichoice" ? q.options.split(",").map((s) => s.trim()) : undefined,
          answer: q.type === "multichoice" ? Number(q.answer) : q.type === "truefalse" ? q.answer === true || q.answer === "true" : null,
        }));
      }
      const a = await apiPost(`/api/lms/courses/${course.id}/activities`, body);
      setDone(a);
      setKind(null);
      setName("");
      setQuestions([EMPTY_Q()]);
      reload();
    } catch (e) {
      setError(e);
    }
  }

  const setQ = (i, patch) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <>
      <h3>Activities in {course.short_name}</h3>
      {activities.map((a) => (
        <div className="form-row" key={a.id}>
          {editing === a.id ? (
            <>
              <input
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
              {a.activity_type === "quiz" && (
                <label>
                  attempts{" "}
                  <input
                    className="input input--num"
                    type="number"
                    min={1}
                    value={editAttempts}
                    onChange={(e) => setEditAttempts(e.target.value)}
                  />
                </label>
              )}
              <button
                className="btn btn--sm btn--primary"
                onClick={async () => {
                  setError(null);
                  try {
                    await apiPatch(`/api/lms/activities/${a.id}`, {
                      actor_id: actorId,
                      name: editName,
                      attempts_allowed: a.activity_type === "quiz" ? editAttempts : undefined,
                    });
                    setEditing(null);
                    reload();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                save
              </button>
              <button className="btn btn--sm" onClick={() => setEditing(null)}>
                cancel
              </button>
            </>
          ) : (
            <>
              <span>
                {a.activity_type === "quiz" ? "🧪" : a.activity_type === "assign" ? "📄" : "▫️"} {a.name}
              </span>
              {!a.visible && <Badge variant="grey">hidden from students</Badge>}
              <div className="cell-actions">
                <button
                  className="btn btn--sm"
                  title="Rename (and for quizzes, change the attempt limit)"
                  onClick={() => {
                    setEditing(a.id);
                    setEditName(a.name);
                    setEditAttempts(3);
                  }}
                >
                  ✏️ edit
                </button>
                <button
                  className="btn btn--sm"
                  title={
                    a.visible
                      ? "Hide: the activity stops existing for students, instantly"
                      : "Show it to students again"
                  }
                  onClick={async () => {
                    setError(null);
                    try {
                      await apiPatch(`/api/lms/activities/${a.id}`, { actor_id: actorId, visible: !a.visible });
                      reload();
                    } catch (e) {
                      setError(e);
                    }
                  }}
                >
                  {a.visible ? "hide" : "show"}
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="form-row">
        <button className="btn btn--primary" onClick={() => setKind("assign")}>
          + Assignment
        </button>
        <button className="btn btn--primary" onClick={() => setKind("quiz")}>
          + Quiz
        </button>
        {session?.is_admin === false && !session?.teaches?.length && null}
      </div>

      {kind && (
        <div className="panel">
          <div className="panel__title">New {kind === "quiz" ? "quiz" : "assignment"}</div>
          <div className="form-row">
            <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            {kind === "quiz" && (
              <label>
                attempts allowed{" "}
                <input
                  className="input input--num"
                  type="number"
                  min={1}
                  max={10}
                  value={attempts}
                  onChange={(e) => setAttempts(Number(e.target.value))}
                />
              </label>
            )}
          </div>

          {kind === "quiz" && (
            <>
              {questions.map((q, i) => (
                <div className="quiz-q" key={i}>
                  <div className="form-row">
                    <select className="select" value={q.type} onChange={(e) => setQ(i, { type: e.target.value })}>
                      <option value="multichoice">multiple choice</option>
                      <option value="truefalse">true / false</option>
                      <option value="essay">essay (manual marking)</option>
                    </select>
                    <input
                      className="input input--wide"
                      placeholder={`Question ${i + 1}`}
                      value={q.text}
                      onChange={(e) => setQ(i, { text: e.target.value })}
                    />
                    <label>
                      pts{" "}
                      <input
                        className="input input--num"
                        type="number"
                        min={1}
                        value={q.points}
                        onChange={(e) => setQ(i, { points: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  {q.type === "multichoice" && (
                    <div className="form-row">
                      <input
                        className="input input--wide"
                        title="comma-separated options"
                        value={q.options}
                        onChange={(e) => setQ(i, { options: e.target.value })}
                      />
                      <label>
                        correct #{" "}
                        <input
                          className="input input--num"
                          type="number"
                          min={0}
                          value={q.answer}
                          onChange={(e) => setQ(i, { answer: e.target.value })}
                        />
                      </label>
                    </div>
                  )}
                  {q.type === "truefalse" && (
                    <div className="form-row">
                      <label>
                        correct answer{" "}
                        <select className="select" value={String(q.answer)} onChange={(e) => setQ(i, { answer: e.target.value })}>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              ))}
              <button className="btn" onClick={() => setQuestions((qs) => [...qs, EMPTY_Q()])}>
                + question
              </button>
            </>
          )}

          <div className="form-row">
            <button className="btn btn--primary" disabled={!name} onClick={create}>
              Create
            </button>
            <button className="btn" onClick={() => setKind(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {done && (
        <p className="muted">
          ✓ created “{done.name}” — students see it in Courses right now.
        </p>
      )}
      {error && <ReasonList reasons={errText(error)} />}
    </>
  );
}

// ---- Grading: assignment submissions + quiz essay marking ---------------

function GradingTab({ course, actorId }) {
  const [activities, setActivities] = useState([]);
  const [activity, setActivity] = useState(null);
  const [subs, setSubs] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [grades, setGrades] = useState({}); // per-row form state
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet(`/api/lms/courses/${course.id}/activities?user_id=${actorId}`)
      .then((rows) => setActivities(rows.filter((a) => ["assign", "quiz"].includes(a.activity_type))))
      .catch(setError);
    setActivity(null);
  }, [course.id, actorId]);

  function open(a) {
    setActivity(a);
    setError(null);
    setSubs([]);
    setAttempts([]);
    if (a.activity_type === "assign")
      apiGet(`/api/lms/activities/${a.id}/submissions?actor_id=${actorId}`).then(setSubs).catch(setError);
    else apiGet(`/api/lms/activities/${a.id}/attempts?actor_id=${actorId}`).then(setAttempts).catch(setError);
  }

  async function gradeSub(s) {
    const g = grades[`s${s.id}`] ?? {};
    setError(null);
    try {
      await apiPost(`/api/lms/submissions/${s.id}/grade`, {
        actor_id: actorId,
        grade: g.grade,
        feedback: g.feedback ?? "",
      });
      setTimeout(() => open(activity), 450);
    } catch (e) {
      setError(e);
    }
  }

  async function gradeEssay(attempt, questionId) {
    const g = grades[`a${attempt.id}`] ?? {};
    setError(null);
    try {
      await apiPost(`/api/lms/attempts/${attempt.id}/grade-essay`, {
        actor_id: actorId,
        question_id: questionId,
        points: g.points,
      });
      setTimeout(() => open(activity), 450);
    } catch (e) {
      setError(e);
    }
  }

  const setG = (key, patch) => setGrades((cur) => ({ ...cur, [key]: { ...cur[key], ...patch } }));

  return (
    <>
      <div className="form-row">
        {activities.map((a) => {
          const pending = (a.queue?.pending_submissions ?? 0) + (a.queue?.pending_essays ?? 0);
          return (
            <button key={a.id} className={`btn ${activity?.id === a.id ? "btn--primary" : ""}`} onClick={() => open(a)}>
              {a.activity_type === "quiz" ? "🧪" : "📄"} {a.name}
              {pending > 0 && (
                <Badge variant="amber" title="waiting for your marking">
                  {pending}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
      {!activity && <p className="muted">Pick an activity to grade — amber counts are waiting on you.</p>}

      {activity?.activity_type === "assign" &&
        subs.map((s) => (
          <div className="panel" key={s.id}>
            <div className="panel__title">
              {s.user?.full_name}
              <Badge variant={s.status === "graded" ? "green" : s.status === "submitted" ? "blue" : "amber"}>{s.status}</Badge>
              {!s.can_grade && (
                <Badge variant="red" title="access-all-groups prevented + no shared group (hard case 3)">
                  outside your groups
                </Badge>
              )}
            </div>
            {s.text && <p>{s.text}</p>}
            {s.files?.length > 0 && (
              <p className="muted">📎 {s.files.map((f) => f.name).join(" · ")}</p>
            )}
            {s.status === "graded" && (
              <p>
                <strong>{s.grade}/100</strong> <span className="muted">“{s.feedback}” — by {s.graded_by === actorId ? "you" : `user ${s.graded_by}`}</span>
              </p>
            )}
            {s.status !== "draft" && (
              <div className="form-row">
                <input
                  className="input input--num"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0–100"
                  value={grades[`s${s.id}`]?.grade ?? ""}
                  onChange={(e) => setG(`s${s.id}`, { grade: e.target.value })}
                />
                <input
                  className="input input--wide"
                  placeholder="Feedback"
                  value={grades[`s${s.id}`]?.feedback ?? ""}
                  onChange={(e) => setG(`s${s.id}`, { feedback: e.target.value })}
                />
                <button className="btn btn--primary" disabled={grades[`s${s.id}`]?.grade == null} onClick={() => gradeSub(s)}>
                  {s.status === "graded" ? "Re-grade" : "Grade"}
                </button>
                <button
                  className="btn"
                  title="Unlock it for the student — they can edit and resubmit; the grade you gave stays on record"
                  onClick={async () => {
                    setError(null);
                    try {
                      await apiPost(`/api/lms/submissions/${s.id}/revert`, { actor_id: actorId });
                      setTimeout(() => open(activity), 450);
                    } catch (e) {
                      setError(e);
                    }
                  }}
                >
                  Revert to draft
                </button>
              </div>
            )}
            {s.status === "draft" && <p className="muted">draft — nothing submitted yet</p>}
          </div>
        ))}

      {activity?.activity_type === "quiz" &&
        attempts.map((a) => {
          const essays = a.questions.filter((q) => q.type === "essay");
          return (
            <div className="panel" key={a.id}>
              <div className="panel__title">
                {a.user?.full_name}
                <Badge variant={a.state === "graded" ? "green" : a.state === "finished" ? "amber" : "neutral"}>
                  {a.state === "finished" ? "essay awaits marking" : a.state}
                </Badge>
                <span className="muted">auto {a.auto_score} pts{a.total != null && ` · total ${a.total}`}</span>
                {!a.can_grade && (
                  <Badge variant="red" title="access-all-groups prevented + no shared group (hard case 3)">
                    outside your groups
                  </Badge>
                )}
              </div>
              {essays.map((q) => (
                <div key={q.id}>
                  <p className="muted">{q.text}</p>
                  <blockquote className="quote">{a.answers[q.id] ?? <em>no answer</em>}</blockquote>
                  {a.state === "finished" && (
                    <div className="form-row">
                      <input
                        className="input input--num"
                        type="number"
                        min={0}
                        max={q.points}
                        placeholder={`0–${q.points}`}
                        value={grades[`a${a.id}`]?.points ?? ""}
                        onChange={(e) => setG(`a${a.id}`, { points: e.target.value })}
                      />
                      <button className="btn btn--primary" disabled={grades[`a${a.id}`]?.points == null} onClick={() => gradeEssay(a, q.id)}>
                        Mark essay
                      </button>
                    </div>
                  )}
                  {a.essay_scores[q.id] != null && (
                    <p className="muted">essay: {a.essay_scores[q.id]}/{q.points} pts</p>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      {error && <ReasonList reasons={errText(error)} />}
    </>
  );
}

// ---- New course: the moodle/course:create truth --------------------------

function NewCourseTab({ actorId, isAdmin }) {
  const [form, setForm] = useState({});
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  function load() {
    apiGet(`/api/lms/course-requests?actor_id=${actorId}`).then(setRequests).catch(() => {});
  }
  const reload = () => { setTimeout(load, 450); setTimeout(load, 1600); }; // pooled reads trail fresh writes — double-tap
  useEffect(load, [actorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function tryCreate() {
    setError(null);
    setCreated(null);
    try {
      setCreated(await apiPost("/api/lms/courses", { actor_id: actorId, ...form }));
      reload();
    } catch (e) {
      setError(e);
    }
  }
  async function request() {
    setError(null);
    try {
      await apiPost("/api/lms/course-requests", { actor_id: actorId, ...form });
      setForm({});
      reload();
    } catch (e) {
      setError(e);
    }
  }
  async function decide(r, verb) {
    setError(null);
    try {
      await apiPost(`/api/lms/course-requests/${r.id}/${verb}`, { actor_id: actorId });
      reload();
    } catch (e) {
      setError(e);
    }
  }

  return (
    <>
      <p className="muted">
        Moodle&apos;s rule, kept on purpose: a teacher <strong>cannot</strong>{" "}
        create courses (<code>moodle/course:create</code> belongs to Manager /
        Course creator). Teachers <em>request</em>; a manager approves — and
        approval makes the requester the course&apos;s teacher.
      </p>
      <div className="form-row">
        <input className="input" placeholder="Full name (e.g. Advanced CS)" value={form.full_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
        <input className="input" placeholder="Short name (e.g. CS201)" value={form.short_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value }))} />
        <input className="input input--wide" placeholder="Why is it needed?" value={form.reason ?? ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
      </div>
      <div className="form-row">
        <button className="btn" disabled={!form.full_name || !form.short_name} onClick={tryCreate} title="Watch it refuse for teachers — that's the documented Moodle rule">
          Create course directly
        </button>
        <button className="btn btn--primary" disabled={!form.full_name || !form.short_name} onClick={request}>
          Request course
        </button>
      </div>
      {created && <p className="muted">✓ course “{created.short_name}” created.</p>}
      {error && <ReasonList reasons={errText(error)} />}

      {requests.length > 0 && (
        <>
          <h3>Course requests</h3>
          {requests.map((r) => (
            <div className="form-row" key={r.id}>
              <strong>{r.short_name}</strong>
              <span>{r.full_name}</span>
              <span className="muted">by {r.requester?.full_name}</span>
              <Badge variant={r.status === "pending" ? "blue" : r.status === "approved" ? "green" : "red"}>{r.status}</Badge>
              {isAdmin && r.status === "pending" && (
                <>
                  <button className="btn btn--primary" onClick={() => decide(r, "approve")}>
                    Approve → creates course, requester becomes its teacher
                  </button>
                  <button className="btn btn--danger" onClick={() => decide(r, "reject")}>
                    Reject
                  </button>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}

// ---- page shell ----------------------------------------------------------

export default function TeachingPage({ onNavigate }) {
  const { actingUser } = useActingUser();
  const { session } = useSession();
  const { courseId, setCourseId } = useSelectedCourse();
  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState([]);
  const [tab, setTab] = useState(TABS[0]);

  useEffect(() => {
    if (!actingUser) return;
    apiGet(`/api/auth/me?user_id=${actingUser.id}`).then(setMe).catch(() => setMe(null));
    apiGet(`/api/lms/catalog?user_id=${actingUser.id}`)
      .then((rows) => setCourses(rows.map((r) => r.course)))
      .catch(() => {});
  }, [actingUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!actingUser || !me) return null;

  const teachable = courses.filter((c) => me.is_admin || me.teaches.includes(c.id));
  const course = teachable.find((c) => c.id === courseId) ?? teachable[0];

  if (!teachable.length)
    return (
      <div>
        <h1>Teaching</h1>
        <p className="muted">
          {actingUser.full_name} teaches nowhere. A teacher role is assigned per
          course — ask a manager, or switch persona.
        </p>
      </div>
    );

  return (
    <div>
      <h1>Teaching</h1>
      <PageIntro line="Roster, requests, content, grading — everything a teacher does, scoped to what THIS teacher may do." />
      <div className="form-row">
        <label>
          course{" "}
          <select className="select" value={course?.id ?? ""} onChange={(e) => setCourseId(Number(e.target.value))}>
            {teachable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.short_name} — {c.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "Roster" && course && (
        <RosterTab course={course} actorId={actingUser.id} onNavigate={onNavigate} />
      )}
      {tab === "Content" && course && <ContentTab course={course} actorId={actingUser.id} session={session} />}
      {tab === "Grading" && course && <GradingTab course={course} actorId={actingUser.id} />}
      {tab === "New course" && <NewCourseTab actorId={actingUser.id} isAdmin={me.is_admin} />}
    </div>
  );
}
