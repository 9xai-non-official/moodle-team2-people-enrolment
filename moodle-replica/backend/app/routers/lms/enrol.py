"""LMS enrolment sub-router (/api/lms) — course-scoped enrol/unenrol + roster
role removal + the student course view, matching what the staging frontend
(CatalogPage, TeachingPage, components/enrolment) already calls.

Contract source of truth: the frontend mock reference implementation
frontend/src/mocks/lms.js and its self-check frontend/src/mocks/lms.selfcheck.mjs.
Every route reproduces that behaviour against the real DB, delegating all
enrolment writes to app.services.enrolment (never touching enrolment rows
directly) and all authorization to the seeded capability engine.

IDENTITY (X-Acting-User): the ACTOR is always principal["id"] (Depends
current_user, 401 on missing/unknown/deleted). The legacy `actor_id` / `user_id`
sent in bodies and queries is IGNORED for identity; `user_id` is honoured only
where it names a SUBJECT to look up (the student's own catalog/completion view,
and the target of a staff enrol/role-removal).

Gating: staff mutations gate on the seeded course-context capabilities
(enrol:manual, enrol:unenrol, role:assign) — which resolve to allow for
editingteacher + manager, deny for non-editing teacher + student, with the
site-admin bypass — exactly the mock's "editing teacher or admin" rule.
Self-service routes (self-enrol, unenrol-self) gate on identity (the principal
must be the subject) plus the enrolment service's own gate chain, never on the
still-unseeded enrol:selfenrol capability (which would lock out every student).
"""
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app import db
from app.deps import course_context_id, current_user, require_capability
from app.services import enrolment as enrol_svc
from app.services import permissions

router = APIRouter()

# Capability names as seeded (M02, component:action short form). All four are in
# the live seed for manager + editingteacher, so require_capability resolves
# them normally with the admin bypass intact.
CAP_ENROL_MANUAL = "enrol:manual"          # staff manual enrol (editing-teacher power)
CAP_UNENROL = "enrol:unenrol"              # remove an enrolment path
CAP_ROLE_ASSIGN = "role:assign"            # add/remove a course role
CAP_VIEW_PARTICIPANTS = "course:viewparticipants"

# Roles a teacher may hand out (below their own): non-editing teacher, student.
# Anything above (manager, editing teacher) is admin-only — mirrors the mock and
# the permissions ALLOW_ASSIGN matrix (editingteacher → [teacher, student]).
_TEACHER_GRANTABLE_ROLE_IDS = (3, 4)


# ---------------------------------------------------------------------------
# Small local helpers
# ---------------------------------------------------------------------------
async def _is_admin(pid: int) -> bool:
    """Privileged iff holding the 'manager' role at the system context OR a
    site-admin username. A CONFIG identity, not a course role."""
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 and r.short_name = 'manager' "
        "and c.level = 'system' limit 1",
        pid,
    )
    if row is not None:
        return True
    u = await db.fetch_one("select username from app_user where id = $1", pid)
    return bool(u and u["username"] in ("admin", "admin1"))


async def _is_course_staff(pid: int, course_id: int) -> bool:
    """Teacher/manager here (or site admin) — decides who sees hidden activities
    and the grading queue. Non-editing teachers count as staff for viewing."""
    if await _is_admin(pid):
        return True
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 "
        "and r.short_name in ('editingteacher', 'teacher', 'manager') "
        "and ((c.level = 'course' and c.instance_id = $2) or c.level = 'system') "
        "limit 1",
        pid, course_id,
    )
    return row is not None


def _svc_ok(result: dict, status_code: int = 400) -> dict:
    """A service refusal ({'ok': False, 'reason': ...}) becomes an HTTPException
    with the reason verbatim in `detail`; a refusal may override the status via
    its own `http_status` (e.g. R-COHORT → 409)."""
    if isinstance(result, dict) and result.get("ok") is False:
        raise HTTPException(status_code=result.get("http_status", status_code),
                            detail=result.get("reason", "operation failed"))
    return result


async def _course_or_404(course_id: int) -> dict:
    row = await db.fetch_one(
        "select id, short_name, full_name from course "
        "where id = $1 and deleted_at is null",
        course_id,
    )
    if row is None:
        raise HTTPException(404, f"course {course_id} not found")
    return row


async def _enrolment_or_404(enrolment_id: int) -> dict:
    """Resolve one enrolment path from the liveness view (carries course + the
    four §6.2 conditions folded into `live`)."""
    row = await db.fetch_one(
        "select enrolment_id, user_id, course_id, method_id, method, "
        "enrolment_status as status, method_status, time_start, time_end, live "
        "from v_enrolment_detail where enrolment_id = $1",
        enrolment_id,
    )
    if row is None:
        raise HTTPException(404, f"enrolment {enrolment_id} not found")
    return row


# ---------------------------------------------------------------------------
# GET /courses/{course_id}/activities — the course view (student + staff)
# ---------------------------------------------------------------------------
@router.get("/courses/{course_id}/activities")
async def course_activities(course_id: int,
                            user_id: int | None = Query(default=None),
                            principal: dict = Depends(current_user)):
    """Activities of a course. Hidden activities vanish for students and are
    shown to staff (editing/non-editing teacher, manager, admin) — the viewer is
    the principal. When `user_id` names a subject, each activity carries that
    subject's `completion` state (from activity_completion); `completion` is null
    where nothing is tracked. Submission/quiz rollups (`mine`, `queue`) belong to
    the assign/quiz grading modules and are intentionally not synthesised here."""
    await _course_or_404(course_id)
    staff = await _is_course_staff(principal["id"], course_id)

    rows = await db.fetch_all(
        "select id, course_id, external_ref, name, activity_type, "
        "group_mode::text as group_mode, grouping_id, visible, "
        "completion_enabled "
        "from course_activity "
        "where course_id = $1 and deleted_at is null "
        + ("" if staff else "and visible = true ") +
        "order by id",
        course_id,
    )

    subject = user_id if user_id is not None else principal["id"]
    completion_by_activity: dict[int, dict] = {}
    if rows and subject is not None:
        act_ids = [r["id"] for r in rows]
        comps = await db.fetch_all(
            "select activity_id, state::text as state, viewed_at "
            "from activity_completion "
            "where user_id = $1 and activity_id = any($2::bigint[])",
            subject, act_ids,
        )
        completion_by_activity = {
            c["activity_id"]: {
                "state": c["state"],
                "viewed_at": c["viewed_at"],
                "completed": c["state"] != "incomplete",
            }
            for c in comps
        }

    for r in rows:
        r["completion"] = completion_by_activity.get(r["id"])
    return rows


# ---------------------------------------------------------------------------
# POST /courses/{course_id}/enrol — staff manual enrol
# ---------------------------------------------------------------------------
@router.post("/courses/{course_id}/enrol", status_code=201)
async def enrol_user(course_id: int,
                     body: dict = Body(default=None),
                     principal: dict = Depends(current_user)):
    """Manual enrolment from the roster (Moodle Participants → "Enrol users").
    enrol/manual:enrol is an editing-teacher power; non-editing teachers are
    refused. Finds the course's enabled manual method, then delegates the write
    to enrol_svc.enrol_user (the enrolment row + its provenance role row)."""
    body = body or {}
    await _course_or_404(course_id)
    ctx = await course_context_id(course_id)
    # 403 before the user/method 404s — the capability is decidable from the
    # course alone (the enrolment router precedent).
    await require_capability(principal["id"], CAP_ENROL_MANUAL, ctx)

    user_id = body.get("user_id")
    if user_id is None:
        raise HTTPException(400, "user_id is required")
    target = await db.fetch_one(
        "select id, first_name || ' ' || last_name as full_name "
        "from app_user where id = $1 and deleted_at is null",
        user_id,
    )
    if target is None:
        raise HTTPException(404, "user not found")

    if await enrol_svc.is_active_enrolled(db, user_id, course_id):
        raise HTTPException(409, f"{target['full_name']} is already enrolled here")

    method = await db.fetch_one(
        "select id, default_role_id from enrolment_method "
        "where course_id = $1 and method = 'manual' and status = 'enabled' "
        "order by id limit 1",
        course_id,
    )
    if method is None:
        raise HTTPException(
            409, "manual enrolment is disabled in this course — enable it first")

    role_id = body.get("role_id") or method["default_role_id"]
    if role_id is not None and role_id not in _TEACHER_GRANTABLE_ROLE_IDS \
            and not await _is_admin(principal["id"]):
        raise HTTPException(
            403, "a teacher may only enrol with roles below their own "
                 "(student, non-editing teacher)")

    result = _svc_ok(await enrol_svc.enrol_user(
        db, method["id"], user_id, role_id=role_id,
        actor_id=principal["id"], activate=True), 409)

    role = None
    if role_id is not None:
        rr = await db.fetch_one("select short_name from role where id = $1", role_id)
        role = rr["short_name"] if rr else None
    return {"enrolled": True, "user_id": user_id, "role": role,
            "enrolment": result.get("enrolment")}


# ---------------------------------------------------------------------------
# POST /courses/{course_id}/self-enrol — the principal enrols themselves
# ---------------------------------------------------------------------------
@router.post("/courses/{course_id}/self-enrol", status_code=201)
async def self_enrol(course_id: int,
                     body: dict = Body(default=None),
                     principal: dict = Depends(current_user)):
    """Self-enrolment (enrol/self:enrolself). Only for yourself; suspended
    accounts cannot enrol (C-6 — a site-wide switch, distinct from enrolment
    status). Delegates to enrol_svc.self_enrol and translates its gate-chain
    verdict into HTTP: a failing gate → 403 with the reason, already active →
    409. Deliberately NOT gated on the unseeded enrol:selfenrol capability,
    which would fail closed for every student."""
    body = body or {}
    await _course_or_404(course_id)

    user_id = body.get("user_id")
    if user_id is not None and user_id != principal["id"]:
        raise HTTPException(403, "self-enrolment is only for yourself")
    subject = principal["id"]

    if principal.get("suspended"):
        raise HTTPException(403, "suspended accounts cannot enrol")

    if await enrol_svc.is_active_enrolled(db, subject, course_id):
        raise HTTPException(409, "already enrolled in this course")

    verdict = await enrol_svc.self_enrol(db, course_id, subject, body.get("key"))
    if not verdict.get("enrolled"):
        raise HTTPException(403, _self_enrol_reason(verdict))
    return {"enrolled": True, "course_id": course_id,
            "method_id": verdict.get("method_id")}


def _self_enrol_reason(verdict: dict) -> str:
    """Turn a failed gate-chain verdict into one friendly line."""
    friendly = {
        "course_visible": "this course is not available",
        "method_enabled": "self enrolment is not enabled in this course — "
                           "ask to be enrolled instead",
        "window_open": "outside the self-enrolment sign-up window",
        "capacity": "this course is full",
        "key_match": "incorrect enrolment key",
    }
    gate = verdict.get("failing_gate")
    if gate in friendly:
        return friendly[gate]
    reasons = verdict.get("blocking_reasons") or []
    return reasons[0] if reasons else "self-enrolment is not available here"


# ---------------------------------------------------------------------------
# POST /courses/{course_id}/unenrol-self — the principal leaves the course
# ---------------------------------------------------------------------------
@router.post("/courses/{course_id}/unenrol-self")
async def unenrol_self(course_id: int,
                       body: dict = Body(default=None),
                       principal: dict = Depends(current_user)):
    """Moodle-faithful: only a SELF-enrolled path may be self-removed
    (enrol/self:unenrolself). Manual/cohort paths refuse with the reason — ask a
    teacher. Completions and grades survive (enrol_svc never deletes them). If
    another (non-self) path keeps the user in, the note says so."""
    body = body or {}
    await _course_or_404(course_id)

    user_id = body.get("user_id")
    if user_id is not None and user_id != principal["id"]:
        raise HTTPException(403, "you can only unenrol yourself")
    subject = principal["id"]

    paths = await db.fetch_all(
        "select e.method_id, m.method "
        "from enrolment e join enrolment_method m on m.id = e.method_id "
        "where e.user_id = $1 and m.course_id = $2",
        subject, course_id,
    )
    if not paths:
        raise HTTPException(409, "you are not enrolled in this course")

    self_paths = [p for p in paths if p["method"] == "self"]
    if not self_paths:
        methods = " + ".join(sorted({p["method"] for p in paths}))
        raise HTTPException(
            403, f"your enrolment here was created by {methods} — only "
                 "self-enrolled students may unenrol themselves "
                 "(enrol/self:unenrolself); ask your teacher")

    for p in self_paths:
        _svc_ok(await enrol_svc.unenrol_user(
            db, p["method_id"], subject, actor_id=subject), 404)

    still_in = len(self_paths) < len(paths)
    return {
        "unenrolled": not still_in,
        "removed": len(self_paths),
        "note": ("self-enrolment path removed — other enrolment paths keep you "
                 "in this course (any-active wins)" if still_in else
                 "unenrolled — your completions and grades are kept; re-enrol "
                 "any time and they return"),
    }


# ---------------------------------------------------------------------------
# POST /courses/{course_id}/remove-role — remove a manual course role
# ---------------------------------------------------------------------------
@router.post("/courses/{course_id}/remove-role")
async def remove_role(course_id: int,
                      body: dict = Body(default=None),
                      principal: dict = Depends(current_user)):
    """Remove a course role assignment (e.g. demote a non-editing teacher).
    role:assign gates it (editing teacher / manager / admin). Machine-owned
    (enrol_%) assignments refuse — those belong to enrolment sync, not the roles
    UI — via permissions.unassign_role's provenance guard."""
    body = body or {}
    await _course_or_404(course_id)
    ctx = await course_context_id(course_id)
    await require_capability(principal["id"], CAP_ROLE_ASSIGN, ctx)

    user_id = body.get("user_id")
    role_id = body.get("role_id")
    if user_id is None or role_id is None:
        raise HTTPException(400, "user_id and role_id are required")

    # Prefer the manual ('' component) row when both a manual and an
    # enrol-provenance row exist for the same user/role/context.
    row = await db.fetch_one(
        "select id from role_assignment "
        "where user_id = $1 and role_id = $2 and context_id = $3 "
        "order by component limit 1",
        user_id, role_id, ctx,
    )
    if row is None:
        raise HTTPException(404, "no such role assignment at this course")

    try:
        return await permissions.unassign_role(db, row["id"],
                                                actor_id=principal["id"])
    except ValueError as e:
        raise HTTPException(404, str(e))
    except PermissionError as e:
        raise HTTPException(403, str(e))


# ---------------------------------------------------------------------------
# GET /enrolments/{enrolment_id} — one enrolment path
# ---------------------------------------------------------------------------
@router.get("/enrolments/{enrolment_id}")
async def get_enrolment(enrolment_id: int,
                        actor_id: int | None = Query(default=None),  # legacy, ignored
                        principal: dict = Depends(current_user)):
    """Read one enrolment path with its liveness verdict. Your own path is yours
    to see; anyone else's needs course:viewparticipants at the course context."""
    row = await _enrolment_or_404(enrolment_id)
    if row["user_id"] != principal["id"]:
        ctx = await course_context_id(row["course_id"])
        await require_capability(principal["id"], CAP_VIEW_PARTICIPANTS, ctx)
    return row


# ---------------------------------------------------------------------------
# DELETE /enrolments/{enrolment_id} — unenrol that path
# ---------------------------------------------------------------------------
@router.delete("/enrolments/{enrolment_id}")
async def unenrol_path(enrolment_id: int,
                       actor_id: int | None = Query(default=None),  # legacy, ignored
                       principal: dict = Depends(current_user)):
    """Unenrol one path (editing teacher / manager / admin, via enrol:unenrol).
    An active cohort-synced path refuses (sync would recreate it — suspend or
    remove the cohort membership instead), surfaced as the service's 409.
    Completions and grades survive."""
    row = await _enrolment_or_404(enrolment_id)
    ctx = await course_context_id(row["course_id"])
    await require_capability(principal["id"], CAP_UNENROL, ctx)
    return _svc_ok(await enrol_svc.unenrol_user(
        db, row["method_id"], row["user_id"], actor_id=principal["id"]), 404)


@router.patch("/enrolments/{enrolment_id}")
async def set_enrolment_status(enrolment_id: int, body: dict = Body(default=None),
                               principal: dict = Depends(current_user)):
    """Suspend / reactivate one enrolment path (RosterTab). Staff power
    (enrol:manual at the course context); routes through the enrolment service
    so its change-gate + audit apply."""
    body = body or {}
    status = body.get("status")
    if status not in ("active", "suspended"):
        raise HTTPException(status_code=400, detail="status must be 'active' or 'suspended'")
    row = await db.fetch_one(
        "select e.method_id, e.user_id, m.course_id "
        "from enrolment e join enrolment_method m on m.id = e.method_id where e.id = $1",
        enrolment_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"enrolment {enrolment_id} not found")
    ctx = await course_context_id(row["course_id"])
    await require_capability(principal["id"], CAP_ENROL_MANUAL, ctx)
    svc = enrol_svc.suspend if status == "suspended" else enrol_svc.reactivate
    res = await svc(db, row["method_id"], row["user_id"])
    if not res.get("ok"):
        raise HTTPException(status_code=409, detail=res.get("reason", "status change failed"))
    return res
