"""Courses — read from the live database."""
from fastapi import APIRouter

from app import db

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("")
def list_courses():
    return db.select(
        "course",
        {"select": "id,short_name,full_name,visible", "deleted_at": "is.null", "order": "id"},
    )


@router.get("/{course_id}")
def get_course(course_id: int):
    rows = db.select("course", {"select": "*", "id": f"eq.{course_id}"})
    return rows[0] if rows else None
