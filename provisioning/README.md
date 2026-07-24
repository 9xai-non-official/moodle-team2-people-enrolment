# 9xai Provisioning — Teams + Outlook via Entra ID

**Owner: Issa.** Scaffolded by Mahmoud's side so the pipeline connects end to
end — the Graph calls are implemented; plug in the tenant credentials and flip
to live.

One **Teams team = one M365 group = one Outlook group inbox** per
`(course, term)`. Teachers → **owners**, students → **members**. Receives the
SIS's own enrol/drop events (contract §9c) from the SIS outbox — same retry
machinery, same idempotency rules as the WhoCan leg.

## Setup (Issa's checklist → .env)

```bash
cd provisioning/backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # then fill:
#   TENANT_ID / CLIENT_ID / CLIENT_SECRET   ← the app registration
#   OWNER_UPN                               ← the real licensed team owner
uvicorn main:app --reload --port 8030
```

**The client secret goes in `.env` only — never in git, never in chat.**

Granted permissions this code uses (all consented): `Team.Create`,
`TeamMember.ReadWrite.All`, `Group.ReadWrite.All`, `User.Read.All`,
`User.ReadWrite.All`, `Organization.Read.All`.

**Users are born from registration** — `graph.ensure_user` finds-or-creates the
Entra user, sets `usageLocation`, and assigns a Business Premium seat, then adds
them to the team. No pre-created UPNs, no hand-made users: registering someone in
the SIS provisions their identity downstream, exactly as a real university does.
(Account *de*-provisioning on drop — the leaver side — is intentionally not done:
a drop removes team membership but keeps the account, mirroring "grades/history
survive". Full lifecycle is a later concern.)

## Wire the SIS to it

In `sis/backend/.env`:

```
PROVISION_URL=http://localhost:8030
PROVISION_MODE=dry     # then live once this service is live
```

Then `POST /api/reconcile` on the SIS backfills every existing registration
into the provision queue (fan-out only starts once the mode isn't `off`).

## Endpoints

| | |
|---|---|
| `POST /provision` | apply one enrol/drop (idempotent; 502 on Graph failure → SIS retries) |
| `GET /health` | mode + credentials present + teams mapped |
| `GET /teams` | the (course, term) → group_id map |
| `GET /log` | audit of every attempt |

## Semantics worth knowing

- **Idempotent by construction**: team lookups go through the local
  `team_map` (never by display name); `add_member` treats "already a member"
  as success; `remove_member` treats "not a member" as success; a drop for an
  unmapped team is a no-op.
- **App-only team creation returns 202** — the team id is parsed from the
  `Location` header and the async operation is polled briefly; a member-add
  racing a half-created team just retries via the outbox.
- **Unknown user in tenant** = success-noop with a logged warning (data
  problem, not a retry storm).
