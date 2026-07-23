"""LMS grade sub-router (/api/lms) — assignment submissions + grading.

Backs the staging frontend's AssignmentPanel (student draft → submit → locked →
graded) and TeachingPage GradingTab (staff sees submissions, grades, reverts),
plus the Dashboard "My grades" strip. Every request identifies its ACTOR from
the X-Acting-User header (deps.current_user); the legacy actor_id/user_id in
bodies/queries are IGNORED for identity — the only exception is `?user_id=` on a
read, which names the SUBJECT whose work is being looked at.

Two backing tables (defined as migration DDL, not created at runtime):
  assignment_submission — the student's work: body jsonb {text, files,
      statement_accepted}, a submission lifecycle (draft | submitted) and
      submitted_at. 'none' is the absence of a row.
  grade — the mark: points / max_points / feedback / state / graded_by /
      graded_at. Reverting a submission to draft KEEPS the grade row (Moodle:
      reverting is not un-marking), it just unlocks the submission.

The API collapses the two into one `status` the frontend reads:
    none → draft → submitted → graded
where 'graded' = a submitted submission that also has a graded grade row. A
revert drops 'graded' back to 'draft' while the grade row stays on record.
"""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Body

from app import db
from app.deps import current_user, course_context_id
from app.services import enrolment as enrol_svc
from app.services import permissions

log = logging.getLogger("lms.grade")
router = APIRouter()

CAP_COURSE_VIEW = "course:view"          # course-door key; carries group scope in check()
MAX_FILES = 5
DEFAULT_MAX_POINTS = 100


# --- helpers -------------------------------------------------------------------

def _num(v):
    """asyncpg returns numeric as Decimal; hand the client a plain number."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return v
    return int(f) if f == int(f) else f


def _body_json(raw) -> dict:
    if raw is None:
        return {}
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return {}
    return raw


async def _is_admin(pid: int) -> bool:
    """Privileged iff 'manager' at the system context OR a site-admin username."""
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 and r.short_name = 'manager' and c.level = 'system' limit 1",
        pid,
    )
    if row:
        return True
    u = await db.fetch_one("select username from app_user where id = $1", pid)
    return bool(u and u["username"] in ("admin", "admin1"))


async def _teaches(pid: int, course_id: int) -> bool:
    """A teacher of this course (editing or non-editing role at the course /
    system context) — or a site admin. Mirrors the mock's `teaches`."""
    if await _is_admin(pid):
        return True
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 and r.archetype in ('teacher', 'editingteacher') "
        "  and ((c.level = 'course' and c.instance_id = $2) or c.level = 'system') limit 1",
        pid, course_id,
    )
    return row is not None


async def _group_ok(actor_id: int, course_id: int, target_id: int, activity_id: int) -> bool:
    """HC-3 group scope for grading: a group-scoped teacher may only act on
    students who share one of their groups, unless they hold accessallgroups.
    The whole group decision is delegated to the permission engine (which owns
    the group tables); a site admin / system manager bypasses. Fail-closed if
    the engine cannot be consulted."""
    if await _is_admin(actor_id):
        return True
    try:
        ctx = await course_context_id(course_id)
    except HTTPException:
        # No course context to resolve scope against. This is a WRITE gate, so
        # fail CLOSED (was fail-open): permit only if the actor genuinely shares
        # a group with the target — mirrors quiz.py's _grade_gate fallback so a
        # context-less course can't let a group-scoped teacher grade anyone.
        row = await db.fetch_one(
            "select 1 from group_member gm1 "
            "join course_group cg on cg.id = gm1.group_id and cg.course_id = $3 "
            "join group_member gm2 on gm2.group_id = gm1.group_id "
            "where gm1.user_id = $1 and gm2.user_id = $2 limit 1",
            actor_id, target_id, course_id,
        )
        return row is not None
    try:
        decision = await permissions.check(
            db, actor_id, CAP_COURSE_VIEW, ctx,
            target_id=target_id, activity_id=activity_id,
        )
    except Exception:  # noqa: BLE001 — grading is a write: deny if unresolved
        log.exception("permission engine unavailable — grade group-gate fails closed")
        return False
    gs = decision.get("group_scope") or {}
    if gs.get("access_all_groups"):
        return True
    if gs.get("mode") != "separate":       # no separation → no restriction
        return True
    return bool(gs.get("shared"))


async def _activity(activity_id: int) -> dict | None:
    return await db.fetch_one(
        "select id, course_id, activity_type, visible, deleted_at "
        "from course_activity where id = $1",
        activity_id,
    )


async def _submission_row(activity_id: int, user_id: int) -> dict | None:
    return await db.fetch_one(
        "select s.id, s.activity_id, s.user_id, s.body, s.submission_status, s.submitted_at, "
        "       g.points, g.max_points, g.feedback, g.state as grade_state, g.graded_by "
        "  from assignment_submission s "
        "  left join grade g on g.activity_id = s.activity_id and g.user_id = s.user_id "
        " where s.activity_id = $1 and s.user_id = $2",
        activity_id, user_id,
    )


def _shape(row: dict | None, *, activity_id: int | None = None,
           user_id: int | None = None) -> dict:
    """One submission in the shape the frontend reads: text/files/statement plus
    a single collapsed `status`, and the grade/feedback carried alongside."""
    if row is None:
        return {"id": None, "activity_id": activity_id, "user_id": user_id,
                "status": "none", "text": "", "files": [],
                "statement_accepted": False, "submitted_at": None,
                "grade": None, "feedback": None, "graded_by": None}
    body = _body_json(row.get("body"))
    graded = row.get("grade_state") == "graded"
    base = row["submission_status"]                       # 'draft' | 'submitted'
    status = "graded" if (base == "submitted" and graded) else base
    return {
        "id": row["id"],
        "activity_id": row["activity_id"],
        "user_id": row["user_id"],
        "status": status,
        "text": body.get("text", ""),
        "files": body.get("files", []),
        "statement_accepted": bool(body.get("statement_accepted")),
        "submitted_at": _iso(row.get("submitted_at")),
        "grade": _num(row.get("points")),
        "feedback": row.get("feedback"),
        "graded_by": row.get("graded_by"),
    }


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


async def _audit(event, **kw):
    try:
        await db.audit(event, **kw)
    except Exception:  # noqa: BLE001 — audit is best-effort, never break the write
        log.exception("audit write failed for %s", event)


# --- student: own submission ---------------------------------------------------

@router.get("/activities/{activity_id}/submission")
async def get_submission(
    activity_id: int,
    user_id: int | None = Query(default=None),
    principal: dict = Depends(current_user),
):
    """The subject's submission for this activity, with its grade/feedback/state.
    `?user_id=` names the subject (a student viewing their own work); reading
    somebody else's submission requires a teacher of the course."""
    subject = user_id if user_id is not None else principal["id"]
    if subject != principal["id"]:
        act = await _activity(activity_id)
        if act is None:
            raise HTTPException(404, "activity not found")
        if not await _teaches(principal["id"], act["course_id"]):
            raise HTTPException(403, "you may not view another user's submission")
    return _shape(await _submission_row(activity_id, subject),
                  activity_id=activity_id, user_id=subject)


@router.post("/activities/{activity_id}/submission")
async def save_submission(
    activity_id: int,
    payload: dict = Body(default=None),
    principal: dict = Depends(current_user),
):
    """The principal saves a draft or hands in. `action` is 'draft' | 'submit';
    submitting requires the Moodle submission statement and LOCKS the work
    (submission_status='submitted') until a teacher reverts it."""
    payload = payload or {}
    actor = principal["id"]

    act = await _activity(activity_id)
    if act is None or act["activity_type"] != "assign" or act["deleted_at"] is not None:
        raise HTTPException(404, "no such assignment")

    if not await enrol_svc.is_active_enrolled(db, actor, act["course_id"]):
        raise HTTPException(
            403, "you are not actively enrolled in this course — no participation "
                 "until your enrolment is live")
    if not act["visible"]:
        raise HTTPException(403, "this activity is hidden — students cannot submit to it")

    files = payload.get("files") or []
    if not isinstance(files, list) or len(files) > MAX_FILES:
        raise HTTPException(400, f"at most {MAX_FILES} files per submission")

    existing = await _submission_row(activity_id, actor)
    if existing and existing["submission_status"] == "submitted":
        raise HTTPException(
            409, "already submitted — ask your teacher to revert to draft if you "
                 "need changes")

    action = payload.get("action")
    text = payload.get("text") or ""
    statement = bool(payload.get("statement_accepted"))
    if action == "submit":
        if not statement:
            raise HTTPException(
                403, 'you must accept the submission statement ("this is my own '
                     'work") before submitting')
        statement = True
        new_status = "submitted"
        submitted_at = datetime.now(timezone.utc)
    else:
        new_status = "draft"
        submitted_at = None

    body = {"text": text, "files": files, "statement_accepted": statement}
    await db.execute(
        "insert into assignment_submission "
        "  (activity_id, user_id, body, submission_status, submitted_at, updated_at) "
        "values ($1, $2, $3::jsonb, $4, $5, now()) "
        "on conflict (activity_id, user_id) do update set "
        "  body = excluded.body, "
        "  submission_status = excluded.submission_status, "
        "  submitted_at = excluded.submitted_at, "
        "  updated_at = now()",
        activity_id, actor, json.dumps(body), new_status, submitted_at,
    )
    if new_status == "submitted":
        await _audit("lms.submission_submitted", actor_id=actor, affected_id=actor,
                     course_id=act["course_id"], detail={"activity_id": activity_id})
    return _shape(await _submission_row(activity_id, actor),
                  activity_id=activity_id, user_id=actor)


# --- staff: view + grade -------------------------------------------------------

@router.get("/activities/{activity_id}/submissions")
async def list_submissions(
    activity_id: int,
    actor_id: int | None = Query(default=None),  # legacy — identity is the header
    principal: dict = Depends(current_user),
):
    """Every submission to this activity, for a teacher to grade. Each row
    carries the submitter (`user`) and `can_grade` — the HC-3 group-scope
    preview that the actual grade write enforces."""
    act = await _activity(activity_id)
    if act is None:
        raise HTTPException(404, "activity not found")
    if not await _teaches(principal["id"], act["course_id"]):
        raise HTTPException(403, "only this course's teachers may view submissions")

    rows = await db.fetch_all(
        "select s.id, s.activity_id, s.user_id, s.body, s.submission_status, s.submitted_at, "
        "       g.points, g.max_points, g.feedback, g.state as grade_state, g.graded_by, "
        "       u.first_name, u.last_name, u.username "
        "  from assignment_submission s "
        "  join app_user u on u.id = s.user_id "
        "  left join grade g on g.activity_id = s.activity_id and g.user_id = s.user_id "
        " where s.activity_id = $1 order by u.id",
        activity_id,
    )
    out = []
    for r in rows:
        item = _shape(r)
        item["user"] = {
            "id": r["user_id"],
            "full_name": f"{r['first_name']} {r['last_name']}",
            "username": r["username"],
        }
        item["can_grade"] = await _group_ok(
            principal["id"], act["course_id"], r["user_id"], activity_id)
        out.append(item)
    return out


@router.post("/submissions/{submission_id}/grade")
async def grade_submission(
    submission_id: int,
    payload: dict = Body(default=None),
    principal: dict = Depends(current_user),
):
    """Record a mark + feedback for one submission (0–100). A draft cannot be
    graded — the student has not handed in yet. Re-grading an already-graded
    submission is allowed (it overwrites)."""
    payload = payload or {}
    actor = principal["id"]

    sub = await db.fetch_one(
        "select id, activity_id, user_id, submission_status "
        "from assignment_submission where id = $1",
        submission_id,
    )
    if sub is None:
        raise HTTPException(404, "submission not found")
    act = await _activity(sub["activity_id"])
    course_id = act["course_id"] if act else None

    if not await _teaches(actor, course_id):
        raise HTTPException(
            403, "you do not teach this course — grading needs a teacher role here")
    if not await _group_ok(actor, course_id, sub["user_id"], sub["activity_id"]):
        raise HTTPException(
            403, "your access-all-groups is prevented in this course and you share "
                 "no group with this student — you may only grade your own group's "
                 "work (hard case 3)")

    if sub["submission_status"] != "submitted":
        raise HTTPException(
            409, "cannot grade a draft — the student has not submitted yet")

    try:
        grade_val = float(payload.get("grade"))
    except (TypeError, ValueError):
        raise HTTPException(400, "grade must be 0–100")
    if not (0 <= grade_val <= 100):
        raise HTTPException(400, "grade must be 0–100")
    feedback = payload.get("feedback") or ""

    await db.execute(
        "insert into grade "
        "  (activity_id, user_id, points, max_points, feedback, state, graded_by, graded_at) "
        "values ($1, $2, $3, $4, $5, 'graded', $6, now()) "
        "on conflict (activity_id, user_id) do update set "
        "  points = excluded.points, max_points = excluded.max_points, "
        "  feedback = excluded.feedback, state = 'graded', "
        "  graded_by = excluded.graded_by, graded_at = now()",
        sub["activity_id"], sub["user_id"], grade_val, DEFAULT_MAX_POINTS,
        feedback, actor,
    )
    await _audit("lms.submission_graded", actor_id=actor, affected_id=sub["user_id"],
                 course_id=course_id,
                 detail={"activity_id": sub["activity_id"], "points": grade_val})
    return _shape(await _submission_row(sub["activity_id"], sub["user_id"]),
                  activity_id=sub["activity_id"], user_id=sub["user_id"])


@router.post("/submissions/{submission_id}/revert")
async def revert_submission(
    submission_id: int,
    payload: dict = Body(default=None),
    principal: dict = Depends(current_user),
):
    """Unlock a submitted (or graded) submission back to draft so the student
    can edit and resubmit. The grade stays on record — reverting is not
    un-marking (it just drops out of the released 'graded' status)."""
    actor = principal["id"]
    sub = await db.fetch_one(
        "select id, activity_id, user_id, submission_status "
        "from assignment_submission where id = $1",
        submission_id,
    )
    if sub is None:
        raise HTTPException(404, "submission not found")
    act = await _activity(sub["activity_id"])
    course_id = act["course_id"] if act else None

    if not await _teaches(actor, course_id):
        raise HTTPException(
            403, "you do not teach this course — grading needs a teacher role here")
    if not await _group_ok(actor, course_id, sub["user_id"], sub["activity_id"]):
        raise HTTPException(
            403, "your access-all-groups is prevented in this course and you share "
                 "no group with this student — you may only manage your own group's "
                 "work (hard case 3)")

    if sub["submission_status"] == "draft":
        raise HTTPException(409, "already a draft")

    await db.execute(
        "update assignment_submission "
        "set submission_status = 'draft', submitted_at = null, updated_at = now() "
        "where id = $1",
        submission_id,
    )
    await _audit("lms.submission_reverted", actor_id=actor, affected_id=sub["user_id"],
                 course_id=course_id, detail={"activity_id": sub["activity_id"]})
    return _shape(await _submission_row(sub["activity_id"], sub["user_id"]),
                  activity_id=sub["activity_id"], user_id=sub["user_id"])


# --- student: grades across activities -----------------------------------------

@router.get("/my-grades")
async def my_grades(
    user_id: int | None = Query(default=None),
    principal: dict = Depends(current_user),
):
    """The subject's released grades, one row per graded activity — the
    Dashboard 'My grades' strip. A grade only appears while its submission is
    still handed in (a reverted submission drops out, matching Moodle)."""
    subject = user_id if user_id is not None else principal["id"]
    rows = await db.fetch_all(
        "select c.short_name as course, a.name as activity, a.activity_type, "
        "       g.points as score, g.max_points as max, g.feedback "
        "  from grade g "
        "  join assignment_submission s "
        "    on s.activity_id = g.activity_id and s.user_id = g.user_id "
        "  join course_activity a on a.id = g.activity_id "
        "  join course c on c.id = a.course_id "
        " where g.user_id = $1 and g.state = 'graded' "
        "   and s.submission_status = 'submitted' "
        " order by a.id",
        subject,
    )
    return [{
        "course": r["course"],
        "activity": r["activity"],
        "kind": "assignment" if r["activity_type"] == "assign" else r["activity_type"],
        "score": _num(r["score"]),
        "max": _num(r["max"]),
        "feedback": r["feedback"],
    } for r in rows]
