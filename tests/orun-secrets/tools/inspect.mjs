// Live orun-cloud secrets inspector for the saas-orun-secrets migration.
//
// Displays every secret in the workspace / project / environments (names +
// metadata only — NEVER values), and for `brokered` secrets follows the
// integration connection to report connection health and the external account
// (i.e. tests the connection and pulls the account id) via the orun API — no
// raw provider token is ever fetched or printed.
//
// Requires ORUN_TOKEN (+ ORUN_WORKSPACE, optionally ORUN_PROJECT). It is a
// no-op in cloud-free lanes (no token) so it never breaks CI verify.

const token = process.env.ORUN_TOKEN;
const base = (
  process.env.ORUN_BACKEND_URL || "https://api-edge-prod.oruncloud.workers.dev"
).replace(/\/$/, "");
const ws = process.env.ORUN_WORKSPACE || process.env.ORUN_ORG;
const project = process.env.ORUN_PROJECT;

if (!token || !ws) {
  console.log(
    "[inspect] ORUN_TOKEN/ORUN_WORKSPACE not set — skipping live secret inspection (cloud-free lane).",
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
    console.log(
      `  ${s.secretKey}  [${s.scopeKind}]  v${s.version}  ${s.status}  ${src}`,
    );
  }
  return secrets;
}

const all = [];
all.push(
  ...show("workspace", secretsOf((await api(`/v1/organizations/${ws}/config/secrets`)).body)),
);
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

// Brokered secrets: connection test + account id via the orun connection API.
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

// If a real provider token is injected at runtime (orun run), hit Supabase directly too.
const sbToken =
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env["SUPABASE_ACCESS_TOKEN-PROD"] ||
  process.env.SUPABASE_API;
console.log(`\n== Supabase Management API ==`);
if (sbToken) {
  const r = await fetch("https://api.supabase.com/v1/organizations", {
    headers: { Authorization: `Bearer ${sbToken}` },
  });
  const orgs = await r.json().catch(() => []);
  console.log(`  GET /v1/organizations -> HTTP ${r.status}`);
  if (Array.isArray(orgs)) {
    console.log(`  account(s): ${JSON.stringify(orgs.map((o) => ({ id: o.id, name: o.name })))}`);
  }
} else {
  console.log(
    "  (no Supabase token injected — brokered secrets mint only via `orun run`; " +
      "account shown above is pulled from the orun connection API instead.)",
  );
}
