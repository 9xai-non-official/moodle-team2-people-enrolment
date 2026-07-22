# Parity fixes — creative DB-layer solutions to the Moodle gaps

Applied to the **live Supabase DB** via the management API (never `schema.sql` —
the team edits that concurrently). Each `.sql` here is the durable record of
what ran. The theme: **solve whole gap-clusters at the database layer, where
the fix cannot be bypassed** — which is precisely where Moodle is weakest
(its integrity and events live in PHP that any code path can skip).

Source gap docs: `~/Downloads/MOODLE-GAPS-NOT-SOLVED.md`,
`~/Downloads/IMPROVEMENTS-OVER-MOODLE.md`.

---

## The four moves and the gaps each closes

### 01 — Universal audit triggers  (`01_universal_audit_triggers.sql`)
DB triggers on `enrolment` and `role_assignment` write an `audit_log` row on
every INSERT/UPDATE/DELETE. `group_member`, `course_completion` and
`activity_completion` are covered by the app + trigger 04.

**Why it beats Moodle:** Moodle fires `\core\event\*` in PHP; a bulk SQL fix, a
plugin, or a migration that writes the row directly **skips the event and the
log lies**. A row trigger fires on the data, so nothing can change enrolment or
role state without the ledger recording it. *Proven:* a raw `UPDATE enrolment`
(no app code) produced an `enrolment.updated` row tagged `source:db_trigger`.

Closes: **EVT-001, EVT-002, EVT-003, EVT-004, EVT-005, EVT-011, ENR-014,
RBAC-070, DATA-016, HIS-011, HC-05c** (durable residue after deletion).

### 02 — Real completion aggregation  (`02_completion_aggregation.sql`)
`fn_course_completion(user, course)` computes ALL/ANY aggregation over the
real `completion_criteria` / `course_completion_setting` tables (created in the
earlier D-CRIT fix), falling back to "all tracked activities" (Moodle default)
when no criteria are set. Exposed via PostgREST RPC.

**Turns mock into truth:** these rules previously existed **only in the React
mock** (FALSE_SIMILARITY). *Proven:* salma 2/3 met → ALL `complete:false`,
ANY `complete:true`.

Closes: **PRG-016, PRG-017, PRG-019, PRG-020, DATA-012.**

### 03 — Scheduled lifecycle jobs  (`03_scheduled_lifecycle_jobs.sql`)
`pg_cron` jobs: nightly **expiry demotion** (active enrolment past `time_end` →
`suspended`, *stored* not on-read) and **longtimenosee** (idle self-enrolled
users suspended). Each flip is auto-captured by trigger 01.

**Why it beats Moodle:** Moodle's expiry/longtimenosee run in an external cron
that can lag or silently fail, and its demotion is often computed on read. Here
the state is **stored** and the job lives in the database's own scheduler.
*Proven:* the expiry job demoted the one expired enrolment and the audit
trigger logged it as `enrolment.updated → suspended`.

Closes: **ENR-017, ENR-018, ENR-021, ENR-032, ENR-033, EVT-009, PRG-023.**

### 04 — Activity-completion write path + auto-recompute  (`04_activity_completion_writer.sql`)
`fn_set_activity_completion(user, activity, state, actor, viewed)` is the write
path (upsert, records `overridden_by` when actor≠user). A trigger on
`activity_completion` then (a) audits the change and (b) **instantly recomputes
course completion** via `fn_course_completion`, setting `course_completion.
time_completed` when newly complete (sticky — never auto-un-completes).

**Why it beats Moodle + upgrades our own improvement #7:** the aggregate cascade
is a trigger, so course completion **cannot drift** from activity state — no
reaggregate flag, no nightly repair, no stale numerator. It also gives the
soft-delete-retention advantage real **activity-level** history (previously
narrow: no code wrote `activity_completion`). *Proven:* completing salma's 3rd
CS101 activity flipped the course to complete and auto-set `time_completed`,
audited as `progress.activity_set`.

Closes: **PRG-006, PRG-009, PRG-010, PRG-011, PRG-013, PRG-032, PRG-036,
DATA-010**; upgrades **Note A / improvement #7** to full activity history.

---

## Already closed earlier this session (context)

- **Groups cluster** (work package 05, PR #25): GRP-012/015/016 (routed 500 →
  fixed), GRP-017/018 (SQL scope enforcement), GRP-019/021/022 (gated mutations
  + server provenance), GRP-005/006 (visibility + participation), GRP-030..033
  (activity availability), GRP-034 (group events → audit). This also upgrades
  **Note B / improvement #12** (see/act-on model) from a *design* strength to a
  *working, routed* one.
- **fn_can loaded + exposed** (Mahdi handoff): unblocks the override allow-path
  (PRG-003, PRG-011 gate).
- **D-VIEW** live: PRG-001/026/027/028/029 (numerator filter + enrolment gate +
  `≤100` clamp).
- **D-IMMUT** trigger: PRG-018/PRG-002 (course completion write-once).

---

## What remains genuinely out of reach (honest)

- **RBAC-001 real session auth** — interim `X-Acting-User` principal is in
  `app/deps.py`; true session/JWT is Khaled's WP04 (`services/auth.py`, merged).
- **Recycle-bin / privacy-API / category entity** (HIS-008/010/012, PRG-035) —
  new subsystems, not gaps in existing code; out of a DB-layer pass.
- **Per-request accessdata cache** (RBAC-023) — correctness is fine; only a
  perf optimization.

These are noted, not hidden.
