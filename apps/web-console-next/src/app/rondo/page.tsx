/*
 * /rondo — the Rondo entry gate (Feature 1). Signed out → the Rondo-branded
 * sign-in / sign-up (Google + email). Signed in → route to the caller's squad
 * (/rondo/:orgSlug); to team creation when they have none (Feature 2). The
 * token-free preview is at /rondo/demo.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import "../../styles/rondo-kit.css";
import { RondoLogin } from "@/components/rondo/rondo-login";
import { Hub5 } from "@/components/rondo/v5/hub5";
import { useSession } from "@/lib/session";
import { qk } from "@/lib/query";
import { wrap } from "@/lib/api";

export default function RondoEntryPage() {
  const router = useRouter();
  const { token, client, setToken } = useSession();
  const qc = useQueryClient();
  const [ready, setReady] = React.useState(false);

  // Avoid a flash of the login while the stored token hydrates.
  React.useEffect(() => setReady(true), []);

  // Raw useQuery (not useApiQuery) so we can read `isFetching`/`isSuccess` and
  // force a fresh fetch on every mount: returning to this page must re-check
  // membership rather than trust a possibly-stale cache. That stale-cache read
  // was what flashed the create/join fork at members who already had a squad.
  const orgsQuery = useQuery({
    queryKey: qk.orgs(),
    queryFn: async () => {
      const r = await wrap(async () => (await client.organizations.list()).organizations);
      if (!r.ok) throw r.error;
      return r.data;
    },
    enabled: !!token,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const teams = orgsQuery.data ?? [];

  // The signed-in account panel for the hub (profile photo, name, email,
  // settings, sign out) — the piece the teams page was missing.
  const profileQuery = useQuery({
    queryKey: ["auth-profile"],
    queryFn: async () => {
      const r = await wrap(async () => (await client.auth.getProfile()).user);
      if (!r.ok) throw r.error;
      return r.data;
    },
    enabled: !!token,
  });

  const onSignOut = React.useCallback(async () => {
    try {
      await client.auth.logout();
    } catch {
      /* session may already be gone */
    }
    setToken(null);
    qc.clear();
    router.replace("/rondo");
  }, [client, setToken, qc, router]);

  React.useEffect(() => {
    if (!token) return;
    // Only decide onboarding from a settled, fresh fetch — never from stale
    // cache mid-revalidation (which caused the create/join flash on return).
    if (orgsQuery.isFetching || !orgsQuery.isSuccess) return;
    if (orgsQuery.data.length === 0) router.replace("/rondo/start");
  }, [token, orgsQuery.isFetching, orgsQuery.isSuccess, orgsQuery.data, router]);

  if (!ready) return <RondoBoot />;
  if (!token) return <RondoLogin />;
  // Signed in with at least one squad: the team selector (design 2a). The v5
  // hub lists every team (even a single one) so members always see and can
  // switch between all their squads — now with their account panel on top.
  if (teams.length >= 1) {
    const email = profileQuery.data?.email ?? null;
    const name = profileQuery.data?.displayName || (email ? email.split("@")[0]! : "You");
    return (
      <div style={{ minHeight: "100dvh", background: "#F5F2E9", maxWidth: 430, margin: "0 auto", position: "relative" }}>
        <Hub5
          teams={teams.map((o) => ({ slug: o.slug, name: o.name, role: o.role }))}
          onOpen={(slug) => router.replace(`/rondo/${slug}`)}
          onCreate={() => router.push("/rondo/new")}
          onJoin={() => router.push("/rondo/join")}
          account={{ name, email, onSignOut }}
        />
      </div>
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
