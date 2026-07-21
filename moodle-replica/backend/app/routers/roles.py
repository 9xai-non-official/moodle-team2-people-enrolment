"""Roles — what a user is allowed to do in a context. Skeleton endpoints."""
from fastapi import APIRouter

from app.schemas import Role

router = APIRouter(prefix="/api/roles", tags=["roles"])

# Moodle's default archetypes, as a starting point.
_SAMPLE = [
    Role(id=1, shortname="manager", name="Manager"),
    Role(id=2, shortname="editingteacher", name="Teacher"),
    Role(id=3, shortname="teacher", name="Non-editing teacher"),
    Role(id=4, shortname="student", name="Student"),
]


@router.get("", response_model=list[Role])
def list_roles():
    return _SAMPLE
