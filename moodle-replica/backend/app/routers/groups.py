"""Groups, groupings & group-scope API (Task 05 — Mahmoud).

Replaces the in-memory skeleton. All scope logic lives in app.services.groups;
this router is the thin async HTTP layer over it, and the ONLY place authz is
wired: every mutation requires an authenticated principal (D-AUTH,
`Depends(current_user)`) that holds `group:manage` at the course context
(D-ENFORCE, `require_capability`); scoping reads pass the principal so the
service can filter by group scope + visibility. Prefix and the /access-check
response contract are frozen (Khaled's gate 7 + Team 3 consume them).

main.py already wires `groups.router` — do not touch main.py.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.deps import course_context_id, current_user, require_capability
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

CAP = svc.CAP_MANAGE_GROUPS


async def _gate(principal: dict, course_id: int) -> None:
    """V1 — the manage-groups capability at the course context. 403 on refusal."""
    ctx = await course_context_id(course_id)
    await require_capability(principal["id"], CAP, ctx)


# ---- groups ----
@router.get("")
async def list_groups(course_id: int, principal: dict = Depends(current_user)):
    return await svc.list_course_groups(course_id, caller_id=principal["id"])


@router.post("", status_code=201)
async def create_group(body: GroupCreate, principal: dict = Depends(current_user)):
    await _gate(principal, body.course_id)
    result = await svc.create_group(
        body.course_id, body.name, body.id_number, body.enrolment_key,
        actor_id=principal["id"],
    )
    if not result.get("ok"):
        raise HTTPException(status_code=409, detail=result["reason"])  # V6 idnumber
    return result


@router.delete("/{group_id}")
async def delete_group(group_id: int, principal: dict = Depends(current_user)):
    course_id = await svc._group_course_id(group_id)
    if course_id is None:
        raise HTTPException(status_code=404, detail="unknown group")
    await _gate(principal, course_id)
    # GRP-001: removes the group + its memberships only; users/enrolments untouched.
    return await svc.delete_group(group_id, actor_id=principal["id"])


# ---- members ----
@router.get("/{group_id}/members")
async def list_members(group_id: int, principal: dict = Depends(current_user)):
    return await svc.group_members(group_id, caller_id=principal["id"])


@router.post("/{group_id}/members")
async def add_member(group_id: int, body: MemberAdd, principal: dict = Depends(current_user)):
    course_id = await svc._group_course_id(group_id)
    if course_id is None:
        raise HTTPException(status_code=404, detail="unknown group")
    await _gate(principal, course_id)
    # V3: provenance is server-set; body carries only {user_id}.
    result = await svc.add_member(group_id, body.user_id, actor_id=principal["id"])
    if not result.get("ok"):
        # SA-GRP-004 enrolment-guard refusal, surfaced verbatim
        raise HTTPException(status_code=409, detail=result["reason"])
    return result


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(group_id: int, user_id: int, force: bool = False,
                        principal: dict = Depends(current_user)):
    course_id = await svc._group_course_id(group_id)
    if course_id is None:
        raise HTTPException(status_code=404, detail="unknown group")
    await _gate(principal, course_id)
    # V5: default-allow for a manager; idempotent for a non-member.
    return await svc.remove_member(group_id, user_id, force=force, actor_id=principal["id"])


# ---- groupings (contain groups, never users — GRP-002) ----
@router.get("/groupings")
async def list_groupings(course_id: int):
    return await svc.list_groupings(course_id)


@router.post("/groupings", status_code=201)
async def create_grouping(body: GroupingCreate, principal: dict = Depends(current_user)):
    await _gate(principal, body.course_id)
    return await svc.create_grouping(
        body.course_id, body.name, getattr(body, "description", "") or "",
        actor_id=principal["id"],
    )


@router.post("/groupings/{grouping_id}/groups", status_code=201)
async def assign_group(grouping_id: int, body: GroupingGroupAdd,
                       principal: dict = Depends(current_user)):
    gr = await svc.db.fetch_one("select course_id from grouping where id = $1", grouping_id)
    if gr is None:
        raise HTTPException(status_code=404, detail="unknown grouping")
    await _gate(principal, gr["course_id"])
    result = await svc.assign_group_to_grouping(grouping_id, body.group_id, actor_id=principal["id"])
    if not result.get("ok"):
        raise HTTPException(status_code=409, detail=result["reason"])
    return result


# ---- activity group policy (the two columns this service owns) ----
@router.patch("/activities/{activity_id}")
async def patch_activity_policy(activity_id: int, body: ActivityPolicyPatch,
                                principal: dict = Depends(current_user)):
    pol0 = await svc.activity_policy(activity_id)
    if pol0 is None:
        raise HTTPException(status_code=404, detail="unknown activity")
    await _gate(principal, pol0["course_id"])
    pol = await svc.set_activity_group_policy(activity_id, body.group_mode, body.grouping_id)
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
    result = await svc.allowed_groups(user_id, activity_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/activities/{activity_id}/availability")
async def activity_availability(activity_id: int, user_id: int):
    """T2-GRP-005 — is this activity available to the user, and hidden vs greyed."""
    result = await svc.activity_availability(user_id, activity_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# ---- the centrepiece: scope decision (HC-3 / HC-4) ----
@router.post("/access-check")
async def access_check(body: AccessCheckRequest):
    verdict = await svc.group_access_check(
        body.actor_user_id, body.target_user_id, body.activity_id, body.action
    )
    if "error" in verdict:
        raise HTTPException(status_code=404, detail=verdict["error"])
    return verdict
