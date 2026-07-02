# Policy Worker

The policy-worker is the authorization service for the Ogpic platform. It makes
deny-by-default access decisions that every other bounded-context worker relies
on, and runs as a Cloudflare Worker reachable through service bindings.

## Responsibilities
- Provide the `policy-api` for authorization decisions.
- Serve as the central deny-by-default authorization point for the runtime.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
