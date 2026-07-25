/*
 * RondoLogin — the Rondo sign-in / sign-up (signup == first login), rebuilt on
 * the v5 kit so it matches the rest of the app. One-tap Google (OAuth, when
 * configured) + an email code.
 *
 * Validation is inline and per-field (see form5): the email is checked for
 * shape before we ever call the API, the code is checked for 6 digits, and a
 * server rejection is routed back to the field it belongs to rather than a
 * generic banner. Errors only appear once a field has been touched or a submit
 * attempted, so nobody is scolded mid-typing.
 *
 * Note vs. the canvas: the design shows "phone" + "Apple" chips; the platform's
 * auth is email-code + Google, so those are the functional entry points here.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { wrap } from "@/lib/api";
import { C5, ink, MONO } from "./v5/kit5";
import { Pressable } from "./v5/anim5";
import { Field, FormError, fieldInputStyle, invalidBorder, validateCode, validateEmail } from "./v5/form5";

type Step = "start" | "email" | "code";

export function RondoLogin() {
  const router = useRouter();
  const { client, setToken } = useSession();
  const [providers, setProviders] = React.useState<{ id: string; displayName: string }[]>([]);
  const [step, setStep] = React.useState<Step>("start");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [emailHint, setEmailHint] = React.useState<string | null>(null);
  const [debugCode, setDebugCode] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Per-field: `touched` gates when a validation message may show; `serverError`
  // holds a rejection the API attributed to that field.
  const [touched, setTouched] = React.useState<{ email: boolean; code: boolean }>({ email: false, code: false });
  const [serverEmailError, setServerEmailError] = React.useState<string | null>(null);
  const [serverCodeError, setServerCodeError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void wrap(() => client.auth.listOAuthProviders()).then((r) => {
      if (r.ok) setProviders(r.data.providers.map((p) => ({ id: p.id, displayName: p.displayName })));
    });
  }, [client]);

  const google = providers.find((p) => p.id === "google");

  const emailError = serverEmailError ?? validateEmail(email);
  const codeError = serverCodeError ?? validateCode(code);
  const showEmailError = touched.email ? emailError : null;
  const showCodeError = touched.code ? codeError : null;

  function startOAuth(providerId: string) {
    const returnTo = `${window.location.origin}/rondo/callback`;
    window.location.href = client.auth.oauthStartUrl(providerId, returnTo);
  }

  async function submitEmail() {
    setTouched((t) => ({ ...t, email: true }));
    setServerEmailError(null);
    setFormError(null);
    if (validateEmail(email) || busy) return;
    setBusy(true);
    const r = await wrap(() => client.auth.loginStart({ email: email.trim() }));
    setBusy(false);
    if (!r.ok) {
      // 4xx on this endpoint is about the address itself — show it on the field.
      const msg = r.error.message || "We couldn't send a code to that address.";
      if (r.status && r.status >= 400 && r.status < 500) setServerEmailError(msg);
      else setFormError("Couldn't reach the server. Check your connection and try again.");
      return;
    }
    setChallengeId(r.data.challengeId);
    setEmailHint(r.data.delivery.emailHint);
    setDebugCode(r.data.delivery.code ?? null);
    setCode("");
    setTouched((t) => ({ ...t, code: false }));
    setStep("code");
  }

  async function submitCode() {
    setTouched((t) => ({ ...t, code: true }));
    setServerCodeError(null);
    setFormError(null);
    if (!challengeId || validateCode(code) || busy) return;
    setBusy(true);
    const r = await wrap(() => client.auth.loginComplete({ challengeId, code: code.trim() }));
    setBusy(false);
    if (!r.ok) {
      const msg = r.error.message || "";
      const expired = /expire|not found/i.test(msg);
      if (expired) {
        setServerCodeError("That code has expired — send a new one.");
      } else if (r.status && r.status >= 400 && r.status < 500) {
        setServerCodeError("That code isn't right. Check the digits and try again.");
      } else {
        setFormError("Couldn't reach the server. Check your connection and try again.");
      }
      return;
    }
    setToken(r.data.token);
    router.replace("/rondo");
  }

  async function resend() {
    if (busy) return;
    setServerCodeError(null);
    setFormError(null);
    setBusy(true);
    const r = await wrap(() => client.auth.loginStart({ email: email.trim() }));
    setBusy(false);
    if (!r.ok) {
      setFormError(r.error.message || "Couldn't resend the code. Try again.");
      return;
    }
    setChallengeId(r.data.challengeId);
    setDebugCode(r.data.delivery.code ?? null);
    setCode("");
    setTouched((t) => ({ ...t, code: false }));
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: C5.surface,
        maxWidth: 430,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
        boxSizing: "border-box",
      }}
    >
      {/* pitch hero */}
      <div style={{ margin: "14px 20px 0", height: 250, flex: "none", position: "relative", background: C5.sage, borderRadius: 22, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 14, right: 14, top: 14, bottom: -2, border: `2px solid ${C5.card}`, borderBottom: "none", borderRadius: "8px 8px 0 0" }} />
        <div style={{ position: "absolute", left: "50%", bottom: -60, width: 150, height: 150, border: `2px solid ${C5.card}`, borderRadius: "50%", transform: "translateX(-50%)" }} />
        <div style={{ position: "absolute", left: "50%", top: 14, transform: "translateX(-50%)", width: 150, height: 52, border: `2px solid ${C5.card}`, borderTop: "none" }} />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "58%",
            transform: "translate(-50%,-50%)",
            width: 72,
            height: 72,
            borderRadius: 22,
            background: C5.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 14px 30px -10px rgba(var(--rk-ink-rgb),.5)",
          }}
        >
          <span style={{ fontSize: 34, fontWeight: 700, color: C5.onInk }}>R</span>
        </div>
      </div>

      <div style={{ padding: "24px 26px 0" }}>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.4, color: C5.ink, lineHeight: 1 }}>Rondo</div>
        <div style={{ marginTop: 9, fontSize: 15.5, fontWeight: 500, color: ink(0.72), lineHeight: 1.32 }}>
          Balanced sides.
          <br />
          Every match.
        </div>
        <div style={{ marginTop: 9, fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.5, color: ink(0.45) }}>
          SUNDAY-LEAGUE FOOTBALL, SORTED.
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 24px calc(26px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 11 }}>
        {formError && <FormError>{formError}</FormError>}

        {step === "start" && (
          <>
            <Pressable onClick={() => setStep("email")} style={primaryBtn(C5.ink, C5.surface)}>
              Continue with email
            </Pressable>
            {google && (
              <Pressable onClick={() => startOAuth(google.id)} style={outlineBtn()}>
                <GoogleGlyph /> Continue with Google
              </Pressable>
            )}
            <Pressable
              onClick={() => router.push("/rondo/demo")}
              style={{ textAlign: "center", padding: "7px 0", fontFamily: MONO, fontSize: 10.5, color: C5.green, fontWeight: 700, cursor: "pointer" }}
            >
              EXPLORE A DEMO SQUAD →
            </Pressable>
            <div style={{ textAlign: "center", fontSize: 10.5, color: ink(0.4), lineHeight: 1.5 }}>
              By continuing you agree to the Terms &amp; Privacy Policy.
            </div>
          </>
        )}

        {step === "email" && (
          <>
            <Field label="EMAIL" error={showEmailError} hint="We'll send a 6-digit code — no password needed.">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                autoFocus
                onChange={(e) => {
                  setEmail(e.target.value);
                  setServerEmailError(null);
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                style={{ ...fieldInputStyle, ...invalidBorder(showEmailError) }}
              />
            </Field>
            <Pressable onClick={submitEmail} disabled={busy} style={primaryBtn(C5.green, C5.surface, busy)}>
              {busy ? "Sending…" : "Send me a code"}
            </Pressable>
            <Pressable onClick={() => { setStep("start"); setFormError(null); }} style={backLink}>
              ← Back
            </Pressable>
          </>
        )}

        {step === "code" && (
          <>
            <div style={{ fontSize: 13.5, color: ink(0.6), lineHeight: 1.4, textAlign: "center" }}>
              Enter the 6-digit code sent to <span style={{ color: C5.ink, fontWeight: 700 }}>{emailHint ?? email}</span>.
            </div>
            <Field error={showCodeError}>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={code}
                autoFocus
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setServerCodeError(null);
                }}
                onBlur={() => setTouched((t) => ({ ...t, code: true }))}
                onKeyDown={(e) => e.key === "Enter" && submitCode()}
                style={{
                  ...fieldInputStyle,
                  ...invalidBorder(showCodeError),
                  textAlign: "center",
                  letterSpacing: 8,
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: MONO,
                }}
              />
            </Field>
            {debugCode && (
              <div style={{ fontFamily: MONO, fontSize: 11, color: C5.green, textAlign: "center" }}>DEV CODE: {debugCode}</div>
            )}
            <Pressable onClick={submitCode} disabled={busy} style={primaryBtn(C5.green, C5.surface, busy)}>
              {busy ? "Verifying…" : "Verify & continue"}
            </Pressable>
            <div style={{ display: "flex", gap: 8 }}>
              <Pressable onClick={() => { setStep("email"); setCode(""); setServerCodeError(null); setFormError(null); }} style={{ ...backLink, flex: 1 }}>
                ← Different email
              </Pressable>
              <Pressable onClick={resend} style={{ ...backLink, flex: 1, color: C5.green }}>
                Resend code
              </Pressable>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function primaryBtn(bg: string, fg: string, dim = false): React.CSSProperties {
  return {
    height: 54,
    borderRadius: 17,
    background: bg,
    color: fg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
    opacity: dim ? 0.65 : 1,
  };
}

function outlineBtn(): React.CSSProperties {
  return {
    height: 52,
    borderRadius: 17,
    background: C5.card,
    border: `1px solid ${ink(0.14)}`,
    color: C5.ink,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  };
}

const backLink: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: ink(0.5),
  fontSize: 12,
  cursor: "pointer",
  padding: 9,
  fontFamily: MONO,
  fontWeight: 700,
};

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
