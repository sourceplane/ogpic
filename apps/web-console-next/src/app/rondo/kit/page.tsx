/*
 * /rondo/kit — a developer harness that renders the Pitchside v2 UI kit
 * (Phase 1). It exists so the design system can be reviewed and screenshot in
 * isolation before the onboarding / manager / player screens are built on it
 * (Phases 2–4). Not linked from the app; removed or gated before launch.
 */
"use client";

import * as React from "react";
import "../../../styles/rondo-kit.css";
import {
  C,
  ink,
  Avatar,
  BottomNavManager,
  BottomNavPlayer,
  Button,
  Chip,
  FieldRow,
  Icon,
  MapCard,
  MonoLabel,
  PhoneShell,
  PitchCanvas,
  PlayerToken,
  RatingSegments,
  ScreenBody,
  ScreenHeader,
  SectionRow,
  StatusBar,
} from "../../../components/rondo/kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

function Swatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: hex, border: `1px solid ${ink(0.12)}` }} />
      <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.6), textAlign: "center" }}>
        {label}
        <br />
        {hex}
      </div>
    </div>
  );
}

/* eleven pitch tokens laid out as a full XI, reused from the manager/player home */
function SampleXI() {
  return (
    <>
      <PlayerToken initials="RM" name="Menon 87" left="50%" top="12%" />
      <PlayerToken initials="KB" name="Brandt 86" left="15%" top="34%" />
      <PlayerToken initials="SO" name="Okafor 83" left="38%" top="32%" />
      <PlayerToken initials="TN" name="Nowak 79" left="62%" top="32%" />
      <PlayerToken initials="NK" name="Klein 77" left="85%" top="34%" />
      <PlayerToken initials="YD" name="Demir 88" left="15%" top="58%" />
      <PlayerToken initials="AP" name="Pirlo 85" team="gold" left="38%" top="56%" />
      <PlayerToken initials="LF" name="Fernandes 81" team="muted" dimmed left="62%" top="56%" />
      <PlayerToken initials="AH" name="Hassan 80" team="gold" left="85%" top="58%" />
      <PlayerToken initials="DC" name="Costa 84" left="25%" top="81%" />
      <PlayerToken initials="MS" name="Silva 91" captain left="50%" top="83%" />
      <PlayerToken initials="JB" name="Berg 82" left="75%" top="81%" />
    </>
  );
}

export default function RondoKitGallery() {
  const [seg, setSeg] = React.useState(3);
  return (
    <div className="rk rk-gallery">
      {/* ── tokens ── */}
      <div style={{ width: "100%" }}>
        <MonoLabel size={11} style={{ letterSpacing: 2 }}>
          RONDO · PITCHSIDE V2 · UI KIT
        </MonoLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
          <Swatch label="INK" hex={C.ink} />
          <Swatch label="GREEN" hex={C.green} />
          <Swatch label="GOLD" hex={C.gold} />
          <Swatch label="RUST" hex={C.rust} />
          <Swatch label="SURFACE" hex={C.surface} />
          <Swatch label="PITCH" hex={C.pitch} />
          <Swatch label="CARD" hex={C.card} />
          <Swatch label="SEG" hex={C.segEmpty} />
        </div>
      </div>

      {/* ── composition A: pitch home ── */}
      <PhoneShell style={{ minHeight: 0 }}>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Northside FC</span>
            <Icon name="chevronDown" size={14} color={ink(0.5)} stroke={2.4} />
          </div>
          <Avatar initials="DS" size={36} ring={C.gold} bg={C.card} />
        </div>
        <div style={{ padding: "10px 24px 0", display: "flex", gap: 7 }}>
          <Chip variant="gold">MANAGER</Chip>
          <Chip>#4 LOCAL</Chip>
          <Chip variant="green">W·W·W</Chip>
        </div>
        <PitchCanvas style={{ flex: 1, margin: "14px 20px 0", minHeight: 340 }}>
          <SampleXI />
        </PitchCanvas>
        <div style={{ margin: "12px 24px 0" }}>
          <FieldRow icon={<Icon name="pin" size={14} color={C.green} />} right={<span style={{ fontFamily: MONO, fontSize: 9.5, color: C.green, fontWeight: 700 }}>9 IN · 2 MAYBE</span>} height={46} style={{ borderRadius: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600 }}>SAT 18:30 · RIVERSIDE ASTRO</span>
          </FieldRow>
        </div>
        <BottomNavManager active="pitch" />
      </PhoneShell>

      {/* ── composition B: form primitives ── */}
      <PhoneShell style={{ minHeight: 0 }}>
        <StatusBar />
        <ScreenHeader title="Schedule a match" onBack={() => {}} />
        <ScreenBody style={{ padding: "18px 24px 24px" }}>
          <MonoLabel>WHEN</MonoLabel>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <Chip variant="outline" style={{ padding: "8px 14px" }}>17:00</Chip>
            <Chip variant="green" style={{ padding: "8px 14px" }}>18:30</Chip>
            <Chip variant="outline" style={{ padding: "8px 14px" }}>20:00</Chip>
          </div>
          <div style={{ marginTop: 20 }}>
            <MonoLabel>WHERE</MonoLabel>
            <FieldRow
              icon={<Icon name="search" size={15} color={ink(0.45)} />}
              right={<span style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.4) }}>TURF NAME</span>}
              style={{ marginTop: 10 }}
            >
              Riverside Astro
            </FieldRow>
            <MapCard height={160} style={{ marginTop: 10 }} action={
              <div style={{ position: "absolute", right: 10, bottom: 10, height: 34, padding: "0 14px", borderRadius: 12, background: C.card, boxShadow: "0 4px 12px rgba(16,21,17,.15)", display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="send" size={13} color={C.green} stroke={2.2} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>Move pin</span>
              </div>
            } />
          </div>
          <div style={{ marginTop: 22 }}>
            <MonoLabel>RATING · TAP TO SET</MonoLabel>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16, background: C.card, border: `1px solid ${ink(0.1)}`, borderRadius: 20, padding: 20 }}>
              <RatingSegments label="PACE" value={seg} onChange={setSeg} />
              <RatingSegments label="PASSING" value={5} />
              <RatingSegments label="DEFENDING" value={3} />
            </div>
          </div>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <Button variant="green">Schedule &amp; notify squad</Button>
            <Button variant="ink">Join squad</Button>
            <Button variant="outline">Enter code →</Button>
          </div>
          <div style={{ marginTop: 22 }}>
            <SectionRow label="MEMBERS & ROLES" right="13" />
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { i: "DS", n: "D. Silva", chip: <Chip variant="goldSoft">MANAGER</Chip>, ring: C.gold },
                { i: "MS", n: "Marco Silva", chip: <Chip variant="greenSoft">CAPTAIN</Chip> },
                { i: "YD", n: "Yusuf Demir", chip: <span style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>MID</span> },
              ].map((m) => (
                <div key={m.i} style={{ borderRadius: 14, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar initials={m.i} size={34} ring={m.ring} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{m.n}</span>
                  {m.chip}
                </div>
              ))}
            </div>
          </div>
        </ScreenBody>
      </PhoneShell>

      {/* ── composition C: draft split pitch + player nav ── */}
      <PhoneShell style={{ minHeight: 0 }}>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.green }}>HOME</span>
          <span style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, letterSpacing: -2 }}>
            84<span style={{ color: ink(0.3) }}>:</span>83
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust }}>AWAY</span>
        </div>
        <div style={{ alignSelf: "center", marginTop: 6 }}>
          <Chip variant="greenSoft">BALANCED · GAP 1</Chip>
        </div>
        <PitchCanvas variant="split" style={{ flex: 1, margin: "14px 20px 0", minHeight: 360 }}>
          <PlayerToken initials="RM" name="Menon 87" filled team="home" left="50%" top="9%" size={44} />
          <PlayerToken initials="KB" name="Brandt 86" filled team="home" left="27%" top="20%" size={44} />
          <PlayerToken initials="NK" name="Klein 77" filled team="home" left="73%" top="20%" size={44} />
          <PlayerToken initials="DC" name="Costa 84" filled team="home" ring left="50%" top="41%" size={44} />
          <PlayerToken initials="MS" name="Silva 91" captain filled team="away" ring left="50%" top="59%" size={44} />
          <PlayerToken initials="AP" name="Pirlo 85" filled team="away" left="27%" top="68%" size={44} />
          <PlayerToken initials="LF" name="Fernandes 81" filled team="away" left="73%" top="68%" size={44} />
          <PlayerToken initials="SO" name="Okafor 83" filled team="away" left="50%" top="91%" size={44} />
        </PitchCanvas>
        <div style={{ display: "flex", gap: 10, padding: "12px 24px 0" }}>
          <div className="rk-press" style={{ width: 52, height: 52, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon name="refresh" size={18} color={C.ink} />
          </div>
          <Button variant="ink" height={52} radius={16}>Start match</Button>
        </div>
        <BottomNavPlayer active="rate" rateBadge={7} style={{ marginTop: 12 }} />
      </PhoneShell>
    </div>
  );
}
