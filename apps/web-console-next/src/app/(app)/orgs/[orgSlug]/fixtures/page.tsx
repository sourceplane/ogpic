"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Share2, Trophy, Ban, Copy, Check } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { useToast } from "@/components/ui/toast";
import { wrap } from "@/lib/api";
import type { MatchShareResponse, MatchStatus, PublicMatch } from "@saas/contracts/matchmaker";

const STATUS_VARIANT: Record<MatchStatus, "secondary" | "success" | "destructive"> = {
  scheduled: "secondary",
  played: "success",
  cancelled: "destructive",
};

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FixturesPage() {
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

  const fixtures = useApiQuery(qk.fixtures(orgId), () =>
    wrap(async () => (await client.fixtures.list(orgId)).matches),
  );

  const [sharing, setSharing] = React.useState<PublicMatch | null>(null);
  const [recording, setRecording] = React.useState<PublicMatch | null>(null);
  const [cancelling, setCancelling] = React.useState<PublicMatch | null>(null);

  const matches = fixtures.data ?? [];

  const cancel = async (match: PublicMatch) => {
    const r = await wrap(() => client.fixtures.cancel(orgId, match.id));
    if (!r.ok) {
      toast({ kind: "error", title: "Cancel failed", description: r.error.message });
      return;
    }
    toast({ kind: "success", title: "Fixture cancelled" });
    fixtures.reload();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fixtures</h1>
          <p className="text-sm text-muted-foreground">Scheduled matches, results, and shareable lineups.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/orgs/${orgSlug}/draft`}>Draft a fixture</Link>
        </Button>
      </header>

      {fixtures.loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : fixtures.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{fixtures.error.code}</CardTitle>
            <CardDescription>{fixtures.error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No fixtures yet"
          description="Head to the Draft Board to auto-balance teams and schedule your first match."
          primaryAction={{ label: "Go to Draft Board", href: `/orgs/${orgSlug}/draft` }}
        />
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <FixtureCard
              key={m.id}
              match={m}
              onShare={() => setSharing(m)}
              onRecord={() => setRecording(m)}
              onCancel={() => setCancelling(m)}
            />
          ))}
        </div>
      )}

      <ShareDialog
        orgId={orgId}
        match={sharing}
        open={sharing !== null}
        onOpenChange={(o) => !o && setSharing(null)}
      />

      <RecordResultDialog
        orgId={orgId}
        match={recording}
        open={recording !== null}
        onOpenChange={(o) => !o && setRecording(null)}
        onSaved={() => fixtures.reload()}
      />

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel fixture?"
        description="The fixture is marked cancelled but kept in history."
        confirmLabel="Cancel fixture"
        destructive
        onConfirm={async () => {
          if (cancelling) await cancel(cancelling);
          setCancelling(null);
        }}
      />
    </div>
  );
}

function FixtureCard({
  match,
  onShare,
  onRecord,
  onCancel,
}: {
  match: PublicMatch;
  onShare: () => void;
  onRecord: () => void;
  onCancel: () => void;
}) {
  const played = match.status === "played";
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-2.5">
        <span className="text-sm font-semibold">{formatKickoff(match.scheduledAt)}</span>
        <div className="flex items-center gap-2">
          {match.format && <Badge variant="outline">{match.format}</Badge>}
          <Badge variant={STATUS_VARIANT[match.status]}>{match.status}</Badge>
        </div>
      </div>
      <CardContent className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-6">
        <TeamColumn name={match.teamA.name} rating={match.ratingA} align="right" />
        <div className="flex flex-col items-center">
          {played ? (
            <div className="text-2xl font-black tabular-nums">
              {match.scoreA}
              <span className="mx-1 text-muted-foreground">–</span>
              {match.scoreB}
            </div>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-xs font-black italic text-muted-foreground">
              VS
            </span>
          )}
        </div>
        <TeamColumn name={match.teamB.name} rating={match.ratingB} align="left" />
      </CardContent>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button size="sm" variant="ghost" onClick={onShare}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </Button>
        {match.status !== "cancelled" && (
          <Button size="sm" variant="ghost" onClick={onRecord}>
            <Trophy className="mr-1.5 h-3.5 w-3.5" />
            {played ? "Edit result" : "Record result"}
          </Button>
        )}
        {match.status === "scheduled" && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onCancel}>
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

function TeamColumn({
  name,
  rating,
  align,
}: {
  name: string;
  rating: number;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <h4 className="text-base font-black uppercase tracking-wide">{name}</h4>
      <p className="font-mono text-sm text-muted-foreground">OVR {Math.round(rating)}</p>
    </div>
  );
}

function ShareDialog({
  orgId,
  match,
  open,
  onOpenChange,
}: {
  orgId: string;
  match: PublicMatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { client } = useSession();
  const { toast } = useToast();
  const [payload, setPayload] = React.useState<MatchShareResponse | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open || !match) return;
    setPayload(null);
    setCopied(false);
    let cancelled = false;
    void (async () => {
      const r = await wrap(() => client.fixtures.share(orgId, match.id));
      if (cancelled) return;
      if (!r.ok) {
        toast({ kind: "error", title: "Could not build share text", description: r.error.message });
        return;
      }
      setPayload(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, match, orgId, client, toast]);

  const copy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ kind: "error", title: "Copy blocked", description: "Select the text and copy manually." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share fixture</DialogTitle>
          <DialogDescription>Server-generated lineup summary — copy it or send it straight out.</DialogDescription>
        </DialogHeader>
        {payload ? (
          <div className="space-y-3">
            <Textarea readOnly value={payload.text} className="h-64 font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copy}>
                {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button asChild variant="outline">
                <a href={payload.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={payload.mailtoUrl} target="_blank" rel="noopener noreferrer">
                  Email
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecordResultDialog({
  orgId,
  match,
  open,
  onOpenChange,
  onSaved,
}: {
  orgId: string;
  match: PublicMatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { client } = useSession();
  const { toast } = useToast();
  const [scoreA, setScoreA] = React.useState("0");
  const [scoreB, setScoreB] = React.useState("0");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !match) return;
    setScoreA(String(match.scoreA ?? 0));
    setScoreB(String(match.scoreB ?? 0));
  }, [open, match]);

  const submit = async () => {
    if (!match) return;
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      toast({ kind: "error", title: "Scores must be non-negative whole numbers" });
      return;
    }
    setSaving(true);
    const r = await wrap(() =>
      client.fixtures.update(orgId, match.id, { status: "played", scoreA: a, scoreB: b }),
    );
    setSaving(false);
    if (!r.ok) {
      toast({ kind: "error", title: "Save failed", description: r.error.message });
      return;
    }
    toast({ kind: "success", title: "Result recorded" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record result</DialogTitle>
          <DialogDescription>{match ? `${match.teamA.name} vs ${match.teamB.name}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="flex items-end justify-center gap-3">
          <div className="space-y-1.5 text-center">
            <Label className="line-clamp-1">{match?.teamA.name}</Label>
            <Input
              type="number"
              min={0}
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              className="w-20 text-center text-lg font-black"
            />
          </div>
          <span className="pb-2 text-muted-foreground">–</span>
          <div className="space-y-1.5 text-center">
            <Label className="line-clamp-1">{match?.teamB.name}</Label>
            <Input
              type="number"
              min={0}
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              className="w-20 text-center text-lg font-black"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Save result
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
