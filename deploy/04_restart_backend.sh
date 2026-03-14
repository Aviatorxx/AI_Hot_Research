#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/AI_Hot_Research"
LOG_FILE="/tmp/uvicorn.log"
PORT="8000"

cd "$APP_DIR"

echo "[Step 4] Stop existing process on port $PORT (if any)..."
fuser -k "$PORT"/tcp || true
sleep 2

echo "[Step 4] Start uvicorn in background..."
nohup venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port "$PORT" > "$LOG_FILE" 2>&1 &
sleep 2

echo "[Step 4] Done."
