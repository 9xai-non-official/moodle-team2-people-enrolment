"""SIS → WhoCan ingest — owner: Mahmoud (T2-SIS-001).

The receiving half of docs/SIS-WHOCAN-SYNC-CONTRACT.md. The SIS (student
portal) is the system of record for people / courses / enrolments; this module
applies its events idempotently so at-least-once delivery is safe:

  * people match on app_user.id_number  (unique where present — T2-SIS-001)
  * courses match on course.external_ref (unique since M01)
  * both support ADOPT: an existing unclaimed row with the same natural key
    (email for people, short_name for courses) is claimed rather than
    duplicated — that is what lets the SIS take over the demo CS101 instead
    of creating "CS101 (2)".

Enrolment itself is delegated to Yaman's service (enrol_user / unenrol_user),
so provenance rows (component='enrol_sis'), liveness, audit, last-path cleanup
and the group side-effect pipeline all behave exactly as every other method.
Drops pass the internal sync flag — the ENR-013 guard blocks *manual* unenrols
of sis paths, and this module IS the system path the guard defers to.
"""
import re
from datetime import datetime, timezone

from app.services import enrolment as enrol_svc

# Contract §3: SIS 'student' → student role; SIS 'teacher' → editingteacher
# (the role archetype the UI's "teaches" logic keys on). Looked up by
# short_name at call time — ids are seed-dependent, never hardcoded.
ROLE_MAP = {"student": "student", "teacher": "editingteacher"}


def _ts(value: str | None) -> datetime | None:
    """ISO date/datetime → tz-aware datetime (asyncpg wants real datetimes).
    A bare date means midnight UTC that day."""
    if not value:
        return None
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _username_for(sis_id: str) -> str:
    """Deterministic, collision-resistant username for an SIS-created account.
    The sis. prefix keeps portal accounts visually distinct from local ones."""
    return "sis." + re.sub(r"[^a-z0-9]+", ".", sis_id.lower()).strip(".")


async def _role_id(db, short_name: str) -> int | None:
    row = await db.fetch_one(
        "select id from role where short_name = $1", short_name)
    return row["id"] if row else None


# ---------------------------------------------------------------------------
# find → adopt → create, per entity
# ---------------------------------------------------------------------------

async def ensure_user(db, person) -> dict:
    """Resolve an SIS person to an app_user row, creating/claiming as needed."""
    found = await db.fetch_one(
        "select id, username, suspended from app_user "
        "where id_number = $1 and deleted_at is null", person.sis_id)
    if found:
        return {"user_id": found["id"], "action": "found"}

    # Adopt: same email, not yet claimed by any SIS id. Guarded update so two
    # concurrent ingests can't both claim it (the WHERE re-checks id_number).
    adopted = await db.fetch_one(
        """
        update app_user set id_number = $1, updated_at = now()
         where id = (select id from app_user
                      where lower(email) = lower($2) and id_number is null
                        and deleted_at is null
                      order by id limit 1)
           and id_number is null
        returning id
        """, person.sis_id, person.email)
    if adopted:
        return {"user_id": adopted["id"], "action": "adopted"}

    username = _username_for(person.sis_id)
    clash = await db.fetch_one(
        "select 1 from app_user where username = $1", username)
    if clash:  # freak collision — sis_id is in the username, so suffix once
        username = f"{username}.{person.sis_id.lower()[-4:]}"
    created = await db.fetch_one(
        """
        insert into app_user (username, email, first_name, last_name, id_number)
        values ($1, $2, $3, $4, $5)
        returning id
        """, username, person.email, person.first, person.last, person.sis_id)
    return {"user_id": created["id"], "action": "created", "username": username}


async def ensure_course(db, course, term) -> dict:
    """Resolve an SIS course to a course row (+ context), creating/claiming."""
    found = await db.fetch_one(
        "select id from course where external_ref = $1 and deleted_at is null",
        course.sis_id)
    if found:
        return {"course_id": found["id"], "action": "found"}

    adopted = await db.fetch_one(
        """
        update course set external_ref = $1
         where id = (select id from course
                      where short_name = $2 and external_ref is null
                        and deleted_at is null
                      order by id limit 1)
           and external_ref is null
        returning id
        """, course.sis_id, course.code)
    if adopted:
        return {"course_id": adopted["id"], "action": "adopted"}

    # Create the course WITH its permission spine, mirroring lms/admin.py's
    # create-course path (course + course context under system). No manual
    # method: an SIS-created course is portal-managed by construction; an
    # admin can still add break-glass methods through the normal UI.
    async with db.transaction() as conn:
        row = await conn.fetchrow(
            "insert into course (short_name, full_name, visible, start_date, "
            "end_date, external_ref) values ($1, $2, true, $3, $4, $5) "
            "returning id",
            course.code, course.title,
            _ts(term.starts_at), _ts(term.ends_at), course.sis_id)
        sys_ctx = await conn.fetchval(
            "select id from context where level = 'system' limit 1")
        await conn.execute(
            "insert into context (level, instance_id, parent_id) "
            "values ('course', $1, $2)", row["id"], sys_ctx)
    return {"course_id": row["id"], "action": "created"}


async def ensure_sis_method(db, course_id: int) -> int:
    """One 'sis' method instance per course — the door portal enrolments use."""
    row = await db.fetch_one(
        "select id from enrolment_method where course_id = $1 and method = 'sis' "
        "order by id limit 1", course_id)
    if row:
        return row["id"]
    student = await _role_id(db, ROLE_MAP["student"])
    res = await enrol_svc.create_method(
        db, course_id, "sis", default_role_id=student)
    if not res.get("ok"):
        raise RuntimeError(f"could not create sis method: {res.get('reason')}")
    return res["method"]["id"]


# ---------------------------------------------------------------------------
# the three event types
# ---------------------------------------------------------------------------

async def apply_event(db, event, actor_id: int) -> dict:
    if event.type in ("enrol", "drop") and event.course is None:
        return {"ok": False, "reason": f"{event.type} events require a course"}

    user = await ensure_user(db, event.person)
    out = {"ok": True, "type": event.type, "user": user}

    if event.type == "account":
        # The login gate (contract §6): SIS says whether this person is active
        # this term. Change-gated so replays don't rewrite rows.
        active = bool(event.active)
        row = await db.fetch_one(
            "update app_user set suspended = $2, updated_at = now() "
            "where id = $1 and suspended is distinct from $2 returning id",
            user["user_id"], not active)
        out["account"] = {"active": active, "changed": row is not None}
        if row is not None:
            await db.fetch_one(
                "insert into audit_log (event, actor_id, affected_id, detail) "
                "values ('sis.account_gate', $1, $2, $3::jsonb) returning id",
                actor_id, user["user_id"],
                f'{{"active": {str(active).lower()}, "term": "{event.term.code}"}}')
        return out

    course = await ensure_course(db, event.course, event.term)
    method_id = await ensure_sis_method(db, course["course_id"])
    role = await _role_id(db, ROLE_MAP[event.role])
    out |= {"course": course, "method_id": method_id}

    if event.type == "enrol":
        res = await enrol_svc.enrol_user(
            db, method_id, user["user_id"],
            role_id=role,
            time_start=_ts(event.term.starts_at),
            time_end=_ts(event.term.ends_at),
            actor_id=actor_id,
            activate=True,   # SIS is the source of truth: registering again
                             # always reactivates a suspended path (§6.7 spirit)
        )
        if res.get("ok"):
            # Role CHANGE hygiene: if the portal previously enrolled this person
            # with a different role (student promoted to teacher, or back), the
            # old provenance row would linger — enrol_user only adds. Exactly
            # one enrol_sis role per path is the invariant.
            await db.fetch_all(
                """
                delete from role_assignment
                 where user_id = $1 and component = 'enrol_sis' and item_id = $2
                   and role_id <> $3
                returning id
                """, user["user_id"], method_id, role)
        out["enrolment"] = {
            "ok": res.get("ok"),
            "status": (res.get("enrolment") or {}).get("status"),
            "reason": res.get("reason"),
        }
        return out

    # drop — the system path: bypasses the ENR-013/sis guard by design.
    res = await enrol_svc.unenrol_user(
        db, method_id, user["user_id"], actor_id=actor_id, _cohort_sync=True)
    if not res.get("ok") and "not enrolled" in (res.get("reason") or ""):
        # Idempotency: dropping someone who was never (or already un-)enrolled
        # is a success no-op, not an error — replays must converge.
        out["enrolment"] = {"ok": True, "noop": True}
        return out
    out["enrolment"] = {"ok": res.get("ok"), "reason": res.get("reason"),
                        "last_path_cleanup": res.get("last_path_cleanup")}
    return out
