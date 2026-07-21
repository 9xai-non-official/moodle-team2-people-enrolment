"""Groups, groupings & group-scope service (Task 05 — Mahmoud).

The *third system*: groups never grant or remove capabilities — they decide
**who sees whom and whose records an action can touch**. Khaled's checker says
"the role permits grading"; this service says "but only these students are
reachable". Hard Cases 3 & 4 fall out of `group_access_check`.

Verified behaviour (Moodle `lib/grouplib.php`, findings in notes/groups-groupings.md):
  * GRP-012 (grouplib.php:743) — course `force_group_mode` overrides every
    activity's own mode; else the activity mode, falling back to course mode.
  * GRP-006 (grouplib.php:770-782) — effective `visible` OR `accessallgroups`
    => all groups; effective `separate` without it => only the actor's own groups.
  * GRP-002 — a grouping contains groups, never users (schema: no user column).
  * GRP-001 — group identity and membership are separate rows; deleting a group
    deletes memberships only.

Stack note: the real app (app/db.py) is **asyncpg**, not SQLAlchemy — every
function here is async and uses `db.fetch_all/fetch_one` with $1 placeholders.
The decision logic is factored into pure helpers (no I/O) so the persona×mode
matrix is unit-testable without a live database.

Dependency note: the enrolment guard (Yaman) and capability lookup (Khaled) are
not built yet. They are reached through the `_is_active_enrolled` /
`_has_accessallgroups` wrappers, which import the real service when it exists
and otherwise run a faithful local fallback. When those services land, only the
wrappers change — callers do not.
"""
from __future__ import annotations

from app import db

# Effective group modes (mirror the DB enum `group_mode` = 'none'|'separate'|'visible').
NONE = "none"
SEPARATE = "separate"
VISIBLE = "visible"


# ---------------------------------------------------------------------------
# Pure decision logic — no I/O, unit-testable (the persona × mode matrix).
# ---------------------------------------------------------------------------
def effective_mode(activity_mode: str | None, course_mode: str, force: bool) -> str:
    """GRP-012 — `grouplib.php:743`.

    force_group_mode on the course => the course mode wins for *every* activity
    and the activity's own setting is silently ignored; otherwise the activity
    mode, falling back to the course mode when the activity's is NULL (inherit).
    """
    if force:
        return course_mode
    return activity_mode if activity_mode is not None else course_mode


def resolve_allowed_group_ids(
    mode: str,
    access_all_groups: bool,
    universe_ids: list[int],
    actor_group_ids: list[int],
) -> list[int]:
    """GRP-006 — which groups the actor may act within, given the effective mode.

    * `visible` OR access-all-groups  -> the whole universe (all groups of the
      activity's grouping, else the course).
    * `separate` without the capability -> only the actor's own groups (∩ universe).
    * `none` -> no filtering; the whole universe is in scope.
    """
    universe = list(universe_ids)
    if mode == NONE:
        return universe
    if mode == VISIBLE or access_all_groups:
        return universe
    # separate, without access-all-groups
    universe_set = set(universe)
    return [gid for gid in actor_group_ids if gid in universe_set]


def scope_verdict(
    mode: str,
    forced: bool,
    actor_group_ids: list[int],
    target_group_ids: list[int],
    access_all_groups: bool,
    universe_ids: list[int],
) -> dict:
    """The core HC-3/HC-4 decision, as pure data. Returns the frozen contract
    shape (minus the group-name decoration, added by the async layer).

    Two distinct sets — Moodle keeps them separate and so must we:
      * SEE    — `separate` shows only your own groups; `visible` shows every
                 group participating in the activity; `none`/access-all shows all.
      * ACT-ON — always only your own groups, widened to all by access-all-groups
                 (`visible` lets you *see* other groups but *act* only in yours).
    A target whose groups are all outside the activity's universe (e.g. Group C
    when the activity is restricted to a grouping of A+B) is in neither set — the
    "not even visible" outcome of Hard Case 3.
    """
    universe = set(universe_ids)
    actor_own = set(actor_group_ids) & universe          # actor's participating groups
    target_groups = set(target_group_ids)
    hits_actor_own = bool(target_groups & actor_own)
    in_universe = bool(target_groups & universe)
    reasons: list[str] = []

    if mode == NONE:
        reasons.append("The activity is in No-groups mode; group scope does not restrict it.")
        visible = action_allowed = True
    elif access_all_groups:
        # access-all-groups widens SCOPE only — it never grants the action itself.
        reasons.append("The actor has access-all-groups, which reaches every group.")
        visible = action_allowed = True
    elif mode == VISIBLE:
        reasons.append("The activity uses Visible Groups.")
        visible = in_universe
        action_allowed = hits_actor_own
        if not in_universe:
            reasons.append("The target is not in any group participating in this activity.")
        elif not hits_actor_own:
            reasons.append("The actor may see other groups but can only act within their own group.")
    else:  # SEPARATE
        reasons.append("The activity uses Separate Groups.")
        visible = action_allowed = hits_actor_own
        if not hits_actor_own:
            # verbatim strings from the task contract (§4) — Team 3 may match on these
            reasons.append("The actor and target do not share an allowed Group.")
            reasons.append("The actor does not have access-all-groups.")

    if forced:
        reasons.append("This mode is forced at the course level; the activity's own setting is ignored.")

    return {
        "visible": visible,
        "action_allowed": action_allowed,
        "group_mode": mode,
        "course_mode_forced": forced,
        "access_all_groups": access_all_groups,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
# External-dependency wrappers (Yaman = enrolment, Khaled = permissions).
# Import the real service if present; otherwise a faithful local fallback so
# this module runs and tests before those services are merged.
# ---------------------------------------------------------------------------
async def _is_active_enrolled(user_id: int, course_id: int) -> bool:
    """Guard for add_member — Moodle's groups_add_member is_enrolled check.

    Prefers Yaman's `app.services.enrolment.is_active_enrolled`; falls back to a
    direct query (enrolment -> enrolment_method -> course, status='active',
    within any start/end window).
    """
    try:
        from app.services.enrolment import is_active_enrolled  # Yaman's service
    except Exception:
        row = await db.fetch_one(
            """
            select 1
              from enrolment e
              join enrolment_method em on em.id = e.method_id
             where e.user_id = $1
               and em.course_id = $2
               and e.status = 'active'
               and (e.time_start is null or e.time_start <= now())
               and (e.time_end   is null or e.time_end   >= now())
             limit 1
            """,
            user_id,
            course_id,
        )
        return row is not None
    # Yaman's frozen signature takes the db module first (arity crash found
    # live — the mirror image of the conn bug on his side of the seam).
    return await is_active_enrolled(db, user_id, course_id)


async def _has_accessallgroups(user_id: int, course_id: int) -> bool:
    """`moodle/site:accessallgroups` for this user in this course.

    Prefers Khaled's `app.services.permissions.has_capability`; falls back to a
    simplified resolution (an 'allow' at system/category/this-course context and
    no 'prohibit'). The full allow/prevent/prohibit + context-depth engine is
    Khaled's — this fallback is only good enough to demo HC-3 against the seed.
    """
    try:
        from app.services.permissions import has_capability  # Khaled's service
    except Exception:
        row = await db.fetch_one(
            """
            select coalesce(bool_or(rc.permission = 'prohibit'), false) as prohibited,
                   coalesce(bool_or(rc.permission = 'allow'),    false) as allowed
              from role_assignment ra
              join role_capability rc on rc.role_id = ra.role_id
              join context ctx        on ctx.id     = ra.context_id
             where ra.user_id = $1
               and rc.capability = 'moodle/site:accessallgroups'
               and (ctx.level = 'system'
                    or ctx.level = 'category'
                    or (ctx.level = 'course' and ctx.instance_id = $2))
            """,
            user_id,
            course_id,
        )
        return bool(row and row["allowed"] and not row["prohibited"])
    return await has_capability(user_id, "moodle/site:accessallgroups", course_id)


# ---------------------------------------------------------------------------
# Data access — groups, groupings, activity policy.
# ---------------------------------------------------------------------------
async def list_course_groups(course_id: int) -> list[dict]:
    return await db.fetch_all(
        """
        select g.id, g.course_id, g.name, g.id_number, g.description,
               g.enrolment_key is not null as has_enrolment_key,
               g.participation, g.created_at,
               (select count(*) from group_member m where m.group_id = g.id) as member_count
          from course_group g
         where g.course_id = $1
         order by g.name
        """,
        course_id,
    )


async def group_members(group_id: int) -> list[dict]:
    return await db.fetch_all(
        """
        select m.group_id, m.user_id, u.username,
               u.first_name, u.last_name,
               m.component, m.item_id, m.added_at,
               (m.component = '') as manual
          from group_member m
          join app_user u on u.id = m.user_id
         where m.group_id = $1
         order by u.last_name, u.first_name
        """,
        group_id,
    )


async def _group_course_id(group_id: int) -> int | None:
    row = await db.fetch_one("select course_id from course_group where id = $1", group_id)
    return row["course_id"] if row else None


async def user_groups(user_id: int, course_id: int) -> list[dict]:
    """All groups a user belongs to in one course (a user may be in many — HC-4)."""
    return await db.fetch_all(
        """
        select g.id, g.name
          from group_member m
          join course_group g on g.id = m.group_id
         where m.user_id = $1 and g.course_id = $2
         order by g.name
        """,
        user_id,
        course_id,
    )


async def activity_policy(activity_id: int) -> dict | None:
    """Configured + effective mode for an activity (GRP-012 as data)."""
    row = await db.fetch_one(
        """
        select ca.id as activity_id, ca.course_id, ca.grouping_id,
               ca.group_mode as configured_mode,
               c.group_mode  as course_mode,
               c.force_group_mode
          from course_activity ca
          join course c on c.id = ca.course_id
         where ca.id = $1
        """,
        activity_id,
    )
    if row is None:
        return None
    eff = effective_mode(row["configured_mode"], row["course_mode"], row["force_group_mode"])
    grouping = None
    if row["grouping_id"] is not None:
        grouping = await db.fetch_one(
            "select id, name from grouping where id = $1", row["grouping_id"]
        )
    return {
        "activity_id": row["activity_id"],
        "course_id": row["course_id"],
        "configured_mode": row["configured_mode"],  # NULL = inherit
        "effective_mode": eff,
        "course_mode_forced": row["force_group_mode"],
        "grouping": grouping,
    }


async def _universe_group_ids(course_id: int, grouping_id: int | None) -> list[int]:
    """The set of groups an activity draws from: the grouping's groups if it is
    grouping-restricted, else every group in the course (GRP §3 restriction)."""
    if grouping_id is not None:
        rows = await db.fetch_all(
            "select group_id as id from grouping_group where grouping_id = $1", grouping_id
        )
    else:
        rows = await db.fetch_all(
            "select id from course_group where course_id = $1", course_id
        )
    return [r["id"] for r in rows]


async def allowed_groups(user_id: int, activity_id: int) -> dict:
    """Which groups the user may act within, for this activity (GRP-006)."""
    pol = await activity_policy(activity_id)
    if pol is None:
        return {"error": "unknown activity"}
    course_id = pol["course_id"]
    universe = await _universe_group_ids(course_id, pol["grouping"] and pol["grouping"]["id"])
    aag = await _has_accessallgroups(user_id, course_id)
    mine = [g["id"] for g in await user_groups(user_id, course_id)]
    allowed_ids = resolve_allowed_group_ids(pol["effective_mode"], aag, universe, mine)
    names = await _names_for(allowed_ids)
    return {
        "activity_id": activity_id,
        "effective_mode": pol["effective_mode"],
        "access_all_groups": aag,
        "groups": [{"id": gid, "name": names.get(gid)} for gid in allowed_ids],
    }


async def _names_for(group_ids: list[int]) -> dict[int, str]:
    if not group_ids:
        return {}
    rows = await db.fetch_all(
        "select id, name from course_group where id = any($1::bigint[])", group_ids
    )
    return {r["id"]: r["name"] for r in rows}


# ---------------------------------------------------------------------------
# The centrepiece — scope decisions (consumed by Khaled's gate 7 + Team 3).
# ---------------------------------------------------------------------------
async def shares_group(actor_id: int, target_id: int, activity_id: int) -> dict:
    pol = await activity_policy(activity_id)
    if pol is None:
        return {"error": "unknown activity"}
    course_id = pol["course_id"]
    universe = await _universe_group_ids(course_id, pol["grouping"] and pol["grouping"]["id"])
    aag = await _has_accessallgroups(actor_id, course_id)
    actor_groups = await user_groups(actor_id, course_id)
    target_groups = await user_groups(target_id, course_id)

    verdict = scope_verdict(
        pol["effective_mode"],
        pol["course_mode_forced"],
        [g["id"] for g in actor_groups],
        [g["id"] for g in target_groups],
        aag,
        universe,
    )
    verdict["actor_groups"] = [g["name"] for g in actor_groups]
    verdict["target_groups"] = [g["name"] for g in target_groups]
    return verdict


async def group_access_check(
    actor_id: int, target_id: int, activity_id: int, action: str
) -> dict:
    """The full §5 verdict with reasons — the frozen contract Khaled's gate 7 and
    Team 3 consume. `action` is echoed for the caller; groups never *grant* the
    action (that is Khaled's capability gate), they only scope its target set.
    """
    verdict = await shares_group(actor_id, target_id, activity_id)
    if "error" in verdict:
        return verdict
    verdict["action"] = action
    verdict["note"] = (
        "Group scope only. Whether the actor may perform this action at all is a "
        "capability decision (Khaled's gate); this verdict says whether the target "
        "is within the actor's group scope."
    )
    return verdict


# ---------------------------------------------------------------------------
# Membership writes — this service is the SOLE writer of group_member.
# ---------------------------------------------------------------------------
async def add_member(group_id: int, user_id: int, component: str = "", item_id: int = 0) -> dict:
    """SA-GRP-004 — refuse unless the user has an ACTIVE enrolment in the group's
    course (Moodle's is_enrolled guard). This is the load-bearing difference
    between a cohort (site bag) and a group (course partition)."""
    course_id = await _group_course_id(group_id)
    if course_id is None:
        return {"ok": False, "reason": "group does not exist"}
    if not await _is_active_enrolled(user_id, course_id):
        return {"ok": False, "reason": "user has no active enrolment in this course"}
    await db.fetch_one(
        """
        insert into group_member (group_id, user_id, component, item_id)
        values ($1, $2, $3, $4)
        on conflict (group_id, user_id) do nothing
        returning group_id
        """,
        group_id,
        user_id,
        component,
        item_id,
    )
    return {"ok": True, "group_id": group_id, "user_id": user_id, "component": component}


async def remove_member(group_id: int, user_id: int, force: bool = False) -> dict:
    """SA-GRP-006 — component-owned (machine-added) rows refuse normal removal
    unless force=True, so an unenrol/sync stays the source of truth."""
    row = await db.fetch_one(
        "select component from group_member where group_id = $1 and user_id = $2",
        group_id,
        user_id,
    )
    if row is None:
        return {"ok": False, "reason": "not a member"}
    if row["component"] and not force:
        return {
            "ok": False,
            "reason": f"membership is owned by '{row['component']}'; pass force=true to override",
            "component": row["component"],
        }
    await db.fetch_one(
        "delete from group_member where group_id = $1 and user_id = $2 returning group_id",
        group_id,
        user_id,
    )
    return {"ok": True}


async def remove_members_by_provenance(
    course_id: int, user_id: int, component: str, item_id: int
) -> int:
    """Yaman calls this on a single-path unenrol: drop only the memberships that
    that enrolment method created."""
    rows = await db.fetch_all(
        """
        delete from group_member m
         using course_group g
         where m.group_id = g.id
           and g.course_id = $1
           and m.user_id = $2
           and m.component = $3
           and m.item_id = $4
        returning m.group_id
        """,
        course_id,
        user_id,
        component,
        item_id,
    )
    return len(rows)


async def remove_all_memberships(course_id: int, user_id: int) -> int:
    """Yaman calls this on a LAST-path unenrol: whole-course group cleanup."""
    rows = await db.fetch_all(
        """
        delete from group_member m
         using course_group g
         where m.group_id = g.id and g.course_id = $1 and m.user_id = $2
        returning m.group_id
        """,
        course_id,
        user_id,
    )
    return len(rows)


# ---------------------------------------------------------------------------
# Group / grouping CRUD  (GRP-001: identity vs membership are separate rows).
# ---------------------------------------------------------------------------
async def create_group(course_id: int, name: str, id_number: str | None = None,
                       enrolment_key: str | None = None) -> dict:
    return await db.fetch_one(
        """
        insert into course_group (course_id, name, id_number, enrolment_key)
        values ($1, $2, $3, $4)
        returning id, course_id, name, id_number, participation, created_at
        """,
        course_id, name, id_number, enrolment_key,
    )


async def delete_group(group_id: int) -> dict:
    """Deletes the group; group_member rows cascade. Enrolments and users are
    never touched (GRP-001)."""
    row = await db.fetch_one(
        "delete from course_group where id = $1 returning id", group_id
    )
    return {"ok": row is not None}


async def list_groupings(course_id: int) -> list[dict]:
    return await db.fetch_all(
        """
        select gr.id, gr.course_id, gr.name, gr.description,
               coalesce(array_agg(gg.group_id) filter (where gg.group_id is not null), '{}') as group_ids
          from grouping gr
          left join grouping_group gg on gg.grouping_id = gr.id
         where gr.course_id = $1
         group by gr.id
         order by gr.name
        """,
        course_id,
    )


async def set_activity_group_policy(
    activity_id: int, group_mode: str | None = "__keep__", grouping_id: int | None = "__keep__"
) -> dict | None:
    """PATCH the only two columns this service owns on course_activity."""
    sets, args, n = [], [], 1
    if group_mode != "__keep__":
        sets.append(f"group_mode = ${n}")
        args.append(group_mode)
        n += 1
    if grouping_id != "__keep__":
        sets.append(f"grouping_id = ${n}")
        args.append(grouping_id)
        n += 1
    if not sets:
        return await activity_policy(activity_id)
    args.append(activity_id)
    await db.fetch_one(
        f"update course_activity set {', '.join(sets)} where id = ${n} returning id", *args
    )
    return await activity_policy(activity_id)
