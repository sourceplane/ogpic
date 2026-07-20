/*
 * MWizard — the manager's v5 "New match" wizard (design-reference lines
 * 187-264, spec §2 screen 5): 3 steps (times → turfs → deadline+review) over
 * `createWizardModel(vm.scheduleWithPoll)`. Every already-added time/turf
 * draft renders as a "checked" row (tapping it removes it, since the wizard
 * core has no separate toggle-library state — everything listed is, by
 * construction, going out in the poll); "+ Add …" rows take a fresh draft.
 * The turf step's map panel is the spec's explicit stub (§8) — decorative
 * only, no real geocoding.
 */
"use client";

import * as React from "react";
import { createWizardModel, type PollDeadlineKind, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, MonoLabel } from "./kit5";

const STEP_NAMES = ["TIMES", "TURFS", "DEADLINE"] as const;

const DEADLINES: { kind: PollDeadlineKind; k: string; lbl: string }[] = [
  { kind: "24h", k: "24H", lbl: "AUTO-CLOSE" },
  { kind: "48h", k: "48H", lbl: "AUTO-CLOSE" },
  { kind: "manual", k: "MANUAL", lbl: "YOU CLOSE IT" },
];

const rowStyle: React.CSSProperties = {
  borderRadius: 16,
  background: "rgba(30,138,94,.08)",
  border: `1.5px solid ${C5.green}`,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
};

const checkboxStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 7,
  border: `2px solid ${C5.green}`,
  background: C5.green,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 42,
  borderRadius: 13,
  background: C5.surface,
  border: `1px solid ${ink(0.14)}`,
  padding: "0 13px",
  fontFamily: "inherit",
  fontSize: 13,
  color: C5.ink,
  outline: "none",
};

const addBtnStyle: React.CSSProperties = {
  height: 42,
  padding: "0 16px",
  borderRadius: 13,
  background: C5.ink,
  color: C5.surface,
  display: "flex",
  alignItems: "center",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  flex: "none",
};

export function MWizard({ vm, nav, toast }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const wizard = createWizardModel(vm.scheduleWithPoll);
  const [timeInput, setTimeInput] = React.useState("");
  const [turfInput, setTurfInput] = React.useState("");

  // The backend requires a real kickoff instant on at least one option
  // (provisional scheduled_at = earliest startsAt), so times are picked with a
  // datetime input and the design's "Sat 25 Jul · 18:30" label is derived.
  const addTime = () => {
    if (!timeInput) return;
    const d = new Date(timeInput);
    if (Number.isNaN(d.getTime())) return;
    const day = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    const hm = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    wizard.addTime({ label: `${day} · ${hm}`, startsAt: d.toISOString() });
    setTimeInput("");
  };
  const addTurf = () => {
    if (!turfInput.trim()) return;
    wizard.addTurf({ label: turfInput.trim() });
    setTurfInput("");
  };

  const canAdvance =
    wizard.step === 1 ? wizard.validation.hasTime : wizard.step === 2 ? wizard.validation.hasTurf : wizard.validation.valid;
  const btnLabel = wizard.step < 3 ? "Next →" : wizard.publishing ? "Publishing…" : "Publish poll to squad";

  const handleBack = () => {
    if (wizard.step > 1) wizard.back();
    else nav("matches");
  };

  const handleFooter = async () => {
    if (wizard.step < 3) {
      if (!canAdvance) {
        toast("Add at least one to continue.");
        return;
      }
      wizard.next();
      return;
    }
    const res = await wizard.publish();
    if (res.ok) {
      toast("Poll published to squad");
      nav("matches");
    } else {
      toast(res.message ?? "Couldn't publish. Try again.");
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <div
          onClick={handleBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: C5.card,
            border: `1px solid ${ink(0.14)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C5.ink,
            cursor: "pointer",
            flex: "none",
          }}
        >
          <Icon name="back" size={16} stroke={2.4} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>New match</div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45), marginTop: 1 }}>
            STEP {wizard.step} OF 3 · {STEP_NAMES[wizard.step - 1]}
          </div>
        </div>
      </div>

      <div style={{ margin: "12px 24px 0", display: "flex", gap: 5, flex: "none" }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: C5.green }} />
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: wizard.step >= 2 ? C5.green : C5.track }} />
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: wizard.step >= 3 ? C5.green : C5.track }} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 24px 0" }}>
        {wizard.step === 1 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>Which times could work?</div>
            <div style={{ marginTop: 4, fontSize: 12, color: ink(0.55) }}>Add several — players vote on all of them.</div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {wizard.times.map((t) => (
                <div key={t.id} onClick={() => wizard.removeTime(t.id)} style={rowStyle}>
                  <div style={checkboxStyle}>
                    <Icon name="check" size={12} color={C5.surface} stroke={3} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C5.ink }}>{t.label}</span>
                </div>
              ))}
              <div style={{ borderRadius: 16, border: `2px dashed ${ink(0.2)}`, padding: "13px 16px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="datetime-local"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTime();
                    }}
                    style={inputStyle}
                  />
                  <div onClick={addTime} style={addBtnStyle}>
                    Add
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {wizard.step === 2 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>Which turfs are options?</div>
            <div style={{ marginTop: 4, fontSize: 12, color: ink(0.55) }}>
              Name + Google Maps pin. Players get directions automatically.
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {wizard.turfs.map((t) => (
                <div key={t.id} onClick={() => wizard.removeTurf(t.id)} style={rowStyle}>
                  <div style={checkboxStyle}>
                    <Icon name="check" size={12} color={C5.surface} stroke={3} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>{t.label}</div>
                    {t.detail && (
                      <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45), marginTop: 2 }}>{t.detail}</div>
                    )}
                  </div>
                  <Icon name="mapPin" size={15} color={C5.green} stroke={2} />
                </div>
              ))}
              <div style={{ borderRadius: 16, background: C5.card, border: `2px dashed ${ink(0.2)}`, padding: "14px 16px" }}>
                <MonoLabel size={8.5} tone={0.5}>CUSTOM TURF · ANY PITCH, ANYWHERE</MonoLabel>
                <div style={{ marginTop: 9, display: "flex", gap: 8 }}>
                  <input
                    value={turfInput}
                    onChange={(e) => setTurfInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTurf();
                    }}
                    placeholder="Turf name…"
                    style={inputStyle}
                  />
                  <div onClick={addTurf} style={addBtnStyle}>
                    Add
                  </div>
                </div>
                <div
                  onClick={() => toast("Map pin drop — coming soon")}
                  style={{
                    marginTop: 9,
                    borderRadius: 13,
                    overflow: "hidden",
                    border: `1px solid ${ink(0.12)}`,
                    background: "#E7E4D6",
                    position: "relative",
                    height: 86,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "repeating-linear-gradient(0deg,transparent 0 23px,rgba(14,27,20,.05) 23px 24px),repeating-linear-gradient(90deg,transparent 0 23px,rgba(14,27,20,.05) 23px 24px)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "-10%",
                      top: "46%",
                      width: "120%",
                      height: 11,
                      background: "rgba(255,255,255,.75)",
                      transform: "rotate(-6deg)",
                    }}
                  />
                  <div style={{ position: "absolute", left: "50%", top: "54%", transform: "translate(-50%,-100%)" }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: C5.green,
                        border: "3px solid #FFFFFF",
                        boxShadow: "0 4px 10px rgba(14,27,20,.3)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      position: "absolute",
                      left: 8,
                      top: 8,
                      fontFamily: MONO,
                      fontSize: 7.5,
                      letterSpacing: 1,
                      color: ink(0.5),
                      background: "rgba(255,255,255,.85)",
                      padding: "3px 7px",
                      borderRadius: 7,
                    }}
                  >
                    TAP MAP TO DROP PIN MANUALLY
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {wizard.step === 3 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>When does the poll close?</div>
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              {DEADLINES.map((d) => {
                const on = wizard.deadline === d.kind;
                return (
                  <div
                    key={d.kind}
                    onClick={() => wizard.setDeadline(d.kind)}
                    style={{
                      flex: 1,
                      height: 64,
                      borderRadius: 16,
                      background: on ? C5.green : C5.card,
                      border: `1.5px solid ${on ? C5.green : ink(0.14)}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: on ? C5.surface : C5.ink }}>{d.k}</span>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: on ? "rgba(245,242,233,.7)" : ink(0.45) }}>{d.lbl}</span>
                  </div>
                );
              })}
            </div>
            <MonoLabel size={9.5} weight={600} tone={0.5} style={{ marginTop: 18 }}>
              REVIEW
            </MonoLabel>
            <div style={{ marginTop: 8, borderRadius: 18, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), width: 44, paddingTop: 2, flex: "none" }}>TIMES</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C5.ink, lineHeight: 1.5 }}>
                  {wizard.times.length ? wizard.times.map((t) => t.label).join(", ") : "—"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), width: 44, paddingTop: 2, flex: "none" }}>TURFS</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C5.ink, lineHeight: 1.5 }}>
                  {wizard.turfs.length ? wizard.turfs.map((t) => t.label).join(", ") : "—"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), width: 44, paddingTop: 2, flex: "none" }}>POSTS TO</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C5.ink }}>
                  Team chat + push to all {vm.players.length} members
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 24px 24px", flex: "none" }}>
        <div
          onClick={handleFooter}
          style={{
            height: 54,
            borderRadius: 17,
            background: C5.green,
            color: C5.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            opacity: wizard.step < 3 && !canAdvance ? 0.6 : 1,
          }}
        >
          {btnLabel}
        </div>
      </div>
    </div>
  );
}
