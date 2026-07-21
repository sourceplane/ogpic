// Brokered-key runtime-availability + access probe (saas-orun-secrets).
//
// Answers two questions for the brokered secrets CLOUDFLARE_TEST_KEY
// (cloudflare/workers-deploy) and SUPABASE_KEY_TEST (supabase/management-access)
// using ONLY metadata the platform already exposes (no value is ever fetched,
// minted, or printed):
//
//   1. Runtime availability — will the key resolve at plan/run time? A brokered
//      secret mints its value at resolve time from an integration connection.
//      The config surface stamps a derived `orphaned` / `bindingStatus` onto
//      each brokered row from the connection's LIVE health
//      (brokered-orphan-safety, Feature 1): `orphaned:false` ⇒ available;
//      `orphaned:true` ⇒ the connection can no longer mint, so the key fails
//      closed at run time; unstamped ⇒ health-unknown (lookup unreachable).
//
//   2. What access each key has — the brokered binding: provider + scope
//      template. The template is the grant the connection will mint (e.g.
//      Cloudflare `workers-deploy`, Supabase `management-access`); a short
//      legend maps each to what it authorizes.
//
// It shells the OIDC-authenticated `orun` CLI (same auth the `orun plan` job
// uses) and reads `orun secrets list --json`, whose payload is the platform's
// response verbatim. Best-effort: any failure prints a diagnostic and exits 0
// so the probe never reddens CI.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const TARGET_KEYS = ["CLOUDFLARE_TEST_KEY", "SUPABASE_KEY_TEST"];

// Template → what it authorizes (human legend; the authoritative grant lives in
// the provider adapter's scopeTemplates()).
const TEMPLATE_ACCESS = {
  "workers-deploy": "Cloudflare Workers: upload/deploy scripts, routes, and bindings for the account.",
  "workers-kv": "Cloudflare Workers KV: read/write KV namespaces for the account.",
  "dns-edit": "Cloudflare DNS: edit DNS records for the bound zone(s).",
  "management-access": "Supabase Management API: manage projects/config for the bound organization.",
  "read-only": "Read-only access within the connection's provider scope.",
};

const scopesToTry = [
  ["workspace", ["secrets", "list", "--workspace", "--json"]],
  ["project", ["secrets", "list", "--project", "--json"]],
  ["env dev", ["secrets", "list", "--env", "dev", "--json"]],
  ["env stage", ["secrets", "list", "--env", "stage", "--json"]],
  ["env prod", ["secrets", "list", "--env", "prod", "--json"]],
];

async function listScope(args) {
  try {
    const { stdout } = await run("orun", args, { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    const secrets = parsed?.data?.secrets ?? [];
    return { ok: true, secrets };
  } catch (e) {
    // Non-fatal: the scope may not exist, the key may be elsewhere, or `orun`
    // may not be authenticated in this lane.
    const msg = (e.stderr || e.stdout || e.message || "").toString().trim().split("\n")[0];
    return { ok: false, error: msg };
  }
}

function availability(s) {
  // `orphaned`/`bindingStatus` are the derived projection (Feature 1). Absent ⇒
  // health-unknown (the config surface couldn't reach the connection).
  if (s.orphaned === true) return `UNAVAILABLE — orphaned (connection ${s.bindingStatus ?? "unknown"}); fails closed at run time`;
  if (s.orphaned === false) return `AVAILABLE — connection ${s.bindingStatus ?? "active"}; will mint at run time`;
  return "UNKNOWN — health not stamped (status lookup unreachable); treat as at-risk";
}

function access(s) {
  if (s.source !== "brokered" || !s.binding) return "n/a (not a brokered secret)";
  const { provider, template } = s.binding;
  const legend = TEMPLATE_ACCESS[template] ? ` — ${TEMPLATE_ACCESS[template]}` : "";
  return `${provider} / ${template}${legend}`;
}

console.log("== brokered-key probe: runtime availability + access ==");
console.log(`   targets: ${TARGET_KEYS.join(", ")}`);

// Collect each target key wherever it lives (first scope that carries it wins;
// brokered keys are single-scoped so this is unambiguous in practice).
const found = new Map(); // key -> { scope, secret }
const diagnostics = [];
for (const [label, args] of scopesToTry) {
  const r = await listScope(args);
  if (!r.ok) {
    diagnostics.push(`  [${label}] list failed: ${r.error}`);
    continue;
  }
  for (const s of r.secrets) {
    if (TARGET_KEYS.includes(s.secretKey) && !found.has(s.secretKey)) {
      found.set(s.secretKey, { scope: `${label} (${s.scopeKind})`, secret: s });
    }
  }
}

console.log("");
for (const key of TARGET_KEYS) {
  const hit = found.get(key);
  if (!hit) {
    console.log(`● ${key}`);
    console.log(`    not found in workspace/project/dev/stage/prod scopes (or list not authorized in this lane)`);
    continue;
  }
  const s = hit.secret;
  console.log(`● ${key}   [scope: ${hit.scope}]  status=${s.status}  v${s.version}`);
  console.log(`    runtime availability: ${availability(s)}`);
  console.log(`    access:               ${access(s)}`);
}

if (found.size < TARGET_KEYS.length && diagnostics.length > 0) {
  console.log("\n  diagnostics (why some scopes returned nothing):");
  for (const d of diagnostics) console.log(d);
}

// Best-effort: never redden CI on a probe failure.
process.exit(0);
