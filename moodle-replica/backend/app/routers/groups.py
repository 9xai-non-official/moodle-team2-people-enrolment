"""Groups — subdivisions of enrolled users within a course. Skeleton endpoints."""
from fastapi import APIRouter

from app.schemas import Group

router = APIRouter(prefix="/api/groups", tags=["groups"])

_SAMPLE: list[Group] = []


@router.get("", response_model=list[Group])
def list_groups(courseid: int | None = None):
    if courseid is None:
        return _SAMPLE
    return [g for g in _SAMPLE if g.courseid == courseid]
