# Team 2 — Build Task Assignments (the app on `staging`)

One file per person. Each file is self-contained: mission, exact tables (own/read/take), exact backend & frontend files on the `staging` branch's `moodle-replica/`, API contracts, hard-case demos, forbidden actions, definition of done — and a ready-to-paste **system prompt** (all except Issa's files, per Yaman's instruction).

**Division of labour: 4 backend domain owners + 1 frontend owner.**

| File | Owner | Domain | System prompt |
|---|---|---|---|
| [01-yaman-enrolment.md](01-yaman-enrolment.md) | Yaman | **Backend:** enrolment methods, user enrolments, cohorts, roster, lifecycle | ✅ |
| [02-mahdi-progress.md](02-mahdi-progress.md) | Mahdi | **Backend:** activity & course completion, percentages, overrides, snapshots (Hard Case 5), Team 3 event intake | ✅ |
| [03-issa-database.md](03-issa-database.md) | Issa | **One-time bootstrap:** the PostgreSQL/Supabase database (24 tables, 10 enums), db layer, seeds, Team 1 sync — done first, then frozen | — (by design) |
| [04-khaled-roles.md](04-khaled-roles.md) | Khaled | **Backend:** roles, capabilities, contexts, overrides, the `can(...) → allowed + why` engine (the centrepiece) | ✅ |
| [05-mahmoud-groups.md](05-mahmoud-groups.md) | Mahmoud | **Backend:** groups, groupings, group modes, the scope service (Hard Cases 3 & 4) | ✅ |
| [06-issa-frontend.md](06-issa-frontend.md) | Issa | **Frontend — all of it:** shell, acting-user context, all five pages, all components, API layer | — (by design) |

Each domain file's "Frontend spec" section is the requirement Issa implements; the domain owner reviews his page against it.

## Ground rules (binding for everyone)

1. **Branching:** everything targets `staging`. Each person works on `feat/<name>-<domain>` and PRs into `staging`. Nobody pushes to `staging` directly.
2. **Merge order:** Issa's database bootstrap (03) first → Issa's frontend shell (06 §3) early → backend domains in any order; pages land as their APIs land.
3. **The backend/frontend wall is absolute.** Issa owns every file under `frontend/`; after his bootstrap PR he touches nothing under `backend/`. The four backend owners never touch `frontend/`. UI needs data → extend the API; API needs a screen → file it to Issa.
4. **File ownership within the backend is absolute.** Each file has exactly one owner (listed inside each task file). `main.py` accepts exactly two lines each from Khaled and Mahdi; `schemas.py` and `db.py` are frozen after Issa's bootstrap; each backend owner has their own `schemas_<domain>.py`, `services/<domain>.py`, `routers/<domain>.py`, `tests/test_<domain>.py`.
5. **Table ownership is absolute.** The read/write matrix lives in Issa's file 03 §7. Cross-domain writes happen **only through the owner's service functions** (`services/enrolment.py`, `permissions.py`, `groups.py`, `progress.py`).
6. **All service signatures and API response contracts marked "frozen"** in the task files are contracts — announce before changing any of them; Issa's UI and Teams 1/3 build against them.
7. **English everywhere** in code, comments, API fields, and commit messages.
8. **Faithful-to-Moodle rules stay faithful** (documented in each file with their MASTER-REFERENCE section). Deliberate deviations are only the ones already agreed: D-1 (always record provenance), D-2 (unique constraint on role_assignment), inline reaggregation instead of cron, the snapshots table.
9. **Business logic lives in the backend only** — the UI renders verdicts and reasons verbatim, never recomputes them.
10. **Source of truth for any domain argument:** `TEAM2-MASTER-REFERENCE.md` → then file:line in Moodle source → then a live test. In that order.
