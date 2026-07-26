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
import { FormError, validateCode, validateEmail } from "./v5/form5";

// The email form is the entry state — the canvas puts the field on screen
// immediately rather than behind a "Continue with email" step.
type Step = "email" | "code";

export function RondoLogin() {
  const router = useRouter();
  const { client, setToken } = useSession();
  const [providers, setProviders] = React.useState<{ id: string; displayName: string }[]>([]);
  const [step, setStep] = React.useState<Step>("email");
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

  const codeStep = step === "code";

  return (
    <div
      style={{
        // An explicit height, not just min-height: the hero below is sized in
        // percent, and a percentage height only resolves against a parent with
        // a definite height — with min-height alone it collapses to content.
        height: "100dvh",
        minHeight: "100dvh",
        background: C5.bg,
        maxWidth: 430,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* ── floodlit-pitch hero (canvas: 52% of the screen) ─────────────── */}
      <div
        style={{
          flex: "none",
          height: "52%",
          minHeight: 330,
          position: "relative",
          background: "var(--rk-hero-pitch)",
          overflow: "hidden",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* mown stripes */}
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg,var(--rk-hero-line) 0 38px,transparent 38px 76px)", opacity: 0.32 }} />
        {/* centre circle, inner ring, spot and halfway line */}
        <div style={{ position: "absolute", left: "50%", top: "44%", width: 300, height: 300, border: `2px solid var(--rk-hero-line)`, borderRadius: "50%", transform: "translate(-50%,-50%)" }} />
        <div style={{ position: "absolute", left: "50%", top: "44%", width: 186, height: 186, border: `2px solid var(--rk-hero-line)`, borderRadius: "50%", transform: "translate(-50%,-50%)", opacity: 0.8 }} />
        <div style={{ position: "absolute", left: "50%", top: "44%", width: 8, height: 8, borderRadius: "50%", background: "var(--rk-hero-line)", transform: "translate(-50%,-50%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: "44%", height: 2, background: "var(--rk-hero-line)", opacity: 0.8 }} />
        {/* corner arc */}
        <div style={{ position: "absolute", left: -40, bottom: -70, width: 180, height: 180, border: `2px solid var(--rk-hero-line)`, borderRadius: "50%", opacity: 0.7 }} />

        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 24px" }}>
          <div
            style={{
              width: 74,
              height: 74,
              borderRadius: 24,
              background: "var(--rk-crest-grad)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 40px -16px rgba(0,0,0,.7)",
              flex: "none",
            }}
          >
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.5, color: "#F4F6F3" }}>R</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.6, color: "var(--rk-hero-ink)", lineHeight: 1 }}>Rondo</div>
            <div style={{ fontSize: 13.5, color: "var(--rk-hero-ink-soft)", marginTop: 7, maxWidth: 230, lineHeight: 1.4 }}>
              Balanced sides, booked turf, settled costs — one app for your football crew.
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, display: "flex", justifyContent: "center", gap: 7 }}>
          {["FAIR TEAMS", "TURF BOOKING", "SPLIT COSTS"].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: MONO,
                fontSize: 7.5,
                fontWeight: 700,
                letterSpacing: 1,
                color: "var(--rk-hero-ink-soft)",
                background: "var(--rk-hero-chip)",
                borderRadius: 8,
                padding: "5px 9px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── the sheet, overlapping the hero by 26px ─────────────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: -26,
          borderRadius: "28px 28px 0 0",
          background: C5.card,
          boxShadow: "0 -18px 40px -22px rgba(0,0,0,.65)",
          padding: "34px 24px 0",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
        className="rk5-rise"
      >
        <div style={{ width: 38, height: 4, borderRadius: 2, background: ink(0.12), margin: "0 auto 18px", flex: "none" }} />

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>
            {codeStep ? "Check your inbox" : "Get on the pitch"}
          </span>
          <Pressable
            onClick={() => router.push("/rondo/demo")}
            style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: C5.green, background: "rgba(var(--rk-green-rgb),.1)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", flex: "none" }}
          >
            DEMO SQUAD →
          </Pressable>
        </div>

        {formError && <div style={{ marginTop: 12 }}><FormError>{formError}</FormError></div>}

        {!codeStep && (
          <>
            {/* email field — the canvas's phone row, with a mail glyph where the
             *  dial code sits. The platform authenticates by email code, so the
             *  field is an email one; the shape is the canvas's. */}
            <div
              style={{
                marginTop: 14,
                height: 52,
                borderRadius: 16,
                background: C5.surface,
                border: `1.5px solid ${showEmailError ? C5.rust : ink(0.14)}`,
                display: "flex",
                alignItems: "center",
                padding: "0 6px 0 14px",
                gap: 10,
              }}
            >
              <MailGlyph />
              <span style={{ width: 1, height: 20, background: ink(0.15), flex: "none" }} />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setServerEmailError(null);
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  color: C5.ink,
                }}
              />
              <Pressable
                onClick={submitEmail}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  background: email.trim() && !validateEmail(email) ? C5.green : ink(0.14),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flex: "none",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <ArrowGlyph />
              </Pressable>
            </div>
            {showEmailError ? (
              <div style={{ marginTop: 7, fontSize: 11.5, color: C5.rust }}>{showEmailError}</div>
            ) : (
              <div style={{ marginTop: 7, fontFamily: MONO, fontSize: 8, color: ink(0.48), letterSpacing: 0.3 }}>
                WE SEND A 6-DIGIT CODE — NO PASSWORD TO REMEMBER
              </div>
            )}

            {/* The canvas always shows two social buttons under an OR rule. We
             *  render whatever OAuth the deployment actually has configured,
             *  and drop the rule entirely when it has none — an OR divider over
             *  empty space reads as a broken screen. */}
            {providers.length > 0 && (
              <>
                <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, height: 1, background: ink(0.11) }} />
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1.5, color: ink(0.42) }}>OR</span>
                  <span style={{ flex: 1, height: 1, background: ink(0.11) }} />
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 9 }}>
                  {google && (
                    <Pressable onClick={() => startOAuth(google.id)} style={providerBtn()}>
                      <GoogleGlyph /> Google
                    </Pressable>
                  )}
                  {providers
                    .filter((p) => p.id !== "google")
                    .slice(0, 1)
                    .map((p) => (
                      <Pressable key={p.id} onClick={() => startOAuth(p.id)} style={providerBtn()}>
                        {p.displayName}
                      </Pressable>
                    ))}
                </div>
              </>
            )}
          </>
        )}

        {codeStep && (
          <>
            <div style={{ marginTop: 12, fontSize: 13, color: ink(0.6), lineHeight: 1.45 }}>
              Enter the 6-digit code sent to <span style={{ color: C5.ink, fontWeight: 700 }}>{emailHint ?? email}</span>.
            </div>
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
                marginTop: 14,
                height: 58,
                borderRadius: 16,
                background: C5.surface,
                border: `1.5px solid ${showCodeError ? C5.rust : ink(0.14)}`,
                outline: "none",
                textAlign: "center",
                letterSpacing: 8,
                fontSize: 22,
                fontWeight: 700,
                fontFamily: MONO,
                color: C5.ink,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {showCodeError && <div style={{ marginTop: 7, fontSize: 11.5, color: C5.rust }}>{showCodeError}</div>}
            {debugCode && <div style={{ marginTop: 7, fontFamily: MONO, fontSize: 11, color: C5.green }}>DEV CODE: {debugCode}</div>}

            <Pressable
              onClick={submitCode}
              style={{
                marginTop: 14,
                height: 52,
                borderRadius: 15,
                background: C5.green,
                color: C5.onBrand,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                opacity: busy ? 0.65 : 1,
              }}
            >
              {busy ? "Verifying…" : "Verify & continue"}
            </Pressable>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <Pressable
                onClick={() => { setStep("email"); setCode(""); setServerCodeError(null); setFormError(null); }}
                style={sheetLink}
              >
                ← Different email
              </Pressable>
              <Pressable onClick={resend} style={{ ...sheetLink, color: C5.green }}>
                Resend code
              </Pressable>
            </div>
          </>
        )}

        <div style={{ flex: 1, minHeight: 12 }} />
        <div style={{ padding: "16px 0 calc(22px + env(safe-area-inset-bottom))", textAlign: "center", fontSize: 10.5, lineHeight: 1.5, color: ink(0.48) }}>
          By continuing you agree to Rondo&rsquo;s Terms &amp; Privacy.
          <br />
          Already have a team code? Join after signing in.
        </div>
      </div>
    </div>
  );
}

function providerBtn(): React.CSSProperties {
  return {
    flex: 1,
    height: 50,
    borderRadius: 15,
    background: C5.card,
    border: `1.5px solid ${ink(0.14)}`,
    color: C5.ink,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };
}

const sheetLink: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: ink(0.5),
  fontSize: 11,
  cursor: "pointer",
  padding: 9,
  fontFamily: MONO,
  fontWeight: 700,
};

function MailGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--rk-ink)", flex: "none" }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ stroke: "var(--rk-on-brand)" }} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
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
