# CLI

First-class TypeScript CLI (`ogpic`) for the Ogpic control plane API. It gives
operators and developers a command-line interface to interact with the platform.

## Responsibilities
- Provide the `ogpic` command-line entry point.
- Wrap control plane API operations in scriptable commands.
- Reuse the shared SDK and contracts for consistent behavior.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
