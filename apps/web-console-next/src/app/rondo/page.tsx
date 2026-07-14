/*
 * /rondo — the Rondo entry gate (Feature 1). Signed out → the Rondo-branded
 * sign-in / sign-up (Google + email). Signed in → route to the caller's squad
 * (/rondo/:orgSlug); to team creation when they have none (Feature 2). The
 * token-free preview is at /rondo/demo.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../styles/rondo-kit.css";
import { RondoLogin } from "@/components/rondo/rondo-login";
import { TeamSelectScreen } from "@/components/rondo/team-select";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { wrap } from "@/lib/api";

export default function RondoEntryPage() {
  const router = useRouter();
  const { token, client } = useSession();
  const [ready, setReady] = React.useState(false);

  // Avoid a flash of the login while the stored token hydrates.
  React.useEffect(() => setReady(true), []);

  const orgs = useApiQuery(
    qk.orgs(),
    () => wrap(async () => (await client.organizations.list()).organizations),
    { enabled: !!token },
  );

  const teams = orgs.data ?? [];

  React.useEffect(() => {
    if (!token || !orgs.data) return;
    // No squads → onboarding. Exactly one → open it. Two or more → let the
    // member pick (the team-selection screen renders below).
    if (orgs.data.length === 0) router.replace("/rondo/start");
    else if (orgs.data.length === 1) router.replace(`/rondo/${orgs.data[0]!.slug}`);
  }, [token, orgs.data, router]);

  if (!ready) return <RondoBoot />;
  if (!token) return <RondoLogin />;
  // Signed in with several squads: the initial team selection (design 2a).
  if (orgs.data && teams.length > 1) {
    return (
      <TeamSelectScreen
        teams={teams.map((o) => ({ slug: o.slug, name: o.name }))}
        onOpen={(slug) => router.replace(`/rondo/${slug}`)}
        onCreate={() => router.push("/rondo/new")}
        onJoin={() => router.push("/rondo/join")}
      />
    );
  }
  return <RondoBoot label="Finding your squad…" />;
}

function RondoBoot({ label = "" }: { label?: string }) {
  return (
    <div className="rk" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#F2F4F1" }}>
      <div style={{ width: 56, height: 56, borderRadius: 17, background: "#101511", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#F2F4F1" }}>R</div>
      {label && <div style={{ fontFamily: "var(--font-jbmono), ui-monospace, monospace", fontSize: 12, color: "rgba(16,21,17,.5)", letterSpacing: ".5px" }}>{label}</div>}
    </div>
  );
}
