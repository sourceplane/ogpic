/*
 * v5 sheets that hang off the Chat composer's `+` (design lines 608-693
 * manager / 1097-1119 player, spec §2 screen 12): `PlusSheet` (the Create/
 * Share grid), `InviteSheet` (team code + share/QR + WhatsApp bridge + the
 * no-app add flow) and `AddPlayerSheet5` (name/position/WhatsApp → roster).
 * Presentational — reads `vm` slices, calls `toast`; the host supplies
 * `onPoll`/`onInvite`/`onMyAvailability` for the tiles that hand off to
 * another screen/sheet rather than acting locally.
 */
"use client";

import * as React from "react";
import type { RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, MonoLabel, Sheet, Toggle } from "./kit5";

type Role = "manager" | "player";

/** The Create sheet's "Availability poll" glyph (design line 616) — a bar-
 *  chart path with no equivalent in kit5's `Icon` set, so kept local here. */
function BarsIcon({ color }: { color: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function CreateTile({
  icon,
  iconBg,
  iconFg,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16,
        background: C5.card,
        border: `1px solid ${ink(0.1)}`,
        padding: "13px 6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: iconFg,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: C5.ink, textAlign: "center" }}>{label}</span>
    </div>
  );
}

/* ── Plus / Create sheet ──────────────────────────────────────────────── */

export function PlusSheet({
  vm: _vm,
  open,
  onClose,
  toast,
  role,
  onPoll,
  onInvite,
  onMyAvailability,
}: {
  vm: RondoVM;
  open: boolean;
  onClose: () => void;
  toast: (msg: string) => void;
  role: Role;
  onPoll?: () => void;
  onInvite?: () => void;
  onMyAvailability?: () => void;
}) {
  const stub = (label: string) => () => {
    onClose();
    toast(`${label} (coming soon)`);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink, marginTop: 12 }}>{role === "manager" ? "Create" : "Share"}</div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
        {role === "manager" ? (
          <>
            <CreateTile
              icon={<BarsIcon color={C5.green} />}
              iconBg="rgba(30,138,94,.12)"
              iconFg={C5.green}
              label="Availability poll"
              onClick={() => {
                onClose();
                onPoll?.();
              }}
            />
            <CreateTile
              icon={<Icon name="userPlus" size={17} />}
              iconBg={C5.goldBg}
              iconFg={C5.goldText}
              label="Invite to team"
              onClick={() => {
                onClose();
                onInvite?.();
              }}
            />
            <CreateTile icon={<Icon name="flag" size={17} />} iconBg={ink(0.06)} iconFg={C5.ink} label="Match result" onClick={stub("Match result")} />
            <CreateTile icon={<Icon name="image" size={17} />} iconBg={ink(0.06)} iconFg={C5.ink} label="Photo" onClick={stub("Photo")} />
            <CreateTile icon={<Icon name="mapPin" size={17} />} iconBg={ink(0.06)} iconFg={C5.ink} label="Location" onClick={stub("Location")} />
            <CreateTile icon={<Icon name="megaphone" size={17} />} iconBg={ink(0.06)} iconFg={C5.ink} label="Announcement" onClick={stub("Announcement")} />
          </>
        ) : (
          <>
            <CreateTile icon={<Icon name="image" size={17} />} iconBg={ink(0.06)} iconFg={C5.ink} label="Photo" onClick={stub("Photo")} />
            <CreateTile icon={<Icon name="mapPin" size={17} />} iconBg={ink(0.06)} iconFg={C5.ink} label="Location" onClick={stub("Location")} />
            <CreateTile
              icon={<Icon name="check" size={17} />}
              iconBg="rgba(30,138,94,.12)"
              iconFg={C5.green}
              label="My availability"
              onClick={() => {
                onClose();
                onMyAvailability?.();
              }}
            />
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ── Invite sheet ─────────────────────────────────────────────────────── */

export function InviteSheet({ vm, open, onClose, toast }: { vm: RondoVM; open: boolean; onClose: () => void; toast: (msg: string) => void }) {
  const [addOpen, setAddOpen] = React.useState(false);

  // Mint the team's first code the moment the sheet needs one to show.
  React.useEffect(() => {
    if (open && !vm.joinCode && vm.canManageCode) vm.rotateCode();
  }, [open, vm]);

  React.useEffect(() => {
    if (!open) setAddOpen(false);
  }, [open]);

  const code = vm.joinCode ?? "—";
  const link = `RONDO.APP/JOIN/${code}`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast("Code copied");
    } catch {
      toast("Couldn't copy");
    }
  }

  async function shareInvite() {
    const url = `https://${link.toLowerCase()}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Join ${vm.activeTeamName}`, text: `Join ${vm.activeTeamName} on Rondo — code ${code}`, url });
        return;
      } catch {
        // user dismissed the native sheet — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Couldn't share");
    }
  }

  async function toggleWa() {
    const next = !vm.settings.whatsappBridge;
    const res = await vm.settings.setWhatsappBridge(next);
    toast(res.ok ? (next ? "WhatsApp bridge on" : "WhatsApp bridge off") : res.message ?? "Couldn't update");
  }

  return (
    <>
      <Sheet open={open && !addOpen} onClose={onClose}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink, marginTop: 12 }}>Invite to {vm.activeTeamName}</div>
        <div style={{ fontSize: 11.5, color: ink(0.55), marginTop: 3, lineHeight: 1.45 }}>
          One code per team — anyone with it joins as a player. You approve them in Squad.
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            border: "2px dashed rgba(30,138,94,.5)",
            background: C5.card,
            padding: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: ink(0.45) }}>TEAM CODE</div>
            <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: C5.green, marginTop: 2 }}>{code}</div>
          </div>
          <div
            onClick={copyCode}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 12,
              background: C5.card,
              border: `1px solid ${ink(0.16)}`,
              display: "flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 700,
              color: C5.ink,
              cursor: "pointer",
            }}
          >
            Copy
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <div
            onClick={shareInvite}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 14,
              background: C5.green,
              color: C5.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Icon name="share" size={14} color={C5.surface} /> Share link
          </div>
          <div
            onClick={() => toast("QR code (coming soon)")}
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: C5.card,
              border: `1px solid ${ink(0.14)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C5.ink,
              cursor: "pointer",
            }}
          >
            <Icon name="qr" size={17} />
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            borderRadius: 16,
            background: C5.card,
            border: `1px solid ${ink(0.1)}`,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: C5.wa,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flex: "none",
            }}
          >
            <Icon name="whatsapp" size={17} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C5.ink }}>WhatsApp bridge</div>
            <div style={{ fontSize: 10.5, color: ink(0.5), marginTop: 1, lineHeight: 1.4 }}>
              Polls & lineups mirror to your group — no-app players vote by reply
            </div>
          </div>
          <Toggle on={vm.settings.whatsappBridge} onClick={toggleWa} />
        </div>

        <div onClick={() => setAddOpen(true)} style={{ marginTop: 8, textAlign: "center", fontSize: 11.5, fontWeight: 700, color: C5.green, cursor: "pointer", padding: 4 }}>
          Add a player without the app →
        </div>
        <div style={{ marginTop: 6, textAlign: "center", fontFamily: MONO, fontSize: 8, color: ink(0.4) }}>LINK · {link}</div>
      </Sheet>

      <AddPlayerSheet5 vm={vm} open={open && addOpen} onClose={() => setAddOpen(false)} toast={toast} />
    </>
  );
}

/* ── Add player (no app) sheet ────────────────────────────────────────── */

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
type Position = (typeof POSITIONS)[number];

export function AddPlayerSheet5({ vm, open, onClose, toast }: { vm: RondoVM; open: boolean; onClose: () => void; toast: (msg: string) => void }) {
  const [name, setName] = React.useState("");
  const [pos, setPos] = React.useState<Position>("MID");
  // Optional pre-link: when the manager already knows the player's email/phone,
  // recording them lets the joining member's "claim mine" match this exact
  // roster row instead of minting a duplicate.
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  // Presentational-only: `vm.addPlayer`'s input has no WhatsApp field yet, so
  // this preference doesn't (yet) round-trip to the roster — it just drives
  // the confirmation copy below, matching the design's toggle row.
  const [wa, setWa] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setPos("MID");
      setEmail("");
      setPhone("");
      setWa(true);
      setBusy(false);
    }
  }, [open]);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const res = await vm.addPlayer({
      name: trimmed,
      position: pos,
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
    setBusy(false);
    if (res.ok) {
      toast(wa ? `${trimmed} added — WhatsApp updates on` : `${trimmed} added to the roster`);
      onClose();
    } else {
      toast(res.message ?? "Couldn't add the player");
    }
  }

  const inputStyle: React.CSSProperties = {
    marginTop: 7,
    width: "100%",
    boxSizing: "border-box",
    height: 46,
    borderRadius: 14,
    background: C5.card,
    border: `1px solid ${ink(0.14)}`,
    padding: "0 14px",
    fontFamily: "inherit",
    fontSize: 13.5,
    color: C5.ink,
    outline: "none",
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink, marginTop: 12 }}>Add player without the app</div>
      <div style={{ fontSize: 11.5, color: ink(0.55), marginTop: 3, lineHeight: 1.45 }}>
        They join the roster now. When they sign up later, they claim this exact profile — score and history included.
      </div>

      <MonoLabel size={9} style={{ marginTop: 14 }}>
        NAME
      </MonoLabel>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
        placeholder="e.g. Ben Carter"
        style={inputStyle}
      />

      <MonoLabel size={9} style={{ marginTop: 12 }}>
        POSITION
      </MonoLabel>
      <div style={{ marginTop: 7, display: "flex", gap: 6 }}>
        {POSITIONS.map((p) => {
          const on = p === pos;
          return (
            <div
              key={p}
              onClick={() => setPos(p)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 12,
                background: on ? C5.green : C5.card,
                border: `1px solid ${on ? C5.green : ink(0.12)}`,
                color: on ? C5.surface : ink(0.55),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {p}
            </div>
          );
        })}
      </div>

      <MonoLabel size={9} style={{ marginTop: 12 }}>
        EMAIL · OPTIONAL
      </MonoLabel>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="e.g. ben@example.com"
        style={inputStyle}
      />

      <MonoLabel size={9} style={{ marginTop: 12 }}>
        PHONE · OPTIONAL
      </MonoLabel>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
        type="tel"
        inputMode="tel"
        placeholder="e.g. +1 555 010 1234"
        style={inputStyle}
      />

      <div
        style={{
          marginTop: 12,
          borderRadius: 16,
          background: C5.card,
          border: `1px solid ${ink(0.1)}`,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: C5.wa,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flex: "none",
          }}
        >
          <Icon name="whatsapp" size={15} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C5.ink }}>WhatsApp updates</div>
          <div style={{ fontSize: 10, color: ink(0.5), marginTop: 1 }}>Polls & lineups by message — they vote by reply</div>
        </div>
        <Toggle on={wa} onClick={() => setWa((w) => !w)} />
      </div>

      <div
        onClick={add}
        style={{
          marginTop: 14,
          height: 50,
          borderRadius: 16,
          background: busy ? "rgba(30,138,94,.5)" : C5.green,
          color: C5.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13.5,
          fontWeight: 700,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Adding…" : "Add to roster"}
      </div>
    </Sheet>
  );
}
