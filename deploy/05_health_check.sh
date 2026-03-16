#!/usr/bin/env bash
set -euo pipefail

PORT="8000"
LOG_FILE="/tmp/uvicorn.log"
BASE_URL="${BASE_URL:-http://127.0.0.1:$PORT}"

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
echo "[Step 5] Verify homepage is served from new dist..."
HOME_HTML="$(mktemp)"
cleanup() {
  rm -f "$HOME_HTML"
}
trap cleanup EXIT

if curl -fsS "$BASE_URL/" > "$HOME_HTML"; then
  if grep -q 'data-action="refreshData"' "$HOME_HTML"; then
    echo "PASS: homepage contains delegated runtime markers"
  else
    echo "FAIL: homepage missing delegated runtime marker data-action=\"refreshData\""
    exit 1
  fi

  if grep -q 'onclick=' "$HOME_HTML"; then
    echo "FAIL: homepage still contains inline onclick handlers"
    exit 1
  else
    echo "PASS: homepage no longer contains inline onclick handlers"
  fi
else
  echo "FAIL: unable to fetch $BASE_URL/"
  exit 1
fi

echo
echo "[Step 5] Verify API health..."
if curl -fsS "$BASE_URL/api/topics" >/dev/null; then
  echo "PASS: /api/topics is reachable"
else
  echo "FAIL: /api/topics is not reachable"
  exit 1
fi

echo
echo "[Step 5] Done."
