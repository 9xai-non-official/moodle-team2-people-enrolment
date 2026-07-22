# Moodle Gaps NOT Solved by the Small Project

Precise, complete list of **behaviors present in Moodle (the big system) that the small system (`moodle-team2-people-enrolment`) did NOT fully solve** — i.e., every audited requirement whose verdict is **MISSING, BEHAVIOR_MISMATCH, FALSE_SIMILARITY, UNSTABLE, or PARTIALLY_PRESENT**.

Excluded here (because they ARE solved / equivalent, or out of scope): `FULLY_PRESENT`, `FUNCTIONALLY_EQUIVALENT`, and `NOT_APPLICABLE`. Those are in `IMPROVEMENTS-OVER-MOODLE.md` and `COVERAGE-MATRIX.md`.

**Source of truth:** `COVERAGE-MATRIX.md` + `evidence/moodle/*-final-verdicts.md` + `issues/`. Moodle = behavior truth. Nothing invented.

**Verdict key:** MISS = MISSING · MM = BEHAVIOR_MISMATCH · FS = FALSE_SIMILARITY (looks done, isn't) · UNS = UNSTABLE (crashes/unsafe) · PART = PARTIALLY_PRESENT (core exists, properties missing).

**Count of not-solved rows:** ENR 25 · RBAC 22 · GRP 20 · PRG 30 · DATA/EVT/HIS 22 → **~119 gap-rows** (plus the 5 hard-case shortfalls). The confirmed subset became the **26 issue files** in `issues/`.

---

## 🟢 RESOLUTION UPDATE (2026-07-22) — ~50 gap-rows closed at the DB layer

Whole clusters are now solved. Applied SQL + live proofs: `db/parity-fixes/`.
Strategy: fix each cluster **in the database**, where the guarantee cannot be
bypassed (the exact place Moodle is weakest — its integrity/events live in
skippable PHP).

| Cluster | Gap IDs closed | How | File |
|---|---|---|---|
| **Groups (whole area)** | GRP-005/006/012/015/016/017/018/019/021/022/030/031/032/033/034 | Work package 05 (PR #25): routed 500 fixed, SQL scope enforcement, gated mutations + server provenance, visibility, activity availability, group events | `services/groups.py` |
| **Events / audit** | EVT-001/002/003/004/005/011, ENR-014, RBAC-070, DATA-016, HIS-011, HC-05c | Universal audit **triggers** — bypass-proof ledger on enrolment + role_assignment (groups/progress app-audited) | `parity-fixes/01` |
| **Scheduled lifecycle** | ENR-017/018/021/032/033, EVT-009, PRG-023 | `pg_cron` jobs: stored expiry demotion + longtimenosee | `parity-fixes/03` |
| **Completion write + aggregation** | PRG-006/009/010/011/013/016/017/019/020/032/036, DATA-010/012 | Write path RPC + trigger-cascaded recompute; real ALL/ANY over criteria tables | `parity-fixes/02`, `parity-fixes/04` |
| **Progress view correctness** | PRG-001/002/018/026/027/028/029, PRG-003 (override) | D-VIEW (numerator filter + enrolment gate + ≤100 clamp), D-IMMUT (write-once), fn_can loaded | earlier this session |

**Honestly still open** (new subsystems / out of a DB pass, not code gaps):
RBAC-001 real session auth (interim principal in `app/deps.py`; Khaled WP04),
recycle-bin/privacy/category (HIS-008/010/012, PRG-035), perf caches
(RBAC-023). The rows below remain the authoritative pre-fix audit; the table
above is the delta.

---

## 1) ENROLMENT — not solved (25)

| ID | What Moodle does (the gap) | Team 2 status | Verdict | Issue |
|---|---|---|---|---|
| ENR-007 | `is_enrolled` with per-request cache + guest special-case | no cache, no guest case | PART | — |
| ENR-008 | `enrol_get_enrolment_end` — window-union end across methods | not computed | MISS | — |
| ENR-009 | re-enrol with null status **preserves** current status | upsert forces `active` → suspension bypass | PART+MM | `T2-ENR-002` |
| ENR-010 | status change is event-gated + marks dirty/cache | `_set_status` flips, no event, no gating | PART | — |
| ENR-011 | last-enrolment unenrol strips ALL course roles incl. `component=''` | keeps `component=''` roles → ghost access | MM (sub) | `T2-ENR-003` |
| ENR-012 | manual role stored `component=''` (survives per-path unenrol) | tagged `component='enrol_manual'` → dropped early | MM | `T2-ENR-005` |
| ENR-013 | active cohort enrolment not manually deletable (`allow_unenrol_user`) | freely deletable | MISS | — |
| ENR-014 | enrolment events fired + logged | no events; `audit_log` never written | MISS | `T2-DATA-001` |
| ENR-015 | `can_add_instance` guards each method type | only guest one-per-course guarded | MISS | — |
| ENR-016 | method seeds role/window/duration/period | `enrol_duration`/period unused (dead) | PART | — |
| ENR-017 | `expiredaction` (KEEP/SUSPEND/UNENROL) on expiry | none | MISS | `T2-ENR-004` |
| ENR-018 | scheduled expiry/sync task (cron) | no background task anywhere | MISS | `T2-ENR-004` |
| ENR-019 | self-enrol gate chain (new-allowed flag, cohort restriction, already-enrolled block, capability) | partial gate chain, several checks missing | PART | — |
| ENR-020 | self-enrol applies enrolment period (`timeend`) | period NOT applied | PART | `T2-ENR-004` |
| ENR-021 | `longtimenosee` — unenrol inactive self-enrolled users | not implemented (last-access written, never consumed) | MISS | `T2-ENR-004` |
| ENR-022 | self-enrol expiry action + notifications | none | MISS | `T2-ENR-004` |
| ENR-023 | self role `component=''` | tagged `component='enrol_self'` | MM | `T2-ENR-005` |
| ENR-025 | cohort sync 3 modes (UNENROL/SUSPEND/SUSPENDNOROLES) | UNENROL only | PART | — |
| ENR-026 | cohort cron self-heal + disabled-method role purge + role re-add pass | none of these; drift permanent until manual sync | PART | — |
| ENR-027 | `update_method` re-syncs; handles cohort-deleted | no re-sync, no cohort-deleted handler | PART | — |
| ENR-028 | `allow_group_member_remove=false` guard | not present | MISS | `T2-GRP-003` |
| ENR-031 | re-enrol grade recovery (`recovergradesdefault`) | no grades (Team-1 scope) → recovery not applicable but window not reset either | PART | — |
| ENR-032 | configurable UNENROL/SUSPEND action + stored demotion on expiry | expiry on-read only; `status` stays active forever | MISS | `T2-ENR-004` |
| ENR-033 | expiry notifications | none | MISS | `T2-ENR-004` |
| ENR-035 | `coding_exception` on invalid ops + capability gates | no typed errors; no capability gate | PART | `T2-ENR-001` |
| ENR-036 | enrol unit tests (enrollib/plugin tests) | only 2 non-hermetic bash scripts | PART | `T2-TEST-001` |

---

## 2) ROLES / CAPABILITIES / CONTEXTS — not solved (22)

| ID | What Moodle does (the gap) | Team 2 status | Verdict | Issue |
|---|---|---|---|---|
| RBAC-001 | authenticate the user (session) before any check | identity is a client param (spoofable) | MM/MISS | `T2-RBAC-001` |
| RBAC-005 | context locking (`locked` column) | no locking | MISS | — |
| RBAC-014 | `role_context_levels` — restrict which level a role can be assigned at | none (student assignable at system) | MISS | — |
| RBAC-015 | assign/override/switch/view relation matrices | only a hardcoded assign dict | PART | — |
| RBAC-020 | gate ordering; capability check independent of enrolment | added course-door/group gates couple enrolment into `check()` | PART/MM | `T2-RBAC-003` |
| RBAC-023 | accessdata cache | loads per-call, no cache (correctness ok) | PART | — |
| RBAC-024 | guest / not-logged-in / authenticated-user baseline roles | guest by username; empty `user` role; no baseline | MM | — |
| RBAC-026 | `loginas` subtree scoping | none | MISS | — |
| RBAC-027 | `has_any_capability` / `has_all` / `require_all` wrappers | none | MISS | — |
| RBAC-031 | override row lifecycle w/ event + cache + authz | no event/cache/authz | PART | `T2-RBAC-002` |
| RBAC-032 | `set_override` gated by `role:override` + `safeoverride` + allow-matrix | ungated → self-escalation | PART/MM | `T2-RBAC-002` |
| RBAC-033 | override minimisation / prohibit-in-chain guard | none | MISS | — |
| RBAC-034 | `get_users_by_capability` (who-can-do-X) | none | MISS | — |
| RBAC-035 | second by-capability SQL path | none (upside: no drift) | MISS | — |
| RBAC-041 | `course:view` = manager-only archetype | seeded to ALL roles → suspended access | MM | `T2-RBAC-003` |
| RBAC-042 | suspended user loses access via `onlyactive` (caps retained) | end-to-end suspended student keeps access via RBAC-041 | MM (downstream) | `T2-RBAC-003` |
| RBAC-043 | owner-scoped bulk role removal | partial (lives in enrolment service) | PART | — |
| RBAC-044 | role-switch requires holding `course:view` | no such guard | (FE, minor gap) | — |
| RBAC-050 | `accessallgroups` = editingteacher+manager at module | seeded to plain teacher (latent HC-03 risk) | MM | `T2-RBAC-004` |
| RBAC-051 | one cap gates both group visibility AND action | action in Python; visibility only in JS mock | PART/FS | `T2-GRP-002` |
| RBAC-070 | role/capability events + audit | none; `audit_log` unwritten | MISS | `T2-DATA-001` |
| RBAC-080 | every privilege write capability-gated | only `assign_role` enforces | PART | `T2-RBAC-002` |
| Q-022 | context reparent rebuilds descendant path/depth | non-recursive trigger → stale descendants | MM | `T2-RBAC-005` |

---

## 3) GROUPS / GROUPINGS — not solved (20)

| ID | What Moodle does (the gap) | Team 2 status | Verdict | Issue |
|---|---|---|---|---|
| GRP-001 | group/grouping `idnumber` uniqueness | app-level only (no DB guard); grouping has no id_number | PART | — |
| GRP-005 | 4-level visibility (ALL/MEMBERS/OWN/NONE) | no visibility column | MISS | `T2-GRP-004` |
| GRP-006 | `participation` flag consulted in scope | column exists, never consulted | PART | `T2-GRP-004` |
| GRP-009 | activity `defaultgroupingid` | none | MISS | — |
| GRP-012 | `groups_get_activity_allowed_groups` returns scoped set | routed path 500s (arity bug) | UNS | `T2-GRP-001` |
| GRP-013 | active-group selector (session) under separate mode | stateless; no selector | MISS | — |
| GRP-014 | current active group persisted per session | none | MISS | — |
| GRP-015 | `accessallgroups` resolution honoring prevent/depth | routed 500; dead fallback ignores prevent/depth | UNS | `T2-GRP-001` |
| GRP-016 | per-module active-group handling | routed 500 | UNS | `T2-GRP-001` |
| GRP-017 | separate-groups filters participant/member lists in query | data endpoints return everyone | MISS | `T2-GRP-002` |
| GRP-018 | visibility SQL withholds other groups' data | not enforced server-side | MISS | `T2-GRP-002` |
| GRP-019 | `managegroups` capability gates membership mutation | ungated | MISS | `T2-GRP-003` |
| GRP-020 | `groups_add_member` accepts suspended user (onlyactive=false) | returns 409 for suspended | PART+MM | `T2-GRP-003` |
| GRP-021 | server sets membership provenance (`component`,`itemid`) | client can forge via `MemberAdd` | MM | `T2-GRP-003` |
| GRP-022 | component-owned removal default-ALLOW via callback | default-DENY (inverse) → unremovable orphans | MM | `T2-GRP-003` |
| GRP-027 | course reset clears group memberships | no reset | MISS | — |
| GRP-030/031 | activity restriction by group/grouping (`availability_group`/`grouping`) | no availability model | MISS | `T2-GRP-005` |
| GRP-032/033 | hidden vs greyed rendering of restricted activity | none | MISS | `T2-GRP-005` |
| GRP-034 | `group_member_added/removed` events | none | MISS | — |
| GRP-037 | session-based active group storage | none | MISS | — |

---

## 4) PROGRESS / COMPLETION — not solved (30)

| ID | What Moodle does (the gap) | Team 2 status | Verdict | Issue |
|---|---|---|---|---|
| PRG-001 | site + course completion enablement gate | no enable column / gate | MISS | — |
| PRG-002 | per-activity NONE/MANUAL/AUTOMATIC tracking | boolean only (no manual/auto split) | PART | `T2-PRG-003` |
| PRG-003 | 4 states incl. pass/fail written | pass/fail never written live | PART | `T2-PRG-003` |
| PRG-005 | viewed→completion logic | `viewed_at` stored, no logic | PART | — |
| PRG-006 | `update_state()` write path | no activity-completion write endpoint | MISS | `T2-PRG-003` |
| PRG-007 | automatic state computation (`internal_get_state`) | none | MISS | `T2-PRG-003` |
| PRG-008 | grade-based completion + passgrade | no grade tables | MISS | — |
| PRG-009 | `set_module_viewed()` | live none; mock only | MISS | `T2-PRG-003` |
| PRG-010 | manual completion self-mark toggle | `/toggle` is mock-only | FS | `T2-PRG-003` |
| PRG-011 | override + `overrideby` + lock auto-recompute | column exists; no live route; mock | FS | `T2-PRG-003` |
| PRG-012 | `get_data()` read + per-user cache | read via view; no cache | PART | — |
| PRG-013 | `internal_set_data()` persist + event + instant aggregate | no write, no event, no cascade | MISS | `T2-PRG-003` |
| PRG-014 | activity delete clears its completion | soft-delete; rows retained → over-count | MM | `T2-PRG-001` |
| PRG-015 | `reset_all_state()` recompute | none | MISS | — |
| PRG-016 | 8 criteria types | no criteria table; mock 4 kinds | FS | `T2-PRG-003` |
| PRG-017 | ALL/ANY aggregation overall + per-type | mock overall-only | FS | `T2-PRG-003` |
| PRG-018 | course completion `timecompleted` immutable | mutable (re-POST rewrites; DELETE un-completes) | MM | `T2-PRG-002` |
| PRG-019 | per-criterion completion (CCCC) | no table | MISS | `T2-PRG-003` |
| PRG-020 | `aggregate_completions()` engine + reaggregate flag | read-time view only | MISS | `T2-PRG-003` |
| PRG-021 | `mark_activity_criteria()` | none | MISS | — |
| PRG-023 | daily mark-enrolled job (cron) | no background job | MISS | — |
| PRG-025 | criteria settings locking after data | none | MISS | — |
| PRG-026 | `get_course_progress_percentage` ≤100, null-safe | returns 0.0 not null; >100 reachable | MM | `T2-PRG-001` |
| PRG-027 | denominator excludes hidden + per-user group-restricted | no visible/group filter | MM | `T2-PRG-001` |
| PRG-028 | numerator = visible COMPLETE/PASS only | counts hidden/non-tracked/deleted | MM | `T2-PRG-001` |
| PRG-029 | `is_tracked_user()` enrolment gate on progress | view has no enrolment join → shows unenrolled | MM | `T2-PRG-005` |
| PRG-032 | activity delete → recompute course completion | stale numerator | MM | `T2-PRG-001` |
| PRG-034 | course reset wipes completion | no reset endpoint | MISS | — |
| PRG-035 | GDPR/privacy erasure of completion | no privacy provider | MISS | — |
| PRG-036 | completion events + hook | none; audit unwritten | MISS | `T2-DATA-001` |
| HC-05b | 3-year progress time-series | mock-fabricated timeline | FS | `T2-PRG-004` |
| HC-05c | durable residue after deletion (ledger/log) | `audit_log` defined, never written | MISS | `T2-DATA-001` |

---

## 5) DATA / EVENTS / RETENTION — not solved (22)

| ID | What Moodle does (the gap) | Team 2 status | Verdict | Issue |
|---|---|---|---|---|
| DATA-010 | `activity_completion` populated by code | schema exact, but no writer (seed/external only) | PART | `T2-PRG-003` |
| DATA-012 | completion-criteria model | none | MISS | `T2-PRG-003` |
| DATA-016 | full audit coverage of mutations | partial; `audit_log` unwritten | PART | `T2-DATA-001` |
| EVT-001 | `user_enrolment_created` event | none | MISS | `T2-DATA-001` |
| EVT-002 | `user_enrolment_updated` event | none | MISS | `T2-DATA-001` |
| EVT-003 | `user_enrolment_deleted` event | none | MISS | `T2-DATA-001` |
| EVT-004 | `role_assigned` event | none | MISS | `T2-DATA-001` |
| EVT-005 | `role_unassigned` event | none | MISS | `T2-DATA-001` |
| EVT-006 | course-completion (re)aggregation task/event | none (on-read only; no persisted history) | MISS | — |
| EVT-007 | `group_member_added/removed` events | none | MISS | — |
| EVT-008 | observers reacting to enrolment change | partial (direct calls) | PART | — |
| EVT-009 | expiry via scheduled task + `expiredaction` | passive on-read only | MM | `T2-ENR-004` |
| EVT-010 | cohort event fans out (enrol + badge review + audit) | enrol reaction only; badge/audit reactions absent | (FE + gaps) | — |
| EVT-011 | mutation → `logstore_standard_log` write | `audit_log` never written | MISS | `T2-DATA-001` |
| HIS-002 | last-unenrol strips all course roles | keeps `component=''` roles (ghost access) | MM | `T2-ENR-003` |
| HIS-005 | user delete = anonymise-in-place | no user-deletion/anonymise path | MISS | — |
| HIS-006 | `delete_course` destructively cascades all rows | soft-delete keeps all; no cleanup (divergent model) | MM | `T2-DATA-004` |
| HIS-007 | module delete removes its completion + context | no module-delete semantics (FK RESTRICT blocks) | MISS | `T2-DATA-004` |
| HIS-008 | category delete cascades to courses | no category entity at all | MISS | `T2-DATA-004` |
| HIS-009 | history/retention of removed rows | partial (context cascade only) | PART | — |
| HIS-010 | recycle-bin (1-week course/category retention) | none | MISS | — |
| HIS-011 | `logstore` is the retained system-of-record | no populated durable log | MISS | `T2-DATA-001` |
| HIS-012 | privacy API providers (enrol/group/completion) | none | MISS | — |

---

## 6) HARD CASES — where the target falls short of Moodle

| HC | Moodle behavior the target does NOT fully deliver | Verdict | Issue |
|---|---|---|---|
| HC-01 | SUSPEND / SUSPENDNOROLES cohort removal modes (only UNENROL exists) | partial gap | `T2-ENR-004` |
| HC-02 | full role strip on last unenrol; grade recovery (Team-1) | ghost-role gap | `T2-ENR-003` |
| HC-03 | working, enforced group-scoped marking (routed path 500s; scope not enforced) | UNS + MM | `T2-GRP-001`,`T2-GRP-002` |
| HC-04 | working routed multi-group behavior + active-group selector (routed 500; no selector) | PART | `T2-GRP-001` |
| HC-05 | true 3-year longitudinal history + durable residue (timeline is mock; no ledger; no audit) | FS + MISS | `T2-PRG-004`,`T2-DATA-001` |

---

## 7) The big themes (why these gaps exist)
1. **No enforcement layer:** authentication + capability checks on mutations are largely absent — this drives many ENR/RBAC/GRP "MISS/MM".
2. **No background processing:** no cron/tasks at all → all expiry, reaggregation, sync-self-heal, and daily jobs are MISSING.
3. **No events / no audit writes:** the whole EVT-* family + audit trail is MISSING (`audit_log` never written).
4. **Mock-only richness:** completion criteria/aggregation/override + HC-05 timeline exist only in the frontend → FALSE_SIMILARITY.
5. **A routed crash:** the group access path 500s → UNSTABLE for everything group-scoped.
6. **Lifecycle depth:** deletion/retention/recycle-bin/privacy and the finer enrolment lifecycle (expiry, longtimenosee, per-mode cohort actions) are not built.

---
*Complete not-solved set derived from `COVERAGE-MATRIX.md`. The confirmed, evidence-backed subset is written up individually in `issues/` (26 files). Precision note: PARTIALLY_PRESENT means the core works but a named Moodle property is missing — see the specific requirement in the coverage matrix / evidence files for the exact missing property and code location.*
