# Build Task 06 — Issa · Frontend (the entire UI)

**Owner:** Issa · **Domain:** everything under `moodle-replica/frontend/` — the shell, all five pages, all components, the API layer.
**Branch:** feature branch `feat/issa-frontend` cut from `staging`, PR back into `staging`.
**Prerequisite:** finish the **database bootstrap first** — task file [03-issa-database.md](03-issa-database.md) is still yours and comes first (it is one-time work: apply schema, seed, `db.py`, sync stubs). Once its PR is merged, the schema is **frozen** and your ongoing job is this file.
**Source of truth:** `TEAM2-MASTER-REFERENCE.md` + the four domain files (01/02/04/05) — their "Frontend spec" sections are your requirements; the domain owners review your PRs against them.

> Per Yaman's standing instruction, this file contains **no system prompt** — everything is written out directly.

---

## 1. Mission and division of labour

The team is now split **4 backend + 1 frontend**:

| Person | Builds | Gives you |
|---|---|---|
| Yaman | Enrolment API (`/api/enrolment/*`) | Roster, methods, cohorts, self-enrol verdicts |
| Khaled | Roles/Permissions API (`/api/roles/*`, `/api/permissions/*`) | Role sheets, assignable matrix, the check verdict with evidence |
| Mahmoud | Groups API (`/api/groups/*`) | Groups/groupings, activity policy, access-check verdicts |
| Mahdi | Progress API (`/api/progress/*`) | Completion grid, percentages, criteria, snapshots |
| **You** | **The whole UI** | — |

**Nobody but you edits anything under `frontend/`.** In return, you never edit anything under `backend/` after your bootstrap PR (03) is merged. If an endpoint is missing or its shape is wrong, you file it to the owning teammate — you do not work around it in the UI with fake data (exception: §8 mock mode, clearly flagged).

While the backend APIs are still stubs, build against the **frozen contracts** written in files 01/02/04/05 (§4 of each) — request/response shapes there are binding on both sides.

---

## 2. What exists today on `staging` (your starting point)

```
moodle-replica/frontend/
├── index.html, vite.config.js, package.json    # React 19 + Vite 8, oxlint
└── src/
    ├── main.jsx          # StrictMode root — leave as is
    ├── api.js            # apiGet only, BASE_URL from VITE_API_URL || http://localhost:8010
    ├── App.jsx           # header (brand + API health dot), sidebar NAV_ITEMS=["Dashboard"], placeholder content
    ├── App.css, index.css
    └── assets/
```

Run: `npm run dev` → http://localhost:5173; backend must run on :8010 (`uvicorn main:app --reload --port 8010`). The header's **API: online/offline** indicator already works via `/api/health` — keep it.

---

## 3. Step 1 — the shell (this replaces the refactor previously assigned to Yaman)

1. **Extend `src/api.js`** with `apiPost`, `apiPatch`, `apiDelete` — same shape as `apiGet`: JSON body, `throw` on `!res.ok` **but** first try to parse the error body (FastAPI returns `{"detail": ...}`; domain endpoints return reason fields) and attach it to the thrown error — the UI must show backend "why" messages verbatim, never swallow them.
2. **Create `src/pages/`** with five files + a registry:

```
src/pages/index.js         — exports { Dashboard, Enrolment, Roles, Groups, Progress }
src/pages/DashboardPage.jsx
src/pages/EnrolmentPage.jsx
src/pages/RolesPage.jsx
src/pages/GroupsPage.jsx
src/pages/ProgressPage.jsx
```

3. **Rewrite `App.jsx`**: `NAV_ITEMS = ["Dashboard", "Enrolment", "Roles", "Groups", "Progress"]`; content area renders the active page from the registry map. Keep header + health check untouched.
4. **Global UI state — "acting as":** a select in the header listing the seeded users (from `GET /api/users`), stored in React context (`src/context/ActingUser.jsx`). Almost every page needs an actor id (permission checks, allowed groups, report capability) — this dropdown is how the demo switches personas (admin1 / teacher.a / ta.a / ta.allgroups / student.a / student.multi …). Show the acting user's name in the header.
5. **Shared primitives** in `src/components/common/`: `Badge` (colour variants), `DataTable` (plain table with loading/empty/error rows), `Modal`, `Tabs`, `CourseSelect` (fed by `/api/courses`), `UserSelect`, `ReasonList` (renders a `reasons[]`/`blocking_reasons[]` array as a bulleted list — this component is the soul of the app: every verdict everywhere renders through it).

Design rules (from the charter): **do not polish CSS** — "one thing working completely > five half-working; don't polish CSS." Plain, readable, consistent. No UI library unless you finish everything early (adding a dependency = your call, your `package.json`).

---

## 4. Step 2 — the five pages (specs owned by the domain owners; they review)

### 4.1 DashboardPage (yours alone)

- Cards: seeded counts (users, courses, enrolments, groups) — one `apiGet` each from the list endpoints.
- The acting user's "My progress" strip: `GET /api/progress/users/{id}/overview` → per-course bar (a `null` percent renders **no bar**, exactly like Moodle — not 0%).
- API health + links to the four sections.

### 4.2 EnrolmentPage (spec: file 01 §6.2 — reviewer Yaman)

Data sources: `/api/enrolment/courses/{id}/participants|other-users|methods`, `/api/enrolment/methods/{id}/enrolments`, `/api/enrolment/self/{course_id}`, `/api/enrolment/cohorts*`, `/api/enrolment/users/{id}/enrolments`.

- Course selector → tabs **Participants / Methods / Cohorts / Other users**.
- **ParticipantsTable** — the flagship table. Columns: Name · Roles · Method(s) · Status badge (active green · suspended grey · expired amber · method-disabled amber · **account-suspended red but still listed** — this is deliberate, faithful Moodle behaviour, contradiction C-6) · Groups · Last access · row actions (suspend/reactivate/unenrol *per path*). Status filter select mirroring `?status=active|suspended|all` (default active).
- **EnrolUserModal**: user picker + role (defaults from the method) + optional start/end datetimes.
- **MethodsPanel**: instance cards with enable/disable toggle, self-key config, "Sync now" button on cohort methods.
- **SelfEnrolDemo**: user + key form → render the gate-chain verdict; the failing gate name comes from the API — show it verbatim via `ReasonList`.
- **UserPathsDrawer**: all enrolment paths of one user (method kind, status, window) — the Hard-Case-#1 visual: two rows before cohort removal, one after, membership continuous.

### 4.3 RolesPage (spec: file 04 §5 — reviewer Khaled)

Data sources: `/api/roles*`, `/api/roles/{id}/capabilities`, `/api/roles/assignable`, `/api/roles/assignments`, `/api/permissions/check`, `/api/permissions/decisions`.

- Tabs **Roles / Assignments / Permission Checker / Decision Log**.
- **CapabilityEditor**: role + context pickers → capability sheet with four-state toggles (Not set / Allow / Prevent / Prohibit). Non-system-context rows get an "override" chip; selecting Prohibit shows a red tooltip: "cannot be overridden anywhere below".
- **AssignRoleForm**: context picker → dropdown fed by `/api/roles/assignable` for the *acting* user — log in as teacher.a and the list shrinks to two entries (the matrix demo).
- **PermissionCheckerPage — the demo star.** Inputs: actor (defaults to acting user), capability, context, optional target + activity, optional "simulate role". Render the response as a **vertical gate pipeline**: one row per gate, green/red, evidence strings under each; `capability_values` per role with "decided at course:1"-style badges; final verdict banner. The critical rendering requirement: when capability=allow but the group gate fails, **both must be visible at once** (green capability row, red group row) — that contrast is the entire project story.
- **DecisionLog**: table over `/api/permissions/decisions` (actor, capability, verdict, when; row click → full reasons).

### 4.4 GroupsPage (spec: file 05 §6 — reviewer Mahmoud)

Data sources: `/api/groups*`, `/api/groups/groupings*`, `/api/groups/activities/{id}/policy|allowed`, `/api/groups/access-check`.

- Course selector → tabs **Groups / Groupings / Activity policy / Scope check**.
- **GroupsBoard**: card per group — name, member chips with provenance badges (`manual` / `enrol_cohort` / `enrol_self`), enrolment-key indicator, add/remove member. A refused add (non-enrolled user) and a refused remove (machine-owned row, 409) show the backend reason verbatim + a "force" option for removals.
- **GroupingPanel**: groupings and their member groups; permanent banner: "groupings contain groups, not users".
- **ActivityPolicyTable**: activities × {configured mode, effective mode, forced?, grouping} — **highlight rows where configured ≠ effective** (the silently-ignored setting, rule GRP-012).
- **ScopeCheckPanel**: actor + target + activity → access-check verdict via `ReasonList`; an "as ta.a / as ta.allgroups" toggle for the Hard-Case-#3 three-outcome demo (allowed / denied-with-reasons / not-even-visible).

### 4.5 ProgressPage (spec: file 02 §7 — reviewer Mahdi)

Data sources: `/api/progress/courses/{id}/report|percent|criteria`, `/api/progress/activities/{id}/view|toggle|override`, `/api/progress/users/{id}/overview`, `/api/progress/snapshots`, `/api/progress/courses/{id}/self-complete`.

- Course selector → tabs **Report / My progress / Criteria / History**.
- **CompletionGrid**: tracked users × activities. Cell glyphs: ○ incomplete · ✓ complete · ✓P pass (green) · ✗F fail (red) · 🔒 overridden (tooltip: by whom). Hidden activities carry a header chip: "hidden — in this report, excluded from dashboard %". Group filter (allowed groups for the acting user). Course-completion column: tick + date.
- **MyProgress**: per-course cards, dashboard bar with `counted/total/excluded` on hover; "Complete course" button when a self criterion exists.
- **CriteriaEditor**: list + ALL/ANY toggle + add form (kind, activity, threshold).
- **HistoryTimeline**: snapshot query (user, course, date range); deleted courses render with a "deleted — served from snapshots" badge. This screen **is** Hard Case 5 — it must work for a course that no longer exists anywhere else in the UI.
- Buttons for the demo verbs: "view as student", manual tick, override (only enabled when the acting user passes the capability — disable with the reason as tooltip).

---

## 5. Where the data really comes from (so you debug across the stack)

You never query tables directly — but you must know which tables sit behind each screen to file precise bugs:

| Screen | Endpoints | Underlying tables (owner) |
|---|---|---|
| ParticipantsTable | `/api/enrolment/.../participants` | `user_enrolment`, `enrolment_method`, `role_assignment`, `group_member`, `user_lastaccess`, `app_user` (Yaman) |
| Other users | `.../other-users` | `role_assignment` minus `user_enrolment` (Yaman/Khaled) |
| CapabilityEditor | `/api/roles/{id}/capabilities` | `role_capability`, `context` (Khaled) |
| Checker pipeline | `/api/permissions/check` | everything + `permission_decision` audit (Khaled) |
| GroupsBoard | `/api/groups*` | `course_group`, `group_member` (Mahmoud) |
| ActivityPolicyTable | `.../policy` | `course_activity.group_mode/grouping_id`, `course.group_mode/force_group_mode` (Mahmoud) |
| CompletionGrid | `/api/progress/.../report` | `activity_completion`, `criterion_completion`, `course_completion` (Mahdi) |
| HistoryTimeline | `/api/progress/snapshots` | `progress_snapshot` — no FK to course, survives deletion (Mahdi) |

---

## 6. Error, loading, and empty states (uniform everywhere)

- Every fetch renders one of: spinner row → data → empty message ("No participants match this filter") → error banner with the backend message.
- **Never hide a backend refusal** — surfaced reasons are the product. 403/409 payloads go through `ReasonList` verbatim.
- Mutations: optimistic UI is forbidden (correctness demo > snappiness) — refetch after every write.

## 7. File map you own (final)

```
frontend/src/
├── api.js                      # + apiPost/apiPatch/apiDelete
├── App.jsx                     # shell + nav + acting-user select
├── context/ActingUser.jsx
├── pages/{index.js, DashboardPage, EnrolmentPage, RolesPage, GroupsPage, ProgressPage}.jsx
└── components/
    ├── common/{Badge, DataTable, Modal, Tabs, CourseSelect, UserSelect, ReasonList}.jsx
    ├── enrolment/{ParticipantsTable, EnrolUserModal, MethodsPanel, SelfEnrolDemo, UserPathsDrawer}.jsx
    ├── roles/{CapabilityEditor, AssignRoleForm, PermissionChecker, DecisionLog}.jsx
    ├── groups/{GroupsBoard, GroupingPanel, ActivityPolicyTable, ScopeCheckPanel}.jsx
    └── progress/{CompletionGrid, MyProgress, CriteriaEditor, HistoryTimeline}.jsx
```

## 8. Working ahead of the backend (mock mode)

Until an endpoint lands, you may keep a `src/mocks/<domain>.js` returning the exact contract shapes from files 01/02/04/05, switched by `VITE_USE_MOCKS=1`. Every mock must match the frozen contract field-for-field — when the real endpoint lands, deleting the mock must change nothing else. Mock mode must be visibly badged in the header ("MOCK DATA"). No mock ships in the Thursday demo.

## 9. Forbidden

- Never edit anything under `backend/` after your bootstrap PR (03) merges; never change `schema.sql`.
- Never fake or reshape API responses inside components (mocks live only in `src/mocks/`, contract-identical, badge on).
- Never suppress backend reasons; never implement business rules client-side (e.g. don't compute "active enrolment" in JS — the badge shows whatever the API says).
- Never let two pages define their own variants of common components — everything shared lives in `components/common/`.

## 10. Definition of done

- [ ] Shell merged early (nav, acting-user context, api helpers) — backend owners unblocked from ever touching `frontend/`.
- [ ] All five pages implemented to spec; each domain owner has reviewed and approved theirs.
- [ ] The four demo walkthroughs run from the UI alone: HC-1 (paths drawer), HC-3 (scope panel three outcomes), HC-4 (multi-group filters), HC-5 (history for a deleted course).
- [ ] The checker renders capability-allow + group-deny simultaneously.
- [ ] Every error path shows the backend's reason text; zero silent failures.
- [ ] `VITE_USE_MOCKS=0` for the demo; no mock imports remain in pages.
- [ ] `npm run lint` clean; app builds with `npm run build`.
