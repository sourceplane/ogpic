/*
 * /rondo/join — request to join a squad by its code (canvas 2a "JOIN WITH
 * CODE"), rebuilt on the Pitchside v2 kit. A signed-in user types the code their
 * captain shared → client.memberships.join creates a pending request the manager
 * approves. The 6 boxes are a presentation over one real input.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../../styles/rondo-kit.css";
import { useSession } from "@/lib/session";
import { wrap } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-async";
import { C, ink, green, PhoneShell, StatusBar, ScreenHeader, Button, Icon } from "@/components/rondo/kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";
const LEN = 6;

export default function RondoJoinPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const { client } = useSession();
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<{ orgName: string } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function submit() {
    const c = code.trim().toUpperCase();
    if (!c || busy) return;
    setBusy(true);
    setError(null);
    const r = await wrap(() => client.memberships.join({ code: c }));
    setBusy(false);
    if (!r.ok) {
      setError(
        r.status === 404
          ? "No squad found for that code."
          : r.status === 409
            ? "You've already requested to join this squad."
            : r.error.message || "Could not send the request.",
      );
      return;
    }
    setSent({ orgName: r.data.orgName });
  }

  if (!ready) return null;

  if (sent) {
    return (
      <PhoneShell>
        <StatusBar />
        <ScreenHeader title="Join a squad" onBack={() => router.replace("/rondo")} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16, textAlign: "center", padding: "0 32px" }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: green(0.12), border: `1px solid ${green(0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.green }}>
            <Icon name="check" size={28} stroke={2.6} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: -0.6 }}>Request sent</div>
          <div style={{ fontSize: 14, color: ink(0.55), maxWidth: 300, lineHeight: 1.45 }}>
            You&rsquo;ve asked to join <span style={{ color: C.ink, fontWeight: 700 }}>{sent.orgName}</span>. A manager will approve you — you&rsquo;ll see the squad once they do.
          </div>
          <Button variant="green" onClick={() => router.replace("/rondo")} height={50} radius={14} style={{ width: "auto", padding: "0 24px", marginTop: 8 }}>
            Done
          </Button>
        </div>
      </PhoneShell>
    );
  }

  const chars = Array.from({ length: LEN }, (_, i) => code[i] ?? "");
  const activeIdx = Math.min(code.length, LEN - 1);

  return (
    <PhoneShell>
      <StatusBar />
      <ScreenHeader title="Join a squad" onBack={() => router.replace("/rondo/start")} />
      <div style={{ padding: "8px 24px 0", fontSize: 13, color: ink(0.55) }}>Enter the invite code your captain shared.</div>

      {/* six boxes over a single hidden input */}
      <div style={{ position: "relative", padding: "24px 24px 0" }}>
        <input
          ref={inputRef}
          value={code}
          autoFocus
          inputMode="text"
          maxLength={LEN}
          aria-label="Invite code"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ position: "absolute", inset: "24px 24px 0", width: "calc(100% - 48px)", height: 58, opacity: 0, zIndex: 2, cursor: "pointer" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {chars.map((ch, i) => {
            const active = i === activeIdx && code.length < LEN;
            const filled = ch !== "";
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 58,
                  borderRadius: 14,
                  background: C.card,
                  border: active ? `2px solid ${C.green}` : `1px solid ${ink(0.14)}`,
                  boxShadow: active ? `0 0 0 4px ${green(0.12)}` : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  color: filled ? C.ink : ink(0.25),
                }}
              >
                {ch || "·"}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "22px 24px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: ink(0.12) }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: ink(0.4) }}>OR</span>
        <div style={{ flex: 1, height: 1, background: ink(0.12) }} />
      </div>
      <div style={{ margin: "14px 24px 0", height: 50, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.12)}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, color: ink(0.45) }}>
        <Icon name="share" size={15} color={ink(0.45)} />
        <span style={{ fontSize: 13 }}>Paste a squad link…</span>
      </div>

      {error && (
        <div style={{ margin: "16px 24px 0", padding: "10px 14px", borderRadius: 12, background: "rgba(176,81,47,.12)", border: "1px solid rgba(176,81,47,.3)", color: C.rust, fontSize: 12.5 }}>{error}</div>
      )}

      <div style={{ flex: 1 }} />
      <div style={{ padding: "0 24px 26px" }}>
        <Button variant="ink" onClick={submit} disabled={busy || !code.trim()}>
          {busy ? "Sending…" : "Join squad"}
        </Button>
        <div
          onClick={() => router.replace("/rondo/new")}
          className="rk-press"
          style={{ marginTop: 12, textAlign: "center", fontFamily: MONO, fontSize: 11, color: ink(0.5) }}
        >
          Or create your own team →
        </div>
      </div>
    </PhoneShell>
  );
}
