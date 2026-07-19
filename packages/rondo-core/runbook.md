# Rondo Core — Runbook

`@saas/rondo-core` is a build-time TypeScript library. It has no runtime
deployment, no network surface, and no operational state — nothing to page on.

## Verify

```sh
pnpm exec turbo run typecheck --filter=@saas/rondo-core
pnpm exec turbo run build --filter=@saas/rondo-core
pnpm exec turbo run lint --filter=@saas/rondo-core
```

## Consumers

- `apps/web-console-next` — imports from `@saas/rondo-core` and lists it in
  `transpilePackages` (Next transpiles the TS source directly).
- Future `apps/mobile` (Expo) — would depend on it the same way.

## Common tasks

- **Add a domain type or logic function**: put it in the matching module
  (`logic.ts`, `formation.ts`, `live.ts`, `use-rondo.ts`) and it is re-exported
  from the package root automatically via `src/index.ts` (`export *`).
- **A change breaks the web build**: the web app's `tsc --noEmit` typecheck is
  the fast signal — run `pnpm exec turbo run typecheck --filter=@saas/web-console-next`.

## Invariant to protect

No DOM / native APIs in this package (`document`, `window`, `localStorage`,
`navigator`, CSS strings, `next/*`). Those belong in the shell. Breaking this
invariant is what would make the eventual React Native port expensive.
