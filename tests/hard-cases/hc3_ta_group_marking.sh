#!/usr/bin/env bash
# Hard Case #3 — TA marks own group, cannot mark/see another, cannot see a third.
# Owner: Mahmoud (task 05 §18). Verified rules: R-SCOPE (GRP-015), Moodle
# lib/grouplib.php:1219-1245; T2-GRP-001 (routed, no 500) + T2-GRP-002.
#
# Seeded stage (fixtures.sql): CS101 (course 3), Assignment 1 inherits SEPARATE.
#   ta.a  (user 8)  — Non-editing teacher scoped to Group A (course-context
#                     PREVENT on site:accessallgroups → own groups only).
#   ta.allgroups (9) — same role duplicated WITH accessallgroups → all groups.
#   student.a (10) Group A · student.multi (11) A+B · student.b (12) Group B.
#
# Asserts the REAL routed verdicts (not the pure helper): ta.a reaches
# student.a (shared Group A) but neither sees nor acts on student.b (Group B);
# ta.allgroups reaches everyone. Hermetic: no creds, only the seeded API.
#
# Usage: API=http://localhost:8011 bash tests/hard-cases/hc3_ta_group_marking.sh
set -euo pipefail
API="${API:-http://localhost:8011}"
J='content-type: application/json'
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()  { printf '  \033[32mPASS\033[0m %s\n' "$*"; }
die() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; exit 1; }

A1=$(curl -sf "$API/api/courses/3/activities" | python3 -c \
  'import sys,json;print(next(a["id"] for a in json.load(sys.stdin) if a["name"]=="Assignment 1"))')
say "Assignment 1 = cmid $A1 (inherits Separate Groups)"

check() { # actor target -> jq field
  curl -sf -X POST "$API/api/groups/access-check" -H "$J" \
    -d "{\"actor_user_id\":$1,\"target_user_id\":$2,\"activity_id\":$A1,\"action\":\"grade\"}"
}

say "ta.a (8) vs student.a (10) — shared Group A → visible + actionable"
V=$(check 8 10)
echo "$V" | python3 -c 'import sys,json;v=json.load(sys.stdin);assert v["visible"] and v["action_allowed"],v' \
  && ok "ta.a can mark student.a" || die "ta.a should reach own-group student"

say "ta.a (8) vs student.b (12) — Group B, no share, no accessallgroups → hidden"
V=$(check 8 12)
echo "$V" | python3 -c 'import sys,json;v=json.load(sys.stdin);assert not v["visible"] and not v["action_allowed"],v' \
  && ok "ta.a cannot see/mark student.b" || die "ta.a must NOT reach other group"

say "ta.allgroups (9) vs student.b (12) — accessallgroups reaches all"
V=$(check 9 12)
echo "$V" | python3 -c 'import sys,json;v=json.load(sys.stdin);assert v["visible"] and v["action_allowed"],v' \
  && ok "ta.allgroups reaches every group" || die "ta.allgroups should reach all"

say "T2-GRP-002 enforcement: ta.a's allowed set for the activity = {Group A}"
G=$(curl -sf "$API/api/groups/activities/$A1/allowed?user_id=8")
echo "$G" | python3 -c 'import sys,json;g=json.load(sys.stdin);n={x["name"] for x in g["groups"]};assert n=={"Group A"},n' \
  && ok "ta.a scoped to Group A only" || die "ta.a allowed set must be exactly {Group A}"

printf '\n\033[1;32mHC-03 GREEN — routed, real API, no 500.\033[0m\n'
