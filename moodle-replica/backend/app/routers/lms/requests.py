"""Course requests + enrolment requests (/api/lms).

Two Moodle-faithful request flows the staging frontend already drives:

  * COURSE requests (Teaching -> New course, Admin badge): a teacher CANNOT
    create a course (moodle/course:create belongs to Manager/Course creator),
    so they *request* one. A manager approves; approval CREATES the course and
    makes the requester its editing teacher (mirrors the mock in
    frontend/src/mocks/lms.js and Moodle's course-request lib).

  * ENROLMENT requests (Courses catalog -> "Request enrolment", Teaching ->
    Roster): where only manual enrolment exists a student cannot self-enrol, so
    they ask. This course's staff approve (-> manual enrol via enrol_svc) or
    deny.

Identity: the ACTOR is always the authenticated principal (X-Acting-User); the
legacy actor_id/user_id in bodies/queries are ignored for identity. Privileged
course-request decisions require a system 'manager' (_is_admin); enrolment-
request review/decisions require teaching this course (_teaches).
"""
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app import db
from app.deps import current_user
from app.services import enrolment as enrol_svc

router = APIRouter()

_ADMIN_USERNAMES = ("admin", "admin1")


# ---- gating helpers --------------------------------------------------------

async def _is_admin(principal: dict) -> bool:
    """Privileged iff 'manager' at the system context OR a known admin
    username (the work-package contract for site-wide power)."""
    if principal.get("username") in _ADMIN_USERNAMES:
        return True
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 and r.short_name = 'manager' "
        "and c.level = 'system' limit 1",
        principal["id"],
    )
    return row is not None


async def _teaches(principal: dict, course_id: int) -> bool:
    """Admin, or holds editingteacher/teacher at this course's context (or
    inherited from system) — the mock's `teaches()`."""
    if await _is_admin(principal):
        return True
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 "
        "and r.short_name in ('editingteacher', 'teacher') "
        "and ((c.level = 'course' and c.instance_id = $2) or c.level = 'system') "
        "limit 1",
        principal["id"], course_id,
    )
    return row is not None


def _full_name(row: dict, prefix: str = "") -> str:
    return f"{row[prefix + 'first_name']} {row[prefix + 'last_name']}"


# ==== COURSE REQUESTS =======================================================

@router.get("/course-requests")
async def list_course_requests(
    actor_id: int | None = Query(default=None),  # legacy; identity is the principal
    principal: dict = Depends(current_user),
):
    """Admin sees every request; a teacher sees only their own (mock filter)."""
    where, args = "", []
    if not await _is_admin(principal):
        where = "where cr.requester_id = $1"
        args = [principal["id"]]
    rows = await db.fetch_all(
        "select cr.id, cr.requester_id, cr.full_name, cr.short_name, cr.reason, "
        "cr.status, cr.course_id, cr.requested_at, cr.decided_by, "
        "u.username as r_username, u.first_name as r_first_name, "
        "u.last_name as r_last_name "
        "from course_request cr "
        "join app_user u on u.id = cr.requester_id "
        f"{where} order by cr.requested_at desc, cr.id desc",
        *args,
    )
    out = []
    for r in rows:
        requester = {
            "id": r["requester_id"],
            "username": r.pop("r_username"),
            "full_name": _full_name(r, "r_"),
        }
        r.pop("r_first_name")
        r.pop("r_last_name")
        r["requester"] = requester
        out.append(r)
    return out


@router.post("/course-requests")
async def create_course_request(
    body: dict = Body(default={}),
    principal: dict = Depends(current_user),
):
    """A teacher requests a new course. Any authenticated principal may ask
    (Moodle's moodle/course:request); a manager decides later."""
    full_name = (body.get("full_name") or "").strip()
    short_name = (body.get("short_name") or "").strip()
    if not full_name or not short_name:
        raise HTTPException(400, "full_name and short_name are required")
    row = await db.fetch_one(
        "insert into course_request (requester_id, full_name, short_name, reason) "
        "values ($1, $2, $3, $4) returning id, requester_id, full_name, "
        "short_name, reason, status, course_id, requested_at, decided_by",
        principal["id"], full_name, short_name, body.get("reason") or "",
    )
    return row


@router.post("/course-requests/{request_id}/{action}")
async def decide_course_request(
    request_id: int,
    action: str,
    body: dict = Body(default={}),
    principal: dict = Depends(current_user),
):
    """Manager-only. reject -> mark rejected. approve -> create the course
    (with a manual enrolment method) and make the requester its editing
    teacher, then mark approved (Moodle-faithful)."""
    if action not in ("approve", "reject"):
        raise HTTPException(400, f"unknown action '{action}'")
    if not await _is_admin(principal):
        raise HTTPException(403, "only a manager may decide course requests")

    req = await db.fetch_one(
        "select id, requester_id, full_name, short_name, reason, status, "
        "course_id, requested_at, decided_by from course_request where id = $1",
        request_id,
    )
    if req is None:
        raise HTTPException(404, f"course request {request_id} not found")
    if req["status"] != "pending":
        raise HTTPException(409, f"request already {req['status']}")

    if action == "reject":
        return await db.fetch_one(
            "update course_request set status = 'rejected', decided_by = $1, "
            "decided_at = now() where id = $2 returning id, requester_id, "
            "full_name, short_name, reason, status, course_id, requested_at, "
            "decided_by",
            principal["id"], request_id,
        )

    # approve: create course + context + manual method + teacher role, atomically
    async with db.transaction() as conn:
        course = await conn.fetchrow(
            "insert into course (short_name, full_name) values ($1, $2) "
            "returning id, short_name, full_name, visible, "
            "group_mode::text as group_mode, force_group_mode",
            req["short_name"], req["full_name"],
        )
        sys_ctx = await conn.fetchrow(
            "select id from context where level = 'system' limit 1")
        ctx = await conn.fetchrow(
            "insert into context (level, instance_id, parent_id) "
            "values ('course', $1, $2) returning id",
            course["id"], sys_ctx["id"] if sys_ctx else None,
        )
        student_role = await conn.fetchrow(
            "select id from role where short_name = 'student'")
        teacher_role = await conn.fetchrow(
            "select id from role where short_name = 'editingteacher'")
        await conn.execute(
            "insert into enrolment_method (course_id, method, status, "
            "default_role_id) values ($1, 'manual', 'enabled', $2)",
            course["id"], student_role["id"] if student_role else None,
        )
        if teacher_role is not None:
            await conn.execute(
                "insert into role_assignment (user_id, role_id, context_id, "
                "component, item_id, assigned_by) values ($1, $2, $3, '', 0, $4) "
                "on conflict (user_id, role_id, context_id, component, item_id) "
                "do nothing",
                req["requester_id"], teacher_role["id"], ctx["id"], principal["id"],
            )
        updated = await conn.fetchrow(
            "update course_request set status = 'approved', decided_by = $1, "
            "decided_at = now(), course_id = $2 where id = $3 returning id, "
            "requester_id, full_name, short_name, reason, status, course_id, "
            "requested_at, decided_by",
            principal["id"], course["id"], request_id,
        )
    result = dict(updated)
    result["course"] = dict(course)
    return result


# ==== ENROLMENT REQUESTS ====================================================

@router.get("/my-requests")
async def my_enrol_requests(
    user_id: int = Query(...),  # subject: a student's own view (safe to read)
    principal: dict = Depends(current_user),
):
    """The requester's own enrolment requests, each with its course."""
    rows = await db.fetch_all(
        "select er.id, er.course_id, er.user_id, er.message, er.status, "
        "er.requested_at, er.decided_by, "
        "c.short_name as c_short_name, c.full_name as c_full_name "
        "from enrol_request er join course c on c.id = er.course_id "
        "where er.user_id = $1 order by er.requested_at desc, er.id desc",
        user_id,
    )
    for r in rows:
        r["course"] = {
            "id": r["course_id"],
            "short_name": r.pop("c_short_name"),
            "full_name": r.pop("c_full_name"),
        }
    return rows


@router.post("/courses/{course_id}/enrol-request")
async def create_enrol_request(
    course_id: int,
    body: dict = Body(default={}),
    principal: dict = Depends(current_user),
):
    """A user asks to be enrolled where they cannot self-enrol. The requester
    is the principal (body.user_id is legacy)."""
    user_id = principal["id"]
    course = await db.fetch_one(
        "select id from course where id = $1 and deleted_at is null", course_id)
    if course is None:
        raise HTTPException(404, f"course {course_id} not found")
    if await enrol_svc.is_active_enrolled(db, user_id, course_id):
        raise HTTPException(409, "already enrolled in this course")
    dup = await db.fetch_one(
        "select 1 from enrol_request where course_id = $1 and user_id = $2 "
        "and status = 'pending' limit 1",
        course_id, user_id,
    )
    if dup is not None:
        raise HTTPException(409, "you already have a pending request for this course")
    row = await db.fetch_one(
        "insert into enrol_request (course_id, user_id, message) "
        "values ($1, $2, $3) returning id, course_id, user_id, message, status, "
        "requested_at, decided_by",
        course_id, user_id, body.get("message") or "",
    )
    return row


@router.get("/courses/{course_id}/enrol-requests")
async def list_enrol_requests(
    course_id: int,
    actor_id: int | None = Query(default=None),  # legacy; identity is the principal
    principal: dict = Depends(current_user),
):
    """This course's staff (teacher/manager) see every enrolment request."""
    if not await _teaches(principal, course_id):
        raise HTTPException(403, "only this course's teachers may review enrolment requests")
    rows = await db.fetch_all(
        "select er.id, er.course_id, er.user_id, er.message, er.status, "
        "er.requested_at, er.decided_by, "
        "u.username as u_username, u.first_name as u_first_name, "
        "u.last_name as u_last_name "
        "from enrol_request er join app_user u on u.id = er.user_id "
        "where er.course_id = $1 order by er.requested_at desc, er.id desc",
        course_id,
    )
    for r in rows:
        r["user"] = {
            "id": r["user_id"],
            "username": r.pop("u_username"),
            "full_name": _full_name(r, "u_"),
        }
        r.pop("u_first_name")
        r.pop("u_last_name")
    return rows


@router.post("/enrol-requests/{request_id}/{action}")
async def decide_enrol_request(
    request_id: int,
    action: str,
    body: dict = Body(default={}),
    principal: dict = Depends(current_user),
):
    """Course staff decide. deny -> mark denied. approve -> enrol via the
    course's manual method (enrol_svc) and mark approved."""
    if action not in ("approve", "deny", "reject"):
        raise HTTPException(400, f"unknown action '{action}'")

    req = await db.fetch_one(
        "select id, course_id, user_id, message, status from enrol_request "
        "where id = $1",
        request_id,
    )
    if req is None:
        raise HTTPException(404, f"enrolment request {request_id} not found")
    if not await _teaches(principal, req["course_id"]):
        raise HTTPException(403, "only this course's teachers may decide enrolment requests")
    if req["status"] != "pending":
        raise HTTPException(409, f"request already {req['status']}")

    if action in ("deny", "reject"):
        return await db.fetch_one(
            "update enrol_request set status = 'denied', decided_by = $1, "
            "decided_at = now() where id = $2 returning id, course_id, user_id, "
            "message, status, requested_at, decided_by",
            principal["id"], request_id,
        )

    # approve: enrol via the course's enabled manual method
    method = await db.fetch_one(
        "select id from enrolment_method where course_id = $1 "
        "and method = 'manual' and status = 'enabled' order by id limit 1",
        req["course_id"],
    )
    if method is None:
        raise HTTPException(
            409, "manual enrolment is disabled in this course — enable it first")
    res = await enrol_svc.enrol_user(
        db, method["id"], req["user_id"], actor_id=principal["id"], activate=True)
    if isinstance(res, dict) and res.get("ok") is False:
        raise HTTPException(409, res.get("reason", "enrolment failed"))
    return await db.fetch_one(
        "update enrol_request set status = 'approved', decided_by = $1, "
        "decided_at = now() where id = $2 returning id, course_id, user_id, "
        "message, status, requested_at, decided_by",
        principal["id"], request_id,
    )
