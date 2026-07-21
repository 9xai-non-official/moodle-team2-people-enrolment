"""Users — the people in the system, from the live DB (task 03 bootstrap).

Returns the CONTRACTS.md shape (full_name, suspended, ...). Soft-deleted
users are hidden here on purpose — their history still surfaces through
progress snapshots (hard case #5).
"""
from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter(prefix="/api/users", tags=["users"])

_COLS = (
    "id, username, first_name, last_name, "
    "first_name || ' ' || last_name as full_name, id_number, suspended"
)


@router.get("")
async def list_users():
    return await db.fetch_all(
        f"select {_COLS} from app_user where deleted_at is null order by id"
    )


@router.get("/{user_id}")
async def get_user(user_id: int):
    row = await db.fetch_one(
        f"select {_COLS} from app_user where id = $1", user_id
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"user {user_id} not found")
    return row
