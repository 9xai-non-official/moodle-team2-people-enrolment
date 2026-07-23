"""msteams plugin event handlers — all idempotent (the outbox retries a
whole event on any failure, and one event fans out to every enabled plugin).

Status lifecycle in msteams_course_team: pending → ready → archived, with
failed set only by a terminal create error. Every status change is published
to Ably channel course:{id} (best-effort — realtime.publish never raises).

Retry semantics:
  * raise            → the dispatcher backs off and retries (Graph flakes,
                       team-not-ready-yet, eventual consistency).
  * terminal skip    → return normally + audit (unknown AAD email must not
                       poison the queue: fixture personas have fake
                       @whocan.local emails).
"""
from app import db
from app.plugins.msteams import graph
from app.services import realtime


async def _publish_status(course_id: int, status: str,
                          error: str | None = None,
                          team_name: str | None = None) -> None:
    await realtime.publish(f"course:{course_id}", "msteams.status", {
        "course_id": course_id, "status": status,
        "error": error, "team_name": team_name,
    })


async def _mapping(course_id: int) -> dict | None:
    return await db.fetch_one(
        "select * from msteams_course_team where course_id = $1", course_id)


async def on_course_created(payload: dict, settings: dict) -> None:
    course_id = payload["course_id"]
    course = await db.fetch_one(
        "select id, short_name, full_name from course where id = $1",
        course_id)
    if course is None:
        return  # course vanished before dispatch — nothing to provision
    await db.execute(
        "insert into msteams_course_team (course_id) values ($1) "
        "on conflict (course_id) do nothing", course_id)
    mapping = await _mapping(course_id)
    if mapping["status"] == "ready" and mapping["aad_group_id"]:
        return  # already provisioned (idempotent re-dispatch)

    name = settings.get("team_name_template",
                        "{short_name} — {full_name}").format(**course)
    try:
        team_id = await graph.create_team(
            name, f"Course team for {course['full_name']} (course "
            f"{course_id})", settings["owner_upn"], settings)
    except Exception as e:
        # Record the failure for the admin panel, then re-raise so the
        # outbox retries. A crash between Graph's 202 and the update below
        # can duplicate the team — accepted; the error column surfaces it.
        await db.execute(
            "update msteams_course_team set error = $2, updated_at = now() "
            "where course_id = $1", course_id, str(e)[:2000])
        await _publish_status(course_id, "pending", error=str(e)[:200])
        raise
    await db.execute(
        "update msteams_course_team set aad_group_id = $2, status = 'ready', "
        "error = null, updated_at = now() where course_id = $1",
        course_id, team_id)
    await _publish_status(course_id, "ready", team_name=name)


async def on_enrolment_created(payload: dict, settings: dict) -> None:
    course_id = payload["course_id"]
    mapping = await _mapping(course_id)
    if mapping is None or mapping["status"] != "ready" \
            or not mapping["aad_group_id"]:
        # Team not provisioned yet (course.created may still be in flight,
        # or Graph is catching up) — retryable; backoff absorbs the lag.
        raise RuntimeError(
            f"msteams: team for course {course_id} not ready yet")
    user = await db.fetch_one(
        "select username, email from app_user where id = $1",
        payload["user_id"])
    if user is None:
        return  # user vanished — nothing to add
    overrides = settings.get("email_overrides") or {}
    email = overrides.get(user["username"]) or user["email"]
    aad_id = await graph.find_user(email, settings)
    if aad_id is None:
        # Terminal skip: no AAD account for this email (fixture personas).
        await db.audit("msteams.member_skipped",
                       affected_id=payload["user_id"], course_id=course_id,
                       detail={"email": email,
                               "reason": "no matching AAD user"})
        return
    await graph.add_member(mapping["aad_group_id"], aad_id, settings)
    await db.audit("msteams.member_added", affected_id=payload["user_id"],
                   course_id=course_id, detail={"email": email})


async def on_enrolment_deleted(payload: dict, settings: dict) -> None:
    if not payload.get("last_path"):
        return  # user still enrolled via another path — stays in the team
    course_id = payload["course_id"]
    mapping = await _mapping(course_id)
    if mapping is None or not mapping["aad_group_id"]:
        return  # no team — nothing to remove
    user = await db.fetch_one(
        "select username, email from app_user where id = $1",
        payload["user_id"])
    if user is None:
        return
    overrides = settings.get("email_overrides") or {}
    email = overrides.get(user["username"]) or user["email"]
    aad_id = await graph.find_user(email, settings)
    if aad_id is None:
        return  # never mapped → never added
    await graph.remove_member(mapping["aad_group_id"], aad_id, settings)
    await db.audit("msteams.member_removed", affected_id=payload["user_id"],
                   course_id=course_id, detail={"email": email})


async def on_course_deleted(payload: dict, settings: dict) -> None:
    if not settings.get("archive_on_delete", True):
        return
    course_id = payload["course_id"]
    mapping = await _mapping(course_id)
    if mapping is None or mapping["status"] != "ready" \
            or not mapping["aad_group_id"]:
        return
    await graph.archive_team(mapping["aad_group_id"], settings)
    await db.execute(
        "update msteams_course_team set status = 'archived', "
        "updated_at = now() where course_id = $1", course_id)
    await _publish_status(course_id, "archived")
