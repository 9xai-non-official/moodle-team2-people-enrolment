"""Database access — asyncpg pool over the team's Supabase Postgres.

Task 03 bootstrap: the schema + seed already live in the Supabase project
(see /schema.sql and /seed.sql at repo root). DATABASE_URL comes from
backend/.env (gitignored) — copy backend/.env.example and fill in the
password from TEAM_CREDENTIALS.md.

Use the session pooler (port 5432). The transaction pooler (6543) breaks
asyncpg's prepared statements, so caching is disabled ONLY on that port; on
the session pooler / a direct connection we keep the prepared-statement cache
on. Over a high-latency link (the DB is in ap-northeast-1) that matters: with
caching off, every query pays a separate PREPARE round-trip, ~doubling
per-query latency. We also keep the pool warm (min = max) so a request reuses
an established connection instead of paying ~2s to cold-connect per acquire.
"""
import json
import os
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import asyncpg
from dotenv import load_dotenv

load_dotenv()

_pool: asyncpg.Pool | None = None

# Supabase transaction pooler port — prepared statements are unsafe there.
_TX_POOLER_PORT = 6543


async def connect() -> None:
    global _pool
    url = os.environ.get("DATABASE_URL")
    if not url:
        return  # run without a DB; endpoints answer 503 with a clear reason
    on_tx_pooler = urlparse(url).port == _TX_POOLER_PORT
    # 0 disables caching (required on the tx pooler); 100 is asyncpg's default.
    statement_cache_size = 0 if on_tx_pooler else 100
    # Supabase's session pooler caps TOTAL clients (shared across the team) at
    # ~15, so stay a good citizen: keep a couple of connections warm for latency
    # but leave plenty of headroom for teammates + other instances.
    _pool = await asyncpg.create_pool(
        url,
        min_size=2,          # keep a couple warm — avoids ~2s cold connects
        max_size=6,          # headroom for a read + a write without hogging the pooler
        statement_cache_size=statement_cache_size,
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


async def fetch_val(query: str, *args):
    async with pool().acquire() as conn:
        return await conn.fetchval(query, *args)


async def execute(query: str, *args) -> str:
    async with pool().acquire() as conn:
        return await conn.execute(query, *args)


@asynccontextmanager
async def transaction():
    """Run several statements atomically.

    The PostgREST layer this replaced had no transactions at all: a multi-step
    write could half-apply. Anything that writes more than one row should use
    this.

        async with db.transaction() as conn:
            await conn.execute(...)
            await conn.execute(...)
    """
    async with pool().acquire() as conn:
        async with conn.transaction():
            yield conn


async def audit(
    event: str,
    *,
    actor_id: int | None = None,
    affected_id: int | None = None,
    course_id: int | None = None,
    context_id: int | None = None,
    detail: dict | None = None,
    conn=None,
) -> None:
    """Append one row to audit_log (M10 / D-AUDIT).

    Shared so every domain writes the same shape — the table is currently
    written by zero code, and the fastest way to get four inconsistent shapes
    is four separate inserts.

    Pass `conn` from inside a transaction so the audit row commits or rolls
    back with the change it describes; omit it for a standalone write.

    audit_log deliberately has no foreign keys (schema.sql:389), so rows
    outlive hard deletes of whatever they reference. Never add FKs here.
    """
    sql = (
        "insert into audit_log (event, actor_id, affected_id, course_id, context_id, detail) "
        "values ($1, $2, $3, $4, $5, $6::jsonb)"
    )
    args = (event, actor_id, affected_id, course_id, context_id,
            json.dumps(detail or {}))
    if conn is not None:
        await conn.execute(sql, *args)
    else:
        await execute(sql, *args)
