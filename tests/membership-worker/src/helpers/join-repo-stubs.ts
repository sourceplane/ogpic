import type { MembershipRepository } from "@saas/db/membership";

/**
 * No-op stubs for the join-code / join-request repository methods. Spread into
 * the various in-memory fake repositories so they satisfy the extended
 * MembershipRepository interface without each test caring about the join flow
 * (which has its own dedicated suite).
 */
export const joinRepoStubs: Pick<
  MembershipRepository,
  | "getOrganizationByJoinCode"
  | "setOrganizationJoinCode"
  | "createJoinRequest"
  | "listJoinRequests"
  | "approveJoinRequest"
  | "declineJoinRequest"
> = {
  async getOrganizationByJoinCode() {
    return { ok: false, error: { kind: "not_found" } };
  },
  async setOrganizationJoinCode() {
    return { ok: false, error: { kind: "not_found" } };
  },
  async createJoinRequest() {
    return { ok: false, error: { kind: "not_found" } };
  },
  async listJoinRequests() {
    return { ok: true, value: [] };
  },
  async approveJoinRequest() {
    return { ok: false, error: { kind: "not_found" } };
  },
  async declineJoinRequest() {
    return { ok: false, error: { kind: "not_found" } };
  },
};
