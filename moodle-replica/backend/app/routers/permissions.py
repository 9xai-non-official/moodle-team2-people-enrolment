"""Permission checker API (Khaled / Team 2) — the project centrepiece.

POST /api/permissions/check runs the full gate pipeline and returns the frozen
§17.3 evidence contract (never a bare boolean). GET /api/permissions/decisions
serves the append-only audit log for the demo's Decision Log tab.
"""
from typing import Optional

from fastapi import APIRouter, Query

from app import db
from app.schemas_roles import CheckRequest, CheckResponse
from app.services import permissions

router = APIRouter(prefix="/api/permissions", tags=["permissions"])


@router.post("/check", response_model=CheckResponse)
async def check(req: CheckRequest):
    """The centrepiece. Returns allowed + decision + every gate's evidence."""
    return await permissions.check(
        db,
        req.actor_user_id,
        req.capability,
        req.context_id,
        target_id=req.target_user_id,
        action=req.action,
        activity_id=req.activity_id,
        simulate_role=req.simulate_role_id,
    )


@router.get("/decisions")
async def decisions(actor_id: Optional[int] = Query(None), limit: int = Query(50, le=500)):
    """The audit log — every /check call, newest first."""
    return await permissions.decisions(db, actor_id=actor_id, limit=limit)
