#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Dev Up =="
echo "Repo: $REPO_ROOT"

# 0) Ensure Docker is reachable
echo "Checking Docker..."
docker version >/dev/null

# 1) Start AI containers
echo "Starting AI containers (embeddings + orchestrator + flowise)..."
cd "$REPO_ROOT/infra/docker"
docker compose -f docker-compose.dev.yml up -d

# 2) Start Supabase local stack (DB + gateway)
echo "Starting Supabase local stack..."
cd "$REPO_ROOT/supabase"
supabase start

echo ""
echo "== NEXT (run in separate terminals) =="
echo "0) Ensure Ollama is running on Windows:"
echo "   ollama serve"
echo "1) Serve functions you are editing:"
echo "   cd supabase && supabase functions serve infra-healthcheck --env-file .env"
echo "   cd supabase && supabase functions serve projects-api --env-file .env"
echo "   cd supabase && supabase functions serve agents-trigger --env-file .env"
echo "   cd supabase && supabase functions serve json-validate --env-file .env"
echo "   cd supabase && supabase functions serve file-export --env-file .env"
echo ""
echo "2) Start frontend:"
echo "   cd frontend/web && pnpm run dev"
echo ""
echo "Run status checks:"
echo "   ./scripts/dev-status.sh"
