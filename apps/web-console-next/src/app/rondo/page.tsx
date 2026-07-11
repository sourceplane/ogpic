/*
 * /rondo — the Rondo entry gate (Feature 1). Signed out → the Rondo-branded
 * sign-in / sign-up (Google + email). Signed in → route to the caller's squad
 * (/rondo/:orgSlug); to team creation when they have none (Feature 2). The
 * token-free preview is at /rondo/demo.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../styles/rondo.css";
import { RondoLogin } from "@/components/rondo/rondo-login";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { wrap } from "@/lib/api";

export default function RondoEntryPage() {
  const router = useRouter();
  const { token, client } = useSession();
  const [ready, setReady] = React.useState(false);

  // Avoid a flash of the login while the stored token hydrates.
  React.useEffect(() => setReady(true), []);

  const orgs = useApiQuery(
    qk.orgs(),
    () => wrap(async () => (await client.organizations.list()).organizations),
    { enabled: !!token },
  );

  React.useEffect(() => {
    if (!token || !orgs.data) return;
    if (orgs.data.length === 0) {
      router.replace("/rondo/new");
    } else {
      router.replace(`/rondo/${orgs.data[0]!.slug}`);
    }
  }, [token, orgs.data, router]);

  if (!ready) return <RondoBoot />;
  if (token) return <RondoBoot label="Finding your squad…" />;
  return <RondoLogin />;
}

function RondoBoot({ label = "" }: { label?: string }) {
  return (
    <div className="rondo-root" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--r-bg)" }}>
      <div style={{ width: 56, height: 56, borderRadius: 17, background: "linear-gradient(150deg,#1E2228,#101215)", border: "1px solid rgba(86,201,141,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#F4F3F0" }}>R</div>
      {label && <div className="rondo-mono" style={{ fontSize: 12, color: "#8A8D93", letterSpacing: ".5px" }}>{label}</div>}
    </div>
  );
}
