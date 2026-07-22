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

        pending = [(v, p) for v, p in migrations if v not in done]
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
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
