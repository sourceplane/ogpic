/*
 * RondoLogin — the Rondo-branded real sign-in / sign-up (Feature 1). Wires the
 * platform's unified auth (signup == first login) to the Rondo visual system:
 * one-tap Google (OAuth, when configured) + email code. On success it routes to
 * /rondo, which resolves the caller's squad. The token-free interactive preview
 * lives at /rondo/demo.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { wrap } from "@/lib/api";
import { Mono } from "./ui";

const ACCENT = "#56C98D";

export function RondoLogin() {
  const router = useRouter();
  const { client, setToken } = useSession();
  const [providers, setProviders] = React.useState<{ id: string; displayName: string }[]>([]);
  const [step, setStep] = React.useState<"start" | "code">("start");
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

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    height: 54,
    borderRadius: 15,
    background: "#141619",
    border: "1px solid rgba(255,255,255,.11)",
    color: "#F4F3F0",
    fontSize: 15,
    fontWeight: 600,
    padding: "0 16px",
    outline: "none",
  };

  return (
    <div className="rondo-root rondo-shell no-nav">
      <div className="rondo-main">
        <div className="rondo-page">
          <div
            style={{
              minHeight: "100dvh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "96px 28px 40px",
              position: "relative",
              background: "radial-gradient(120% 70% at 50% 0%,#15191D 0%,#08090B 58%)",
            }}
          >
            <div style={{ position: "relative" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(150deg,#1E2228,#101215)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px -8px rgba(0,0,0,.7)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 18, boxShadow: "inset 0 0 0 1.5px rgba(86,201,141,.35)" }} />
                <span style={{ fontSize: 30, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-1px" }}>R</span>
              </div>
              <div style={{ marginTop: 26, fontSize: 52, fontWeight: 900, letterSpacing: "-3px", lineHeight: 0.9, color: "#F4F3F0" }}>RONDO</div>
              <div style={{ marginTop: 14, fontSize: 19, fontWeight: 600, color: "#D8D9DA", letterSpacing: "-.4px", maxWidth: 250, lineHeight: 1.25 }}>
                Balanced sides.
                <br />
                Every match.
              </div>
              <Mono style={{ marginTop: 12, fontSize: 11, color: "#63666C", letterSpacing: ".5px", display: "block" }}>SUNDAY-LEAGUE FOOTBALL, SORTED.</Mono>
            </div>

            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 11 }}>
              {error && (
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,122,107,.12)", border: "1px solid rgba(255,122,107,.3)", color: "#FFA99E", fontSize: 12.5 }}>{error}</div>
              )}

              {step === "start" ? (
                <>
                  {google && (
                    <button onClick={() => startOAuth(google.id)} style={{ width: "100%", height: 54, border: "none", borderRadius: 15, background: "#F4F3F0", color: "#0B0C0E", fontSize: 15, fontWeight: 800, letterSpacing: "-.2px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
                      <GoogleGlyph /> Continue with Google
                    </button>
                  )}
                  <input
                    type="email"
                    inputMode="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                    style={fieldStyle}
                  />
                  <button onClick={submitEmail} disabled={busy || !email.trim()} style={{ width: "100%", height: 54, border: "none", borderRadius: 15, background: ACCENT, color: "#07130D", fontSize: 15, fontWeight: 800, letterSpacing: "-.2px", cursor: busy ? "default" : "pointer", opacity: busy || !email.trim() ? 0.6 : 1 }}>
                    {busy ? "Sending…" : "Continue with email"}
                  </button>
                  <button onClick={() => router.push("/rondo/demo")} className="rondo-mono" style={{ marginTop: 4, background: "none", border: "none", color: "#8A8D93", fontSize: 12, letterSpacing: ".3px", cursor: "pointer", padding: 8 }}>Explore a demo squad →</button>
                  <div style={{ textAlign: "center", fontSize: 10.5, color: "#4E5157", lineHeight: 1.5, marginTop: 2 }}>By continuing you agree to the Terms &amp; Privacy Policy.</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: "#8A8D93", lineHeight: 1.4 }}>
                    Enter the 6-digit code sent to <span style={{ color: "#F4F3F0", fontWeight: 700 }}>{emailHint ?? email}</span>.
                  </div>
                  <input
                    inputMode="numeric"
                    placeholder="••••••"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitCode()}
                    style={{ ...fieldStyle, textAlign: "center", letterSpacing: "8px", fontSize: 22, fontWeight: 800 }}
                  />
                  {debugCode && (
                    <Mono style={{ fontSize: 11, color: "#8A9B92", textAlign: "center" }}>DEV CODE: {debugCode}</Mono>
                  )}
                  <button onClick={submitCode} disabled={busy || !code.trim()} style={{ width: "100%", height: 54, border: "none", borderRadius: 15, background: ACCENT, color: "#07130D", fontSize: 15, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy || !code.trim() ? 0.6 : 1 }}>
                    {busy ? "Verifying…" : "Verify & continue"}
                  </button>
                  <button onClick={() => { setStep("start"); setCode(""); setError(null); }} className="rondo-mono" style={{ background: "none", border: "none", color: "#8A8D93", fontSize: 12, cursor: "pointer", padding: 8 }}>← Use a different email</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
