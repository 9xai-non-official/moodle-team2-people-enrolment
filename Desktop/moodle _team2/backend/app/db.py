"""
Supabase (PostgREST) access layer.

Uses the service_role key, so it bypasses RLS — this must ONLY ever run on the
backend. Credentials come from backend/.env (gitignored).
"""
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL / SUPABASE_SERVICE_KEY missing. Create backend/.env "
        "(see .env for the expected keys)."
    )

_REST = f"{SUPABASE_URL}/rest/v1"
_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


def _client() -> httpx.Client:
    return httpx.Client(base_url=_REST, headers=_HEADERS, timeout=15.0)


def select(table: str, params: dict | None = None) -> list[dict]:
    """GET rows from a table/view. `params` are PostgREST query filters."""
    with _client() as c:
        r = c.get(f"/{table}", params=params or {})
        r.raise_for_status()
        return r.json()


def upsert(table: str, rows: list[dict], on_conflict: str | None = None) -> list[dict]:
    """Insert or update rows. Returns the affected rows (Prefer: return=representation)."""
    params = {"on_conflict": on_conflict} if on_conflict else {}
    headers = {"Prefer": "resolution=merge-duplicates,return=representation"}
    with _client() as c:
        r = c.post(f"/{table}", json=rows, params=params, headers=headers)
        r.raise_for_status()
        return r.json()


def update(table: str, values: dict, filters: dict) -> list[dict]:
    """PATCH rows matching `filters`. Returns updated rows."""
    headers = {"Prefer": "return=representation"}
    with _client() as c:
        r = c.patch(f"/{table}", json=values, params=filters, headers=headers)
        r.raise_for_status()
        return r.json()
