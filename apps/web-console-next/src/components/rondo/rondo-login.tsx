/*
 * RondoLogin — the Rondo-branded real sign-in / sign-up (Feature 1), rebuilt on
 * the Pitchside v2 kit (UI revamp phase 2). Wires the platform's unified auth
 * (signup == first login) — one-tap Google (OAuth, when configured) + email code
 * — to the light "ink-on-paper" design. On success it routes to /rondo, which
 * resolves the caller's squad. The token-free preview lives at /rondo/demo.
 *
 * Note vs. the canvas: the design shows "phone" + "Apple" chips; the platform's
 * auth is email-code + Google, so those are the functional entry points here.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { wrap } from "@/lib/api";
import { C, ink, PhoneShell, StatusBar, Button } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export function RondoLogin() {
  const router = useRouter();
  const { client, setToken } = useSession();
  const [providers, setProviders] = React.useState<{ id: string; displayName: string }[]>([]);
  const [step, setStep] = React.useState<"start" | "email" | "code">("start");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [emailHint, setEmailHint] = React.useState<string | null>(null);
  const [debugCode, setDebugCode] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void wrap(() => client.auth.listOAuthProviders()).then((r) => {
      if (r.ok) setProviders(r.data.providers.map((p) => ({ id: p.id, displayName: p.displayName })));
    });
  }, [client]);

  const google = providers.find((p) => p.id === "google");

  function startOAuth(providerId: string) {
    const returnTo = `${window.location.origin}/rondo/callback`;
    window.location.href = client.auth.oauthStartUrl(providerId, returnTo);
  }

  async function submitEmail() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await wrap(() => client.auth.loginStart({ email: email.trim() }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message || "Could not send a code. Try again.");
      return;
    }
    setChallengeId(r.data.challengeId);
    setEmailHint(r.data.delivery.emailHint);
    setDebugCode(r.data.delivery.code ?? null);
    setStep("code");
  }

  async function submitCode() {
    if (!challengeId || !code.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await wrap(() => client.auth.loginComplete({ challengeId, code: code.trim() }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message || "That code didn't work. Try again.");
      return;
    }
    setToken(r.data.token);
    router.replace("/rondo");
  }

  const field: React.CSSProperties = {
    width: "100%",
    height: 54,
    borderRadius: 16,
    background: C.card,
    border: `1px solid ${ink(0.14)}`,
    color: C.ink,
    fontSize: 15,
    fontWeight: 600,
    padding: "0 16px",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <PhoneShell>
      <StatusBar />

      {/* pitch hero */}
      <div style={{ margin: "14px 20px 0", height: 290, flex: "none", position: "relative", background: C.pitch, borderRadius: 18, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 14, right: 14, top: 14, bottom: -2, border: "2px solid #FFFFFF", borderBottom: "none", borderRadius: "8px 8px 0 0" }} />
        <div style={{ position: "absolute", left: "50%", bottom: -60, width: 150, height: 150, border: "2px solid #FFFFFF", borderRadius: "50%", transform: "translateX(-50%)" }} />
        <div style={{ position: "absolute", left: "50%", top: 14, transform: "translateX(-50%)", width: 150, height: 52, border: "2px solid #FFFFFF", borderTop: "none" }} />
        <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%,-50%)", width: 72, height: 72, borderRadius: 20, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 30px -10px rgba(16,21,17,.5)" }}>
          <span style={{ fontSize: 34, fontWeight: 700, color: C.onDark }}>R</span>
        </div>
      </div>

      <div style={{ padding: "26px 28px 0" }}>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1.5, color: C.ink, lineHeight: 1 }}>Rondo</div>
        <div style={{ marginTop: 10, fontSize: 16, fontWeight: 500, color: ink(0.75), lineHeight: 1.3 }}>
          Balanced sides.
          <br />
          Every match.
        </div>
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: ink(0.45) }}>
          SUNDAY-LEAGUE FOOTBALL, SORTED.
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 24px 26px", display: "flex", flexDirection: "column", gap: 10 }}>
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 12, background: rustSoft(), border: `1px solid ${rustBorder()}`, color: C.rust, fontSize: 12.5 }}>{error}</div>
        )}

        {step === "start" && (
          <>
            <Button variant="ink" height={54} radius={16} onClick={() => setStep("email")}>
              Continue with email
            </Button>
            {google && (
              <Button variant="outline" height={50} radius={16} onClick={() => startOAuth(google.id)} style={{ gap: 9 }}>
                <GoogleGlyph /> Continue with Google
              </Button>
            )}
            <div
              onClick={() => router.push("/rondo/demo")}
              className="rk-press"
              style={{ textAlign: "center", padding: "6px 0", fontFamily: MONO, fontSize: 10.5, color: C.green, fontWeight: 600 }}
            >
              EXPLORE A DEMO SQUAD →
            </div>
            <div style={{ textAlign: "center", fontSize: 10, color: ink(0.4), lineHeight: 1.5 }}>
              By continuing you agree to the Terms &amp; Privacy Policy.
            </div>
          </>
        )}

        {step === "email" && (
          <>
            <input
              type="email"
              inputMode="email"
              placeholder="you@email.com"
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitEmail()}
              style={field}
            />
            <Button variant="green" height={54} radius={16} onClick={submitEmail} disabled={busy || !email.trim()}>
              {busy ? "Sending…" : "Send me a code"}
            </Button>
            <button onClick={() => { setStep("start"); setError(null); }} className="rk-press" style={backLink}>
              ← Back
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <div style={{ fontSize: 13.5, color: ink(0.6), lineHeight: 1.4, textAlign: "center" }}>
              Enter the 6-digit code sent to <span style={{ color: C.ink, fontWeight: 700 }}>{emailHint ?? email}</span>.
            </div>
            <input
              inputMode="numeric"
              placeholder="••••••"
              value={code}
              autoFocus
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCode()}
              style={{ ...field, textAlign: "center", letterSpacing: 8, fontSize: 22, fontWeight: 700, fontFamily: MONO }}
            />
            {debugCode && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.green, textAlign: "center" }}>DEV CODE: {debugCode}</div>
            )}
            <Button variant="green" height={54} radius={16} onClick={submitCode} disabled={busy || !code.trim()}>
              {busy ? "Verifying…" : "Verify & continue"}
            </Button>
            <button onClick={() => { setStep("email"); setCode(""); setError(null); }} className="rk-press" style={backLink}>
              ← Use a different email
            </button>
          </>
        )}
      </div>
    </PhoneShell>
  );
}

const backLink: React.CSSProperties = {
  background: "none",
  border: "none",
  color: ink(0.5),
  fontSize: 12,
  cursor: "pointer",
  padding: 8,
  fontFamily: MONO,
};
const rustSoft = () => "rgba(176,81,47,.12)";
const rustBorder = () => "rgba(176,81,47,.3)";

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 010-3.42V4.96H.96a9 9 0 000 8.08l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
