# SDK

Runtime-agnostic TypeScript SDK for the Ogpic control plane API. It gives client
code a typed, ergonomic way to call the public edge API without depending on a
specific JavaScript runtime.

## Responsibilities
- Expose typed methods for the control plane API surface.
- Remain runtime-agnostic so it works across Node, browsers, and Workers.
- Reuse the shared contracts for request and response shapes.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
