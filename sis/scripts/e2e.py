#!/usr/bin/env python3
"""End-to-end proof: SIS → outbox → WhoCan (local Docker Postgres).

Drives the REAL running services over HTTP and asserts the contract:

  1. seed the SIS; register Sara (student), assign Tala (teacher),
     register + drop Omar — all through the portal API;
  2. drain the outbox (live mode) → events land in WhoCan;
  3. assert WhoCan's roster: Sara active/student + Tala editingteacher via the
     'sis' method; Omar absent (enrol then drop converges to out);
  4. assert the ENR-013/sis guard: manual unenrol of Sara's path → HTTP 409;
  5. reconcile + drain → the account gate suspends Omar (no active
     registration this term) and keeps Sara + Tala active.

Exit code 0 = every assertion held.

Usage:  python3 sis/scripts/e2e.py   (SIS on :8020 live-mode, WhoCan on :8010)
"""
import sys

import httpx

SIS = "http://localhost:8020"
WHOCAN = "http://localhost:8010"
ADMIN = {"X-Acting-User": "1"}      # admin1 — the SIS service identity

PASS, FAIL = 0, 0


def check(name: str, cond: bool, detail: str = ""):
    global PASS, FAIL
    mark = "✅" if cond else "❌"
    print(f"  {mark} {name}" + (f"  — {detail}" if detail else ""))
    PASS += cond
    FAIL += not cond


def main() -> int:
    s = httpx.Client(timeout=20)

    print("── 1. SIS: seed + register/assign/drop ─────────────────────────")
    s.post(f"{SIS}/api/seed").raise_for_status()
    r1 = s.post(f"{SIS}/api/register", json={
        "person_sis_id": "S1001", "course_sis_id": "CRS-CS101"}).json()
    check("register Sara → queued", r1["outbox"]["mode"] == "live")
    r2 = s.post(f"{SIS}/api/assign", json={
        "person_sis_id": "T2001", "course_sis_id": "CRS-CS101"}).json()
    check("assign Tala as teacher", r2["registration"]["role"] == "teacher")
    s.post(f"{SIS}/api/register", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-CS101"})
    s.post(f"{SIS}/api/drop", json={
        "person_sis_id": "S1002", "course_sis_id": "CRS-CS101"})

    print("── 2. drain the outbox (live) ──────────────────────────────────")
    out = s.post(f"{SIS}/api/outbox/drain").json()
    check("all events delivered", out["sent"] == out["processed"] and
          out["processed"] >= 4, str(out))

    print("── 3. WhoCan roster reflects the portal ────────────────────────")
    status = s.get(f"{WHOCAN}/api/sis/status", headers=ADMIN).json()
    course = next((c for c in status["sis_courses"]
                   if c["external_ref"] == "CRS-CS101"), None)
    check("sis-managed course exists in WhoCan", course is not None,
          f"course_id={course and course['course_id']}")
    cid, mid = course["course_id"], course["method_id"]

    parts = {p["username"]: p for p in s.get(
        f"{WHOCAN}/api/enrolment/courses/{cid}/participants",
        headers=ADMIN).json()}
    sara, tala = parts.get("sis.s1001"), parts.get("sis.t2001")
    check("Sara on roster: active student via sis",
          bool(sara) and sara["effective_status"] == "active"
          and "student" in sara["roles"]
          and [p["method"] for p in sara["paths"]] == ["sis"])
    check("Tala on roster: teacher (editingteacher)",
          bool(tala) and "editingteacher" in tala["roles"])
    check("Omar NOT on roster (enrol→drop converged)",
          "sis.s1002" not in parts)

    print("── 4. the guard: manual unenrol of a sis path is refused ───────")
    g = s.request("DELETE",
                  f"{WHOCAN}/api/enrolment/methods/{mid}/enrolments/{sara['user_id']}",
                  headers=ADMIN)
    check("DELETE → HTTP 409 (ENR-013/sis)", g.status_code == 409,
          g.json().get("detail", "")[:70])

    print("── 5. reconcile + account gate ─────────────────────────────────")
    rec = s.post(f"{SIS}/api/reconcile").json()
    check("reconcile queued full state", rec["queued"]["account"] == 3, str(rec))
    out2 = s.post(f"{SIS}/api/outbox/drain").json()
    check("reconcile delivered", out2["sent"] == out2["processed"], str(out2))

    users = {u["id_number"]: u for u in
             s.get(f"{WHOCAN}/api/users").json() if u.get("id_number")}
    check("Omar suspended in WhoCan (no active registration this term)",
          users.get("S1002", {}).get("suspended") is True)
    check("Sara still active", users.get("S1001", {}).get("suspended") is False)
    check("Tala still active", users.get("T2001", {}).get("suspended") is False)

    print(f"\n{'='*64}\nE2E: {PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
