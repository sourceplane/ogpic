/*
 * /rondo/:orgSlug — the authenticated, live Rondo experience for a squad (RX2/RX4).
 * Standalone (outside the console shell) so the app is full-screen; resolves the
 * org by slug, loads its real roster + availability + fixtures, and wires the live
 * backend actions (set availability, run the server draft) into RondoApp. Voting /
 * live-scoring / community stay local until their slices land.
 */
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../styles/rondo-kit.css";
import { PitchsideApp } from "@/components/rondo/pitchside-app";
import { buildLiveSeed, availabilityMap, availabilityAtMap, matchRows, joinRequestRows, nextActionableMatch, computePlayerStats } from "@/components/rondo/live";
import type { RondoLive } from "@/components/rondo/use-rondo";
import type { Availability } from "@/components/rondo/logic";
import { useRequireAuth } from "@/lib/use-async";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { wrap } from "@/lib/api";

export default function ConnectedRondoPage() {
  const params = useParams<{ orgSlug: string }>();
  const router = useRouter();
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
  // Manager-only surfaces — viewers get 404, so failures stay silent (no gate).
  const joinCode = useApiQuery(
    orgId ? ["join-code", orgId] : ["join-code", "pending"],
    () => wrap(async () => (await client.memberships.getJoinCode(orgId!)).code),
    { enabled: !!orgId },
  );
  const joinReqs = useApiQuery(
    orgId ? ["join-requests", orgId] : ["join-requests", "pending"],
    () => wrap(async () => (await client.memberships.listJoinRequests(orgId!)).joinRequests),
    { enabled: !!orgId },
  );
  const ratingRound = useApiQuery(
    orgId ? ["rating-round", orgId] : ["rating-round", "pending"],
    () => wrap(async () => (await client.roster.getRatingRound(orgId!)).round),
    { enabled: !!orgId },
  );
  // The caller's own claimed player (self-service availability); null when unclaimed.
  const myPlayer = useApiQuery(
    orgId ? ["my-player", orgId] : ["my-player", "pending"],
    () => wrap(async () => (await client.roster.mine(orgId!)).player),
    { enabled: !!orgId },
  );
  const myPlayerId = myPlayer.data?.id ?? null;
  const nextMatchId = nextActionableMatch(fixtures.data ?? [])?.id ?? null;
  // Pitch-fee ledger for the current match (manager-only; viewers get 404 → empty).
  const paymentsQuery = useApiQuery(
    nextMatchId ? ["payments", orgId, nextMatchId] : ["payments", "pending"],
    () => wrap(async () => (await client.fixtures.listPayments(orgId!, nextMatchId!)).payments),
    { enabled: !!orgId && !!nextMatchId },
  );
  const paymentsMap: Record<string, boolean> = {};
  for (const p of paymentsQuery.data ?? []) paymentsMap[p.playerId] = p.paid;

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
      approveJoin: (requestId: string) => {
        void wrap(() => client.memberships.approveJoinRequest(orgId, requestId)).then(() => {
          void qc.invalidateQueries({ queryKey: ["join-requests", orgId] });
          void qc.invalidateQueries({ queryKey: qk.roster(orgId) });
        });
      },
      declineJoin: (requestId: string) => {
        void wrap(() => client.memberships.declineJoinRequest(orgId, requestId)).then(() =>
          qc.invalidateQueries({ queryKey: ["join-requests", orgId] }),
        );
      },
      castVotes: (playerId: string, votes: Record<string, number>) => {
        void wrap(() => client.roster.castVotes(orgId, playerId, { votes })).then(() =>
          qc.invalidateQueries({ queryKey: qk.roster(orgId) }),
        );
      },
      addPlayer: (input: { name: string; position: string; email?: string | null; phone?: string | null }) => {
        // Attributes omitted → the server seeds a default OVR-60 strength.
        void wrap(() =>
          client.roster.scout(orgId, {
            name: input.name,
            position: input.position as "GK" | "DEF" | "MID" | "FWD" | "ALL",
            ...(input.email ? { email: input.email } : {}),
            ...(input.phone ? { phone: input.phone } : {}),
          }),
        ).then(() => qc.invalidateQueries({ queryKey: qk.roster(orgId) }));
      },
      leaveTeam: () => {
        void wrap(() => client.memberships.leave(orgId)).then((r) => {
          if (!r.ok) return;
          void qc.invalidateQueries({ queryKey: qk.orgs() });
          router.replace("/rondo");
        });
      },
      openRound: (resetScores: boolean) => {
        void wrap(() => client.roster.openRatingRound(orgId, { resetScores })).then(() => {
          void qc.invalidateQueries({ queryKey: ["rating-round", orgId] });
          if (resetScores) void qc.invalidateQueries({ queryKey: qk.roster(orgId) });
        });
      },
      closeRound: () => {
        void wrap(() => client.roster.closeRatingRound(orgId)).then(() =>
          qc.invalidateQueries({ queryKey: ["rating-round", orgId] }),
        );
      },
      rotateCode: () => {
        void wrap(() => client.memberships.rotateJoinCode(orgId)).then(() =>
          qc.invalidateQueries({ queryKey: ["join-code", orgId] }),
        );
      },
      setPlayerScore: (playerId: string, attributes: Record<string, number>) => {
        void wrap(() => client.roster.update(orgId, playerId, { attributes })).then(() =>
          qc.invalidateQueries({ queryKey: qk.roster(orgId) }),
        );
      },
      startMatch: (matchId: string) => {
        void wrap(() => client.fixtures.update(orgId, matchId, { status: "live" })).then(() =>
          qc.invalidateQueries({ queryKey: qk.fixtures(orgId) }),
        );
      },
      saveTeams: (matchId, teamA, teamB) => {
        const toTeam = (t: { name: string; players: { id: string; name: string; position: string; rating: number }[] }) => ({
          name: t.name,
          players: t.players.map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position as "GK" | "DEF" | "MID" | "FWD" | "ALL",
            rating: p.rating,
          })),
        });
        void wrap(() => client.fixtures.update(orgId, matchId, { teamA: toTeam(teamA), teamB: toTeam(teamB) })).then(() =>
          qc.invalidateQueries({ queryKey: qk.fixtures(orgId) }),
        );
      },
      recordResult: (matchId: string, scoreA: number, scoreB: number) => {
        void wrap(() => client.fixtures.update(orgId, matchId, { scoreA, scoreB, status: "played" })).then(() =>
          qc.invalidateQueries({ queryKey: qk.fixtures(orgId) }),
        );
      },
      claimPlayer: async (playerId: string) => {
        const r = await wrap(() => client.roster.claim(orgId, playerId));
        if (r.ok) {
          await qc.invalidateQueries({ queryKey: ["my-player", orgId] });
          await qc.invalidateQueries({ queryKey: qk.roster(orgId) });
        }
        return r.ok;
      },
      setMyAvailability: (state: Availability) => {
        if (!myPlayerId) return;
        void wrap(() => client.availability.set(orgId, myPlayerId, { state })).then(() =>
          qc.invalidateQueries({ queryKey: ["availability", orgId] }),
        );
      },
      setPayment: (playerId: string, paid: boolean) => {
        if (!nextMatchId) return;
        void wrap(() => client.fixtures.setPayment(orgId, nextMatchId, playerId, { paid })).then(() =>
          qc.invalidateQueries({ queryKey: ["payments", orgId, nextMatchId] }),
        );
      },
      schedule: async ({ scheduledAt, venue }) => {
        // Auto-balance the available squad into two sides, then persist the
        // fixture with the chosen venue. Voting-blended ratings drive the draft.
        const draftRes = await wrap(() => client.draft.run(orgId, { teamCount: 2 }));
        if (!draftRes.ok || draftRes.data.teams.length < 2) return false;
        const [a, b] = draftRes.data.teams;
        const res = await wrap(() =>
          client.fixtures.schedule(orgId, {
            scheduledAt,
            teamA: { name: a!.name, players: a!.players },
            teamB: { name: b!.name, players: b!.players },
            venue,
          }),
        );
        if (res.ok) await qc.invalidateQueries({ queryKey: qk.fixtures(orgId) });
        return res.ok;
      },
    };
  }, [orgId, client, qc, router, myPlayerId, nextMatchId]);

  const loading =
    !ready ||
    orgs.loading ||
    (orgId != null && (roster.loading || availability.loading || fixtures.loading));

  if (loading) return <RondoBoot label="Loading your squad…" />;
  if (!org || !orgId) return <RondoBoot label={`No squad found for “${slug}”.`} />;

  // Role comes from the backend: the org list carries the caller's org-scoped
  // role. owner/admin manage the squad; everyone else is a player. (Falls back
  // to the manager-only join-code probe if an older API omits the role.)
  const roleFromList = (org as { role?: string } | undefined)?.role?.toLowerCase();
  const isManager = roleFromList
    ? ["owner", "admin", "manager"].includes(roleFromList)
    : joinCode.data != null;

  const seed = buildLiveSeed({
    orgName: org.name,
    players: roster.data ?? [],
    isManager,
    availability: availabilityMap(availability.data ?? []),
    availabilityAt: availabilityAtMap(availability.data ?? []),
    matches: matchRows(fixtures.data ?? []),
    nextMatch: nextActionableMatch(fixtures.data ?? []),
    playerStats: computePlayerStats(fixtures.data ?? []),
    myPlayerId,
    payments: paymentsMap,
    ...(joinCode.data ? { joinCode: joinCode.data } : {}),
    joinRequests: joinRequestRows(joinReqs.data ?? []),
    votingOpen: (ratingRound.data ?? null) != null,
    live,
  });

  const teamNav = {
    teams: (orgs.data ?? []).map((o) => ({ slug: o.slug, name: o.name, crest: (o.name.trim()[0] ?? "R").toUpperCase() })),
    currentSlug: slug,
    onSelect: (s: string) => router.push(`/rondo/${s}`),
    onCreate: () => router.push("/rondo/new"),
    onJoin: () => router.push("/rondo/join"),
  };

  return <PitchsideApp seed={seed} role={isManager ? "manager" : "player"} teamNav={teamNav} />;
}

function RondoBoot({ label }: { label: string }) {
  return (
    <div className="rk" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center", background: "#F2F4F1" }}>
      <div style={{ width: 56, height: 56, borderRadius: 17, background: "#101511", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#F2F4F1" }}>R</div>
      <div style={{ fontFamily: "var(--font-jbmono), ui-monospace, monospace", fontSize: 12, color: "rgba(16,21,17,.5)", letterSpacing: ".5px" }}>{label}</div>
    </div>
  );
}
