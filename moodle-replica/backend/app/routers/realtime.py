"""Realtime token endpoint — the browser's only path to Ably. It gets a
short-lived, subscribe-only token scoped to course channels + its own user
channel; the API key never leaves the server."""
from fastapi import APIRouter, Depends, HTTPException

from app.deps import current_user
from app.services import realtime

router = APIRouter(prefix="/api/realtime", tags=["realtime"])


@router.post("/token")
async def token(principal: dict = Depends(current_user)):
    if not realtime.configured():
        raise HTTPException(
            status_code=503,
            detail="realtime not configured — set ABLY_API_KEY in backend/.env")
    return realtime.create_token_request(
        client_id=str(principal["id"]),
        capability={
            "course:*": ["subscribe"],
            f"user:{principal['id']}": ["subscribe"],
        })
