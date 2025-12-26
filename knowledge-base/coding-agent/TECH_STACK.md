# Tech Stack

This document defines the fixed, allowed technology stack.
Deviations are not permitted unless explicitly approved.

## Frontend
- React 18
- TypeScript (strict mode)
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- TipTap
- React Flow
- Zod

## Backend & Data
- Node.js + TypeScript
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions
- pgvector
- supabase-js
- Row-Level Security (RLS)

## AI & Orchestration
- LangGraph (JavaScript)
- LangChain.js
- Ollama (local LLM runtime)
- FastAPI (Python) for embeddings
- JSON schema–driven generation and validation

## File & Deliverables
- JSON as primary structured format
- Markdown for human-readable documents
- PDF and DOCX exports
- jszip for bundling deliverables

## Infrastructure & DevOps
- GitHub monorepo
- Docker
- Docker Compose
- Linux VM for AI runtime
- Netlify (frontend hosting)
- Supabase hosting (DB, auth, storage)
- GitHub Actions

## Testing & Quality
- Vitest
- Playwright
- Pytest
- ESLint
- Prettier
- TypeScript strict mode

## Monitoring & Analytics
- Sentry
- PostHog
- Supabase logs
- Centralized log aggregation

## Explicitly Forbidden
- Introducing alternative frameworks or databases
- Multiple competing state managers
- Direct database access bypassing Supabase
- Storing large binaries or datasets in the repository
- Runtime secrets committed to Git
