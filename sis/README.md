# 9xai SIS — Student Information System

The **registration source of truth**. Owns people, courses, terms, and
registrations; delivers enrolment events to **WhoCan** (the LMS) through a
transactional outbox. Teachers use the same pipeline as students — students
`register` themselves (bottom-up), the registrar `assign`s teachers
(top-down); only the role differs.

Ownership & sync rules: [`docs/SIS-WHOCAN-SYNC-CONTRACT.md`](../docs/SIS-WHOCAN-SYNC-CONTRACT.md) (v1.1 — implemented).

## Architecture

```
register/assign/drop ──▶ registration upsert ──▶ outbox (pending)
                                                    │
                              background worker (3s) │  POST /api/sis/events
                              or POST /api/outbox/drain ──▶ WhoCan
                                                    │
POST /api/reconcile ──▶ full desired state ─────────┘   (idempotent receiver:
  enrols + drops + account gate                          find → adopt → create)
```

- **Transactional outbox** — the registration and its outbound event are
  written together; WhoCan being down loses nothing (retry with backoff,
  parked as `failed` after 8 attempts).
- **Reconcile** — replays the whole current term any time; the receiver is
  idempotent so replays converge. Includes the **account gate**: no active
  registration this term → the person's WhoCan account is suspended
  ("didn't register → can't log in").
- **Term windows** — events carry the term's dates; WhoCan stamps them on
  each enrolment, so term rollover is WhoCan's existing expiry machinery.

## Run

```bash
cd sis/backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # WHOCAN_SYNC_MODE=dry — touches nothing
uvicorn main:app --reload --port 8020
```

Open **http://localhost:8020/docs**.

## Sync modes (`WHOCAN_SYNC_MODE`)

| Mode | Effect |
|---|---|
| `dry` *(default)* | outbox drains to `sent` with a would-send audit line; **no HTTP** |
| `live` | events POST to WhoCan `/api/sis/events` as `WHOCAN_SERVICE_USER` |
| `off` | outbox drains to `skipped` |

Live against the **local Docker WhoCan** (`postgres:17` container
`moodle-t2-pg`, see the repo docs): set `WHOCAN_SYNC_MODE=live` and
`WHOCAN_SERVICE_USER=1` (admin1 — the site-admin service identity).

## Demo (60 seconds)

```bash
curl -X POST localhost:8020/api/seed
curl -X POST localhost:8020/api/register -H 'content-type: application/json' \
  -d '{"person_sis_id":"S1001","course_sis_id":"CRS-CS101"}'      # student
curl -X POST localhost:8020/api/assign -H 'content-type: application/json' \
  -d '{"person_sis_id":"T2001","course_sis_id":"CRS-CS101"}'      # teacher
curl -X POST localhost:8020/api/outbox/drain                      # deliver now
curl -X POST localhost:8020/api/reconcile && curl -X POST localhost:8020/api/outbox/drain
```

Then open WhoCan → Enrolment → the CS101 with methods `SIS · Portal`.

## Tests & E2E

```bash
cd sis/backend && .venv/bin/python -m pytest tests/ -q     # 11 hermetic tests
../backend/.venv/bin/python ../scripts/e2e.py              # 13 live assertions
```

`tests/` is hermetic (temp SQLite, no network, worker off). `scripts/e2e.py`
drives the two REAL services and asserts the whole contract: roster, roles,
the ENR-013/sis 409 guard, drop convergence, and the account gate.

## What's here / what's next

- ✅ People, courses, terms, registrations (SQLite, isolated)
- ✅ Outbox + retry worker + drain + reconcile + account gate
- ✅ WhoCan receiver: `/api/sis/events` + `sis` method + guard + UI badge/lock
- ✅ Hermetic suite (11) + live E2E (13)
- ⬜ Microsoft provisioning (`/provision`, Issa) — the outbox already has a
  `provision` target reserved; wiring it is enqueue + a second deliver fn
- ⬜ Portal UI (register/drop screens) — the API is demo-complete via /docs
- ⬜ SSO (OIDC via the 9xai Entra tenant) — Phase 2
