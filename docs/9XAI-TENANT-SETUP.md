# 9xai Entra Tenant — Setup Runbook

Goal: a Microsoft tenant with **real Teams + Outlook licenses** and an **app
registration** the provisioning service can use. Feeds
`provisioning/backend/.env` (`TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`,
`OWNER_UPN`).

> **Do NOT create the tenant from Azure portal → Manage tenants → "Create a
> tenant".** That makes a *bare* Entra directory: it now requires a paid
> license to create, and it has no Teams/Exchange. Use a **Microsoft 365
> trial** instead — the trial provisions the tenant *and* the licenses.

## Step 1 — Create the tenant via a Microsoft 365 trial

1. Go to **microsoft.com/microsoft-365** → a plan with Teams + Exchange
   (**Business Standard** is cheapest and enough; **E5** if you want
   everything) → **"Try free"** (1-month trial).
2. Enter a setup email. It **creates a brand-new tenant** — pick the org name
   **9xai** → domain **`9xai.onmicrosoft.com`** (or `9xaiedu`/`9xai-uni` if
   taken).
3. Create the **admin account** (e.g. `admin@9xai.onmicrosoft.com`) + password.
   *This* is your tenant admin, separate from the personal email you signed up
   with.
4. Verify by phone. It may ask for a **credit card** for the trial — it will
   **not charge** during the 30 days (cancel before it ends, or buy a few
   licenses).

*Fallback if the trial is blocked:* buy **Microsoft 365 Business Basic**
(~a few $/user/month, includes Teams + Exchange) for 3–5 users and cancel
after the demo.

## Step 2 — Licensed users (the owner + the test people)

In **admin.microsoft.com → Users → Active users**:

1. Make sure **one user has a license assigned** — its UPN is **`OWNER_UPN`**
   (app-only team creation requires ≥1 real licensed owner).
2. Create the **test people the SIS will map to**, each **licensed**, e.g.:
   - `sara@9xai.onmicrosoft.com`
   - `tala@9xai.onmicrosoft.com`
   - `omar@9xai.onmicrosoft.com`

> **⚠️ The one integration detail that connects both sides:** the SIS person's
> `email` must equal the Entra **UPN** (or the user's `mail`). Our seed uses
> `@9xai.edu`; unless you add `9xai.edu` as a verified custom domain, set the
> SIS emails to the **`@9xai.onmicrosoft.com`** UPNs (edit `sis/backend`
> `/api/seed`, or POST real people via `/api/people`). `graph.resolve_user`
> matches on UPN first, then `mail`.

## Step 3 — App registration (the service identity)

**entra.microsoft.com → Applications → App registrations → New registration**:

1. Name `9xai-provisioning`; **Single tenant**; Register.
2. On the overview, copy **Application (client) ID → `CLIENT_ID`** and
   **Directory (tenant) ID → `TENANT_ID`**.
3. **Certificates & secrets → New client secret** → copy the **Value** (shown
   once) → **`CLIENT_SECRET`**.

## Step 4 — Application permissions + admin consent

**API permissions → Add a permission → Microsoft Graph → Application
permissions**, add exactly:

- `Team.Create`
- `TeamMember.ReadWrite.All`
- `Group.ReadWrite.All`
- `User.Read.All`

Then **"Grant admin consent for 9xai"** → **Yes** (you're Global Admin as the
tenant creator). All four should read **Granted**.

> These match what's implemented. They **resolve** users, not create them —
> that's why the test people are pre-created in Step 2. Creating + licensing
> users from the pipeline would additionally need `User.ReadWrite.All` +
> license assignment (phase 2).

## Step 5 — Wire it to the provisioning service

`provisioning/backend/.env` (copy from `.env.example`; **secret lives here
only — never in git or chat**):

```
TENANT_ID=<Directory (tenant) ID>
CLIENT_ID=<Application (client) ID>
CLIENT_SECRET=<the secret VALUE>
OWNER_UPN=owner@9xai.onmicrosoft.com
PROVISION_MODE=live
```

Restart `provisioning-api` (:8030). Then:

```bash
curl -s localhost:8030/health     # credentials_present: true, mode: live
```

## Step 6 — Prove it end to end

```bash
# make sure SIS people's emails = the tenant UPNs first (Step 2 warning)
curl -X POST localhost:8020/api/reconcile      # backfill everyone into both queues
# the SIS worker drains within ~3s; or force it:
curl -X POST localhost:8020/api/outbox/drain
curl -s localhost:8030/teams                   # a real Teams team per (course, term)
curl -s localhost:8030/log                      # status: ok (not "would")
```

Then open **Teams** as one of the test users → the class team is there, teacher
as owner, students as members; the M365 group's shared inbox is the Outlook
side.

## What I can and can't do here

Creating the tenant, the admin account, entering the password, clicking
**Grant admin consent**, and adding the card are **yours** — I can't create
accounts, sign in, or accept terms for you. Hand me the four values (secret via
the `.env`, not chat) and everything downstream is already built and waiting.
