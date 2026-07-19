/*
 * The New-match wizard's state helper (design-reference §2 screen 5): a
 * 3-step draft — times → turfs → deadline — that `publish()`es as a single
 * `scheduleWithPoll` call. The state machine is a PURE core (init +
 * transition functions + derivations, unit-testable standalone with no
 * renderer); `createWizardModel` is the thin React-hook wrapper a shell
 * mounts while the wizard sheet is open. Kept out of `useRondo` because it's
 * transient per-open-sheet state, not part of the persistent squad
 * view-model. Pure TypeScript + React (no DOM), matching the package
 * invariant.
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

/** The wizard's whole draft as a plain value — every transition below returns
 *  a new state, so the core is renderer-free and directly unit-testable. */
export interface WizardState {
  step: number;
  times: WizardTimeDraft[];
  turfs: WizardTurfDraft[];
  deadline: PollDeadlineKind;
  /** Monotonic draft-id counter, kept in-state so transitions stay pure. */
  seq: number;
}

export function wizardInit(): WizardState {
  return { step: 1, times: [], turfs: [], deadline: "24h", seq: 0 };
}

export function wizardAddTime(state: WizardState, draft: { label: string; startsAt?: string }): WizardState {
  const label = draft.label.trim();
  if (!label) return state;
  const seq = state.seq + 1;
  return {
    ...state,
    seq,
    times: [...state.times, { id: `t${seq}`, label, ...(draft.startsAt ? { startsAt: draft.startsAt } : {}) }],
  };
}

export function wizardRemoveTime(state: WizardState, id: string): WizardState {
  return { ...state, times: state.times.filter((t) => t.id !== id) };
}

export function wizardAddTurf(state: WizardState, draft: { label: string; detail?: string }): WizardState {
  const label = draft.label.trim();
  if (!label) return state;
  const seq = state.seq + 1;
  return {
    ...state,
    seq,
    turfs: [...state.turfs, { id: `f${seq}`, label, ...(draft.detail ? { detail: draft.detail } : {}) }],
  };
}

export function wizardRemoveTurf(state: WizardState, id: string): WizardState {
  return { ...state, turfs: state.turfs.filter((t) => t.id !== id) };
}

export function wizardSetDeadline(state: WizardState, kind: PollDeadlineKind): WizardState {
  return { ...state, deadline: kind };
}

export function wizardNext(state: WizardState): WizardState {
  return { ...state, step: Math.min(3, state.step + 1) };
}

export function wizardBack(state: WizardState): WizardState {
  return { ...state, step: Math.max(1, state.step - 1) };
}

export function wizardGoToStep(state: WizardState, step: number): WizardState {
  return { ...state, step: Math.max(1, Math.min(3, step)) };
}

export function wizardValidation(state: WizardState): WizardValidation {
  const hasTime = state.times.length >= 1;
  const hasTurf = state.turfs.length >= 1;
  return { hasTime, hasTurf, valid: hasTime && hasTurf };
}

/** The publish payload for a (valid) draft — ids stripped, optionals only
 *  present when set (exactOptionalPropertyTypes-safe). */
export function wizardPayload(state: WizardState): ScheduleWithPollPayload {
  return {
    times: state.times.map((t) => ({ label: t.label, ...(t.startsAt ? { startsAt: t.startsAt } : {}) })),
    turfs: state.turfs.map((t) => ({ label: t.label, ...(t.detail ? { detail: t.detail } : {}) })),
    deadline: state.deadline,
  };
}

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

/**
 * React-hook wrapper over the pure wizard core. `onPublish` is normally
 * `vm.scheduleWithPoll` from `useRondo` — kept as a plain parameter (rather
 * than reading `RondoSeed` itself) so the wizard has zero coupling to the
 * squad view-model.
 */
export function createWizardModel(onPublish?: ScheduleWithPollFn): WizardModel {
  const [state, setState] = React.useState<WizardState>(wizardInit);
  const [publishing, setPublishing] = React.useState(false);

  const validation = wizardValidation(state);

  const publish = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!validation.valid) return { ok: false, message: "Add at least one time and one turf." };
    if (!onPublish) return { ok: false, message: "Not connected." };
    setPublishing(true);
    try {
      return await onPublish(wizardPayload(state));
    } finally {
      setPublishing(false);
    }
  };

  return {
    step: state.step,
    times: state.times,
    turfs: state.turfs,
    deadline: state.deadline,
    validation,
    addTime: (draft) => setState((s) => wizardAddTime(s, draft)),
    removeTime: (id) => setState((s) => wizardRemoveTime(s, id)),
    addTurf: (draft) => setState((s) => wizardAddTurf(s, draft)),
    removeTurf: (id) => setState((s) => wizardRemoveTurf(s, id)),
    setDeadline: (kind) => setState((s) => wizardSetDeadline(s, kind)),
    next: () => setState(wizardNext),
    back: () => setState(wizardBack),
    goToStep: (step) => setState((s) => wizardGoToStep(s, step)),
    publish,
    publishing,
  };
}
