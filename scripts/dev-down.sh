#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Dev Down =="

echo "Stopping AI containers..."
cd "$REPO_ROOT/infra/docker"
docker compose -f docker-compose.dev.yml down

echo "Stopping Supabase local stack..."
cd "$REPO_ROOT/supabase"
supabase stop

echo "Done."
