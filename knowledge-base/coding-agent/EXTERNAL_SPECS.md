# External Specifications

This document defines authoritative external sources.
All up-to-date technical knowledge must be resolved through Context7.

## Primary Rule
- Use Context7 as the default source for all framework, library, and platform specifications.
- Treat Context7 outputs as authoritative over model training data.
- Do not rely on undocumented, inferred, or deprecated behavior.

## How to Use Context7
- Query Context7 for exact APIs, configs, limits, and examples.
- Prefer official docs surfaced by Context7.
- If Context7 data conflicts with existing code or assumptions, surface the conflict explicitly.

## Fallback Policy
Use direct official documentation only when:
- Context7 does not cover the required topic
- Context7 response is incomplete or ambiguous

In such cases, reference the official source explicitly.

## Approved Domains (via Context7)
- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Router
- Zod
- TipTap
- React Flow
- Node.js
- Supabase
- PostgreSQL
- pgvector
- LangGraph
- LangChain.js
- FastAPI
- Ollama
- Docker
- Docker Compose
- GitHub Actions
- Netlify

## Prohibited Behavior
- Guessing API shapes or defaults
- Using outdated syntax
- Mixing versions without confirmation
- Relying on memory when Context7 is available

## Conflict Handling
- If specifications differ between sources, pause and report.
- Do not silently choose an interpretation.
- Prefer correctness over progress.
