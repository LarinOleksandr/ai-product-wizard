#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Dev Status =="

echo ""
echo "-- Docker containers (ai) --"
cd "$REPO_ROOT/infra/docker"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | sed -n '1p;/ai-embeddings-dev\|ai-orchestrator-dev\|flowise/p' || true

echo ""
echo "-- Ollama --"
OLLAMA_URL="${OLLAMA_URL:-}"
if [ -z "$OLLAMA_URL" ]; then
  WSL_HOST_IP=""
  if [ -f /etc/resolv.conf ]; then
    WSL_HOST_IP="$(awk '/nameserver/ {print $2; exit}' /etc/resolv.conf)"
  fi
  if [ -n "$WSL_HOST_IP" ] && printf '%s' "$WSL_HOST_IP" | grep -Eq '^(1\.1\.1\.1|8\.8\.8\.8|9\.9\.9\.9)$'; then
    WSL_HOST_IP="$(ip route 2>/dev/null | awk '/default/ {print $3; exit}')"
  fi
  for candidate in \
    http://localhost:11434 \
    http://127.0.0.1:11434 \
    http://host.docker.internal:11434 \
    ${WSL_HOST_IP:+http://$WSL_HOST_IP:11434}; do
    if curl -sS --connect-timeout 1 --max-time 2 "$candidate/api/tags" >/dev/null 2>&1; then
      OLLAMA_URL="$candidate"
      break
    fi
  done
fi
if [ -n "$OLLAMA_URL" ] && curl -sS --connect-timeout 1 --max-time 2 "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
  echo "OK: Ollama responds on ${OLLAMA_URL#http://}"
  if [ -n "$WSL_HOST_IP" ] && [ "$OLLAMA_URL" = "http://$WSL_HOST_IP:11434" ]; then
    echo "Note: Detected WSL host IP ${WSL_HOST_IP}"
  fi
else
  echo "FAIL: Ollama not responding (tried localhost/127.0.0.1/host.docker.internal${WSL_HOST_IP:+/$WSL_HOST_IP})"
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
