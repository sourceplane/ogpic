// Position + attribute rules for the roster. Pure, dependency-free.

import type { PlayerPosition } from "@saas/contracts/matchmaker";
import {
  GK_ATTRIBUTE_KEYS,
  OUTFIELD_ATTRIBUTE_KEYS,
  PLAYER_POSITIONS,
} from "@saas/contracts/matchmaker";

export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 99;

export function isPlayerPosition(value: unknown): value is PlayerPosition {
  return typeof value === "string" && (PLAYER_POSITIONS as readonly string[]).includes(value);
}

/** The six attribute keys a given position class must carry. */
export function expectedKeysForPosition(position: PlayerPosition): readonly string[] {
  return position === "GK" ? GK_ATTRIBUTE_KEYS : OUTFIELD_ATTRIBUTE_KEYS;
}

export type AttributeValidation =
  | { valid: true; attributes: Record<string, number> }
  | { valid: false; reason: string };

/**
 * Validate an attributes object against the position's expected key set. Every
 * expected key must be present as an integer in [1, 99], and no unexpected keys
 * may appear. GK positions require the GK key set; all others the outfield set.
 */
export function validateAttributes(position: PlayerPosition, raw: unknown): AttributeValidation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, reason: "attributes must be an object" };
  }
  const expected = expectedKeysForPosition(position);
  const input = raw as Record<string, unknown>;
  const keys = Object.keys(input);

  const unexpected = keys.filter((k) => !expected.includes(k));
  if (unexpected.length > 0) {
    return { valid: false, reason: `unexpected attribute keys: ${unexpected.join(", ")}` };
  }

  const attributes: Record<string, number> = {};
  for (const key of expected) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < ATTRIBUTE_MIN || value > ATTRIBUTE_MAX) {
      return { valid: false, reason: `attribute ${key} must be an integer between ${ATTRIBUTE_MIN} and ${ATTRIBUTE_MAX}` };
    }
    attributes[key] = value;
  }
  return { valid: true, attributes };
}

/**
 * Best-fit outfield position from a set of outfield attributes. Mirrors the
 * seed app's `detectSuggestedPosition` heuristic verbatim; never returns GK
 * (goalkeeper is always an explicit choice).
 */
export function suggestPosition(attributes: Record<string, number>): PlayerPosition {
  const PAC = attributes.PAC ?? 0;
  const SHO = attributes.SHO ?? 0;
  const PAS = attributes.PAS ?? 0;
  const DRI = attributes.DRI ?? 0;
  const DEF = attributes.DEF ?? 0;
  // PAC/PHY are read for completeness but do not drive the heuristic.
  void PAC;

  if (DEF >= 80 && DEF > SHO && DEF > PAS) return "DEF";
  if (SHO >= 80 && SHO > DEF) return "FWD";
  if (PAS >= 78 && DRI >= 78) return "MID";
  return "ALL";
}
