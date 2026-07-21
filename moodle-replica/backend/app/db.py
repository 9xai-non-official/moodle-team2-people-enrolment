"""Database access — asyncpg pool over the team's Supabase Postgres.

Task 03 bootstrap: the schema + seed already live in the Supabase project
(see /schema.sql and /seed.sql at repo root). DATABASE_URL comes from
backend/.env (gitignored) — copy backend/.env.example and fill in the
password from TEAM_CREDENTIALS.md.

Use the session pooler (port 5432). The transaction pooler (6543) breaks
asyncpg's prepared statements; statement_cache_size=0 is set anyway so
either port works.
"""
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv()

_pool: asyncpg.Pool | None = None


async def connect() -> None:
    global _pool
    url = os.environ.get("DATABASE_URL")
    if not url:
        return  # run without a DB; endpoints answer 503 with a clear reason
    _pool = await asyncpg.create_pool(
        url, min_size=1, max_size=5, statement_cache_size=0
    )


async def disconnect() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def connected() -> bool:
    return _pool is not None


def pool() -> asyncpg.Pool:
    if _pool is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=503,
            detail="database not configured — set DATABASE_URL in backend/.env "
            "(see backend/.env.example and TEAM_CREDENTIALS.md)",
        )
    return _pool


async def fetch_all(query: str, *args) -> list[dict]:
    async with pool().acquire() as conn:
        rows = await conn.fetch(query, *args)
    return [dict(r) for r in rows]


async def fetch_one(query: str, *args) -> dict | None:
    async with pool().acquire() as conn:
        row = await conn.fetchrow(query, *args)
    return dict(row) if row else None
