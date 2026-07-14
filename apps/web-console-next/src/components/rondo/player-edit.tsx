/*
 * PlayerScoreSheet — the manager's per-player score editor, opened from a member
 * row in Manage Squad. Edit the six attributes on sliders; the overall (OVR) is
 * the live mean, matching the server's computeOvr. Save persists the attributes
 * through the live setPlayerScore handler.
 */
"use client";

import * as React from "react";
import { C, ink, Icon } from "./kit";
import type { PlayerStats } from "./use-rondo";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export type EditablePlayer = {
  id: string;
  name: string;
  pos: string;
  skills: Record<string, number>;
  stats?: PlayerStats | undefined;
};

function clamp(v: number) {
  return Math.max(1, Math.min(99, Math.round(v)));
}
function ovrOf(skills: Record<string, number>) {
  const vals = Object.values(skills);
  return vals.length ? clamp(vals.reduce((a, b) => a + b, 0) / vals.length) : 1;
}

export function PlayerScoreSheet({
  player,
  onClose,
  onSave,
}: {
  player: EditablePlayer | null;
  onClose: () => void;
  onSave: (id: string, skills: Record<string, number>) => void;
}) {
  const [skills, setSkills] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (player) setSkills({ ...player.skills });
  }, [player]);

  if (!player) return null;

  const keys = Object.keys(skills);
  const ovr = ovrOf(skills);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(16,21,17,.35)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rk-anim-rise"
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "10px 20px 28px", maxWidth: 430, width: "100%", margin: "0 auto", maxHeight: "88dvh", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: ink(0.15), margin: "0 auto 16px" }} />

        {/* header: name + live OVR */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: ink(0.5), marginTop: 2 }}>{player.pos} · EDIT SCORE</div>
          </div>
          <div style={{ textAlign: "center", flex: "none" }}>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: ink(0.45) }}>OVR</div>
            <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: C.green, letterSpacing: -1, lineHeight: 1 }}>{ovr}</div>
          </div>
        </div>
        {player.stats && player.stats.apps > 0 && (
          <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 9.5, color: ink(0.5) }}>
            {player.stats.apps} PLAYED · {player.stats.wins}W {player.stats.draws}D {player.stats.losses}L
          </div>
        )}

        {/* skill sliders */}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {keys.map((k) => {
            const v = skills[k] ?? 1;
            return (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: 1, color: ink(0.6) }}>{k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: v >= 85 ? C.green : C.ink }}>{v}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={v}
                  onChange={(e) => setSkills((s) => ({ ...s, [k]: Number(e.target.value) }))}
                  className="rk-range"
                  style={{ width: "100%", accentColor: C.green }}
                  aria-label={k}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={() => { onSave(player.id, skills); onClose(); }}
          className="rk-press"
          style={{ marginTop: 22, width: "100%", height: 54, borderRadius: 16, border: "none", background: C.green, color: C.onDark, fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
        >
          <Icon name="check" size={16} color={C.onDark} stroke={3} /> Save score
        </button>
        <div style={{ textAlign: "center", marginTop: 10, fontFamily: MONO, fontSize: 9, color: ink(0.45) }}>OVR IS THE AVERAGE OF THE SIX ATTRIBUTES</div>
      </div>
    </div>
  );
}
