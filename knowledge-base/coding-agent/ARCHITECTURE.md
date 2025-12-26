# Architecture

This document defines architectural constraints.
It describes where code is allowed to live and how dependencies flow.

## Core Principles
- Separate concerns and keep modules cohesive.
- Favor clarity over cleverness.
- Avoid premature abstractions.
- Keep boundaries explicit and enforced.

## Layers
- Domain
- Application (use cases)
- Interface adapters
- Frameworks and infrastructure

## Dependency Rules
- Dependencies always point inward.
- Domain depends on nothing outside itself.
- Application depends only on domain and abstractions.
- Adapters depend on application and domain.
- Frameworks depend on everything else, never the reverse.

## Domain Rules
- Domain contains business rules and invariants.
- No framework, database, HTTP, or UI dependencies.
- No persistence or transport concerns.
- Entities and value objects must enforce invariants.

## Application Rules
- Application code orchestrates use cases.
- No business rules here.
- Depends on repository and gateway interfaces, not implementations.
- Defines stable input/output contracts.

## Interface Adapters
- Translate between external formats and internal models.
- Contain controllers, DTOs, mappers, repository implementations.
- No business logic.

## Frameworks & Infrastructure
- Treated as replaceable details.
- Confined to outer layers.
- No leakage into domain or application layers.

## Cross-Cutting Concerns
- Logging and observability in adapters or infrastructure only.
- Error translation at boundaries.
- Security enforced at use cases or adapters, not in domain.
- Configuration supplied from outer layers.

## Testing Constraints
- Test business rules at domain level.
- Test scenarios at application level.
- Mock external dependencies.
- Do not mock domain logic.

## Anti-Patterns
- Business logic in controllers or UI.
- Domain coupled to database or frameworks.
- Cross-layer shortcuts.
- Cyclic dependencies.

## Deviation Policy
- Deviations must be explicit, localized, and documented.
- Temporary deviations must be removed or formalized.
