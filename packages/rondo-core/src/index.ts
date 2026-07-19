/*
 * @saas/rondo-core — the platform-agnostic heart of Rondo.
 *
 * Everything here is pure TypeScript + React (hooks only, zero DOM): domain
 * types, the roster/draft/rating logic, pitch-formation math, live-data
 * derivation, and the `useRondo` view-model hook. It carries no dependency on
 * the browser DOM, Next.js, or React Native — so a web shell (Next.js) and a
 * future native shell (Expo/React Native) can both consume this same core and
 * only differ in their rendering layer.
 */
export * from "./logic";
export * from "./formation";
export * from "./live";
export * from "./use-rondo";
export * from "./wizard";
export * from "./demo-seed";
