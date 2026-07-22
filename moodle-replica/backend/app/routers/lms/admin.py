"""Site administration + the student catalog (/api/lms).

The backend behind two staging pages the frontend already drives:

  * AdminPage.jsx  — Accounts and Courses, site-wide. Every mutation here is
    manager-scoped (create user/course, suspend, toggle-manager) and refuses
    for everyone else. Role assignment proper lives on the Roles page; course
    *requests* live in requests.py (this module only creates courses directly,
    which is a manager power).
  * CatalogPage.jsx — the student portal's course list with each course's
    enrolment options and the caller's own state per course.

Contract source of truth: frontend/src/mocks/lms.js (the shapes the UI was
built against) plus AdminPage.jsx / CatalogPage.jsx (the request bodies and the
response fields actually read).

Identity (X-Acting-User): the ACTOR is always the authenticated principal.
The legacy `actor_id` in bodies is IGNORED for identity. `?user_id=` on the
catalog names a SUBJECT (the student's own view) and is read as such. Privileged
routes gate on `_is_admin` — 'manager' at the system context OR a known admin
username — matching requests.py so the two lms sub-routers agree on "admin".

Course context / enrolment methods: creating a course's course-level *context*
(Khaled's permission spine) and its default enrolment *methods* (Yaman's
enrolment domain) are NOT this module's to write. POST /courses therefore
creates only the course row and reports when the context is still absent; the
catalog degrades gracefully (no self/manual method => no enrol option), exactly
like a freshly-created Moodle course before its enrol plugins are configured.
"""
import json

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app import db
from app.deps import current_user
from app.services import permissions

router = APIRouter()

# Site-wide power comes from a system-context 'manager' role OR a known admin
# username — the same contract requests.py uses, so both sub-routers agree.
_ADMIN_USERNAMES = ("admin", "admin1")

_COURSE_COLS = (
    "id, short_name, full_name, visible, group_mode::text as group_mode, "
    "force_group_mode, (deleted_at is not null) as deleted"
)
_USER_COLS = (
    "id, username, first_name, last_name, "
    "first_name || ' ' || last_name as full_name, id_number, suspended"
)


# ---- identity / gating -----------------------------------------------------

async def _has_system_manager(user_id: int) -> bool:
    row = await db.fetch_one(
        "select 1 from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 and r.short_name = 'manager' "
        "and c.level = 'system' limit 1",
        user_id,
    )
    return row is not None


async def _is_admin(principal: dict) -> bool:
    """Privileged iff 'manager' at the system context OR a known admin
    username (the work-package's site-wide-power contract)."""
    if principal.get("username") in _ADMIN_USERNAMES:
        return True
    return await _has_system_manager(principal["id"])


async def _require_admin(principal: dict, reason: str) -> None:
    if not await _is_admin(principal):
        raise HTTPException(status_code=403, detail=reason)


async def _table_exists(name: str) -> bool:
    """True if a table/view is present — lets the catalog read enrol_request
    (owned by requests.py) opportunistically without a hard cross-module
    dependency: absent => no pending requests, never a 500."""
    return bool(await db.fetch_val("select to_regclass($1) is not null", name))


def _cfg(raw) -> dict:
    """enrolment_method.config comes back from asyncpg as a jsonb string."""
    if raw is None:
        return {}
    if isinstance(raw, str):
        return json.loads(raw) if raw else {}
    return raw


async def _audit_safe(event: str, **kw) -> None:
    """Best-effort audit for admin mutations. The admin action must never fail
    because its log row could not be written (the enrolment domain audits
    in-transaction; these standalone writes are non-critical), so swallow."""
    try:
        await db.audit(event, **kw)
    except Exception:  # pragma: no cover - audit is best-effort here
        pass


# ===========================================================================
# Courses
# ===========================================================================

@router.get("/courses")
async def list_courses(include_deleted: int = 0,
                       principal: dict = Depends(current_user)):
    """All courses; soft-deleted ones stay queryable via ?include_deleted=1
    (hard case #5: history outlives the course)."""
    where = "" if include_deleted else "where deleted_at is null"
    return await db.fetch_all(
        f"select {_COURSE_COLS} from course {where} order by id"
    )


@router.get("/courses/{course_id}")
async def get_course(course_id: int,
                     actor_id: int | None = Query(default=None),
                     principal: dict = Depends(current_user)):
    """Course detail. `?actor_id` is a legacy hint — identity is the principal;
    it is accepted so existing frontend links do not 422."""
    row = await db.fetch_one(
        f"select {_COURSE_COLS} from course where id = $1", course_id
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"course {course_id} not found")
    return row


@router.post("/courses")
async def create_course(body: dict = Body(default=None),
                        principal: dict = Depends(current_user)):
    """Create a course directly. Gated on the course:create capability at the
    SYSTEM context — a category/site-level power in Moodle — so Manager, Course
    creator, and (this team's extension, T2-ROLES-001) a SITE-level editing
    teacher may create courses, with the site-admin bypass intact. A
    course-scoped editing teacher, a non-editing teacher, or a student is
    refused (403) and should request a course instead (requests.py: approval
    makes them its teacher).

    Writes ONLY the course row. The course-level *context* (permission spine)
    and default *enrolment methods* belong to other domains and are not written
    here; when the context is still absent the response says so."""
    body = body or {}
    # course:create lives at category/site level (there is only a system context
    # here), so check it there. has_capability applies the site-admin bypass and
    # returns False for an unknown capability, so this is fail-closed if M19 has
    # not been applied.
    sys_ctx = await db.fetch_val("select id from context where level = 'system'")
    if sys_ctx is None or not await permissions.has_capability(
            db, principal["id"], "course:create", sys_ctx):
        raise HTTPException(
            status_code=403,
            detail="requires capability 'course:create' at the site level — it "
            "belongs to Manager, Course creator, or a site-level editing teacher; "
            "otherwise request a course instead (approval makes you its teacher)",
        )
    full_name = (body.get("full_name") or "").strip()
    short_name = (body.get("short_name") or "").strip()
    if not full_name or not short_name:
        raise HTTPException(status_code=400,
                            detail="full_name and short_name are required")
    clash = await db.fetch_one(
        "select 1 from course where short_name = $1 and deleted_at is null",
        short_name,
    )
    if clash:
        raise HTTPException(status_code=409,
                            detail=f"short name '{short_name}' already exists")
    row = await db.fetch_one(
        f"insert into course (short_name, full_name, visible) "
        f"values ($1, $2, true) returning {_COURSE_COLS}",
        short_name, full_name,
    )
    await _audit_safe("course.created", actor_id=principal["id"],
                      course_id=row["id"],
                      detail={"short_name": short_name, "full_name": full_name})
    # The course-level context is not ours to create (Khaled's permission
    # spine). Surface its absence so the orchestrator/permissions layer seeds
    # it — enrolment role rows and per-course capability checks need it.
    ctx = await db.fetch_one(
        "select id from context where level = 'course' and instance_id = $1",
        row["id"],
    )
    if ctx is None:
        row["note"] = (
            "course created; its course-level context is not yet present — "
            "roles/enrolment at this course need it seeded (permissions domain)"
        )
    return row


# ===========================================================================
# Catalog (student portal)
# ===========================================================================

@router.get("/catalog")
async def catalog(user_id: int | None = Query(default=None),
                  principal: dict = Depends(current_user)):
    """Every visible, non-deleted course with the SUBJECT's own state and the
    enrolment options open to them. `?user_id` names the subject (a student's
    own view); it defaults to the principal.

    Per course (frontend contract, mirrors mocks/lms.js):
      course           — the course projection
      my_status        — active|suspended|expired|method_disabled|
                         account_suspended, or null when not enrolled
      teaching         — role != enrolment: teachers appear via role assignment
      request_pending  — a pending enrol_request exists (read if that table is
                         present; false otherwise)
      options.self_enrol {requires_key} | null
      options.can_request — a manual method exists (our request-to-enrol path)
    """
    subject = user_id if user_id is not None else principal["id"]
    subj = await db.fetch_one(
        "select username, suspended, (deleted_at is not null) as deleted "
        "from app_user where id = $1", subject,
    )
    if subj is None or subj["deleted"]:
        raise HTTPException(status_code=404, detail=f"unknown user {subject}")

    courses = await db.fetch_all(
        f"select {_COURSE_COLS} from course "
        f"where visible and deleted_at is null order by id"
    )
    if not courses:
        return []
    course_ids = [c["id"] for c in courses]

    # One user's paths across all catalog courses (one query, no N+1). `live`
    # is the four §6.2 conditions; account suspension is a separate switch (C-6)
    # handled by the precedence below.
    paths = await db.fetch_all(
        "select course_id, enrolment_status, method_status, live, "
        "(time_end is not null and time_end <= now()) as expired "
        "from v_enrolment_detail "
        "where user_id = $1 and course_id = any($2::bigint[])",
        subject, course_ids,
    )
    paths_by_course: dict[int, list[dict]] = {}
    for p in paths:
        paths_by_course.setdefault(p["course_id"], []).append(p)

    subj_is_admin = (subj["username"] in _ADMIN_USERNAMES
                     or await _has_system_manager(subject))
    # Teacher roles at course context (per-course) or system context (all).
    trole = await db.fetch_all(
        "select c.level::text as level, c.instance_id as course_id "
        "from role_assignment ra "
        "join role r on r.id = ra.role_id "
        "join context c on c.id = ra.context_id "
        "where ra.user_id = $1 "
        "and r.archetype in ('editingteacher','teacher') "
        "and c.level in ('system','course')",
        subject,
    )
    teaches_all = subj_is_admin or any(r["level"] == "system" for r in trole)
    teaching_course_ids = {r["course_id"] for r in trole if r["level"] == "course"}

    methods = await db.fetch_all(
        "select course_id, method::text as method, config "
        "from enrolment_method "
        "where status = 'enabled' and method in ('self','manual') "
        "and course_id = any($1::bigint[])",
        course_ids,
    )
    self_by_course: dict[int, dict] = {}
    manual_courses: set[int] = set()
    for m in methods:
        if m["method"] == "self" and m["course_id"] not in self_by_course:
            self_by_course[m["course_id"]] = {
                "requires_key": bool(_cfg(m["config"]).get("key"))}
        elif m["method"] == "manual":
            manual_courses.add(m["course_id"])

    # Pending enrol requests — read only if requests.py's table is present.
    pending_courses: set[int] = set()
    if await _table_exists("enrol_request"):
        try:
            rows = await db.fetch_all(
                "select distinct course_id from enrol_request "
                "where user_id = $1 and status = 'pending' "
                "and course_id = any($2::bigint[])",
                subject, course_ids,
            )
            pending_courses = {r["course_id"] for r in rows}
        except Exception:  # pragma: no cover - defensive across module rollout
            pending_courses = set()

    suspended = subj["suspended"]

    def _status(cid: int):
        ps = paths_by_course.get(cid)
        if not ps:
            return None
        if suspended:
            return "account_suspended"
        if any(p["live"] for p in ps):
            return "active"
        if any(p["expired"] for p in ps):
            return "expired"
        if any(p["method_status"] == "disabled" for p in ps):
            return "method_disabled"
        return "suspended"

    return [
        {
            "course": c,
            "my_status": _status(c["id"]),
            "teaching": teaches_all or c["id"] in teaching_course_ids,
            "request_pending": c["id"] in pending_courses,
            "options": {
                "self_enrol": self_by_course.get(c["id"]),
                "can_request": c["id"] in manual_courses,
            },
        }
        for c in courses
    ]


# ===========================================================================
# Users (accounts)
# ===========================================================================

@router.get("/users")
async def list_users(principal: dict = Depends(current_user)):
    """Active accounts. Soft-deleted users are hidden (their history survives
    through progress snapshots — hard case #5)."""
    return await db.fetch_all(
        f"select {_USER_COLS} from app_user where deleted_at is null order by id"
    )


@router.post("/users")
async def create_user(body: dict = Body(default=None),
                      principal: dict = Depends(current_user)):
    """Create an account — ADMIN only. Admin-created accounts are usable
    immediately (no confirmation-email gate — that belongs to self-registration
    only, Moodle's rule).

    Note: credentials (app_credential) are Khaled's auth domain and are NOT
    written here. Without one, the new account signs in as a demo persona (any
    password) — still "usable right now"; a real password hash lands when auth
    owns this create."""
    body = body or {}
    await _require_admin(principal, "only a manager may create user accounts")
    username = (body.get("username") or "").strip()
    first_name = (body.get("first_name") or "").strip()
    last_name = (body.get("last_name") or "").strip()
    password = body.get("password") or ""
    if not username or not first_name or not last_name or not password:
        raise HTTPException(
            status_code=400,
            detail="username, first_name, last_name and password are all required",
        )
    # Match the DB unique(username): a soft-deleted user still holds the name.
    clash = await db.fetch_one(
        "select 1 from app_user where username = $1", username)
    if clash:
        raise HTTPException(status_code=409,
                            detail=f"username '{username}' is taken")
    row = await db.fetch_one(
        f"insert into app_user (username, email, first_name, last_name) "
        f"values ($1, $2, $3, $4) returning {_USER_COLS}",
        username, f"{username}@whocan.local", first_name, last_name,
    )
    await _audit_safe("user.created", actor_id=principal["id"],
                      affected_id=row["id"], detail={"username": username})
    return row


@router.patch("/users/{user_id}")
async def patch_user(user_id: int, body: dict = Body(default=None),
                     principal: dict = Depends(current_user)):
    """Site-wide account suspend/reactivate — ADMIN only. Suspension refuses
    sign-in but never touches enrolments, grades or completions (C-6); the
    roster keeps showing them. No self-lockout: you cannot suspend yourself."""
    body = body or {}
    await _require_admin(principal,
                         "only a manager may suspend or reactivate accounts")
    target = await db.fetch_one(
        f"select {_USER_COLS} from app_user where id = $1 and deleted_at is null",
        user_id,
    )
    if not target:
        raise HTTPException(status_code=404, detail=f"user {user_id} not found")
    if "suspended" not in body or not isinstance(body["suspended"], bool):
        return target  # nothing to change (parity with the mock's no-op)
    want = body["suspended"]
    if user_id == principal["id"] and want is True:
        raise HTTPException(
            status_code=409,
            detail="you cannot suspend your own account — that would lock you out",
        )
    if target["suspended"] == want:
        return target  # change-gated: no rewrite, no audit on a no-op
    row = await db.fetch_one(
        f"update app_user set suspended = $2, updated_at = now() "
        f"where id = $1 returning {_USER_COLS}",
        user_id, want,
    )
    await _audit_safe("user.suspended" if want else "user.reactivated",
                      actor_id=principal["id"], affected_id=user_id,
                      detail={"suspended": want})
    return row


@router.post("/users/{user_id}/toggle-manager")
async def toggle_manager(user_id: int, body: dict = Body(default=None),
                         principal: dict = Depends(current_user)):
    """Grant or revoke the Manager role at the System context — ADMIN only.
    No self-demotion: an admin cannot revoke their own manager role (the last
    thing an admin does is lock themselves out)."""
    await _require_admin(principal,
                         "only a manager may grant or revoke the manager role")
    target = await db.fetch_one(
        "select id from app_user where id = $1 and deleted_at is null", user_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"user {user_id} not found")

    role = await db.fetch_one("select id from role where short_name = 'manager'")
    sysctx = await db.fetch_one(
        "select id from context where level = 'system' limit 1")
    if role is None or sysctx is None:
        raise HTTPException(
            status_code=500,
            detail="manager role or system context is not seeded")
    role_id, ctx_id = role["id"], sysctx["id"]

    existing = await db.fetch_one(
        "select id from role_assignment "
        "where user_id = $1 and role_id = $2 and context_id = $3 limit 1",
        user_id, role_id, ctx_id,
    )
    if existing:
        if user_id == principal["id"]:
            raise HTTPException(
                status_code=409,
                detail="you cannot revoke your own manager role — no self-lockout")
        await db.execute(
            "delete from role_assignment "
            "where user_id = $1 and role_id = $2 and context_id = $3",
            user_id, role_id, ctx_id,
        )
        await _audit_safe("role.unassigned", actor_id=principal["id"],
                          affected_id=user_id, context_id=ctx_id,
                          detail={"role_id": role_id, "short_name": "manager"})
        return {"manager": False}

    await db.execute(
        "insert into role_assignment (user_id, role_id, context_id, assigned_by) "
        "values ($1, $2, $3, $4) "
        "on conflict (user_id, role_id, context_id, component, item_id) "
        "do nothing",
        user_id, role_id, ctx_id, principal["id"],
    )
    await _audit_safe("role.assigned", actor_id=principal["id"],
                      affected_id=user_id, context_id=ctx_id,
                      detail={"role_id": role_id, "short_name": "manager"})
    return {"manager": True}


@router.patch("/courses/{course_id}")
async def update_course(course_id: int, body: dict = Body(default=None),
                        principal: dict = Depends(current_user)):
    """Edit a course (visibility toggle / rename) — ADMIN only (AdminPage CoursesTab)."""
    body = body or {}
    await _require_admin(principal, "only a manager may change a course")
    row = await db.fetch_one(f"select {_COURSE_COLS} from course where id = $1", course_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"course {course_id} not found")
    sets, args, n = [], [], 1
    if "visible" in body:
        n += 1; sets.append(f"visible = ${n}"); args.append(bool(body["visible"]))
    if body.get("full_name"):
        n += 1; sets.append(f"full_name = ${n}"); args.append(body["full_name"].strip())
    if not sets:
        return row
    updated = await db.fetch_one(
        f"update course set {', '.join(sets)} where id = $1 returning {_COURSE_COLS}",
        course_id, *args)
    await _audit_safe("course.updated", actor_id=principal["id"], course_id=course_id,
                      detail={k: body[k] for k in ("visible", "full_name") if k in body})
    return updated


@router.delete("/courses/{course_id}")
async def delete_course(course_id: int,
                        actor_id: int | None = Query(default=None),
                        principal: dict = Depends(current_user)):
    """Soft-delete a course (deleted_at) — ADMIN only. History survives (HC-5);
    completion/enrolment rows are deliberately NOT touched."""
    await _require_admin(principal, "only a manager may delete a course")
    row = await db.fetch_one(
        "select id from course where id = $1 and deleted_at is null", course_id)
    if not row:
        raise HTTPException(status_code=404,
                            detail=f"course {course_id} not found or already deleted")
    await db.fetch_one("update course set deleted_at = now() where id = $1 returning id",
                       course_id)
    await _audit_safe("course.deleted", actor_id=principal["id"], course_id=course_id, detail={})
    return {"ok": True, "deleted": True, "course_id": course_id}
