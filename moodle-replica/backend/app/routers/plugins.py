"""Plugin admin API (T2-PLUG-001) — registry, lifecycle, settings, outbox.

Every route (except the token-authed dispatch sweep) is gated on
plugin:manage at the system context, via the same service-layer
require_capability mapping caps_enrolment uses (admin bypass + suspended-
actor denial included).
"""
import os

from fastapi import APIRouter, Body, Depends, Header, HTTPException

from app import db
from app.caps_enrolment import require_capability_http, system_context_id
from app.deps import current_user
from app.services import plugin_core

router = APIRouter(prefix="/api/plugins", tags=["plugins"])

CAP_PLUGIN_MANAGE = "plugin:manage"


async def _require_manage(principal: dict) -> None:
    await require_capability_http(principal["id"], CAP_PLUGIN_MANAGE,
                                  await system_context_id())


@router.get("")
async def list_plugins(principal: dict = Depends(current_user)):
    """Registry (code) joined with the plugin table (lifecycle state)."""
    await _require_manage(principal)
    rows = {r["name"]: r for r in await db.fetch_all(
        "select name, version, enabled, installed_at, updated_at from plugin")}
    out = []
    for name, mod in sorted(plugin_core.registry().items()):
        row = rows.get(name)
        out.append({
            "name": name,
            "code_version": mod.MANIFEST["version"],
            "events": mod.MANIFEST["events"],
            "installed": row is not None,
            "installed_version": row["version"] if row else None,
            "enabled": bool(row and row["enabled"]),
            "pending_migrations": await plugin_core.pending_migrations(name),
        })
    return out


@router.post("/{name}/install")
async def install_plugin(name: str, principal: dict = Depends(current_user)):
    await _require_manage(principal)
    try:
        return await plugin_core.install(name, actor_id=principal["id"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        # Unapplied plugin migrations — actionable message names the CLI.
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/{name}/enable")
async def enable_plugin(name: str, principal: dict = Depends(current_user)):
    await _require_manage(principal)
    try:
        return await plugin_core.set_enabled(name, True,
                                             actor_id=principal["id"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{name}/disable")
async def disable_plugin(name: str, principal: dict = Depends(current_user)):
    await _require_manage(principal)
    try:
        return await plugin_core.set_enabled(name, False,
                                             actor_id=principal["id"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{name}/settings")
async def get_plugin_settings(name: str,
                              principal: dict = Depends(current_user)):
    await _require_manage(principal)
    try:
        return await plugin_core.get_settings(name)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{name}/settings")
async def put_plugin_settings(name: str, body: dict = Body(default=None),
                              principal: dict = Depends(current_user)):
    await _require_manage(principal)
    try:
        return await plugin_core.put_settings(name, body or {},
                                              actor_id=principal["id"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/events")
async def list_events(limit: int = 50,
                      principal: dict = Depends(current_user)):
    """Recent outbox rows — powers the admin outbox panel."""
    await _require_manage(principal)
    return await db.fetch_all(
        "select id, event, payload, status, attempts, last_error, "
        "next_attempt_at, created_at from plugin_event "
        "order by id desc limit $1", min(limit, 200))


@router.post("/dispatch")
async def dispatch(x_dispatch_token: str | None = Header(default=None),
                   x_acting_user: int | None = Header(default=None)):
    """Outbox sweep — the correctness guarantee behind the best-effort
    post-response middleware. Called by pg_cron+pg_net on live Supabase
    (X-Dispatch-Token) or by an admin from the Plugins page."""
    expected = os.environ.get("PLUGIN_DISPATCH_TOKEN")
    if expected and x_dispatch_token == expected:
        return await plugin_core.dispatch_pending(limit=25)
    # No/wrong token: fall back to the capability gate.
    if not x_acting_user:
        raise HTTPException(status_code=401,
                            detail="X-Dispatch-Token or X-Acting-User required")
    principal = await current_user(x_acting_user)
    await _require_manage(principal)
    return await plugin_core.dispatch_pending(limit=25)
