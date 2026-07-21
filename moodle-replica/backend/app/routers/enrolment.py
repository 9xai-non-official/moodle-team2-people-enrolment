"""Enrolment — links a user to a course with a role. The heart of this module."""
from fastapi import APIRouter

from app.schemas import Enrolment

router = APIRouter(prefix="/api/enrolment", tags=["enrolment"])

_SAMPLE: list[Enrolment] = []


@router.get("", response_model=list[Enrolment])
def list_enrolments(courseid: int | None = None, userid: int | None = None):
    result = _SAMPLE
    if courseid is not None:
        result = [e for e in result if e.courseid == courseid]
    if userid is not None:
        result = [e for e in result if e.userid == userid]
    return result
