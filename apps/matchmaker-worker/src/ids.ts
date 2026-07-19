import { uuidFromPublicId, uuidToHex, type Uuid } from "@saas/db/ids";

export function generateRequestId(): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return `req_${hex}`;
}

export function orgPublicId(uuid: string): string {
  return `org_${uuidToHex(uuid)}`;
}

export function parseOrgPublicId(publicId: string): Uuid | null {
  return uuidFromPublicId(publicId, "org");
}

export function playerPublicId(uuid: string): string {
  return `plr_${uuidToHex(uuid)}`;
}

export function parsePlayerPublicId(publicId: string): Uuid | null {
  return uuidFromPublicId(publicId, "plr");
}

export function matchPublicId(uuid: string): string {
  return `mtc_${uuidToHex(uuid)}`;
}

export function parseMatchPublicId(publicId: string): Uuid | null {
  return uuidFromPublicId(publicId, "mtc");
}

export function chatMessagePublicId(uuid: string): string {
  return `cht_${uuidToHex(uuid)}`;
}

export function parseChatMessagePublicId(publicId: string): Uuid | null {
  return uuidFromPublicId(publicId, "cht");
}

export function pollOptionPublicId(uuid: string): string {
  return `opt_${uuidToHex(uuid)}`;
}

export function parsePollOptionPublicId(publicId: string): Uuid | null {
  return uuidFromPublicId(publicId, "opt");
}

/** Opaque share-capability token for a fixture (`sht_<24 hex>`). */
export function generateShareToken(): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return `sht_${hex}`;
}
