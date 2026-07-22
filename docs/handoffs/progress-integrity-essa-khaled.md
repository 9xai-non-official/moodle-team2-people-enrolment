# Handoff — Progress integrity fixes need DB + Roles work

**From:** Mahdi (progress)
**To:** Essa (database / views / D-*), Khaled (roles / permissions)
**Re:** T2-PRG-001, -002, -003, -005

> **Filed from Slack on 2026-07-22. The body below is verbatim — read these three corrections first.**
>
> 1. **The SQL drafts are no longer at the repo root.** They moved to `db/drafts/` when the root
>    was restructured to the required deliverable layout:
>    [`db/drafts/fix_T2-PRG-003_D-CRIT_criteria_aggregation.sql`](../../db/drafts/fix_T2-PRG-003_D-CRIT_criteria_aggregation.sql) ·
>    [`db/drafts/fix_T2-PRG-002_D-IMMUT_optional.sql`](../../db/drafts/fix_T2-PRG-002_D-IMMUT_optional.sql)
> 2. **`fix_T2-PRG_v_course_progress.sql` is not in the repo at all** — not at the root, not in
>    `db/drafts/`. The only other draft present is `db/drafts/fix_T2-PRG_fn_can_load.sql`. Ask Mahdi
>    whether that is the renamed D-VIEW draft or whether the `v_course_progress` one was never committed.
> 3. **`TEAM_CREDENTIALS.md` is gitignored and not in version control** (credentials were purged in
>    commit `19aab9d`). Take `DATABASE_URL` from your own local `.env` — see
>    [`.env.example`](../../.env.example).
>
> `seed.sql`, referenced in the Khaled section, is now [`db/seed.sql`](../../db/seed.sql).

I've landed the **backend** side of four progress tasks in
`moodle-replica/backend/app/routers/progress.py` (+ an `rpc()` helper in
`app/supa.py`). Some of it is **blocked** on database + permission work that
belongs to you two. This doc lists exactly what to run and why.

The SQL drafts referenced below live at the repo root:
- `fix_T2-PRG_v_course_progress.sql`
- `fix_T2-PRG-003_D-CRIT_criteria_aggregation.sql`
- `fix_T2-PRG-002_D-IMMUT_optional.sql`

Apply DDL through the Supabase SQL editor (or `psql` with `DATABASE_URL` from
`TEAM_CREDENTIALS.md`). PostgREST (the key I use) can't run DDL, which is why
these are handed to you.

---

## 🔴 Shared blocker (read first): `fn_can` is not in the live DB

The permission engine `fn_can(...)` is defined in `schema.sql` but is **not
present / not exposed** in the live Supabase database — `POST /rest/v1/rpc/fn_can`
returns 404, and the PostgREST OpenAPI lists **no RPC functions at all**.

Consequence: the T2-PRG-003 **override allow-path cannot run**. My code
correctly **fails closed** (denies every override) until this is fixed, so
nothing is unsafe — but overrides are impossible until `fn_can` is live.

**Needed:** load the functions from `schema.sql` into the live DB and reload the
PostgREST schema cache (`notify pgrst, 'reload schema';` or restart). Then verify:

```sql
select fn_can(1, 'course:view', 1);   -- should return a jsonb verdict, not error
```

This is likely Essa (loading `schema.sql`) + confirmation from Khaled that the
capability data is present (see Khaled section).

---

## Essa — database / views

### 1. D-VIEW — fixes T2-PRG-001 **and** T2-PRG-005  ·  `fix_T2-PRG_v_course_progress.sql`
`CREATE OR REPLACE VIEW v_course_progress` that:
- **T2-PRG-001:** gives the numerator the same activity filter as the
  denominator (`completion_enabled AND deleted_at IS NULL`), so
  `activities_done` can no longer exceed `activities_total` (kills the 125% /
  false-completion bug at the source).
- **T2-PRG-005:** appends an `enrolled` column via `LEFT JOIN v_course_participant`
  so display can be gated on live enrolment.

Column list/order is unchanged except `enrolled` appended → `CREATE OR REPLACE`
is valid. **Verify** (must return 0 rows):
```sql
select * from v_course_progress
where activities_total > 0 and activities_done > activities_total;
```

> My backend already defends against both bugs (clamp + enrolment gate via
> `v_course_participant`), so applying this is additive, not urgent — it fixes
> the root cause so other consumers of the view are safe too.

### 2. D-CRIT — required for T2-PRG-003 automatic completion  ·  `fix_T2-PRG-003_D-CRIT_criteria_aggregation.sql`
Creates the criteria/aggregation tables the completion engine needs:
- `course_completion_setting(course_id, aggregation 'all'|'any')`
- `completion_criteria(course_id, activity_id)` — the required activities
- also inserts the `completion:override` **capability** + grants (see Khaled)

My backend **already consumes these** and falls back to the Moodle default
("ALL completion-enabled activities") until they exist. Once applied, per-course
criteria + ANY/ALL aggregation become real. **Verify:**
```sql
select * from course_completion_setting;
select * from completion_criteria order by course_id;
```

### 3. D-IMMUT — optional hardening for T2-PRG-002  ·  `fix_T2-PRG-002_D-IMMUT_optional.sql`
A `BEFORE UPDATE` trigger on `course_completion` that blocks **rewriting** a set
`time_completed` to a different non-null value (allows first-set and the app's
audited reset to NULL). Defense-in-depth; the app already enforces write-once.
Optional but recommended.

---

## Khaled — roles / permissions

The live DB's permission tables are **empty** (`context`, `capability`, `role`,
`role_capability`, `role_assignment` all have 0 rows). Until they're seeded, the
override gate has nothing to resolve against.

### 1. Seed the permission subsystem into the live DB
`seed.sql` already builds the system context, the core capabilities, the five
roles, and the default `role_capability` grants — but it hasn't been applied to
the live database. Please load it (coordinate with Essa on ordering vs
`schema.sql`).

### 2. Course/activity contexts must exist
`fn_can` walks the context tree by `parent_id` (and uses `context.depth` to pick
the deepest override). For the override endpoint to resolve a course/activity,
there must be a `context` row:
- course: `(level='course', instance_id=<course_id>, parent_id=<system ctx>, depth=1)`
- activity: `(level='activity', instance_id=<activity_id>, parent_id=<course ctx>, depth=2)`

Whatever creates courses/activities should create their context rows (or a
trigger/backfill). Without them my override endpoint returns **409** ("no
context — permission cannot be resolved").

### 3. The `completion:override` capability + who gets it
My override path gates on the capability name **`completion:override`**. The
D-CRIT draft (Essa's file) inserts it and grants `allow` to **manager** and
**editingteacher** at the system context. Please confirm that's the right policy
(Moodle grants `moodle/completion:overrideactivitycompletion` to editing teacher
+ manager, **not** plain non-editing teacher). Adjust the grants if your role
model differs. Also ensure teachers have a `role_assignment` at the relevant
course context.

### Contract my code relies on
- capability name: `completion:override`
- `fn_can(p_user_id, p_capability, p_context_id)` returns jsonb with a
  boolean **`granted`** field (I only read `granted` + `reason`).

---

## How to verify end-to-end once you're both done
With `fn_can` live, contexts seeded, and a teacher granted `completion:override`:

```
# ALLOW: teacher overrides a student's activity → 200, overridden_by set
POST /api/progress/activity/override
  {"user_id": <student>, "activity_id": <act>, "state": "complete", "actor_id": <teacher>}

# DENY: a student (no capability) tries the same → 403
POST /api/progress/activity/override
  {"user_id": <student>, "activity_id": <act>, "state": "complete", "actor_id": <student>}
```

Both currently return **403 (fail-closed)** because `fn_can` is absent — that's
the signal to check the blocker above.

## Summary
| Item | Owner | File | Blocks |
|---|---|---|---|
| Load `schema.sql` funcs + reload PostgREST (expose `fn_can`) | Essa | `schema.sql` | PRG-003 override allow-path |
| D-VIEW (numerator filter + `enrolled`) | Essa | `fix_T2-PRG_v_course_progress.sql` | root-cause of 001/005 |
| D-CRIT (criteria + aggregation + capability) | Essa | `fix_T2-PRG-003_D-CRIT_criteria_aggregation.sql` | real per-course criteria |
| D-IMMUT (write-once trigger, optional) | Essa | `fix_T2-PRG-002_D-IMMUT_optional.sql` | — |
| Seed permission subsystem (`seed.sql`) | Khaled | `seed.sql` | override gate |
| Course/activity context rows | Khaled | — | override 409s without them |
| Confirm `completion:override` grants | Khaled | (D-CRIT file) | who may override |
