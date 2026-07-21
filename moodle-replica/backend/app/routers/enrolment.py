"""Enrolment API — owner: Yaman (task 01).

Thin HTTP layer: ALL domain logic lives in app/services/enrolment.py.
Routes cover the task-01 §4 contract PLUS the aliases the merged frontend
(PR #4) actually calls (course-scoped enrol, enrolment-row-id PATCH/DELETE,
DELETE /methods/{id}) so neither side 404s. Every refusal carries its "why"
in `detail` — the frontend surfaces reasons verbatim.
"""
from fastapi import APIRouter, HTTPException, Query

from app import db
from app.services import enrolment as svc
from app.schemas_enrolment import (
    CohortCreate, CohortMemberAdd, CohortOut, CourseEnrolRequest, EnrolRequest,
    EnrolmentStatusPatch, GuestPreviewOut, MethodCreate, MethodEnrolmentOut,
    MethodOut, MethodPatch, OtherUserOut, ParticipantOut, SelfEnrolRequest,
    SelfEnrolVerdict, SyncResult, UserPathOut,
)

router = APIRouter(prefix="/api/enrolment", tags=["enrolment"])


def _ok(result: dict, status_code: int = 400) -> dict:
    """Service refusals ({'ok': False, 'reason': …}) become HTTP errors with
    the reason in `detail` — never swallowed."""
    if isinstance(result, dict) and result.get("ok") is False:
        raise HTTPException(status_code=status_code, detail=result["reason"])
    return result


# ---- roster (the flagship read) -------------------------------------------

@router.get("/courses/{course_id}/participants",
            response_model=list[ParticipantOut])
async def participants(course_id: int,
                       status: str = Query("active",
                                           pattern="^(active|suspended|all)$"),
                       actor_id: int | None = None):
    """Participants = users WITH enrolment rows. Account-suspended users stay
    listed with a badge (C-6). Default filter mirrors Moodle: active."""
    if actor_id:
        await svc.touch_last_access(db, actor_id, course_id)
    return await svc.list_participants(db, course_id, status)


@router.get("/courses/{course_id}/other-users",
            response_model=list[OtherUserOut])
async def other_users(course_id: int):
    """Role-holders with NO enrolment (§8.8) — Khaled creates them."""
    return await svc.list_other_users(db, course_id)


# ---- method instances ------------------------------------------------------

@router.get("/courses/{course_id}/methods", response_model=list[MethodOut])
async def methods(course_id: int):
    return await svc.list_methods(db, course_id)


@router.post("/courses/{course_id}/methods", status_code=201)
async def create_method(course_id: int, body: MethodCreate):
    return _ok(await svc.create_method(
        db, course_id, body.method, status=body.status,
        default_role_id=body.default_role_id, cohort_id=body.cohort_id,
        enrol_start=body.enrol_start, enrol_end=body.enrol_end,
        config=body.config), 409)


@router.patch("/methods/{method_id}")
async def patch_method(method_id: int, body: MethodPatch):
    return _ok(await svc.update_method(
        db, method_id, status=body.status,
        default_role_id=body.default_role_id, enrol_start=body.enrol_start,
        enrol_end=body.enrol_end, config=body.config), 404)


@router.delete("/methods/{method_id}", status_code=204)
async def delete_method(method_id: int, actor_id: int | None = None):
    """Removes the instance; each enrolment through it goes through the normal
    per-path unenrol (provenance + last-path logic). Frontend HC-1 demo path."""
    _ok(await svc.delete_method(db, method_id, actor_id=actor_id), 404)


@router.get("/methods/{method_id}/enrolments",
            response_model=list[MethodEnrolmentOut])
async def method_enrolments(method_id: int):
    return await svc.list_method_enrolments(db, method_id)


# ---- enrol / unenrol / suspend (canonical, method-scoped — task §4) --------

@router.post("/methods/{method_id}/enrolments", status_code=201)
async def enrol(method_id: int, body: EnrolRequest,
                actor_id: int | None = None):
    return _ok(await svc.enrol_user(
        db, method_id, body.user_id, role_id=body.role_id,
        time_start=body.time_start, time_end=body.time_end,
        actor_id=actor_id), 409)


@router.delete("/methods/{method_id}/enrolments/{user_id}")
async def unenrol(method_id: int, user_id: int, actor_id: int | None = None):
    return _ok(await svc.unenrol_user(db, method_id, user_id,
                                      actor_id=actor_id), 404)


@router.patch("/methods/{method_id}/enrolments/{user_id}")
async def set_status(method_id: int, user_id: int, body: EnrolmentStatusPatch):
    fn = svc.suspend if body.status == "suspended" else svc.reactivate
    return _ok(await fn(db, method_id, user_id), 404)


# ---- contract aliases (what the merged frontend calls) ----------------------

@router.post("/courses/{course_id}/enrol", status_code=201)
async def enrol_by_course(course_id: int, body: CourseEnrolRequest,
                          actor_id: int | None = None):
    """Alias: resolve to a method (given method_id, else the course's manual
    instance) then run the canonical enrol."""
    method_id = body.method_id
    if method_id is None:
        row = await db.fetch_one(
            "select id from enrolment_method "
            "where course_id = $1 and method = 'manual' "
            "order by (status = 'enabled') desc, id limit 1", course_id)
        if row is None:
            raise HTTPException(404, "course has no manual enrolment method")
        method_id = row["id"]
    return _ok(await svc.enrol_user(
        db, method_id, body.user_id, role_id=body.role_id,
        time_start=body.time_start, time_end=body.time_end,
        actor_id=actor_id), 409)


async def _resolve_row(enrolment_id: int) -> dict:
    row = await svc.get_enrolment_row(db, enrolment_id)
    if row is None:
        raise HTTPException(404, f"enrolment row {enrolment_id} not found")
    return row


@router.patch("/enrolments/{enrolment_id}")
async def set_status_by_row(enrolment_id: int, body: EnrolmentStatusPatch):
    row = await _resolve_row(enrolment_id)
    fn = svc.suspend if body.status == "suspended" else svc.reactivate
    return _ok(await fn(db, row["method_id"], row["user_id"]), 404)


@router.delete("/enrolments/{enrolment_id}")
async def unenrol_by_row(enrolment_id: int, actor_id: int | None = None):
    row = await _resolve_row(enrolment_id)
    return _ok(await svc.unenrol_user(db, row["method_id"], row["user_id"],
                                      actor_id=actor_id), 404)


# ---- self-enrol, sync, guest ------------------------------------------------

@router.post("/self/{course_id}", response_model=SelfEnrolVerdict,
             response_model_exclude_none=True)
async def self_enrol(course_id: int, body: SelfEnrolRequest):
    """Returns the gate-chain verdict with the failing gate named (§6.6)."""
    return await svc.self_enrol(db, course_id, body.user_id, body.key)


@router.post("/methods/{method_id}/sync", response_model=SyncResult)
async def sync(method_id: int, actor_id: int | None = None):
    """Manual cohort-sync trigger for the demo (§6.8, policy UNENROL)."""
    return _ok(await svc.sync_cohort_method(db, method_id,
                                            actor_id=actor_id), 400)


@router.get("/guest-preview/{course_id}", response_model=GuestPreviewOut,
            response_model_exclude_none=True)
async def guest_preview(course_id: int):
    """Guests never get enrolment rows (§6.7) — only answers if the switch is on."""
    return await svc.guest_access_enabled(db, course_id)


# ---- cohorts ----------------------------------------------------------------

@router.get("/cohorts", response_model=list[CohortOut])
async def cohorts():
    return await svc.list_cohorts(db)


@router.post("/cohorts", status_code=201)
async def create_cohort(body: CohortCreate):
    return _ok(await svc.create_cohort(db, body.name, body.id_number,
                                       body.description), 409)


@router.post("/cohorts/{cohort_id}/members", status_code=201)
async def add_member(cohort_id: int, body: CohortMemberAdd,
                     actor_id: int | None = None):
    """Membership change syncs every course method pointing at this cohort."""
    return _ok(await svc.add_cohort_member(db, cohort_id, body.user_id,
                                           actor_id=actor_id), 409)


@router.delete("/cohorts/{cohort_id}/members/{user_id}")
async def remove_member(cohort_id: int, user_id: int,
                        actor_id: int | None = None):
    return _ok(await svc.remove_cohort_member(db, cohort_id, user_id,
                                              actor_id=actor_id), 404)


# ---- one user across courses (HC-1 drawer) ----------------------------------

@router.get("/users/{user_id}/enrolments", response_model=list[UserPathOut])
async def user_enrolments(user_id: int):
    return await svc.user_enrolments_all(db, user_id)
