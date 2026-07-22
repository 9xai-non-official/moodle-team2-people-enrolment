"""Pydantic models for the groups/groupings/scope API (Task 05 — Mahmoud).

Kept in a separate module (not app/schemas.py, which is Issa's) per the task's
file-ownership rules.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ---- requests ----
class GroupCreate(BaseModel):
    course_id: int
    name: str
    id_number: str | None = None
    enrolment_key: str | None = None


class MemberAdd(BaseModel):
    """V3 (T2-GRP-003) — the client sends ONLY the user id. Provenance
    (`component`/`item_id`) is server-set for manual adds; a client that still
    posts those fields is rejected (`extra='forbid'`) so forged provenance can
    never reach the DB via HTTP. Only Yaman's enrolment code writes enrol_*
    rows, under the D-GM contract."""
    model_config = ConfigDict(extra="forbid")
    user_id: int


class GroupingCreate(BaseModel):
    course_id: int
    name: str
    description: str = ""


class GroupingGroupAdd(BaseModel):
    group_id: int


class ActivityPolicyPatch(BaseModel):
    # NULL is meaningful (inherit course); use the sentinel default to mean "unchanged".
    group_mode: str | None = Field(default="__keep__")
    grouping_id: int | None = Field(default="__keep__")


class AccessCheckRequest(BaseModel):
    actor_user_id: int
    target_user_id: int
    activity_id: int
    action: str = "grade"


# ---- responses ----
class AccessCheckResponse(BaseModel):
    """Frozen contract — consumed by Khaled's gate 7 and Team 3. Do not rename fields."""
    visible: bool
    action_allowed: bool
    group_mode: str
    course_mode_forced: bool
    access_all_groups: bool
    actor_groups: list[str]
    target_groups: list[str]
    action: str
    reasons: list[str]


class ActivityPolicy(BaseModel):
    activity_id: int
    course_id: int
    configured_mode: str | None
    effective_mode: str
    course_mode_forced: bool
    grouping: dict | None = None
