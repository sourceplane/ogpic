import { resolveSecret, redact } from "./resolve.js";
import { parseSecretRef, isSecretRef } from "./secret-ref.js";

const REF = "secret://sourceplane/ogpic/dev/OGPIC_ORUN_SMOKE";

describe("secret-ref parsing (SEC0)", () => {
  it("parses a well-formed reference", () => {
    expect(parseSecretRef(REF)).toEqual({
      workspace: "sourceplane",
      project: "ogpic",
      env: "dev",
      key: "OGPIC_ORUN_SMOKE",
    });
  });

  it("parses an optional @version suffix", () => {
    expect(parseSecretRef(`${REF}@7`).version).toBe("7");
  });

  it("rejects malformed references", () => {
    expect(() => parseSecretRef("OGPIC_ORUN_SMOKE")).toThrow(
      /invalid secret reference/,
    );
    expect(() => parseSecretRef("secret://sourceplane/ogpic/dev")).toThrow();
    expect(isSecretRef("not-a-ref")).toBe(false);
    expect(isSecretRef(REF)).toBe(true);
  });
});

describe("runtime consume contract (SEC3 precedence)", () => {
  it("reads the value orun injects under the secret KEY", () => {
    expect(resolveSecret(REF, { env: { OGPIC_ORUN_SMOKE: "smoke-ok" } })).toBe(
      "smoke-ok",
    );
  });

  it("falls back to ORUN_SECRET_<KEY> when nothing is injected (verify/local lane)", () => {
    expect(
      resolveSecret(REF, { env: { ORUN_SECRET_OGPIC_ORUN_SMOKE: "local-ok" } }),
    ).toBe("local-ok");
  });

  it("prefers the injected value over the local fallback", () => {
    expect(
      resolveSecret(REF, {
        env: {
          OGPIC_ORUN_SMOKE: "injected",
          ORUN_SECRET_OGPIC_ORUN_SMOKE: "local",
        },
      }),
    ).toBe("injected");
  });

  it("fails closed when neither source is present", () => {
    expect(() => resolveSecret(REF, { env: {} })).toThrow(/not resolved/);
  });

  it("treats an empty injected value as absent and fails closed", () => {
    expect(() => resolveSecret(REF, { env: { OGPIC_ORUN_SMOKE: "" } })).toThrow(
      /not resolved/,
    );
  });
});

describe("per-environment resolution (separate value per env)", () => {
  // Each environment holds its OWN value for the same key; the consumer must
  // resolve whichever value the runner injected for the env it runs in.
  const perEnv: Record<string, string> = {
    dev: "ogpic-orun-smoke-dev-x",
    stage: "ogpic-orun-smoke-stage-x",
    prod: "ogpic-orun-smoke-prod-x",
  };

  it("resolves each env's injected value independently", () => {
    for (const [env, value] of Object.entries(perEnv)) {
      const ref = `secret://sourceplane/ogpic/${env}/OGPIC_ORUN_SMOKE`;
      expect(parseSecretRef(ref).env).toBe(env);
      expect(resolveSecret(ref, { env: { OGPIC_ORUN_SMOKE: value } })).toBe(
        value,
      );
    }
  });

  it("keeps env values distinct — dev, stage, and prod never collide", () => {
    const resolved = Object.entries(perEnv).map(([env, value]) =>
      resolveSecret(`secret://sourceplane/ogpic/${env}/OGPIC_ORUN_SMOKE`, {
        env: { OGPIC_ORUN_SMOKE: value },
      }),
    );
    expect(new Set(resolved).size).toBe(3);
  });
});

describe("redaction discipline", () => {
  it("masks all but the last four characters", () => {
    expect(redact("supersecretvalue")).toBe("************alue");
  });

  it("never emits the raw value for a non-trivial secret", () => {
    const value = "polar_live_abcdefghijklmnop";
    expect(redact(value)).not.toContain(value);
  });

  it("fully masks short values", () => {
    expect(redact("abc")).toBe("***");
  });
});
