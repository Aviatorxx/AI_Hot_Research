#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/AI_Hot_Research"
MIRROR_URL="https://ghfast.top/https://github.com/Aviatorxx/AI_Hot_Research.git"
OFFICIAL_URL="https://github.com/Aviatorxx/AI_Hot_Research.git"

cd "$APP_DIR"

restore_remote() {
  git remote set-url origin "$OFFICIAL_URL"
}

trap restore_remote EXIT

echo "[Step 3] Set mirror remote and pull latest..."
git remote set-url origin "$MIRROR_URL"
git pull

echo "[Step 3] Restore official remote URL..."
restore_remote
trap - EXIT

echo "[Step 3] Done."
