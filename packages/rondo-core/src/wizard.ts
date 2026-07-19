/*
 * The New-match wizard's state helper (design-reference §2 screen 5): a
 * 3-step draft — times → turfs → deadline — that `publish()`es as a single
 * `scheduleWithPoll` call. Kept as its own hook (rather than folded into
 * `useRondo`) because it's transient per-open-sheet state, not part of the
 * persistent squad view-model; a shell mounts it only while the wizard sheet
 * is open. Pure TypeScript + React (no DOM), matching the package invariant.
 */
"use client";

import * as React from "react";
import type { PollDeadlineKind } from "./logic";

export interface WizardTimeDraft {
  id: string;
  label: string;
  startsAt?: string;
}

export interface WizardTurfDraft {
  id: string;
  label: string;
  detail?: string;
}

export interface WizardValidation {
  hasTime: boolean;
  hasTurf: boolean;
  /** `true` once both steps have at least one option — gates `publish()`. */
  valid: boolean;
}

/** The exact `scheduleWithPoll` payload shape (mirrors the SDK's
 *  `CreateMatchPollInput`, spec §4 `POST /matches` `poll` block). */
export interface ScheduleWithPollPayload {
  times: { label: string; startsAt?: string }[];
  turfs: { label: string; detail?: string }[];
  deadline: PollDeadlineKind;
}

export type ScheduleWithPollFn = (payload: ScheduleWithPollPayload) => Promise<{ ok: boolean; message?: string }>;

export interface WizardModel {
  step: number;
  times: WizardTimeDraft[];
  turfs: WizardTurfDraft[];
  deadline: PollDeadlineKind;
  validation: WizardValidation;
  addTime: (draft: { label: string; startsAt?: string }) => void;
  removeTime: (id: string) => void;
  addTurf: (draft: { label: string; detail?: string }) => void;
  removeTurf: (id: string) => void;
  setDeadline: (kind: PollDeadlineKind) => void;
  /** Advance a step (clamped to 3); the caller still gates on `validation`. */
  next: () => void;
  back: () => void;
  goToStep: (step: number) => void;
  /** Publishes the draft via `scheduleWithPoll`. Resolves `{ ok: false }`
   *  without calling it when the draft is invalid or unconnected. */
  publish: () => Promise<{ ok: boolean; message?: string }>;
  publishing: boolean;
}

let wizardSeq = 0;
function draftId(prefix: string): string {
  wizardSeq += 1;
  return `${prefix}${wizardSeq}`;
}

/**
 * Pure state helper for the new-match wizard. `onPublish` is normally
 * `vm.scheduleWithPoll` from `useRondo` — kept as a plain parameter (rather
 * than reading `RondoSeed` itself) so this hook has zero coupling to the
 * squad view-model and can be unit-tested standalone.
 */
export function createWizardModel(onPublish?: ScheduleWithPollFn): WizardModel {
  const [step, setStep] = React.useState(1);
  const [times, setTimes] = React.useState<WizardTimeDraft[]>([]);
  const [turfs, setTurfs] = React.useState<WizardTurfDraft[]>([]);
  const [deadline, setDeadlineState] = React.useState<PollDeadlineKind>("24h");
  const [publishing, setPublishing] = React.useState(false);

  const addTime = (draft: { label: string; startsAt?: string }) => {
    const label = draft.label.trim();
    if (!label) return;
    setTimes((ts) => [...ts, { id: draftId("t"), label, ...(draft.startsAt ? { startsAt: draft.startsAt } : {}) }]);
  };
  const removeTime = (id: string) => setTimes((ts) => ts.filter((t) => t.id !== id));

  const addTurf = (draft: { label: string; detail?: string }) => {
    const label = draft.label.trim();
    if (!label) return;
    setTurfs((ts) => [...ts, { id: draftId("f"), label, ...(draft.detail ? { detail: draft.detail } : {}) }]);
  };
  const removeTurf = (id: string) => setTurfs((ts) => ts.filter((t) => t.id !== id));

  const setDeadline = (kind: PollDeadlineKind) => setDeadlineState(kind);

  const hasTime = times.length >= 1;
  const hasTurf = turfs.length >= 1;
  const validation: WizardValidation = { hasTime, hasTurf, valid: hasTime && hasTurf };

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const goToStep = (s: number) => setStep(Math.max(1, Math.min(3, s)));

  const publish = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!validation.valid) return { ok: false, message: "Add at least one time and one turf." };
    if (!onPublish) return { ok: false, message: "Not connected." };
    setPublishing(true);
    try {
      return await onPublish({
        times: times.map((t) => ({ label: t.label, ...(t.startsAt ? { startsAt: t.startsAt } : {}) })),
        turfs: turfs.map((t) => ({ label: t.label, ...(t.detail ? { detail: t.detail } : {}) })),
        deadline,
      });
    } finally {
      setPublishing(false);
    }
  };

  return {
    step,
    times,
    turfs,
    deadline,
    validation,
    addTime,
    removeTime,
    addTurf,
    removeTurf,
    setDeadline,
    next,
    back,
    goToStep,
    publish,
    publishing,
  };
}
