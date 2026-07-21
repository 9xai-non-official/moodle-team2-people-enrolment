"""Roles, capabilities, overrides and assignments API (Khaled / Team 2).

Replaces the 4-hardcoded-role stub. All resolver logic lives in
app.services.permissions; this router is thin HTTP glue. It writes only the
tables Khaled owns (role, role_capability, and manual role_assignment rows with
component=''); enrol_% assignment rows are read-only here and refused with 403.
"""
from typing import Optional

from fastapi import APIRouter, Body, HTTPException, Query

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

router = APIRouter(prefix="/api/roles", tags=["roles"])


# --- static routes first (avoid clashing with /{role_id}/...) --------------
@router.get("/assignable")
async def get_assignable(context_id: int = Query(...), actor_id: int = Query(...)):
    """The hardcoded allow-assign matrix result for this actor at this context.
    Demonstrates "capability necessary, matrix also required" (§9.7 ex.4)."""
    return await permissions.assignable_roles(db, actor_id, context_id)


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
async def create_assignment(body: AssignRoleIn):
    """Manually assign a role at a context (component=''). Server-side enforces
    the role:assign capability + the allow-assign matrix — a 403 otherwise."""
    try:
        return await permissions.assign_role(
            db, body.user_id, body.role_id, body.context_id, actor_id=body.actor_id
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: int):
    """Unassign a MANUAL role. enrol_% rows belong to enrolment flows and are
    refused with a 403 explaining why."""
    row = await db.fetch_one(
        "select id, component from role_assignment where id=$1", assignment_id
    )
    if row is None:
        raise HTTPException(status_code=404, detail="assignment not found")
    if row["component"]:  # non-empty component => created by an enrol_% sync
        raise HTTPException(
            status_code=403,
            detail=f"assignment {assignment_id} was created by '{row['component']}' "
            "(an enrolment sync) — remove it via enrolment, not the roles UI",
        )
    await db.fetch_one(
        "delete from role_assignment where id=$1 returning id", assignment_id
    )
    return {"deleted": True, "assignment_id": assignment_id}


# --- role CRUD -------------------------------------------------------------
@router.get("", response_model=list[RoleOut])
async def list_roles():
    return await db.fetch_all(
        "select id, short_name, name, description, archetype, sort_order "
        "from role order by sort_order"
    )


@router.post("", response_model=RoleOut, status_code=201)
async def create_role(body: RoleCreate):
    # sort_order computed inside the INSERT to avoid a read/insert race on the
    # unique(sort_order) constraint under concurrent role creation.
    row = await db.fetch_one(
        "insert into role (short_name, name, description, archetype, sort_order) "
        "values ($1,$2,$3,$4,(select coalesce(max(sort_order),0)+1 from role)) "
        "returning id, short_name, name, description, archetype, sort_order",
        body.short_name, body.name, body.description, body.archetype,
    )
    return row


@router.post("/{role_id}/clone", response_model=None, status_code=201)
async def clone_role(role_id: int, body: RoleClone):
    """Clone a role, copying its system-context definition (its role_capability
    rows). Deeper overrides are not copied."""
    try:
        return await permissions.clone_role(
            db, role_id, body.short_name, body.name, body.description
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- capability sheet + overrides ------------------------------------------
@router.get("/{role_id}/capabilities", response_model=list[CapabilitySheetRow])
async def role_capabilities(role_id: int, context_id: int = Query(...)):
    """The role's resolved capability sheet at a context (definition + overrides
    marked)."""
    return await permissions.role_capability_sheet(db, role_id, context_id)


@router.put("/{role_id}/capabilities")
async def set_role_capability(role_id: int, body: SetCapability):
    """Set/replace/clear a capability for the role at a context.
    permission=null DELETES the row → back to 'Not set' (inherit)."""
    try:
        return await permissions.set_override(
            db, role_id, body.context_id, body.capability, body.permission
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
