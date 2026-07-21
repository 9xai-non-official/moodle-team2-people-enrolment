"""Users — the people in the system. Skeleton endpoints."""
from fastapi import APIRouter

from app.schemas import User

router = APIRouter(prefix="/api/users", tags=["users"])

# Placeholder in-memory data until a real database is wired in.
_SAMPLE = [
    User(id=1, username="admin", firstname="Site", lastname="Admin", email="admin@example.com"),
]


@router.get("", response_model=list[User])
def list_users():
    return _SAMPLE


@router.get("/{user_id}", response_model=User | None)
def get_user(user_id: int):
    return next((u for u in _SAMPLE if u.id == user_id), None)
