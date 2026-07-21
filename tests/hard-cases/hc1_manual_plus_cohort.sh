#!/usr/bin/env bash
# Hard Case #1 — manual + cohort enrolment; cohort removed. Still enrolled?
# Owner: Yaman (task 01 §5). Verified rules: MASTER-REFERENCE §6.10.
#
# Seeded stage: student.a (user 10) is manually enrolled in CS101 (course 3,
# method 3) AND enrolled via cohort "2026 intake" (cohort 2, method 5).
# The script removes him from the cohort (sync runs automatically, policy
# UNENROL), proves the manual path + role survive and the roster shows him
# continuously enrolled, then restores the cohort membership.
#
# Pending Mahmoud (task 05): "groups placed by the cohort are gone, manual
# groups intact" — group side-effects are skipped until services/groups.py
# lands (the API responses show the skip reason explicitly).
#
# Usage: API=http://localhost:8010 bash tests/hard-cases/hc1_manual_plus_cohort.sh
set -euo pipefail
API="${API:-http://localhost:8010}"
J='content-type: application/json'
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
paths() { curl -sf "$API/api/enrolment/users/10/enrolments" \
  | python3 -c "import sys,json; [print(' ', p['course']['short_name'], p['method'], p['status'], '(live)' if p['live'] else '(dead)') for p in json.load(sys.stdin) if p['course']['id']==3]"; }

say "STAGE — student.a's paths in CS101 (expect TWO: manual + cohort — §6.10 'two methods = two rows')"
paths

say "ACT — remove student.a from cohort 2 (membership change triggers sync, policy UNENROL — §6.8)"
curl -sf -X DELETE "$API/api/enrolment/cohorts/2/members/10?actor_id=6" | python3 -m json.tool

say "ASSERT 1 — cohort path + its provenance role are gone; manual path survives"
paths
curl -sf "$API/api/enrolment/users/10/enrolments" | python3 -c "
import sys, json
cs = [p for p in json.load(sys.stdin) if p['course']['id'] == 3]
assert [p['method'] for p in cs] == ['manual'], cs
print('  PASS: exactly the manual path remains')"

say "ASSERT 2 — roster continuity: still an ACTIVE participant throughout (the 'last enrolment' check found the manual path → no whole-course cleanup)"
curl -sf "$API/api/enrolment/courses/3/participants?status=active" | python3 -c "
import sys, json
me = [p for p in json.load(sys.stdin) if p['user_id'] == 10]
assert me and me[0]['effective_status'] == 'active', me
print('  PASS: student.a is on the active roster, methods =', [q['method'] for q in me[0]['paths']])"

say "RESTORE — re-add to cohort (sync re-enrols: 'progress resumes because it never left')"
curl -sf -X POST "$API/api/enrolment/cohorts/2/members?actor_id=6" -H "$J" -d '{"user_id":10}' | python3 -m json.tool
paths

say "HC-1 COMPLETE"
