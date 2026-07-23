"""
Course progress & completion.

Two mechanisms, as specified:

  1. CALCULATED — percentage of the course completed, derived from how many
     completion-tracked activities the user has finished
     (`v_course_progress.activities_done / activities_total`).

  2. MANUAL — a teacher/admin marks the course complete outright, stored as
     `course_completion.time_completed`.

A course counts as "completed" if EITHER mechanism says so.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import db
from app.services import permissions

router = APIRouter(prefix="/api/progress", tags=["progress"])


# --- response / request models -------------------------------------------------

class CourseProgress(BaseModel):
    user_id: int
    course_id: int
    short_name: str | None = None
    activities_done: int
    activities_total: int
    percent_complete: float          # calculated: done / total * 100
    percent_remaining: float         # 100 - percent_complete
    calculated_complete: bool        # done == total (and total > 0)
    manually_completed: bool         # course_completion.time_completed is set
    time_completed: str | None = None
    completed: bool                  # calculated_complete OR manually_completed


class CompleteRequest(BaseModel):
    user_id: int
    course_id: int


# --- helpers -------------------------------------------------------------------

def _to_progress(row: dict) -> CourseProgress:
    """Turn a v_course_progress row into the combined progress model."""
    done = int(row.get("activities_done") or 0)
    total = int(row.get("activities_total") or 0)
    pct = round(done / total * 100, 1) if total > 0 else 0.0
    calculated = total > 0 and done >= total
    manual = row.get("time_completed") is not None
    return CourseProgress(
        user_id=row["user_id"],
        course_id=row["course_id"],
        short_name=row.get("short_name"),
        activities_done=done,
        activities_total=total,
        percent_complete=pct,
        percent_remaining=round(100 - pct, 1),
        calculated_complete=calculated,
        manually_completed=manual,
        time_completed=row.get("time_completed"),
        completed=calculated or manual,
    )


def _normalise(row: dict) -> dict:
    """Keep the row shape the PostgREST layer used to return.

    asyncpg gives real datetimes where PostgREST gave ISO-8601 strings, and
    CourseProgress.time_completed is typed `str | None`. Converting here means
    the swap is a pure data-access change and none of the logic below moves.
    """
    out = dict(row)
    ts = out.get("time_completed")
    if isinstance(ts, datetime):
        out["time_completed"] = ts.isoformat()
    return out


async def _fetch(user_id: int | None = None, course_id: int | None = None) -> list[dict]:
    """Read v_course_progress through the asyncpg pool.

    Was `supa.select("v_course_progress", ...)` over PostgREST with the
    RLS-bypassing service_role key. That layer is retired (work package §12):
    one data layer, real transactions, and errors that map to the {reason}
    contract instead of a bare 500.

    NOTE for Mahdi — M03 added three columns to this view: `percent`
    (clamped, authoritative), `is_complete`, and `enrolled`. `_to_progress`
    still derives its own percentage below; the two now agree, because the
    view finally computes both sides over one tracked set. `enrolled` is the
    T2-PRG-005 gate and is NOT yet applied here — filtering the default
    endpoint on it is your call, not the data layer's.
    """
    where, args = [], []
    if user_id is not None:
        args.append(user_id)
        where.append(f"user_id = ${len(args)}")
    if course_id is not None:
        args.append(course_id)
        where.append(f"course_id = ${len(args)}")
    clause = f"where {' and '.join(where)}" if where else ""
    rows = await db.fetch_all(
        f"select * from v_course_progress {clause} order by course_id", *args
    )
    return [_normalise(r) for r in rows]


# --- read ----------------------------------------------------------------------

@router.get("", response_model=CourseProgress)
async def get_progress(user_id: int, course_id: int):
    """Progress for one user in one course (both mechanisms combined)."""
    rows = await _fetch(user_id=user_id, course_id=course_id)
    if not rows:
        raise HTTPException(404, "No progress record for that user/course.")
    return _to_progress(rows[0])


@router.get("/course/{course_id}", response_model=list[CourseProgress])
async def progress_by_course(course_id: int):
    """Every participant's progress in a course."""
    return [_to_progress(r) for r in await _fetch(course_id=course_id)]


@router.get("/user/{user_id}", response_model=list[CourseProgress])
async def progress_by_user(user_id: int):
    """Every course's progress for a user."""
    return [_to_progress(r) for r in await _fetch(user_id=user_id)]


# --- manual completion ---------------------------------------------------------

@router.post("/complete", response_model=CourseProgress)
async def mark_complete(req: CompleteRequest):
    """Manually mark a course complete (mechanism #2).

    Now a single atomic upsert instead of a read-then-write over two PostgREST
    round trips, which could interleave.

    BEHAVIOUR CHANGE for Mahdi — M13 makes course_completion.time_completed
    write-once at the database level. A second POST for an already-completed
    course no longer silently rewrites the timestamp to a fresh now(); it
    raises, and the global handler returns 409 with the trigger's message.
    That was T2-PRG-002: re-POSTing quietly rewrote completion history.
    """
    now = datetime.now(timezone.utc)
    async with db.transaction() as conn:
        await conn.execute(
            "insert into course_completion (user_id, course_id, time_started, time_completed) "
            "values ($1, $2, $3, $3) "
            "on conflict (user_id, course_id) do update set time_completed = excluded.time_completed",
            req.user_id, req.course_id, now,
        )
        await db.audit(
            "progress.completed",
            affected_id=req.user_id,
            course_id=req.course_id,
            detail={"time_completed": now.isoformat(), "mechanism": "manual"},
            conn=conn,
        )
    return await get_progress(req.user_id, req.course_id)


@router.delete("/complete", response_model=CourseProgress)
async def unmark_complete(user_id: int, course_id: int):
    """Undo a manual completion (clears time_completed). Calculated % is unaffected.

    BEHAVIOUR CHANGE for Mahdi — M13 blocks this too: clearing time_completed
    is a change to a write-once column, so this endpoint now returns 409 rather
    than silently un-completing a course.

    Per M13's rationale, un-completion should become an explicit, authorised,
    audited reset rather than a plain DELETE. The endpoint is left in place,
    failing loudly, so the 409 is visible in testing instead of the behaviour
    disappearing quietly. Designing the authorised reset is your call.
    """
    async with db.transaction() as conn:
        await conn.execute(
            "update course_completion set time_completed = null "
            "where user_id = $1 and course_id = $2",
            user_id, course_id,
        )
        await db.audit(
            "progress.uncompleted",
            affected_id=user_id,
            course_id=course_id,
            conn=conn,
        )
    return await get_progress(user_id, course_id)


# ============================================================================
# Completion REPORT, CRITERIA, and activity-level completion writes.
#
# These replace the frontend progress mocks (frontend/src/mocks/progress.js)
# so the Report and Criteria tabs read/write the real DB instead of falling
# through to a 404 when VITE_USE_MOCKS=0. Identity follows this router's existing
# convention — actor_id / user_id are request params, not a session (the SPA has
# no login yet). The ONE privileged action, overriding another user's
# completion, is authorized server-side via permissions.require_capability
# ('completion:override'); everything else is a student acting on their own row
# or a config read/write, exactly as the mock modelled it.
#
# NOTE: the "History"/snapshots tab has no backing table in the schema, so it
# cannot be served from the DB — that mock stays until a snapshots table exists.
# ============================================================================

_COMPLETION_STATES = {"incomplete", "complete", "complete_pass", "complete_fail"}
_CRITERIA_KINDS = {"activity", "self", "date", "grade"}


class ViewReq(BaseModel):
    user_id: int


class ToggleReq(BaseModel):
    user_id: int


class OverrideReq(BaseModel):
    user_id: int
    state: str
    actor_id: int


class SelfCompleteReq(BaseModel):
    user_id: int


class CriteriaReq(BaseModel):
    # One POST does either job, mirroring the mock: {aggregation} flips ALL/ANY,
    # {kind, ...} appends a criterion.
    aggregation: str | None = None
    kind: str | None = None
    activity_id: int | None = None
    threshold: float | None = None


async def _course_context_id(course_id: int) -> int | None:
    """A course id is not a context id — resolve the course's context row."""
    row = await db.fetch_one(
        "select id from context where level = 'course' and instance_id = $1",
        course_id,
    )
    return row["id"] if row else None


def _cell(row: dict | None, activity_id: int) -> dict:
    """Shape one completion cell the way the report grid expects (mock joinCell)."""
    if row is None:
        return {"activity_id": activity_id, "state": "incomplete",
                "overridden_by": None, "viewed": False}
    ob = ({"id": row["overridden_by"], "full_name": row["ob_name"]}
          if row["overridden_by"] else None)
    return {"activity_id": activity_id, "state": row["state"],
            "overridden_by": ob, "viewed": row["viewed"]}


async def _read_cell(activity_id: int, user_id: int) -> dict:
    row = await db.fetch_one(
        "select ac.state, (ac.viewed_at is not null) as viewed, ac.overridden_by, "
        "ob.first_name || ' ' || ob.last_name as ob_name "
        "from activity_completion ac "
        "left join app_user ob on ob.id = ac.overridden_by "
        "where ac.activity_id = $1 and ac.user_id = $2",
        activity_id, user_id,
    )
    return _cell(row, activity_id)


def _criteria_label(kind: str, activity_name: str | None, threshold) -> str:
    if kind == "activity":
        return f"Complete {activity_name or 'activity'}"
    if kind == "self":
        return "Self completion"
    if kind == "date":
        return "Reach completion date"
    if kind == "grade":
        return f"Achieve grade ≥ {threshold if threshold is not None else '?'}"
    return kind


# --- completion report ---------------------------------------------------------

@router.get("/courses/{course_id}/report")
async def course_report(course_id: int, actor_id: int | None = None,
                        group_id: int | None = None):
    """Completion matrix: tracked activities (columns) × tracked users (rows).

    Tracked activities are the course's completion-enabled, non-deleted
    activities; hidden ones stay IN the report (flagged) — Moodle only drops
    them from the dashboard %, not from the report. Tracked users are those with
    a course_completion row (optionally filtered to one group). `can_override`
    is the acting teacher's completion:override capability, resolved by the
    permissions service — the frontend disables the Override button on it.
    """
    activities = await db.fetch_all(
        "select id, name, (not visible) as hidden, completion_enabled "
        "from course_activity "
        "where course_id = $1 and completion_enabled and deleted_at is null "
        "order by id",
        course_id,
    )
    args = [course_id]
    join = ""
    if group_id is not None:
        args.append(group_id)
        join = "join group_member gm on gm.user_id = cc.user_id and gm.group_id = $2"
    users = await db.fetch_all(
        "select cc.user_id, u.first_name || ' ' || u.last_name as full_name, "
        "cc.time_completed "
        "from course_completion cc "
        "join app_user u on u.id = cc.user_id "
        f"{join} "
        "where cc.course_id = $1 "
        "order by u.last_name, u.first_name",
        *args,
    )

    act_ids = [a["id"] for a in activities]
    user_ids = [u["user_id"] for u in users]
    cells: dict[tuple[int, int], dict] = {}
    if act_ids and user_ids:
        rows = await db.fetch_all(
            "select ac.activity_id, ac.user_id, ac.state, "
            "(ac.viewed_at is not null) as viewed, ac.overridden_by, "
            "ob.first_name || ' ' || ob.last_name as ob_name "
            "from activity_completion ac "
            "left join app_user ob on ob.id = ac.overridden_by "
            "where ac.activity_id = any($1::bigint[]) "
            "and ac.user_id = any($2::bigint[])",
            act_ids, user_ids,
        )
        for r in rows:
            cells[(r["user_id"], r["activity_id"])] = r

    report_rows = [
        {
            "user_id": u["user_id"],
            "full_name": u["full_name"],
            "cells": [_cell(cells.get((u["user_id"], a["id"])), a["id"])
                      for a in activities],
            "course_complete": {
                "done": u["time_completed"] is not None,
                "at": u["time_completed"].date().isoformat() if u["time_completed"] else None,
            },
        }
        for u in users
    ]

    can_override = False
    reason = "sign in as a teacher to override completion"
    if actor_id is not None:
        ctx = await _course_context_id(course_id)
        if ctx is None:
            reason = "no course context for this course"
        else:
            can_override = await permissions.has_capability(
                db, actor_id, "completion:override", ctx
            )
            if not can_override:
                reason = "completion:override is not allowed for you in this course"

    return {
        "activities": [
            {"id": a["id"], "name": a["name"], "hidden": a["hidden"],
             "completion_enabled": a["completion_enabled"]}
            for a in activities
        ],
        "rows": report_rows,
        "can_override": can_override,
        "cannot_override_reason": None if can_override else reason,
    }


# --- completion criteria (config) ---------------------------------------------

@router.get("/courses/{course_id}/criteria")
async def get_criteria(course_id: int):
    """A course's completion criteria: aggregation + the criterion list.

    Backed by course_completion_criteria (the rich, per-kind store) and
    course_completion_setting (the ALL/ANY flag).
    """
    setting = await db.fetch_one(
        "select aggregation from course_completion_setting where course_id = $1",
        course_id,
    )
    aggregation = setting["aggregation"] if setting else "all"
    rows = await db.fetch_all(
        "select ccc.id, ccc.criteria_type as kind, ccc.activity_id, ccc.grade_pass, "
        "ca.name as activity_name "
        "from course_completion_criteria ccc "
        "left join course_activity ca on ca.id = ccc.activity_id "
        "where ccc.course_id = $1 order by ccc.id",
        course_id,
    )
    items = []
    for r in rows:
        item = {
            "id": r["id"],
            "kind": r["kind"],
            "activity_id": r["activity_id"],
            "label": _criteria_label(r["kind"], r["activity_name"], r["grade_pass"]),
        }
        if r["grade_pass"] is not None:
            item["threshold"] = float(r["grade_pass"])
        items.append(item)
    return {"aggregation": aggregation, "items": items}


@router.post("/courses/{course_id}/criteria")
async def edit_criteria(course_id: int, body: CriteriaReq):
    """Add a criterion ({kind, ...}) or flip aggregation ({aggregation})."""
    if body.kind:
        if body.kind not in _CRITERIA_KINDS:
            raise HTTPException(400, f"kind must be one of {sorted(_CRITERIA_KINDS)}")
        if body.kind == "activity" and not body.activity_id:
            raise HTTPException(400, "an activity criterion needs an activity_id")
        await db.execute(
            "insert into course_completion_criteria "
            "(course_id, criteria_type, activity_id, grade_pass) "
            "values ($1, $2::completion_crit_type, $3, $4)",
            course_id, body.kind, body.activity_id, body.threshold,
        )
    elif body.aggregation:
        agg = "any" if body.aggregation == "any" else "all"
        await db.execute(
            "insert into course_completion_setting (course_id, aggregation) "
            "values ($1, $2) "
            "on conflict (course_id) do update set "
            "aggregation = excluded.aggregation, updated_at = now()",
            course_id, agg,
        )
    return await get_criteria(course_id)


# --- activity-level completion writes -----------------------------------------

@router.post("/activities/{activity_id}/view")
async def mark_viewed(activity_id: int, body: ViewReq):
    """Record that the user has seen the activity (Moodle's 'view' criterion)."""
    await db.execute(
        "insert into activity_completion (activity_id, user_id, state, viewed_at) "
        "values ($1, $2, 'incomplete', now()) "
        "on conflict (user_id, activity_id) do update set viewed_at = now()",
        activity_id, body.user_id,
    )
    return await _read_cell(activity_id, body.user_id)


@router.post("/activities/{activity_id}/toggle")
async def toggle_completion(activity_id: int, body: ToggleReq):
    """Student ticks/unticks their OWN manual completion (incomplete <-> complete)."""
    cur = await db.fetch_one(
        "select state from activity_completion where activity_id = $1 and user_id = $2",
        activity_id, body.user_id,
    )
    new_state = "complete" if (cur is None or cur["state"] == "incomplete") else "incomplete"
    await db.execute(
        "insert into activity_completion (activity_id, user_id, state) "
        "values ($1, $2, $3::completion_state) "
        "on conflict (user_id, activity_id) do update set "
        "state = excluded.state, updated_at = now()",
        activity_id, body.user_id, new_state,
    )
    return await _read_cell(activity_id, body.user_id)


@router.post("/activities/{activity_id}/override")
async def override_completion(activity_id: int, body: OverrideReq):
    """Teacher overrides a user's completion state. Gated on completion:override
    at the course context — a missing/prevented capability is a 403 with a reason,
    and no write happens."""
    if body.state not in _COMPLETION_STATES:
        raise HTTPException(400, f"state must be one of {sorted(_COMPLETION_STATES)}")
    activity = await db.fetch_one(
        "select course_id from course_activity where id = $1", activity_id
    )
    if activity is None:
        raise HTTPException(404, "activity not found")
    ctx = await _course_context_id(activity["course_id"])
    if ctx is None:
        raise HTTPException(409, "no course context for this activity")
    try:
        await permissions.require_capability(db, body.actor_id, "completion:override", ctx)
    except PermissionError:
        raise HTTPException(
            403,
            detail="completion:override is prevented or not held for you in this "
                   "course — you cannot override completion here",
        )
    async with db.transaction() as conn:
        await conn.execute(
            "insert into activity_completion "
            "(activity_id, user_id, state, overridden_by) "
            "values ($1, $2, $3::completion_state, $4) "
            "on conflict (user_id, activity_id) do update set "
            "state = excluded.state, overridden_by = excluded.overridden_by, "
            "updated_at = now()",
            activity_id, body.user_id, body.state, body.actor_id,
        )
        await db.audit(
            "progress.overridden", actor_id=body.actor_id, affected_id=body.user_id,
            course_id=activity["course_id"], context_id=ctx,
            detail={"activity_id": activity_id, "state": body.state}, conn=conn,
        )
    return await _read_cell(activity_id, body.user_id)


@router.post("/courses/{course_id}/self-complete")
async def self_complete(course_id: int, body: SelfCompleteReq):
    """Student self-marks the course complete. Only allowed when the course has a
    'self' completion criterion (otherwise 403, like the mock)."""
    has_self = await db.fetch_val(
        "select exists(select 1 from course_completion_criteria "
        "where course_id = $1 and criteria_type = 'self')",
        course_id,
    )
    if not has_self:
        raise HTTPException(
            403,
            detail="Self-completion is not available: this course has no "
                   "self-completion criterion.",
        )
    now = datetime.now(timezone.utc)
    async with db.transaction() as conn:
        await conn.execute(
            "insert into course_completion (user_id, course_id, time_completed) "
            "values ($1, $2, $3) "
            "on conflict (user_id, course_id) do update set "
            "time_completed = excluded.time_completed",
            body.user_id, course_id, now,
        )
        await db.audit(
            "progress.self_completed", affected_id=body.user_id,
            course_id=course_id, detail={"mechanism": "self"}, conn=conn,
        )
    return {"done": True}
