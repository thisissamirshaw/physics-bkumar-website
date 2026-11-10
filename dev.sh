#!/usr/bin/env bash
# Start the API (port 8000) and the React dev server (port 5173) together.
# Open http://localhost:5173 for the site and http://localhost:5173/admin for admin.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
if [ ! -d frontend/node_modules ]; then
  (cd frontend && npm install --no-audit --no-fund)
fi

(cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT

cd frontend && npm run dev
