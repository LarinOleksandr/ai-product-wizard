# Dev runbook (local, WSL Ubuntu)

## What runs in this system
- Ollama (Ubuntu snap service) on http://localhost:11434
- AI services (Docker Compose):
  - embeddings  http://localhost:8001/health
  - orchestrator http://localhost:8002
- Supabase local stack (DB + gateway) on http://127.0.0.1:54321
- Edge Functions (served on demand) on http://127.0.0.1:54321/functions/v1/<fn>
- Frontend (Vite) on http://localhost:5173

## One-time setup
1) Create env files from examples:
- supabase/.env        (copy from supabase/.env.example and fill values)
- frontend/web/.env.local (copy from frontend/web/.env.local.example and fill values)

2) Make scripts executable:
chmod +x scripts/dev-up.sh scripts/dev-down.sh scripts/dev-status.sh

## Start development (daily)
Run:
./scripts/dev-up.sh

Then open separate terminals for the parts you actively edit:

A) Serve Edge Functions (run only what you edit)
cd supabase
supabase functions serve infra-healthcheck --env-file .env
# or:
supabase functions serve projects-api --env-file .env
supabase functions serve agents-trigger --env-file .env
supabase functions serve json-validate --env-file .env
supabase functions serve file-export --env-file .env

B) Start frontend
cd frontend/web
npm run dev

## Health checks (quick)
./scripts/dev-status.sh

Manual checks:
curl http://localhost:11434/api/tags
curl http://localhost:8001/health
curl http://localhost:8002
curl http://127.0.0.1:54321/functions/v1/infra-healthcheck

## Stop everything
./scripts/dev-down.sh
