"""Permission engine — Team 2 / Khaled (roles, contexts, capabilities).

Re-implements Moodle's permission resolution *with the reasoning exposed*: the
resolver never just says "no", it says WHY, naming the role, the value, and the
deciding context, with every gate's evidence attached.

Design: policy is separated from I/O.
  * The PURE CORE (this top section) is plain, synchronous, dependency-free
    functions over already-fetched data. It holds all the load-bearing logic
    (the §8.4 conflict cases) and is unit-tested without a database.
  * The ASYNC DB LAYER (bottom section) fetches rows via app.db (asyncpg) and
    calls the pure core. It is what the routers import.

Verified against Moodle's lib/accesslib.php, the team's in-DB fn_can(), and the
findings docs. Key rules:
  - "not set" (row absent) = INHERIT, never deny.
  - Within a role: most-specific row on the path wins, EXCEPT prohibit is
    sticky (un-overridable by a deeper allow).
  - Across roles: any allow wins (C-11 — prevent does not cross-cancel allow);
    only prohibit is an absolute veto.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Optional

# ---------------------------------------------------------------------------
# Permission values (mirror the DB enum cap_permission). "not set" = no row.
# ---------------------------------------------------------------------------
ALLOW = "allow"
PREVENT = "prevent"
PROHIBIT = "prohibit"


@dataclass(frozen=True)
class CapRow:
    """A single role_capability row, projected to what the resolver needs:
    "role R says <permission> about the capability at context X (and below)."
    """

    role_id: int
    context_id: int
    permission: str  # allow | prevent | prohibit


@dataclass
class RoleDecision:
    """How one held role resolved for the capability being checked."""

    role_id: int
    value: Optional[str]  # allow | prevent | prohibit | None (= not set / inherit)
    decided_at: Optional[int]  # context_id where the winning row sat, else None


@dataclass
class CapabilityResult:
    """Outcome of resolving one capability along one context path."""

    allowed: bool
    reason: str
    role_decisions: dict[int, RoleDecision] = field(default_factory=dict)
    prohibits: list[tuple[int, int]] = field(default_factory=list)  # (role_id, context_id)


def resolve_capability(
    path: list[int],
    held_role_ids: Iterable[int],
    cap_rows: Iterable[CapRow],
) -> CapabilityResult:
    """The core §8.3 steps 7-9 resolution.

    Args:
        path: context ids for this check, MOST-SPECIFIC-FIRST, e.g.
            [activity_ctx, course_ctx, category_ctx, system_ctx].
        held_role_ids: the roles the actor holds (assignments already collected
            from any context on the path, plus the synthesized 'user' role).
        cap_rows: every role_capability row for the capability being checked
            (any role, any context — the resolver filters to held roles / path).

    Returns a full CapabilityResult so callers can build evidence.
    """
    # Preserve order, drop duplicates.
    held: list[int] = list(dict.fromkeys(held_role_ids))
    path_index = {ctx: i for i, ctx in enumerate(path)}  # 0 = most specific

    # Bucket the relevant rows per held role (on-path only).
    rows_by_role: dict[int, list[CapRow]] = {r: [] for r in held}
    for row in cap_rows:
        if row.role_id in rows_by_role and row.context_id in path_index:
            rows_by_role[row.role_id].append(row)

    role_decisions: dict[int, RoleDecision] = {}
    prohibits: list[tuple[int, int]] = []

    for role in held:
        rows = rows_by_role[role]
        prohibit_rows = [r for r in rows if r.permission == PROHIBIT]
        if prohibit_rows:
            # Prohibit is sticky: it wins regardless of any deeper allow/prevent.
            best = min(prohibit_rows, key=lambda r: path_index[r.context_id])
            role_decisions[role] = RoleDecision(role, PROHIBIT, best.context_id)
            prohibits.append((role, best.context_id))
        elif rows:
            # Most-specific row wins (smallest path index).
            best = min(rows, key=lambda r: path_index[r.context_id])
            role_decisions[role] = RoleDecision(role, best.permission, best.context_id)
        else:
            role_decisions[role] = RoleDecision(role, None, None)  # not set / inherit

    # Aggregate across roles.
    if prohibits:
        v_role, v_ctx = prohibits[0]
        return CapabilityResult(
            allowed=False,
            reason=f"PROHIBIT veto by role {v_role} at context {v_ctx} "
            f"— un-overridable anywhere below",
            role_decisions=role_decisions,
            prohibits=prohibits,
        )

    allowing = [d for d in role_decisions.values() if d.value == ALLOW]
    if allowing:
        d = allowing[0]
        return CapabilityResult(
            allowed=True,
            reason=f"role {d.role_id} grants this capability (allow) at "
            f"context {d.decided_at}; no role prohibits",
            role_decisions=role_decisions,
            prohibits=prohibits,
        )

    any_value = any(d.value is not None for d in role_decisions.values())
    reason = (
        "roles are held here but none resolves to ALLOW (default deny)"
        if any_value
        else "no role grants this capability here (default deny)"
    )
    return CapabilityResult(
        allowed=False,
        reason=reason,
        role_decisions=role_decisions,
        prohibits=prohibits,
    )


# ===========================================================================
# The gate pipeline (§3 / §17.3). A capability being true is NECESSARY but not
# SUFFICIENT — check() runs eight gates and each appends evidence whether it
# passed or failed, then returns the frozen /check response contract.
# ===========================================================================

# Capability names as they are ACTUALLY seeded in this DB (short form). The task
# brief writes them Moodle-style (moodle/course:view etc.); these constants are
# the single place the mapping lives, so the resolver stays data-driven.
CAP_COURSE_VIEW = "course:view"  # brief: moodle/course:view — the course-door key
CAP_ACCESS_ALL_GROUPS = "site:accessallgroups"  # brief: moodle/site:accessallgroups
CAP_ROLE_ASSIGN = "role:assign"  # brief: moodle/role:assign — assign-UI gate
CAP_ROLE_OVERRIDE = "role:override"  # gate for changing what a role can do (seeded)
# Managing role DEFINITIONS (create/clone) is Moodle's moodle/role:manage — a
# system-level capability. It is NOT in the current seed, so require_capability
# fails CLOSED for everyone except a site admin until it is seeded (see the
# change request). Referenced by its real Moodle short-name, never invented as data.
CAP_ROLE_MANAGE = "role:manage"
# Explaining a permission decision ABOUT ANOTHER USER via /check is gated behind
# this seeded capability (staff have it, students do not); admin bypasses.
CAP_VIEW_OTHER = "user:viewdetails"

# A guest is hard-blocked from write capabilities and from anything carrying one
# of these risks (§8.3 step 4).
GUEST_BLOCK_RISKS = {"xss", "config", "dataloss"}


@dataclass
class CheckInput:
    """All facts a full check() needs, already fetched from the DB by the async
    layer. Kept as a plain dataclass so the whole gate pipeline is unit-testable
    without a database. Auxiliary capabilities (course:view, accessallgroups)
    arrive pre-resolved as booleans; the *target* capability is resolved here so
    its per-role evidence is rich.
    """

    capability: str
    cap_known: bool = True
    cap_type: str = "write"
    cap_risks: list[str] = field(default_factory=list)
    path: list[int] = field(default_factory=list)  # context ids, most-specific first
    context_labels: dict[int, str] = field(default_factory=dict)  # ctx_id -> "course:1"
    # roles the actor holds: [{role_id, role, context, provenance}] incl. virtual 'user'
    roles_considered: list[dict] = field(default_factory=list)
    cap_rows: list[CapRow] = field(default_factory=list)  # rows for the TARGET capability
    # account / identity state
    actor_deleted: bool = False
    actor_suspended: bool = False
    is_admin: bool = False
    is_guest: bool = False
    doanything: bool = True
    simulate_role_id: Optional[int] = None
    # course door
    has_course: bool = True
    enrolment_paths: list[dict] = field(default_factory=list)  # Yaman: active_paths()
    course_view_allowed: bool = False  # resolved course:view == allow?
    # target participation
    target_id: Optional[int] = None
    target_enrolled: Optional[bool] = None
    # group scope (Mahmoud: shares_group / allowed_groups)
    activity_id: Optional[int] = None
    group_mode: Optional[str] = None  # none | separate | visible
    actor_groups: list[str] = field(default_factory=list)
    target_groups: list[str] = field(default_factory=list)
    access_all_groups: bool = False  # actor's resolved accessallgroups == allow
    # activity state
    activity_visible: Optional[bool] = None
    activity_deleted: bool = False


def build_decision(inp: CheckInput) -> dict:
    """Run the eight gates in order and return the frozen /check response.

    Gates 1 (account/validity) and 2 (admin bypass) short-circuit; gates 3-8
    all evaluate and accumulate evidence so the UI can show, e.g., a green
    capability gate beside a red group gate simultaneously — the whole story of
    the project (scenario 3).
    """
    blocking: list[str] = []
    supporting: list[str] = []

    held_role_ids = [r["role_id"] for r in inp.roles_considered]
    role_name = {r["role_id"]: r["role"] for r in inp.roles_considered}
    simulated_role = (
        role_name.get(inp.simulate_role_id) if inp.simulate_role_id is not None else None
    )

    # Resolve the target capability now (pure core) — always, for evidence.
    cap_result = resolve_capability(inp.path, held_role_ids, inp.cap_rows)
    capability_values: dict[str, dict] = {}
    for rid in held_role_ids:
        d = cap_result.role_decisions.get(rid)
        if d is None:
            continue
        capability_values[role_name.get(rid, str(rid))] = {
            "value": d.value,
            "decided_at": inp.context_labels.get(d.decided_at) if d.decided_at else None,
        }
    prohibits_found = [
        {"role": role_name.get(rid, str(rid)), "context": inp.context_labels.get(ctx, str(ctx))}
        for (rid, ctx) in cap_result.prohibits
    ]
    contexts_considered = [inp.context_labels.get(c, str(c)) for c in inp.path]

    group_scope = {
        "mode": inp.group_mode,
        "actor_groups": inp.actor_groups,
        "target_groups": inp.target_groups,
        "shared": None,
        "access_all_groups": inp.access_all_groups,
    }
    admin_bypass = False

    def finalize(allowed: bool) -> dict:
        return {
            "allowed": allowed,
            "decision": "ALLOW" if allowed else "DENY",
            "blocking_reasons": blocking,
            "supporting_reasons": supporting,
            "enrolment_paths": inp.enrolment_paths,
            "roles_considered": [
                {
                    "role": r["role"],
                    "context": r.get("context"),
                    "provenance": r.get("provenance", ""),
                }
                for r in inp.roles_considered
            ],
            "contexts_considered": contexts_considered,
            "capability_values": capability_values,
            "prohibits_found": prohibits_found,
            "group_scope": group_scope,
            "admin_bypass": admin_bypass,
            "simulated_role": simulated_role,
        }

    # -- gate 1: account state + capability validity (hard stops) -----------
    if inp.actor_deleted:
        blocking.append("Account is deleted — no access")
        return finalize(False)
    if inp.actor_suspended:
        blocking.append("Account is suspended — cannot log in")
        return finalize(False)
    if not inp.cap_known:
        blocking.append(f"Unknown capability '{inp.capability}' — not in the catalogue")
        return finalize(False)
    supporting.append("Account active (not suspended, not deleted)")

    # -- gate 2: admin bypass (suppressed while simulating a role) -----------
    if inp.is_admin and inp.doanything and inp.simulate_role_id is None:
        admin_bypass = True
        supporting.append(
            "Site administrator bypass (config list, not a role) — all checks pass"
        )
        return finalize(True)
    if inp.is_admin and inp.simulate_role_id is not None:
        supporting.append(
            f"Admin bypass SUPPRESSED — previewing as role '{simulated_role}' (honest preview)"
        )

    # -- gate 3: guest gate -------------------------------------------------
    if inp.is_guest and (
        inp.cap_type == "write" or (set(inp.cap_risks) & GUEST_BLOCK_RISKS)
    ):
        blocking.append(
            "Guest is hard-blocked from write/risky actions "
            f"(capability '{inp.capability}' is {inp.cap_type})"
        )
    elif inp.is_guest:
        supporting.append("Guest allowed for this read/low-risk capability")

    # -- gate 4: course door ------------------------------------------------
    if inp.has_course:
        if inp.enrolment_paths:
            supporting.append(
                f"Course door: actively enrolled via {len(inp.enrolment_paths)} path(s)"
            )
        elif inp.course_view_allowed:
            supporting.append(
                "Course door: opened via course:view — not a participant / not enrolled"
            )
        elif inp.is_admin and inp.simulate_role_id is None and inp.doanything:
            # Real admin acting as themselves only — never during a role-switch
            # preview, or the suppressed bypass would leak back in here.
            supporting.append("Course door: administrator")
        else:
            blocking.append(
                "Course door: not enrolled and no course:view — cannot enter the course"
            )

    # -- gate 5: capability (the §8.3 algorithm) ----------------------------
    if cap_result.prohibits:
        blocking.append(cap_result.reason)
    elif not cap_result.allowed:
        blocking.append(f"Capability '{inp.capability}': {cap_result.reason}")
    else:
        supporting.append(f"Capability '{inp.capability}': {cap_result.reason}")

    # -- gate 6: target participation (only meaningful inside a course) -----
    if inp.target_id is not None and inp.has_course:
        if inp.target_enrolled:
            supporting.append(f"Target user {inp.target_id} is actively enrolled")
        else:
            blocking.append(f"Target user {inp.target_id} is not a participant of this course")

    # -- gate 7: group scope (accessallgroups short-circuits) ---------------
    if inp.target_id is not None and inp.activity_id is not None and inp.has_course:
        shared = bool(set(inp.actor_groups) & set(inp.target_groups))
        group_scope["shared"] = shared
        if inp.access_all_groups:
            supporting.append("Group scope: accessallgroups — may act across all groups")
        elif inp.group_mode != "separate":
            supporting.append(
                f"Group scope: group mode '{inp.group_mode}' imposes no separation"
            )
        elif shared:
            supporting.append("Group scope: actor and target share a group")
        else:
            blocking.append(
                "Target is outside the actor's allowed groups "
                "(separate mode, no accessallgroups)"
            )

    # -- gate 8: activity state ---------------------------------------------
    if inp.activity_id is not None:
        if inp.activity_deleted:
            blocking.append(f"Activity {inp.activity_id} is deleted")
        elif inp.activity_visible is False:
            blocking.append(f"Activity {inp.activity_id} is hidden")
        else:
            supporting.append(f"Activity {inp.activity_id} is visible")

    return finalize(len(blocking) == 0)


# ===========================================================================
# ASYNC DB LAYER — the public API the routers import. Fetches rows from the
# real schema via app.db (asyncpg) and calls the pure core above. Everything
# here is SELECT-only against tables owned by other teammates; the only tables
# this module WRITES are role_assignment (component=''), role_capability, and
# its own permission_decision audit table (§2).
# ===========================================================================
import os  # noqa: E402

# The site-admin list — a CONFIG list, exactly like Moodle's $CFG->siteadmins.
# NOT a role, NOT a table. Seed via env ADMIN_IDS="1,7" and/or usernames below.
ADMIN_USERNAMES = {"admin", "admin1"}
GUEST_USERNAMES = {"guest"}
VIRTUAL_USER_ROLE_ID = -1  # synthesized when no real 'user' role exists in the DB

# permission_decision is the Decision-Log sink. It is NOT in the frozen
# schema.sql. The application MUST NOT author DDL at runtime (a schema is owned
# by the schema owner, not created ad hoc from request handling); this DDL is
# exported ONLY so it can be applied as a migration / change request. If the
# table is absent, logging is best-effort and silently no-ops — the verdict
# still stands. (Change request: add this table to schema.sql.)
PERMISSION_DECISION_DDL = """
create table if not exists permission_decision (
    id          bigint generated always as identity primary key,
    actor_id    bigint,
    capability  varchar(255),
    context_id  bigint,
    target_id   bigint,
    allowed     boolean not null,
    reasons     jsonb not null default '{}'::jsonb,
    decided_at  timestamptz not null default now()
);
"""


def _admin_ids_from_env() -> set[int]:
    out: set[int] = set()
    for tok in os.environ.get("ADMIN_IDS", "").split(","):
        tok = tok.strip()
        if tok.lstrip("-").isdigit():
            out.add(int(tok))
    return out


def _resolve_db(db):
    """Allow callers to pass the app.db module (or a compatible object exposing
    async fetch_all/fetch_one); default to the real pool when given None."""
    if db is not None:
        return db
    from app import db as app_db  # lazy: keeps the pure core import dependency-free

    return app_db


def _parse_path(path_str: str) -> list[int]:
    """context.path is '/1/3/9' (root->leaf context ids). Return most-specific
    first: [9, 3, 1]."""
    ids = [int(p) for p in path_str.split("/") if p.strip().isdigit()]
    ids.reverse()
    return ids


# The context tree and capability definitions are immutable at runtime (a
# context's id/level/instance/path never change; capability rows are seed
# data). Caching them removes ~3 DB round-trips from every has_capability call
# — the dominant cost over a high-latency link. NOT cached: role_capability /
# role_assignment, which change whenever a role is edited (the roles app's
# whole point). A process restart clears these, so a schema/seed change is
# picked up on the next boot.
_CTX_CHAIN_CACHE: dict[int, tuple] = {}
_CAP_CACHE: dict[str, dict | None] = {}


async def _load_context_chain(db, context_id: int):
    """Return (path_ids_most_specific_first, context_labels, chain_rows)."""
    cached = _CTX_CHAIN_CACHE.get(context_id)
    if cached is not None:
        return cached
    ctx = await db.fetch_one(
        "select id, level, instance_id, path, depth from context where id=$1",
        context_id,
    )
    if not ctx:
        return [], {}, []  # not cached — the context may appear later
    path_ids = _parse_path(ctx["path"]) or [context_id]
    rows = await db.fetch_all(
        "select id, level, instance_id from context where id = any($1::bigint[])",
        path_ids,
    )
    labels = {r["id"]: f"{r['level']}:{r['instance_id']}" for r in rows}
    by_level = {r["level"]: r for r in rows}
    result = (path_ids, labels, by_level)
    _CTX_CHAIN_CACHE[context_id] = result
    return result


async def _load_capability(db, name: str):
    if name in _CAP_CACHE:
        return _CAP_CACHE[name]
    row = await db.fetch_one(
        "select name, cap_type, min_context_level, risks from capability where name=$1",
        name,
    )
    if row is not None:  # don't cache a miss — the cap may be seeded later
        _CAP_CACHE[name] = row
    return row


async def _load_cap_rows(db, capability: str, path_ids: list[int]) -> list[CapRow]:
    rows = await db.fetch_all(
        "select role_id, context_id, permission from role_capability "
        "where capability=$1 and context_id = any($2::bigint[])",
        capability,
        path_ids,
    )
    return [CapRow(r["role_id"], r["context_id"], r["permission"]) for r in rows]


async def _held_roles(db, user_id: int, path_ids: list[int], labels: dict,
                      is_guest: bool, simulate_role: Optional[int]):
    """The roles the actor holds for evaluation, as response-ready dicts
    [{role_id, role, context, provenance}]. Applies simulation and the
    synthesized virtual 'user' role."""
    if simulate_role is not None:
        name = await db.fetch_one("select short_name from role where id=$1", simulate_role)
        held = [{
            "role_id": simulate_role,
            "role": name["short_name"] if name else str(simulate_role),
            # A role switch is scoped to the context being previewed: the leaf
            # (most-specific), not the root. path_ids is most-specific-first.
            "context": labels.get(path_ids[0]) if path_ids else None,
            "provenance": "simulated (role switch)",
        }]
    else:
        rows = await db.fetch_all(
            "select ra.role_id, r.short_name, ra.context_id, ra.component "
            "from role_assignment ra join role r on r.id = ra.role_id "
            "where ra.user_id=$1 and ra.context_id = any($2::bigint[])",
            user_id, path_ids,
        )
        held = [{
            "role_id": r["role_id"],
            "role": r["short_name"],
            "context": labels.get(r["context_id"], str(r["context_id"])),
            "provenance": r["component"] or "manual",
        } for r in rows]

    # Every non-guest actor virtually holds the 'user' role at system (no DB row).
    if not is_guest:
        urole = await db.fetch_one("select id, short_name from role where short_name='user'")
        uid = urole["id"] if urole else VIRTUAL_USER_ROLE_ID
        sys_ctx = path_ids[-1] if path_ids else None
        held.append({
            "role_id": uid,
            "role": "user",
            "context": labels.get(sys_ctx, "system") if sys_ctx else "system",
            "provenance": "virtual (authenticated user)",
        })
    return held


async def _account_and_identity(db, user_id: int):
    u = await db.fetch_one(
        "select id, username, suspended, deleted_at from app_user where id=$1", user_id
    )
    if not u:
        return {"exists": False, "deleted": True, "suspended": False,
                "is_admin": False, "is_guest": False}
    is_admin = (u["id"] in _admin_ids_from_env()) or (u["username"] in ADMIN_USERNAMES)
    is_guest = u["username"] in GUEST_USERNAMES
    return {
        "exists": True,
        "deleted": u["deleted_at"] is not None,
        "suspended": bool(u["suspended"]),
        "is_admin": is_admin,
        "is_guest": is_guest,
    }


async def _resolve_allow(db, capability: str, path_ids: list[int], held_ids: list[int]) -> bool:
    """True iff `capability` resolves to allow for these held roles on this path
    (used for the auxiliary caps: course:view and accessallgroups)."""
    rows = await _load_cap_rows(db, capability, path_ids)
    return resolve_capability(path_ids, held_ids, rows).allowed


async def _enrolment_paths(db, user_id: int, course_id: Optional[int]) -> list[dict]:
    """Prefer Yaman's enrolment service; fall back to the v_enrolment_detail
    view. SELECT-only either way — never writes enrolment tables."""
    if course_id is None:
        return []
    try:
        from app.services import enrolment as _es  # Yaman's service, when it exists
        if hasattr(_es, "active_paths"):
            res = _es.active_paths(db, user_id, course_id)
            return await res if hasattr(res, "__await__") else res
    except Exception:
        pass
    rows = await db.fetch_all(
        "select method as kind, enrolment_status as status, "
        "(time_start is null or time_start<=now()) and "
        "(time_end is null or time_end>now()) as window_ok "
        "from v_enrolment_detail where user_id=$1 and course_id=$2 and live",
        user_id, course_id,
    )
    return [dict(r) for r in rows]


async def _is_participant(db, user_id: int, course_id: Optional[int]) -> bool:
    if course_id is None:
        return False
    row = await db.fetch_one(
        "select enrolled from v_course_participant where user_id=$1 and course_id=$2",
        user_id, course_id,
    )
    return bool(row and row["enrolled"])


async def _group_facts(db, user_id, target_id, activity_id, course_id):
    """(group_mode, actor_groups, target_groups). Prefers Mahmoud's group
    service; falls back to group_member/course_group + effective group mode."""
    try:
        from app.services import groups as _gs  # Mahmoud's service, when it exists
        if hasattr(_gs, "shares_group") and hasattr(_gs, "allowed_groups"):
            ag = _gs.allowed_groups(db, user_id, activity_id)
            tg = _gs.allowed_groups(db, target_id, activity_id)
            ag = await ag if hasattr(ag, "__await__") else ag
            tg = await tg if hasattr(tg, "__await__") else tg
            mode = await _effective_group_mode(db, activity_id, course_id)
            return mode, ag, tg
    except Exception:
        pass
    mode = await _effective_group_mode(db, activity_id, course_id)
    actor_groups = await _groups_for(db, user_id, course_id)
    target_groups = await _groups_for(db, target_id, course_id)
    return mode, actor_groups, target_groups


async def _groups_for(db, user_id, course_id) -> list[str]:
    if user_id is None or course_id is None:
        return []
    rows = await db.fetch_all(
        "select cg.name from group_member gm join course_group cg on cg.id=gm.group_id "
        "where gm.user_id=$1 and cg.course_id=$2",
        user_id, course_id,
    )
    return [r["name"] for r in rows]


async def _effective_group_mode(db, activity_id, course_id) -> Optional[str]:
    """Moodle rule: course.force_group_mode wins; else activity mode overrides
    course mode (activity NULL = inherit course)."""
    course = await db.fetch_one(
        "select group_mode, force_group_mode from course where id=$1", course_id
    ) if course_id else None
    activity = await db.fetch_one(
        "select group_mode from course_activity where id=$1", activity_id
    ) if activity_id else None
    if course and course["force_group_mode"]:
        return course["group_mode"]
    if activity and activity["group_mode"] is not None:
        return activity["group_mode"]
    return course["group_mode"] if course else None


async def _gather(db, actor_id, capability, context_id, target_id, activity_id, simulate_role):
    """Fetch every fact a full check needs and return a populated CheckInput."""
    ident = await _account_and_identity(db, actor_id)
    cap = await _load_capability(db, capability)
    path_ids, labels, by_level = await _load_context_chain(db, context_id)

    held = await _held_roles(db, actor_id, path_ids, labels, ident["is_guest"], simulate_role)
    held_ids = [h["role_id"] for h in held]
    cap_rows = await _load_cap_rows(db, capability, path_ids)

    course_ctx = by_level.get("course")
    activity_ctx = by_level.get("activity")
    course_id = course_ctx["instance_id"] if course_ctx else None
    has_course = course_ctx is not None or activity_ctx is not None
    # activity_id defaults to the activity context's instance if not passed.
    if activity_id is None and activity_ctx is not None:
        activity_id = activity_ctx["instance_id"]

    enrol_paths = await _enrolment_paths(db, actor_id, course_id)
    course_view_allowed = await _resolve_allow(db, CAP_COURSE_VIEW, path_ids, held_ids)

    target_enrolled = None
    if target_id is not None:
        target_enrolled = await _is_participant(db, target_id, course_id)

    group_mode = None
    actor_groups: list[str] = []
    target_groups: list[str] = []
    access_all = False
    if target_id is not None and activity_id is not None:
        group_mode, actor_groups, target_groups = await _group_facts(
            db, actor_id, target_id, activity_id, course_id
        )
        access_all = await _resolve_allow(db, CAP_ACCESS_ALL_GROUPS, path_ids, held_ids)

    activity_visible = None
    activity_deleted = False
    if activity_id is not None:
        arow = await db.fetch_one(
            "select visible, deleted_at from course_activity where id=$1", activity_id
        )
        if arow:
            activity_visible = bool(arow["visible"])
            activity_deleted = arow["deleted_at"] is not None

    return CheckInput(
        capability=capability,
        cap_known=cap is not None,
        cap_type=cap["cap_type"] if cap else "write",
        cap_risks=list(cap["risks"]) if cap else [],
        path=path_ids,
        context_labels=labels,
        roles_considered=held,
        cap_rows=cap_rows,
        actor_deleted=ident["deleted"],
        actor_suspended=ident["suspended"],
        is_admin=ident["is_admin"],
        is_guest=ident["is_guest"],
        simulate_role_id=simulate_role,
        has_course=has_course,
        enrolment_paths=enrol_paths,
        course_view_allowed=course_view_allowed,
        target_id=target_id,
        target_enrolled=target_enrolled,
        activity_id=activity_id,
        group_mode=group_mode,
        actor_groups=actor_groups,
        target_groups=target_groups,
        access_all_groups=access_all,
        activity_visible=activity_visible,
        activity_deleted=activity_deleted,
    )


async def _log_decision(db, actor_id, capability, context_id, target_id, response):
    """Append-only Decision Log. Best-effort: a missing table or DB never breaks
    a check, and the app never creates the table itself (see PERMISSION_DECISION_DDL
    — that is a migration, not runtime DDL)."""
    try:
        import json

        await db.fetch_one(
            "insert into permission_decision "
            "(actor_id, capability, context_id, target_id, allowed, reasons) "
            "values ($1,$2,$3,$4,$5,$6::jsonb) returning id",
            actor_id, capability, context_id, target_id,
            response["allowed"], json.dumps(response),
        )
    except Exception:
        pass  # audit is best-effort; the verdict still stands


async def _audit(db, event: str, *, actor_id=None, affected_id=None,
                 course_id=None, context_id=None, detail: Optional[dict] = None):
    """Write one row-event to the real audit_log table (present in schema.sql).
    Best-effort and append-only: a missing table or DB never breaks a mutation."""
    try:
        import json

        await db.fetch_one(
            "insert into audit_log (event, actor_id, affected_id, course_id, context_id, detail) "
            "values ($1,$2,$3,$4,$5,$6::jsonb) returning id",
            event, actor_id, affected_id, course_id, context_id, json.dumps(detail or {}),
        )
    except Exception:
        pass


# --------------------------------------------------------------------------
# Frozen public API (§3). Async to match the real asyncpg stack.
# --------------------------------------------------------------------------
async def has_capability(db, user_id: int, capability: str, context_id: int,
                         *, doanything: bool = True, simulate_role: Optional[int] = None) -> bool:
    """Steps 1-9 of §8.3, returning just the yes/no. Capability-true is
    necessary but not sufficient — use check() for the full gated verdict."""
    db = _resolve_db(db)
    ident = await _account_and_identity(db, user_id)
    if ident["deleted"] or ident["suspended"]:
        # A deleted/suspended account cannot log in, so it holds no effective
        # capability (mirrors build_decision gate 1). This is what stops a
        # suspended user from acting on the mutation paths that gate on this.
        return False
    cap = await _load_capability(db, capability)
    if cap is None:
        return False
    if ident["is_admin"] and doanything and simulate_role is None:
        return True
    path_ids, labels, _ = await _load_context_chain(db, context_id)
    held = await _held_roles(db, user_id, path_ids, labels, ident["is_guest"], simulate_role)
    if ident["is_guest"] and (
        cap["cap_type"] == "write" or (set(cap["risks"]) & GUEST_BLOCK_RISKS)
    ):
        return False
    cap_rows = await _load_cap_rows(db, capability, path_ids)
    return resolve_capability(path_ids, [h["role_id"] for h in held], cap_rows).allowed


async def require_capability(db, actor_id: int, capability: str, context_id: int,
                            *, doanything: bool = True) -> None:
    """Authorize a mutation: the ONE mechanism every write path uses. Returns
    normally if the actor may act, raises PermissionError otherwise (the routers
    map that to HTTP 403, naming the missing capability). A site admin (config
    list) bypasses — checked here so an unseeded capability like role:manage
    still lets an admin through while denying everyone else (fail-closed)."""
    db = _resolve_db(db)
    ident = await _account_and_identity(db, actor_id)
    # Account state is checked BEFORE the admin bypass — a deleted/suspended
    # account (even a site admin's) cannot log in, so it cannot mutate either.
    if ident["deleted"] or ident["suspended"]:
        raise PermissionError(f"actor {actor_id} account is not active (deleted or suspended)")
    if ident["is_admin"] and doanything:
        return
    if not await has_capability(db, actor_id, capability, context_id, doanything=doanything):
        raise PermissionError(
            f"actor {actor_id} lacks capability '{capability}' at context {context_id}"
        )


async def check(db, actor_id: int, capability: str, context_id: int, *,
                target_id: Optional[int] = None, action: Optional[str] = None,
                activity_id: Optional[int] = None,
                simulate_role: Optional[int] = None) -> dict:
    """The centrepiece: run the full gate pipeline, log the verdict, return the
    frozen §17.3 evidence contract."""
    db = _resolve_db(db)
    inp = await _gather(db, actor_id, capability, context_id, target_id, activity_id, simulate_role)
    response = build_decision(inp)
    await _log_decision(db, actor_id, capability, context_id, target_id, response)
    return response


async def assign_role(db, user_id: int, role_id: int, context_id: int, *, actor_id: int) -> dict:
    """Manual role assignment (component=''). Never writes enrol_% rows.

    Enforces authorization SERVER-SIDE (not just in the UI): the actor must hold
    role:assign here AND the target role must be in their allow-assign matrix.
    Raises PermissionError otherwise — the assignable-roles endpoint and this
    write path share one source of truth, so the matrix can't be bypassed.
    """
    db = _resolve_db(db)
    ident = await _account_and_identity(db, actor_id)
    # Account state first: a deleted/suspended actor (even admin) cannot assign,
    # and assign_role does not route through require_capability (it uses the
    # assignable matrix), so the check must live here too.
    if ident["deleted"] or ident["suspended"]:
        raise PermissionError(f"actor {actor_id} account is not active (deleted or suspended)")
    target = await db.fetch_one("select short_name from role where id=$1", role_id)
    if target is None:
        raise ValueError("role not found")
    allow = await assignable_roles(db, actor_id, context_id)
    if not allow["can_assign"]:
        raise PermissionError(
            f"actor {actor_id} lacks {CAP_ROLE_ASSIGN} at this context — cannot assign roles"
        )
    if target["short_name"] not in allow["assignable"]:
        raise PermissionError(
            f"actor {actor_id} may not assign role '{target['short_name']}' here "
            f"(assignable: {allow['assignable']})"
        )
    row = await db.fetch_one(
        "insert into role_assignment (user_id, role_id, context_id, component, item_id, assigned_by) "
        "values ($1,$2,$3,'',0,$4) "
        "on conflict (user_id, role_id, context_id, component, item_id) do nothing "
        "returning id, user_id, role_id, context_id, component, assigned_by, assigned_at",
        user_id, role_id, context_id, actor_id,
    )
    if row is None:
        return {"created": False, "reason": "assignment already exists (manual)"}
    await _audit(db, "role.assigned", actor_id=actor_id, affected_id=user_id,
                 context_id=context_id,
                 detail={"role_id": role_id, "role": target["short_name"],
                         "assignment_id": row["id"]})
    return {"created": True, "assignment": dict(row)}


async def unassign_role(db, assignment_id: int, *, actor_id: int) -> dict:
    """Remove a MANUAL role assignment. Enforces authorization SERVER-SIDE: the
    actor must hold role:assign at the assignment's context. enrol_%-owned rows
    belong to enrolment sync and are refused (PermissionError → 403), never
    deleted here. Raises ValueError if the assignment does not exist (→ 404)."""
    db = _resolve_db(db)
    row = await db.fetch_one(
        "select id, user_id, role_id, context_id, component from role_assignment where id=$1",
        assignment_id,
    )
    if row is None:
        raise ValueError("assignment not found")
    if row["component"]:  # non-empty component => created by an enrol_% sync
        raise PermissionError(
            f"assignment {assignment_id} was created by '{row['component']}' "
            "(an enrolment sync) — remove it via enrolment, not the roles UI"
        )
    await require_capability(db, actor_id, CAP_ROLE_ASSIGN, row["context_id"])
    await db.fetch_one("delete from role_assignment where id=$1 returning id", assignment_id)
    await _audit(db, "role.unassigned", actor_id=actor_id, affected_id=row["user_id"],
                 context_id=row["context_id"],
                 detail={"role_id": row["role_id"], "assignment_id": assignment_id})
    return {"deleted": True, "assignment_id": assignment_id}


async def create_role(db, short_name: str, name: str, description: str,
                      archetype: Optional[str], *, actor_id: int) -> dict:
    """Create a new role DEFINITION. Requires role:manage at system context
    (admin bypasses; see CAP_ROLE_MANAGE). sort_order is computed inside the
    INSERT to avoid a read/insert race on the unique(sort_order) constraint."""
    db = _resolve_db(db)
    sys = await db.fetch_one("select id from context where level='system'")
    sys_ctx = sys["id"] if sys else 0
    await require_capability(db, actor_id, CAP_ROLE_MANAGE, sys_ctx)
    row = await db.fetch_one(
        "insert into role (short_name, name, description, archetype, sort_order) "
        "values ($1,$2,$3,$4,(select coalesce(max(sort_order),0)+1 from role)) "
        "returning id, short_name, name, description, archetype, sort_order",
        short_name, name, description, archetype,
    )
    await _audit(db, "role.created", actor_id=actor_id, context_id=sys_ctx,
                 detail={"role_id": row["id"], "short_name": short_name})
    return row


async def set_override(db, role_id: int, context_id: int, capability: str,
                       permission: Optional[str], *, actor_id: int) -> dict:
    """Set/replace/clear a role_capability row. permission=None DELETES the row
    (back to 'not set'/inherit) — never leaves a 'deny' behind.

    Authorized SERVER-SIDE: the actor must hold role:override at this context
    (admin bypasses), else PermissionError → 403. An unknown capability name is
    a ValueError → 400 (validation), never an uncaught FK-violation 500.
    """
    db = _resolve_db(db)
    await require_capability(db, actor_id, CAP_ROLE_OVERRIDE, context_id)
    # Validate the capability exists in the catalogue BEFORE writing — otherwise
    # the FK on role_capability.capability raises deep in the driver (a 500).
    if await _load_capability(db, capability) is None:
        raise ValueError(f"unknown capability '{capability}' — not in the catalogue")
    if permission is None:
        row = await db.fetch_one(
            "delete from role_capability where role_id=$1 and context_id=$2 and capability=$3 "
            "returning id",
            role_id, context_id, capability,
        )
        await _audit(db, "role.override_cleared", actor_id=actor_id, context_id=context_id,
                     detail={"role_id": role_id, "capability": capability})
        return {"action": "cleared", "was_present": row is not None,
                "note": "row removed — capability is now 'not set' (inherit)"}
    if permission not in (ALLOW, PREVENT, PROHIBIT):
        raise ValueError(f"invalid permission '{permission}'")
    row = await db.fetch_one(
        "insert into role_capability (role_id, context_id, capability, permission, modified_by) "
        "values ($1,$2,$3,$4::cap_permission,$5) "
        "on conflict (role_id, context_id, capability) "
        "do update set permission=excluded.permission, modified_by=excluded.modified_by, "
        "updated_at=now() "
        "returning id, role_id, context_id, capability, permission",
        role_id, context_id, capability, permission, actor_id,
    )
    await _audit(db, "role.overridden", actor_id=actor_id, context_id=context_id,
                 detail={"role_id": role_id, "capability": capability, "permission": permission})
    return {"action": "set", "row": dict(row)}


# The hardcoded allow-assign matrix (§3). We deliberately skip the role_allow_*
# tables (accepted mismatch §17.2) and label the response accordingly.
ALLOW_ASSIGN = {
    "manager": ["manager", "editingteacher", "teacher", "student"],
    "editingteacher": ["teacher", "student"],  # NOT editingteacher itself (C-18)
}


async def assignable_roles(db, actor_id: int, context_id: int) -> dict:
    """Which roles the actor may hand out here. Two overlapping requirements
    (§9.7 ex.4): the capability role:assign AND the hardcoded matrix."""
    db = _resolve_db(db)
    ident = await _account_and_identity(db, actor_id)
    if ident["is_admin"]:
        # Admin is a config-list identity, not a role, so it holds no
        # role_assignment rows — special-case it to "can assign anything".
        allroles = await db.fetch_all("select short_name from role order by sort_order")
        return {
            "matrix": "hardcoded default",
            "can_assign": True,
            "based_on_role": "admin (site administrator)",
            "assignable": [r["short_name"] for r in allroles],
        }
    can_assign = await has_capability(db, actor_id, CAP_ROLE_ASSIGN, context_id)
    # Actor's strongest role on the path decides the matrix row.
    path_ids, _, _ = await _load_context_chain(db, context_id)
    rows = await db.fetch_all(
        "select distinct r.short_name, r.sort_order from role_assignment ra "
        "join role r on r.id=ra.role_id "
        "where ra.user_id=$1 and ra.context_id = any($2::bigint[]) order by r.sort_order",
        actor_id, path_ids,
    )
    strongest = None
    for r in rows:  # sort_order ascending = strongest first
        if r["short_name"] in ALLOW_ASSIGN:
            strongest = r["short_name"]
            break
    assignable = ALLOW_ASSIGN.get(strongest, []) if can_assign else []
    return {
        "matrix": "hardcoded default",
        "can_assign": can_assign,
        "based_on_role": strongest,
        "assignable": assignable,
    }


async def role_capability_sheet(db, role_id: int, context_id: int) -> list[dict]:
    """The role's RESOLVED capability sheet at a context: every catalogue entry
    with the role's effective value, whether it is an override (decided below
    system) and where it was decided. Feeds the CapabilityEditor UI."""
    db = _resolve_db(db)
    path_ids, labels, _ = await _load_context_chain(db, context_id)
    sys_ctx = path_ids[-1] if path_ids else None
    caps = await db.fetch_all("select name, cap_type, risks from capability order by name")
    rows = await db.fetch_all(
        "select role_id, context_id, capability, permission from role_capability "
        "where role_id=$1 and context_id = any($2::bigint[])",
        role_id, path_ids,
    )
    by_cap: dict[str, list[CapRow]] = {}
    for r in rows:
        by_cap.setdefault(r["capability"], []).append(
            CapRow(r["role_id"], r["context_id"], r["permission"])
        )
    sheet = []
    for c in caps:
        res = resolve_capability(path_ids, [role_id], by_cap.get(c["name"], []))
        d = res.role_decisions.get(role_id)
        val = d.value if d else None
        decided = d.decided_at if d else None
        sheet.append({
            "capability": c["name"],
            "cap_type": c["cap_type"],
            "risks": list(c["risks"]),
            "permission": val,  # allow | prevent | prohibit | None (not set)
            "is_override": decided is not None and decided != sys_ctx,
            "decided_at": labels.get(decided) if decided else None,
        })
    return sheet


async def clone_role(db, source_role_id: int, short_name: str, name: str,
                     description: str = "", *, actor_id: int) -> dict:
    """Clone a role from an existing one, copying all its SYSTEM-context
    role_capability rows (its definition). Overrides at deeper contexts are not
    copied — a fresh role starts from the archetype-style definition only.

    Requires role:manage at system context (admin bypasses; see CAP_ROLE_MANAGE),
    else PermissionError → 403."""
    db = _resolve_db(db)
    sys_pre = await db.fetch_one("select id from context where level='system'")
    await require_capability(db, actor_id, CAP_ROLE_MANAGE, sys_pre["id"] if sys_pre else 0)
    src = await db.fetch_one("select archetype from role where id=$1", source_role_id)
    if src is None:
        raise ValueError("source role not found")
    # Compute sort_order inside the INSERT (single statement) so two concurrent
    # clones don't read the same max and collide on the unique(sort_order).
    new = await db.fetch_one(
        "insert into role (short_name, name, description, archetype, sort_order) "
        "values ($1,$2,$3,$4,(select coalesce(max(sort_order),0)+1 from role)) "
        "returning id, short_name, name, description, archetype, sort_order",
        short_name, name, description, src["archetype"],
    )
    sys = await db.fetch_one("select id from context where level='system'")
    copied = 0
    if sys:
        res = await db.fetch_all(
            "insert into role_capability (role_id, context_id, capability, permission) "
            "select $1, context_id, capability, permission from role_capability "
            "where role_id=$2 and context_id=$3 returning id",
            new["id"], source_role_id, sys["id"],
        )
        copied = len(res)
    await _audit(db, "role.cloned", actor_id=actor_id,
                 context_id=sys["id"] if sys else None,
                 detail={"role_id": new["id"], "short_name": short_name,
                         "cloned_from": source_role_id, "capabilities_copied": copied})
    return {"role": dict(new), "capabilities_copied": copied}


async def decisions(db, actor_id: Optional[int] = None, limit: int = 50) -> list[dict]:
    """The audit log for the demo's Decision Log tab."""
    db = _resolve_db(db)
    try:
        if actor_id is not None:
            rows = await db.fetch_all(
                "select id, actor_id, capability, context_id, target_id, allowed, reasons, "
                "decided_at from permission_decision where actor_id=$1 "
                "order by decided_at desc limit $2",
                actor_id, limit,
            )
        else:
            rows = await db.fetch_all(
                "select id, actor_id, capability, context_id, target_id, allowed, reasons, "
                "decided_at from permission_decision order by decided_at desc limit $1",
                limit,
            )
        import json

        out = []
        for r in rows:
            r = dict(r)
            # asyncpg decodes jsonb to str (no codec on the shared pool); hand
            # the client a real object, not a doubly-encoded string.
            if isinstance(r.get("reasons"), str):
                try:
                    r["reasons"] = json.loads(r["reasons"])
                except (ValueError, TypeError):
                    pass
            out.append(r)
        return out
    except Exception:
        return []
