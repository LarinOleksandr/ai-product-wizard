#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Dev Status =="

echo ""
echo "-- Docker containers (ai) --"
cd "$REPO_ROOT/infra/docker"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | sed -n '1p;/ai-embeddings-dev\|ai-orchestrator-dev/p' || true

echo ""
echo "-- Ollama --"
if curl -sS http://localhost:11434/api/tags >/dev/null; then
  echo "OK: Ollama responds on :11434"
else
  echo "FAIL: Ollama not responding on :11434"
fi

echo ""
echo "-- Embeddings --"
if curl -sS http://localhost:8001/health >/dev/null; then
  echo "OK: embeddings responds on :8001"
else
  echo "FAIL: embeddings not responding on :8001"
fi

echo ""
echo "-- Orchestrator --"
if curl -sS http://localhost:8002 >/dev/null; then
  echo "OK: orchestrator responds on :8002"
else
  echo "FAIL: orchestrator not responding on :8002"
fi

echo ""
echo "-- Supabase gateway --"
if curl -sS http://127.0.0.1:54321 >/dev/null; then
  echo "OK: Supabase gateway responds on :54321"
else
  echo "FAIL: Supabase gateway not responding on :54321 (run: cd supabase && supabase start)"
fi

echo ""
echo "Note: Edge Functions only respond when you run 'supabase functions serve <name> ...' in a terminal."
