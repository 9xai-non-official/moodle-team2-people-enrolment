"""Progress report (completion grid) — the CompletionGrid endpoint.

Additive to Mahdi's progress router (same /api/progress prefix, separate file
so his routes are untouched). Serves the CONTRACTS.md report shape from the
real DB: tracked users × activities, per-cell completion state, and the
server-decided `can_override` gate (via fn_can — now live).
"""
import json

from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter(prefix="/api/progress", tags=["progress"])


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
