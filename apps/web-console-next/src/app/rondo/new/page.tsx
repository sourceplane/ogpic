/*
 * /rondo/new — create a team (canvas 2a "CREATE TEAM"), rebuilt on the Pitchside
 * v2 kit. A team is an organization; the creator becomes its owner (the
 * "manager"). The name is persisted via client.organizations.create; crest
 * colour / format / home-ground are captured in the UI and persisted in a later
 * phase (the create contract carries name today). On success it shows the invite
 * step (canvas "INVITE YOUR SQUAD") with the real join code.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../../styles/rondo-kit.css";
import { useSession } from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import { wrap } from "@/lib/api";
import { qk } from "@/lib/query";
import { useRequireAuth } from "@/lib/use-async";
import {
  C,
  ink,
  green,
  PhoneShell,
  StatusBar,
  ScreenBody,
  ScreenHeader,
  MonoLabel,
  Button,
  FieldRow,
  Icon,
  MapCard,
} from "@/components/rondo/kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";
const CRESTS = ["#17694A", "#101511", "#C9A24B", "#B0512F", "#FFFFFF"];
const FORMATS = ["5", "6", "7", "11"];

function initialsOf(name: string): string {
  const t = name.trim();
  if (!t) return "N";
  const parts = t.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || t[0]!.toUpperCase();
}

export default function RondoNewTeamPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const { client } = useSession();
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [crest, setCrest] = React.useState(0);
  const [format, setFormat] = React.useState(1); // "6"
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ slug: string; name: string; code: string | null } | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await wrap(() => client.organizations.create({ name: name.trim() }));
    if (!r.ok) {
      setBusy(false);
      setError(r.error.message || "Could not create the team. Try again.");
      return;
    }
    await qc.invalidateQueries({ queryKey: qk.orgs() });
    // The create response now carries the minted join code directly; fall back
    // to the manager getJoinCode probe only if an older API omits it.
    const org = r.data.organization as { id: string; slug: string; name: string; joinCode?: string };
    let code: string | null = org.joinCode ?? null;
    if (!code) {
      const res = await wrap(() => client.memberships.getJoinCode(org.id));
      code = res.ok ? ((res.data as { code?: string }).code ?? null) : null;
    }
    setBusy(false);
    setCreated({ slug: org.slug, name: org.name, code });
  }

  function copyCode() {
    if (!created?.code) return;
    void navigator.clipboard?.writeText(created.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  if (!ready) return null;

  const initials = initialsOf(name);

  /* ── invite step (post-create) ── */
  if (created) {
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "22px 26px 0" }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.7, color: C.ink }}>{created.name} is live 🎉</div>
          <div style={{ marginTop: 6, fontSize: 13.5, color: ink(0.55) }}>Share the code — players join from their phones.</div>
        </div>
        <div style={{ margin: "22px 24px 0", borderRadius: 20, background: C.card, border: `2px dashed ${green(0.5)}`, padding: 22, textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 2, color: ink(0.45) }}>INVITE CODE</div>
          <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, letterSpacing: 4, color: C.green, marginTop: 8 }}>
            {created.code ?? "— — —"}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center" }}>
            <div
              onClick={copyCode}
              className="rk-press"
              style={{ height: 42, padding: "0 20px", borderRadius: 14, background: C.green, color: C.onDark, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}
            >
              <Icon name="copy" size={14} /> {copied ? "Copied" : "Copy code"}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: "0 24px 26px" }}>
          <Button variant="ink" onClick={() => router.replace(`/rondo/${created.slug}`)}>
            Go to the pitch →
          </Button>
        </div>
      </PhoneShell>
    );
  }

  /* ── create form ── */
  return (
    <PhoneShell>
      <StatusBar />
      <ScreenHeader title="Create your team" onBack={() => router.replace("/rondo/start")} />
      <ScreenBody style={{ padding: "20px 24px 26px" }}>
        <MonoLabel>TEAM NAME</MonoLabel>
        <FieldRow
          active={!!name}
          height={54}
          style={{ marginTop: 8 }}
          right={<span style={{ width: 2, height: 20, background: C.green }} />}
        >
          <input
            value={name}
            autoFocus
            placeholder="Northside FC"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: C.ink }}
          />
        </FieldRow>

        <div style={{ marginTop: 18 }}>
          <MonoLabel>CREST COLOUR</MonoLabel>
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            {CRESTS.map((c, i) => (
              <div
                key={c}
                onClick={() => setCrest(i)}
                className="rk-press"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: c,
                  border: c === "#FFFFFF" ? `1px solid ${ink(0.14)}` : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: c === "#FFFFFF" || c === "#C9A24B" ? C.ink : C.onDark,
                  boxShadow: crest === i ? `0 0 0 3px ${C.surface}, 0 0 0 5px ${c === "#FFFFFF" ? ink(0.3) : c}` : undefined,
                }}
              >
                {initials[0]}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <MonoLabel>USUAL FORMAT · PER SIDE</MonoLabel>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            {FORMATS.map((f, i) => (
              <div
                key={f}
                onClick={() => setFormat(i)}
                className="rk-press"
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 14,
                  background: format === i ? C.ink : C.card,
                  border: format === i ? "none" : `1px solid ${ink(0.12)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: format === i ? C.onDark : ink(0.55),
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <MonoLabel>HOME GROUND</MonoLabel>
          <FieldRow icon={<Icon name="pin" size={15} color={ink(0.45)} />} height={50} style={{ marginTop: 8 }}>
            Riverside Astro
          </FieldRow>
          <MapCard height={130} style={{ marginTop: 10 }} />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11.5, color: ink(0.55) }}>Wapping Wall, London E1W</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Change location</span>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(176,81,47,.12)", border: "1px solid rgba(176,81,47,.3)", color: C.rust, fontSize: 12.5 }}>{error}</div>
        )}

        <div style={{ marginTop: 22 }}>
          <Button variant="green" onClick={create} disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create team →"}
          </Button>
        </div>
      </ScreenBody>
    </PhoneShell>
  );
}
