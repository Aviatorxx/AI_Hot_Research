#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/AI_Hot_Research"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_FILE="/tmp/uvicorn.log"
PORT="8000"
NPM_BIN="${NPM_BIN:-npm}"
UVICORN_BIN="${UVICORN_BIN:-venv/bin/uvicorn}"

cd "$APP_DIR"

echo "[Step 4] Build frontend dist from current src..."
cd "$FRONTEND_DIR"

if ! command -v "$NPM_BIN" >/dev/null 2>&1; then
  echo "[Step 4] npm not found"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[Step 4] node_modules missing, running npm install..."
  "$NPM_BIN" install
fi

rm -rf dist
"$NPM_BIN" run build

cd "$APP_DIR"

echo "[Step 4] Stop existing process on port $PORT (if any)..."
fuser -k "$PORT"/tcp || true
sleep 2

echo "[Step 4] Start uvicorn in background..."
nohup "$UVICORN_BIN" backend.main:app --host 0.0.0.0 --port "$PORT" > "$LOG_FILE" 2>&1 &
sleep 2

echo "[Step 4] Done."
