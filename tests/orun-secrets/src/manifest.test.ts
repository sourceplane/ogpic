import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSecretRef } from "./secret-ref.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(here, "../orun-secret.manifest.json");

interface SmokeSecret {
  key: string;
  ref: string;
  env: string;
  description: string;
  localFallbackEnv: string;
}
interface Manifest {
  workspace: string;
  project: string;
  consumer: string;
  secrets: SmokeSecret[];
}

const raw = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(raw) as Manifest;

function onlySecret(): SmokeSecret {
  const secret = manifest.secrets[0];
  if (!secret) throw new Error("manifest declares no secret");
  return secret;
}

describe("orun-secrets smoke manifest (OS0)", () => {
  it("declares exactly the smoke reference this component consumes", () => {
    expect(manifest.workspace).toBe("sourceplane");
    expect(manifest.project).toBe("ogpic");
    expect(manifest.consumer).toBe("orun-secrets-tests");
    expect(manifest.secrets).toHaveLength(1);
  });

  it("carries a well-formed secret:// reference scoped to the declared env", () => {
    const secret = onlySecret();
    const parsed = parseSecretRef(secret.ref);
    expect(parsed.workspace).toBe(manifest.workspace);
    expect(parsed.project).toBe(manifest.project);
    expect(parsed.env).toBe(secret.env);
    expect(parsed.key).toBe(secret.key);
  });

  it("names the local fallback as ORUN_SECRET_<KEY>", () => {
    for (const secret of manifest.secrets) {
      expect(secret.localFallbackEnv).toBe(`ORUN_SECRET_${secret.key}`);
    }
  });

  it("commits references only — never a value (the orun-secrets invariant)", () => {
    // No long high-entropy strings that would look like a real secret value.
    expect(raw).not.toMatch(/[A-Za-z0-9+/]{40,}/);
    // No secret entry may carry a `value` field.
    for (const secret of manifest.secrets as unknown as Array<
      Record<string, unknown>
    >) {
      expect(secret.value).toBeUndefined();
    }
  });
});
