"""Enrolment API — owner: Yaman (task 01 + T2-ENR-001 authz).

Thin HTTP layer: ALL domain logic lives in app/services/enrolment.py.
Routes cover the task-01 §4 contract PLUS the aliases the merged frontend
(PR #4) actually calls (course-scoped enrol, enrolment-row-id PATCH/DELETE,
DELETE /methods/{id}) so neither side 404s. Every refusal carries its "why"
in `detail` — the frontend surfaces reasons verbatim.

T2-ENR-001: every route except guest-preview requires the authenticated
principal (deps.current_user) and mutations pass a capability gate at the
resolved course context (permissions.require_capability via
caps_enrolment.require_capability_http — the service version keeps the
site-admin bypass for fail-closed unseeded capabilities and denies
suspended/deleted actors). The actor is ALWAYS the principal — the old
untrusted `?actor_id=` query params are gone (the published auth contract
has no impersonation, so no override survives).

Status-code precedence: 401 missing/unknown principal (dependency, always
first) → 404 resource resolution (unknown method/row/course context — the
groups.py precedent; ids here are not secrets) → 403 capability (named in
detail) → service refusal codes via _ok. Two deliberate shifts from the
pre-authz contract: POST /self/{id} on a nonexistent course is now 404 (was a
course_visible gate verdict); POST /courses/{id}/enrol answers 403 before the
"no manual method" 404 (the capability is decidable from the course alone).
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app import db
from app.caps_enrolment import (
    CAP_COHORT_ASSIGN, CAP_COHORT_CONFIG, CAP_COHORT_MANAGE, CAP_ENROL_CONFIG,
    CAP_ENROL_MANAGE, CAP_ENROL_MANUAL, CAP_SELF_ENROL, CAP_UNENROL,
    CAP_VIEW_PARTICIPANTS, CAP_VIEW_USER_DETAILS, require_capability_http,
    system_context_id, user_view_context_id,
)
from app.deps import course_context_id, current_user
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
    the reason in `detail` — never swallowed. A refusal may override the
    caller's default code with its own `http_status` (e.g. R-COHORT → 409
    even on a route whose default is 404)."""
    if isinstance(result, dict) and result.get("ok") is False:
        raise HTTPException(status_code=result.get("http_status", status_code),
                            detail=result["reason"])
    return result


# ---- capability gates (T2-ENR-001) -----------------------------------------

async def _gate_course(principal: dict, course_id: int, cap: str) -> None:
    """404 if the course has no context row; 403 naming the capability."""
    ctx = await course_context_id(course_id)
    await require_capability_http(principal["id"], cap, ctx)


async def _method_course_id(method_id: int) -> int:
    row = await db.fetch_one(
        "select course_id from enrolment_method where id = $1", method_id)
    if row is None:
        raise HTTPException(404, f"enrolment method {method_id} not found")
    return row["course_id"]


async def _gate_method(principal: dict, method_id: int, cap: str) -> int:
    """method → course → context → capability. Returns course_id."""
    course_id = await _method_course_id(method_id)
    await _gate_course(principal, course_id, cap)
    return course_id


async def _gate_system(principal: dict, cap: str) -> None:
    """Cohorts are site-level objects (no course context) — gate at system."""
    await require_capability_http(principal["id"], cap, await system_context_id())


# ---- roster (the flagship read) -------------------------------------------

@router.get("/courses/{course_id}/participants",
            response_model=list[ParticipantOut])
async def participants(course_id: int,
                       status: str = Query("active",
                                           pattern="^(active|suspended|all)$"),
                       principal: dict = Depends(current_user)):
    """Participants = users WITH enrolment rows. Account-suspended users stay
    listed with a badge (C-6). Default filter mirrors Moodle: active."""
    await _gate_course(principal, course_id, CAP_VIEW_PARTICIPANTS)
    await svc.touch_last_access(db, principal["id"], course_id)
    return await svc.list_participants(db, course_id, status)


@router.get("/courses/{course_id}/other-users",
            response_model=list[OtherUserOut])
async def other_users(course_id: int, principal: dict = Depends(current_user)):
    """Role-holders with NO enrolment (§8.8) — Khaled creates them."""
    await _gate_course(principal, course_id, CAP_VIEW_PARTICIPANTS)
    return await svc.list_other_users(db, course_id)


# ---- method instances ------------------------------------------------------

@router.get("/courses/{course_id}/methods", response_model=list[MethodOut])
async def methods(course_id: int, principal: dict = Depends(current_user)):
    await _gate_course(principal, course_id, CAP_VIEW_PARTICIPANTS)
    return await svc.list_methods(db, course_id)


@router.post("/courses/{course_id}/methods", status_code=201)
async def create_method(course_id: int, body: MethodCreate,
                        principal: dict = Depends(current_user)):
    await _gate_course(principal, course_id, CAP_ENROL_CONFIG)
    return _ok(await svc.create_method(
        db, course_id, body.method, status=body.status,
        default_role_id=body.default_role_id, cohort_id=body.cohort_id,
        enrol_start=body.enrol_start, enrol_end=body.enrol_end,
        config=body.config), 409)


@router.patch("/methods/{method_id}")
async def patch_method(method_id: int, body: MethodPatch,
                       principal: dict = Depends(current_user)):
    await _gate_method(principal, method_id, CAP_ENROL_CONFIG)
    return _ok(await svc.update_method(
        db, method_id, status=body.status,
        default_role_id=body.default_role_id, enrol_start=body.enrol_start,
        enrol_end=body.enrol_end, config=body.config), 404)


@router.delete("/methods/{method_id}", status_code=204)
async def delete_method(method_id: int,
                        principal: dict = Depends(current_user)):
    """Removes the instance; each enrolment through it goes through the normal
    per-path unenrol (provenance + last-path logic). Frontend HC-1 demo path."""
    await _gate_method(principal, method_id, CAP_ENROL_CONFIG)
    _ok(await svc.delete_method(db, method_id, actor_id=principal["id"]), 404)


@router.get("/methods/{method_id}/enrolments",
            response_model=list[MethodEnrolmentOut])
async def method_enrolments(method_id: int,
                            principal: dict = Depends(current_user)):
    await _gate_method(principal, method_id, CAP_VIEW_PARTICIPANTS)
    return await svc.list_method_enrolments(db, method_id)


# ---- enrol / unenrol / suspend (canonical, method-scoped — task §4) --------

@router.post("/methods/{method_id}/enrolments", status_code=201)
async def enrol(method_id: int, body: EnrolRequest,
                principal: dict = Depends(current_user)):
    await _gate_method(principal, method_id, CAP_ENROL_MANUAL)
    return _ok(await svc.enrol_user(
        db, method_id, body.user_id, role_id=body.role_id,
        time_start=body.time_start, time_end=body.time_end,
        actor_id=principal["id"], activate=body.activate), 409)


@router.delete("/methods/{method_id}/enrolments/{user_id}")
async def unenrol(method_id: int, user_id: int,
                  principal: dict = Depends(current_user)):
    await _gate_method(principal, method_id, CAP_UNENROL)
    return _ok(await svc.unenrol_user(db, method_id, user_id,
                                      actor_id=principal["id"]), 404)


@router.patch("/methods/{method_id}/enrolments/{user_id}")
async def set_status(method_id: int, user_id: int, body: EnrolmentStatusPatch,
                     principal: dict = Depends(current_user)):
    await _gate_method(principal, method_id, CAP_ENROL_MANAGE)
    fn = svc.suspend if body.status == "suspended" else svc.reactivate
    return _ok(await fn(db, method_id, user_id), 404)


# ---- contract aliases (what the merged frontend calls) ----------------------

@router.post("/courses/{course_id}/enrol", status_code=201)
async def enrol_by_course(course_id: int, body: CourseEnrolRequest,
                          principal: dict = Depends(current_user)):
    """Alias: resolve to a method (given method_id, else the course's manual
    instance) then run the canonical enrol."""
    await _gate_course(principal, course_id, CAP_ENROL_MANUAL)
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
        actor_id=principal["id"], activate=body.activate), 409)


async def _resolve_row(enrolment_id: int) -> dict:
    row = await svc.get_enrolment_row(db, enrolment_id)
    if row is None:
        raise HTTPException(404, f"enrolment row {enrolment_id} not found")
    return row


@router.patch("/enrolments/{enrolment_id}")
async def set_status_by_row(enrolment_id: int, body: EnrolmentStatusPatch,
                            principal: dict = Depends(current_user)):
    row = await _resolve_row(enrolment_id)
    await _gate_method(principal, row["method_id"], CAP_ENROL_MANAGE)
    fn = svc.suspend if body.status == "suspended" else svc.reactivate
    return _ok(await fn(db, row["method_id"], row["user_id"]), 404)


@router.delete("/enrolments/{enrolment_id}")
async def unenrol_by_row(enrolment_id: int,
                         principal: dict = Depends(current_user)):
    row = await _resolve_row(enrolment_id)
    await _gate_method(principal, row["method_id"], CAP_UNENROL)
    return _ok(await svc.unenrol_user(db, row["method_id"], row["user_id"],
                                      actor_id=principal["id"]), 404)


# ---- self-enrol, sync, guest ------------------------------------------------

@router.post("/self/{course_id}", response_model=SelfEnrolVerdict,
             response_model_exclude_none=True)
async def self_enrol(course_id: int, body: SelfEnrolRequest,
                     principal: dict = Depends(current_user)):
    """Returns the gate-chain verdict with the failing gate named (§6.6).

    Identity first: self-enrolment is only for yourself — the body's user_id
    must be the principal. Then the capability (fail-closed until seeded)."""
    if body.user_id != principal["id"]:
        raise HTTPException(
            status_code=403,
            detail="self-enrolment is only for yourself (principal ≠ target)")
    await _gate_course(principal, course_id, CAP_SELF_ENROL)
    return await svc.self_enrol(db, course_id, body.user_id, body.key)


@router.post("/methods/{method_id}/sync", response_model=SyncResult)
async def sync(method_id: int, principal: dict = Depends(current_user)):
    """Manual cohort-sync trigger for the demo (§6.8, policy UNENROL)."""
    await _gate_method(principal, method_id, CAP_COHORT_CONFIG)
    return _ok(await svc.sync_cohort_method(db, method_id,
                                            actor_id=principal["id"]), 400)


@router.get("/guest-preview/{course_id}", response_model=GuestPreviewOut,
            response_model_exclude_none=True)
async def guest_preview(course_id: int):
    """Guests never get enrolment rows (§6.7) — only answers if the switch is
    on. Deliberately open: it answers a pre-auth question ("can a guest get
    in?"), so requiring a principal would defeat it."""
    return await svc.guest_access_enabled(db, course_id)


# ---- cohorts ----------------------------------------------------------------

@router.get("/cohorts", response_model=list[CohortOut])
async def cohorts(principal: dict = Depends(current_user)):
    """Principal required, no capability: names + counts are the reference
    data the method-create form needs, and an editingteacher legitimately
    configures cohort methods while holding no system-context role."""
    return await svc.list_cohorts(db)


@router.post("/cohorts", status_code=201)
async def create_cohort(body: CohortCreate,
                        principal: dict = Depends(current_user)):
    await _gate_system(principal, CAP_COHORT_MANAGE)
    return _ok(await svc.create_cohort(db, body.name, body.id_number,
                                       body.description), 409)


@router.post("/cohorts/{cohort_id}/members", status_code=201)
async def add_member(cohort_id: int, body: CohortMemberAdd,
                     principal: dict = Depends(current_user)):
    """Membership change syncs every course method pointing at this cohort."""
    await _gate_system(principal, CAP_COHORT_ASSIGN)
    return _ok(await svc.add_cohort_member(db, cohort_id, body.user_id,
                                           actor_id=principal["id"]), 409)


@router.delete("/cohorts/{cohort_id}/members/{user_id}")
async def remove_member(cohort_id: int, user_id: int,
                        principal: dict = Depends(current_user)):
    await _gate_system(principal, CAP_COHORT_ASSIGN)
    return _ok(await svc.remove_cohort_member(db, cohort_id, user_id,
                                              actor_id=principal["id"]), 404)


# ---- one user across courses (HC-1 drawer) ----------------------------------

@router.get("/users/{user_id}/enrolments", response_model=list[UserPathOut])
async def user_enrolments(user_id: int,
                          principal: dict = Depends(current_user)):
    """Your own paths are yours to see; anyone else's need user:viewdetails
    (same rule as GET /api/users/{id})."""
    if user_id != principal["id"]:
        await require_capability_http(principal["id"], CAP_VIEW_USER_DETAILS,
                                 await user_view_context_id(user_id))
    return await svc.user_enrolments_all(db, user_id)
