"""Live permission-engine demo against the real Supabase DB.

Run:  cd moodle-replica/backend && python tests/live_demo.py
Requires backend/.env (DATABASE_URL). Read-only except the best-effort
permission_decision audit log (Khaled's own table). NOT collected by pytest
(the offline logic is covered by test_permissions.py / test_check_integration.py).

These scenarios use the seeded demo data: CS101 (separate groups); ta.a is the
non-editing 'teacher' with a course-level `site:accessallgroups = prevent`
override, so it is group-scoped; ta.allgroups holds the custom 'teacher-allgroups'
role; student.a/ta.a are in Group A, student.b in Group B.
"""
import asyncio
import os
import sys

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.chdir(BACKEND)
sys.path.insert(0, BACKEND)
from app import db  # noqa: E402
from app.services import permissions  # noqa: E402

# Assignment 1 (activity #6) in CS101 (course #3): activity context #7.
A1_CTX, A1_ACT, CS101_CTX = 7, 6, 4
SECRET_FORUM_CTX, SECRET_FORUM_ACT = 9, 8  # hidden activity


async def _uid(u):
    r = await db.fetch_one("select id from app_user where username=$1", u)
    return r["id"] if r else None


def _show(label, expect, res):
    ok = res["decision"] == expect
    print(f"\n[{'PASS' if ok else '????'}] {label}")
    print(f"     -> {res['decision']} (expected {expect}); admin_bypass={res['admin_bypass']}, "
          f"simulated_role={res['simulated_role']}")
    if res["capability_values"]:
        print(f"     capability: {res['capability_values']}")
    gs = res["group_scope"]
    if gs["shared"] is not None or gs["mode"] == "separate":
        print(f"     group: mode={gs['mode']} actor={gs['actor_groups']} target={gs['target_groups']} "
              f"shared={gs['shared']} accessallgroups={gs['access_all_groups']}")
    for r in res["blocking_reasons"]:
        print(f"     BLOCK: {r}")
    return ok


async def main():
    await db.connect()
    if not db.connected():
        print("No DATABASE_URL — set backend/.env"); return
    ta_a = await _uid("ta.a")
    teacher_a = await _uid("teacher.a")
    stu_a, stu_b = await _uid("student.a"), await _uid("student.b")
    stu_susp, admin1 = await _uid("student.susp"), await _uid("admin1")
    student_role = (await db.fetch_one("select id from role where short_name='student'"))["id"]

    async def chk(**kw):
        return await permissions.check(db, **kw)

    results = [
        _show("TA grades student in the SAME group", "ALLOW",
              await chk(actor_id=ta_a, capability="activity:grade", context_id=A1_CTX,
                        target_id=stu_a, activity_id=A1_ACT)),
        _show("TA grades student in a DIFFERENT group (capability still ALLOW, group DENY)", "DENY",
              await chk(actor_id=ta_a, capability="activity:grade", context_id=A1_CTX,
                        target_id=stu_b, activity_id=A1_ACT)),
        _show("Student submits own work", "ALLOW",
              await chk(actor_id=stu_a, capability="activity:submit", context_id=A1_CTX, activity_id=A1_ACT)),
        _show("Student tries to grade (no capability)", "DENY",
              await chk(actor_id=stu_a, capability="activity:grade", context_id=A1_CTX, activity_id=A1_ACT)),
        _show("Teacher manages groups in the course", "ALLOW",
              await chk(actor_id=teacher_a, capability="group:manage", context_id=CS101_CTX)),
        _show("Admin grades (site-admin bypass)", "ALLOW",
              await chk(actor_id=admin1, capability="activity:grade", context_id=A1_CTX,
                        target_id=stu_b, activity_id=A1_ACT)),
        _show("Admin simulating a student (bypass suppressed)", "DENY",
              await chk(actor_id=admin1, capability="activity:grade", context_id=A1_CTX,
                        target_id=stu_b, activity_id=A1_ACT, simulate_role=student_role)),
        _show("Suspended student submits (account state)", "DENY",
              await chk(actor_id=stu_susp, capability="activity:submit", context_id=A1_CTX, activity_id=A1_ACT)),
        _show("TA grades on a hidden activity (activity state)", "DENY",
              await chk(actor_id=ta_a, capability="activity:grade", context_id=SECRET_FORUM_CTX,
                        target_id=stu_a, activity_id=SECRET_FORUM_ACT)),
    ]
    print(f"\n{sum(results)}/{len(results)} scenarios matched expectations.")
    print(f"Decision Log now holds {len(await permissions.decisions(db, limit=200))} verdict(s).")
    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
