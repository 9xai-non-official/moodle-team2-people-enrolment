#!/usr/bin/env python3
"""Acceptance + regression checks for the Team 2 migration set.

Exercises the acceptance criteria in work package §19 and the required tests in
§20 against a database that has had migrations/apply.py run on it. Creates its
own fixtures inside a transaction and rolls back, so it is safe to run
repeatedly and leaves nothing behind.

    python3 migrations/verify.py --database-url postgresql://...
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

import asyncpg

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((PASS if ok else FAIL, name, detail))


async def expect_error(c, sql, *args):
    """Run `sql` expecting it to raise, and return the exception (or None if it
    unexpectedly succeeded).

    Wrapped in a nested transaction so asyncpg issues a SAVEPOINT: a constraint
    violation would otherwise abort the whole enclosing transaction and every
    later check would fail with InFailedSQLTransactionError.
    """
    try:
        async with c.transaction():
            await c.execute(sql, *args)
        return None
    except asyncpg.PostgresError as exc:
        return exc


async def fixtures(c):
    """A course with one tracked, one hidden, one soft-deleted and one failed
    activity, completed by one user. The baseline view scored this 300%."""
    uid = await c.fetchval(
        "insert into app_user (username,email,first_name,last_name) "
        "values ('t_u1','u1@t','T','U') returning id")
    cid = await c.fetchval(
        "insert into course (short_name,full_name) values ('T1','Test') returning id")

    async def activity(name, *, enabled=True, visible=True, deleted=False):
        return await c.fetchval(
            "insert into course_activity (course_id,name,activity_type,visible,"
            "completion_enabled,deleted_at) values ($1,$2,'assign',$3,$4,"
            "case when $5 then now() else null end) returning id",
            cid, name, visible, enabled, deleted)

    tracked = await activity("tracked")
    hidden = await activity("hidden", visible=False)
    gone = await activity("soft-deleted", deleted=True)
    failed = await activity("failed")

    for aid, state in ((tracked, "complete"), (hidden, "complete"),
                       (gone, "complete"), (failed, "complete_fail")):
        await c.execute(
            "insert into activity_completion (activity_id,user_id,state) values ($1,$2,$3)",
            aid, uid, state)

    await c.execute(
        "insert into course_completion (user_id,course_id,time_enrolled) values ($1,$2,now())",
        uid, cid)
    return uid, cid, tracked, failed


async def run(c):
    uid, cid, tracked, failed = await fixtures(c)
    row = await c.fetchrow(
        "select * from v_course_progress where user_id=$1 and course_id=$2", uid, cid)

    # --- D-VIEW (T2-PRG-001) --------------------------------------------------
    check("D-VIEW: percent never exceeds 100",
          row["percent"] <= 100, f"percent={row['percent']}")
    # The fixture has 4 activities: tracked(complete), hidden(complete),
    # soft-deleted(complete), failed(complete_fail).
    # Tracked set = {tracked, failed} = 2. A failed attempt is still a tracked
    # activity the user has not completed, so it belongs in the DENOMINATOR but
    # not the numerator — that is the Moodle semantic.
    # The baseline view scored this 3 done / 1 total = 300% and "complete".
    check("D-VIEW: tracked set is 2 (hidden + soft-deleted excluded, failed still tracked)",
          row["activities_total"] == 2, f"total={row['activities_total']}")
    check("D-VIEW: numerator excludes hidden + soft-deleted + complete_fail",
          row["activities_done"] == 1, f"done={row['activities_done']}")
    check("D-VIEW: complete_fail counts against you, not for you (50%)",
          row["percent"] == 50, f"percent={row['percent']}")
    check("D-VIEW: not falsely complete (baseline called this 300% complete)",
          row["is_complete"] is False, f"is_complete={row['is_complete']}")

    # Positive case: completing every tracked activity does flip is_complete.
    await c.execute("update activity_completion set state='complete' "
                    "where user_id=$1 and state='complete_fail'", uid)
    full = await c.fetchrow(
        "select * from v_course_progress where user_id=$1 and course_id=$2", uid, cid)
    check("D-VIEW: all tracked complete -> 100% and is_complete",
          full["percent"] == 100 and full["is_complete"] is True and full["activities_done"] == 2,
          f"percent={full['percent']} done={full['activities_done']}")
    await c.execute("update activity_completion set state='complete_fail' "
                    "where user_id=$1 and activity_id=$2", uid, failed)

    # denominator = 0 must not divide by zero
    u2 = await c.fetchval("insert into app_user (username,email,first_name,last_name) "
                          "values ('t_u2','u2@t','T','U2') returning id")
    c2 = await c.fetchval("insert into course (short_name,full_name) "
                          "values ('T2','Empty') returning id")
    await c.execute("insert into course_completion (user_id,course_id) values ($1,$2)", u2, c2)
    empty = await c.fetchrow("select * from v_course_progress where user_id=$1 and course_id=$2", u2, c2)
    check("D-VIEW: zero tracked activities -> NULL percent, no divide-by-zero",
          empty["percent"] is None and empty["activities_total"] == 0)

    # --- D-VIEW enrolment gate (T2-PRG-005) -----------------------------------
    check("D-VIEW: unenrolled user is gated (enrolled=false)",
          row["enrolled"] is False, f"enrolled={row['enrolled']}")

    mid = await c.fetchval(
        "insert into enrolment_method (course_id,method) values ($1,'manual') returning id", cid)
    eid = await c.fetchval(
        "insert into enrolment (method_id,user_id) values ($1,$2) returning id", mid, uid)
    gated = await c.fetchrow(
        "select * from v_course_progress where user_id=$1 and course_id=$2", uid, cid)
    check("D-VIEW: active enrolment -> enrolled=true", gated["enrolled"] is True)

    # unenrol: completion must SURVIVE (schema.sql:337-341, HIS-002)
    await c.execute("delete from enrolment where id=$1", eid)
    after = await c.fetchrow(
        "select * from v_course_progress where user_id=$1 and course_id=$2", uid, cid)
    check("D-VIEW: completion survives unenrolment (row retained)",
          after is not None and after["activities_done"] == 1)
    check("D-VIEW: unenrolled again reads enrolled=false", after["enrolled"] is False)

    # re-enrol resurfaces (regression guard PRG-031)
    await c.execute("insert into enrolment (method_id,user_id) values ($1,$2)", mid, uid)
    again = await c.fetchrow(
        "select * from v_course_progress where user_id=$1 and course_id=$2", uid, cid)
    check("D-VIEW: re-enrol resurfaces completion (PRG-031)",
          again["enrolled"] is True and again["activities_done"] == 1)

    # soft-deleted COURSE stays reportable (HC-05)
    await c.execute("update course set deleted_at=now() where id=$1", cid)
    soft = await c.fetchrow(
        "select * from v_course_progress where user_id=$1 and course_id=$2", uid, cid)
    check("D-VIEW: soft-deleted course still reportable (HC-05)",
          soft is not None and soft["course_deleted"] is True)
    await c.execute("update course set deleted_at=null where id=$1", cid)

    # --- D-GUEST (T2-DATA-003) ------------------------------------------------
    await c.execute("insert into enrolment_method (course_id,method) values ($1,'guest')", cid)
    err = await expect_error(
        c, "insert into enrolment_method (course_id,method) values ($1,'guest')", cid)
    check("D-GUEST: second guest method rejected by unique index",
          isinstance(err, asyncpg.UniqueViolationError), f"got {type(err).__name__}")
    # non-guest methods stay multi-instance (DATA-002)
    await c.execute("insert into enrolment_method (course_id,method) values ($1,'self')", cid)
    await c.execute("insert into enrolment_method (course_id,method) values ($1,'self')", cid)
    n = await c.fetchval(
        "select count(*) from enrolment_method where course_id=$1 and method='self'", cid)
    check("D-GUEST: index is partial — self stays multi-instance", n == 2, f"self methods={n}")

    # --- D-IMMUT (T2-PRG-002) -------------------------------------------------
    await c.execute("update course_completion set time_completed=now() "
                    "where user_id=$1 and course_id=$2", uid, cid)
    first = await c.fetchval("select time_completed from course_completion "
                             "where user_id=$1 and course_id=$2", uid, cid)
    err = await expect_error(
        c, "update course_completion set time_completed=now() + interval '1 day' "
           "where user_id=$1 and course_id=$2", uid, cid)
    check("D-IMMUT: rewriting time_completed raises",
          err is not None and "write-once" in str(err), f"got {err!r}")
    unchanged = await c.fetchval("select time_completed from course_completion "
                                 "where user_id=$1 and course_id=$2", uid, cid)
    check("D-IMMUT: value unchanged after rejected write", unchanged == first)
    err = await expect_error(
        c, "update course_completion set time_completed=null "
           "where user_id=$1 and course_id=$2", uid, cid)
    check("D-IMMUT: silent un-completion (set NULL) rejected", err is not None)

    # --- D-CTX (T2-RBAC-005) --------------------------------------------------
    root = await c.fetchval("select id from context where level='system'")
    a = await c.fetchval("insert into context (level,instance_id,parent_id) "
                         "values ('course',9001,$1) returning id", root)
    b = await c.fetchval("insert into context (level,instance_id,parent_id) "
                         "values ('activity',9002,$1) returning id", a)
    d = await c.fetchval("insert into context (level,instance_id,parent_id) "
                         "values ('user',9003,$1) returning id", b)
    newp = await c.fetchval("insert into context (level,instance_id,parent_id) "
                            "values ('course',9004,$1) returning id", root)
    await c.execute("update context set parent_id=$1 where id=$2", newp, a)
    rows = {r["id"]: r for r in await c.fetch(
        "select id,path,depth from context where id = any($1::bigint[])", [a, b, d])}
    check("D-CTX: moved node path recomputed",
          rows[a]["path"] == f"{await c.fetchval('select path from context where id=$1', newp)}/{a}",
          rows[a]["path"])
    check("D-CTX: child path follows the move",
          rows[b]["path"] == f"{rows[a]['path']}/{b}", rows[b]["path"])
    check("D-CTX: grandchild path follows the move (recursive)",
          rows[d]["path"] == f"{rows[b]['path']}/{d}", rows[d]["path"])
    check("D-CTX: depths recomputed for whole subtree",
          rows[b]["depth"] == rows[a]["depth"] + 1 and rows[d]["depth"] == rows[b]["depth"] + 1,
          f"{rows[a]['depth']}/{rows[b]['depth']}/{rows[d]['depth']}")

    # --- D-SEED (T2-RBAC-003/004) --------------------------------------------
    viewers = [r["short_name"] for r in await c.fetch(
        "select r.short_name from role_capability rc join role r on r.id=rc.role_id "
        "join context ct on ct.id=rc.context_id "
        "where rc.capability='course:view' and ct.level='system' order by 1")]
    check("D-SEED: course:view is manager-only", viewers == ["manager"], f"{viewers}")
    allgroups = [r["short_name"] for r in await c.fetch(
        "select r.short_name from role_capability rc join role r on r.id=rc.role_id "
        "join context ct on ct.id=rc.context_id "
        "where rc.capability='site:accessallgroups' and ct.level='system' order by 1")]
    # 'teacher-allgroups' is a DELIBERATE fixture role (fixtures.sql:25-28) —
    # a duplicate TA that keeps accessallgroups, so the demo can contrast it
    # against a properly group-scoped TA. It is allowed here; plain 'teacher'
    # is the one that must not have it (T2-RBAC-004). Matches the whitelist in
    # apply.py's post-fixture contradiction check.
    check("D-SEED: plain teacher no longer has accessallgroups",
          "teacher" not in allgroups, f"{allgroups}")
    check("D-SEED: accessallgroups limited to editingteacher/manager (+demo role)",
          set(allgroups) <= {"editingteacher", "manager", "teacher-allgroups"}, f"{allgroups}")
    check("D-SEED: guest PROHIBIT on activity:submit preserved",
          await c.fetchval(
              "select permission='prohibit' from role_capability rc "
              "join role r on r.id=rc.role_id where r.short_name='guest' "
              "and rc.capability='activity:submit'"))

    # --- D-FNCAN / D-PDEC / D-CRIT / D-GRP-* ---------------------------------
    check("D-FNCAN: fn_can dropped",
          await c.fetchval("select count(*) from pg_proc where proname='fn_can'") == 0)
    check("D-PDEC: permission_decision has RLS enabled",
          await c.fetchval("select relrowsecurity from pg_class where relname='permission_decision'"))
    check("D-PDEC: decision-log indexes present",
          await c.fetchval("select count(*) from pg_indexes where tablename='permission_decision'") >= 4)

    crit = await c.fetchval(
        "insert into course_completion_criteria (course_id,criteria_type) "
        "values ($1,'activity') returning id", cid)
    await c.execute("insert into course_completion_crit_compl (user_id,course_id,criteria_id) "
                    "values ($1,$2,$3)", uid, cid, crit)
    err = await expect_error(
        c, "insert into course_completion_crit_compl (user_id,course_id,criteria_id) "
           "values ($1,$2,$3)", uid, cid, crit)
    check("D-CRIT: one crit-compl per (user,course,criteria)",
          isinstance(err, asyncpg.UniqueViolationError), f"got {type(err).__name__}")

    gid = await c.fetchval("insert into course_group (course_id,name) "
                           "values ($1,'G') returning id", cid)
    check("D-GRP-VIS: visibility defaults to 'all'",
          await c.fetchval("select visibility::text from course_group where id=$1", gid) == "all")
    err = await expect_error(
        c, "insert into activity_availability (activity_id,group_id,grouping_id) "
           "values ($1,$2,null)", tracked, gid)
    check("D-GRP-AVAIL: single target accepted", err is None, f"got {err!r}")
    err = await expect_error(
        c, "insert into activity_availability (activity_id) values ($1)", tracked)
    check("D-GRP-AVAIL: CHECK rejects zero targets",
          isinstance(err, asyncpg.CheckViolationError), f"got {type(err).__name__}")
    grp = await c.fetchval("insert into grouping (course_id,name) values ($1,'GG') returning id", cid)
    err = await expect_error(
        c, "insert into activity_availability (activity_id,group_id,grouping_id) "
           "values ($1,$2,$3)", tracked, gid, grp)
    check("D-GRP-AVAIL: CHECK rejects both targets at once",
          isinstance(err, asyncpg.CheckViolationError), f"got {type(err).__name__}")

    # --- endorsed superiorities must not have regressed (§21) ----------------
    check("§21: v_enrolment_detail NULL-guarded liveness preserved",
          "time_end IS NULL" in (await c.fetchval("select pg_get_viewdef('v_enrolment_detail')")))
    check("§21: audit_log still has no foreign keys",
          await c.fetchval("select count(*) from information_schema.table_constraints "
                           "where table_name='audit_log' and constraint_type='FOREIGN KEY'") == 0)
    check("§21: course_completion FKs still non-cascading (survive-unenrol)",
          await c.fetchval("""
              select bool_and(rc.delete_rule='NO ACTION')
              from information_schema.referential_constraints rc
              join information_schema.table_constraints tc
                on tc.constraint_name=rc.constraint_name
              where tc.table_name='course_completion'"""))
    check("§21: RLS enabled on every new table",
          await c.fetchval("""
              select bool_and(relrowsecurity) from pg_class
              where relname in ('course_completion_criteria','course_completion_aggr_methd',
                                'course_completion_crit_compl','activity_availability',
                                'permission_decision')"""))
    check("M15: activity_completion FK is now CASCADE",
          await c.fetchval("""
              select rc.delete_rule='CASCADE'
              from information_schema.referential_constraints rc
              join information_schema.key_column_usage k
                on k.constraint_name=rc.constraint_name
              where k.table_name='activity_completion' and k.column_name='activity_id'"""))


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    args = ap.parse_args()
    if not args.database_url:
        print("DATABASE_URL not set", file=sys.stderr)
        return 2

    conn = await asyncpg.connect(args.database_url, statement_cache_size=0)
    tx = conn.transaction()
    await tx.start()
    try:
        await run(conn)
    finally:
        await tx.rollback()          # leave nothing behind
        await conn.close()

    width = max(len(n) for _, n, _ in results)
    for status, name, detail in results:
        suffix = f"   ({detail})" if detail and status == FAIL else ""
        print(f"  [{status}] {name.ljust(width)}{suffix}")
    failed = sum(1 for s, _, _ in results if s == FAIL)
    print(f"\n{len(results) - failed}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
