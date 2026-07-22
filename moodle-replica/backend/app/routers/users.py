"""Users — the people in the system, from the live DB (task 03 bootstrap).

Returns the CONTRACTS.md shape (full_name, suspended, ...). Soft-deleted
users are hidden here on purpose — their history still surfaces through
progress snapshots (hard case #5).

T2-ENR-001: the list stays OPEN — it is the frontend's acting-user bootstrap
call (fires before any principal exists) and returns only minimal columns.
The detail route requires a principal: yourself is free, anyone else needs
user:viewdetails (checked at the target's user context when one exists, else
the system context — so until user contexts are seeded, only manager/admin
can read other people's details).
"""
from fastapi import APIRouter, Depends, HTTPException

from app import db
from app.caps_enrolment import (CAP_VIEW_USER_DETAILS, require_capability_http,
                                user_view_context_id)
from app.deps import current_user

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
async def get_user(user_id: int, principal: dict = Depends(current_user)):
    row = await db.fetch_one(
        f"select {_COLS} from app_user where id = $1", user_id
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"user {user_id} not found")
    if user_id != principal["id"]:
        await require_capability_http(principal["id"], CAP_VIEW_USER_DETAILS,
                                      await user_view_context_id(user_id))
    return row
