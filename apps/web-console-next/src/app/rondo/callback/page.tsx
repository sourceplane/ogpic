/*
 * /rondo/callback — the Rondo OAuth return. The identity-worker sets `#token=…`
 * (or `#error=…`) in the fragment; we store the token and route back to /rondo,
 * which resolves the squad. Mirrors /auth/callback but Rondo-branded and
 * Rondo-destined.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../../styles/rondo-kit.css";
import { useSession } from "@/lib/session";

const ERROR_COPY: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  email_required: "Your Google account has no email. Use an email code instead.",
  email_unverified: "Your Google email isn't verified. Use an email code instead.",
  exchange_failed: "Could not complete sign-in with Google. Please try again.",
  identity_failed: "Could not read your profile. Please try again.",
  provider_unavailable: "Google sign-in is temporarily unavailable.",
  oauth_failed: "Something went wrong during sign-in. Please try again.",
  server_error: "Something went wrong on our side. Please try again.",
};

export default function RondoCallbackPage() {
  const router = useRouter();
  const { setToken } = useSession();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(raw);
    const token = params.get("token");
    const err = params.get("error");
    window.history.replaceState(null, "", window.location.pathname);
    if (token) {
      setToken(token);
      router.replace("/rondo");
      return;
    }
    setError(err ?? "oauth_failed");
  }, [router, setToken]);

  return (
    <div className="rk" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center", background: "#F2F4F1" }}>
      <div style={{ width: 56, height: 56, borderRadius: 17, background: "#101511", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#F2F4F1" }}>R</div>
      {error ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#101511" }}>Sign-in failed</div>
          <div style={{ fontSize: 13, color: "rgba(16,21,17,.55)", maxWidth: 300 }}>{ERROR_COPY[error] ?? ERROR_COPY.oauth_failed}</div>
          <button onClick={() => router.replace("/rondo")} style={{ height: 46, padding: "0 20px", borderRadius: 14, background: "#17694A", border: "none", color: "#F2F4F1", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Back to sign in</button>
        </>
      ) : (
        <div style={{ fontFamily: "var(--font-jbmono), ui-monospace, monospace", fontSize: 12, color: "rgba(16,21,17,.5)", letterSpacing: ".5px" }}>Completing sign-in…</div>
      )}
    </div>
  );
}
