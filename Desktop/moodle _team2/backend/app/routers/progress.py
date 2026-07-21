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


def _fetch(user_id: int | None = None, course_id: int | None = None) -> list[dict]:
    params = {"select": "*", "order": "course_id"}
    if user_id is not None:
        params["user_id"] = f"eq.{user_id}"
    if course_id is not None:
        params["course_id"] = f"eq.{course_id}"
    return db.select("v_course_progress", params)


# --- read ----------------------------------------------------------------------

@router.get("", response_model=CourseProgress)
def get_progress(user_id: int, course_id: int):
    """Progress for one user in one course (both mechanisms combined)."""
    rows = _fetch(user_id=user_id, course_id=course_id)
    if not rows:
        raise HTTPException(404, "No progress record for that user/course.")
    return _to_progress(rows[0])


@router.get("/course/{course_id}", response_model=list[CourseProgress])
def progress_by_course(course_id: int):
    """Every participant's progress in a course."""
    return [_to_progress(r) for r in _fetch(course_id=course_id)]


@router.get("/user/{user_id}", response_model=list[CourseProgress])
def progress_by_user(user_id: int):
    """Every course's progress for a user."""
    return [_to_progress(r) for r in _fetch(user_id=user_id)]


# --- manual completion ---------------------------------------------------------

@router.post("/complete", response_model=CourseProgress)
def mark_complete(req: CompleteRequest):
    """Manually mark a course complete (mechanism #2)."""
    now = datetime.now(timezone.utc).isoformat()
    existing = db.select(
        "course_completion",
        {"user_id": f"eq.{req.user_id}", "course_id": f"eq.{req.course_id}", "select": "id"},
    )
    if existing:
        db.update(
            "course_completion",
            {"time_completed": now},
            {"user_id": f"eq.{req.user_id}", "course_id": f"eq.{req.course_id}"},
        )
    else:
        db.upsert(
            "course_completion",
            [{
                "user_id": req.user_id,
                "course_id": req.course_id,
                "time_started": now,
                "time_completed": now,
            }],
        )
    return get_progress(req.user_id, req.course_id)


@router.delete("/complete", response_model=CourseProgress)
def unmark_complete(user_id: int, course_id: int):
    """Undo a manual completion (clears time_completed). Calculated % is unaffected."""
    db.update(
        "course_completion",
        {"time_completed": None},
        {"user_id": f"eq.{user_id}", "course_id": f"eq.{course_id}"},
    )
    return get_progress(user_id, course_id)
