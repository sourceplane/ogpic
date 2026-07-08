import { resolveSecret, redact } from "./resolve.js";

// DEMO ONLY. Prints the OGPIC_ORUN_SMOKE *smoke* value in the CI verify lane so
// the write→consume path is visible end to end. This is a throwaway,
// non-sensitive test value supplied via the ORUN_SECRET_<KEY> local-fallback
// (see component.yaml preBuildCommand) — the path the runner uses when no
// backend is reachable. A REAL orun-cloud secret would be injected and REDACTED
// from logs by the runner; never print a real secret value.
describe("print the smoke secret (CI demo)", () => {
  const ref = "secret://sourceplane/ogpic/dev/OGPIC_ORUN_SMOKE";

  it("resolves and prints OGPIC_ORUN_SMOKE for this lane", () => {
    const injected =
      process.env.OGPIC_ORUN_SMOKE ?? process.env.ORUN_SECRET_OGPIC_ORUN_SMOKE;

    if (injected === undefined || injected === "") {
      // eslint-disable-next-line no-console
      console.log("OGPIC_ORUN_SMOKE = (not injected in this lane)");
      return;
    }

    const value = resolveSecret(ref, { env: process.env });
    // eslint-disable-next-line no-console
    console.log(`OGPIC_ORUN_SMOKE (raw)      = ${value}`);
    // eslint-disable-next-line no-console
    console.log(`OGPIC_ORUN_SMOKE (redacted) = ${redact(value)}`);
    expect(value).toBe(injected);
  });
});
