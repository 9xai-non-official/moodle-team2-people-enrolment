"""Courses — reference projections owned by Team 1, from the live DB.

Returns the CONTRACTS.md shape. Soft-deleted courses stay queryable via
include_deleted=1 (hard case #5: history outlives the course).
"""
from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter(prefix="/api/courses", tags=["courses"])

_COLS = (
    "id, short_name, full_name, visible, group_mode::text as group_mode, "
    "force_group_mode, (deleted_at is not null) as deleted"
)


@router.get("")
async def list_courses(include_deleted: int = 0):
    where = "" if include_deleted else "where deleted_at is null"
    return await db.fetch_all(
        f"select {_COLS} from course {where} order by id"
    )


@router.get("/{course_id}")
async def get_course(course_id: int):
    row = await db.fetch_one(
        f"select {_COLS} from course where id = $1", course_id
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"course {course_id} not found")
    return row
