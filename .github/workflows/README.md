# CI / CD

| Workflow | Trigger | What it does |
|---|---|---|
| [`staging-deploy.yml`](staging-deploy.yml) | push to `staging`, any PR, manual | lint + build + hermetic tests; on `staging` also deploys **both** Vercel projects to production and smoke-tests them |
| [`main-source-guard.yml`](main-source-guard.yml) | PR into `main` | rejects PRs into `main` that don't come from `staging` |

## Why we deploy from Actions instead of Vercel's Git integration

Both Vercel projects are connected to this repo, and **both have been failing since
`fd47364`** (22 Jul, 07:36). Every commit after it — including the groups-parity work —
is marked `failure` on GitHub with:

```
https://vercel.com/nomodls?upgradeToPro=github-private-org-to-hobby
```

A **Hobby-plan** Vercel account may not Git-deploy a **private repo owned by a GitHub
organisation**. `whocan-api.vercel.app` has only stayed current because someone has been
running `vercel --prod` by hand.

Deploying from Actions with a token isn't subject to that restriction, so this restores
automatic deploys on the free plan. It also fixes a second thing: the Git integration only
ever built `staging` as a **Preview** ("Preview – whocan"), never production. This workflow
deploys `staging` straight to production, which is what the team actually wants this week.

The alternative is a Vercel Pro plan, after which you could delete this workflow's deploy
jobs and just set **Production Branch = `staging`** in each project's settings.

## Required repository secrets

Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Where it comes from |
|---|---|
| `VERCEL_TOKEN` | vercel.com/account/tokens → *Create Token* (scope: the account owning the projects) |
| `VERCEL_ORG_ID` | see below |
| `VERCEL_PROJECT_ID_API` | the `whocan-api` project |
| `VERCEL_PROJECT_ID_WEB` | the `whocan` project |

With the token in hand, one command prints all three IDs:

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects" | python3 -c 'import json,sys; [print(f"{p[\"name\"]:<12} projectId={p[\"id\"]}  accountId={p[\"accountId\"]}") for p in json.load(sys.stdin)["projects"]]'
```

`accountId` is `VERCEL_ORG_ID` (same for both projects). Match each `projectId` to the right
secret by name.

> If the projects live under a **team**, add `?teamId=<team_id>` to the URL and use the team
> id as `VERCEL_ORG_ID`.

Then run the workflow once from the Actions tab (**Run workflow** → `staging`) to confirm
before relying on it.

## Notes on what CI does and doesn't run

The backend job runs only the **hermetic** suites — `test_permissions`, `test_groups`,
`test_check_integration`, `test_krol` (58 tests, well under a second).

`tests/test_enrolment.py` is deliberately excluded: it runs against the **live team
Supabase database**, creating and deleting real enrolment rows. Running that on every push
would mutate the demo data, and it is currently flaky — different tests fail on different
runs even in isolation.

Two pre-existing test problems, neither caused by this workflow:

1. `tests/test_api_smoke.py::test_expected_routes_registered` fails on FastAPI 0.139
   (`'_IncludedRouter' object has no attribute 'path'` — `app.routes` no longer holds flat
   `APIRoute` objects for included routers).
2. `tests/test_api_smoke.py` calls `os.environ.pop("DATABASE_URL")` **at import time**.
   pytest imports every test module before running any test, so this silently disables the
   database for the whole session: `test_enrolment.py` then fails 9 tests that pass when
   run on their own. Moving that `pop` into a fixture would fix it.
