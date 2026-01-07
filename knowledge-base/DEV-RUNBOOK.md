# Dev runbook (local, Windows host + Docker)

## What runs in this system

- Windows host:
  - Ollama http://localhost:11434 (llama3.2)
- Docker Compose services:
  - embeddings http://localhost:8001/health
  - orchestrator http://localhost:8002 (uses host Ollama via `host.docker.internal`)
  - Flowise http://localhost:3001
- Supabase local stack (DB + gateway) http://127.0.0.1:54321
- Edge Functions (served on demand) http://127.0.0.1:54321/functions/v1/<fn>
- Frontend (Vite) http://localhost:5173

## One-time setup (in case of repo clone or reset)

- supabase/.env (copy from supabase/.env.example and fill values)
- frontend/web/.env.local (copy from frontend/web/.env.local.example and fill values)

(WSL only) Make scripts executable:
chmod +x scripts/dev-up.sh
chmod +x scripts/dev-down.sh
chmod +x scripts/dev-status.sh
chmod +x scripts/dev-langgraph-studio.sh

Windows: Ollama must listen on all interfaces so Docker can reach it.
Set this once (user-level, persistent):
PowerShell:
[Environment]::SetEnvironmentVariable("OLLAMA_HOST","http://0.0.0.0:11434","User")

Optional (for GPU on Windows): prefer CUDA v12 backend if available:
[Environment]::SetEnvironmentVariable("OLLAMA_LLM_LIBRARY","cuda_v12","User")
Add CUDA v12 folder to user PATH if needed:
[Environment]::SetEnvironmentVariable("PATH", "C:\\Users\\oleks\\AppData\\Local\\Programs\\Ollama\\lib\\ollama\\cuda_v12;$env:PATH", "User")

Windows: auto-start Ollama (background, no window)
Use Task Scheduler (Create Task...):

- General: Name "Ollama Serve", Run only when user is logged on, Hidden.
- Triggers: At log on (your user).
- Actions: Program `C:\\Users\\oleks\\AppData\\Local\\Programs\\Ollama\\ollama.exe`, Arguments `serve`, Start in `C:\\Users\\oleks\\AppData\\Local\\Programs\\Ollama`.
- Conditions: uncheck "Start the task only if the computer is on AC power".
- Settings: Allow task to be run on demand; If task is already running, do not start a new instance.

## Start development (daily)

1. Start Ollama on Windows (background service on reboot).
2. Start Docker Desktop (currently - background service on reboot).

### In PowerShell

Run (only what you need):

- Start frontend with one of two commands:
  pnpm dev
  pnpm --filter web dev

- If Docker services are not running:
  docker compose -f infra\docker\docker-compose.dev.yml up -d
- If dependencies changed or after fresh clone:
  pnpm install

#### Restart Orchestrator

docker compose -f infra\docker\docker-compose.dev.yml up -d --build orchestrator

Notes:

- Ollama runs on Windows (not in Docker) and must bind to `http://0.0.0.0:11434` for Docker access.
- Ensure `llama3.2` is pulled: `ollama pull llama3.2`
- Frontend URL: http://localhost:5173
- Avoid running the frontend in WSL if you install dependencies in PowerShell (Rollup native module mismatch).

Then open separate terminals for the parts you actively edit:

A) Serve Edge Functions (run only what you edit)
cd supabase
supabase functions serve infra-healthcheck --env-file .env

# or:

supabase functions serve projects-api --env-file .env
supabase functions serve agents-trigger --env-file .env
supabase functions serve json-validate --env-file .env
supabase functions serve file-export --env-file .env

B) Run LangGraph Studio (separate terminal)
npx langgraphjs dev

## Health checks (quick)

./scripts/dev-status.sh

Manual checks:
curl http://localhost:11434/api/tags
curl http://localhost:8001/health
curl http://localhost:8002
curl http://localhost:3001
curl http://127.0.0.1:54321/functions/v1/infra-healthcheck

Docker can reach Ollama (from orchestrator container):
docker exec ai-orchestrator-dev node -e "fetch('http://host.docker.internal:11434/api/tags').then(r=>r.text()).then(t=>console.log(t.slice(0,200))).catch(e=>{console.error(e);process.exit(1);})"

## Database access (cloud)

Use Docker to run `psql` without installing it locally:

- One-off:
  docker run --rm -it postgres:16 psql "$DATABASE_URL"

- Or via npm script:
  pnpm db:psql

`DATABASE_URL` should point at the Supabase project (Settings → Database → Connection string).
PowerShell example:

```
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.<project-ref>.supabase.co:5432/postgres"
```

## Stop everything

./scripts/dev-down.sh
