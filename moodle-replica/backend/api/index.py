"""Vercel entrypoint — serves the whole FastAPI app as one Python function.

vercel.json rewrites every path here; Vercel's ASGI bridge hands FastAPI the
original request path, so the existing /api/... routes work unchanged.
Config comes from Vercel env vars (DATABASE_URL, SUPABASE_URL,
SUPABASE_SERVICE_KEY) — set with `vercel env add`, no .env in the bundle.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app  # noqa: E402,F401  (Vercel looks for `app`)
