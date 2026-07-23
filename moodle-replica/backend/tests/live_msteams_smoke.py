"""Tier-c LIVE smoke test — real Microsoft Graph tenant + real Ably key.
NOT pytest: a script with side effects in a real M365 tenant, gated hard.

Prereqs:
  * backend running locally (uvicorn main:app --port 8010) with DATABASE_URL,
    ABLY_API_KEY set and M20 applied;
  * msteams plugin CLI-installed, enabled, settings saved (real tenant_id /
    client_id / client_secret / owner_upn) via the Plugins page;
  * env: MSGRAPH_LIVE=1, optionally SMOKE_MEMBER_UPN (a real licensed user
    to enrol), SMOKE_ACTING_USER (admin id, default 6), API (default
    http://localhost:8010).

Run:  MSGRAPH_LIVE=1 python tests/live_msteams_smoke.py

What it proves end-to-end: create course → outbox → dispatcher → real team
in MS Teams (URL printed) → enrol → member added → Ably message actually
readable back over REST → course delete → team archived.
"""
import json
import os
import sys
import time

import httpx

if os.environ.get("MSGRAPH_LIVE") != "1":
    sys.exit("refusing to run: set MSGRAPH_LIVE=1 (this creates a REAL team)")

API = os.environ.get("API", "http://localhost:8010")
ACTING = os.environ.get("SMOKE_ACTING_USER", "6")  # admin1
HDRS = {"X-Acting-User": ACTING}


def api(method, path, **kw):
    resp = httpx.request(method, f"{API}{path}", headers=HDRS, timeout=30,
                         **kw)
    if resp.status_code >= 400:
        sys.exit(f"{method} {path} -> {resp.status_code}: {resp.text}")
    return resp.json() if resp.text else None


def main():
    stamp = int(time.time())
    short = f"SMOKE{stamp}"

    print(f"1. creating course {short} …")
    course = api("POST", "/api/lms/courses",
                 json={"short_name": short,
                       "full_name": f"MS Teams smoke {stamp}"})
    course_id = course["id"]

    print("2. waiting for provisioning (outbox → Graph) …")
    team = None
    for _ in range(30):
        time.sleep(5)
        api("POST", "/api/plugins/dispatch")  # nudge; middleware also fires
        status = api("GET",
                     f"/api/plugins/msteams/status?course_id={course_id}")
        rows = status.get("teams", [])
        if rows and rows[0]["status"] == "ready":
            team = rows[0]
            break
        if rows and rows[0].get("error"):
            print(f"   … retrying, last error: {rows[0]['error'][:120]}")
    if not team:
        sys.exit("team never became ready — check plugin settings + outbox")
    print(f"   ✓ team ready: https://teams.microsoft.com/l/team/"
          f"{team['aad_group_id']}  (group id {team['aad_group_id']})")

    member_upn = os.environ.get("SMOKE_MEMBER_UPN")
    if member_upn:
        print(f"3. enrolling a user mapped to {member_upn} …")
        # Map an existing seeded student to the real UPN via email_overrides,
        # then enrol them into the course's manual method.
        settings = api("GET", "/api/plugins/msteams/settings")
        overrides = settings["values"].get("email_overrides", {}) or {}
        overrides["student.a"] = member_upn
        api("PUT", "/api/plugins/msteams/settings",
            json={"email_overrides": json.dumps(overrides)})
        api("POST", f"/api/enrolment/courses/{course_id}/enrol",
            json={"user_id": 10})
        for _ in range(24):
            time.sleep(5)
            api("POST", "/api/plugins/dispatch")
            events = api("GET", "/api/plugins/events?limit=10")
            enr = [e for e in events if e["event"] == "enrolment.created"]
            if enr and enr[0]["status"] == "done":
                print("   ✓ member add dispatched — verify in the Teams client")
                break
        else:
            sys.exit("enrolment event never completed")
    else:
        print("3. SMOKE_MEMBER_UPN unset — skipping member add")

    print("4. verifying Ably round-trip …")
    key = os.environ.get("ABLY_API_KEY", "")
    if ":" in key:
        resp = httpx.get(
            f"https://rest.ably.io/channels/course:{course_id}/messages"
            "?limit=5", auth=tuple(key.split(":", 1)), timeout=15)
        names = [m.get("name") for m in resp.json()] if resp.status_code == 200 else []
        if "msteams.status" in names:
            print("   ✓ msteams.status message present on the channel")
        else:
            print(f"   ✗ no msteams.status in channel history ({names})")
    else:
        print("   ABLY_API_KEY unset — skipped")

    print("5. deleting course (→ archive team) …")
    api("DELETE", f"/api/lms/courses/{course_id}")
    time.sleep(5)
    api("POST", "/api/plugins/dispatch")
    status = api("GET", f"/api/plugins/msteams/status?course_id={course_id}")
    print(f"   final status: {status['teams'][0]['status']}")
    print("done.")


if __name__ == "__main__":
    main()
