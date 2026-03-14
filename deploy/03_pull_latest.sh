#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/AI_Hot_Research"
MIRROR_URL="https://ghfast.top/https://github.com/Aviatorxx/AI_Hot_Research.git"
OFFICIAL_URL="https://github.com/Aviatorxx/AI_Hot_Research.git"

cd "$APP_DIR"

echo "[Step 3] Set mirror remote and pull latest..."
git remote set-url origin "$MIRROR_URL"
git pull

echo "[Step 3] Restore official remote URL..."
git remote set-url origin "$OFFICIAL_URL"

echo "[Step 3] Done."
