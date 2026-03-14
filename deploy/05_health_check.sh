#!/usr/bin/env bash
set -euo pipefail

PORT="8000"
LOG_FILE="/tmp/uvicorn.log"

echo "[Step 5] Check listening port..."
if command -v ss >/dev/null 2>&1; then
  ss -lntp | grep ":$PORT" || true
else
  netstat -lntp 2>/dev/null | grep ":$PORT" || true
fi

echo
echo "[Step 5] Last 80 lines of app log..."
tail -n 80 "$LOG_FILE" || true

echo
echo "[Step 5] Done."
