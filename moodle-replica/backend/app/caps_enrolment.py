"""Capability names + context resolvers for the enrolment/people authz wiring
(T2-ENR-001, owner Yaman).

Names use the canonical short form the seed established (component:action —
M02, confirmed by D-CAPNAME: permissions.py:155 keeps the same convention).
Capabilities marked (unseeded) are referenced by their real Moodle-derived
short name and fail CLOSED via has_capability until Essa merges the seed
migration drafted in docs/T2-ENR-001-capability-seed.draft.sql; the site-admin
config-list bypass in the permission engine still works meanwhile. This is the
same posture permissions.py takes for CAP_ROLE_MANAGE.
"""
from fastapi import HTTPException

from app import db
from app.services import permissions

# Seeded in M02.
CAP_VIEW_PARTICIPANTS = "course:viewparticipants"
CAP_ENROL_MANUAL = "enrol:manual"
CAP_UNENROL = "enrol:unenrol"
CAP_VIEW_USER_DETAILS = "user:viewdetails"

# Unseeded — fail closed until the T2-ENR-001 seed lands.
CAP_ENROL_CONFIG = "course:enrolconfig"  # create/patch/delete method instances
CAP_ENROL_MANAGE = "enrol:manage"        # suspend/reactivate (Moodle enrol/manual:manage)
CAP_SELF_ENROL = "enrol:selfenrol"       # Moodle enrol/self:enrolself
CAP_COHORT_CONFIG = "cohort:config"      # trigger cohort sync (Moodle enrol/cohort:config)
CAP_COHORT_MANAGE = "cohort:manage"      # create cohorts (site-level, moodle/cohort:manage)
CAP_COHORT_ASSIGN = "cohort:assign"      # cohort membership (moodle/cohort:assign)


async def require_capability_http(actor_id: int, capability: str,
                                  context_id: int) -> None:
    """Khaled's service-layer require_capability (permissions.py:762 — "the
    ONE mechanism every write path uses") mapped to HTTP 403, the roles.py
    precedent. Chosen over deps.require_capability deliberately: the service
    version denies suspended/deleted actors and keeps the site-admin bypass
    even for capabilities the seed does not know yet (has_capability alone
    returns False on an unknown name BEFORE its admin check, which would lock
    admins out of the fail-closed routes until the seed lands)."""
    try:
        await permissions.require_capability(db, actor_id, capability,
                                             context_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


async def system_context_id() -> int:
    """Cohorts are site-level objects — their gates run at the system context.
    Resolved by query (never hardcoded): the row is a seed invariant (M02)."""
    row = await db.fetch_one("select id from context where level = 'system'")
    if row is None:
        raise HTTPException(status_code=500,
                            detail="system context missing (seed M02 invariant)")
    return row["id"]


async def user_view_context_id(user_id: int) -> int:
    """user:viewdetails has min_context_level 'user', but user-level context
    rows are not seeded for every account — fall back to the system context so
    the check stays fail-closed rather than erroring."""
    row = await db.fetch_one(
        "select id from context where level = 'user' and instance_id = $1",
        user_id)
    return row["id"] if row else await system_context_id()
