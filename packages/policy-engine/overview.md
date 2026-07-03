# Policy Engine

RBAC evaluation logic for the Ogpic platform. It encapsulates the rules that
decide whether a principal may perform an action, supporting the deny-by-default
authorization model enforced across the runtime.

## Responsibilities
- Evaluate role-based access control decisions.
- Provide a reusable, deterministic authorization primitive for callers.
- Keep policy logic separate from transport and storage concerns.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
