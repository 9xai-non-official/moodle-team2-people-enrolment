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
