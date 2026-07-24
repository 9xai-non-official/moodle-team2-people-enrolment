# SIS ↔ WhoCan — Ownership & Sync Contract

**Status:** v1.1 — **implemented** on branch `t2/mahmoud/sis` (local Docker DB; schema change pending Essa's review as `db/drafts/sis_T2-SIS-001_portal_integration.sql`) · **Date:** 2026-07-23 · **Owner:** Mahmoud (SIS)
**Reviewers:** Issa (Entra/Teams/Outlook), WhoCan maintainers (Yaman / Khaled / Essa)
**Applies to:** the 9xai *registration → LMS → Microsoft* pipeline (POC)

> **Glossary**
> - **SIS** — the 9xai **Student Portal** (the registration system). New service, Mahmoud owns. Source of truth.
> - **WhoCan** — our Moodle replica (the LMS), **standing in for real Moodle**. Downstream consumer.
> - **MS side** — Entra ID + Teams + Outlook provisioning. Issa owns. Separate `/provision` contract (§9c).

---

## 1. TL;DR — the one rule

**The SIS is the system of record for _people, courses, and enrolments_. WhoCan imports them and can neither create nor override them. WhoCan owns only what happens _inside_ a course — content, grades, activity. No field is written by two systems.**

> Edit people / courses / enrolments **in the SIS**.
> Edit content / grades **in WhoCan**.
> Nothing syncs both ways on the same field.

## 2. Why — the failure this prevents

Two-way sync of the same data is **split-brain**: both systems believe they're authoritative about an enrolment, and every reconcile overwrites the last human edit. Assigning **one owner per fact** and syncing **one direction** removes the conflict by construction. WhoCan already enforces exactly this for cohorts (§6) — we're aiming the same mechanism at the SIS.

## 3. Ownership matrix

| Fact | System of record | WhoCan may… | Notes |
|---|---|---|---|
| Person identity — legal name, email, national/student ID | **SIS** | **view only** | matched by `sis_id` |
| Person local prefs — avatar, nickname, UI language, timezone | **WhoCan** | edit | never synced back to SIS |
| Account exists / active / suspended | **SIS** *(derived from current-term registration)* | **view only** | drives the login gate (§6) |
| Course / section — code, title, term | **SIS** | **view only** | matched by `sis_id` (≈ Moodle `idnumber`) |
| Enrolment — person ↔ course ↔ term ↔ role | **SIS** | **view only; no manual enrol/unenrol** | `method = sis` |
| Role for a SIS enrolment — student / teacher / TA | **SIS** | **view only** | WhoCan may still hold *non-SIS* roles (§6) |
| Groups / groupings **inside** a course | **WhoCan** | full | teaching construct, not SIS |
| Content, activities, resources | **WhoCan** | full | |
| Grades, submissions, attempts, completion | **WhoCan** | full | optional one-way passback (§8) |
| Last access / activity tracking | **WhoCan** | full | |

**Rule of thumb:** SIS owns *who / what / who-belongs-to-what*. WhoCan owns *what happens in the course*.

## 4. Direction of sync — desired-state reconciliation

- **SIS = desired state.** WhoCan continuously reconciles itself to match (Kubernetes-style).
- **One-way per fact:** SIS → WhoCan for every SIS-owned row in §3.
- **SIS always wins:** a manual change to SIS-owned data in WhoCan is **reverted on the next reconcile** — so it must be **disabled in the UI** (§6).
- **Two mechanisms, both already patterned in the code:**
  1. **Push (event)** — SIS emits on register/drop → WhoCan applies immediately. (Mirrors WhoCan's after-commit `ops`.)
  2. **Pull (reconcile)** — WhoCan re-reads the SIS roster on a schedule → fixes drift + handles term rollover. **Authoritative.** (Mirrors `sync_cohort_method` + `enrol_expiry.py`.)
- **Idempotent:** match on `sis_id`; add missing, remove extra, update changed. Safe to re-run any time.

## 5. Bidirectional — answered directly

| Question | Answer |
|---|---|
| I change an enrolment / user / course **in WhoCan** — does the SIS see it? | **No — and WhoCan blocks it.** If it slips through, the next reconcile reverts it. |
| I change a registration **in the SIS** — does WhoCan see it? | **Yes** — that's the pipeline (push + reconcile). |
| I edit a **grade** in WhoCan — does the SIS see it? | Not automatically. Optional **one-way** grade passback at term end (§8). |
| I edit a student's **legal name** in WhoCan? | **Blocked** — SIS owns it. Change it in the portal. |
| I edit my **avatar / nickname / timezone** in WhoCan? | Fine — WhoCan-local, never synced. |

## 6. Enforcement in WhoCan — reuse what already exists

- **New enrol method kind `sis`** added to `enrol_method_kind` *(currently `manual` / `self` / `cohort` / `guest`)*. One `sis` method instance per SIS-managed course.
- It behaves like **`cohort`**: a source-of-truth list reconciled into the course — *in list → enrol; gone → unenrol; suspended → reactivate*.
- **Reuse the R-COHORT guard (ENR-013):** an active `sis`-synced path **cannot be manually unenrolled or edited** → `409`, *"managed by SIS — change it in the portal."* Same guard, new provenance component (`enrol_sis`).
- **Term windows:** each synced enrolment carries `time_start` / `time_end` = the term bounds. **Term rollover** is handled by the existing **`enrol_expiry.py`** worker with `expiredaction = suspend` (keeps grades + history; access just stops) — **not** `unenrol`.
- **Account-active policy (new):** a user with **zero live `sis` enrolments in the current term** → account **suspended** (your *"didn't register → can't log in"*). Runs as a nightly job. Note WhoCan already reports *account-suspended* and *enrolment-suspended* as **separate** facts — this drives the former.
- **Non-SIS coexistence:** WhoCan may still hold `manual` roles/enrolments for **sandbox/training** courses or ad-hoc staff. Those are **outside SIS scope** and stay fully editable. Tag every user/course with `origin ∈ {sis, local}`; the guards apply only to `sis` entities.

### UI implications — the Enrolment screen
For a **SIS-managed course**, disable/hide **Enrol users**, **Create account**, **Self enrol**, **Guest**. Show `METHOD = sis` with a **"Managed by SIS"** badge. Roster stays fully readable (participants, statuses, Export CSV). **Sandbox/local** courses keep the full toolset.

## 7. Data-model additions (WhoCan)

**As built** — the schema already carried the external keys, so the diff shrank
to almost nothing (`db/drafts/sis_T2-SIS-001_portal_integration.sql`):

| Change | Detail |
|---|---|
| `enrol_method_kind` | add value **`sis`** ✅ |
| Person match key | **`app_user.id_number`** (existed; + unique partial index) — Moodle's external-identity column ✅ |
| Course match key | **`course.external_ref`** (existed, already UNIQUE) ✅ |
| Origin flag | **derived**: `id_number`/`external_ref` NOT NULL ⇔ SIS-managed — no new column |
| Term table on WhoCan | **none needed** — events carry the term WITH dates (§9a); windows land on each enrolment's `time_start/time_end` |
| `term` table (SIS side) | lives in the SIS store, where it belongs |
| **No** new expiry/status columns | reuse `status (active/suspended)` + `time_end` + the worker — consistent with the existing *DO-NOT-ADOPT persisted-expiry* decision |

> Note: SIS and local courses may share a `short_name` (two "CS101"s). That is
> deliberate — identity is `external_ref`, and a claimed ref is never stolen
> (adopt only fires on rows with a NULL key).

## 8. The one backward flow — grade passback (later, NOT POC)

At term end: **WhoCan → SIS, final grades only, one-way.** The SIS still owns the official transcript; WhoCan submits a number. **Out of scope for the POC** — listed here so nobody accidentally designs a two-way grade sync.

## 9. Contracts (payloads)

### 9a. SIS → WhoCan — event push ✅ *implemented*
```jsonc
POST /api/sis/events   // on WhoCan; caller must be the site-admin service identity
                       // (X-Acting-User; ADMIN_USERNAMES config list, like Moodle's $CFG->siteadmins)
{
  "type":   "enrol",          // enrol | drop | account
  "term":   { "code": "FALL2026", "starts_at": "2026-07-01", "ends_at": "2026-12-20" },
  "role":   "student",        // or "teacher" → editingteacher role
  "person": { "sis_id": "S1001", "first": "Sara", "last": "Ali", "email": "sara@9xai.edu" },
  "course": { "sis_id": "CRS-CS101", "code": "CS101", "title": "Intro to CS" }
}
// account events (the login gate, §6) carry no course:
// { "type": "account", "term": {...}, "active": false, "person": {...} }
```
The term's dates become the enrolment's `time_start/time_end`, so term
rollover is the existing expiry machinery — no extra code. The endpoint is
**idempotent** (find by external key → adopt-if-unclaimed → create), so
delivery is safely at-least-once. Role changes replace the `enrol_sis`
provenance row rather than accumulating. `GET /api/sis/status` reports the
portal's footprint.

### 9b. SIS-side delivery — transactional outbox ✅ *implemented*
Every mutation enqueues its event in the SIS `outbox` (same store, same
logical step); a background worker drains with exponential backoff, and
`POST /api/reconcile` replays the FULL desired state for the current term
(enrols + drops + account gate). Modes: `dry` (default — record, send
nothing) / `live` / `off`. A per-course WhoCan-side pull sync can be added
later as a sibling of the cohort sync route.

### 9c. SIS → MS provisioning (Issa) — same event, separate target ✅ *scaffolded*
The SIS sends the provisioning service the **same `enrol`/`drop` event** it
sends WhoCan (the `account` type is WhoCan-only — Teams has no login gate). The
SIS `outbox` fans out to a `provision` target, gated by `PROVISION_MODE` (`off`
default → no rows enqueued; `dry`; `live`). `POST /api/reconcile` backfills the
full desired state once enabled.

```jsonc
POST /provision               // provisioning/backend (:8030) — Issa's domain
{
  "type":   "enrol",          // or "drop"
  "term":   { "code":"FALL2026", "starts_at":"2026-07-01", "ends_at":"2026-12-20" },
  "role":   "student",        // teacher → team owner
  "person": { "sis_id":"S1001", "first":"Sara", "last":"Ali", "email":"sara@9xai.edu" },
  "course": { "sis_id":"CRS-CS101", "code":"CS101", "title":"Intro to CS" }
}
→ 200 { "ok": true, "entra_user_id": "…", "group_id": "…", "result": "added" }
→ 502 on a Graph failure, so the SIS outbox retries
```
One **Teams team = M365 group = Outlook group** per `(course, term)`, keyed in a
local `team_map` (idempotent — never matched by display name). Graph calls
(client-credentials token → resolve user → create team with `OWNER_UPN` →
add/remove member) are implemented against Issa's permission set (`Team.Create`,
`TeamMember.ReadWrite.All`, `Group.ReadWrite.All`, `User.Read.All`). **POC
limit** (by that permission set): users are *resolved*, not created — SIS people
must map to pre-created UPNs. Flip `PROVISION_MODE=live` after adding the tenant
creds to `provisioning/backend/.env`.

> The **WhoCan enrol** and the **MS provision** are two independent side-effects of the *same* SIS event. Either may succeed while the other retries — both are **idempotent**; a single in-process drain lock stops the worker and a manual drain from double-firing.

## 10. POC scope

| In | Out |
|---|---|
| SIS → WhoCan one-way for users + courses + enrolments | Grade passback (§8) |
| `sis` enrol method + ENR-013 guard | Per-field profile sync |
| Reconcile (pull) + event push | Multi-term concurrency edge cases |
| Account-active login gate | A *real* SIS — the portal **is** the stand-in SIS |
| `sis_id` matching | |

## 11. Open decisions (need a call)

1. **Course teams (Issa):** one persistent course group, or one per `(course, term)`? Affects churn + the MS side.
2. **"Current term" when windows overlap** (summer + fall registration open together): which term gates login?
3. ~~**Manual override on SIS courses**~~ **RESOLVED (as built):** the `sis` path itself is protected exactly like cohort — manual **unenrol → 409** (ENR-013/sis, server + UI lock), manual **suspend allowed** as the break-glass freeze (reconcile reactivates). Other methods may coexist on the course; SIS-created courses start with only the `sis` method, and `MethodCreate` deliberately excludes `sis` so a portal door can't be hand-made.
4. **Teacher assignment source:** SIS-driven (portal: course → instructor) or WhoCan-local? *Recommendation: SIS.*

---

*This contract governs data ownership only. It does not change WhoCan's internal permission model — the `can(user, action, course)` engine still decides who may see/do what once data is in place.*
