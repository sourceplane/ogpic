/**
 * Parser for orun secret references of the shape
 * `secret://<workspace>/<project>/<env>/<KEY>[@version]`
 * (specs/orun-secrets, SEC0). The repo, plan, and every object carry only
 * these typed references — never the secret value.
 */
export interface SecretRef {
  workspace: string;
  project: string;
  env: string;
  key: string;
  version?: string;
}

const REF_RE =
  /^secret:\/\/([^/]+)\/([^/]+)\/([^/]+)\/([^/@]+)(?:@([^/]+))?$/;

/** Parse a `secret://` reference, throwing on any malformed input. */
export function parseSecretRef(ref: string): SecretRef {
  const m = REF_RE.exec(ref);
  if (!m) throw new Error(`invalid secret reference: ${ref}`);
  const [, workspace, project, env, key, version] = m;
  if (!workspace || !project || !env || !key) {
    throw new Error(`invalid secret reference: ${ref}`);
  }
  const parsed: SecretRef = { workspace, project, env, key };
  if (version !== undefined) parsed.version = version;
  return parsed;
}

/** True when `value` is a well-formed `secret://` reference. */
export function isSecretRef(value: string): boolean {
  return REF_RE.test(value);
}
