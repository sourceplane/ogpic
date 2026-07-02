# Contracts

Shared TypeScript API, tenancy, event, and error types with validators for the
Ogpic platform. It is the single source of truth for the shapes exchanged across
the control plane, so every worker, the edge API, the SDK, and the CLI agree on
the same contracts.

## Responsibilities
- Define request/response types for the platform API surface.
- Model tenancy primitives (workspace, membership) used across bounded contexts.
- Describe event and error types shared between producers and consumers.
- Provide runtime validators for those types.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
