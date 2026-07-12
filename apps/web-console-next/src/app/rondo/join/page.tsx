/*
 * /rondo/join — request to join a squad by its code (Feature 4). A signed-in
 * user enters the code their captain shared → client.memberships.join creates a
 * pending join request the manager approves. Rondo-branded.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../../styles/rondo.css";
import { useSession } from "@/lib/session";
import { wrap } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-async";
import { Mono, IconChip } from "@/components/rondo/ui";

const ACCENT = "#56C98D";

export default function RondoJoinPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const { client } = useSession();
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<{ orgName: string } | null>(null);

  async function submit() {
    const c = code.trim().toUpperCase();
    if (!c || busy) return;
    setBusy(true);
    setError(null);
    const r = await wrap(() => client.memberships.join({ code: c }));
    setBusy(false);
    if (!r.ok) {
      setError(r.status === 404 ? "No squad found for that code." : r.status === 409 ? "You've already requested to join this squad." : r.error.message || "Could not send the request.");
      return;
    }
    setSent({ orgName: r.data.orgName });
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

            {sent ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16, textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: "rgba(86,201,141,.14)", border: "1px solid rgba(86,201,141,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#56C98D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-.6px" }}>Request sent</div>
                <div style={{ fontSize: 14, color: "#8A8D93", maxWidth: 300, lineHeight: 1.45 }}>
                  You&apos;ve asked to join <span style={{ color: "#F4F3F0", fontWeight: 700 }}>{sent.orgName}</span>. A manager will approve you — you&apos;ll see the squad once they do.
                </div>
                <button onClick={() => router.replace("/rondo")} style={{ height: 50, padding: "0 24px", marginTop: 8, borderRadius: 14, background: ACCENT, border: "none", color: "#07130D", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ marginTop: 26, fontSize: 30, fontWeight: 900, letterSpacing: "-1.4px", color: "#F4F3F0" }}>Join a squad</div>
                <div style={{ marginTop: 8, fontSize: 14, color: "#8A8D93", lineHeight: 1.45, maxWidth: 320 }}>Enter the invite code your captain shared. The manager approves your request.</div>

                <Mono style={{ marginTop: 28, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 10, display: "block" }}>INVITE CODE</Mono>
                <input
                  placeholder="ABC234"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoFocus
                  maxLength={12}
                  style={{ width: "100%", height: 60, borderRadius: 15, background: "#141619", border: "1px solid rgba(255,255,255,.11)", color: "#56C98D", fontSize: 26, fontWeight: 800, letterSpacing: "6px", textAlign: "center", padding: "0 18px", outline: "none", fontFamily: "var(--font-jbmono), monospace" }}
                />
                {error && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(255,122,107,.12)", border: "1px solid rgba(255,122,107,.3)", color: "#FFA99E", fontSize: 12.5 }}>{error}</div>}

                <div style={{ flex: 1 }} />
                <button onClick={submit} disabled={busy || !code.trim()} style={{ width: "100%", height: 56, border: "none", borderRadius: 16, background: ACCENT, color: "#07130D", fontSize: 15, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy || !code.trim() ? 0.6 : 1 }}>
                  {busy ? "Sending…" : "Request to join"}
                </button>
                <button onClick={() => router.replace("/rondo/new")} className="rondo-mono" style={{ marginTop: 12, background: "none", border: "none", color: "#8A8D93", fontSize: 12, cursor: "pointer", padding: 8 }}>Or create your own team →</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
