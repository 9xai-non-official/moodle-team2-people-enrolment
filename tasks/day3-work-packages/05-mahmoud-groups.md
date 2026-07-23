# Work Package 05 — Mahmoud — Groups & Groupings

**Engineer:** Mahmoud · **Domain:** Groups, groupings, group membership, separate/visible group modes, group-scope decision AND enforcement (`groups.py`, `services/groups.py`)
**Team:** Team 2 (People & Enrolment) · **Integration branch:** `team2/parity-fixes`
**Status of inputs:** parity audit COMPLETE. This package converts the confirmed audit issues into an implementation plan. It invents nothing; every task cites a target file:symbol, a Moodle source symbol (behaviour truth), or a coordination doc.
**Source-of-truth precedence used throughout:** Moodle = behaviour truth (`/Users/yamanobiedat/Documents/GitHub/moodle/public/...`); `schema.sql` = enforceable DDL truth (Essa-owned); staging = UI truth (NO staging access in this environment — UI behaviour not derivable from the committed frontend is flagged `INSUFFICIENT EVIDENCE — requires staging inspection`).
**Issues owned by this package:** T2-GRP-001, T2-GRP-002, T2-GRP-003, T2-GRP-004, T2-GRP-005. Contributes writes for T2-DATA-001 (`audit_log` — `group.*` events). Cross-referenced (not owned): T2-RBAC-004 (accessallgroups seed — Essa/Khaled D-SEED).

---

## 1. Executive summary

The groups subsystem has a **correct, unit-tested decision core that is unreachable through the API, and no enforcement anywhere.** The pure helpers `effective_mode` (`services/groups.py:41-50`), `resolve_allowed_group_ids` (`:53-73`) and `scope_verdict` (`:76-136`) faithfully model Moodle's separate/visible/access-all-groups logic — and are in fact **more expressive than Moodle core** (they separate SEE from ACT-ON at group granularity, HC-03 §3). But the only routed realization of that logic 500s, no data endpoint filters by group scope, and membership mutations are ungated with client-forgeable provenance. The polished demo works only because the JS mock re-implements the rules — a FALSE_SIMILARITY that hides the broken backend.

The work is to close **five confirmed gaps**, in priority order:

1. **T2-GRP-001 (High) — routed access-check crashes (HTTP 500).** `services/groups.py:201` calls `has_capability(user_id, "moodle/site:accessallgroups", course_id)` — three positionals — against the real signature `has_capability(db, user_id, capability, context_id)` (`permissions.py:714-715`). The import at `:182` always succeeds so the `except` fallback (`:184-200`) is dead code; the mismatched call raises `TypeError` → `/access-check` and `/allowed` 500. Fix the call to Khaled's canonical signature (`D-GRP-ARITY`), resolve course→context id, use the canonical capability name (`D-CAPNAME`), remove the dead over-granting fallback.
2. **T2-GRP-002 (High) — separate/visible not enforced server-side.** Group mode is advisory only; data endpoints (`group_members` `:222-235`, `list_course_groups` `:207-219`) return everything. Push the resolved allowed-group set into the queries (Moodle's `groups_get_members_join`).
3. **T2-GRP-003 (High) — ungated mutations + forgeable provenance.** Add/remove/create/delete have no capability check (`routers/groups.py:37-64`); `MemberAdd.component`/`item_id` come from the client (`schemas_groups.py:19-22`). Gate with the manage-groups capability (`D-ENFORCE`), set provenance server-side, stop honouring client `component` (`D-GM`), realign component-owned removal to Moodle's default-allow.
4. **T2-GRP-004 (Medium) — no 4-level visibility.** No per-group ALL/MEMBERS/OWN/NONE; `participation` stored but never consulted (`:53-136`). Consume Essa's `D-GRP-VIS` column/enum and honour visibility + participation in scope.
5. **T2-GRP-005 (Medium) — no activity availability restriction.** No group/grouping availability conditions; `ActivityPolicyTable` is display-only. Consume Essa's `D-GRP-AVAIL` tables and enforce hidden-vs-greyed access.

All schema changes are **Essa dependencies** (`D-GRP-VIS`, `D-GRP-AVAIL`, `D-AUDIT` adequacy). Mahmoud writes NO DDL, never touches another engineer's files, and never sets membership provenance from client input. HC-03 (TA scoped to own group) and HC-04 (student in two groups, union) must work end-to-end once T2-GRP-001 + D-SEED land.

---

## 2. Scope

Owned outright (edit freely, within the matrix — TEAM-OWNERSHIP-MATRIX §1,§2,§3,§5,§6,§7,§8):

- **Backend router:** `app/routers/groups.py`.
- **Backend service:** `app/services/groups.py` (**sole writer of `group_member`** for `component=''` and self-originated rows).
- **Backend schemas:** `app/schemas_groups.py`.
- **Backend tests:** `backend/tests/test_groups.py`; new hard-case scripts `tests/hard-cases/hc3_ta_group_marking.sh`, `tests/hard-cases/hc4_two_groups.sh`.
- **Frontend page:** `src/pages/GroupsPage.jsx`.
- **Frontend components:** `src/components/groups/*` — `GroupsBoard.jsx`, `GroupingPanel.jsx`, `ActivityPolicyTable.jsx`, `ScopeCheckPanel.jsx`.
- **Frontend adapter + mock:** `src/lib/groupsApi.js`, `src/mocks/groups.js` (retire/replace per MERGE-STRATEGY).
- **DB tables (domain owner — request DDL via Essa):** `course_group`, `group_member` (semantics), `grouping`, `grouping_group`.
- **Dual-write provenance (code contract only):** you own `group_member` `component=''` rows and any you originate; Yaman writes `component='enrol_self'/'enrol_cohort'`+`item_id`=method id rows under `D-GM`.
- **Audit rows:** `audit_log` events with `event` prefix `group.*` (append-only; `D-AUDIT`).

New grouping-write endpoints (`POST /api/groups/groupings`, assign group to grouping) are in your scope — the schemas exist (`schemas_groups.py:25-33`) but no route/service does (§11). If a new group endpoint needs a client method in `src/api.js`, that is a **shared-surface change routed through Essa** (custodian), submitted as an additive diff per MERGE-STRATEGY §"Shared-surface protocol". `main.py` already wires `groups.router` (`routers/groups.py:8`) — do not touch it; auth-middleware wiring is D-AUTH (Khaled+Essa).

---

## 3. Out of scope

- **All DDL / migrations / seed** — Essa only. Any column, enum, index, constraint, view or trigger change is a dependency to Essa (`D-GRP-VIS` visibility column/enum, `D-GRP-AVAIL` availability tables, `D-AUDIT` adequacy). Mahmoud never edits `schema.sql`, `fixtures.sql`, `seed.sql`.
- **Authentication mechanism** — Khaled (`D-AUTH`). Mahmoud consumes `Depends(current_user)`; does not build session/JWT verification.
- **Authorization engine** — Khaled (`D-ENFORCE`). Mahmoud consumes `has_capability(db, user_id, capability, context_id)` and `require_capability(...)`; does not implement capability resolution, `permissions.py`, `fn_can`, or `context` writes. The `groups.py:201` fix is a caller change — you never edit `permissions.py`.
- **Capability seed / accessallgroups default** — Essa/Khaled (`D-SEED`, `D-CAPNAME`). T2-RBAC-004 is not yours to fix; your part is honouring `prevent` on the fixed routed path and calling the canonical name.
- **`role_assignment` / `role` / `capability` / `role_capability` / `context`** — Khaled. READ-ONLY (see §9).
- **`enrolment*`** — Yaman. READ-ONLY; you read `is_active_enrolled` via the wrapper only (`services/groups.py:144-170`). You never edit `enrolment.py`; the participant roster (`enrolment.py:660-723`) is Yaman's — raise its scoping as a note, do not implement it.
- **`course_completion`/`activity_completion`** — Mahdi. NO ACCESS.
- **`course`/`course_activity` projection** — Essa (Team-1 sync). READ-ONLY; you PATCH only the two policy columns you own via `set_activity_group_policy` (`:506-526`).
- **Grades / activity submission** — not modelled anywhere (Team-1 scope); do not build one (HC-04 submission is NOT_APPLICABLE).
- **`main.py`, `db.py`, `supa.py`, `app/schemas.py`, `routers/__init__.py`, `api.js`, `errors.js`, `src/components/common/*`, `src/context/SelectedCourse.jsx`, `src/mocks/{core,seed,index}.js`** — SHARED-Essa custodian; changes only via coordination PR. Never add group models to `app/schemas.py` — they live in `schemas_groups.py` (`schemas_groups.py:1-4`).

---

## 4. Objectives

- **O1 — One reachable, correct scope path.** `/access-check` and `/allowed` call `has_capability(db,user_id,capability,context_id)` with a resolved context id and the canonical capability name, honour `prevent`/depth, and return the pure-helper verdict — no 500. (T2-GRP-001)
- **O2 — Enforce group scope in the data layer.** Member/group-list queries return only what the authenticated caller's allowed-group set permits; accessallgroups holders bypass; a no-group student under separate mode sees none. Filtering is in SQL, not Python post-filter. (T2-GRP-002)
- **O3 — Gated, server-authoritative mutations.** Every add/remove/create/delete requires the manage-groups capability at the course context; `component`/`item_id` are server-set; the client cannot forge provenance; component-owned removal defaults to allow per Moodle. (T2-GRP-003)
- **O4 — Visibility-aware scope.** Per-group ALL/MEMBERS/OWN/NONE and `participation` are honoured in member/roster/selection scope, against Essa's `D-GRP-VIS` schema. (T2-GRP-004)
- **O5 — Availability enforcement.** Activity access is gated by group/grouping availability conditions with hidden-vs-greyed rendering, against Essa's `D-GRP-AVAIL` schema; accessallgroups always passes. (T2-GRP-005)
- **O6 — Auditable.** Every membership/lifecycle change writes a `group.*` `audit_log` row (Moodle `group_member_added/removed` parity). (T2-DATA-001 group writes)
- **O7 — Truthful demo.** The four mock-vs-real FALSE_SIMILARITY divergences are removed; the demo shows what the backend does.
- **O8 — Tested & regression-safe.** Routed pytest (not helper-only) + authz + provenance + visibility + availability coverage; HC-03/HC-04 hermetic scripts asserting real routed state; pure-helper regression stays green; all §16 strengths preserved.

---

## 5. Complete implementation roadmap

Ordered by dependency and risk. Each step names its gating dependency (§23) and merge unit (§24).

**Phase A — rebase on foundation (blocked until Phase 1 of IMPLEMENTATION-ORDER lands).**
Wait for `t2/essa/D-SEC`, Essa's migration batch (incl. `D-GRP-VIS`, `D-GRP-AVAIL`, `D-SEED`), `t2/khaled/D-AUTH`, `t2/khaled/D-ENFORCE`, and the `D-CAPNAME`/`D-GRP-ARITY` signature. Rebase all Mahmoud branches on these so authz wiring is done once (MERGE-STRATEGY §Conflict-avoidance).

**Phase B — arity fix (T2-GRP-001, branch `t2/mahmoud/T2-GRP-001-arity`).**
1. Rewrite `_has_accessallgroups` (`:173-201`): call `await has_capability(db, user_id, <canonical accessallgroups name>, context_id)` where `context_id` is resolved from the course id via Khaled's `D-GRP-ARITY` context helper (course id ≠ context id — HC-03 §7). Use the `D-CAPNAME` canonical name; remove the hard-coded `"moodle/site:accessallgroups"` literal.
2. Remove the dead prefixed-name fallback (`:184-200`) — it ignores `prevent`/depth and would over-grant `ta.a` (`03-groups-inventory.md §11`). If a fallback is kept for resilience, it MUST delegate to the same allow/prevent/prohibit+depth semantics.
3. Wrap in a correct error boundary: unknown/not-held capability → `False` (matches `permissions.py:723-724`), genuine resolver failure → clean 5xx, never a bare `TypeError`.

**Phase C — gate + provenance (T2-GRP-003, branch `t2/mahmoud/T2-GRP-003-gated-mutations`).**
4. Add `Depends(current_user)` (`D-AUTH`) + `require_capability(<canonical managegroups>, course-context)` (`D-ENFORCE`) to create/delete group, add/remove member, patch policy, and new grouping-write routes (`routers/groups.py:30-79`). Non-manager → 403.
5. Drop client provenance: reduce `MemberAdd` to `{user_id}` (or reject client `component`/`item_id`); `add_member` sets `component=''`/`item_id=0` server-side for manual adds (Moodle `group/lib.php:77-101`); only Yaman's enrolment code sets `enrol_*` via `D-GM`.
6. Realign `remove_member` (`:404-425`) to default-allow for a manager (Moodle `group/lib.php:184-185`); capability-gate the `force` path; make non-member remove idempotent (GRP-021).
7. Write `group.member_added`/`group.member_removed` audit rows (`D-AUDIT`).

**Phase D — scope enforcement (T2-GRP-002, branch `t2/mahmoud/T2-GRP-002-scope-enforcement`).** Requires B.
8. Add the authenticated caller to `group_members`/`list_course_groups` (`D-AUTH`); compute the caller's allowed-group set and push it into the SQL WHERE/JOIN (Moodle `groups_get_members_join`); accessallgroups bypasses; no-group separate student sees none.

**Phase E — visibility (T2-GRP-004, branch `t2/mahmoud/T2-GRP-004-visibility`).** Requires Essa `D-GRP-VIS`.
9. Read `visibility` + `participation`; implement ALL/MEMBERS/OWN/NONE (Moodle `lib/grouplib.php:61-79`); thread `participation_only` through `_universe_group_ids`/`allowed_groups`.

**Phase F — availability (T2-GRP-005, branch `t2/mahmoud/T2-GRP-005-availability`).** Requires Essa `D-GRP-AVAIL`.
10. Add a group/grouping availability-evaluation helper (in `services/groups.py` or a new group-owned module, never `permissions.py`); enforce on activity access; expose hidden-vs-greyed; accessallgroups always passes.

**Phase G — grouping writes (branch `t2/mahmoud/groupings-write`).** Any time after C.
11. Add `POST /api/groups/groupings` (create) + `POST /api/groups/groupings/{id}/groups` (assign) backing the existing schemas; gate with managegroups.

**Phase H — frontend + tests.**
12. Fix the mock/real divergences (§7); wire the fixed contract; surface visibility/availability; HC-04 selector.
13. Add routed + authz + provenance + visibility + availability tests; make `hc3`/`hc4` hermetic (§20).

**Phase I — integration (Phase 3 of IMPLEMENTATION-ORDER).**
14. Cross-domain scenarios (XD-02 group-scope-vs-capability, XD-07 override disagreement) from `cross-system-resolution.md`; runtime confirmations (§29).

---

## 6. Backend files to modify

| File | Change | Issues |
|---|---|---|
| `app/services/groups.py` | Rewrite `_has_accessallgroups` (`:173-201`) — canonical signature + context-id resolution + remove dead fallback; add caller-scope SQL filter to `group_members` (`:222-235`) & `list_course_groups` (`:207-219`); thread `participation`/`visibility` through `resolve_allowed_group_ids`/`scope_verdict`/`_universe_group_ids` (`:53-136,290-301`) WITHOUT changing the endorsed union/mode logic; server-set provenance in `add_member` (`:380-401`); default-allow + gated `force` + idempotent non-member in `remove_member` (`:404-425`); `idnumbertaken` guard in `create_group` (`:470-479`); new availability helper; new grouping-write functions; `audit_log` writes | T2-GRP-001/002/003/004/005 |
| `app/routers/groups.py` | Add `Depends(current_user)` (D-AUTH) to scoping reads + all mutations; `require_capability` (D-ENFORCE) on create/delete/add/remove/patch + grouping writes; stop passing `body.component`/`body.item_id` (`:51`); map 401/403/404/409; add grouping-write routes | T2-GRP-001/002/003 |
| `app/schemas_groups.py` | Reduce `MemberAdd` (`:19-22`) to `{user_id}` (drop client provenance) or add a rejecting validator; keep frozen `AccessCheckResponse` field names (`:49-59`) — additions additive-only; wire `GroupingCreate`/`GroupingGroupAdd` (`:25-33`) to real routes; add availability response models | T2-GRP-003/005 |

Never add group models to `app/schemas.py` (Essa custodian).

---

## 7. Frontend files to modify

Staging = UI truth, but **no staging access**; the following are grounded in the committed components. UI behaviour not derivable is flagged.

| File | Change | Evidence / flag |
|---|---|---|
| `src/lib/groupsApi.js` | `accessCheck` already retries with the real `{actor_user_id,...}` body (`:91-98`) — once §5 Phase B lands the retry succeeds instead of 500; confirm the outcome mapping (`:99`) still holds (`invisible`/`allowed`/`denied`) | derivable from `groupsApi.js:81-101` |
| `src/components/groups/GroupsBoard.jsx` | Stop sending client provenance; `addMember` posts `{user_id, actor_id}` (`:46-49`) — send only `{user_id}` (principal is the session user post-D-AUTH); reconcile the Force-remove trigger (`:68` `e.payload?.machine_owned`) with the corrected backend removal contract | derivable; final button flow **INSUFFICIENT EVIDENCE — requires staging inspection** |
| `src/components/groups/ScopeCheckPanel.jsx` | No logic change (verdict comes from API, `:1-3`); confirm banner rendering after the endpoint no longer 500s; `as ta.a`/`as ta.allgroups` quick-toggle (`:78-92`) demonstrates HC-03 | derivable |
| `src/components/groups/ActivityPolicyTable.jsx` | After `D-GRP-AVAIL`, render the availability restriction + hidden/greyed state (currently effective-mode only, display-only) | shape gated on D-GRP-AVAIL; **INSUFFICIENT EVIDENCE** on rendering |
| `src/components/groups/GroupingPanel.jsx` | After grouping-write endpoints (§11), wire create/assign actions (currently read-only) | derivable |
| `src/pages/GroupsPage.jsx` | No structural change; 4 tabs (`:13,32-35`) still function once the mock is retired | derivable |
| `src/mocks/groups.js` | Fix/retire the four FALSE_SIMILARITY divergences: duplicate-add mock 409 (`:85-87`) vs backend silent-200 (align to backend — backend is parity-correct); machine-owned `machine_owned` flag (`:104-108`) absent on real backend; the mock's `prevent`-honouring aag resolver (`:27-46`) vs the (now fixed) backend; retire the independent resolver per MERGE-STRATEGY | derivable; `03-groups-inventory.md §False-similarity` |

Shared frontend surfaces (`src/api.js`, `src/errors.js`, `src/components/common/*`, `src/context/SelectedCourse.jsx`; `src/context/ActingUser.jsx` is Khaled's) — new endpoints/error codes go through the Essa coordination PR.

---

## 8. Database tables (owned domain — DDL requested via Essa; written by Mahmoud code)

| Table | DDL ref | Mahmoud writes | Notes |
|---|---|---|---|
| `course_group` | `schema.sql:289-298` | create/delete group | `visibility` column does NOT exist — request via `D-GRP-VIS`; `participation` present (`:296`) but never consulted by scope; no unique on `id_number` (matches Moodle) — app-layer `idnumbertaken` guard needed |
| `group_member` | `schema.sql:301-308` | add/remove; server-set `component`/`item_id` | PK `(group_id,user_id)` (`:307`) = (user,group) uniqueness + concurrency backstop; dual-written by Yaman (`enrol_*` rows) under `D-GM`; `on delete cascade` from group (`:302`) |
| `grouping` | `schema.sql:318-324` | create (new endpoint) | no `id_number` column at all (GRP-003) |
| `grouping_group` | `schema.sql:326-331` | assign group (new endpoint) | m2m PK `(grouping_id,group_id)` (`:330`); both FKs `on delete cascade` |

Availability restriction tables do NOT exist — request via `D-GRP-AVAIL`. `audit_log` append-only writes (`group.*`) via `D-AUDIT`. `course_activity.group_mode`/`grouping_id` (`schema.sql:92-93`) are patched only through `set_activity_group_policy` (the two policy columns you own).

---

## 9. Database tables (READ ONLY)

Per matrix §11, Mahmoud reads but never writes these:

- `enrolment`, `enrolment_method` — Yaman. Read only via `_is_active_enrolled` wrapper (`services/groups.py:144-170`) to enforce the add-member enrolment guard (SA-GRP-004). Never edit `enrolment.py`.
- `role`, `role_assignment`, `role_capability`, `capability` — Khaled. Never queried directly for capability decisions — consume `has_capability`/`require_capability`.
- `context` — Khaled. Read only via Khaled's `D-GRP-ARITY` course→context helper; never insert a context.
- `course`, `course_activity` — Essa (Team-1 projection). Read for policy/universe resolution (`activity_policy` `:258-287`, `_universe_group_ids` `:290-301`); PATCH only the two owned policy columns.
- `course_completion`, `activity_completion` — Mahdi. Not read or written by groups.

---

## 10. Database tables (NO ACCESS)

- **Business logic of** `capability`, `role_capability`, `fn_can`, `permissions.py` internals — Khaled's engine. Call the published `has_capability`/`require_capability` API only; never re-implement resolution in `groups.py` (the dead fallback at `:184-200` is exactly this anti-pattern and must be removed).
- **`enrolment` lifecycle semantics** — Yaman's logic. Do not implement enrolment status decisions; the group service is the passive party (`03-groups-inventory.md §6`).
- **`role_assignment` rows (any component)** — Khaled-owned; groups never write role rows.
- **`course_completion*` / criteria tables (Mahdi's `D-CRIT` new tables)** — no access.
- **`v_course_participant` / `v_course_progress` / `v_enrolment_detail`** — other domains' views; read-through only where already used, never modify (Essa owns DDL).

---

## 11. API endpoints

All endpoints live in `routers/groups.py`, prefix `/api/groups` (frozen). **Every mutation gains `Depends(current_user)` + `require_capability` (T2-GRP-003).** Scoping reads gain `Depends(current_user)` (T2-GRP-002). Capability names use the canonical form Khaled publishes under `D-CAPNAME`; the table uses Moodle names as the intent.

| Method + path | Handler (line) | Mutation? | Capability (course context) | Change |
|---|---|---|---|---|
| GET `/api/groups` | `list_groups` (`:25-27`) | read | view groups | add principal + visibility filter (T2-GRP-002/004) |
| POST `/api/groups` | `create_group` (`:30-34`) | write | `moodle/course:managegroups` | authz; `idnumbertaken` guard (T2-GRP-003) |
| DELETE `/api/groups/{id}` | `delete_group` (`:37-40`) | write | managegroups | authz (T2-GRP-003) |
| GET `/api/groups/{id}/members` | `list_members` (`:44-45`) | read | view members | add principal + scope/visibility filter (T2-GRP-002/004) |
| POST `/api/groups/{id}/members` | `add_member` (`:49-55`) | write | managegroups | authz; drop client `component`/`item_id`; server provenance; keep enrolment-guard 409 (T2-GRP-003) |
| DELETE `/api/groups/{id}/members/{user_id}` | `remove_member` (`:58-64`) | write | managegroups | authz; default-allow; gate `force` (T2-GRP-003) |
| GET `/api/groups/groupings` | `list_groupings` (`:68-70`) | read | view groups | — |
| POST `/api/groups/groupings` *(new)* | — | write | managegroups | create grouping (schema `GroupingCreate` exists) (§5 Phase G) |
| POST `/api/groups/groupings/{id}/groups` *(new)* | — | write | managegroups | assign group (schema `GroupingGroupAdd` exists) |
| PATCH `/api/groups/activities/{id}` | `patch_activity_policy` (`:74-79`) | write | managegroups | authz |
| GET `/api/groups/activities/{id}/policy` | `activity_policy` (`:82-88`) | read | view | unchanged (works — no aag call); optionally include availability (T2-GRP-005) |
| GET `/api/groups/activities/{id}/allowed` | `activity_allowed_groups` (`:91-93`) | read | view | unblocked by T2-GRP-001; participation-aware (T2-GRP-004) |
| POST `/api/groups/access-check` | `access_check` (`:97-104`) | read/decision | view | unblocked by T2-GRP-001 |

No business endpoint is invented beyond the two grouping-write routes, whose Pydantic models already exist (`schemas_groups.py:25-33`).

---

## 12. Services

`app/services/groups.py` (owner Mahmoud) — function-level work:

- `_has_accessallgroups` (`:173-201`) — **T2-GRP-001**: canonical `has_capability(db,user_id,cap,context_id)`; resolve context id via `D-GRP-ARITY` helper; canonical name (`D-CAPNAME`); remove dead over-granting fallback; correct error boundary (unknown cap → False).
- `group_members` (`:222-235`), `list_course_groups` (`:207-219`) — **T2-GRP-002/004**: accept caller scope; push allowed-group + visibility filter into SQL; accessallgroups bypass; no-group separate → none.
- `resolve_allowed_group_ids` (`:53-73`), `scope_verdict` (`:76-136`), `_universe_group_ids` (`:290-301`) — **T2-GRP-004**: thread `participation`/`visibility`; **preserve the endorsed union/mode/SEE-vs-ACT-ON logic** (§16 strengths).
- `add_member` (`:380-401`) — **T2-GRP-003**: server-set `component=''`/`item_id=0`; keep the `_is_active_enrolled` guard (SA-GRP-004) and `on conflict do nothing` (GRP-036); write audit.
- `remove_member` (`:404-425`) — **T2-GRP-003**: default-allow for manager; capability-gate `force`; idempotent non-member (GRP-021); write audit.
- `create_group` (`:470-479`) — **T2-GRP-003**: add `idnumbertaken`-style guard (Moodle `group/lib.php:271-276`) — app-layer, no DDL.
- `remove_members_by_provenance` (`:428-449`), `remove_all_memberships` (`:452-464`), `set_activity_group_policy` (`:506-526`) — **preserve signatures** (Yaman/`D-GM` call sites); do not regress GRP-023/024.
- New: group/grouping availability evaluation helper (**T2-GRP-005**) — accessallgroups always passes; group condition = membership of the group (or any group if id 0); grouping condition = membership of any group in the grouping (Moodle `availability/condition/{group,grouping}/classes/condition.php`).
- New: `create_grouping`, `assign_group_to_grouping` (§11).

Cross-domain calls: enrolment is reached ONLY through the `_is_active_enrolled` wrapper (`:144-170`); capability ONLY through `has_capability`/`require_capability` — never direct SQL into `enrolment`/`role_capability`.

---

## 13. Controllers

The "controllers" are the FastAPI routes in `routers/groups.py` — thin HTTP layers; all logic stays in the service (existing discipline, keep it). Controller-level responsibilities:

- Attach `Depends(current_user)` (D-AUTH) and `require_capability` (D-ENFORCE) — this is the ONLY place authz is wired; the service trusts the resolved principal passed in. Resolve the course context id for the check via Khaled's `D-GRP-ARITY` helper.
- Map service results to HTTP: 401 (no principal), 403 (capability denied), 404 (unknown activity/group — keep existing `:77-78,87,103`), 409 (enrolment-guard refusal — keep existing `:52-55`; genuine conflict).
- Stop forwarding `body.component`/`body.item_id` to `add_member` (`:51`).
- Do not add business logic to controllers; new rules (default-allow removal, availability) are decided in the service and surfaced as structured results.
- Do NOT touch `main.py` (router already wired; auth middleware is D-AUTH/Essa).

---

## 14. Repositories

The target has no separate repository layer — data access is inline asyncpg SQL inside the service via `db.fetch_all`/`db.fetch_one` over the shared `app/db.py` pool (Essa custodian). Work items expressed as "repository/query":

- **Member/roster query** `group_members` (`:222-235`) and **group-list query** `list_course_groups` (`:207-219`) — add the caller's allowed-group + visibility predicate directly in SQL (the Moodle `groups_get_members_join` equivalent, GRP-017); do NOT post-filter in Python (T2-GRP-002 §Suggested locations).
- **Universe query** `_universe_group_ids` (`:290-301`) — add a `participation_only` filter branch (GRP-006).
- **Membership insert** `add_member` (`:389-401`) — keep `on conflict (group_id,user_id) do nothing` (GRP-036); provenance columns bound to server constants, never request values.
- **Membership delete** `remove_member` (`:420-424`) — default-allow; the component check becomes advisory/source-aware, not a blanket block.
- **Provenance-scoped deletes** (`remove_members_by_provenance` `:433-448`, `remove_all_memberships` `:454-463`) — unchanged (Yaman/`D-GM` depend on them).
- **`audit_log` insert** (new) — small helper writing a `group.*` row in the same statement path as the change.
- **Name lookup** `_names_for` (`:323-329`) — unchanged. No `SELECT ... FOR UPDATE` needed; the PK is the concurrency backstop.

---

## 15. Validation rules

Request/authz validation (in `schemas_groups.py` + router + service):

- **V1 (authz mutation):** every mutation requires an authenticated principal (`D-AUTH`) and passes `require_capability(managegroups, course-context)` (`D-ENFORCE`). Missing principal → 401; missing capability → 403 naming the capability. (T2-GRP-003)
- **V2 (authz scoping read):** members/group-list reads require an authenticated principal whose allowed-group set filters the result. (T2-GRP-002)
- **V3 (no client provenance):** `MemberAdd` must not carry `component`/`item_id`; any client value is rejected or ignored; server sets `''`/`0` for manual adds. (T2-GRP-003)
- **V4 (enrolment precondition):** `add_member` refuses a user with no active enrolment in the group's course → 409 with reason (SA-GRP-004, keep). Note the endorsed nuance: Moodle allows adding a *suspended* enrolled user (any-status `is_enrolled`); the target is stricter (active-only). If parity on this edge is wanted, relax via Yaman's contract, not by editing enrolment. (GRP-020)
- **V5 (default-allow removal):** a manager may remove a manual OR component-owned membership (Moodle default-allow, `group/lib.php:184-185`); the `force` path is capability-gated, not an open query param. Non-member remove is idempotent success. (GRP-021/022)
- **V6 (idnumber guard):** `create_group` rejects a duplicate `id_number` in the course at app level (Moodle `idnumbertaken`) — no DDL. (GRP-001)
- **V7 (visibility constraint):** a group with visibility ∉ {ALL,MEMBERS} must have `participation=false` (Moodle `group/lib.php:280-283`) — request the DB default/trigger in `D-GRP-VIS`; enforce the read-side assumption in scope. (T2-GRP-004)
- **V8 (availability evaluation):** accessallgroups holders always pass a group/grouping availability condition (Moodle condition classes); `$not` inversion applies before the accessallgroups bypass. (T2-GRP-005)
- **V9 (activity/group existence):** unknown activity/group → 404 (keep existing).

---

## 16. Business rules

Rules restated from Moodle behaviour truth; each cites the Moodle symbol and the target site.

- **R-EFFMODE (GRP-008, preserve):** effective mode = force→course else activity else course (`effective_mode` `:41-50`; Moodle `groups_get_activity_groupmode` `lib/grouplib.php:732-744`). Routed via `/policy` and works (no aag call). Keep.
- **R-ALLOWED (GRP-012):** VISIBLE or accessallgroups → all groups in the grouping; else the user's own groups (`resolve_allowed_group_ids` `:53-73`; Moodle `lib/grouplib.php:1188-1207`). Make reachable (T2-GRP-001), participation-aware (T2-GRP-004).
- **R-SCOPE (GRP-015):** SEPARATE without accessallgroups → visible only if actor & target share an allowed group; VISIBLE → see all in universe, act only in own; accessallgroups → all; NONE → unrestricted (`scope_verdict` `:76-136`; Moodle `groups_group_visible` `lib/grouplib.php:1219-1245`). The two-boolean SEE/ACT-ON model exceeds Moodle core — preserve it.
- **R-ENFORCE (GRP-017/018, T2-GRP-002):** enforcement is in the query layer (`groups_get_members_join`, `\core_group\visibility` SQL), not the UI. The decision endpoint explains; the data endpoints must withhold. Moodle `lib/grouplib.php:1316-1477`, `group/classes/visibility.php:41-180`.
- **R-VISIBILITY (GRP-005/006, T2-GRP-004):** ALL/MEMBERS/OWN/NONE per `lib/grouplib.php:61-79`; `participation` gates activity selection (`$participationonly`, `lib/grouplib.php:1202,1205`). Consume `D-GRP-VIS`.
- **R-MANAGE (GRP-019, T2-GRP-003):** `moodle/course:managegroups` (course context, archetypes editingteacher+manager) gates group admin (`lib/db/access.php:1182-1191`). Enforce via `require_capability`.
- **R-PROVENANCE (GRP-002/022/023/024, T2-GRP-003 + D-GM):** provenance is server-set (`group/lib.php:77-101`); component-owned removal defaults to allow (`group/lib.php:155-186`); single-path unenrol removes only that method's `component`+`itemid` rows (`lib/enrollib.php:2318-2323`); last unenrol purges all (`:2336-2354`). Target cleanup helpers (`:428-464`) are FUNCTIONALLY_EQUIVALENT — keep; only make provenance server-authoritative and removal default-allow.
- **R-ADD-ENROL (GRP-020, SA-GRP-004):** add requires enrolment; Moodle uses any-status `is_enrolled`; target uses active-only (stricter). Keep the guard; decide the suspended-add edge with Yaman.
- **R-AVAIL (GRP-030/031/032/033, T2-GRP-005):** activity availability by group (membership of the group, or any group if id 0) / grouping (membership of any group in the grouping); accessallgroups always passes; selection (`cm->groupingid`) and restriction (availability) are orthogonal; hidden-vs-greyed is the availability `show` flag. Moodle `availability/condition/{group,grouping}/classes/condition.php`. Consume `D-GRP-AVAIL`.
- **R-CONCURRENCY (GRP-036, preserve):** `on conflict (group_id,user_id) do nothing` resolves a concurrent add gracefully (superior to Moodle's throwing race). Do NOT change to check-then-insert.
- **R-AUDIT (GRP-034, T2-DATA-001):** every membership/group/grouping change writes a `group.*` `audit_log` row (Moodle fires `group_member_added/removed`, `group_*`, `grouping_*`). Currently none written (`03-groups-inventory.md §8`). `D-AUDIT`.
- **R-DUP-ADD (GRP-036/CH-04, preserve):** duplicate-add is a silent 200 no-op on the backend — parity-correct vs Moodle's silent true; the mock's 409 is the outlier (fix the mock, §7).

---

## 17. Edge cases

1. **Course id ≠ context id.** `_has_accessallgroups` must resolve the course *context* id, not pass the course id (`03-groups-inventory.md §11`, HC-03 §7). Use Khaled's `D-GRP-ARITY` helper.
2. **`prevent` override on accessallgroups.** After the fix, a course-context `prevent` on top of a system `allow` must scope `ta.a` to own groups — the resolver (not the dead fallback) honours `prevent`/depth. (HC-03; T2-RBAC-004)
3. **No-group student under separate mode** sees nothing (GRP-016; `scope_verdict` `:118-124`). Enforced on data reads (T2-GRP-002).
4. **Multi-group student union (HC-04).** A grader in A or B reaches a `{A,B}` target; no dedupe (`scope_verdict` `:96-124`). Preserve.
5. **Target outside the grouping universe (Group C)** is "not even visible" (`in_universe` check `:99,113-116`). Preserve.
6. **Forged-provenance orphan (CH-08).** Once the HTTP endpoint stops accepting client `component`, forging via HTTP is closed; verify no residual write path sets `enrol_*` from user input. A pre-existing forged row is cleared only on last-path unenrol.
7. **Suspended-but-enrolled add.** Moodle allows; target refuses (active-only). Decide with Yaman; do not edit enrolment. (GRP-020)
8. **Component-owned removal without force.** Currently deny-by-default (inverse of Moodle); realign to default-allow for a manager. (GRP-022)
9. **Duplicate-add** silent 200 (parity-correct); fix the mock's 409, not the backend. (GRP-036)
10. **Concurrent add** resolves via PK + on-conflict-do-nothing — keep. (GRP-036)
11. **Duplicate id_number** silently allowed today; add app-layer guard. (GRP-001)
12. **Visibility ∉ {ALL,MEMBERS} forces participation false** — DB default/trigger via `D-GRP-VIS`; scope must not assume otherwise. (GRP-005)
13. **accessallgroups under availability NOT** — accessallgroups passes even when a condition is inverted (`$not`). (GRP-030)
14. **Grouping with no groups** → empty universe; `allowed_groups` returns none (not an error).

---

## 18. Hard cases

- **HC-03 — TA marks A, cannot mark B, cannot see C** (`hard-cases/HC-03-teaching-assistant-groups.md`; verdict UNSTABLE 0.85; new script `tests/hard-cases/hc3_ta_group_marking.sh`). The pure `scope_verdict` already yields the correct three outcomes and is more expressive than Moodle core (`test_groups.py:68-108`) — preserve. Work: (a) T2-GRP-001 makes `/access-check` return the verdict for `ta.a` vs `ta.allgroups` with no 500; (b) after `D-SEED` (accessallgroups → editing-teacher/manager only) and the fixed resolver honouring `prevent`, the plain TA (`ta.a`) is scoped to group A only — "after the arity fix + D-SEED, the plain TA must be scoped to own groups"; (c) T2-GRP-002 enforces "cannot see B/C" on member/roster reads, not just narration; (d) ship the hermetic script asserting real routed state (`ta.a` → allowed={A}, B denied, C invisible; `ta.allgroups` → all). Claim parity only for "mark A, cannot see/grade B & C" — the graduated three-way is not core-Moodle-expressible (HC-03 §2). The seed itself is Essa/Khaled (`D-SEED`), not yours.
- **HC-04 — student in two groups, separate mode** (`hard-cases/HC-04-student-in-two-groups.md`; verdict PARTIALLY_PRESENT 0.75; new script `tests/hard-cases/hc4_two_groups.sh`). Multi-membership + union is genuinely modelled (`schema.sql:307`; seed `student.multi` `fixtures.sql:197-199`; `scope_verdict` `:96-124`; `test_groups.py:114-120`) — preserve. Work: (a) after T2-GRP-001, `GET /allowed?user_id=<student.multi>` returns both A and B under separate mode (no 500); accessallgroups grader → all; (b) frontend selector offers exactly the student's two groups and withholds "all participants" in separate mode (Moodle `lib/grouplib.php:1163-1177`) — a UI affordance, not necessarily server session state; (c) ship the hermetic script. Out of scope / flag as known non-parity: `$SESSION->activegroup` cross-tab persistence (GRP-037). Group submission for a two-group student is NOT_APPLICABLE (no submission model) — do not invent one.
- **HC cross-domain** (`cross-system-resolution.md`): XD-02 (role allows but group restriction hides — your T2-GRP-001 + T2-GRP-002 make the group gate real), XD-07/XD-10 (the three-resolver disagreement — your fix makes the routed path agree with `permissions.check()`). Your part is the groups-side correctness; the seed/door is Khaled/Essa.

---

## 19. Acceptance criteria

- **AC-1 (T2-GRP-001):** `GET /api/groups/access-check` and `/allowed` (routed, not helper) return 200 with correct scoped verdicts; a separate-groups TA in group A → allowed={A}, B/C excluded; a `prevent` override is honoured; an unknown/not-held capability resolves to False (not 500); `resolve_allowed_group_ids`/`scope_verdict` unit tests pass unchanged.
- **AC-2 (T2-GRP-002):** separate-groups TA requesting members/group-list → only shared-group members/groups; accessallgroups holder → all; no-group separate student → none; filtering is in SQL.
- **AC-3 (T2-GRP-003):** every mutation returns 401 without a session and 403 without capability; client cannot set `component`/`item_id` (server assigns them); a manager can remove a manual and a component-owned row (default-allow); a forged `enrol_cohort` row cannot be created via HTTP; `add_member` still enforces active enrolment; audit rows written.
- **AC-4 (T2-GRP-004):** a MEMBERS group is invisible to non-members; OWN shows only self; NONE hides the group and membership even from members; a non-participation group is excluded from the activity allowed-group universe (against Essa's `D-GRP-VIS` schema).
- **AC-5 (T2-GRP-005):** an activity restricted to grouping G is accessible only to members of G; non-members see it hidden or greyed per the `show` flag; accessallgroups holders always pass (against Essa's `D-GRP-AVAIL` schema).
- **AC-6 (grouping writes):** a manager can create a grouping and assign a group via the new endpoints; non-manager → 403.
- **AC-7 (HC-03):** `hc3_ta_group_marking.sh` green — `ta.a` scoped to A, `ta.allgroups` all, enforced on data reads.
- **AC-8 (HC-04):** `hc4_two_groups.sh` green — `student.multi` → {A,B} under separate mode; union reachability from either group.
- **AC-9 (strengths):** every §16 preserved rule still passes (effective/force mode, union, provenance-scoped/last-path cleanup, on-conflict-do-nothing, duplicate-add silent-200).

---

## 20. Required tests

Extend `backend/tests/test_groups.py` beyond the current 15 **pure-helper-only** tests (`03-groups-inventory.md §9`) to cover the routed and enforcement behaviour. Use an ephemeral seeded Postgres (rotated creds — D-SEC precondition; MERGE-STRATEGY CI). New cases:

- `test_access_check_routed_no_500` — routed `/access-check` for `ta.a` returns the scoped verdict, not 500. (T2-GRP-001 — the direct regression)
- `test_access_check_honours_prevent` — a course-context `prevent` on accessallgroups scopes `ta.a` to own groups. (T2-GRP-001/HC-03)
- `test_allowed_routed_multi_group` — `/allowed` returns {A,B} for `student.multi` under separate mode; all groups for an aag grader. (HC-04)
- `test_members_scoped_separate` — separate-groups TA sees only shared-group members; accessallgroups sees all; no-group student sees none. (T2-GRP-002)
- `test_mutation_requires_session_401` and `test_mutation_requires_capability_403` — every add/remove/create/delete. (T2-GRP-003; MERGE-STRATEGY authz gate)
- `test_provenance_server_set` — client `component` is ignored/rejected; manual add → `component=''`; forged `enrol_cohort` via HTTP impossible. (T2-GRP-003)
- `test_remove_default_allow_and_idempotent` — manager removes manual and component-owned rows; non-member remove is idempotent; `force` gated. (T2-GRP-003/GRP-021/022)
- `test_create_group_idnumber_guard` — duplicate id_number rejected. (GRP-001)
- `test_visibility_levels` — MEMBERS/OWN/NONE member-list outcomes; non-participation excluded from universe. (T2-GRP-004)
- `test_availability_group_and_grouping` — grouping-restricted activity accessible only to members; hidden/greyed flag returned; accessallgroups passes. (T2-GRP-005)
- `test_grouping_create_and_assign` — new endpoints gated + working. (§11)
- Keep and adapt existing pure-helper cases (`test_forced_course_mode_overrides_activity`, `test_separate_without_aag_limits_to_own_groups`, the HC-3 block `:68-94`, `test_visible_can_see_other_group_but_not_act`, `test_hc4_multi_group_student_reachable_from_either_group`, `test_none_mode_*`) — they must still pass unchanged (proves the logic core is preserved).

Hard-case scripts made hermetic + asserting real routed state: `hc3_ta_group_marking.sh` (ta.a scoped / ta.allgroups all / enforced reads), `hc4_two_groups.sh` (two-group allowed set + union). (T2-TEST-001)

---

## 21. Regression tests

- **Pure-helper suite** (`test_groups.py:31-133`) must stay green after all changes — it is the proof that the endorsed decision logic (effective mode, allowed groups, HC-3 outcomes, HC-4 union, visible see-not-act, none-mode) is preserved.
- **HC-03 / HC-04** headline outcomes unchanged once routed: TA scoped to own group; two-group student reachable from either.
- **Provenance cleanup** (`remove_members_by_provenance`, `remove_all_memberships`) signatures + behaviour unchanged — Yaman's `hc1`/`hc2` and `D-GM` depend on them; GRP-023/024 stay FUNCTIONALLY_EQUIVALENT.
- **Concurrency** on-conflict-do-nothing unchanged (GRP-036).
- **Cross-domain**: `backend/tests/test_check_integration.py` (Khaled custodian) — add group cases via PR only; do not edit Khaled's assertions.
- Full suite `test_groups.py` + `test_permissions.py` + `test_enrolment.py` + new `test_progress.py` green before merge (MERGE-STRATEGY CI); hermetic (no external creds).

---

## 22. Integration points

- **Khaled (auth/authz/context):** consume `Depends(current_user)` (`D-AUTH`) and `has_capability`/`require_capability` (`D-ENFORCE`) on every route; the exact `has_capability` signature + course→context helper (`D-GRP-ARITY`); the canonical capability names (`D-CAPNAME`) for accessallgroups + managegroups. Your `groups.py:201` fix must agree with `permissions.py:714-715`; if his signature differs from the contract, update the dependency, do not patch `permissions.py`. `src/context/ActingUser.jsx` (Khaled) drives the frontend acting user.
- **Essa (DB + shared):** `D-GRP-VIS` (visibility enum+column), `D-GRP-AVAIL` (availability tables), `D-AUDIT` (audit adequacy), `D-SEED` (accessallgroups seed + capability name reconciliation — feeds HC-03); `api.js`/`errors.js`/`schemas.py`/`mocks/{core,seed,index}.js` shared edits via coordination PR; `D-SEC` precondition for hermetic tests. Do not touch `main.py`.
- **Yaman (enrolment):** you expose the provenance-scoped cleanup functions Yaman calls (`D-GM`); Yaman writes only `enrol_*` `group_member` rows with server-set provenance; you are the required reviewer on Yaman PRs touching `group_member`. You read `is_active_enrolled` via the wrapper; you never edit `enrolment.py`. The participant-roster scoping (`enrolment.py:660`) is Yaman's — raise it, don't implement it.
- **Mahdi (progress):** none direct; progress ignores groups today (XD-08) — no shared write.
- **Frontend:** `GroupsPage`/`GroupsBoard`/`GroupingPanel`/`ActivityPolicyTable`/`ScopeCheckPanel` consume the authorized real API; retire the independent `mocks/groups.js` resolver.

---

## 23. Dependencies (D-* IDs)

Blocking (Mahmoud cannot finish/merge until delivered):

- **D-AUTH** (Khaled) — authenticated principal + `Depends(current_user)`; never an `actor_id` param. Blocks T2-GRP-002/003. IMPLEMENTATION-ORDER Phase 1.
- **D-ENFORCE** (Khaled) — `has_capability(db, user_id, capability, context_id)` + `require_capability`. Blocks T2-GRP-003 gating and T2-GRP-001.
- **D-CAPNAME** (Khaled + Essa) — ONE canonical capability-name form across DB seed, `permissions.py`, `groups.py` (resolves `moodle/site:accessallgroups` vs `site:accessallgroups`, and the manage-groups name). Blocks T2-GRP-001 (`D-GRP-ARITY` depends on it).
- **D-GRP-ARITY** (Khaled provides signature; Mahmoud fixes the call) — exact `has_capability` signature + course→context-id resolution helper. Blocks T2-GRP-001. Fix `groups.py:201`; never edit `permissions.py`.
- **D-GRP-VIS** (Essa) — `group_visibility` enum (ALL/MEMBERS/OWN/NONE) + `visibility` column on `course_group`; `participation` consulted by scope; visibility∉{ALL,MEMBERS}⇒participation=false default/trigger. Blocks T2-GRP-004.
- **D-GRP-AVAIL** (Essa) — tables for activity availability restriction by group/grouping (with `not` inversion + `show` hidden/greyed flag). Blocks T2-GRP-005.

Provenance contract (parallel — not another's edit):

- **D-GM** (Yaman ↔ Mahmoud) — `group_member` `component='enrol_self'/'enrol_cohort'`+`item_id`=method id writes by Yaman; server sets provenance (never client); your cleanup helpers keep stable signatures. Drives T2-GRP-003 boundary, HC-01.

Non-blocking / hardening:

- **D-AUDIT** (Essa + all) — confirm `audit_log` schema/index adequacy; Mahmoud writes `group.*` rows. T2-DATA-001.
- **D-SEED** (Essa, Khaled) — accessallgroups → editing-teacher/manager only; reconcile `seed.sql`↔`fixtures.sql`; feeds HC-03 (not your fix, but your routed resolver must honour the corrected seed). T2-RBAC-004.
- **D-SEC** (Essa) — credential rotation; precondition for hermetic CI.

Full graph in TEAM-DEPENDENCIES.md.

---

## 24. Merge order

Per MERGE-STRATEGY.md and IMPLEMENTATION-ORDER.md:

1. `t2/essa/D-SEC` (first, standalone).
2. `t2/essa/migrations-*` including `D-GRP-VIS`, `D-GRP-AVAIL`, `D-SEED`, `D-CAPNAME-seed` (each its own PR, reviewed by Mahmoud as requester for the groups ones).
3. `t2/khaled/D-AUTH` then `t2/khaled/D-ENFORCE` (+ `D-CAPNAME` code + `D-GRP-ARITY` signature) — Mahmoud rebases on these before wiring authz/arity.
4. Mahmoud domain branches (parallel with other domains once 1-3 in), in this internal order:
   - `t2/mahmoud/T2-GRP-001-arity`
   - `t2/mahmoud/T2-GRP-003-gated-mutations` (required reviewer: Khaled for capability wiring; Yaman for `group_member` provenance boundary)
   - `t2/mahmoud/T2-GRP-002-scope-enforcement`
   - `t2/mahmoud/T2-GRP-004-visibility` (after `D-GRP-VIS`)
   - `t2/mahmoud/T2-GRP-005-availability` (after `D-GRP-AVAIL`)
   - `t2/mahmoud/groupings-write`
   - `t2/mahmoud/frontend-groups` (mock retire + contract fix)
5. Integration/hard-case/regression PRs last (Phase 3).

Rule: a Mahmoud PR consuming a dependency cannot merge before that dependency PR merges (CI required-status check). PRs touching `group_member` semantics that Yaman raises require Mahmoud approval (required reviewer, `D-GM`).

---

## 25. Git strategy

- Branch from `team2/parity-fixes`; one feature branch per dependency-scoped unit, named `t2/mahmoud/<issue-or-dep>` (§24). No commits to another engineer's branch; no direct commits to `main`.
- Rebase each domain branch on the merged foundation (`D-AUTH`/`D-ENFORCE`/`D-CAPNAME`/`D-GRP-ARITY` + migrations) before implementing, so authz/arity wiring is never duplicated.
- Shared-surface edits (`api.js`/`errors.js`/`mocks/{core,seed,index}.js` additions) go as small additive diffs to `t2/essa/shared-<topic>` for Essa to merge — never rename/move shared symbols. Do not touch `main.py`.
- Commit messages reference the issue/dep id (e.g. `T2-GRP-001: call has_capability(db,user_id,cap,context_id) and resolve course context`). Each PR header cites the audit issue and, for the provenance boundary, the `D-GM` contract.
- No secret literals in any diff (permanent secret-scan gate after D-SEC).
- Migrations are never authored here — if a change needs DDL, stop and file or update the Essa dependency (`D-GRP-VIS`/`D-GRP-AVAIL`).

---

## 26. Implementation checklist

- [ ] Rebase on `D-SEC`, Essa migrations (`D-GRP-VIS`, `D-GRP-AVAIL`, `D-SEED`), `D-AUTH`, `D-ENFORCE`, `D-CAPNAME`, `D-GRP-ARITY`.
- [ ] Rewrite `_has_accessallgroups` (`:173-201`): canonical signature + context-id resolution + canonical name; remove dead over-granting fallback; correct error boundary. (T2-GRP-001)
- [ ] Add `Depends(current_user)` + `require_capability(managegroups)` to create/delete/add/remove/patch + grouping writes; map 401/403. (T2-GRP-003)
- [ ] Drop client `component`/`item_id`; server-set provenance for manual adds. (T2-GRP-003, D-GM)
- [ ] Realign removal to default-allow; gate `force`; idempotent non-member. (T2-GRP-003)
- [ ] Add `idnumbertaken` app-layer guard to `create_group`. (GRP-001)
- [ ] Push allowed-group + visibility filter into `group_members`/`list_course_groups` SQL; accessallgroups bypass; no-group student none. (T2-GRP-002)
- [ ] Thread `visibility`/`participation` through scope helpers (ALL/MEMBERS/OWN/NONE + participation-only). (T2-GRP-004, D-GRP-VIS)
- [ ] Add group/grouping availability helper + hidden/greyed; accessallgroups passes. (T2-GRP-005, D-GRP-AVAIL)
- [ ] Add `POST /api/groups/groupings` + assign-group route backing the existing schemas. (§11)
- [ ] Add `group.*` `audit_log` writes on membership/lifecycle change. (T2-DATA-001, D-AUDIT)
- [ ] Frontend: send only `{user_id}`; fix duplicate-add + machine-owned + aag mock divergences; wire the fixed contract; surface visibility/availability; HC-04 selector; retire the mock resolver.
- [ ] Extend `test_groups.py` with routed + authz + provenance + visibility + availability cases; keep pure-helper suite green.
- [ ] Make `hc3_ta_group_marking.sh` + `hc4_two_groups.sh` hermetic, asserting real routed state.
- [ ] Cross-domain scenarios (XD-02/07) + runtime confirmations verified in Phase 3.

---

## 27. Estimated complexity

| Work unit | Complexity | Driver |
|---|---|---|
| T2-GRP-001 arity fix | Low-Medium | A focused caller rewrite, but must correctly resolve context id via Khaled's helper and honour `prevent`; blocked on D-GRP-ARITY/D-CAPNAME; high leverage (unblocks all routed scope) |
| T2-GRP-003 gate + provenance | Medium | Mechanical authz across ~6 routes + schema change + removal-semantics inversion; must not regress the enrolment guard or cleanup helpers |
| T2-GRP-002 scope enforcement | Medium-High | New SQL-layer filtering equivalent to `groups_get_members_join`; correctness across separate/visible/aag/no-group; must be in-query not post-filter |
| T2-GRP-004 visibility | Medium | New 4-level semantics threaded through scope; gated on Essa D-GRP-VIS schema shape |
| T2-GRP-005 availability | Medium-High | New conditions layer (none exists), hidden/greyed, orthogonal to selection; gated on Essa D-GRP-AVAIL |
| Grouping write endpoints | Low | Schemas exist; add routes + two service functions |
| Frontend | Medium | Mock retirement, contract fixes, visibility/availability surfacing, HC-04 selector; UI polish gated on staging |
| Test rewrite (routed + hermetic) | Medium | Depends on CI ephemeral DB (D-SEC); the routed/authz coverage is net-new |

Overall package: **Medium-High** — dominated by the net-new enforcement (T2-GRP-002) and availability (T2-GRP-005) layers; T2-GRP-001 is small but the critical unblocker.

---

## 28. Estimated duration

Assuming Phase 1 dependencies (D-AUTH/D-ENFORCE/D-CAPNAME/D-GRP-ARITY, and Essa's D-GRP-VIS/D-GRP-AVAIL migrations) are merged before Mahmoud starts Phase 2, and one engineer:

- T2-GRP-001 arity: ~1 day
- T2-GRP-003 gate + provenance: ~2-3 days
- T2-GRP-002 scope enforcement: ~3-4 days
- T2-GRP-004 visibility: ~2-3 days
- T2-GRP-005 availability: ~3-4 days
- Grouping write endpoints: ~1 day
- Frontend (mock retire + contract + visibility/availability + selector): ~2-3 days
- Routed + hermetic test coverage + hc3/hc4 scripts: ~2-3 days
- Integration/cross-domain (Phase 3): ~1-2 days

**Total: ~17-24 working days (~3.5-5 weeks)**, excluding dependency wait time. Critical internal path: the enforcement layer (T2-GRP-002) and availability (T2-GRP-005); T2-GRP-001 must land first as it unblocks everything routed.

---

## 29. Risk assessment

- **R1 (High) — T2-GRP-001 blocked on Khaled's signature + context helper.** The fix cannot be guessed (course id ≠ context id; capability-name split). Mitigation: build against the published `D-GRP-ARITY`/`D-CAPNAME` contract; do not merge a guessed context lookup; never edit `permissions.py` to work around it.
- **R2 (High) — visibility/availability gated on Essa migrations whose shape is not yet fixed.** Mitigation: agree the exact column/enum/table shape in `D-GRP-VIS`/`D-GRP-AVAIL` before coding; build read/write against the agreed spec, not a guess; if the delivered schema differs, update the dependency.
- **R3 (Medium) — regressing the endorsed decision core while threading visibility/participation.** The union/mode/SEE-vs-ACT-ON logic is correct and unit-tested. Mitigation: keep the pure-helper suite green as a gate; add participation/visibility as new inputs, not rewrites.
- **R4 (Medium) — scope enforcement done as Python post-filter instead of SQL.** Would over-fetch and diverge from Moodle. Mitigation: push the allowed-group predicate into the query (R-ENFORCE).
- **R5 (Medium) — the roster the audit calls out (`enrolment.py:660`) is Yaman's file.** You cannot scope it. Mitigation: raise it to Yaman; scope only the group-owned endpoints; document the boundary.
- **R6 (Medium) — mock/real divergence re-introduced.** The demo currently masks backend defects. Mitigation: retire the independent mock resolver; make the demo call the fixed API; treat any mock behaviour the backend does not produce as a defect.
- **R7 (Low-Medium) — UI states unverifiable without staging.** Mitigation: flag INSUFFICIENT EVIDENCE; ship backend + minimal UI; defer polish to staging review.
- **R8 (Low) — HC-03 depends on the correct seed being deployed.** The seed is Essa/Khaled (`D-SEED`); which seed loads is a runtime item. Mitigation: your routed resolver honours `prevent` regardless; confirm the seed at runtime (RUNTIME-VALIDATION-PLAN P1-2).
- **R9 (Low) — the routed 500 is a static finding.** Mitigation: confirm the 500 (and the fix) on a sanctioned DB before claiming closure (RUNTIME-VALIDATION-PLAN item 1).

---

## 30. Definition of Done

- All five owned issues (T2-GRP-001/002/003/004/005) resolved with the acceptance criteria in §19 met.
- Routed `/access-check` and `/allowed` return correct scoped verdicts with no 500; `prevent` honoured; canonical capability name; dead fallback removed.
- Every group mutation authenticated + authorized; a test proves 401 without session and 403 without capability for each mutation endpoint (MERGE-STRATEGY authz gate); provenance is server-set; the client cannot forge `component`.
- Member/group-list endpoints enforce group scope in SQL; visibility (ALL/MEMBERS/OWN/NONE) + participation honoured against Essa's `D-GRP-VIS` schema; group/grouping availability enforced with hidden/greyed against Essa's `D-GRP-AVAIL` schema.
- Grouping write endpoints added + gated; `create_group` idnumber guard in place.
- `test_groups.py` extended with routed + authz + provenance + visibility + availability cases and green in CI; the pure-helper regression suite still passes; `test_permissions.py`/`test_enrolment.py`/`test_progress.py` unaffected.
- `hc3_ta_group_marking.sh` and `hc4_two_groups.sh` hermetic, asserting real routed state, green.
- `audit_log` populated for every membership/lifecycle change (`group.*`).
- No DDL/migration/seed authored by Mahmoud; every schema need delivered as an Essa dependency and referenced by id.
- No edits to another engineer's files; `permissions.py` untouched (the arity fix is a caller change); `group_member` provenance stays server-authoritative; Yaman's `enrol_*` writes reviewed under `D-GM`.
- Frontend consumes the authorized real API; `mocks/groups.js`'s independent resolver retired; the four FALSE_SIMILARITY divergences removed; every unverifiable UI/runtime claim explicitly flagged INSUFFICIENT EVIDENCE.
- Every §16 strength preserved (effective/force mode, multi-group union, provenance-scoped/last-path cleanup, on-conflict-do-nothing, duplicate-add silent-200).
- Merged in the §24 order onto `team2/parity-fixes`; secret-scan clean; all required reviewers (Khaled for capability wiring, Yaman for `group_member` provenance) approved.

---

# System Prompt — Engineer "Mahmoud" (Groups & Groupings)

## Identity
You are Mahmoud, the Groups engineer on Team 2 (People & Enrolment) of the Moodle parity project. You own groups, groupings, group membership, separate/visible group modes, group-scope decision AND enforcement, and the group APIs/UI/validation/tests. You are the sole writer of `group_member` `component=''` (manual) rows and any rows your service originates.

## Mission
Bring the target's groups subsystem to behavioural parity with Moodle by resolving exactly these audit issues: T2-GRP-001, T2-GRP-002, T2-GRP-003, T2-GRP-004, T2-GRP-005, and making Hard Cases HC-03 (TA scoped to own group) and HC-04 (student in two groups, union) work end-to-end on the real API. Behaviour truth is Moodle source (`/Users/yamanobiedat/Documents/GitHub/moodle/public/lib/grouplib.php`, `group/lib.php`, `lib/db/access.php`, `availability/condition/{group,grouping}`); enforceable data truth is `schema.sql` (Essa-owned); UI truth is staging (which you cannot access — flag anything you cannot derive from the committed frontend as INSUFFICIENT EVIDENCE, never guess).

## Allowed scope
Edit only: `app/routers/groups.py`, `app/services/groups.py`, `app/schemas_groups.py`, `backend/tests/test_groups.py`, `tests/hard-cases/hc3_ta_group_marking.sh`, `tests/hard-cases/hc4_two_groups.sh`, `src/pages/GroupsPage.jsx`, `src/components/groups/*`, `src/lib/groupsApi.js`, `src/mocks/groups.js`. Write domain data to `course_group`, `group_member`, `grouping`, `grouping_group`. Set `group_member` provenance server-side only (`component=''` for manual). Append `group.*` rows to `audit_log`. Read `enrolment` (via the `_is_active_enrolled` wrapper), `context` (via Khaled's helper), `course`/`course_activity` for policy.

## Forbidden scope
- Do NOT modify any other engineer's files (routers/services/schemas/components/tests for enrolment, roles, progress, or shared surfaces). The `groups.py:201` fix is a CALLER change — you never edit `permissions.py`.
- Do NOT edit `schema.sql`, `fixtures.sql`, `seed.sql`, or write any migration — ALL DDL/migration/seed is Essa-only. If you need a column, enum, index, constraint, view, or trigger, file/reference an Essa dependency (`D-GRP-VIS`, `D-GRP-AVAIL`, `D-AUDIT`) and stop.
- Do NOT set membership provenance from client input — remove `component`/`item_id` from `MemberAdd`; only Yaman's enrolment code writes `enrol_*` rows, under `D-GM`.
- Do NOT re-implement capability resolution in `groups.py` — consume `has_capability`/`require_capability`; remove the dead fallback that ignores `prevent`/depth.
- Do NOT build your own authentication or authorization engine — consume Khaled's `D-AUTH` (`Depends(current_user)`) and `D-ENFORCE`.
- Do NOT write `role_assignment`/`role`/`capability`/`context`/`enrolment`/`course_completion` tables, nor implement enrolment or capability business logic.
- Do NOT edit shared files (`main.py`, `db.py`, `supa.py`, `schemas.py`, `routers/__init__.py`, `api.js`, `errors.js`, `components/common/*`, `context/SelectedCourse.jsx`, `mocks/{core,seed,index}.js`) directly — submit additive diffs through Essa (custodian). `main.py` already wires `groups.router`.
- Do NOT invent files, tables, endpoints, capabilities, or Moodle behaviours.

## Coding standards
- Keep the existing discipline: the router is a thin HTTP layer; ALL scope/membership logic stays in `services/groups.py`. Keep the pure decision helpers (`effective_mode`, `resolve_allowed_group_ids`, `scope_verdict`) pure and unit-testable. Use the async asyncpg style (`db.fetch_all/fetch_one`, `$1` placeholders). Match surrounding style, comment density, and docstring convention.
- Keep the frozen `AccessCheckResponse` field names; additions are additive-only. Enforce group scope in the query (SQL WHERE/JOIN), not in Python post-filter. No secret literals. Write audit rows on every membership/lifecycle change.

## Database restrictions
Essa owns all DDL. You request schema changes as dependencies (`D-GRP-VIS` visibility enum+column, `D-GRP-AVAIL` availability tables); you never author them. Build read/write code against the agreed dependency spec, never a guessed column/table. Rely on the DB PK `(group_id,user_id)` + `on conflict do nothing` for concurrency (do not change it). Read-only on `enrolment*`, `role*`, `capability`, `context`, `course*`, `completion*`.

## Parity requirements
Match Moodle behaviour exactly; never simplify or invent. Preserve what the audit found equivalent-or-superior: effective/force group mode (GRP-008), multi-group union (HC-04), provenance-scoped + last-path cleanup (GRP-023/024), on-conflict-do-nothing concurrency (GRP-036), duplicate-add silent-200, and the SEE-vs-ACT-ON two-boolean model (which exceeds Moodle core) — do not "fix" parity into divergence. Enforcement lives in the query layer (Moodle `groups_get_members_join`, `\core_group\visibility`), not the UI. Claim parity for HC-03 only as "mark A, cannot see/grade B & C" — the graduated three-way is not core-Moodle-expressible.

## Frontend requirements
The frontend must consume the authorized real API and reflect real backend behaviour: send only `{user_id}` (principal from the session, never a client `actor_id`/`component`); remove the four mock-vs-real FALSE_SIMILARITY divergences (duplicate-add 409 vs silent-200, `machine_owned` flag, the mock's independent aag resolver, the "separate hides data" illusion); surface group visibility and activity availability once their schemas land; offer the HC-04 two-group selector without "all participants" in separate mode; retire `mocks/groups.js`'s independent resolver. For any UI shape you cannot derive from the committed components, write "INSUFFICIENT EVIDENCE — requires staging inspection" — do not guess.

## Testing requirements
Deliver ROUTED pytest coverage (not helper-only): `/access-check` no-500, scoped `/members`, `/allowed` two-group, authz 401/403 on every mutation, server-set provenance, default-allow removal, visibility levels, availability. Keep the pure-helper regression suite green. Ship hermetic `hc3_ta_group_marking.sh` and `hc4_two_groups.sh` asserting real routed state. A mutation endpoint's PR does not merge until a test proves it returns 401 without a session and 403 without capability. Tests are creds-free (D-SEC).

## Acceptance requirements
Meet every acceptance criterion in §19. HC-03: `ta.a` scoped to group A, `ta.allgroups` all, enforced on data reads (after the arity fix + D-SEED). HC-04: `student.multi` → {A,B} under separate mode, union reachability. Every §16 strength still passes.

## Evidence requirements
Every change cites its basis: a Moodle source symbol (behaviour truth), a `schema.sql` line (data truth), an audit issue id, or a committed frontend component (UI truth). Never cite staging you did not observe. The routed 500 is a static finding — confirm it and the fix on a sanctioned DB before claiming closure. When behaviour cannot be verified without a live DB or staging, mark it runtime-pending / INSUFFICIENT EVIDENCE rather than asserting it as observed.

## Completion requirements
Done means: all five issues resolved to §19, routed + hermetic tests + hc3/hc4 green, every mutation authenticated+authorized, provenance server-set, scope enforced in SQL, visibility + availability consumed from Essa's schemas, `audit_log` populated, no DDL authored, `permissions.py` untouched, no other engineer's files touched, frontend on the real API with divergences removed, strengths preserved, merged in the §24 order with all required reviewers' approval. If any dependency (D-AUTH, D-ENFORCE, D-CAPNAME, D-GRP-ARITY, D-GRP-VIS, D-GRP-AVAIL) is unmet, you build against its published contract and wait — you never work around it by editing another engineer's scope or the schema.

---

# Appendix A — INSUFFICIENT EVIDENCE register (requires staging or sanctioned-DB confirmation)

**Requires staging inspection (UI truth — no staging access in this environment):**
- All rendered groups UI states: verdict banners in `ScopeCheckPanel` (`:124-138`), provenance/`×N`/participation badges in `GroupsBoard` (`:88-92,107-112`), the Force-remove flow (`:137-146`), the HC-04 two-group selector, and the hidden-vs-greyed activity rendering in `ActivityPolicyTable` after `D-GRP-AVAIL`.
- The exact field layout for surfacing visibility levels and availability restrictions in the UI.

**Requires runtime confirmation on a sanctioned DB (rotated creds — RUNTIME-VALIDATION-PLAN; `03-groups-final-verdicts.md §Runtime-confirmation items`):**
1. HIGH — confirm `/access-check` & `/allowed` actually 500 on a live DB (static finding); re-confirm the fix returns correct verdicts. Gates GRP-012/015/016 and both HCs.
2. HIGH — confirm the deployed capability seed (root `seed.sql` vs `fixtures.sql`) and the effective capability-name path; gates HC-03's scoping of the plain TA. (T2-RBAC-004)
3. MED — confirm no auth middleware currently gates group mutations (by reading there is none; verify none silently exists). (GRP-019)
4. MED — GRP-028 cohort configured-group-change reconciliation (cross-check with Yaman).
5. LOW — CH-08 forged-provenance orphan durability and GRP-026 orphan check.

**Moodle-side items flagged RUNTIME_CONFIRMATION_REQUIRED (behaviour truth):**
- GRP-033 exact hidden-vs-greyed rendering of a restricted activity (availability `show` flag UI) — `03-groups.md` GRP-033.
- HC-04 step 6 group-submission resolution for a two-group student — plugin-dependent in Moodle; NOT_APPLICABLE in the target (no submission model).

# Appendix B — Frozen contract note

`POST /api/groups/access-check` response field names (`schemas_groups.py:49-59` `AccessCheckResponse`: `visible`, `action_allowed`, `group_mode`, `course_mode_forced`, `access_all_groups`, `actor_groups`, `target_groups`, `action`, `reasons`) are consumed by Khaled's gate 7 and Team 3. Do NOT rename them. New visibility/availability fields must be added as optional/additive only. The `/api/groups` prefix is frozen (`routers/groups.py:21`).

# Appendix C — Endorsed strengths to preserve (do not regress)

From `evidence/moodle/03-groups-final-verdicts.md` (FINAL ENDORSED table): GRP-008 effective/force mode (FUNCTIONALLY_EQUIVALENT, routed-working); GRP-011/HC-04 multi-group union; GRP-023/024 provenance-scoped + last-path cleanup (FUNCTIONALLY_EQUIVALENT); GRP-025 suspend keeps membership; GRP-036 on-conflict-do-nothing concurrency (FUNCTIONALLY_EQUIVALENT, arguably superior); duplicate-add silent-200 (parity-correct vs Moodle). The SEE-vs-ACT-ON separation in `scope_verdict` is more expressive than Moodle core (HC-03 §3) — preserve it, but do not claim Moodle parity for the graduated three-way outcome.
