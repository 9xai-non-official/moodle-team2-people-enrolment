"""Enrolment domain service — owner: Yaman (task 01).

The one sentence that rules this domain (MASTER-REFERENCE §6.3):
enrolment says you are a MEMBER (`enrolment` row); role_assignment says what
you CAN DO. Separate rows in separate systems — this module keeps them honest.

Rules implemented here (each cites its MASTER-REFERENCE section):
  §6.2  ACTIVE = 4 conditions on at least one path (see ACTIVE_CONDITIONS_SQL).
  §6.5  enrol_user() writes BOTH the enrolment row (upsert — re-enrol updates,
        never errors) and the provenance role_assignment row. Deviation D-1:
        unlike Moodle, OUR manual enrolments also carry component='enrol_manual'.
  §6.6  Self-enrol gate chain, in exact order, failing gate named.
  §6.8  Cohort sync, policy UNENROL only (Moodle also offers KEEP / SUSPEND /
        SUSPENDNOROLES — annotated, not implemented).
  §6.10 Two methods = two rows; removing one path touches only ITS provenance;
        removing the LAST path triggers whole-course cleanup. Completion rows
        are NEVER deleted (progress resumes on re-enrolment, Hard Case #2).
  §6.7  Guest methods create NO enrolment rows, ever.
  C-6   Account suspension (app_user.suspended) is a different switch from
        enrolment suspension — it never touches enrolment rows or liveness.

Cross-domain writes go through teammates' services only: group membership via
app.services.groups (Mahmoud). Until his module lands the import is guarded and
group side-effects are skipped with an explicit warning in the result payload.
"""
import json
import inspect
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from app import db as _dbmod

log = logging.getLogger("enrolment")

try:  # Mahmoud's groups service — frozen contract in tasks/assignments/05 §3.
    from app.services import groups as _groups
except ImportError:  # pragma: no cover
    _groups = None

# ---------------------------------------------------------------------------
# The four active-conditions (§6.2) — ONE predicate, reused everywhere.
# Aliases: e = enrolment, m = enrolment_method.
# ---------------------------------------------------------------------------
ACTIVE_CONDITIONS_SQL = """
      e.status = 'active'
  and m.status = 'enabled'
  and (e.time_start is null or e.time_start <= now())
  and (e.time_end   is null or e.time_end   >  now())
"""

# Self-enrol gate names, in chain order (§6.6). Names follow frontend
# CONTRACTS.md where they overlap; course_visible was missing there and is
# gate #1 by spec.
GATES = ("course_visible", "method_enabled", "window_open", "capacity", "key_match")


# ---------------------------------------------------------------------------
# db adapter — accepts either the app.db module or an asyncpg connection, so
# the frozen signatures keep their `db` first argument and callers inside a
# transaction can pass their connection straight through.
# ---------------------------------------------------------------------------
def _is_conn(dbx) -> bool:
    return hasattr(dbx, "fetchrow")


async def _one(dbx, q: str, *args) -> dict | None:
    if _is_conn(dbx):
        row = await dbx.fetchrow(q, *args)
        return dict(row) if row else None
    return await dbx.fetch_one(q, *args)


async def _all(dbx, q: str, *args) -> list[dict]:
    if _is_conn(dbx):
        return [dict(r) for r in await dbx.fetch(q, *args)]
    return await dbx.fetch_all(q, *args)


@asynccontextmanager
async def _tx(dbx):
    """Yield a connection inside a transaction. If a connection was passed in,
    the caller already owns the transaction — just use it."""
    if _is_conn(dbx):
        yield dbx
    else:
        async with _dbmod.pool().acquire() as conn:
            async with conn.transaction():
                yield conn


def _load_json_fields(rows: list[dict], *keys: str) -> list[dict]:
    """asyncpg returns json/json_agg columns as strings — decode them."""
    for r in rows:
        for k in keys:
            if isinstance(r.get(k), str):
                r[k] = json.loads(r[k])
    return rows


def _cfg(raw) -> dict:
    """enrolment_method.config arrives as a jsonb string from asyncpg."""
    if raw is None:
        return {}
    if isinstance(raw, str):
        return json.loads(raw)
    return raw


def _component(method_kind: str) -> str:
    return f"enrol_{method_kind}"


async def _groups_call(fn: str, *args, **kwargs):
    """Call Mahmoud's groups service if merged; otherwise skip loudly.
    His functions (PR #5) take no db argument — they use their own pool
    connections — so they must ONLY run AFTER our transaction commits:
    inside it they can't see our uncommitted enrolment rows (add_member's
    active-enrolment guard would refuse) and their writes wouldn't roll
    back with ours. Hence the deferred-ops pattern (_run_group_ops)."""
    if _groups is None or not hasattr(_groups, fn):
        log.warning("groups service unavailable — skipped %s(%s)", fn, args)
        return {"ok": False, "skipped": True,
                "reason": "groups service not merged yet (Mahmoud, task 05)"}
    res = getattr(_groups, fn)(*args, **kwargs)
    if inspect.isawaitable(res):
        res = await res
    return res


async def _run_group_ops(ops: list) -> list:
    """Execute deferred group side-effects (after commit). Each op is
    (fn_name, args_tuple, kwargs_dict); returns one result per op."""
    return [await _groups_call(fn, *a, **kw) for fn, a, kw in ops]


async def _course_context_id(dbx, course_id: int) -> int | None:
    row = await _one(
        dbx, "select id from context where level = 'course' and instance_id = $1",
        course_id)
    return row["id"] if row else None


async def _method(dbx, method_id: int) -> dict | None:
    return await _one(dbx, "select * from enrolment_method where id = $1", method_id)


# ===========================================================================
# The six frozen signatures (task 01 §3)
#
# Call-style compatibility: the frozen contract says (db, user_id, course_id),
# but the codebase converged on module-level db with no argument (Mahmoud's
# groups.py calls is_active_enrolled(user_id, course_id)). The read checks
# teammates import accept BOTH styles: if the first argument is an int, it is
# treated as user_id and the module pool is used.
# ===========================================================================

def _shift_db(db, a, b):
    """(db, user, course) or (user, course) → always (dbx, user, course)."""
    if isinstance(db, int):
        return _dbmod, db, a
    return db, a, b


async def is_active_enrolled(db, user_id: int, course_id: int | None = None) -> bool:
    """The 4 conditions (§6.2); ANY path qualifies. Moodle onlyactive=True.
    Account suspension is deliberately NOT tested here (C-6)."""
    db, user_id, course_id = _shift_db(db, user_id, course_id)
    row = await _one(db, f"""
        select 1
          from enrolment e
          join enrolment_method m on m.id = e.method_id
          join course c on c.id = m.course_id and c.deleted_at is null
         where e.user_id = $1 and m.course_id = $2
           and {ACTIVE_CONDITIONS_SQL}
         limit 1
    """, user_id, course_id)
    return row is not None


async def is_enrolled(db, user_id: int, course_id: int | None = None) -> bool:
    """Bare existence, any state — Moodle's onlyactive=False (§6.2)."""
    db, user_id, course_id = _shift_db(db, user_id, course_id)
    row = await _one(db, """
        select 1
          from enrolment e
          join enrolment_method m on m.id = e.method_id
         where e.user_id = $1 and m.course_id = $2
         limit 1
    """, user_id, course_id)
    return row is not None


async def active_paths(db, user_id: int, course_id: int | None = None) -> list[dict]:
    """Every path with its liveness verdict — feeds Khaled's checker evidence."""
    db, user_id, course_id = _shift_db(db, user_id, course_id)
    rows = await _all(db, """
        select method_id, method as kind, enrolment_status as status,
               method_status, time_start, time_end,
               ((time_start is null or time_start <= now())
                and (time_end is null or time_end > now())) as window_ok,
               live
          from v_enrolment_detail
         where user_id = $1 and course_id = $2
         order by method_id
    """, user_id, course_id)
    return rows


async def enrol_user(db, method_id: int, user_id: int, *,
                     role_id: int | None = None,
                     time_start: datetime | None = None,
                     time_end: datetime | None = None,
                     actor_id: int | None = None,
                     activate: bool = False,
                     _group_ops: list | None = None) -> dict:
    """Upsert the enrolment row, insert the provenance role row, and — for
    cohort methods with config.sync_group_id — place the user in the group
    via Mahmoud's service (§6.5, D-1, rule 10: re-enrol updates, never errors).

    T2-ENR-002 (ENR-010): a re-enrol PRESERVES the existing status unless the
    caller passes an explicit activate=True — a suspended learner must not be
    silently reactivated by an innocent duplicate enrol. Likewise the time
    window: only supplied fields are written on conflict (None = "leave it"),
    mirroring Moodle update_user_enrol's change-gating. A brand-new row is
    always 'active'.

    Group placement runs AFTER the transaction commits (see _groups_call).
    Nested callers that hold the transaction (self_enrol, cohort sync) pass
    their own _group_ops list and run it once their outer commit lands."""
    ops: list = [] if _group_ops is None else _group_ops
    async with _tx(db) as conn:
        method = await _method(conn, method_id)
        if method is None:
            return {"ok": False, "reason": f"enrolment method {method_id} not found"}
        if method["method"] == "guest":
            # §6.7 — "no real enrolments here!": guest is a session concept.
            return {"ok": False,
                    "reason": "guest methods never create enrolment rows (§6.7)"}

        row = await _one(conn, """
            insert into enrolment (method_id, user_id, status, time_start,
                                   time_end, modified_by)
            values ($1, $2, 'active', $3, $4, $5)
            on conflict (method_id, user_id) do update
               set status = case when $6 then 'active'
                                 else enrolment.status end,
                   time_start = coalesce(excluded.time_start,
                                         enrolment.time_start),
                   time_end = coalesce(excluded.time_end, enrolment.time_end),
                   modified_by = coalesce(excluded.modified_by,
                                          enrolment.modified_by),
                   updated_at = now()
            returning *
        """, method_id, user_id, time_start, time_end, actor_id, activate)

        result = {"ok": True, "enrolment": row, "role_assigned": None,
                  "group_added": None, "warnings": []}

        # Provenance role row (§6.5, D-1: even manual carries component).
        effective_role = role_id or method["default_role_id"]
        if effective_role is not None:
            ctx = await _course_context_id(conn, method["course_id"])
            if ctx is None:
                result["warnings"].append(
                    f"no course context for course {method['course_id']} — "
                    "role assignment skipped (context table is not mine to write)")
            else:
                ra = await _one(conn, """
                    insert into role_assignment
                        (user_id, role_id, context_id, component, item_id, assigned_by)
                    values ($1, $2, $3, $4, $5, $6)
                    on conflict (user_id, role_id, context_id, component, item_id)
                    do nothing
                    returning id
                """, user_id, effective_role, ctx,
                    _component(method["method"]), method_id, actor_id)
                result["role_assigned"] = {
                    "role_id": effective_role, "context_id": ctx,
                    "component": _component(method["method"]),
                    "item_id": method_id, "created": ra is not None}

        sync_group_id = _cfg(method["config"]).get("sync_group_id")
        if method["method"] == "cohort" and sync_group_id:
            ops.append(("add_member", (sync_group_id, user_id),
                        {"component": "enrol_cohort", "item_id": method_id}))

    if _group_ops is None:                    # top-level call: tx committed here
        done = await _run_group_ops(ops)
        result["group_added"] = done[0] if done else None
    elif ops:
        result["group_added"] = {"deferred": True}
    return result


async def unenrol_user(db, method_id: int, user_id: int, *,
                       actor_id: int | None = None,
                       _cohort_sync: bool = False,
                       _group_ops: list | None = None) -> dict:
    """Remove ONE path: its enrolment row + role rows matching MY
    component+item_id only, then the last-path check (§6.10 / Hard Case #2).
    Completion rows are NEVER deleted — progress resumes on re-enrolment.
    Group deletions are deferred to after commit (see _groups_call).

    R-COHORT (ENR-013, Moodle enrol/cohort/lib.php allow_unenrol_user): an
    ACTIVE cohort-synced path cannot be manually unenrolled — cohort
    membership is the source of truth, so suspend it first (or let the sync
    remove it). The sync itself passes _cohort_sync=True to bypass this."""
    ops: list = [] if _group_ops is None else _group_ops
    async with _tx(db) as conn:
        method = await _method(conn, method_id)
        if method is None:
            return {"ok": False, "reason": f"enrolment method {method_id} not found"}
        course_id = method["course_id"]
        component = _component(method["method"])

        if method["method"] == "cohort" and not _cohort_sync:
            current = await _one(conn,
                "select status from enrolment "
                "where method_id = $1 and user_id = $2", method_id, user_id)
            if current is not None and current["status"] == "active":
                return {"ok": False, "http_status": 409,
                        "reason": "an active cohort enrolment cannot be "
                                  "manually unenrolled — suspend it first, or "
                                  "remove the user from the cohort (ENR-013)"}

        deleted = await _all(conn, """
            delete from enrolment where method_id = $1 and user_id = $2
            returning id
        """, method_id, user_id)
        if not deleted:
            return {"ok": False,
                    "reason": "user is not enrolled via this method"}

        ctx = await _course_context_id(conn, course_id)
        roles_removed = []
        if ctx is not None:
            roles_removed = await _all(conn, """
                delete from role_assignment
                 where user_id = $1 and context_id = $2
                   and component = $3 and item_id = $4
                returning role_id
            """, user_id, ctx, component, method_id)

        # This path's provenance-owned group memberships go with it.
        ops.append(("remove_members_by_provenance",
                    (course_id, user_id, component, method_id), {}))

        result = {"ok": True, "course_id": course_id,
                  "roles_removed": [r["role_id"] for r in roles_removed],
                  "groups_removed": None,
                  "last_path_cleanup": False, "warnings": []}

        # ---- last-path check (§6.10): no other row → whole-course cleanup.
        still = await _one(conn, """
            select 1 from enrolment e
              join enrolment_method m on m.id = e.method_id
             where e.user_id = $1 and m.course_id = $2 limit 1
        """, user_id, course_id)
        if still is None:
            result["last_path_cleanup"] = True
            ops.append(("remove_all_memberships", (course_id, user_id), {}))
            await _all(conn, """
                delete from user_last_access
                 where user_id = $1 and course_id = $2 returning user_id
            """, user_id, course_id)
            if ctx is not None:
                leftovers = await _all(conn, """
                    delete from role_assignment
                     where user_id = $1 and context_id = $2
                       and component like 'enrol_%'
                    returning role_id, component
                """, user_id, ctx)
                result["roles_removed"] += [r["role_id"] for r in leftovers]
            # Deliberately NOT deleted: activity_completion / course_completion
            # rows (Hard Case #2), submissions, grades, and role_assignment
            # rows with component='' (Khaled's — never touch).

    if _group_ops is None:                    # top-level call: tx committed here
        done = await _run_group_ops(ops)
        result["groups_removed"] = done[0] if done else None
        if result["last_path_cleanup"] and len(done) > 1:
            result["all_memberships_removed"] = done[1]
    elif ops:
        result["groups_removed"] = {"deferred": True}
    return result


async def suspend(db, method_id: int, user_id: int) -> dict:
    """Status flip ONLY (§6.5): roles stay, groups stay, rows stay. Access dies
    because is_active_enrolled() fails. Never delete anything on suspend."""
    return await _set_status(db, method_id, user_id, "suspended")


async def reactivate(db, method_id: int, user_id: int) -> dict:
    return await _set_status(db, method_id, user_id, "active")


async def _set_status(db, method_id: int, user_id: int, status: str) -> dict:
    """Change-gated (ENR-010): a no-op flip returns the row untouched instead
    of rewriting it — updated_at only moves when the status actually moved."""
    current = await _one(db, """
        select * from enrolment where method_id = $1 and user_id = $2
    """, method_id, user_id)
    if current is None:
        return {"ok": False, "reason": "user is not enrolled via this method"}
    if current["status"] == status:
        return {"ok": True, "enrolment": current, "changed": False}
    row = await _one(db, """
        update enrolment set status = $3, updated_at = now()
         where method_id = $1 and user_id = $2
        returning *
    """, method_id, user_id, status)
    return {"ok": True, "enrolment": row, "changed": True}


# ===========================================================================
# Self-enrolment (§6.6) — the gate chain, in exact order, failing gate named.
# ===========================================================================

async def self_enrol(db, course_id: int, user_id: int,
                     key: str | None = None) -> dict:
    """Gate chain: course_visible → method_enabled → window_open → capacity →
    key_match → enrol. Verdict always returns the FULL gates[] array plus
    blocking_reasons[] (frontend contract). A matching group enrolment key
    both enrols AND joins that group (component='enrol_self')."""
    gates = []
    reasons = []

    def gate(name, passed, fail_reason=""):
        gates.append({"gate": name, "passed": passed,
                      "reason": "" if passed else fail_reason})
        if not passed:
            reasons.append(f"{name}: {fail_reason}")
        return passed

    def verdict(enrolled=False, **extra):
        failing = next((g["gate"] for g in gates if not g["passed"]), None)
        return {"enrolled": enrolled, "failing_gate": failing,
                "gates": gates, "blocking_reasons": reasons, **extra}

    async with _tx(db) as conn:
        course = await _one(conn, """
            select id, visible from course
             where id = $1 and deleted_at is null
        """, course_id)
        if not gate("course_visible", bool(course and course["visible"]),
                    "course does not exist or is hidden"):
            return verdict()

        methods = await _all(conn, """
            select * from enrolment_method
             where course_id = $1 and method = 'self'
             order by id
        """, course_id)
        enabled = [m for m in methods if m["status"] == "enabled"]
        if not gate("method_enabled", bool(enabled),
                    "no enabled self-enrolment method on this course"):
            return verdict()
        method = enabled[0]  # first enabled instance; multiple are legal (§6.3)
        cfg = _cfg(method["config"])

        now_ok = await _one(conn, """
            select ( ($1::timestamptz is null or $1::timestamptz <= now())
                 and ($2::timestamptz is null or $2::timestamptz >  now()) ) as ok
        """, method["enrol_start"], method["enrol_end"])
        if not gate("window_open", now_ok["ok"],
                    "outside the sign-up window (enrol_start / enrol_end)"):
            return verdict()

        max_enrolled = int(cfg.get("max_enrolled") or 0)
        if max_enrolled:
            count = await _one(conn, """
                select count(*)::int as n from enrolment where method_id = $1
            """, method["id"])
            full = count["n"] >= max_enrolled
        else:
            full = False
        if not gate("capacity", not full,
                    f"course is full (max_enrolled = {max_enrolled})"):
            return verdict()

        # Key gate: instance key, or — if use_group_keys — a group's key,
        # which also places the user in that group (§6.6).
        matched_group = None
        instance_key = cfg.get("key")
        if cfg.get("use_group_keys") and key:
            matched_group = await _one(conn, """
                select id, name from course_group
                 where course_id = $1 and enrolment_key = $2
            """, course_id, key)
        key_ok = (not instance_key) or (key == instance_key) or bool(matched_group)
        if not gate("key_match", key_ok, "wrong or missing enrolment key"):
            return verdict()

        ops: list = []
        result = await enrol_user(
            conn, method["id"], user_id,
            role_id=method["default_role_id"], actor_id=user_id,
            _group_ops=ops)
        if not result["ok"]:
            reasons.append(result["reason"])
            return verdict()

        if matched_group:
            ops.append(("add_member", (matched_group["id"], user_id),
                        {"component": "enrol_self", "item_id": method["id"]}))
        await touch_last_access(conn, user_id, course_id)

    # tx committed — group placement can now see the new enrolment row.
    done = await _run_group_ops(ops)
    return verdict(enrolled=True, method_id=method["id"],
                   enrolment=result["enrolment"],
                   group_joined=done[-1] if matched_group else None)


# ===========================================================================
# Cohort sync (§6.8) — policy UNENROL only.
# Moodle also offers KEEP / SUSPEND / SUSPENDNOROLES; we implement UNENROL:
# member removed from the cohort → full path removal.
# ===========================================================================

async def sync_cohort_method(db, method_id: int, *,
                             actor_id: int | None = None) -> dict:
    """Reconcile one cohort method: members not enrolled → enrol;
    enrolled-but-suspended members → reactivate; enrolled-but-no-longer-
    members → unenrol (policy UNENROL). Disabled methods are frozen — skipped."""
    async with _tx(db) as conn:
        method = await _method(conn, method_id)
        if method is None or method["method"] != "cohort":
            return {"ok": False, "reason": "not a cohort method"}
        if method["status"] != "enabled":
            return {"ok": True, "skipped": True,
                    "reason": "method disabled — enrolments frozen, no sync",
                    "added": [], "removed": [], "kept": []}

        members = {r["user_id"] for r in await _all(conn,
            "select user_id from cohort_member where cohort_id = $1",
            method["cohort_id"])}
        enrolled = {r["user_id"]: r["status"] for r in await _all(conn,
            "select user_id, status from enrolment where method_id = $1",
            method_id)}

        added, removed, kept = [], [], []
        ops: list = []
        sync_group_id = _cfg(method["config"]).get("sync_group_id")
        for uid in sorted(members - set(enrolled)):
            await enrol_user(conn, method_id, uid, actor_id=actor_id,
                             _group_ops=ops)
            added.append(uid)
        for uid in sorted(members & set(enrolled)):
            if enrolled[uid] == "suspended":
                await reactivate(conn, method_id, uid)
                added.append(uid)  # reactivated counts as (re)added
            else:
                kept.append(uid)
            # groups_sync_with_enrolment equivalent: make sure the sync group
            # membership exists for current members.
            if sync_group_id:
                ops.append(("add_member", (sync_group_id, uid),
                            {"component": "enrol_cohort", "item_id": method_id}))
        for uid in sorted(set(enrolled) - members):
            await unenrol_user(conn, method_id, uid, actor_id=actor_id,
                               _cohort_sync=True, _group_ops=ops)
            removed.append(uid)

    # tx committed — run the accumulated group side-effects.
    await _run_group_ops(ops)
    return {"ok": True, "added": added, "removed": removed, "kept": kept}


async def sync_methods_for_cohort(db, cohort_id: int, *,
                                  actor_id: int | None = None) -> list[dict]:
    """Run after every cohort_member add/remove: sync every course method
    pointing at this cohort (§6.8 — event-driven propagation)."""
    methods = await _all(db, """
        select id from enrolment_method
         where method = 'cohort' and cohort_id = $1
    """, cohort_id)
    out = []
    for m in methods:
        res = await sync_cohort_method(db, m["id"], actor_id=actor_id)
        out.append({"method_id": m["id"], **res})
    return out


# ===========================================================================
# Methods (instances), guest, last access
# ===========================================================================

async def create_method(db, course_id: int, method: str, *,
                        status: str = "enabled",
                        default_role_id: int | None = None,
                        cohort_id: int | None = None,
                        enrol_start=None, enrol_end=None,
                        config: dict | None = None) -> dict:
    """Create one method instance. Multiple instances of the same kind are
    legal; guest is one-per-course — the deployed DB has no partial unique
    index for it, so the rule is enforced HERE (§6.3)."""
    async with _tx(db) as conn:
        if method == "guest":
            existing = await _one(conn, """
                select 1 from enrolment_method
                 where course_id = $1 and method = 'guest' limit 1
            """, course_id)
            if existing:
                return {"ok": False,
                        "reason": "a guest method already exists on this course "
                                  "(one per course — code-enforced)"}
        if method == "cohort" and cohort_id is None:
            return {"ok": False, "reason": "cohort methods require cohort_id"}
        row = await _one(conn, """
            insert into enrolment_method
                (course_id, method, status, default_role_id, cohort_id,
                 enrol_start, enrol_end, config)
            values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
            returning *
        """, course_id, method, status, default_role_id, cohort_id,
            enrol_start, enrol_end, json.dumps(config or {}))
        return {"ok": True, "method": row}


async def update_method(db, method_id: int, *, status: str | None = None,
                        default_role_id: int | None = None,
                        enrol_start=None, enrol_end=None,
                        config: dict | None = None) -> dict:
    """Enable / disable / configure. Disabling FREEZES every enrolment through
    this instance (they fail condition 2) without touching their rows (§6.2)."""
    row = await _one(db, """
        update enrolment_method
           set status          = coalesce($2, status),
               default_role_id = coalesce($3, default_role_id),
               enrol_start     = coalesce($4, enrol_start),
               enrol_end       = coalesce($5, enrol_end),
               config          = coalesce($6::jsonb, config),
               updated_at      = now()
         where id = $1
        returning *
    """, method_id, status, default_role_id, enrol_start, enrol_end,
        json.dumps(config) if config is not None else None)
    if row is None:
        return {"ok": False, "reason": f"method {method_id} not found"}
    return {"ok": True, "method": row}


async def delete_method(db, method_id: int, *,
                        actor_id: int | None = None) -> dict:
    """Remove a method instance (frontend HC-1 demo path). Every enrolment
    through it is unenrolled via the normal per-path logic FIRST, so provenance
    role rows and last-path cleanup behave exactly as single unenrolments."""
    ops: list = []
    async with _tx(db) as conn:
        method = await _method(conn, method_id)
        if method is None:
            return {"ok": False, "reason": f"method {method_id} not found"}
        users = await _all(
            conn, "select user_id from enrolment where method_id = $1", method_id)
        for u in users:
            await unenrol_user(conn, method_id, u["user_id"], actor_id=actor_id,
                               _group_ops=ops)
        await _all(conn,
                   "delete from enrolment_method where id = $1 returning id",
                   method_id)
    await _run_group_ops(ops)               # after commit
    return {"ok": True, "unenrolled": [u["user_id"] for u in users]}


async def guest_access_enabled(db, course_id: int) -> dict:
    """§6.7 — a guest is a session concept; this only answers whether the
    course's guest switch is on. No enrolment rows are ever involved."""
    row = await _one(db, """
        select id, status, config from enrolment_method
         where course_id = $1 and method = 'guest' limit 1
    """, course_id)
    if row is None:
        return {"guest_access": False, "reason": "no guest method on this course"}
    return {"guest_access": row["status"] == "enabled",
            "method_id": row["id"],
            "has_password": bool(_cfg(row["config"]).get("key"))}


async def touch_last_access(db, user_id: int, course_id: int) -> None:
    """Feeds self-enrol inactivity cleanup (§6.6) — upsert on roster/API touches."""
    await _all(db, """
        insert into user_last_access (user_id, course_id, accessed_at)
        values ($1, $2, now())
        on conflict (user_id, course_id) do update set accessed_at = now()
        returning user_id
    """, user_id, course_id)


# ===========================================================================
# Read models — the roster (flagship), other-users, user paths, cohorts
# ===========================================================================

async def list_participants(db, course_id: int, status: str = "active") -> list[dict]:
    """The roster. Participants = users WITH enrolment rows (role optional).
    Account-suspended users STAY LISTED with a flag (C-6) — enrolment SQL
    never filters app_user.suspended. `status` filters on ENROLMENT status
    (Moodle's participants filter), not on the folded effective status."""
    rows = await _all(db, f"""
        with paths as (
            select e.user_id, e.id as enrolment_id, e.method_id, m.method,
                   m.status as method_status, e.status, e.time_start, e.time_end,
                   ({ACTIVE_CONDITIONS_SQL}) as live,
                   ((e.time_start is null or e.time_start <= now())
                    and (e.time_end is null or e.time_end > now())) as window_ok
              from enrolment e
              join enrolment_method m on m.id = e.method_id
             where m.course_id = $1
        )
        select u.id as user_id,
               u.first_name || ' ' || u.last_name as full_name,
               u.username, u.suspended as account_suspended,
               ula.accessed_at as last_access,
               coalesce((select json_agg(json_build_object(
                            'enrolment_id', p.enrolment_id,
                            'method_id', p.method_id,
                            'method', p.method,
                            'method_status', p.method_status,
                            'status', p.status,
                            'time_start', p.time_start,
                            'time_end', p.time_end,
                            'live', p.live,
                            'window_ok', p.window_ok) order by p.method_id)
                         from paths p where p.user_id = u.id), '[]'::json) as paths,
               coalesce((select json_agg(distinct r.short_name)
                         from role_assignment ra
                         join role r on r.id = ra.role_id
                         join context cx on cx.id = ra.context_id
                        where ra.user_id = u.id and cx.level = 'course'
                          and cx.instance_id = $1), '[]'::json) as roles,
               coalesce((select json_agg(json_build_object('id', g.id, 'name', g.name))
                         from group_member gm
                         join course_group g on g.id = gm.group_id
                        where gm.user_id = u.id and g.course_id = $1), '[]'::json) as groups
          from app_user u
          left join user_last_access ula
                 on ula.user_id = u.id and ula.course_id = $1
         where u.deleted_at is null
           and exists (select 1 from paths p where p.user_id = u.id)
         order by u.id
    """, course_id)

    out = []
    for person in _load_json_fields(rows, "paths", "roles", "groups"):
        paths = person["paths"]
        person["enrolment_status"] = _person_enrolment_status(paths)
        # Folded value for the UI badge (frontend contract). The two fields
        # above stay separate because C-6 says these are different switches.
        person["effective_status"] = ("account_suspended"
                                      if person["account_suspended"]
                                      else person["enrolment_status"])
        if status == "active" and not any(p["status"] == "active" for p in paths):
            continue
        if status == "suspended" and not any(p["status"] == "suspended" for p in paths):
            continue
        out.append(person)
    return out


def _person_enrolment_status(paths: list[dict]) -> str:
    """Fold this person's paths into one enrolment state (spec §4 enum)."""
    if any(p["live"] for p in paths):
        return "active"
    if any(p["status"] == "suspended" for p in paths):
        return "suspended"
    if any(p["status"] == "active" and not p["window_ok"] for p in paths):
        return "expired"
    return "method_disabled"


async def list_other_users(db, course_id: int) -> list[dict]:
    """Role-holders with NO enrolment in this course (§8.8 'the ghost') —
    Khaled creates them; they never appear on the roster."""
    rows = await _all(db, """
        select u.id as user_id,
               u.first_name || ' ' || u.last_name as full_name,
               json_agg(distinct r.short_name) as roles,
               'role without enrolment — not a participant (§8.8)' as note
          from role_assignment ra
          join context cx on cx.id = ra.context_id
          join role r on r.id = ra.role_id
          join app_user u on u.id = ra.user_id and u.deleted_at is null
         where cx.level = 'course' and cx.instance_id = $1
           and not exists (select 1 from enrolment e
                             join enrolment_method m on m.id = e.method_id
                            where e.user_id = ra.user_id and m.course_id = $1)
         group by u.id, u.first_name, u.last_name
         order by u.id
    """, course_id)
    return _load_json_fields(rows, "roles")


async def list_methods(db, course_id: int) -> list[dict]:
    rows = await _all(db, """
        select m.id, m.method, m.status, m.enrol_start, m.enrol_end, m.config,
               case when m.default_role_id is null then null
                    else json_build_object('id', r.id, 'short_name', r.short_name)
               end as default_role,
               case when m.cohort_id is null then null
                    else json_build_object('id', c.id, 'name', c.name)
               end as cohort,
               (select count(*)::int from enrolment e where e.method_id = m.id)
                   as enrolled_count
          from enrolment_method m
          left join role r on r.id = m.default_role_id
          left join cohort c on c.id = m.cohort_id
         where m.course_id = $1
         order by m.id
    """, course_id)
    for r in rows:
        r["config"] = _cfg(r["config"])
    return _load_json_fields(rows, "default_role", "cohort")


async def list_method_enrolments(db, method_id: int) -> list[dict]:
    return await _all(db, """
        select e.id as enrolment_id, e.user_id,
               u.first_name || ' ' || u.last_name as full_name,
               e.status, e.time_start, e.time_end
          from enrolment e
          join app_user u on u.id = e.user_id
         where e.method_id = $1
         order by e.id
    """, method_id)


async def get_enrolment_row(db, enrolment_id: int) -> dict | None:
    """Resolve a row id → (method_id, user_id) for the row-id API aliases."""
    return await _one(db, "select * from enrolment where id = $1", enrolment_id)


async def user_enrolments_all(db, user_id: int) -> list[dict]:
    """All of one user's paths across courses — powers the HC-1 drawer.
    `live` = the four §6.2 conditions EXACTLY (account suspension excluded, C-6)."""
    rows = await _all(db, """
        select json_build_object('id', c.id, 'short_name', c.short_name,
                                 'deleted', c.deleted_at is not null) as course,
               d.method_id, d.method, d.method_status,
               d.enrolment_status as status,
               d.time_start, d.time_end, d.live
          from v_enrolment_detail d
          join course c on c.id = d.course_id
         where d.user_id = $1
         order by c.id, d.method_id
    """, user_id)
    return _load_json_fields(rows, "course")


async def list_cohorts(db) -> list[dict]:
    rows = await _all(db, """
        select c.id, c.name, c.id_number,
               (select count(*)::int from cohort_member cm
                 where cm.cohort_id = c.id) as member_count,
               coalesce((select json_agg(distinct co.short_name)
                         from enrolment_method m
                         join course co on co.id = m.course_id
                        where m.cohort_id = c.id), '[]'::json) as synced_courses
          from cohort c
         order by c.id
    """)
    return _load_json_fields(rows, "synced_courses")


async def create_cohort(db, name: str, id_number: str | None = None,
                        description: str = "") -> dict:
    row = await _one(db, """
        insert into cohort (name, id_number, description)
        values ($1, $2, $3) returning *
    """, name, id_number, description)
    return {"ok": True, "cohort": row}


async def add_cohort_member(db, cohort_id: int, user_id: int, *,
                            actor_id: int | None = None) -> dict:
    """Membership change triggers sync into every course that has a cohort
    method pointing at this bag (§6.8 — event-driven, like Moodle's handler)."""
    await _all(db, """
        insert into cohort_member (cohort_id, user_id) values ($1, $2)
        on conflict do nothing returning user_id
    """, cohort_id, user_id)
    synced = await sync_methods_for_cohort(db, cohort_id, actor_id=actor_id)
    return {"ok": True, "synced": synced}


async def remove_cohort_member(db, cohort_id: int, user_id: int, *,
                               actor_id: int | None = None) -> dict:
    await _all(db, """
        delete from cohort_member where cohort_id = $1 and user_id = $2
        returning user_id
    """, cohort_id, user_id)
    synced = await sync_methods_for_cohort(db, cohort_id, actor_id=actor_id)
    return {"ok": True, "synced": synced}
