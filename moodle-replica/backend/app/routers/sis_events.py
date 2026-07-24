"""SIS ingest endpoint — owner: Mahmoud (T2-SIS-001).

POST /api/sis/events is the single door through which the student portal's
desired state enters WhoCan (contract §9a). It is deliberately NOT a general
API: only a site admin (the SIS service identity) may call it, every apply is
idempotent, and everything it does runs through Yaman's enrolment service so
the rest of the system cannot tell an SIS enrolment from any other — except by
its method kind, which is the point.
"""
from fastapi import APIRouter, Depends, HTTPException

from app import db
from app.deps import current_user
from app.schemas_sis import SisEvent
from app.services import sis_ingest
from app.services.permissions import ADMIN_USERNAMES, _admin_ids_from_env

router = APIRouter(prefix="/api/sis", tags=["sis"])


def _require_site_admin(principal: dict) -> None:
    """The engine's own definition of site admin (config list, like Moodle's
    $CFG->siteadmins — permissions.py:391-417). Capability gates would also
    admin-bypass, but ingest creates USERS before any course context exists to
    check against, so the gate is the admin list itself."""
    if principal["id"] in _admin_ids_from_env():
        return
    if principal["username"] in ADMIN_USERNAMES:
        return
    raise HTTPException(
        status_code=403,
        detail="SIS ingest is restricted to the site-admin service identity")


@router.post("/events")
async def ingest(event: SisEvent, principal: dict = Depends(current_user)):
    """Apply one SIS event (enrol / drop / account). Idempotent — replaying
    the same event converges to the same state, so at-least-once delivery
    from the portal's outbox is safe."""
    _require_site_admin(principal)
    result = await sis_ingest.apply_event(db, event, actor_id=principal["id"])
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("reason"))
    return result


@router.get("/status")
async def status(principal: dict = Depends(current_user)):
    """What the portal manages here: sis-method courses with their live counts.
    Read-only; any authenticated principal may look."""
    rows = await db.fetch_all(
        """
        select c.id as course_id, c.short_name, c.external_ref,
               m.id as method_id, m.status as method_status,
               (select count(*)::int from enrolment e where e.method_id = m.id)
                   as enrolled,
               (select count(*)::int from enrolment e
                 where e.method_id = m.id and e.status = 'active') as active
          from enrolment_method m
          join course c on c.id = m.course_id and c.deleted_at is null
         where m.method = 'sis'
         order by c.id
        """)
    return {"sis_courses": rows}
