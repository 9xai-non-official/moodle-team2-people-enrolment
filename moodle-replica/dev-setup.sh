#!/usr/bin/env bash
# dev-setup.sh — one-command local dev setup for the WhoCan (people & enrolment) app.
#
# Run from this directory (repo's moodle-replica/):  ./dev-setup.sh
# Idempotent: safe to re-run — it only creates what's missing.
#
# Why this exists: a fresh `git clone` does NOT contain the things each machine
# needs to run — the Python venv, node_modules, or the gitignored secrets
# (backend/.env with DATABASE_URL, frontend/.env.local). This script recreates
# all of that consistently so every teammate runs the SAME setup instead of a
# hand-rolled one.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
API_PORT="${API_PORT:-8010}"

echo "▶ Backend: venv + dependencies"
cd "$BACKEND"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install --disable-pip-version-check -q -r requirements.txt -r requirements-dev.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ⚠ created backend/.env from .env.example —"
  echo "    put the real DATABASE_URL (from the team secret store) into it before running."
fi

echo "▶ Frontend: dependencies + local env"
cd "$FRONTEND"
npm install --no-fund --no-audit
# IMPORTANT: must be .env.development.local, NOT .env.local. In Vite the
# committed .env.development (VITE_USE_MOCKS=1) OUTRANKS .env.local, so a
# .env.local override is silently ignored and the app runs in MOCK mode (looks
# "not connected to the database"). Only .env.development.local beats it.
if [ ! -f .env.development.local ]; then
  printf 'VITE_USE_MOCKS=0\nVITE_API_URL=http://localhost:%s\n' "$API_PORT" > .env.development.local
  echo "  created frontend/.env.development.local (real backend on :$API_PORT, mocks off)"
fi

cat <<EOF

✅ Setup complete. Run it in two terminals:

  Backend :  cd "$BACKEND"  && .venv/bin/uvicorn main:app --port $API_PORT --host 127.0.0.1
  Frontend:  cd "$FRONTEND" && npm run dev        # opens http://localhost:5173

If the backend logs "database not configured", set DATABASE_URL in backend/.env.
EOF
