# Why our DB beats Moodle's — and where it doesn't

Team 2 — People & Enrolment. Defense of the schema in [`schema.sql`](schema.sql) / [`DB_SCHEMA.md`](DB_SCHEMA.md).

**Stack note (per brief):** everything we build is Python (FastAPI) + TypeScript (React) + PostgreSQL.
PHP appears in this project only as *reading material* — Moodle's source is what we studied, never
what we write or extend. Every "PHP" mention below refers to Moodle's implementation, not ours.

---

## Where ours is better

### 1. The database enforces truth — Moodle's only promises it
Moodle has **zero foreign-key constraints**. All referential integrity lives in Moodle's
application layer. Delete a course with raw SQL and orphan rows sit silently everywhere.
Ours: real FKs on every relation, plus CHECK constraints (a `cohort` method must carry a
`cohort_id`). Bad data cannot enter, even through buggy app code — and our FastAPI backend
gets integrity for free instead of re-implementing it.

### 2. Readable without the source code
Moodle: `permission = -1000`, `status = 0`, `groupmode = 1` — meaningless unless you open the
source and find the constants. Ours: `'prohibit'`, `'active'`, `'separate'` as Postgres enums.
Someone outside the team can read the schema cold and understand it — which is literally the
judging criterion for the model (15%: "could someone outside your team build from it").

### 3. No Y2038 bomb
Moodle stores "enrolment never ends" as `timeend = 2147483647` — signed-32-bit epoch max,
which stops meaning "forever" in 2038. Ours: `NULL` = open-ended, `timestamptz` everywhere.

### 4. The context tree cannot corrupt
Moodle stores the permission hierarchy as a path string (`/1/3/17`) with **no parent FK**, and
runs a repair job (`build_context_path()`, see its `context_temp` table) to fix drift.
A schema that ships its own repair crew is admitting the design leaks. Ours: `parent_id` FK is
the source of truth; a trigger derives `path`/`depth`; drift is impossible by construction.

### 5. No junk-drawer columns
Moodle's `enrol` table carries `customint1..8`, `customchar1..3`, `customdec1..2`,
`customtext1..4` — 17 spare columns whose meaning changes per plugin (`customint1` is a cohort
id in enrol_cohort, something else entirely in enrol_self). Ours: typed columns for what's
real (`cohort_id` FK) and one `config jsonb` for the rest.

### 6. The "why" is queryable
Moodle's `has_capability()` returns a bare boolean; the reasoning is buried in the PHP call
stack. Our `fn_can()` returns the verdict **plus the per-role trace** as jsonb — which role,
which permission, decided at which depth. The brief's core question ("can this user do this
action in this course, **and why**") is answered by the database itself, in one call.

### 7. Half the tables, same coverage
~20 tables vs ~40 in Moodle's equivalent area — merged what never needed splitting
(`course_modules_viewed` → a `viewed_at` column) and dropped dead weight, without losing a
single rule the hard cases need.

---

## Where Moodle is better — honesty section

- **Its design survived 20 years of plugins.** The `custom*` columns we mock exist so
  third-party enrol plugins never need schema migrations. We have no plugin ecosystem; if we
  did, jsonb alone only partially solves what those columns solve.
- **`role_allow_assign` / `role_allow_override` / `role_allow_switch`** — Moodle's tables
  controlling *who may grant which role*. We dropped them (four-day YAGNI). A real deployment
  needs them, or any teacher can promote themselves to manager.
- **We copied its best ideas outright.** Enrolment and role assignment as two separate facts;
  the context tree; sticky prohibit; completion records surviving unenrolment; `component`/
  `item_id` provenance on synced rows. The skeleton is Moodle's — tested against the real
  system, then rebuilt clean. "Moodle is more complex, therefore worse" is not our argument;
  our argument is that the same rules can be enforced in the schema instead of promised by
  the application.

---

**One-liner:** same rules Moodle actually follows — we tested them — but enforced by the
database instead of promised by application code, and readable without opening the source.
