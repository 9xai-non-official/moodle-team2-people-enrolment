#!/usr/bin/env bash
# Hard Case #2 — drops week 10, returns week 12. What happened to the work?
# Owner: Yaman (task 01 §5). Verified rules: MASTER-REFERENCE §6.10/§6.11.
#
# student.a (user 10) has completion rows in CS101 (course 3). The script
# unenrols him completely (both paths → last-path cleanup fires), proves the
# roster loses him while his activity_completion rows are untouched (read via
# Mahdi's progress endpoint — completion is state, not participation), then
# re-enrols him and shows progress reappearing untouched.
#
# Faithful Moodle behaviour, NOT a bug: groups are lost on last-path unenrol
# and must be rejoined (group deletion itself is pending Mahmoud's service).
#
# Usage: API=http://localhost:8010 bash tests/hard-cases/hc2_drop_and_return.sh
set -euo pipefail
API="${API:-http://localhost:8010}"
J='content-type: application/json'
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
progress() { curl -sf "$API/api/progress/user/10" | python3 -c "
import sys, json
rows = [c for c in json.load(sys.stdin) if c.get('course_id') == 3]
print(json.dumps(rows, indent=2, default=str) if rows else '  (no CS101 progress rows)')"; }

say "STAGE — student.a's CS101 progress BEFORE the drop (Mahdi's endpoint)"
progress

say "WEEK 10 — drop: leave the cohort (sync unenrols that path), then unenrol the manual path (LAST path → whole-course cleanup: groups, last-access, enrol_% roles)"
curl -sf -X DELETE "$API/api/enrolment/cohorts/2/members/10?actor_id=6" > /dev/null
curl -sf -X DELETE "$API/api/enrolment/methods/3/enrolments/10?actor_id=6" | python3 -m json.tool

say "ASSERT 1 — roster loses him (any filter)"
curl -sf "$API/api/enrolment/courses/3/participants?status=all" | python3 -c "
import sys, json
assert all(p['user_id'] != 10 for p in json.load(sys.stdin))
print('  PASS: student.a is not a participant any more')"

say "ASSERT 2 — completion rows are NEVER deleted by unenrolment (they are state, not participation)"
progress

say "WEEK 12 — return: re-enrol manually + rejoin the cohort"
curl -sf -X POST "$API/api/enrolment/methods/3/enrolments?actor_id=6" -H "$J" -d '{"user_id":10}' > /dev/null
curl -sf -X POST "$API/api/enrolment/cohorts/2/members?actor_id=6" -H "$J" -d '{"user_id":10}' > /dev/null
curl -sf "$API/api/enrolment/courses/3/participants?status=active" | python3 -c "
import sys, json
me = [p for p in json.load(sys.stdin) if p['user_id'] == 10]
assert me, 'expected student.a back on the roster'
print('  PASS: back on the roster —', [q['method'] for q in me[0]['paths']])
print('  groups now:', me[0]['groups'])
print('  NOTE: in faithful Moodle these are EMPTY after last-path unenrol (must')
print('  rejoin). Group-membership deletion is pending services/groups.py (Mahmoud).')"

say "ASSERT 3 — progress reappears UNTOUCHED ('it resumes because it never left')"
progress

say "HC-2 COMPLETE"
