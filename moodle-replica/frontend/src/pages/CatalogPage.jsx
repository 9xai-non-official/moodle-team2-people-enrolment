// Courses — the student portal. Browse the catalog, get IN (self-enrol with
// key, or request enrolment where only manual exists — our improvement over
// stock Moodle, which just shows "You cannot enrol yourself"), then work:
// open a course, submit assignments (files/images), attempt quizzes.
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { useActingUser } from "../context/ActingUser";
import { useSelectedCourse } from "../context/SelectedCourse";
import Badge from "../components/common/Badge";
import PageIntro from "../components/common/PageIntro";
import ReasonList from "../components/common/ReasonList";
import AssignmentPanel from "../components/lms/AssignmentPanel";
import QuizPanel from "../components/lms/QuizPanel";

const STATUS_BADGE = {
  active: ["green", "enrolled"],
  suspended: ["grey", "enrolment suspended"],
  expired: ["amber", "enrolment expired"],
  method_disabled: ["amber", "method disabled"],
  account_suspended: ["red", "account suspended"],
};

const TYPE_ICON = { assign: "📄", quiz: "🧪", forum: "💬", page: "📃" };

function EnrolActions({ row, userId, onChanged }) {
  const [key, setKey] = useState("");
  const [askKey, setAskKey] = useState(false);
  const [message, setMessage] = useState("");
  const [askMessage, setAskMessage] = useState(false);
  const [error, setError] = useState(null);

  async function selfEnrol() {
    setError(null);
    try {
      await apiPost(`/api/lms/courses/${row.course.id}/self-enrol`, { user_id: userId, key });
      onChanged();
    } catch (e) {
      setError(e);
    }
  }
  async function request() {
    setError(null);
    try {
      await apiPost(`/api/lms/courses/${row.course.id}/enrol-request`, { user_id: userId, message });
      onChanged();
    } catch (e) {
      setError(e);
    }
  }

  return (
    <>
      <div className="form-row">
        {row.options.self_enrol &&
          (row.options.self_enrol.requires_key && !askKey ? (
            <button className="btn btn--primary" onClick={() => setAskKey(true)}>
              Enrol yourself 🔑
            </button>
          ) : (
            <>
              {row.options.self_enrol.requires_key && (
                <input
                  className="input"
                  placeholder="Enrolment key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  autoFocus
                />
              )}
              <button className="btn btn--primary" onClick={selfEnrol}>
                Enrol yourself
              </button>
            </>
          ))}
        {!row.options.self_enrol && row.options.can_request && !row.request_pending && (
          <>
            {askMessage ? (
              <>
                <input
                  className="input"
                  placeholder="Why do you need this course? (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  autoFocus
                />
                <button className="btn btn--primary" onClick={request}>
                  Send request
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => setAskMessage(true)} title="Stock Moodle would say 'You cannot enrol yourself in this course.' — dead end. We let you ask.">
                Request enrolment
              </button>
            )}
          </>
        )}
        {row.request_pending && <Badge variant="blue">request pending — a teacher will decide</Badge>}
      </div>
      {error && <ReasonList reasons={error.reasons?.length ? error.reasons : [error.message]} />}
    </>
  );
}

function CourseView({ course, userId, onBack }) {
  const [activities, setActivities] = useState(null);
  const [open, setOpen] = useState(null); // activity in focus
  const [error, setError] = useState(null);
  const [leave, setLeave] = useState(null); // null | "confirm" | {note} | ApiError

  useEffect(() => {
    setOpen(null);
    apiGet(`/api/lms/courses/${course.id}/activities?user_id=${userId}`)
      .then(setActivities)
      .catch((e) => setError(e));
  }, [course.id, userId]);

  async function unenrol() {
    try {
      const res = await apiPost(`/api/lms/courses/${course.id}/unenrol-self`, { user_id: userId });
      setLeave(res);
    } catch (e) {
      setLeave(e);
    }
  }

  return (
    <div>
      <div className="form-row">
        <button className="btn" onClick={onBack}>
          ← All courses
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="btn btn--danger"
          title="Only self-enrolled paths can be self-removed (enrol/self:unenrolself) — completions survive either way"
          onClick={() => setLeave("confirm")}
        >
          Unenrol me
        </button>
      </div>
      {leave === "confirm" && (
        <div className="panel panel--attention">
          <div className="panel__title">Leave {course.short_name}?</div>
          <p className="muted">
            Your completions and grades are kept — unenrolment never rewrites
            the past. Re-enrol any time and they return.
          </p>
          <div className="form-row">
            <button className="btn btn--danger" onClick={unenrol}>
              Yes, unenrol me
            </button>
            <button className="btn" onClick={() => setLeave(null)}>
              Stay
            </button>
          </div>
        </div>
      )}
      {leave?.reasons?.length > 0 && <ReasonList reasons={leave.reasons} />}
      {leave?.note && (
        <div className="panel">
          <p>{leave.note}</p>
          <button className="btn" onClick={onBack}>
            Back to catalog →
          </button>
        </div>
      )}
      <h2>
        {course.full_name} <span className="muted">({course.short_name})</span>
      </h2>
      {error && <div className="error-banner">{error.message}</div>}
      {activities && activities.length === 0 && <p className="muted">No activities yet.</p>}
      {activities?.map((a) => (
        <div key={a.id}>
          <button
            className={`card card--link activity-row ${open?.id === a.id ? "activity-row--open" : ""}`}
            onClick={() => setOpen(open?.id === a.id ? null : a)}
          >
            <span>
              {TYPE_ICON[a.activity_type] ?? "▫️"} {a.name}
              {!a.visible && (
                <Badge variant="grey" title="students never see hidden activities">
                  hidden
                </Badge>
              )}
            </span>
            <span>
              {a.mine?.kind === "assign" && a.mine.submission_status !== "none" && (
                <Badge variant={a.mine.submission_status === "graded" ? "green" : a.mine.submission_status === "submitted" ? "blue" : "amber"}>
                  {a.mine.submission_status === "graded" ? `graded ${a.mine.grade}/100` : a.mine.submission_status}
                </Badge>
              )}
              {a.mine?.kind === "quiz" && (
                <Badge variant={a.mine.awaiting_marking ? "amber" : a.mine.best_score != null ? "green" : "neutral"}>
                  {a.mine.awaiting_marking
                    ? "awaiting marking"
                    : a.mine.best_score != null
                      ? `best ${a.mine.best_score}/${a.mine.max_score}`
                      : `${a.mine.attempts_used}/${a.mine.attempts_allowed} attempts`}
                </Badge>
              )}
            </span>
          </button>
          {open?.id === a.id &&
            (a.activity_type === "assign" ? (
              <AssignmentPanel activity={a} userId={userId} />
            ) : a.activity_type === "quiz" ? (
              <QuizPanel activity={a} userId={userId} />
            ) : (
              <div className="panel">
                <p className="muted">
                  {a.activity_type} activities are read-only in this build — see
                  LMS-EXPERIENCE.md for what a full one would do.
                </p>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

export default function CatalogPage() {
  const { actingUser } = useActingUser();
  const { courseId, setCourseId } = useSelectedCourse();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [openCourse, setOpenCourse] = useState(null);

  function load() {
    if (!actingUser) return;
    apiGet(`/api/lms/catalog?user_id=${actingUser.id}`)
      .then(setRows)
      .catch((e) => setError(e));
  }
  useEffect(load, [actingUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!actingUser) return null;
  if (openCourse)
    return (
      <CourseView
        course={openCourse}
        userId={actingUser.id}
        onBack={() => {
          setOpenCourse(null);
          load();
        }}
      />
    );

  const mine = rows?.filter((r) => r.my_status || r.teaching) ?? [];
  const others = rows?.filter((r) => !r.my_status && !r.teaching) ?? [];

  return (
    <div>
      <h1>Courses</h1>
      <PageIntro line="Your courses first, then the catalog — with a real way IN to each course, not Moodle's dead end." />
      {error && <div className="error-banner">{error.message}</div>}

      <h2>My courses</h2>
      {mine.length === 0 && (
        <p className="muted">
          You are not enrolled anywhere yet — pick a course below and enrol or
          send a request.
        </p>
      )}
      <div className="grid-cards">
        {mine.map((r) => {
          const [variant, label] = r.my_status
            ? (STATUS_BADGE[r.my_status] ?? ["neutral", r.my_status])
            : ["blue", "teaching"];
          return (
            <button
              key={r.course.id}
              className="card card--link"
              onClick={() => {
                setCourseId(r.course.id);
                setOpenCourse(r.course);
              }}
            >
              <div className="card__title">{r.course.short_name}</div>
              <div>{r.course.full_name}</div>
              <Badge variant={variant}>{label}</Badge>
              {(r.my_status === "active" || r.teaching) && <span className="muted"> open →</span>}
            </button>
          );
        })}
      </div>

      <h2>All courses</h2>
      <div className="grid-cards">
        {others.map((r) => (
          <div key={r.course.id} className="card">
            <div className="card__title">{r.course.short_name}</div>
            <div>{r.course.full_name}</div>
            <EnrolActions row={r} userId={actingUser.id} onChanged={load} />
          </div>
        ))}
      </div>
    </div>
  );
}
