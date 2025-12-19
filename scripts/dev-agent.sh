#!/usr/bin/env bash
set -euo pipefail

export ORCHESTRATOR_PORT=${ORCHESTRATOR_PORT:-8010}
export VITE_ORCHESTRATOR_URL=${VITE_ORCHESTRATOR_URL:-http://127.0.0.1:$ORCHESTRATOR_PORT}

pnpm concurrently \
  "cd ai/orchestrator && ORCHESTRATOR_PORT=$ORCHESTRATOR_PORT npm start" \
  "cd frontend/web && VITE_ORCHESTRATOR_URL=$VITE_ORCHESTRATOR_URL npm run dev"
