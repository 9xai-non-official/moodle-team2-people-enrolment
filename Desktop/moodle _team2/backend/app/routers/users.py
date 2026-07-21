"""Users — read from the live database."""
from fastapi import APIRouter

from app import db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
def list_users():
    return db.select(
        "app_user",
        {"select": "id,username,first_name,last_name,email",
         "deleted_at": "is.null", "order": "id"},
    )


@router.get("/{user_id}")
def get_user(user_id: int):
    rows = db.select("app_user", {"select": "*", "id": f"eq.{user_id}"})
    return rows[0] if rows else None
