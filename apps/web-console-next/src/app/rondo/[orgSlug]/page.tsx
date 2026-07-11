/*
 * /rondo/:orgSlug — the authenticated, live Rondo experience for a squad (RX2/RX4).
 * Standalone (outside the console shell) so the app is full-screen; resolves the
 * org by slug, loads its real roster + availability + fixtures, and wires the live
 * backend actions (set availability, run the server draft) into RondoApp. Voting /
 * live-scoring / community stay local until their slices land.
 */
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import "../../../styles/rondo.css";
import { RondoApp } from "@/components/rondo/rondo-app";
import { buildLiveSeed, availabilityMap, matchRows } from "@/components/rondo/live";
import type { RondoLive } from "@/components/rondo/use-rondo";
import type { Availability } from "@/components/rondo/logic";
import { useRequireAuth } from "@/lib/use-async";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { wrap } from "@/lib/api";

export default function ConnectedRondoPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  const ready = useRequireAuth();
  const { client } = useSession();
  const qc = useQueryClient();

  const orgs = useApiQuery(
    qk.orgs(),
    () => wrap(async () => (await client.organizations.list()).organizations),
    { enabled: ready },
  );
  const org = orgs.data?.find((o) => o.slug === slug);
  const orgId = org?.id;

  const roster = useApiQuery(
    orgId ? qk.roster(orgId) : ["roster", "pending"],
    () => wrap(async () => (await client.roster.list(orgId!)).players),
    { enabled: !!orgId },
  );
  const availability = useApiQuery(
    orgId ? ["availability", orgId] : ["availability", "pending"],
    () => wrap(async () => (await client.availability.list(orgId!)).availability),
    { enabled: !!orgId },
  );
  const fixtures = useApiQuery(
    orgId ? qk.fixtures(orgId) : ["fixtures", "pending"],
    () => wrap(async () => (await client.fixtures.list(orgId!)).matches),
    { enabled: !!orgId },
  );

  // Live backend handlers — memoised so RondoApp's hook keeps a stable reference.
  const live = React.useMemo<RondoLive>(() => {
    if (!orgId) return {};
    return {
      setAvailability: (playerId: string, state: Availability) => {
        void wrap(() => client.availability.set(orgId, playerId, { state })).then(() =>
          qc.invalidateQueries({ queryKey: ["availability", orgId] }),
        );
      },
      draft: async (playerIds: string[]) => {
        const res = await wrap(() => client.draft.run(orgId, { playerIds, teamCount: 2 }));
        if (!res.ok || res.data.teams.length < 2) return null;
        const [home, away] = res.data.teams;
        return {
          homeIds: home!.players.map((p) => p.id),
          awayIds: away!.players.map((p) => p.id),
        };
      },
      setCaptain: (playerId: string) => {
        void wrap(() => client.roster.setCaptain(orgId, playerId)).then(() =>
          qc.invalidateQueries({ queryKey: qk.roster(orgId) }),
        );
      },
      releasePlayer: (playerId: string) => {
        void wrap(() => client.roster.release(orgId, playerId)).then(() =>
          qc.invalidateQueries({ queryKey: qk.roster(orgId) }),
        );
      },
    };
  }, [orgId, client, qc]);

  const loading =
    !ready ||
    orgs.loading ||
    (orgId != null && (roster.loading || availability.loading || fixtures.loading));

  if (loading) return <RondoBoot label="Loading your squad…" />;
  if (!org || !orgId) return <RondoBoot label={`No squad found for “${slug}”.`} />;

  const seed = buildLiveSeed({
    orgName: org.name,
    players: roster.data ?? [],
    isManager: true, // refined when the RBAC role is surfaced on membership (RX7)
    availability: availabilityMap(availability.data ?? []),
    matches: matchRows(fixtures.data ?? []),
    live,
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
