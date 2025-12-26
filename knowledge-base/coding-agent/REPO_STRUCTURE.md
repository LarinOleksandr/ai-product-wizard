# Repository Structure

This document defines the canonical repository layout.
The structure is fixed. New code must fit into existing boundaries.

## Root
- frontend/
- backend/
- ai/
- shared/
- infra/
- supabase/
- config/
- docs/
- knowledge-base/
- scripts/
- tests/

Root-level config files define shared tooling and must remain minimal.

## Frontend
- frontend/web/

Contains the primary web application.
Frontend code is UI-only: no business logic, no direct database access.

## Backend
- backend/api/
- backend/domain/
- backend/validation/
- backend/exports/
- backend/config/

Domain logic lives in backend/domain.
API and transport logic lives in backend/api.
No framework or persistence code in domain.

## AI
- ai/orchestrator/
- ai/embeddings/
- ai/llm-runtime/

Each AI service is an independent runtime boundary.
No cross-imports between AI services.
Shared logic must live in shared/.

## Shared
- shared/types/
- shared/validation/
- shared/config/

Shared code is the only allowed cross-service dependency.
Core entity types must be defined in shared/types.

## Infrastructure
- infra/docker/
- infra/k8s/
- infra/ci/
- infra/netlify/

Infrastructure code defines how services run and deploy.
No business logic here.

## Supabase
- supabase/migrations/
- supabase/functions/
- supabase/seed/

Database schema and edge functions only.
No application logic.

## Config
- config/runtime/
- config/lint/
- config/env/
- config/ci/

Global configuration defaults only.
Service-specific config lives next to the service.

## Docs
- docs/architecture/
- docs/operations/
- docs/product/

Human-readable documentation only.
No executable code.

## Knowledge Base
- knowledge-base/tech-stack/
- knowledge-base/prompts/
- knowledge-base/schemas/

Machine-readable context for AI agents.
Not required for runtime.

## Scripts
- scripts/

All recurring workflows must be executable via scripts.
No undocumented shell commands.

## Tests
- tests/e2e/
- tests/integration/
- tests/contract/

High-level tests spanning multiple services.
Service-local tests live next to code.

## Hard Rules
- One service = one runtime boundary.
- No cross-service imports.
- No duplicated domain logic.
- New folders require explicit justification.
