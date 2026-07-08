import { parseSecretRef } from "./secret-ref.js";

export interface ResolveOptions {
  /** The environment orun injects resolved secret values into. */
  env?: Record<string, string | undefined>;
}

/**
 * Resolve a `secret://` reference the way a component consumes it at runtime.
 *
 * Precedence mirrors the orun runner (specs/orun-secrets, SEC3):
 *   1. the value orun injects under the secret's KEY as an env var — the
 *      highest-precedence layer during `orun run`;
 *   2. the explicit `ORUN_SECRET_<KEY>` local-development override — the
 *      only source when no backend is reachable (verify / local lanes);
 * and it FAILS CLOSED if neither is present, so a consumer never silently
 * observes an empty secret. An empty string is treated as absent.
 */
export function resolveSecret(ref: string, opts: ResolveOptions = {}): string {
  const { key } = parseSecretRef(ref);
  const env = opts.env ?? {};
  const injected = env[key];
  if (injected !== undefined && injected !== "") return injected;
  const local = env[`ORUN_SECRET_${key}`];
  if (local !== undefined && local !== "") return local;
  throw new Error(
    `secret ${key} not resolved: no injected value and no ORUN_SECRET_${key} fallback present`,
  );
}

/**
 * Mask a secret value for safe logging — keep at most the last four
 * characters, star the rest. Never print a raw secret value.
 */
export function redact(value: string): string {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}
