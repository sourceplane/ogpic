import { resolveSecret, redact } from "./resolve.js";

// DEMO ONLY. Prints the OGPIC_ORUN_SMOKE *smoke* value so the write→consume
// path is visible in the CI verify lane. This is a throwaway, non-sensitive
// value: the cloud-free lane has no orun-cloud injection, so we seed the
// documented ORUN_SECRET_<KEY> local fallback with a generated demo value and
// resolve it through the real component resolver. A REAL orun-cloud secret
// would be injected under the KEY and REDACTED from logs by the runner — never
// print a real secret value.
describe("print the smoke secret (CI demo)", () => {
  const ref = "secret://sourceplane/ogpic/dev/OGPIC_ORUN_SMOKE";

  it("resolves and prints OGPIC_ORUN_SMOKE for this lane", () => {
    const env: Record<string, string | undefined> = {
      ...process.env,
      ORUN_SECRET_OGPIC_ORUN_SMOKE:
        process.env.ORUN_SECRET_OGPIC_ORUN_SMOKE ??
        `ogpic-orun-smoke-ci-demo-${process.pid}`,
    };

    const value = resolveSecret(ref, { env });
    // eslint-disable-next-line no-console
    console.log(`OGPIC_ORUN_SMOKE (raw)      = ${value}`);
    // eslint-disable-next-line no-console
    console.log(`OGPIC_ORUN_SMOKE (redacted) = ${redact(value)}`);
    expect(value.length).toBeGreaterThan(0);
  });
});
