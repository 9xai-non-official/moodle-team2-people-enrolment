"""Whole-application smoke test (Team 2 · moodle-replica).

Boots the REAL FastAPI app against the live Supabase DB (needs backend/.env) and
hits at least one endpoint of every router: reads across all domains (users,
courses, enrolment, groups, progress, roles, permissions), the auth gate on the
hardened mutations, and the dev-login -> token -> /check flow.

It is a SMOKE test — "is anything catastrophically broken?" — not an assertion of
business correctness. Read-only for other teams' data (only GETs there); the only
writes are best-effort permission_decision audit rows from /check. Sets a throwaway
AUTH_SECRET + AUTH_DEV_LOGIN so the hardened endpoints can be exercised.

Run:  cd moodle-replica/backend && python tests/smoke_all.py
Exit code = number of failed checks (0 = all green).
"""
import os
import sys

BE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.chdir(BE)
sys.path.insert(0, BE)

# Must be set BEFORE importing the app so the auth verifier picks up the secret.
os.environ.setdefault("AUTH_SECRET", "smoke-secret")
os.environ["AUTH_DEV_LOGIN"] = "1"

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

RESULTS = []


def check(name, resp, want=200, pred=None, note=""):
    """Record a check: status matches want (int or tuple of acceptable codes),
    and optional pred(json)->(bool, detail)."""
    ok = resp.status_code == want if isinstance(want, int) else resp.status_code in want
    detail = f"HTTP {resp.status_code}"
    if ok and pred is not None:
        try:
            good, d = pred(resp.json())
            ok = good
            detail = d
        except Exception as e:  # noqa: BLE001
            ok, detail = False, f"pred-exc {e!r}"[:80]
    if note and ok:
        detail = f"{detail} · {note}"
    RESULTS.append((ok, name))
    print(("  PASS " if ok else " FAIL ") + name + (f"  ({detail})" if detail else ""))
    return ok


def first_id(lst):
    return lst[0]["id"] if lst else None


def main():
    with TestClient(app) as c:
        AUTH = None

        def H(tok):
            return {"Authorization": f"Bearer {tok}"} if tok else {}

        print("── health & dashboard ──")
        check("GET /api/health", c.get("/api/health"),
              pred=lambda j: (j.get("database") not in (None, "not configured"),
                              f"db={j.get('database')}" if isinstance(j.get('database'), str)
                              else "db connected"))
        check("GET /api/stats", c.get("/api/stats"),
              pred=lambda j: (isinstance(j, dict), f"users={j.get('users')} courses={j.get('courses')}"))

        print("── auth flow (permissions) ──")
        dl = c.post("/api/permissions/dev-login", json={"username": "admin1"})
        check("POST /api/permissions/dev-login (admin1)", dl,
              pred=lambda j: ("token" in j, f"user={j.get('user',{}).get('username')}"))
        AUTH = dl.json().get("token") if dl.status_code == 200 else None
        admin_id = dl.json().get("user", {}).get("id") if dl.status_code == 200 else None
        check("POST /api/permissions/dev-login (suspended → refused)",
              c.post("/api/permissions/dev-login", json={"username": "student.susp"}), want=404)
        check("POST /api/permissions/check (unauthenticated → 401)",
              c.post("/api/permissions/check",
                     json={"actor_user_id": admin_id or 1, "capability": "course:view", "context_id": 4}),
              want=401)
        check("POST /api/permissions/check (authenticated)",
              c.post("/api/permissions/check", headers=H(AUTH),
                     json={"actor_user_id": admin_id or 1, "capability": "course:view", "context_id": 4}),
              pred=lambda j: (j.get("decision") in ("ALLOW", "DENY"), f"decision={j.get('decision')}"))
        check("GET /api/permissions/decisions", c.get("/api/permissions/decisions"),
              pred=lambda j: (isinstance(j, list), f"{len(j)} rows"))

        print("── users ──")
        ru = c.get("/api/users")
        users = ru.json() if ru.status_code == 200 else []
        check("GET /api/users", ru, pred=lambda j: (isinstance(j, list), f"{len(j)} users"))
        uid = first_id(users)
        if uid:
            check(f"GET /api/users/{{id}} (#{uid})", c.get(f"/api/users/{uid}"),
                  pred=lambda j: (isinstance(j, dict), j.get("username")))

        print("── courses ──")
        rc = c.get("/api/courses")
        courses = rc.json() if rc.status_code == 200 else []
        check("GET /api/courses", rc, pred=lambda j: (isinstance(j, list), f"{len(j)} courses"))
        cid = first_id(courses)
        if cid:
            check(f"GET /api/courses/{{id}} (#{cid})", c.get(f"/api/courses/{cid}"),
                  pred=lambda j: (isinstance(j, dict), j.get("short_name")))

        print("── enrolment & groups ──")
        check("GET /api/enrolment", c.get("/api/enrolment"),
              pred=lambda j: (isinstance(j, (list, dict)), type(j).__name__))
        check("GET /api/groups", c.get("/api/groups"),
              pred=lambda j: (isinstance(j, (list, dict)), type(j).__name__))

        print("── progress ──")
        # /api/progress is "one user in one course" — needs both ids. 200 (a row)
        # or 404 (no progress for this pair) are both correct, non-crash responses.
        if uid and cid:
            check("GET /api/progress?user_id&course_id",
                  c.get(f"/api/progress?user_id={uid}&course_id={cid}"), want=(200, 404))
        if uid:
            check(f"GET /api/progress/user/{{id}} (#{uid})", c.get(f"/api/progress/user/{uid}"),
                  pred=lambda j: (isinstance(j, (list, dict)), type(j).__name__))
        if cid:
            check(f"GET /api/progress/course/{{id}} (#{cid})", c.get(f"/api/progress/course/{cid}"),
                  pred=lambda j: (isinstance(j, (list, dict)), type(j).__name__))

        print("── roles & permissions (Team 2 / Khaled) ──")
        rr = c.get("/api/roles")
        roles = rr.json() if rr.status_code == 200 else []
        check("GET /api/roles", rr, pred=lambda j: (isinstance(j, list), f"{len(j)} roles"))
        rid = first_id(roles)
        check("GET /api/roles/capabilities", c.get("/api/roles/capabilities"),
              pred=lambda j: (isinstance(j, list) and len(j) > 0, f"{len(j)} capabilities"))
        rctx = c.get("/api/roles/contexts")
        ctxs = rctx.json() if rctx.status_code == 200 else []
        check("GET /api/roles/contexts", rctx, pred=lambda j: (isinstance(j, list), f"{len(j)} contexts"))
        course_ctx = next((x["id"] for x in ctxs if x.get("level") == "course"), None) or 4
        if rid:
            check(f"GET /api/roles/{{id}}/capabilities (#{rid})",
                  c.get(f"/api/roles/{rid}/capabilities?context_id=1"),
                  pred=lambda j: (isinstance(j, list), f"{len(j)} rows"))
        if uid:
            check(f"GET /api/roles/users/{{id}}/assignments (#{uid})",
                  c.get(f"/api/roles/users/{uid}/assignments"),
                  pred=lambda j: (isinstance(j, list), f"{len(j)} assignments"))
        check("GET /api/roles/assignable (authenticated)",
              c.get(f"/api/roles/assignable?context_id={course_ctx}", headers=H(AUTH)),
              pred=lambda j: ("can_assign" in j, f"can_assign={j.get('can_assign')}"))
        check("GET /api/roles/assignments?context_id",
              c.get(f"/api/roles/assignments?context_id={course_ctx}"),
              pred=lambda j: (isinstance(j, list), f"{len(j)} rows"))

        print("── mutation auth gates (must reject unauthenticated) ──")
        check("POST /api/roles (unauth → 401)",
              c.post("/api/roles", json={"short_name": "smoke", "name": "Smoke"}), want=401)
        check("PUT /api/roles/{id}/capabilities (unauth → 401)",
              c.put(f"/api/roles/{rid or 1}/capabilities",
                    json={"context_id": 1, "capability": "course:view", "permission": "allow"}), want=401)
        check("POST /api/roles/assignments (unauth → 401)",
              c.post("/api/roles/assignments", json={"user_id": 1, "role_id": 1, "context_id": 1}), want=401)
        check("DELETE /api/roles/assignments/{id} (unauth → 401)",
              c.delete("/api/roles/assignments/1"), want=401)
        check("POST /api/roles/{id}/clone (unauth → 401)",
              c.post(f"/api/roles/{rid or 1}/clone", json={"short_name": "smoke2", "name": "Smoke2"}), want=401)

        print("── authorization (authenticated but under-privileged → 403, no write) ──")
        stok = c.post("/api/permissions/dev-login", json={"username": "student.a"})
        stoken = stok.json().get("token") if stok.status_code == 200 else None
        if stoken:
            check("POST /api/roles/assignments (student token → 403)",
                  c.post("/api/roles/assignments", headers=H(stoken),
                         json={"user_id": 10, "role_id": 1, "context_id": course_ctx}), want=403)

    passed = sum(1 for ok, _ in RESULTS if ok)
    failed = [n for ok, n in RESULTS if not ok]
    print(f"\n{'=' * 60}\nSMOKE SUMMARY: {passed}/{len(RESULTS)} checks passed")
    if failed:
        print("FAILED:")
        for n in failed:
            print("   -", n)
    return len(failed)


if __name__ == "__main__":
    sys.exit(main())
