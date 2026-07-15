// Live orun-cloud secrets inspector for the saas-orun-secrets migration.
//
// Part A — runtime injection proof: when secrets are injected at run time
// (`orun run`, via component secretEnv), print a NON-REVERSIBLE fingerprint
// (length + sha256 prefix) for each, and for a Supabase token run a live
// connection test (HTTP + account id). A raw secret value is NEVER printed —
// the orun runner also redacts injected values from logs by design.
//
// Part B — inventory (needs ORUN_TOKEN): display every secret across the
// workspace/project/environments (names + metadata only), and for brokered
// secrets report connection health + external account via the orun API.
//
// No-op-friendly: each part is independently guarded, so it never breaks a
// cloud-free CI verify lane.

import { createHash } from "node:crypto";

const fp = (v) =>
  `len=${v.length} sha256=${createHash("sha256").update(v).digest("hex").slice(0, 16)}`;

// ---- Part A: runtime-injected secrets -------------------------------------
const injected = [
  ["OGPIC_ORUN_SMOKE", process.env.OGPIC_ORUN_SMOKE],
  ["SUPABASE_ACCESS_TOKEN", process.env.SUPABASE_ACCESS_TOKEN],
  ["SUPABASE_ACCESS_TOKEN_PROD", process.env.SUPABASE_ACCESS_TOKEN_PROD],
].filter(([, v]) => typeof v === "string" && v.length > 0);

console.log("== runtime-injected secrets (fingerprints — never raw) ==");
if (injected.length === 0) {
  console.log("  (none injected in this lane — run under `orun run` with secretEnv)");
}
for (const [name, v] of injected) {
  console.log(`  ${name}: injected ${fp(v)}`);
}

const sbToken =
  process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN_PROD;
if (sbToken) {
  try {
    const r = await fetch("https://api.supabase.com/v1/organizations", {
      headers: { Authorization: `Bearer ${sbToken}` },
    });
    const orgs = await r.json().catch(() => null);
    console.log(`  Supabase Management API GET /v1/organizations -> HTTP ${r.status}`);
    if (Array.isArray(orgs)) {
      console.log(
        `    account(s): ${JSON.stringify(orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug })))}`,
      );
    }
  } catch (e) {
    console.log(`  Supabase connection test error: ${e.message}`);
  }
}

// ---- Part B: full inventory + brokered connection health ------------------
const token = process.env.ORUN_TOKEN;
const base = (
  process.env.ORUN_BACKEND_URL || "https://api-edge-prod.oruncloud.workers.dev"
).replace(/\/$/, "");
const ws = process.env.ORUN_WORKSPACE || process.env.ORUN_ORG;
const project = process.env.ORUN_PROJECT;

if (!token || !ws) {
  console.log(
    "\n[inspect] ORUN_TOKEN/ORUN_WORKSPACE not set — skipping full secret inventory.",
  );
  process.exit(0);
}

async function api(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}
const secretsOf = (b) => b?.data?.secrets ?? [];

function show(title, secrets) {
  console.log(`\n== ${title} (${secrets.length}) ==`);
  for (const s of secrets) {
    const src =
      s.source === "brokered"
        ? `brokered:${s.binding?.provider}/${s.binding?.template}`
        : "stored";
    console.log(`  ${s.secretKey}  [${s.scopeKind}]  v${s.version}  ${s.status}  ${src}`);
  }
  return secrets;
}

const all = [];
all.push(...show("workspace", secretsOf((await api(`/v1/organizations/${ws}/config/secrets`)).body)));
if (project) {
  all.push(
    ...show(
      `project ${project}`,
      secretsOf((await api(`/v1/organizations/${ws}/projects/${project}/config/secrets`)).body),
    ),
  );
  const envs =
    (await api(`/v1/organizations/${ws}/projects/${project}/environments`)).body?.data
      ?.environments ?? [];
  for (const e of envs) {
    all.push(
      ...show(
        `env ${e.slug}`,
        secretsOf(
          (
            await api(
              `/v1/organizations/${ws}/projects/${project}/environments/${e.id}/config/secrets`,
            )
          ).body,
        ),
      ),
    );
  }
}

const brokered = all.filter((s) => s.source === "brokered" && s.binding?.connectionId);
console.log(`\n== brokered secrets — connection test + account ==`);
const seen = new Map();
for (const s of brokered) {
  const cid = s.binding.connectionId;
  if (!seen.has(cid)) {
    const { status, body } = await api(`/v1/organizations/${ws}/integrations/${cid}`);
    seen.set(cid, { status, c: body?.data?.connection });
  }
  const { status, c } = seen.get(cid);
  if (status === 200 && c) {
    const ok = c.status === "active" ? "OK (active)" : `NOT-OK (${c.status})`;
    console.log(
      `  ${s.secretKey} → ${cid}: provider=${c.provider} connection=${ok} ` +
        `account=${c.externalAccountLogin} (${c.externalAccountType}) connectedAt=${c.connectedAt}`,
    );
  } else {
    console.log(`  ${s.secretKey} → ${cid}: connection fetch HTTP ${status}`);
  }
}
