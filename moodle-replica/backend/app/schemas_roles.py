"""Pydantic models for the roles + permissions API (Khaled / Team 2).

Kept separate from app/schemas.py (which is shared and frozen) so this module
owns only its own request/response shapes. The /api/permissions/check response
mirrors the cross-team contract frozen with Teams 1 & 3 (§17.3).
"""
from typing import Any, Literal, Optional

from pydantic import BaseModel

Permission = Literal["allow", "prevent", "prohibit"]


# --- roles -----------------------------------------------------------------
class RoleOut(BaseModel):
    id: int
    short_name: str
    name: str
    description: str = ""
    archetype: Optional[str] = None
    sort_order: int


class RoleCreate(BaseModel):
    short_name: str
    name: str
    description: str = ""
    archetype: Optional[str] = None


class RoleClone(BaseModel):
    short_name: str
    name: str
    description: str = ""


# --- capability sheet / overrides ------------------------------------------
class CapabilitySheetRow(BaseModel):
    capability: str
    cap_type: str
    risks: list[str] = []
    permission: Optional[Permission] = None  # None = "not set" (inherit)
    is_override: bool = False
    decided_at: Optional[str] = None


class SetCapability(BaseModel):
    context_id: int
    capability: str
    # None DELETES the row (back to "not set") — never leaves a stale deny.
    permission: Optional[Permission] = None


# --- assignments -----------------------------------------------------------
class AssignRoleIn(BaseModel):
    user_id: int
    role_id: int
    context_id: int
    actor_id: int


# --- permission check (the centrepiece) ------------------------------------
class CheckRequest(BaseModel):
    actor_user_id: int
    capability: str
    context_id: int
    target_user_id: Optional[int] = None
    activity_id: Optional[int] = None
    simulate_role_id: Optional[int] = None
    action: Optional[str] = None


class CheckResponse(BaseModel):
    allowed: bool
    decision: str
    blocking_reasons: list[str]
    supporting_reasons: list[str]
    enrolment_paths: list[Any]
    roles_considered: list[Any]
    contexts_considered: list[str]
    capability_values: dict[str, Any]
    prohibits_found: list[Any]
    group_scope: dict[str, Any]
    admin_bypass: bool
    simulated_role: Optional[str]
