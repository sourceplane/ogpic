/*
 * MWizard — the manager's v5 "New match" screen. Two ways to set up a game:
 *
 *  • Quick match — pick a day + kickoff time (+ optional turf) and schedule it
 *    right now. Uses `vm.onSchedule` (auto-drafts the available squad into two
 *    sides), skipping the availability poll entirely.
 *  • Run a poll — the 3-step flow (times → turfs → deadline) over
 *    `createWizardModel(vm.scheduleWithPoll)`, for when the squad votes on when
 *    and where.
 *
 * Times and turfs are added from a friendly day/time preset picker (or a custom
 * value) and appear as explicit removable chips — no ambiguous "checkbox that
 * deletes when you untick it". The turf-step map panel stays a decorative stub.
 */
"use client";

import * as React from "react";
import { createWizardModel, type PollDeadlineKind, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, MonoLabel } from "./kit5";
import { Pressable } from "./anim5";

const STEP_NAMES = ["TIMES", "TURFS", "DEADLINE"] as const;

const DEADLINES: { kind: PollDeadlineKind; k: string; lbl: string }[] = [
  { kind: "24h", k: "24H", lbl: "AUTO-CLOSE" },
  { kind: "48h", k: "48H", lbl: "AUTO-CLOSE" },
  { kind: "manual", k: "MANUAL", lbl: "YOU CLOSE IT" },
];

/** Common 5-a-side evening kickoff slots (24h). */
const TIME_SLOTS = ["18:00", "19:00", "20:00", "21:00", "22:00"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

interface DayOpt {
  iso: string; // yyyy-mm-dd (local)
  label: string; // Today / Tomorrow / Wed
  sub: string; // 26 Jul
}

/** The next 7 days as selectable options. */
function useNextDays(): DayOpt[] {
  return React.useMemo(() => {
    const out: DayOpt[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push({
        iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short" }),
        sub: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      });
    }
    return out;
  }, []);
}

/** Combine a yyyy-mm-dd day + HH:MM time into a Date (local), or null. */
function combine(day: string | null, time: string | null): Date | null {
  if (!day || !time) return null;
  const d = new Date(`${day}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtSlot(d: Date): string {
  const day = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const hm = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${hm}`;
}

/* ── shared pickers ──────────────────────────────────────────────────────── */

function DayTimePicker({
  day,
  time,
  onDay,
  onTime,
}: {
  day: string | null;
  time: string | null;
  onDay: (iso: string) => void;
  onTime: (t: string) => void;
}) {
  const days = useNextDays();
  return (
    <div>
      <MonoLabel size={8.5} tone={0.5}>PICK A DAY</MonoLabel>
      <div style={{ marginTop: 8, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {days.map((d) => {
          const on = d.iso === day;
          return (
            <Pressable
              key={d.iso}
              onClick={() => onDay(d.iso)}
              style={{
                flex: "none",
                minWidth: 62,
                padding: "9px 12px",
                borderRadius: 14,
                background: on ? C5.green : C5.card,
                border: `1.5px solid ${on ? C5.green : ink(0.14)}`,
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: on ? C5.surface : C5.ink }}>{d.label}</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, marginTop: 2, color: on ? "rgba(245,242,233,.75)" : ink(0.45) }}>
                {d.sub}
              </div>
            </Pressable>
          );
        })}
      </div>

      <MonoLabel size={8.5} tone={0.5} style={{ marginTop: 14 }}>KICKOFF</MonoLabel>
      <div style={{ marginTop: 8, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
        {TIME_SLOTS.map((t) => {
          const on = t === time;
          return (
            <Pressable
              key={t}
              onClick={() => onTime(t)}
              style={{
                padding: "8px 13px",
                borderRadius: 12,
                background: on ? C5.green : C5.card,
                border: `1.5px solid ${on ? C5.green : ink(0.14)}`,
                fontSize: 13,
                fontWeight: 700,
                color: on ? C5.surface : C5.ink,
                cursor: "pointer",
              }}
            >
              {t}
            </Pressable>
          );
        })}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
            height: 36,
            borderRadius: 12,
            background: C5.card,
            border: `1.5px solid ${time && !TIME_SLOTS.includes(time as (typeof TIME_SLOTS)[number]) ? C5.green : ink(0.14)}`,
            cursor: "pointer",
          }}
        >
          <Icon name="calendar" size={13} color={ink(0.5)} />
          <input
            type="time"
            value={time ?? ""}
            onChange={(e) => onTime(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 12.5, color: C5.ink, width: 74 }}
          />
        </label>
      </div>
    </div>
  );
}

/** A removable "added item" chip (pill + ✕). */
function ItemChip({ label, sub, onRemove }: { label: string; sub?: string; onRemove: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 14,
        background: "rgba(30,138,94,.08)",
        border: `1.5px solid ${C5.green}`,
        padding: "10px 10px 10px 14px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>{label}</div>
        {sub && <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45), marginTop: 2 }}>{sub}</div>}
      </div>
      <Pressable
        onClick={onRemove}
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: C5.surface,
          border: `1px solid ${ink(0.14)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C5.rust,
          cursor: "pointer",
          flex: "none",
        }}
        title={`Remove ${label}`}
      >
        <Icon name="x" size={13} stroke={2.6} />
      </Pressable>
    </div>
  );
}

const addBtnStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 13,
  background: C5.ink,
  color: C5.surface,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 44,
  borderRadius: 13,
  background: C5.surface,
  border: `1px solid ${ink(0.14)}`,
  padding: "0 13px",
  fontFamily: "inherit",
  fontSize: 13,
  color: C5.ink,
  outline: "none",
};

/* ── screen ──────────────────────────────────────────────────────────────── */

export function MWizard({ vm, nav, toast }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const [mode, setMode] = React.useState<"quick" | "poll">("quick");

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <Pressable
          onClick={() => nav("matches")}
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
        </Pressable>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>New match</div>
      </div>

      {/* mode segmented control */}
      <div style={{ margin: "14px 24px 0", display: "flex", gap: 6, padding: 4, borderRadius: 16, background: ink(0.05), flex: "none" }}>
        {(["quick", "poll"] as const).map((m) => {
          const on = mode === m;
          return (
            <Pressable
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                background: on ? C5.card : "transparent",
                boxShadow: on ? "0 1px 3px rgba(14,27,20,.12)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                cursor: "pointer",
              }}
            >
              <Icon name={m === "quick" ? "zap" : "matchesBall"} size={14} color={on ? C5.green : ink(0.5)} />
              <span style={{ fontSize: 13, fontWeight: 700, color: on ? C5.ink : ink(0.5) }}>
                {m === "quick" ? "Quick match" : "Run a poll"}
              </span>
            </Pressable>
          );
        })}
      </div>

      {mode === "quick" ? (
        <QuickMatch vm={vm} nav={nav} toast={toast} />
      ) : (
        <PollWizard vm={vm} nav={nav} toast={toast} />
      )}
    </div>
  );
}

/* ── quick match ─────────────────────────────────────────────────────────── */

function QuickMatch({ vm, nav, toast }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const days = useNextDays();
  const [day, setDay] = React.useState<string | null>(days[0]?.iso ?? null);
  const [time, setTime] = React.useState<string | null>("20:00");
  const [turf, setTurf] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const when = combine(day, time);

  const schedule = async () => {
    if (!when) {
      toast("Pick a day and kickoff time.");
      return;
    }
    if (busy) return;
    setBusy(true);
    const ok = await (vm.onSchedule?.({
      scheduledAt: when.toISOString(),
      venue: { name: turf.trim() || null, address: null, booked: false, mapsUrl: null },
    }) ?? Promise.resolve(false));
    setBusy(false);
    if (ok) {
      toast("Match scheduled");
      nav("matches");
    } else {
      toast("Couldn't schedule — you need at least 2 players on the roster.");
    }
  };

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 24px 0" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>Schedule a match now</div>
        <div style={{ marginTop: 4, fontSize: 12, color: ink(0.55) }}>
          No poll — we auto-balance the available squad into two sides.
        </div>

        <div style={{ marginTop: 16 }}>
          <DayTimePicker day={day} time={time} onDay={setDay} onTime={setTime} />
        </div>

        <MonoLabel size={8.5} tone={0.5} style={{ marginTop: 18 }}>TURF (OPTIONAL)</MonoLabel>
        <input
          value={turf}
          onChange={(e) => setTurf(e.target.value)}
          placeholder="e.g. Powerleague Shoreditch"
          style={{ ...inputStyle, marginTop: 8, width: "100%" }}
        />

        {when && (
          <div style={{ marginTop: 18, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(30,138,94,.12)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="calendar" size={18} color={C5.green} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>{fmtSlot(when)}</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45), marginTop: 2 }}>
                {turf.trim() ? turf.trim().toUpperCase() : "VENUE TBC"}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 24px 24px", flex: "none" }}>
        <Pressable
          onClick={schedule}
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
            opacity: when && !busy ? 1 : 0.6,
          }}
        >
          {busy ? "Scheduling…" : "Schedule match"}
        </Pressable>
      </div>
    </>
  );
}

/* ── poll wizard ─────────────────────────────────────────────────────────── */

function PollWizard({ vm, nav, toast }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const wizard = createWizardModel(vm.scheduleWithPoll);
  const days = useNextDays();

  // Step-1 time builder
  const [tDay, setTDay] = React.useState<string | null>(days[0]?.iso ?? null);
  const [tTime, setTTime] = React.useState<string | null>("20:00");
  // Step-2 turf builder
  const [turfInput, setTurfInput] = React.useState("");

  const addTime = () => {
    const d = combine(tDay, tTime);
    if (!d) {
      toast("Pick a day and time first.");
      return;
    }
    // Avoid dupes of the same instant.
    if (wizard.times.some((t) => t.startsAt === d.toISOString())) {
      toast("That slot is already added.");
      return;
    }
    wizard.addTime({ label: fmtSlot(d), startsAt: d.toISOString() });
  };
  const addTurf = () => {
    if (!turfInput.trim()) return;
    wizard.addTurf({ label: turfInput.trim() });
    setTurfInput("");
  };

  const canAdvance =
    wizard.step === 1 ? wizard.validation.hasTime : wizard.step === 2 ? wizard.validation.hasTurf : wizard.validation.valid;
  const btnLabel = wizard.step < 3 ? "Next →" : wizard.publishing ? "Publishing…" : "Publish poll to squad";

  const handleFooter = async () => {
    if (wizard.step < 3) {
      if (!canAdvance) {
        toast(wizard.step === 1 ? "Add at least one time slot." : "Add at least one turf.");
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
    <>
      <div style={{ margin: "14px 24px 0", display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        <div style={{ flex: 1, display: "flex", gap: 5 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: C5.green }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: wizard.step >= 2 ? C5.green : C5.track }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: wizard.step >= 3 ? C5.green : C5.track }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45), flex: "none" }}>
          {wizard.step}/3 · {STEP_NAMES[wizard.step - 1]}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 24px 0" }}>
        {wizard.step === 1 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>Which times could work?</div>
            <div style={{ marginTop: 4, fontSize: 12, color: ink(0.55) }}>Add several — players vote on all of them.</div>

            {wizard.times.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {wizard.times.map((t) => (
                  <ItemChip key={t.id} label={t.label} onRemove={() => wizard.removeTime(t.id)} />
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, borderRadius: 16, border: `2px dashed ${ink(0.18)}`, padding: 14 }}>
              <DayTimePicker day={tDay} time={tTime} onDay={setTDay} onTime={setTTime} />
              <Pressable onClick={addTime} style={{ ...addBtnStyle, marginTop: 14 }}>
                <Icon name="plus" size={15} color={C5.surface} stroke={2.4} /> Add this slot
              </Pressable>
            </div>
          </div>
        )}

        {wizard.step === 2 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>Which turfs are options?</div>
            <div style={{ marginTop: 4, fontSize: 12, color: ink(0.55) }}>Players get directions automatically.</div>

            {wizard.turfs.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {wizard.turfs.map((t) => (
                  <ItemChip key={t.id} label={t.label} {...(t.detail ? { sub: t.detail } : {})} onRemove={() => wizard.removeTurf(t.id)} />
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, borderRadius: 16, border: `2px dashed ${ink(0.18)}`, padding: 14 }}>
              <MonoLabel size={8.5} tone={0.5}>ADD A TURF</MonoLabel>
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
                <Pressable onClick={addTurf} style={{ ...addBtnStyle, padding: "0 16px" }}>
                  <Icon name="plus" size={15} color={C5.surface} stroke={2.4} /> Add
                </Pressable>
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
                  <Pressable
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
                  </Pressable>
                );
              })}
            </div>
            <MonoLabel size={9.5} weight={600} tone={0.5} style={{ marginTop: 18 }}>REVIEW</MonoLabel>
            <div style={{ marginTop: 8, borderRadius: 18, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 16 }}>
              <ReviewRow label="TIMES" value={wizard.times.length ? wizard.times.map((t) => t.label).join(", ") : "—"} />
              <ReviewRow label="TURFS" value={wizard.turfs.length ? wizard.turfs.map((t) => t.label).join(", ") : "—"} />
              <ReviewRow label="POSTS TO" value={`Team chat + push to all ${vm.players.length} members`} />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 24px 24px", flex: "none", display: "flex", gap: 10 }}>
        {wizard.step > 1 && (
          <Pressable
            onClick={() => wizard.back()}
            style={{
              width: 54,
              height: 54,
              borderRadius: 17,
              background: C5.card,
              border: `1px solid ${ink(0.14)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C5.ink,
              cursor: "pointer",
              flex: "none",
            }}
            title="Back a step"
          >
            <Icon name="back" size={18} stroke={2.4} />
          </Pressable>
        )}
        <Pressable
          onClick={handleFooter}
          style={{
            flex: 1,
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
        </Pressable>
      </div>
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: label === "TIMES" ? 0 : 10 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), width: 52, paddingTop: 2, flex: "none" }}>{label}</span>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C5.ink, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}
