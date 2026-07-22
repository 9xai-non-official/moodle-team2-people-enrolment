#!/usr/bin/env bash
# Hard Case #4 — student in two groups at once, separate mode: union reachability.
# Owner: Mahmoud (task 05 §18). Verified rules: HC-04, multi-group union
# (scope_verdict, no dedupe); T2-GRP-001 routed /allowed.
#
# Seeded stage (fixtures.sql): student.multi (user 11) is in BOTH Group A and
# Group B of CS101 (course 3). Assignment 1 inherits Separate Groups. A grader
# in EITHER group must reach student.multi (union), and student.multi's own
# allowed set for the activity is {A, B}.
#
# Hermetic: no creds, only the seeded API.
# Usage: API=http://localhost:8011 bash tests/hard-cases/hc4_two_groups.sh
set -euo pipefail
API="${API:-http://localhost:8011}"
J='content-type: application/json'
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()  { printf '  \033[32mPASS\033[0m %s\n' "$*"; }
die() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; exit 1; }

A1=$(curl -sf "$API/api/courses/3/activities" | python3 -c \
  'import sys,json;print(next(a["id"] for a in json.load(sys.stdin) if a["name"]=="Assignment 1"))')
say "Assignment 1 = cmid $A1 (Separate Groups); student.multi (11) in A and B"

say "student.multi's allowed set = both groups (multi-membership, no dedupe)"
G=$(curl -sf "$API/api/groups/activities/$A1/allowed?user_id=11")
echo "$G" | python3 -c 'import sys,json;g=json.load(sys.stdin);n={x["name"] for x in g["groups"]};assert {"Group A","Group B"}<=n,n' \
  && ok "student.multi reaches Group A AND Group B" || die "expected union {A,B}"

say "grader in Group A (ta.a=8) reaches student.multi (shares Group A)"
V=$(curl -sf -X POST "$API/api/groups/access-check" -H "$J" \
  -d "{\"actor_user_id\":8,\"target_user_id\":11,\"activity_id\":$A1,\"action\":\"grade\"}")
echo "$V" | python3 -c 'import sys,json;v=json.load(sys.stdin);assert v["visible"] and v["action_allowed"],v' \
  && ok "reachable from Group A" || die "Group-A grader must reach the two-group student"

say "a Group-B-only member (student.b=12) shares Group B with student.multi"
V=$(curl -sf -X POST "$API/api/groups/access-check" -H "$J" \
  -d "{\"actor_user_id\":12,\"target_user_id\":11,\"activity_id\":$A1,\"action\":\"grade\"}")
echo "$V" | python3 -c 'import sys,json;v=json.load(sys.stdin);assert v["visible"],v' \
  && ok "visible from Group B (union)" || die "Group-B member must see the two-group student"

printf '\n\033[1;32mHC-04 GREEN — union reachable from either group, routed.\033[0m\n'
