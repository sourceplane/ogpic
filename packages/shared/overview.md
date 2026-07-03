# Shared

Generic ID and error helper utilities shared across Ogpic packages. It holds
small, domain-agnostic building blocks so that other packages do not reimplement
the same primitives.

## Responsibilities
- Provide ID generation and handling helpers.
- Provide common error helpers and utilities.
- Stay free of domain logic so it is safe to depend on widely.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
