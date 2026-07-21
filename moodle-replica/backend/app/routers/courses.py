"""Courses — where enrolment happens. Skeleton endpoints."""
from fastapi import APIRouter

from app.schemas import Course

router = APIRouter(prefix="/api/courses", tags=["courses"])

_SAMPLE = [
    Course(id=1, shortname="CS101", fullname="Intro to Computer Science"),
]


@router.get("", response_model=list[Course])
def list_courses():
    return _SAMPLE


@router.get("/{course_id}", response_model=Course | None)
def get_course(course_id: int):
    return next((c for c in _SAMPLE if c.id == course_id), None)
