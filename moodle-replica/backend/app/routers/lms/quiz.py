"""LMS quiz sub-router (mounted under /api/lms by the package __init__).

The student's quiz workspace + the teacher's marking queue, matching the
staging frontend (components/lms/QuizPanel.jsx and pages/TeachingPage.jsx →
GradingTab) and the connect-later mock contract (mocks/lms.js).

The one rule that shapes everything: an objective question (multichoice /
truefalse) is auto-graded the instant the attempt is finished; an essay waits
for a teacher. That is Moodle's manual-marking split, and it is why an attempt
has three states — in_progress → finished (essay awaiting marking) → graded.

Correct answers are SERVER-ONLY. The taker's quiz view (GET .../quiz) and their
own attempt view strip quiz_question.correct; only the staff marking view
(GET .../attempts) carries the key, and only after a teacher-role gate.

Data (new tables, applied as migration M17 — see the returned DDL):
  quiz          one row per quiz activity: attempts_allowed, grade_to_pass.
  quiz_question the item bank (kind/prompt/choices/correct/points).
  quiz_attempt  one per (activity,user,try): state + auto score + max_score.
  quiz_answer   one per (attempt,question): the response, plus per-question
                awarded points/feedback. Referenced by a bare bigint attempt_id
                with NO FK to quiz_attempt — the new tables stay decoupled.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from app import db
from app.deps import current_user
from app.services import enrolment as enrol_svc
from app.services import permissions
import json

router = APIRouter()

OBJECTIVE_KINDS = ("multichoice", "truefalse")
TEACHER_ROLES = ("editingteacher", "teacher", "manager")


# --- small helpers -------------------------------------------------------------

def _j(v, default=None):
    """asyncpg hands jsonb back as a str on the shared pool — decode it."""
    if v is None:
        return default
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return default
    return v


def _answers_match(response, correct) -> bool:
    """Objective grading. Loose by design: a radio value can arrive as the int
    1 or the string "1", and a stored key can be a bool `true` or the string
    "true" (the activity-creation UI posts strings). Compare case-folded text."""
    if response is None or correct is None:
        return False
    return str(response).strip().lower() == str(correct).strip().lower()


async def _is_admin(pid: int) -> bool:
    u = await db.fetch_one("select username from app_user where id = $1", pid)
    if u and u["username"] in ("admin", "admin1"):
        return True
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 and r.short_name = 'manager' and c.level = 'system' "
        "limit 1",
        pid,
    )
    return row is not None


async def _teaches(pid: int, course_id: int) -> bool:
    """A teaching role at this course (or a system-level teaching/manager role)."""
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 and r.short_name = any($3::text[]) "
        "and ((c.level = 'course' and c.instance_id = $2) or c.level = 'system') "
        "limit 1",
        pid, course_id, list(TEACHER_ROLES),
    )
    return row is not None


async def _access_all_groups(pid: int, course_id: int) -> bool:
    """Resolve moodle/site:accessallgroups through Khaled's engine (admin bypass
    included). Fails safe to the admin check if the engine can't be consulted."""
    ctx = await db.fetch_val(
        "select id from context where level = 'course' and instance_id = $1", course_id
    )
    if ctx is None:
        return await _is_admin(pid)
    try:
        return await permissions.has_capability(
            db, pid, permissions.CAP_ACCESS_ALL_GROUPS, ctx
        )
    except Exception:  # noqa: BLE001 — display/gate helper, never 500 the request
        return await _is_admin(pid)


async def _shares_group(pid: int, target_id: int, course_id: int) -> bool:
    row = await db.fetch_one(
        "select 1 from group_member gm1 "
        "join course_group cg on cg.id = gm1.group_id and cg.course_id = $3 "
        "join group_member gm2 on gm2.group_id = gm1.group_id "
        "where gm1.user_id = $1 and gm2.user_id = $2 limit 1",
        pid, target_id, course_id,
    )
    return row is not None


async def _grade_gate(pid: int, course_id: int, target_id: int) -> None:
    """HC-3: a teacher may grade; a GROUP-scoped teacher (accessallgroups
    prevented) may grade only students who share one of her groups."""
    if not (await _is_admin(pid) or await _teaches(pid, course_id)):
        raise HTTPException(
            403, "you do not teach this course — grading needs a teacher role here"
        )
    if await _is_admin(pid) or await _access_all_groups(pid, course_id):
        return
    if not await _shares_group(pid, target_id, course_id):
        raise HTTPException(
            403,
            "your access-all-groups is prevented in this course and you share no "
            "group with this student — you may only grade your own group's work "
            "(hard case 3)",
        )


async def _can_grade(pid: int, course_id: int, target_id: int) -> bool:
    try:
        await _grade_gate(pid, course_id, target_id)
        return True
    except HTTPException:
        return False


async def _activity(activity_id: int) -> dict:
    row = await db.fetch_one(
        "select id, course_id, name, activity_type, group_mode, grouping_id, "
        "visible, completion_enabled, deleted_at "
        "from course_activity where id = $1",
        activity_id,
    )
    if row is None or row["deleted_at"] is not None:
        raise HTTPException(404, f"activity {activity_id} not found")
    return row


async def _require_quiz(activity_id: int) -> dict:
    act = await _activity(activity_id)
    if act["activity_type"] != "quiz":
        raise HTTPException(404, "no such quiz")
    return act


async def _quiz_settings(activity_id: int) -> tuple[int, int]:
    row = await db.fetch_one(
        "select attempts_allowed, grade_to_pass from quiz where activity_id = $1",
        activity_id,
    )
    if row is None:
        return 1, 0  # sensible defaults until the quiz row is configured
    return row["attempts_allowed"], row["grade_to_pass"]


async def _questions(activity_id: int) -> list[dict]:
    rows = await db.fetch_all(
        "select id, kind, prompt, choices, correct, points "
        "from quiz_question where activity_id = $1 order by id",
        activity_id,
    )
    return rows


def _q_public(q: dict) -> dict:
    """Taker's view — WITHOUT the correct answer."""
    out = {"id": q["id"], "type": q["kind"], "text": q["prompt"], "points": q["points"]}
    if q["kind"] == "multichoice":
        out["options"] = _j(q["choices"], [])
    return out


def _q_marking(q: dict) -> dict:
    """Marking view — includes the key (staff only)."""
    out = _q_public(q)
    out["answer"] = _j(q["correct"])
    return out


async def _answers_for(attempt_id: int) -> list[dict]:
    return await db.fetch_all(
        "select question_id, response, points, feedback "
        "from quiz_answer where attempt_id = $1",
        attempt_id,
    )


def _attempt_view(att: dict, ans_rows: list[dict], essay_qids: set[int]) -> dict:
    answers, essay_scores = {}, {}
    for a in ans_rows:
        answers[a["question_id"]] = _j(a["response"])
        if a["question_id"] in essay_qids and a["points"] is not None:
            essay_scores[a["question_id"]] = a["points"]
    auto = att["score"]  # None while in_progress
    total = (auto or 0) + sum(essay_scores.values()) if att["state"] == "graded" else None
    return {
        "id": att["id"],
        "activity_id": att["activity_id"],
        "user_id": att["user_id"],
        "state": att["state"],
        "started_at": att["started_at"],
        "finished_at": att["finished_at"],
        "answers": answers,
        "auto_score": auto,
        "essay_scores": essay_scores,
        "total": total,
        "max_score": att["max_score"],
    }


async def _attempt_or_404(attempt_id: int) -> dict:
    att = await db.fetch_one("select * from quiz_attempt where id = $1", attempt_id)
    if att is None:
        raise HTTPException(404, "attempt not found")
    return att


async def _save_answers(conn, attempt_id: int, answers: dict) -> None:
    """Merge (upsert) the response for each answered question — never wipes the
    others, matching the mock's Object.assign(attempt.answers, ...)."""
    for qid, resp in (answers or {}).items():
        await conn.execute(
            "insert into quiz_answer (attempt_id, question_id, response) "
            "values ($1, $2, $3::jsonb) "
            "on conflict (attempt_id, question_id) do update "
            "set response = excluded.response, updated_at = now()",
            attempt_id, int(qid), json.dumps(resp),
        )


# --- activity detail -----------------------------------------------------------

@router.get("/activities/{activity_id}")
async def activity_detail(activity_id: int, principal: dict = Depends(current_user)):
    """One activity's detail. A hidden activity vanishes for non-staff (Moodle:
    hide = it stops existing for students), so we 404 it for them."""
    act = await _activity(activity_id)
    if not act["visible"]:
        staff = await _is_admin(principal["id"]) or await _teaches(
            principal["id"], act["course_id"]
        )
        if not staff:
            raise HTTPException(404, f"activity {activity_id} not found")
    return {
        "id": act["id"],
        "course_id": act["course_id"],
        "name": act["name"],
        "activity_type": act["activity_type"],
        "group_mode": act["group_mode"],
        "grouping_id": act["grouping_id"],
        "visible": act["visible"],
        "completion_enabled": act["completion_enabled"],
    }


# --- taker: the quiz + my attempts ---------------------------------------------

@router.get("/activities/{activity_id}/quiz")
async def get_quiz(
    activity_id: int,
    user_id: int | None = Query(default=None),
    principal: dict = Depends(current_user),
):
    """The quiz for the taker: questions[] WITHOUT the key, the attempt limits,
    and my_attempts[] (the caller's own attempts). `user_id` names the subject
    to look up (a student's own view); it defaults to the principal."""
    act = await _require_quiz(activity_id)
    subject_id = user_id if user_id is not None else principal["id"]
    attempts_allowed, grade_to_pass = await _quiz_settings(activity_id)
    questions = await _questions(activity_id)
    essay_qids = {q["id"] for q in questions if q["kind"] == "essay"}
    max_score = sum(q["points"] for q in questions)

    atts = await db.fetch_all(
        "select * from quiz_attempt where activity_id = $1 and user_id = $2 order by id",
        activity_id, subject_id,
    )
    my_attempts = [
        _attempt_view(a, await _answers_for(a["id"]), essay_qids) for a in atts
    ]
    return {
        "activity_id": activity_id,
        "course_id": act["course_id"],
        "attempts_allowed": attempts_allowed,
        "attempts_used": len([a for a in my_attempts if a["state"] != "in_progress"]),
        "grade_to_pass": grade_to_pass,
        "max_score": max_score,
        "questions": [_q_public(q) for q in questions],
        "my_attempts": my_attempts,
    }


@router.post("/activities/{activity_id}/attempts")
async def start_attempt(
    activity_id: int,
    body: dict = Body(default={}),
    principal: dict = Depends(current_user),
):
    """Start a fresh attempt FOR THE PRINCIPAL (any user_id in the body is
    legacy and ignored for identity). One open attempt at a time; capped at
    attempts_allowed; the taker must be an active participant."""
    act = await _require_quiz(activity_id)
    actor_id = principal["id"]

    if not await enrol_svc.is_active_enrolled(db, actor_id, act["course_id"]):
        if await enrol_svc.is_enrolled(db, actor_id, act["course_id"]):
            raise HTTPException(
                403, "your enrolment is not live here — no participation until it is"
            )
        raise HTTPException(403, "you are not enrolled in this course")

    attempts_allowed, _ = await _quiz_settings(activity_id)
    mine = await db.fetch_all(
        "select id, state from quiz_attempt where activity_id = $1 and user_id = $2",
        activity_id, actor_id,
    )
    if any(a["state"] == "in_progress" for a in mine):
        raise HTTPException(
            409, "you already have an attempt in progress — finish it first"
        )
    if len(mine) >= attempts_allowed:
        raise HTTPException(403, f"no attempts left ({attempts_allowed} allowed)")

    questions = await _questions(activity_id)
    max_score = sum(q["points"] for q in questions)
    essay_qids = {q["id"] for q in questions if q["kind"] == "essay"}

    att = await db.fetch_one(
        "insert into quiz_attempt (activity_id, user_id, state, max_score, started_at) "
        "values ($1, $2, 'in_progress', $3, now()) returning *",
        activity_id, actor_id, max_score,
    )
    await db.audit("quiz.attempt_started", actor_id=actor_id, affected_id=actor_id,
                   course_id=act["course_id"],
                   detail={"activity_id": activity_id, "attempt_id": att["id"]})
    return _attempt_view(att, [], essay_qids)


# --- one attempt: read, save, finish -------------------------------------------

@router.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: int, principal: dict = Depends(current_user)):
    """One attempt with its answers + state. The owner sees it; so does a
    teacher of the course. Correct answers are never included here."""
    att = await _attempt_or_404(attempt_id)
    act = await _activity(att["activity_id"])
    pid = att["user_id"]
    if principal["id"] != pid:
        if not (await _is_admin(principal["id"]) or await _teaches(principal["id"], act["course_id"])):
            raise HTTPException(403, "this is not your attempt")
    questions = await _questions(att["activity_id"])
    essay_qids = {q["id"] for q in questions if q["kind"] == "essay"}
    view = _attempt_view(att, await _answers_for(attempt_id), essay_qids)
    view["questions"] = [_q_public(q) for q in questions]
    return view


@router.patch("/attempts/{attempt_id}")
async def save_attempt(
    attempt_id: int,
    body: dict = Body(default={}),
    principal: dict = Depends(current_user),
):
    """Save progress: merge answers into the OPEN attempt. Owner-only."""
    att = await _attempt_or_404(attempt_id)
    if principal["id"] != att["user_id"] and not await _is_admin(principal["id"]):
        raise HTTPException(403, "this is not your attempt")
    if att["state"] != "in_progress":
        raise HTTPException(409, "attempt is closed")
    async with db.transaction() as conn:
        await _save_answers(conn, attempt_id, body.get("answers") or {})
    questions = await _questions(att["activity_id"])
    essay_qids = {q["id"] for q in questions if q["kind"] == "essay"}
    fresh = await _attempt_or_404(attempt_id)
    return _attempt_view(fresh, await _answers_for(attempt_id), essay_qids)


@router.post("/attempts/{attempt_id}/finish")
async def finish_attempt(
    attempt_id: int,
    body: dict = Body(default={}),
    principal: dict = Depends(current_user),
):
    """Submit the attempt. Optionally saves answers[] first, then auto-grades
    the objective questions into `auto_score`. If the quiz has any essay, the
    attempt lands in 'finished' (awaiting marking); otherwise it is 'graded'."""
    att = await _attempt_or_404(attempt_id)
    if principal["id"] != att["user_id"] and not await _is_admin(principal["id"]):
        raise HTTPException(403, "this is not your attempt")
    if att["state"] != "in_progress":
        raise HTTPException(409, "attempt already finished")

    act = await _activity(att["activity_id"])
    questions = await _questions(att["activity_id"])
    essay_present = any(q["kind"] == "essay" for q in questions)
    essay_qids = {q["id"] for q in questions if q["kind"] == "essay"}

    async with db.transaction() as conn:
        # Allow a body-carried final save (the frontend PATCHes first, then
        # finishes with an empty body — both paths are supported).
        await _save_answers(conn, attempt_id, body.get("answers") or {})
        stored = {a["question_id"]: a for a in await _answers_for(attempt_id)}
        auto = 0
        for q in questions:
            if q["kind"] not in OBJECTIVE_KINDS:
                continue
            a = stored.get(q["id"])
            awarded = q["points"] if (a and _answers_match(_j(a["response"]), _j(q["correct"]))) else 0
            auto += awarded
            if a is not None:
                await conn.execute(
                    "update quiz_answer set points = $1, updated_at = now() "
                    "where attempt_id = $2 and question_id = $3",
                    awarded, attempt_id, q["id"],
                )
        new_state = "finished" if essay_present else "graded"
        await conn.execute(
            "update quiz_attempt set state = $1, score = $2, finished_at = $3 where id = $4",
            new_state, auto, datetime.now(timezone.utc), attempt_id,
        )
        await db.audit("quiz.attempt_finished", actor_id=principal["id"],
                       affected_id=att["user_id"], course_id=act["course_id"],
                       detail={"attempt_id": attempt_id, "auto_score": auto,
                               "state": new_state}, conn=conn)

    fresh = await _attempt_or_404(attempt_id)
    return _attempt_view(fresh, await _answers_for(attempt_id), essay_qids)


# --- staff: list attempts + mark essays ----------------------------------------

@router.get("/activities/{activity_id}/attempts")
async def list_attempts(
    activity_id: int,
    actor_id: int | None = Query(default=None),
    principal: dict = Depends(current_user),
):
    """Every attempt on this quiz, for marking. Teacher-gated. Each row carries
    the student, the questions WITH the key, and per-target can_grade (HC-3)."""
    act = await _require_quiz(activity_id)
    pid = principal["id"]
    if not (await _is_admin(pid) or await _teaches(pid, act["course_id"])):
        raise HTTPException(403, "only this course's teachers may view attempts")

    questions = await _questions(activity_id)
    marking_qs = [_q_marking(q) for q in questions]
    essay_qids = {q["id"] for q in questions if q["kind"] == "essay"}
    atts = await db.fetch_all(
        "select * from quiz_attempt where activity_id = $1 order by id", activity_id
    )
    out = []
    for a in atts:
        view = _attempt_view(a, await _answers_for(a["id"]), essay_qids)
        u = await db.fetch_one(
            "select id, username, first_name, last_name, "
            "(first_name || ' ' || last_name) as full_name from app_user where id = $1",
            a["user_id"],
        )
        view["user"] = u
        view["questions"] = marking_qs
        view["can_grade"] = await _can_grade(pid, act["course_id"], a["user_id"])
        out.append(view)
    return out


@router.post("/attempts/{attempt_id}/grade-essay")
async def grade_essay(
    attempt_id: int,
    body: dict = Body(...),
    principal: dict = Depends(current_user),
):
    """A teacher marks one essay answer (points + optional feedback). When every
    essay in the attempt has a mark, the attempt flips 'finished' → 'graded' and
    `total` = auto_score + the essay points."""
    att = await _attempt_or_404(attempt_id)
    act = await _activity(att["activity_id"])
    await _grade_gate(principal["id"], act["course_id"], att["user_id"])

    if att["state"] != "finished":
        raise HTTPException(
            409,
            "attempt already fully graded" if att["state"] == "graded"
            else "attempt still in progress",
        )

    question_id = body.get("question_id")
    questions = await _questions(att["activity_id"])
    q = next(
        (x for x in questions if x["id"] == question_id and x["kind"] == "essay"), None
    )
    if q is None:
        raise HTTPException(404, "no such essay question")

    try:
        points = int(body.get("points"))
    except (TypeError, ValueError):
        raise HTTPException(400, f"points must be 0–{q['points']}")
    if not (0 <= points <= q["points"]):
        raise HTTPException(400, f"points must be 0–{q['points']}")

    feedback = body.get("feedback") or ""
    essay_ids = [x["id"] for x in questions if x["kind"] == "essay"]
    async with db.transaction() as conn:
        await conn.execute(
            "insert into quiz_answer (attempt_id, question_id, points, feedback) "
            "values ($1, $2, $3, $4) "
            "on conflict (attempt_id, question_id) do update "
            "set points = excluded.points, feedback = excluded.feedback, updated_at = now()",
            attempt_id, question_id, points, feedback,
        )
        graded = await conn.fetch(
            "select question_id from quiz_answer "
            "where attempt_id = $1 and question_id = any($2::bigint[]) and points is not null",
            attempt_id, essay_ids,
        )
        if {r["question_id"] for r in graded} >= set(essay_ids):
            await conn.execute(
                "update quiz_attempt set state = 'graded' where id = $1", attempt_id
            )
        await db.audit("quiz.essay_graded", actor_id=principal["id"],
                       affected_id=att["user_id"], course_id=act["course_id"],
                       detail={"attempt_id": attempt_id, "question_id": question_id,
                               "points": points}, conn=conn)

    fresh = await _attempt_or_404(attempt_id)
    essay_qids = set(essay_ids)
    return _attempt_view(fresh, await _answers_for(attempt_id), essay_qids)


@router.post("/courses/{course_id}/activities")
async def create_activity(course_id: int, body: dict = Body(default=None),
                          principal: dict = Depends(current_user)):
    """Create an activity (TeachingPage -> Content). Staff only. For a quiz, also
    creates its settings + questions (correct answers stay server-side)."""
    body = body or {}
    if not await _teaches(principal["id"], course_id):
        raise HTTPException(status_code=403, detail="only teaching staff may add activities here")
    if not await db.fetch_one("select id from course where id = $1 and deleted_at is null", course_id):
        raise HTTPException(status_code=404, detail=f"course {course_id} not found")
    name = (body.get("name") or "").strip()
    kind = body.get("activity_type") or "assign"
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    act = await db.fetch_one(
        "insert into course_activity (course_id, name, activity_type, visible, completion_enabled) "
        "values ($1, $2, $3, true, true) "
        "returning id, course_id, name, activity_type, visible, completion_enabled",
        course_id, name, kind)
    if kind == "quiz":
        await db.fetch_val(
            "insert into quiz (activity_id, attempts_allowed, grade_to_pass) values ($1, $2, 0) "
            "on conflict (activity_id) do nothing returning activity_id",
            act["id"], int(body.get("attempts_allowed") or 1))
        for q in body.get("questions") or []:
            await db.fetch_val(
                "insert into quiz_question (activity_id, kind, prompt, choices, correct, points) "
                "values ($1, $2, $3, $4::jsonb, $5::jsonb, $6) returning id",
                act["id"], q.get("type") or "essay", q.get("text") or "",
                json.dumps(q.get("options") or []), json.dumps(q.get("answer")),
                int(q.get("points") or 1))
    return act


@router.patch("/activities/{activity_id}")
async def update_activity(activity_id: int, body: dict = Body(default=None),
                          principal: dict = Depends(current_user)):
    """Edit an activity (rename / show-hide / quiz attempts) — staff only."""
    body = body or {}
    act = await _activity(activity_id)
    if not await _teaches(principal["id"], act["course_id"]):
        raise HTTPException(status_code=403, detail="only teaching staff may edit this activity")
    sets, args, n = [], [], 1
    if body.get("name"):
        n += 1; sets.append(f"name = ${n}"); args.append(body["name"].strip())
    if "visible" in body:
        n += 1; sets.append(f"visible = ${n}"); args.append(bool(body["visible"]))
    if sets:
        await db.fetch_val(
            f"update course_activity set {', '.join(sets)} where id = $1 returning id",
            activity_id, *args)
    if act["activity_type"] == "quiz" and body.get("attempts_allowed") is not None:
        await db.fetch_val(
            "update quiz set attempts_allowed = $2 where activity_id = $1 returning activity_id",
            activity_id, int(body["attempts_allowed"]))
    return await _activity(activity_id)
