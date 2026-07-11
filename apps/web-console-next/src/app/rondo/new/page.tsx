/*
 * /rondo/new — create a team (Feature 2). A team is an organization; the creator
 * becomes its owner (the "manager"). Rondo-branded form over
 * client.organizations.create; on success routes into the new squad.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../../styles/rondo.css";
import { useSession } from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import { wrap } from "@/lib/api";
import { qk } from "@/lib/query";
import { useRequireAuth } from "@/lib/use-async";
import { Mono, IconChip } from "@/components/rondo/ui";

const ACCENT = "#56C98D";

export default function RondoNewTeamPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const { client } = useSession();
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await wrap(() => client.organizations.create({ name: name.trim() }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message || "Could not create the team. Try again.");
      return;
    }
    await qc.invalidateQueries({ queryKey: qk.orgs() });
    router.replace(`/rondo/${r.data.organization.slug}`);
  }

  if (!ready) return null;

  return (
    <div className="rondo-root rondo-shell no-nav">
      <div className="rondo-main">
        <div className="rondo-page">
          <div style={{ minHeight: "100dvh", padding: "64px 24px 40px", display: "flex", flexDirection: "column" }}>
            <IconChip onClick={() => router.replace("/rondo")} ariaLabel="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            </IconChip>

            <div style={{ marginTop: 26, fontSize: 30, fontWeight: 900, letterSpacing: "-1.4px", color: "#F4F3F0" }}>Create your team</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#8A8D93", lineHeight: 1.45, maxWidth: 320 }}>
              Start a squad and invite the players you play with. You&apos;ll be the manager — you draft the sides and schedule matches.
            </div>

            <Mono style={{ marginTop: 28, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 10, display: "block" }}>TEAM NAME</Mono>
            <input
              placeholder="Northside FC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              autoFocus
              style={{ width: "100%", height: 56, borderRadius: 15, background: "#141619", border: "1px solid rgba(255,255,255,.11)", color: "#F4F3F0", fontSize: 17, fontWeight: 700, padding: "0 18px", outline: "none" }}
            />

            {error && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(255,122,107,.12)", border: "1px solid rgba(255,122,107,.3)", color: "#FFA99E", fontSize: 12.5 }}>{error}</div>
            )}

            <div style={{ flex: 1 }} />

            <button onClick={create} disabled={busy || !name.trim()} style={{ width: "100%", height: 56, border: "none", borderRadius: 16, background: ACCENT, color: "#07130D", fontSize: 15, fontWeight: 800, letterSpacing: "-.2px", cursor: busy ? "default" : "pointer", opacity: busy || !name.trim() ? 0.6 : 1 }}>
              {busy ? "Creating…" : "Create team"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
