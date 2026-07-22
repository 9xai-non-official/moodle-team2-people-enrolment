#!/usr/bin/env python3
"""Forward-only migration runner for Team 2 — People & Enrolment.

Applies every migrations/*.sql not yet recorded in schema_migrations, in
filename order, each inside its own transaction. Already-applied migrations are
skipped, so re-running is a no-op (required test, work package §20).

migrations/conditional/ is deliberately NOT scanned: those ship only once the
team makes the decision documented in their headers.

Usage:
    python3 migrations/apply.py                     # apply pending
    python3 migrations/apply.py --status            # show state, change nothing
    python3 migrations/apply.py --dry-run           # list what would run
    python3 migrations/apply.py --database-url URL  # override $DATABASE_URL
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from pathlib import Path

import asyncpg

MIGRATIONS_DIR = Path(__file__).resolve().parent
VERSION_RE = re.compile(r"^(M\d+)__")


def discover() -> list[tuple[str, Path]]:
    found = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        m = VERSION_RE.match(path.name)
        if not m:
            print(f"  ! skipping {path.name}: no M<n>__ prefix", file=sys.stderr)
            continue
        found.append((m.group(1), path))
    return found


FIXTURES = MIGRATIONS_DIR.parent / "moodle-replica" / "backend" / "fixtures.sql"


async def apply_fixtures(conn) -> bool:
    """Apply the demo personas, then re-assert the D-SEED corrections.

    Ordering is config -> demo fixtures (work package M09.4). It matters:
    fixtures.sql runs AFTER M09, so if it ever re-granted something M09
    deleted, the correction would be silently undone and the seed would be
    wrong in exactly the way the audit flagged. The check below is what stops
    that regression from going unnoticed.

    fixtures.sql is idempotent and non-destructive by construction (one DO
    block of guarded inserts), so re-running is safe.
    """
    if not FIXTURES.exists():
        print(f"  ! fixtures not found at {FIXTURES}", file=sys.stderr)
        return False
    async with conn.transaction():
        await conn.execute(FIXTURES.read_text())
    print(f"  applied {FIXTURES.name} (demo personas)")

    contradictions = await conn.fetch("""
        select r.short_name, rc.capability
        from role_capability rc
        join role r    on r.id = rc.role_id
        join context c on c.id = rc.context_id
        where c.level = 'system'
          and (   (rc.capability = 'course:view'          and r.short_name <> 'manager')
               or (rc.capability = 'site:accessallgroups'
                   and r.short_name not in ('editingteacher', 'manager', 'teacher-allgroups')))
        order by 1, 2
    """)
    if contradictions:
        print("\n  FIXTURES CONTRADICT M09 (D-SEED) — these grants came back:", file=sys.stderr)
        for r in contradictions:
            print(f"    {r['short_name']}: {r['capability']}", file=sys.stderr)
        return False
    print("  ok — fixtures do not re-grant anything M09 removed")
    return True


async def applied_versions(conn) -> set[str]:
    exists = await conn.fetchval("select to_regclass('public.schema_migrations') is not null")
    if not exists:
        return set()
    return {r["version"] for r in await conn.fetch("select version from schema_migrations")}


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--baseline", default="",
        help="comma-separated versions to RECORD as applied WITHOUT running them, "
             "e.g. --baseline M01,M02. For adopting a database that already has "
             "that state — the deployed Supabase DB already had schema.sql and "
             "seed.sql applied by hand before migrations existed, so replaying "
             "them would error on every `create type`. Only ever use this for "
             "migrations whose effect is verifiably already present.")
    ap.add_argument(
        "--skip", default="",
        help="comma-separated versions to hold back, e.g. --skip M09,M13,M15. "
             "Held migrations are NOT recorded in schema_migrations, so --status "
             "keeps reporting them as PENDING. Use for a staged rollout when a "
             "migration needs its application code deployed alongside it.")
    ap.add_argument(
        "--with-fixtures", action="store_true",
        help="also apply the demo personas from moodle-replica/backend/fixtures.sql, "
             "AFTER all migrations. Needed by test_enrolment.py and the hard-case "
             "scripts, which reference demo rows by id. Never use in production.")
    args = ap.parse_args()

    if not args.database_url:
        print("DATABASE_URL not set and --database-url not given", file=sys.stderr)
        return 2

    migrations = discover()
    conn = await asyncpg.connect(args.database_url, statement_cache_size=0)
    try:
        done = await applied_versions(conn)

        if args.status:
            for version, path in migrations:
                mark = "applied" if version in done else "PENDING"
                print(f"  [{mark:>7}] {path.name}")
            orphans = done - {v for v, _ in migrations}
            for v in sorted(orphans):
                print(f"  [ orphan] {v} recorded but no file present")
            return 0

        baseline = {v.strip() for v in args.baseline.split(",") if v.strip()}
        if baseline and not args.dry_run:
            await conn.execute(
                "create table if not exists schema_migrations ("
                "  version text primary key,"
                "  applied_at timestamptz not null default now())")
            for v in sorted(baseline - done):
                await conn.execute(
                    "insert into schema_migrations(version) values ($1) on conflict do nothing", v)
                print(f"  [BASELINE] {v} — recorded as applied, NOT executed")
            done |= baseline
        elif baseline:
            for v in sorted(baseline - done):
                print(f"  [BASELINE] {v} — would be recorded as applied, not executed")
            done |= baseline

        held = {v.strip() for v in args.skip.split(",") if v.strip()}
        pending = [(v, p) for v, p in migrations if v not in done and v not in held]
        if held:
            for v in sorted(held):
                print(f"  [   HELD] {v} — skipped, stays PENDING in the ledger")
        if not pending:
            print("nothing to do — all migrations applied")
            return 0

        for version, path in pending:
            if args.dry_run:
                print(f"  would apply {path.name}")
                continue
            sql = path.read_text()
            try:
                async with conn.transaction():
                    await conn.execute(sql)
            except Exception as exc:
                print(f"\nFAILED on {path.name}\n  {type(exc).__name__}: {exc}", file=sys.stderr)
                print("  transaction rolled back; database unchanged by this file", file=sys.stderr)
                return 1
            print(f"  applied {path.name}")

        if not args.dry_run:
            total = await conn.fetchval("select count(*) from schema_migrations")
            print(f"\nok — {len(pending)} applied, {total} recorded in schema_migrations")

        if args.with_fixtures and not args.dry_run:
            if await apply_fixtures(conn) is False:
                return 1
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
