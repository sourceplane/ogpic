const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

/**
 * Validate an optional player contact email. Returns null when absent; a
 * lowercased, trimmed address when valid; pushes to `fields` on a bad value
 * (and still returns null so the caller can bail on `fields`).
 */
export function validateEmail(raw: unknown, fields: Record<string, string[]>): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > EMAIL_MAX || !EMAIL_RE.test(raw.trim())) {
    fields.email = ["Must be a valid email address"];
    return null;
  }
  return raw.trim().toLowerCase();
}

const PHONE_RE = /^\+?[0-9 ()-]{6,20}$/;

/**
 * Validate an optional player phone number (for WhatsApp). Returns null when
 * absent; a trimmed value when valid; pushes to `fields` on a bad value.
 */
export function validatePhone(raw: unknown, fields: Record<string, string[]>): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !PHONE_RE.test(raw.trim())) {
    fields.phone = ["Must be a valid phone number (digits, spaces, + ( ) -)"];
    return null;
  }
  return raw.trim();
}
