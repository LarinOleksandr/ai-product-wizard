# Repository Rules

This document defines non-negotiable rules for working in the repository.
Rules are prioritized. Hard rules must never be violated.

## Rule Priorities
- Must: hard constraint. Do not violate.
- Should: strong preference. Deviations require justification.
- May: optional guidance.

## Service Boundaries (Must)
- One runtime boundary per service folder.
- Services deploy and scale independently.
- No direct imports between services.
- Shared code must live in shared/.

## Shared Contracts (Must)
- Core entity types live in shared/types.
- Do not redefine core entities locally.
- When a core entity changes, update shared/types first.

## Validation Reuse (Should)
- Prefer shared/validation for reusable schemas.
- Local validation is allowed only for strictly local concerns.

## Configuration (Must)
- Configuration is layered by environment.
- Global defaults live in config/runtime/.
- Service-specific config lives next to the service.
- No environment-specific values hardcoded in code.

## Secrets (Must)
- Never commit secrets.
- Only .env.example templates are allowed.
- Real secrets are injected via environment variables or secret managers.

## Scripts over Commands (Must)
- Recurring workflows must be exposed via scripts.
- Prefer scripts/ or package.json scripts.
- Do not document raw shell commands as the primary workflow.

## Data Discipline (Must)
- Do not store large datasets or binaries in the repo.
- Generated artifacts do not belong in source control.
- Only minimal sample data is allowed for tests.

## Dev Entry Point (Must)
- scripts/dev-all.sh must start the full local stack.
- When adding or removing core services, update it accordingly.

## Docker Compose (Should)
- Use a single docker-compose definition with profiles.
- Avoid multiple competing compose files.

## Documentation (Should)
- Important folders should contain a short README.
- New major folders require a README explaining purpose and usage.

## File Modification Rules (Must)
- Review existing files before modifying.
- Change the minimal number of lines required.
- Do not rewrite files unless refactoring is explicit and approved.

## Conflict Handling
- If a request conflicts with a Must rule, explain the conflict.
- Do not silently bypass rules.
