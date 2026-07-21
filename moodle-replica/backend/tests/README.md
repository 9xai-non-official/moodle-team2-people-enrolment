# Task 04 — Roles, Contexts & the Permission Engine (Khaled)

The `can(user, action, where) → allowed + why` engine. It never just says *no* —
it names the role, the value, and the deciding context, with every gate's
evidence attached.

## Files (this deliverable only)

| File | What |
|---|---|
| `app/services/permissions.py` | The engine. A **pure core** (`resolve_capability`, `build_decision`, dependency-free, unit-tested) + an **async DB layer** (`has_capability`, `check`, `assign_role`, `set_override`, `assignable_roles`, `role_capability_sheet`, `clone_role`, `decisions`). |
| `app/routers/roles.py` | `/api/roles` — role CRUD, clone, capability sheet + overrides, assignable matrix, assignments. |
| `app/routers/permissions.py` | `/api/permissions/check` (the centrepiece) + `/api/permissions/decisions`. |
| `app/schemas_roles.py` | Pydantic request/response models incl. the frozen `/check` contract. |
| `tests/test_permissions.py` | 27 unit tests: the **ten §8.4 conflict cases** + the **six §17.3 reference scenarios** + gate cases. |
| `tests/test_check_integration.py` | `check()` end-to-end over an in-memory FakeDB (the TA cross-group demo). |
| `tests/test_api_smoke.py` | Routes registered; `/check` wired to the DB layer. |
| `tests/krol_demos.py` | KROL-001/005/006/007/009/010 as runnable demonstrations. |
| `main.py` | +2 lines only: import + include the permissions router. |

## Run

```bash
cd moodle-replica/backend
python -m pytest tests/ -q          # 45 tests, no database needed (hermetic)
python tests/krol_demos.py          # prints each KROL experiment's outcome
python tests/live_demo.py           # end-to-end demo against the live DB (needs backend/.env)
```

**Live-validated.** The full pipeline was run against the real Supabase DB and
the seeded demo data (CS101 = separate groups; `ta.a` = non-editing `teacher`
with a course-level `site:accessallgroups = prevent` override; Group A/B). It
reproduced every gate live, including the centrepiece: `ta.a` grading a student
in the SAME group → ALLOW, and in a DIFFERENT group → DENY *while the capability
still resolves to `allow`* (`access_all_groups=false`). `tests/live_demo.py`
runs the nine demo scenarios and reports how many match their expected verdict;
each call is also written to the `permission_decision` Decision Log.

The engine also passed a 4-lens adversarial review (resolver, gate pipeline,
async-SQL-vs-schema, contract/forbidden-writes); all 9 confirmed findings are
fixed and regression-tested — notably server-side authorization on the
role-assignment write path (a caller can no longer bypass the assign matrix).

The pure resolver + gate logic run with zero I/O, so the tests pass anywhere
`pytest` is installed. The live endpoints need `DATABASE_URL` in `backend/.env`
(see `.env.example`); without it every endpoint answers a clean 503, same as the
rest of the app.

## The algorithm (implemented exactly, §8.3)

1. actor deleted → **DENY**
2. capability unknown → **DENY**
3. admin bypass: `doanything AND actor ∈ ADMIN_USER_IDS AND simulate_role is None` → **ALLOW** (config list, *not* a role)
4. guest gate: guest AND (write-cap OR risks ∩ {xss,config,dataloss}) → **DENY**
5. build context path most-specific-first
6. held roles = assignments on any path segment (+ synthesized virtual `user` role for non-guests; + `{simulate_role, user}` only when simulating)
7. per role, most-specific row wins; **any** prohibit on the path (any held role) → **DENY** (un-overridable)
8. any role resolves `allow` → **ALLOW**
9. else → **DENY** (default deny)

`check()` then wraps this in the 8-gate pipeline (account → admin → guest →
course-door → capability → target participation → group scope → activity state),
each gate appending evidence whether it passed or failed, and logs every verdict
to `permission_decision`.

## `/api/permissions/check` contract (frozen, §17.3)

Request: `{actor_user_id, capability, context_id, target_user_id?, activity_id?, simulate_role_id?}`
Response keys: `allowed, decision, blocking_reasons[], supporting_reasons[],
enrolment_paths[], roles_considered[], contexts_considered[], capability_values{},
prohibits_found[], group_scope{mode,actor_groups,target_groups,shared,access_all_groups},
admin_bypass, simulated_role`.

## The `permission_decision` audit table

It is **not** in the frozen `schema.sql` (which has `audit_log` instead), and I
may not edit `schema.sql`. Since this table is mine (§2), `check()` creates it
lazily — idempotently — the first time it logs, and logging is best-effort (a
missing table or DB never breaks a verdict). The DDL is also exported as
`permissions.PERMISSION_DECISION_DDL` so it can be applied as a migration:

```sql
create table if not exists permission_decision (
    id bigint generated always as identity primary key,
    actor_id bigint, capability varchar(255), context_id bigint, target_id bigint,
    allowed boolean not null, reasons jsonb not null default '{}'::jsonb,
    decided_at timestamptz not null default now()
);
```

## Deviations from the brief (reconciled against the real repo)

The brief's *system prompt* described an idealized stack; the actual committed
code differs, so I conformed to the **real code + real schema**:

1. **Async, not SQLAlchemy.** `app/db.py` is an `asyncpg` pool exposing
   `fetch_all`/`fetch_one` — there is no SQLAlchemy session. All public
   functions are therefore `async` and take the `db` gateway as the first arg
   (same names/params/return shapes as the brief's frozen signatures).
2. **Short capability names.** The seed uses `activity:grade`, `course:view`,
   `site:accessallgroups`, `role:assign`, `activity:submit` — **not** the
   Moodle-style `mod/assign:grade` etc. `capability.name` is a FK, so it is the
   source of truth. The gate keys are single constants (`CAP_COURSE_VIEW`,
   `CAP_ACCESS_ALL_GROUPS`, `CAP_ROLE_ASSIGN`) mapping the brief's names to the
   seeded ones; the resolver itself stays fully data-driven.
3. **C-17 (`site:accessallgroups` for the non-editing teacher).** The brief +
   one findings doc say the non-editing `teacher` does **not** have it; the
   Arabic guide's matrix, Issa's committed `seed.sql`, and real Moodle say it
   **does**. The resolver is **data-driven** and never hardcodes this, so its
   logic is correct either way. The cross-group DENY demo is driven by an
   explicit `accessallgroups` prevent-override / absence (Hard-Case-3's own
   mechanism), which works under either reading. **Decision needed:** whether to
   ask Issa to flip the seed cell, purely for the demo narrative.
4. **Enrolment services not built yet.** Yaman's `active_paths()` and Mahmoud's
   `shares_group()/allowed_groups()` don't exist yet. The gates prefer those
   services when present and otherwise fall back to **SELECT-only** reads of the
   `v_enrolment_detail`/`v_course_participant` views and `group_member` — never
   writing another team's tables.

## Ground-truth facts honored (contradiction findings)

- **C-11:** ALLOW in any role beats PREVENT in another; only PROHIBIT vetoes.
- **C-16:** manager is assignable at System, Category **and Course**.
- **C-18:** editingteacher may assign `[teacher, student]` only — never itself.
- Site Administrator is a **config list bypass**, never modelled as a role, and
  suppressed during a role-switch simulation.
