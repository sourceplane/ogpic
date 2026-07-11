"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shuffle, Swords, CalendarPlus, Users } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { useToast } from "@/components/ui/toast";
import { wrap } from "@/lib/api";
import type { DraftResponse, PlayerPosition } from "@saas/contracts/matchmaker";
import { CompactPlayerCard } from "@/components/matchmaker/player-card";

const ROW_ORDER: PlayerPosition[] = ["FWD", "MID", "DEF", "ALL", "GK"];

export default function DraftPage() {
  const params = useParams<{ orgSlug: string }>();
  return (
    <OrgScope slug={params?.orgSlug ?? ""}>
      {(org) => <Inner orgId={org.id} orgSlug={org.slug} />}
    </OrgScope>
  );
}

function Inner({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { client } = useSession();
  const { toast } = useToast();

  const roster = useApiQuery(qk.roster(orgId), () =>
    wrap(async () => (await client.roster.list(orgId)).players),
  );

  const [teamCount, setTeamCount] = React.useState(2);
  const [drafting, setDrafting] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftResponse | null>(null);

  const rosterSize = roster.data?.length ?? 0;

  const runDraft = async () => {
    setDrafting(true);
    const r = await wrap(() => client.draft.run(orgId, { teamCount }));
    setDrafting(false);
    if (!r.ok) {
      toast({ kind: "error", title: "Draft failed", description: r.error.message });
      return;
    }
    setDraft(r.data);
    toast({ kind: "success", title: "Balanced teams drafted" });
  };

  if (roster.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (rosterSize < 2) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState
          icon={Users}
          title="Not enough players to draft"
          description="Add at least two players to your roster, then come back to auto-balance teams."
          primaryAction={{ label: "Go to Roster", href: `/orgs/${orgSlug}/roster` }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-lime-500 to-emerald-700 text-black shadow-lg">
              <Swords className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Balancing draft</p>
              <p className="text-sm text-muted-foreground">
                {rosterSize} players · deterministic split by position and OVR
              </p>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label>Teams</Label>
              <Select value={String(teamCount)} onValueChange={(v) => setTeamCount(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button loading={drafting} onClick={runDraft}>
              <Shuffle className="mr-1.5 h-4 w-4" />
              Auto-draft
            </Button>
          </div>
        </CardContent>
      </Card>

      {draft && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Drafted teams
            </h2>
            <Badge variant={draft.ratingSpread <= 2 ? "success" : "warning"}>
              Rating spread {draft.ratingSpread}
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {draft.teams.map((team, i) => (
              <TeamPitch key={i} name={team.name} squadRating={team.squadRating} players={team.players} accent={i} />
            ))}
          </div>

          {draft.teams.length === 2 ? (
            <ScheduleCard orgId={orgId} orgSlug={orgSlug} draft={draft} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scheduling</CardTitle>
                <CardDescription>
                  Fixtures are played between two teams. Draft with 2 teams to schedule a match, or share these lineups directly.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-semibold tracking-tight">Draft Board</h1>
      <p className="text-sm text-muted-foreground">
        Auto-balance the roster into fair sides, then schedule the fixture.
      </p>
    </header>
  );
}

function TeamPitch({
  name,
  squadRating,
  players,
  accent,
}: {
  name: string;
  squadRating: number;
  players: { id: string; name: string; position: PlayerPosition; rating: number }[];
  accent: number;
}) {
  const theme =
    accent === 0
      ? "from-blue-950/40 to-background border-blue-500/30"
      : accent === 1
        ? "from-red-950/40 to-background border-red-500/30"
        : "from-emerald-950/40 to-background border-emerald-500/30";
  const accentText = accent === 0 ? "text-blue-400" : accent === 1 ? "text-red-400" : "text-emerald-400";

  return (
    <div className={`flex min-h-[24rem] flex-col rounded-2xl border bg-gradient-to-br p-5 ${theme}`}>
      <div className="mb-5 flex items-end justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-lg font-black uppercase tracking-wide">{name}</h3>
          <p className="text-xs text-muted-foreground">{players.length} players</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Squad OVR</div>
          <div className={`text-3xl font-black ${accentText}`}>{squadRating}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        {ROW_ORDER.map((row) => {
          const inRow = players.filter((p) => p.position === row);
          if (inRow.length === 0) return null;
          return (
            <div key={row} className="flex flex-wrap justify-center gap-2">
              {inRow.map((p) => (
                <CompactPlayerCard key={p.id} player={p} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleCard({
  orgId,
  orgSlug,
  draft,
}: {
  orgId: string;
  orgSlug: string;
  draft: DraftResponse;
}) {
  const { client } = useSession();
  const { toast } = useToast();
  const [when, setWhen] = React.useState("");
  const [format, setFormat] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [scheduled, setScheduled] = React.useState(false);

  const schedule = async () => {
    if (!when) {
      toast({ kind: "error", title: "Pick a kickoff date & time" });
      return;
    }
    const iso = new Date(when).toISOString();
    const [a, b] = draft.teams;
    setSaving(true);
    const r = await wrap(() =>
      client.fixtures.schedule(orgId, {
        scheduledAt: iso,
        ...(format.trim() ? { format: format.trim() } : {}),
        teamA: { name: a!.name, players: a!.players },
        teamB: { name: b!.name, players: b!.players },
      }),
    );
    setSaving(false);
    if (!r.ok) {
      toast({ kind: "error", title: "Schedule failed", description: r.error.message });
      return;
    }
    setScheduled(true);
    toast({ kind: "success", title: "Fixture scheduled" });
  };

  if (scheduled) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CalendarPlus className="h-6 w-6" />
          </div>
          <p className="font-semibold">Fixture scheduled</p>
          <Button asChild variant="outline">
            <Link href={`/orgs/${orgSlug}/fixtures`}>View fixtures</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule this fixture</CardTitle>
        <CardDescription>Lock in these two sides with a kickoff time.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-end gap-3 sm:flex-row">
        <div className="w-full space-y-1.5 sm:flex-1">
          <Label htmlFor="kickoff">Kickoff</Label>
          <Input id="kickoff" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="w-full space-y-1.5 sm:w-40">
          <Label htmlFor="format">Format (optional)</Label>
          <Input id="format" placeholder="5v5" value={format} onChange={(e) => setFormat(e.target.value)} />
        </div>
        <Button loading={saving} onClick={schedule}>
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          Schedule
        </Button>
      </CardContent>
    </Card>
  );
}
