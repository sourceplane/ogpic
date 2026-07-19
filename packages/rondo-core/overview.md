# Rondo Core — Overview

`@saas/rondo-core` is the platform-agnostic heart of Rondo: domain types, the
roster / draft / rating logic, pitch-formation geometry, live-data derivation,
and the `useRondo` view-model hook. It is pure TypeScript + React hooks with no
dependency on the browser DOM, Next.js, or React Native.

This boundary is what makes a native (React Native / Expo) port cheap: the web
shell (`apps/web-console-next`) and a future native shell would both consume
this package, call `useRondo(...)`, and render the resulting `RondoVM` with
their own platform primitives — sharing 100% of the logic below the render line.

See `README.md` for the module map, the architecture diagram, and the rule that
keeps the boundary clean (no DOM/native APIs in this package).
