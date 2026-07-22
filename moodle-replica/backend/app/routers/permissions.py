"""Permission checker API (Khaled / Team 2) — the project centrepiece.

POST /api/permissions/check runs the full gate pipeline and returns the frozen
§17.3 evidence contract (never a bare boolean). GET /api/permissions/decisions
serves the append-only audit log for the demo's Decision Log tab.

Identity vs subject: the CALLER is the authenticated principal (verified
credential). `actor_user_id` in the request is the SUBJECT to explain — not a
login. Explaining about YOURSELF is always allowed; explaining about ANOTHER
user is gated behind a capability (user:viewdetails; admin bypasses).
"""
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app import db
from app.schemas_roles import CheckRequest, CheckResponse, DevLoginRequest
from app.services import auth, permissions
from app.services.auth import Principal, get_current_user

router = APIRouter(prefix="/api/permissions", tags=["permissions"])


@router.post("/dev-login")
async def dev_login(body: DevLoginRequest):
    """DEV ONLY — mint a session token so the SPA can authenticate. Gated by two
    env vars: it 404s unless AUTH_DEV_LOGIN=1 AND AUTH_SECRET is set, so a
    production deploy (neither set) never exposes a credential mint. This is the
    demo stand-in for a real login/IdP; identity is still VERIFIED on every
    request via the signed token."""
    if os.environ.get("AUTH_DEV_LOGIN") != "1" or not os.environ.get("AUTH_SECRET"):
        raise HTTPException(status_code=404, detail="not found")
    if body.user_id is not None:
        row = await db.fetch_one(
            "select id, username from app_user "
            "where id=$1 and deleted_at is null and suspended = false",
            body.user_id,
        )
    elif body.username:
        row = await db.fetch_one(
            "select id, username from app_user "
            "where username=$1 and deleted_at is null and suspended = false",
            body.username,
        )
    else:
        raise HTTPException(status_code=422, detail="username or user_id required")
    if row is None:
        raise HTTPException(status_code=404, detail="user not found")
    token = auth.issue_token(row["id"], username=row["username"], ttl_seconds=12 * 3600)
    return {"token": token, "user": {"id": row["id"], "username": row["username"]}}


@router.post("/check", response_model=CheckResponse)
async def check(req: CheckRequest, principal: Principal = Depends(get_current_user)):
    """The centrepiece. Returns allowed + decision + every gate's evidence.

    The verdict is computed for the SUBJECT (req.actor_user_id). Inspecting a
    subject other than yourself requires user:viewdetails at the context (admin
    bypasses) — so a student cannot enumerate another user's access.
    """
    if req.actor_user_id != principal.user_id:
        try:
            await permissions.require_capability(
                db, principal.user_id, permissions.CAP_VIEW_OTHER, req.context_id
            )
        except PermissionError:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"actor {principal.user_id} may not inspect another user's "
                    f"permissions here (requires '{permissions.CAP_VIEW_OTHER}')"
                ),
            )
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
