// Live orun-cloud secrets inspector for the saas-orun-secrets migration.
//
// Part A — runtime injection proof: when secrets are injected at run time
// (`orun run`, via component secretEnv), report PRESENCE ONLY for each (no
// value, no length, no hash — even a fingerprint is a partial disclosure in a
// CI log), and for a Supabase token run a live connection test (HTTP + account
// id). A raw secret value is NEVER printed — the orun runner also redacts
// injected values from logs by design.
//
// Part B — inventory (needs ORUN_TOKEN): display every secret across the
// workspace/project/environments (names + metadata only), and for brokered
// secrets report connection health + external account via the orun API.
//
// No-op-friendly: each part is independently guarded, so it never breaks a
// cloud-free CI verify lane.

// All network calls are hard-bounded so a slow/blocked egress can never hang
// the CI build step.
const TIMEOUT_MS = 8000;
const fetchT = (url, opts = {}) =>
  fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT_MS) });

// ---- Part A: runtime-injected secrets -------------------------------------
const injected = [
  ["OGPIC_ORUN_SMOKE", process.env.OGPIC_ORUN_SMOKE],
  ["CLOUDFLARE_TEST_KEY", process.env.CLOUDFLARE_TEST_KEY],
  ["SUPABASE_KEY_TEST", process.env.SUPABASE_KEY_TEST],
].filter(([, v]) => typeof v === "string" && v.length > 0);

console.log("== runtime-injected secrets (presence only — never value or fingerprint) ==");
if (injected.length === 0) {
  console.log("  (none injected in this lane — run under `orun run` with secretEnv)");
}
for (const [name] of injected) {
  // Presence only. Do NOT log length or any hash of the value: for a bounded /
  // low-entropy secret even a sha256 prefix + length is a partial disclosure in
  // a CI log. Scope verification below uses provider-side metadata, not the
  // token's shape.
  console.log(`  ${name}: injected (present)`);
}

// ---- Part A2: Cloudflare — verify the brokered token + its SCOPE -----------
// CLOUDFLARE_TEST_KEY is an ORG-scoped BROKERED secret (cloudflare/workers-
// deploy). Prove (a) the minted token is valid, (b) it CAN act within its
// template's scope (list Workers scripts), and (c) it CANNOT act outside it
// (zones read is denied) — the scope boundary, demonstrated positively and
// negatively. Metadata only — the raw token is never printed.
const cfToken = process.env.CLOUDFLARE_TEST_KEY;
if (cfToken) {
  console.log("\n== Cloudflare API via CLOUDFLARE_TEST_KEY (brokered mint, workers-deploy) ==");
  const cf = (path) =>
    fetchT(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${cfToken}` },
    });
  try {
    const vRes = await cf("/user/tokens/verify");
    const v = await vRes.json().catch(() => null);
    console.log(`  GET /user/tokens/verify -> HTTP ${vRes.status}`);
    if (v?.result) console.log(`    token: id=${v.result.id} status=${v.result.status}`);

    // Account id: prefer the token's own view; fall back to the CI-provided id.
    let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
    const aRes = await cf("/accounts");
    const a = await aRes.json().catch(() => null);
    console.log(`  GET /accounts -> HTTP ${aRes.status}`);
    if (Array.isArray(a?.result) && a.result.length > 0) {
      accountId = a.result[0].id;
      console.log(`    account: id=${accountId} name=${JSON.stringify(a.result[0].name)}`);
    } else if (accountId) {
      console.log(`    (accounts list not in scope — using CLOUDFLARE_ACCOUNT_ID from CI env)`);
    }

    if (accountId) {
      // POSITIVE scope proof: workers-deploy must be able to see Workers scripts.
      const wRes = await cf(`/accounts/${accountId}/workers/scripts`);
      const w = await wRes.json().catch(() => null);
      const names = Array.isArray(w?.result) ? w.result.map((s) => s.id) : null;
      console.log(
        `  GET /accounts/{id}/workers/scripts -> HTTP ${wRes.status} ` +
          (names ? `(${names.length} script(s)${names.length ? `: ${names.slice(0, 5).join(", ")}${names.length > 5 ? ", …" : ""}` : ""})` : ""),
      );
      console.log(`    scope check (positive): workers read ${wRes.status === 200 ? "ALLOWED — in template scope ✓" : "denied — unexpected for workers-deploy"}`);
    } else {
      console.log("  (no account id available — skipping the workers-scripts scope proof)");
    }

    // NEGATIVE scope proof: a workers-deploy token must NOT read DNS zones.
    const zRes = await cf("/zones");
    console.log(`  GET /zones -> HTTP ${zRes.status}`);
    console.log(
      `    scope check (negative): zones read ${zRes.status === 403 ? "DENIED — token is bounded to its template ✓" : zRes.status === 200 ? "ALLOWED — token is BROADER than workers-deploy ✗" : `HTTP ${zRes.status}`}`,
    );
  } catch (e) {
    console.log(`  Cloudflare scope test error: ${e.message}`);
  }
}

// ---- Part A3: Supabase — verify the brokered token + its SCOPE ------------
// SUPABASE_KEY_TEST is an ORG-scoped BROKERED secret (supabase/management-
// access). Prove the minted token is valid and bounded to its org by listing
// the organization(s) and project(s) it governs via the Management API —
// metadata only (id / name / region / status), never the token, never a
// connection string.
const sbToken = process.env.SUPABASE_KEY_TEST;
if (sbToken) {
  console.log("\n== Supabase Management API via SUPABASE_KEY_TEST (brokered mint, management-access) ==");
  const sb = (path) =>
    fetchT(`https://api.supabase.com${path}`, {
      headers: { Authorization: `Bearer ${sbToken}` },
    });
  try {
    // POSITIVE scope proof: management-access must enumerate the org + projects.
    const orgRes = await sb("/v1/organizations");
    const orgs = await orgRes.json().catch(() => null);
    console.log(`  GET /v1/organizations -> HTTP ${orgRes.status}`);
    if (Array.isArray(orgs)) {
      for (const o of orgs) console.log(`    org: id=${o.id} name=${JSON.stringify(o.name)}`);
    }
    const prjRes = await sb("/v1/projects");
    const projects = await prjRes.json().catch(() => null);
    console.log(`  GET /v1/projects -> HTTP ${prjRes.status}`);
    if (Array.isArray(projects)) {
      for (const p of projects) {
        console.log(
          `    project: ref=${p.id} name=${JSON.stringify(p.name)} region=${p.region} status=${p.status}`,
        );
      }
    }
    console.log(
      `    scope check (positive): management read ${prjRes.status === 200 ? "ALLOWED — in template scope ✓" : `HTTP ${prjRes.status} — unexpected for management-access`}`,
    );
  } catch (e) {
    console.log(`  Supabase scope test error: ${e.message}`);
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
  const res = await fetchT(`${base}${path}`, {
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
