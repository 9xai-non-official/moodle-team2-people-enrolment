"""Groups, groupings & group-scope API (Task 05 — Mahmoud).

Replaces the in-memory skeleton. All scope logic lives in app.services.groups;
this router is a thin async HTTP layer over it. Prefix and the /access-check
response contract are frozen (Khaled's gate 7 + Team 3 consume them).

main.py already wires `groups.router` — do not touch main.py.
"""
from fastapi import APIRouter, HTTPException

from app.services import groups as svc
from app.schemas_groups import (
    AccessCheckRequest,
    ActivityPolicyPatch,
    GroupCreate,
    GroupingCreate,
    GroupingGroupAdd,
    MemberAdd,
)

router = APIRouter(prefix="/api/groups", tags=["groups"])


# ---- groups ----
@router.get("")
async def list_groups(course_id: int):
    return await svc.list_course_groups(course_id)


@router.post("", status_code=201)
async def create_group(body: GroupCreate):
    return await svc.create_group(
        body.course_id, body.name, body.id_number, body.enrolment_key
    )


@router.delete("/{group_id}")
async def delete_group(group_id: int):
    # GRP-001: removes the group + its memberships only; users/enrolments untouched.
    return await svc.delete_group(group_id)


# ---- members ----
@router.get("/{group_id}/members")
async def list_members(group_id: int):
    return await svc.group_members(group_id)


@router.post("/{group_id}/members")
async def add_member(group_id: int, body: MemberAdd):
    result = await svc.add_member(group_id, body.user_id, body.component, body.item_id)
    if not result.get("ok"):
        # the enrolment-guard refusal is surfaced verbatim (SA-GRP-004)
        raise HTTPException(status_code=409, detail=result["reason"])
    return result


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(group_id: int, user_id: int, force: bool = False):
    result = await svc.remove_member(group_id, user_id, force=force)
    if not result.get("ok"):
        # component-owned removal without force -> 409 with the reason (SA-GRP-006)
        raise HTTPException(status_code=409, detail=result["reason"])
    return result


# ---- groupings (contain groups, never users — GRP-002) ----
@router.get("/groupings")
async def list_groupings(course_id: int):
    return await svc.list_groupings(course_id)


# ---- activity group policy (the two columns this service owns) ----
@router.patch("/activities/{activity_id}")
async def patch_activity_policy(activity_id: int, body: ActivityPolicyPatch):
    pol = await svc.set_activity_group_policy(activity_id, body.group_mode, body.grouping_id)
    if pol is None:
        raise HTTPException(status_code=404, detail="unknown activity")
    return pol


@router.get("/activities/{activity_id}/policy")
async def activity_policy(activity_id: int):
    # GRP-012 as an endpoint: {configured_mode, effective_mode, course_mode_forced, grouping}
    pol = await svc.activity_policy(activity_id)
    if pol is None:
        raise HTTPException(status_code=404, detail="unknown activity")
    return pol


@router.get("/activities/{activity_id}/allowed")
async def activity_allowed_groups(activity_id: int, user_id: int):
    return await svc.allowed_groups(user_id, activity_id)


# ---- the centrepiece: scope decision (HC-3 / HC-4) ----
@router.post("/access-check")
async def access_check(body: AccessCheckRequest):
    verdict = await svc.group_access_check(
        body.actor_user_id, body.target_user_id, body.activity_id, body.action
    )
    if "error" in verdict:
        raise HTTPException(status_code=404, detail=verdict["error"])
    return verdict
