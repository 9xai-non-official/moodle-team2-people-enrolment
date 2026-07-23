#!/usr/bin/env python3
"""Regenerate the root api.yaml from the live FastAPI route definitions.

api.yaml is a required deliverable ("the interface the other teams use"), so it
must never be hand-edited — edit the routers and re-run this:

    python3 scripts/generate-api-yaml.py

Placeholder env vars are set below only so `main` imports; nothing connects to a
database and no credentials are read.
"""

import os
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "moodle-replica" / "backend"
OUT = ROOT / "api.yaml"

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/placeholder")
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "placeholder")

sys.path.insert(0, str(BACKEND))

from main import app  # noqa: E402  (import must follow sys.path/env setup)

spec = app.openapi()

header = (
    "# GENERATED FILE — do not edit by hand.\n"
    "# Regenerate with: python3 scripts/generate-api-yaml.py\n"
    "# Source of truth: moodle-replica/backend/app/routers/*.py\n"
)

OUT.write_text(header + yaml.safe_dump(spec, sort_keys=False, allow_unicode=True))

print(f"wrote {OUT.relative_to(ROOT)} — {len(spec['paths'])} paths, "
      f"{len(spec.get('components', {}).get('schemas', {}))} schemas")
