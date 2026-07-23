"""Progress report (completion grid) — the CompletionGrid endpoint.

Additive to Mahdi's progress router (same /api/progress prefix, separate file
so his routes are untouched). Serves the CONTRACTS.md report shape from the
real DB: tracked users × activities, per-cell completion state, and the
server-decided `can_override` gate (via fn_can — now live).
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import db

router = APIRouter(prefix="/api/progress", tags=["progress"])

VALID_STATES = ("incomplete", "complete", "complete_pass", "complete_fail")
CRITERIA_KINDS = ("activity", "self", "date", "grade")


@router.get("/courses/{course_id}/report")
async def course_report(course_id: int, actor_id: int | None = None,
                        group_id: int | None = None):
    course = await db.fetch_one("select id from course where id = $1", course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="unknown course")

    activities = await db.fetch_all(
        """
        select id, name, (not visible) as hidden, completion_enabled
          from course_activity
         where course_id = $1 and deleted_at is null and completion_enabled
         order by id
        """, course_id)

    # tracked users = those with a course_completion row for this course,
    # optionally narrowed to one group (T2-GRP-002 scope for the grid).
    if group_id:
        users = await db.fetch_all(
            """
            select distinct u.id as user_id, u.first_name || ' ' || u.last_name as full_name
              from course_completion cc
              join app_user u on u.id = cc.user_id
              join group_member gm on gm.user_id = u.id
             where cc.course_id = $1 and gm.group_id = $2
             order by full_name
            """, course_id, group_id)
    else:
        users = await db.fetch_all(
            """
            select u.id as user_id, u.first_name || ' ' || u.last_name as full_name
              from course_completion cc
              join app_user u on u.id = cc.user_id
             where cc.course_id = $1
             order by full_name
            """, course_id)

    cells = await db.fetch_all(
        """
        select ac.user_id, ac.activity_id, ac.state::text as state,
               ac.viewed_at is not null as viewed,
               ob.id as ob_id, ob.first_name || ' ' || ob.last_name as ob_name
          from activity_completion ac
          join course_activity ca on ca.id = ac.activity_id
          left join app_user ob on ob.id = ac.overridden_by
         where ca.course_id = $1
        """, course_id)
    cell_map: dict[tuple[int, int], dict] = {}
    for c in cells:
        cell_map[(c["user_id"], c["activity_id"])] = c

    completions = await db.fetch_all(
        "select user_id, time_completed from course_completion where course_id = $1", course_id)
    done_map = {c["user_id"]: c["time_completed"] for c in completions}

    act_ids = [a["id"] for a in activities]
    rows = []
    for u in users:
        uid = u["user_id"]
        row_cells = []
        for aid in act_ids:
            c = cell_map.get((uid, aid))
            row_cells.append({
                "activity_id": aid,
                "state": c["state"] if c else "incomplete",
                "viewed": c["viewed"] if c else False,
                "overridden_by": ({"id": c["ob_id"], "full_name": c["ob_name"]}
                                  if c and c["ob_id"] else None),
            })
        at = done_map.get(uid)
        rows.append({
            "user_id": uid, "full_name": u["full_name"], "cells": row_cells,
            "course_complete": {"done": at is not None,
                                "at": at.date().isoformat() if at else None},
        })

    # can_override — server-decided via fn_can at the course context.
    can_override, reason = False, "no actor supplied"
    if actor_id:
        ctx = await db.fetch_one(
            "select id from context where level='course' and instance_id=$1", course_id)
        if ctx:
            verdict = await db.fetch_one(
                "select fn_can($1,'completion:override',$2) as v", actor_id, ctx["id"])
            v = verdict["v"] if verdict else {}
            if isinstance(v, str):  # asyncpg returns jsonb as text
                v = json.loads(v)
            can_override = bool(v.get("granted"))
            reason = None if can_override else v.get("reason", "not permitted")
        else:
            reason = "no course context"

    return {
        "activities": [dict(a) for a in activities],
        "rows": rows,
        "can_override": can_override,
        "cannot_override_reason": reason,
    }


# ============================================================================
# Completion CRITERIA (config) + activity-level completion writes.
#
# Additive, same /api/progress prefix. These complete the Progress page against
# the real DB: the Criteria tab, the report grid's Tick/Override buttons, and
# self-completion. Capability for the one privileged action (override another
# user's completion) is decided server-side by the in-DB fn_can(), the same
# fast-path course_report uses above. Everything else is a student acting on
# their own row or a config read/write.
#
# NOTE: the History/snapshots tab is served by Mahdi's progress.py (/snapshots).
# ============================================================================

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
    # One POST does either job: {aggregation} flips ALL/ANY, {kind,...} appends.
    aggregation: str | None = None
    kind: str | None = None
    activity_id: int | None = None
    threshold: float | None = None


async def _course_context_id(course_id: int) -> int | None:
    row = await db.fetch_one(
        "select id from context where level='course' and instance_id=$1", course_id)
    return row["id"] if row else None


def _cell_shape(row: dict | None, activity_id: int) -> dict:
    if row is None:
        return {"activity_id": activity_id, "state": "incomplete",
                "overridden_by": None, "viewed": False}
    ob = {"id": row["ob_id"], "full_name": row["ob_name"]} if row.get("ob_id") else None
    return {"activity_id": activity_id, "state": row["state"],
            "overridden_by": ob, "viewed": row["viewed"]}


async def _read_cell(activity_id: int, user_id: int) -> dict:
    row = await db.fetch_one(
        """
        select ac.state::text as state, ac.viewed_at is not null as viewed,
               ob.id as ob_id, ob.first_name || ' ' || ob.last_name as ob_name
          from activity_completion ac
          left join app_user ob on ob.id = ac.overridden_by
         where ac.activity_id = $1 and ac.user_id = $2
        """, activity_id, user_id)
    return _cell_shape(row, activity_id)


def _criteria_label(kind, activity_name, threshold):
    if kind == "activity":
        return f"Complete {activity_name or 'activity'}"
    if kind == "self":
        return "Self completion"
    if kind == "date":
        return "Reach completion date"
    if kind == "grade":
        return f"Achieve grade ≥ {threshold if threshold is not None else '?'}"
    return kind


# --- completion criteria -------------------------------------------------------

@router.get("/courses/{course_id}/criteria")
async def get_criteria(course_id: int):
    """A course's completion criteria: aggregation + criterion list. Backed by
    course_completion_criteria (per-kind) + course_completion_setting (ALL/ANY)."""
    setting = await db.fetch_one(
        "select aggregation from course_completion_setting where course_id=$1", course_id)
    aggregation = setting["aggregation"] if setting else "all"
    rows = await db.fetch_all(
        """
        select ccc.id, ccc.criteria_type::text as kind, ccc.activity_id,
               ccc.grade_pass, ca.name as activity_name
          from course_completion_criteria ccc
          left join course_activity ca on ca.id = ccc.activity_id
         where ccc.course_id = $1 order by ccc.id
        """, course_id)
    items = []
    for r in rows:
        item = {"id": r["id"], "kind": r["kind"], "activity_id": r["activity_id"],
                "label": _criteria_label(r["kind"], r["activity_name"], r["grade_pass"])}
        if r["grade_pass"] is not None:
            item["threshold"] = float(r["grade_pass"])
        items.append(item)
    return {"aggregation": aggregation, "items": items}


@router.post("/courses/{course_id}/criteria")
async def edit_criteria(course_id: int, body: CriteriaReq):
    """Add a criterion ({kind,...}) or flip aggregation ({aggregation})."""
    if body.kind:
        if body.kind not in CRITERIA_KINDS:
            raise HTTPException(400, f"kind must be one of {list(CRITERIA_KINDS)}")
        if body.kind == "activity" and not body.activity_id:
            raise HTTPException(400, "an activity criterion needs an activity_id")
        await db.execute(
            "insert into course_completion_criteria "
            "(course_id, criteria_type, activity_id, grade_pass) "
            "values ($1, $2::completion_crit_type, $3, $4)",
            course_id, body.kind, body.activity_id, body.threshold)
    elif body.aggregation:
        agg = "any" if body.aggregation == "any" else "all"
        await db.execute(
            "insert into course_completion_setting (course_id, aggregation) values ($1,$2) "
            "on conflict (course_id) do update set "
            "aggregation=excluded.aggregation, updated_at=now()",
            course_id, agg)
    return await get_criteria(course_id)


# --- activity-level completion writes -----------------------------------------

@router.post("/activities/{activity_id}/view")
async def mark_viewed(activity_id: int, body: ViewReq):
    """Record that the user has seen the activity (Moodle's 'view' criterion)."""
    await db.execute(
        "insert into activity_completion (activity_id, user_id, state, viewed_at) "
        "values ($1,$2,'incomplete',now()) "
        "on conflict (user_id, activity_id) do update set viewed_at = now()",
        activity_id, body.user_id)
    return await _read_cell(activity_id, body.user_id)


@router.post("/activities/{activity_id}/toggle")
async def toggle_completion(activity_id: int, body: ToggleReq):
    """Student ticks/unticks their OWN manual completion (incomplete<->complete)."""
    cur = await db.fetch_one(
        "select state::text as state from activity_completion "
        "where activity_id=$1 and user_id=$2", activity_id, body.user_id)
    new_state = "complete" if (cur is None or cur["state"] == "incomplete") else "incomplete"
    await db.execute(
        "insert into activity_completion (activity_id, user_id, state) "
        "values ($1,$2,$3::completion_state) "
        "on conflict (user_id, activity_id) do update set state=excluded.state, updated_at=now()",
        activity_id, body.user_id, new_state)
    return await _read_cell(activity_id, body.user_id)


@router.post("/activities/{activity_id}/override")
async def override_completion(activity_id: int, body: OverrideReq):
    """Teacher overrides a user's completion. Gated on completion:override via
    fn_can at the course context — denied is a 403 with the reason, no write."""
    if body.state not in VALID_STATES:
        raise HTTPException(400, f"state must be one of {list(VALID_STATES)}")
    activity = await db.fetch_one(
        "select course_id from course_activity where id=$1", activity_id)
    if activity is None:
        raise HTTPException(404, "activity not found")
    ctx = await _course_context_id(activity["course_id"])
    if ctx is None:
        raise HTTPException(409, "no course context for this activity")
    verdict = await db.fetch_one(
        "select fn_can($1,'completion:override',$2) as v", body.actor_id, ctx)
    v = verdict["v"] if verdict else {}
    if isinstance(v, str):
        v = json.loads(v)
    if not bool(v.get("granted")):
        raise HTTPException(
            403, detail=v.get("reason",
                              "completion:override is not permitted for you here"))
    async with db.transaction() as conn:
        await conn.execute(
            "insert into activity_completion (activity_id, user_id, state, overridden_by) "
            "values ($1,$2,$3::completion_state,$4) "
            "on conflict (user_id, activity_id) do update set "
            "state=excluded.state, overridden_by=excluded.overridden_by, updated_at=now()",
            activity_id, body.user_id, body.state, body.actor_id)
        await db.audit("progress.overridden", actor_id=body.actor_id,
                       affected_id=body.user_id, course_id=activity["course_id"],
                       context_id=ctx,
                       detail={"activity_id": activity_id, "state": body.state}, conn=conn)
    return await _read_cell(activity_id, body.user_id)


@router.post("/courses/{course_id}/self-complete")
async def self_complete(course_id: int, body: SelfCompleteReq):
    """Student self-marks the course complete — only when a 'self' criterion
    exists (otherwise 403)."""
    has_self = await db.fetch_val(
        "select exists(select 1 from course_completion_criteria "
        "where course_id=$1 and criteria_type='self')", course_id)
    if not has_self:
        raise HTTPException(
            403, detail="Self-completion is not available: this course has no "
                        "self-completion criterion.")
    now = datetime.now(timezone.utc)
    async with db.transaction() as conn:
        await conn.execute(
            "insert into course_completion (user_id, course_id, time_completed) "
            "values ($1,$2,$3) "
            "on conflict (user_id, course_id) do update set time_completed=excluded.time_completed",
            body.user_id, course_id, now)
        await db.audit("progress.self_completed", affected_id=body.user_id,
                       course_id=course_id, detail={"mechanism": "self"}, conn=conn)
    return {"done": True}
