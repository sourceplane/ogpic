# @saas/rondo-core

The **platform-agnostic heart of Rondo** — the code a web shell and a future
native (React Native / Expo) shell both share, so the two only differ in how
they *render*, never in how they *think*.

## What lives here

Pure TypeScript + React **hooks** (zero DOM, zero Next.js, zero native APIs):

| Module | Responsibility |
|---|---|
| `logic.ts` | Domain types (`Player`, `Position`, `Availability`, `TeamMeta`, `Goal`, …) and pure roster/rating math (`balance`, `tierOf`, `skillsFor`, `initials`, seed data). |
| `formation.ts` | Pitch-formation geometry — maps a roster / drafted teams to normalized slot coordinates (`placeRoster`, `placeDraft`). Coordinates are unitless (0–1), so each shell scales them to its own canvas. |
| `live.ts` | Derives view-ready rows from raw `@saas/sdk` / `@saas/contracts` payloads (`buildLiveSeed`, `availabilityMap`, `matchRows`, `computePlayerStats`, …). |
| `use-rondo.ts` | `useRondo(seed)` — the **view model**. Holds all Rondo state + actions and returns a `RondoVM`. Both shells drive their UI from this single object. |
| `demo-seed.ts` | Deterministic demo data (`DEMO_SEED`) for the try-it-out flow. |

Everything is re-exported from the package root:

```ts
import { useRondo, buildLiveSeed, placeRoster, type RondoVM } from "@saas/rondo-core";
```

## The boundary (why this split enables React Native)

```
                    ┌───────────────────────────┐
                    │       @saas/rondo-core      │   ← this package
                    │  types · logic · useRondo   │      (no DOM, no RN)
                    └─────────────┬───────────────┘
                                  │ RondoVM
                 ┌────────────────┴────────────────┐
                 ▼                                  ▼
   ┌───────────────────────────┐      ┌───────────────────────────┐
   │  apps/web-console-next     │      │  apps/mobile (future)      │
   │  Next.js · div/CSS · kit   │      │  Expo · <View>/<Text>      │
   └───────────────────────────┘      └───────────────────────────┘
```

The rule that keeps a native port cheap: **nothing DOM-specific may enter this
package.** No `document`, `window`, `localStorage`, `navigator`, CSS strings, or
`next/*` imports. Those belong in the shell. Data fetching goes through
`@saas/sdk` (a `fetch`-based client that already runs on both platforms).

When the native app is built, it adds `@saas/mobile` as an Expo workspace app,
depends on `@saas/rondo-core`, calls `useRondo(...)`, and renders the `RondoVM`
with React Native primitives — reusing 100% of the logic below the render line.

## Consuming it (web)

The web app lists it in `transpilePackages` (Next transpiles the TS source
directly — there is no build-to-`dist` step in the resolution path) and imports
from `@saas/rondo-core`. See `apps/web-console-next/next.config.mjs`.
