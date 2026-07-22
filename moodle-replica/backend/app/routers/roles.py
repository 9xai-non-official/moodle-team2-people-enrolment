"""Roles, capabilities, overrides and assignments API (Khaled / Team 2).

Replaces the 4-hardcoded-role stub. All resolver logic lives in
app.services.permissions; this router is thin HTTP glue. It writes only the
tables Khaled owns (role, role_capability, and manual role_assignment rows with
component=''); enrol_% assignment rows are read-only here and refused with 403.

Identity: every MUTATING route (and /assignable, which is actor-relative) takes
the acting principal from a VERIFIED credential (Depends(get_current_user)) — never
from a request body/query field. Authorization is enforced server-side in the
service layer (require_capability): a missing capability → 403 with no write.
Pure role-definition READS (list roles, a role's capability sheet, a user's
assignments) stay open — they are configuration, like Moodle's role list.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app import db
from app.schemas_roles import (
    AssignRoleIn,
    CapabilitySheetRow,
    RoleClone,
    RoleCreate,
    RoleOut,
    SetCapability,
)
from app.services import permissions
from app.services.auth import Principal, get_current_user

router = APIRouter(prefix="/api/roles", tags=["roles"])


# --- static routes first (avoid clashing with /{role_id}/...) --------------
@router.get("/capabilities")
async def list_capabilities():
    """The capability catalogue (config read). Feeds the Permission Checker's
    capability picker — CR-5, previously only served by the frontend mock."""
    return await db.fetch_all(
        "select name, cap_type, min_context_level, component, risks "
        "from capability order by name"
    )


@router.get("/contexts")
async def list_contexts():
    """The context tree (config read). label = 'level:instance_id'. Feeds context
    pickers — CR-5, previously only served by the frontend mock."""
    rows = await db.fetch_all(
        "select id, level, instance_id, path, depth from context order by path"
    )
    return [
        {
            "id": r["id"],
            "level": r["level"],
            "instance_id": r["instance_id"],
            "path": r["path"],
            "depth": r["depth"],
            "label": f"{r['level']}:{r['instance_id']}",
        }
        for r in rows
    ]


@router.get("/assignable")
async def get_assignable(
    context_id: int = Query(...),
    principal: Principal = Depends(get_current_user),
):
    """The allow-assign matrix result for the AUTHENTICATED actor at this context.
    Demonstrates "capability necessary, matrix also required" (§9.7 ex.4)."""
    return await permissions.assignable_roles(db, principal.user_id, context_id)


@router.get("/assignments")
async def list_assignments(context_id: int = Query(...)):
    """Assignments in one context (config/roster read). Feeds the Assignments
    tab — CR-5, previously served only by the frontend mock."""
    rows = await db.fetch_all(
        "select ra.id, ra.component, ra.item_id, "
        "u.id as user_id, (u.first_name || ' ' || u.last_name) as full_name, "
        "r.id as role_id, r.short_name, "
        "c.id as ctx_id, c.level, c.instance_id "
        "from role_assignment ra "
        "join app_user u on u.id = ra.user_id "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.context_id = $1 order by r.sort_order",
        context_id,
    )
    return [
        {
            "assignment_id": r["id"],
            "user": {"id": r["user_id"], "full_name": r["full_name"]},
            "role": {"id": r["role_id"], "short_name": r["short_name"]},
            "context": {"id": r["ctx_id"], "label": f"{r['level']}:{r['instance_id']}"},
            "component": r["component"],
            "item_id": r["item_id"],
        }
        for r in rows
    ]


@router.get("/users/{user_id}/assignments")
async def user_assignments(user_id: int):
    """Every role the user holds, with the context path and provenance (who
    created the assignment: manual, or an enrol_% sync)."""
    rows = await db.fetch_all(
        "select ra.id, ra.role_id, r.short_name as role, ra.context_id, "
        "c.level, c.instance_id, c.path, ra.component, ra.item_id, ra.assigned_at "
        "from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id=$1 order by c.depth, r.sort_order",
        user_id,
    )
    return [
        {
            "assignment_id": r["id"],
            "role_id": r["role_id"],
            "role": r["role"],
            "context": f"{r['level']}:{r['instance_id']}",
            "context_id": r["context_id"],
            "context_path": r["path"],
            "provenance": r["component"] or "manual",
            "item_id": r["item_id"],
            "assigned_at": r["assigned_at"].isoformat() if r["assigned_at"] else None,
        }
        for r in rows
    ]


@router.post("/assignments")
async def create_assignment(
    body: AssignRoleIn,
    principal: Principal = Depends(get_current_user),
):
    """Manually assign a role at a context (component=''). The actor is the
    authenticated principal; the service enforces role:assign + the allow-assign
    matrix — a 403 otherwise."""
    try:
        return await permissions.assign_role(
            db, body.user_id, body.role_id, body.context_id, actor_id=principal.user_id
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    principal: Principal = Depends(get_current_user),
):
    """Unassign a MANUAL role. Requires role:assign at the assignment's context;
    enrol_% rows belong to enrolment flows and are refused with a 403."""
    try:
        return await permissions.unassign_role(db, assignment_id, actor_id=principal.user_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- role CRUD -------------------------------------------------------------
@router.get("", response_model=list[RoleOut])
async def list_roles():
    return await db.fetch_all(
        "select id, short_name, name, description, archetype, sort_order "
        "from role order by sort_order"
    )


@router.post("", response_model=RoleOut, status_code=201)
async def create_role(
    body: RoleCreate,
    principal: Principal = Depends(get_current_user),
):
    """Create a role definition. Requires role:manage at system (admin bypasses)."""
    try:
        return await permissions.create_role(
            db, body.short_name, body.name, body.description, body.archetype,
            actor_id=principal.user_id,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/{role_id}/clone", response_model=None, status_code=201)
async def clone_role(
    role_id: int,
    body: RoleClone,
    principal: Principal = Depends(get_current_user),
):
    """Clone a role, copying its system-context definition (its role_capability
    rows). Deeper overrides are not copied. Requires role:manage (admin bypasses)."""
    try:
        return await permissions.clone_role(
            db, role_id, body.short_name, body.name, body.description,
            actor_id=principal.user_id,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- capability sheet + overrides ------------------------------------------
@router.get("/{role_id}/capabilities", response_model=list[CapabilitySheetRow])
async def role_capabilities(role_id: int, context_id: int = Query(...)):
    """The role's resolved capability sheet at a context (definition + overrides
    marked)."""
    return await permissions.role_capability_sheet(db, role_id, context_id)


@router.put("/{role_id}/capabilities")
async def set_role_capability(
    role_id: int,
    body: SetCapability,
    principal: Principal = Depends(get_current_user),
):
    """Set/replace/clear a capability for the role at a context. Requires
    role:override at that context (admin bypasses). permission=null DELETES the
    row → back to 'Not set' (inherit). An unknown capability → 400."""
    try:
        return await permissions.set_override(
            db, role_id, body.context_id, body.capability, body.permission,
            actor_id=principal.user_id,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
