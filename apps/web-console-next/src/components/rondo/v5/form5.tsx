/*
 * form5 — the v5 form primitives: a labelled field with inline validation and
 * the validators the app's forms share.
 *
 * Validation model (the same on every form):
 *   • Never shout at someone mid-typing. A field reports its error only once it
 *     has been "touched" (blurred, or a submit was attempted).
 *   • The message sits under the field it belongs to and names the fix
 *     ("Enter a valid email address"), never a generic "invalid input".
 *   • Server-side failures can be routed to the same slot, so a rejected email
 *     reads identically whether the check was local or remote.
 */
"use client";

import * as React from "react";
import { C5, ink, MONO } from "./kit5";

/* ── validators ──────────────────────────────────────────────────────────── */

/** Pragmatic email check: one @, a dot-bearing domain, no spaces. Deliberately
 *  permissive — the authoritative check is the delivery attempt. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Enter your email address";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address, like you@email.com";
  return null;
}

export function validateCode(raw: string, length = 6): string | null {
  const v = raw.trim();
  if (!v) return `Enter the ${length}-digit code`;
  if (!/^\d+$/.test(v)) return "The code is digits only";
  if (v.length !== length) return `The code is ${length} digits — you've entered ${v.length}`;
  return null;
}

export function validateJoinCode(raw: string, length = 6): string | null {
  const v = raw.trim().toUpperCase();
  if (!v) return "Enter the invite code your captain shared";
  if (v.length !== length) return `Invite codes are ${length} characters — you've entered ${v.length}`;
  return null;
}

export function validateRequired(raw: string, label: string, min = 2, max = 60): string | null {
  const v = raw.trim();
  if (!v) return `${label} is required`;
  if (v.length < min) return `${label} must be at least ${min} characters`;
  if (v.length > max) return `${label} must be ${max} characters or fewer`;
  return null;
}

/** Optional field: empty passes, otherwise it must be a valid email. */
export function validateOptionalEmail(raw: string): string | null {
  return raw.trim() ? validateEmail(raw) : null;
}

/** Optional phone: empty passes, otherwise 7-20 chars of digits/+/-/space/(). */
export function validateOptionalPhone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^[+0-9()\-\s]{7,20}$/.test(v)) return "Enter a valid phone number";
  return null;
}

/* ── field ───────────────────────────────────────────────────────────────── */

export const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  height: 52,
  borderRadius: 16,
  background: C5.card,
  border: `1px solid ${ink(0.14)}`,
  color: C5.ink,
  fontSize: 15,
  fontWeight: 600,
  padding: "0 15px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

/**
 * A labelled input with an inline error slot. `error` is rendered only when
 * truthy, so callers control the "touched" policy; the border and a small
 * warning row turn rust when it is.
 */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label?: string | undefined;
  error?: string | null | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.2, color: ink(0.5), marginBottom: 7 }}>
          {label}
        </div>
      )}
      {children}
      {error ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: C5.rust,
              color: C5.card,
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            !
          </span>
          <span style={{ fontSize: 12, color: C5.rust, lineHeight: 1.35 }}>{error}</span>
        </div>
      ) : hint ? (
        <div style={{ marginTop: 7, fontSize: 11.5, color: ink(0.45), lineHeight: 1.35 }}>{hint}</div>
      ) : null}
    </div>
  );
}

/** The inline error line on its own, for forms that lay out their own labels
 *  and inputs (sheets) rather than using `Field`. Renders nothing when clean. */
export function FieldError({ error }: { error?: string | null | undefined }) {
  if (!error) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: C5.rust,
          color: C5.card,
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        !
      </span>
      <span style={{ fontSize: 11.5, color: C5.rust, lineHeight: 1.35 }}>{error}</span>
    </div>
  );
}

/** The rust border an invalid field wears — spread over `fieldInputStyle`. */
export function invalidBorder(error?: string | null): React.CSSProperties {
  return error ? { border: `1.5px solid ${C5.rust}`, background: "rgba(var(--rk-rust-rgb),.04)" } : {};
}

/* ── form-level banner ───────────────────────────────────────────────────── */

/** A whole-form failure (network, server) that doesn't belong to one field. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      className="rk5-rise"
      style={{
        padding: "11px 14px",
        borderRadius: 14,
        background: "rgba(var(--rk-rust-rgb),.1)",
        border: "1px solid rgba(var(--rk-rust-rgb),.3)",
        color: C5.rust,
        fontSize: 12.5,
        lineHeight: 1.4,
      }}
    >
      {children}
    </div>
  );
}
