"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Users, Plus, Wand2, Trash2, Pencil, Minus } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { useToast } from "@/components/ui/toast";
import { wrap } from "@/lib/api";
import type { PlayerPosition, PublicPlayer } from "@saas/contracts/matchmaker";
import { PLAYER_POSITIONS } from "@saas/contracts/matchmaker";
import {
  PlayerCard,
  POSITION_BADGE,
  attributeKeysFor,
  previewOvr,
} from "@/components/matchmaker/player-card";

const POSITION_LABEL: Record<PlayerPosition, string> = {
  GK: "GK · Goalkeeper",
  DEF: "DEF · Defender",
  MID: "MID · Midfielder",
  FWD: "FWD · Forward",
  ALL: "ALL · Utility",
};

function defaultAttributes(position: PlayerPosition): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of attributeKeysFor(position)) out[key] = 80;
  return out;
}

export default function RosterPage() {
  const params = useParams<{ orgSlug: string }>();
  return (
    <OrgScope slug={params?.orgSlug ?? ""}>
      {(org) => <Inner orgId={org.id} />}
    </OrgScope>
  );
}

function Inner({ orgId }: { orgId: string }) {
  const { client } = useSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const search = useSearchParams();
  const key = qk.roster(orgId);

  const roster = useApiQuery(key, () =>
    wrap(async () => (await client.roster.list(orgId)).players),
  );

  const [scoutOpen, setScoutOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PublicPlayer | null>(null);
  const [releasing, setReleasing] = React.useState<PublicPlayer | null>(null);

  React.useEffect(() => {
    if (search?.get("new") === "1") setScoutOpen(true);
  }, [search]);

  const players = roster.data ?? [];

  const depth = React.useMemo(() => {
    const counts: Record<PlayerPosition, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0, ALL: 0 };
    for (const p of players) counts[p.position] += 1;
    return counts;
  }, [players]);

  const release = async (player: PublicPlayer) => {
    const previous = qc.getQueryData<PublicPlayer[]>(key);
    qc.setQueryData<PublicPlayer[]>(key, (cur) => (cur ?? []).filter((p) => p.id !== player.id));
    const r = await wrap(() => client.roster.release(orgId, player.id));
    if (!r.ok) {
      qc.setQueryData<PublicPlayer[]>(key, previous);
      toast({ kind: "error", title: "Release failed", description: r.error.message });
      return;
    }
    toast({ kind: "success", title: `${player.name} released` });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Roster</h1>
          <p className="text-sm text-muted-foreground">
            Your community&apos;s shared player pool. Each card&apos;s OVR is the average of its six attributes.
          </p>
        </div>
        <Button onClick={() => setScoutOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Scout player
        </Button>
      </header>

      {players.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Squad depth
          </span>
          {PLAYER_POSITIONS.map((pos) => (
            <span
              key={pos}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs"
            >
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${POSITION_BADGE[pos]}`}>{pos}</span>
              <span className="font-semibold">{depth[pos]}</span>
            </span>
          ))}
        </div>
      )}

      {roster.loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : roster.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{roster.error.code}</CardTitle>
            <CardDescription>{roster.error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Your roster is empty"
          description="Scout your first player to start building the squad, then head to the Draft Board to split balanced teams."
          primaryAction={{ label: "Scout player", onClick: () => setScoutOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              actions={
                <>
                  <Button size="sm" className="w-32" onClick={() => setEditing(p)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit stats
                  </Button>
                  <Button size="sm" variant="destructive" className="w-32" onClick={() => setReleasing(p)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Release
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <PlayerDialog
        orgId={orgId}
        open={scoutOpen}
        onOpenChange={setScoutOpen}
        onSaved={() => roster.reload()}
      />
      <PlayerDialog
        orgId={orgId}
        player={editing}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => roster.reload()}
      />

      <ConfirmDialog
        open={releasing !== null}
        onOpenChange={(o) => !o && setReleasing(null)}
        title="Release player?"
        description="The player is removed from the active roster. Fixtures they already appear in keep their lineup."
        resourceName={releasing?.name}
        confirmLabel="Release"
        destructive
        onConfirm={async () => {
          if (releasing) await release(releasing);
          setReleasing(null);
        }}
      />
    </div>
  );
}

function PlayerDialog({
  orgId,
  player,
  open,
  onOpenChange,
  onSaved,
}: {
  orgId: string;
  player?: PublicPlayer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { client } = useSession();
  const { toast } = useToast();
  const isEdit = !!player;

  const [name, setName] = React.useState("");
  const [position, setPosition] = React.useState<PlayerPosition>("MID");
  const [attributes, setAttributes] = React.useState<Record<string, number>>(defaultAttributes("MID"));
  const [saving, setSaving] = React.useState(false);

  // Reset the form whenever the dialog opens (or the edited player changes).
  React.useEffect(() => {
    if (!open) return;
    if (player) {
      setName(player.name);
      setPosition(player.position);
      setAttributes({ ...player.attributes });
    } else {
      setName("");
      setPosition("MID");
      setAttributes(defaultAttributes("MID"));
    }
  }, [open, player]);

  const changePosition = (next: PlayerPosition) => {
    setPosition((prev) => {
      const prevIsGk = prev === "GK";
      const nextIsGk = next === "GK";
      if (prevIsGk !== nextIsGk) setAttributes(defaultAttributes(next));
      return next;
    });
  };

  const setAttr = (key: string, value: number) => {
    const v = Math.max(1, Math.min(99, Math.round(Number.isFinite(value) ? value : 1)));
    setAttributes((prev) => ({ ...prev, [key]: v }));
  };

  const ovr = previewOvr(attributes);

  const autoSuggest = async () => {
    const r = await wrap(() => client.roster.suggestPosition(orgId, { attributes }));
    if (!r.ok) {
      toast({ kind: "error", title: "Suggestion failed", description: r.error.message });
      return;
    }
    changePosition(r.data.position);
    toast({ kind: "default", title: `Suggested ${r.data.position}` });
  };

  const submit = async () => {
    if (!name.trim()) {
      toast({ kind: "error", title: "Name is required" });
      return;
    }
    setSaving(true);
    const r = isEdit
      ? await wrap(() => client.roster.update(orgId, player!.id, { name: name.trim(), position, attributes }))
      : await wrap(() => client.roster.scout(orgId, { name: name.trim(), position, attributes }));
    setSaving(false);
    if (!r.ok) {
      toast({ kind: "error", title: isEdit ? "Update failed" : "Scout failed", description: r.error.message });
      return;
    }
    toast({ kind: "success", title: isEdit ? "Player updated" : `${name.trim()} scouted` });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit player" : "Scout player"}</DialogTitle>
          <DialogDescription>
            Set the six attributes (1–99); the OVR is their average. GK cards use a keeper attribute set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="player-name">Name</Label>
              <Input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jude Bellingham"
              />
            </div>
            <div className="flex flex-col items-center rounded-lg border border-border bg-card px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">OVR</span>
              <span className="text-2xl font-black tabular-nums text-lime-500">{ovr}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Position</Label>
            <div className="flex gap-2">
              <Select value={position} onValueChange={(v) => changePosition(v as PlayerPosition)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {POSITION_LABEL[pos]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {position !== "GK" && (
                <Button type="button" variant="outline" onClick={autoSuggest} title="Best-fit position from attributes">
                  <Wand2 className="mr-1.5 h-4 w-4" />
                  Auto-suggest
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {attributeKeysFor(position).map((attrKey) => (
              <div key={attrKey} className="flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5">
                <span className="text-xs font-black uppercase text-muted-foreground">{attrKey}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setAttr(attrKey, (attributes[attrKey] ?? 1) - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={attributes[attrKey] ?? 1}
                    onChange={(e) => setAttr(attrKey, Number(e.target.value))}
                    className="h-7 w-12 px-1 text-center text-sm font-black tabular-nums text-lime-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setAttr(attrKey, (attributes[attrKey] ?? 1) + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={submit}>
              {isEdit ? "Save changes" : "Scout & sign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

