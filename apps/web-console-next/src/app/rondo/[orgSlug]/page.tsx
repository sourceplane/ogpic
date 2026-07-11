/*
 * /rondo/:orgSlug — the authenticated, live Rondo experience for a squad (RX2).
 * Standalone (outside the console shell) so the app is full-screen; resolves the
 * org by slug, loads its real roster, and feeds it into the same RondoApp used by
 * the demo. Gated by the session like the rest of the console.
 */
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import "../../../styles/rondo.css";
import { RondoApp } from "@/components/rondo/rondo-app";
import { buildLiveSeed } from "@/components/rondo/live";
import { useRequireAuth } from "@/lib/use-async";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { wrap } from "@/lib/api";

export default function ConnectedRondoPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  const ready = useRequireAuth();
  const { client } = useSession();

  const orgs = useApiQuery(
    qk.orgs(),
    () => wrap(async () => (await client.organizations.list()).organizations),
    { enabled: ready },
  );
  const org = orgs.data?.find((o) => o.slug === slug);

  const roster = useApiQuery(
    org ? qk.roster(org.id) : ["roster", "pending"],
    () => wrap(async () => (await client.roster.list(org!.id)).players),
    { enabled: !!org },
  );

  if (!ready || orgs.loading || (org && roster.loading)) {
    return <RondoBoot label="Loading your squad…" />;
  }
  if (!org) {
    return <RondoBoot label={`No squad found for “${slug}”.`} />;
  }

  const seed = buildLiveSeed({
    orgName: org.name,
    players: roster.data ?? [],
    // Manager affordances follow the caller's role; refined when the RBAC role
    // is surfaced on the org membership (RX7). Default to organizer view.
    isManager: true,
  });

  return <RondoApp seed={seed} />;
}

function RondoBoot({ label }: { label: string }) {
  return (
    <div className="rondo-root" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--r-bg)" }}>
      <div style={{ width: 56, height: 56, borderRadius: 17, background: "linear-gradient(150deg,#1E2228,#101215)", border: "1px solid rgba(86,201,141,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#F4F3F0" }}>R</div>
      <div className="rondo-mono" style={{ fontSize: 12, color: "#8A8D93", letterSpacing: ".5px" }}>{label}</div>
    </div>
  );
}
