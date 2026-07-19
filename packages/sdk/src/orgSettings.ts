import type { Transport, RequestOptions } from "./transport.js";

function orgBase(orgId: string): string {
  return `/v1/organizations/${encodeURIComponent(orgId)}`;
}

export interface GetOrgSettingsResponse {
  whatsappBridge: boolean;
}

export interface SetOrgSettingsRequest {
  whatsappBridge: boolean;
}

export interface SetOrgSettingsResponse {
  whatsappBridge: boolean;
}

/**
 * Matchmaker org settings resource client (docs/design/rondo-v5-spec.md §4
 * Org settings) — currently just the WhatsApp mirror toggle.
 */
export class OrgSettingsClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/settings — any member. */
  getSettings(orgId: string, opts: RequestOptions = {}): Promise<GetOrgSettingsResponse> {
    return this.transport.request<GetOrgSettingsResponse>(
      { method: "GET", path: `${orgBase(orgId)}/settings` },
      opts,
    );
  }

  /** PUT /v1/organizations/:orgId/settings — manager only. */
  setSettings(
    orgId: string,
    body: SetOrgSettingsRequest,
    opts: RequestOptions = {},
  ): Promise<SetOrgSettingsResponse> {
    return this.transport.request<SetOrgSettingsResponse>(
      { method: "PUT", path: `${orgBase(orgId)}/settings`, body },
      opts,
    );
  }
}
