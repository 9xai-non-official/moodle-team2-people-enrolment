"""
Course progress & completion.

Mechanisms:
  1. CALCULATED — % of the course's tracked activities the user has finished
     (v_course_progress; the view (M03) computes a clamped `percent`,
     `is_complete` and `enrolled` over one tracked set).
  2. MANUAL — a teacher/admin marks the course complete
     (course_completion.time_completed; write-once at the DB level, M13).
  3. AUTOMATIC — completing activities can satisfy the course's completion
     criteria and auto-set completion (Part B below).

Progress-integrity work applied here (T2-PRG-*):
  001  defensive clamp so the API can never emit >100% / false completion,
       even though the view is now authoritative.
  002  mark_complete is a no-op once completed (never trips the write-once
       trigger with a benign re-POST).
  003  real activity-completion write path + criteria/aggregation + a
       capability-gated, audited, fail-closed override.
  005  display is gated on live enrolment (view's `enrolled`), preserving
       stored rows.
  004  best-effort append-only snapshots (degrades until D-SNAP lands).
"""
import json
import logging
from datetime import datetime, timezone

import asyncpg
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import db

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/progress", tags=["progress"])

DONE_STATES = ["complete", "complete_pass"]              # match the view's numerator
VALID_STATES = ("incomplete", "complete", "complete_pass", "complete_fail")
COMPLETION_OVERRIDE_CAP = "completion:override"


# --- models --------------------------------------------------------------------

class CourseProgress(BaseModel):
    user_id: int
    course_id: int
    short_name: str | None = None
    activities_done: int
    activities_total: int
    percent_complete: float
    percent_remaining: float
    calculated_complete: bool
    manually_completed: bool
    time_completed: str | None = None
    completed: bool
    enrolled: bool                   # live enrolment right now (T2-PRG-005)


class CompleteRequest(BaseModel):
    user_id: int
    course_id: int
    actor_id: int | None = None


class ActivityCompletion(BaseModel):
    user_id: int
    activity_id: int
    state: str
    viewed: bool = False


class ActivityOverride(BaseModel):
    user_id: int
    activity_id: int
    state: str
    actor_id: int


# --- helpers -------------------------------------------------------------------

def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _validate_state(state: str) -> None:
    if state not in VALID_STATES:
        raise HTTPException(422, f"invalid state {state!r}; expected one of {VALID_STATES}")


def _to_progress(row: dict) -> CourseProgress:
    """Combined progress model with a defensive clamp (T2-PRG-001).

    The view now supplies an authoritative, clamped `percent`, but we never
    trust counts blindly: if a future regression made activities_done > total,
    we cap % at 100 and require an exact done == total for calculated
    completion, so the API can never report >100% or a false 'completed'.
    """
    done = max(0, int(row.get("activities_done") or 0))
    total = max(0, int(row.get("activities_total") or 0))
    if done > total:
        log.warning(
            "v_course_progress anomaly: done=%s > total=%s user=%s course=%s (T2-PRG-001)",
            done, total, row.get("user_id"), row.get("course_id"),
        )
    counted = min(done, total)
    pct = round(counted / total * 100, 1) if total > 0 else 0.0
    pct = min(100.0, max(0.0, pct))
    calculated = total > 0 and done == total
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
        time_completed=_iso(row.get("time_completed")),
        completed=calculated or manual,
        enrolled=bool(row.get("enrolled")),
    )


async def _fetch(user_id: int | None = None, course_id: int | None = None) -> list[dict]:
    """Read v_course_progress (incl. the M03 `enrolled` column) via asyncpg."""
    where, args = [], []
    if user_id is not None:
        args.append(user_id)
        where.append(f"user_id = ${len(args)}")
    if course_id is not None:
        args.append(course_id)
        where.append(f"course_id = ${len(args)}")
    clause = f"where {' and '.join(where)}" if where else ""
    return await db.fetch_all(
        f"select * from v_course_progress {clause} order by course_id", *args
    )


def _gate(rows: list[dict], include_unenrolled: bool) -> list[CourseProgress]:
    """T2-PRG-005: hide users with no live enrolment by default. Rows are never
    deleted — this gates DISPLAY only."""
    out = []
    for r in rows:
        if not bool(r.get("enrolled")) and not include_unenrolled:
            continue
        out.append(_to_progress(r))
    return out


# --- read ----------------------------------------------------------------------

@router.get("", response_model=CourseProgress)
async def get_progress(user_id: int, course_id: int):
    """Progress for one user in one course (both mechanisms combined).

    Returns the stored record with `enrolled` reflecting live enrolment; gating
    a single lookup is the caller's choice.
    """
    rows = await _fetch(user_id=user_id, course_id=course_id)
    if not rows:
        raise HTTPException(404, "No progress record for that user/course.")
    return _to_progress(rows[0])


@router.get("/course/{course_id}", response_model=list[CourseProgress])
async def progress_by_course(course_id: int, include_unenrolled: bool = False):
    """Currently-enrolled participants' progress. include_unenrolled=true for an
    admin/historical view of everyone who ever had a completion record."""
    return _gate(await _fetch(course_id=course_id), include_unenrolled)


@router.get("/user/{user_id}", response_model=list[CourseProgress])
async def progress_by_user(user_id: int, include_unenrolled: bool = False):
    """A user's progress across their currently-enrolled courses by default."""
    return _gate(await _fetch(user_id=user_id), include_unenrolled)


# --- manual completion ---------------------------------------------------------

@router.post("/complete", response_model=CourseProgress)
async def mark_complete(req: CompleteRequest):
    """Manually mark a course complete (mechanism #2), write-once (T2-PRG-002).

    If already completed this is a no-op returning the stored record — so a
    benign re-POST never trips the DB write-once trigger with a 409.
    """
    existing = await db.fetch_one(
        "select time_completed from course_completion where user_id=$1 and course_id=$2",
        req.user_id, req.course_id,
    )
    if existing and existing["time_completed"] is not None:
        log.info("mark_complete no-op: user=%s course=%s already complete",
                 req.user_id, req.course_id)
        return await get_progress(req.user_id, req.course_id)

    now = datetime.now(timezone.utc)
    async with db.transaction() as conn:
        await conn.execute(
            "insert into course_completion (user_id, course_id, time_started, time_completed) "
            "values ($1, $2, $3, $3) "
            "on conflict (user_id, course_id) do update set time_completed = excluded.time_completed",
            req.user_id, req.course_id, now,
        )
        await db.audit("progress.completed", actor_id=req.actor_id, affected_id=req.user_id,
                       course_id=req.course_id,
                       detail={"time_completed": now.isoformat(), "mechanism": "manual"}, conn=conn)
    await _snapshot(req.user_id, req.course_id, reason="event", note="manual complete")
    return await get_progress(req.user_id, req.course_id)


@router.delete("/complete", response_model=CourseProgress)
async def unmark_complete(user_id: int, course_id: int):
    """Un-completion is blocked by the DB write-once trigger (M13) and returns
    409. A proper authorised, audited reset needs a trigger-permitted path
    (coordinate with D-IMMUT); left failing loudly so it's visible in testing."""
    async with db.transaction() as conn:
        await conn.execute(
            "update course_completion set time_completed = null where user_id=$1 and course_id=$2",
            user_id, course_id,
        )
        await db.audit("progress.uncompleted", affected_id=user_id, course_id=course_id, conn=conn)
    return await get_progress(user_id, course_id)


# --- activity completion + criteria/aggregation + override (T2-PRG-003) --------

async def _activity(activity_id: int) -> dict:
    row = await db.fetch_one(
        "select id, course_id, completion_enabled, deleted_at from course_activity where id=$1",
        activity_id,
    )
    if not row:
        raise HTTPException(404, f"activity {activity_id} not found")
    return row


async def _context_id(level: str, instance_id: int) -> int | None:
    return await db.fetch_val(
        "select id from context where level=$1 and instance_id=$2", level, instance_id
    )


async def _ensure_tracking(user_id: int, course_id: int) -> None:
    await db.execute(
        "insert into course_completion (user_id, course_id, time_started) values ($1, $2, now()) "
        "on conflict (user_id, course_id) do nothing",
        user_id, course_id,
    )


async def _criteria(course_id: int) -> tuple[set[int], str]:
    """(required_activity_ids, aggregation). Reads the D-CRIT tables; falls back
    to the Moodle default (ALL completion-enabled, non-deleted activities).

    If the D-CRIT tables aren't present yet, degrade to the default rather than
    500 — same graceful-degradation contract the snapshot paths use, so a normal
    activity-completion write never fails on a missing migration.
    """
    try:
        aggregation = await db.fetch_val(
            "select aggregation from course_completion_setting where course_id=$1", course_id
        ) or "all"
        rows = await db.fetch_all(
            "select activity_id from completion_criteria where course_id=$1", course_id
        )
        required = {r["activity_id"] for r in rows}
    except asyncpg.UndefinedTableError:
        aggregation, required = "all", set()
    if not required:
        acts = await db.fetch_all(
            "select id from course_activity "
            "where course_id=$1 and completion_enabled and deleted_at is null",
            course_id,
        )
        required = {a["id"] for a in acts}
    return required, aggregation


async def _done_activity_ids(user_id: int, course_id: int) -> set[int]:
    rows = await db.fetch_all(
        "select ac.activity_id from activity_completion ac "
        "join course_activity ca on ca.id = ac.activity_id "
        "where ac.user_id=$1 and ca.course_id=$2 and ac.state::text = any($3::text[])",
        user_id, course_id, DONE_STATES,
    )
    return {r["activity_id"] for r in rows}


async def _criteria_met(user_id: int, course_id: int) -> bool:
    required, aggregation = await _criteria(course_id)
    if not required:
        return False
    done = await _done_activity_ids(user_id, course_id)
    return bool(required & done) if aggregation == "any" else required <= done


async def _recompute_course_completion(user_id: int, course_id: int,
                                       actor_id: int | None = None) -> None:
    """Automatic completion (Part B): set time_completed (write-once, audited)
    when the criteria are met. Never clears an existing completion."""
    if not await _criteria_met(user_id, course_id):
        return
    existing = await db.fetch_one(
        "select time_completed from course_completion where user_id=$1 and course_id=$2",
        user_id, course_id,
    )
    if existing and existing["time_completed"] is not None:
        return
    now = datetime.now(timezone.utc)
    async with db.transaction() as conn:
        await conn.execute(
            "insert into course_completion (user_id, course_id, time_started, time_completed) "
            "values ($1, $2, $3, $3) "
            "on conflict (user_id, course_id) do update set time_completed = excluded.time_completed",
            user_id, course_id, now,
        )
        await db.audit("progress.completed", actor_id=actor_id, affected_id=user_id,
                       course_id=course_id,
                       detail={"time_completed": now.isoformat(), "mechanism": "auto"}, conn=conn)
    await _snapshot(user_id, course_id, reason="event", note="auto complete")


@router.post("/activity", response_model=CourseProgress)
async def set_activity_completion(req: ActivityCompletion):
    """Automatic activity-completion write path (Part A).

    If the activity is manually overridden (overridden_by set), the automatic
    path is locked out (no-op) — Moodle stops auto-updating an overridden
    activity. Recomputes course completion afterward.
    """
    _validate_state(req.state)
    act = await _activity(req.activity_id)

    existing = await db.fetch_one(
        "select overridden_by from activity_completion where user_id=$1 and activity_id=$2",
        req.user_id, req.activity_id,
    )
    if existing and existing["overridden_by"] is not None:
        log.info("activity %s / user %s overridden — auto update ignored (T2-PRG-003)",
                 req.activity_id, req.user_id)
        await _ensure_tracking(req.user_id, act["course_id"])
        return await get_progress(req.user_id, act["course_id"])

    now = datetime.now(timezone.utc)
    viewed = now if (req.viewed or req.state != "incomplete") else None
    await db.execute(
        "insert into activity_completion (user_id, activity_id, state, viewed_at, updated_at) "
        "values ($1, $2, $3::completion_state, $4, $5) "
        "on conflict (user_id, activity_id) do update set "
        "state = excluded.state, "
        "viewed_at = coalesce(excluded.viewed_at, activity_completion.viewed_at), "
        "updated_at = excluded.updated_at",
        req.user_id, req.activity_id, req.state, viewed, now,
    )
    await _ensure_tracking(req.user_id, act["course_id"])
    await _recompute_course_completion(req.user_id, act["course_id"])
    return await get_progress(req.user_id, act["course_id"])


def _granted(verdict) -> tuple[bool, str]:
    if isinstance(verdict, str):
        verdict = json.loads(verdict)
    return bool(verdict.get("granted")), str(verdict.get("reason", ""))


@router.post("/activity/override", response_model=CourseProgress)
async def override_activity_completion(req: ActivityOverride):
    """Capability-gated manual override (Part C).

    The actor must hold COMPLETION_OVERRIDE_CAP at the activity's (or course's)
    context per fn_can. Sets overridden_by so the automatic path no longer
    touches this activity. Audited. Fail-closed: if fn_can can't be consulted,
    the override is denied.
    """
    _validate_state(req.state)
    act = await _activity(req.activity_id)

    ctx = await _context_id("activity", req.activity_id) \
        or await _context_id("course", act["course_id"])
    if ctx is None:
        raise HTTPException(409, "no context for this activity/course; permission cannot "
                                 "be resolved (context seeding is the roles domain).")
    try:
        verdict = await db.fetch_val("select fn_can($1, $2, $3)",
                                     req.actor_id, COMPLETION_OVERRIDE_CAP, ctx)
    except Exception:  # noqa: BLE001
        log.exception("fn_can unavailable — denying override (fail-closed)")
        raise HTTPException(403, "permission engine (fn_can) unavailable — override denied")
    granted, reason = _granted(verdict)
    if not granted:
        raise HTTPException(403, f"actor {req.actor_id} lacks {COMPLETION_OVERRIDE_CAP}: {reason}")

    now = datetime.now(timezone.utc)
    async with db.transaction() as conn:
        await conn.execute(
            "insert into activity_completion (user_id, activity_id, state, overridden_by, updated_at) "
            "values ($1, $2, $3::completion_state, $4, $5) "
            "on conflict (user_id, activity_id) do update set "
            "state = excluded.state, overridden_by = excluded.overridden_by, "
            "updated_at = excluded.updated_at",
            req.user_id, req.activity_id, req.state, req.actor_id, now,
        )
        await db.audit("progress.activity_override", actor_id=req.actor_id,
                       affected_id=req.user_id, course_id=act["course_id"],
                       detail={"activity_id": req.activity_id, "state": req.state}, conn=conn)
    await _ensure_tracking(req.user_id, act["course_id"])
    await _recompute_course_completion(req.user_id, act["course_id"], actor_id=req.actor_id)
    return await get_progress(req.user_id, act["course_id"])


# --- snapshots (T2-PRG-004 / D-SNAP) -------------------------------------------
# Append-only completion ledger that OUTLIVES a deleted course. Best-effort:
# until the progress_snapshot migration (fix_T2-PRG-004_D-SNAP_snapshots.sql) is
# applied, writes are skipped and the read endpoint returns 503 — never breaks
# the completion write that triggered it.

async def _snapshot(user_id: int, course_id: int, *, reason: str = "event",
                    note: str | None = None) -> None:
    try:
        course = await db.fetch_one(
            "select short_name, full_name from course where id=$1", course_id)
        rows = await _fetch(user_id=user_id, course_id=course_id)
        prog = _to_progress(rows[0]) if rows else None
        await db.execute(
            "insert into progress_snapshot "
            "(user_id, course_id, course_short_name, course_full_name, percent, "
            " activities_done, activities_total, completed, reason, note, taken_at) "
            "values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())",
            user_id, course_id,
            (course or {}).get("short_name") or f"course#{course_id}",
            (course or {}).get("full_name"),
            prog.percent_complete if prog else 0.0,
            prog.activities_done if prog else None,
            prog.activities_total if prog else None,
            prog.completed if prog else False,
            reason, note,
        )
    except asyncpg.UndefinedTableError:
        pass  # D-SNAP migration not applied yet — silently skip
    except Exception:  # noqa: BLE001 — snapshots must never break the operation
        log.exception("progress_snapshot write failed user=%s course=%s", user_id, course_id)


@router.get("/snapshots")
async def list_snapshots(user_id: int | None = None):
    """Completion history, including for deleted courses (HC-5)."""
    try:
        rows = await db.fetch_all(
            "select * from progress_snapshot "
            "where ($1::bigint is null or user_id = $1) order by taken_at desc",
            user_id,
        )
    except asyncpg.UndefinedTableError:
        raise HTTPException(503, "progress_snapshot not created yet (D-SNAP migration pending).")
    return [{k: _iso(v) for k, v in r.items()} for r in rows]
