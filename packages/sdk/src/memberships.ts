import type {
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  ListInvitationsResponse,
  ListMembersResponse,
  RemoveMemberResponse,
  LeaveOrganizationResponse,
  RevokeInvitationResponse,
  UpdateMemberRoleRequest,
  UpdateMemberRoleResponse,
  JoinByCodeRequest,
  JoinByCodeResponse,
  JoinCodeResponse,
  ListJoinRequestsResponse,
  DecideJoinRequestResponse,
} from "@saas/contracts/membership";

import type { RequestOptions, Transport } from "./transport.js";

/**
 * Memberships resource client.
 *
 * Covers the org-facade member + invitation surface served by
 * `apps/membership-worker`. The flat-method shape mirrors Stripe's
 * `client.invitations.create()` style; sub-resources are namespaced via
 * the verb (`listMembers`, `listInvitations`) so call sites stay grep-able.
 */
export class MembershipsClient {
  constructor(private readonly transport: Transport) {}

  // -------------------------------------------------------------------------
  // Members
  // -------------------------------------------------------------------------

  /** GET /v1/organizations/:orgId/members */
  listMembers(orgId: string, opts: RequestOptions = {}): Promise<ListMembersResponse> {
    return this.transport.request<ListMembersResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/members`,
      },
      opts,
    );
  }

  /** PATCH /v1/organizations/:orgId/members/:memberId */
  updateMemberRole(
    orgId: string,
    memberId: string,
    body: UpdateMemberRoleRequest,
    opts: RequestOptions = {},
  ): Promise<UpdateMemberRoleResponse> {
    return this.transport.request<UpdateMemberRoleResponse>(
      {
        method: "PATCH",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}`,
        body,
      },
      opts,
    );
  }

  /** DELETE /v1/organizations/:orgId/members/:memberId */
  removeMember(
    orgId: string,
    memberId: string,
    opts: RequestOptions = {},
  ): Promise<RemoveMemberResponse> {
    return this.transport.request<RemoveMemberResponse>(
      {
        method: "DELETE",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}`,
      },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/leave — the caller leaves the org (self-removal). */
  leave(orgId: string, opts: RequestOptions = {}): Promise<LeaveOrganizationResponse> {
    return this.transport.request<LeaveOrganizationResponse>(
      { method: "POST", path: `/v1/organizations/${encodeURIComponent(orgId)}/leave` },
      opts,
    );
  }

  // -------------------------------------------------------------------------
  // Invitations
  // -------------------------------------------------------------------------

  /** GET /v1/organizations/:orgId/invitations */
  listInvitations(
    orgId: string,
    opts: RequestOptions = {},
  ): Promise<ListInvitationsResponse> {
    return this.transport.request<ListInvitationsResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/invitations`,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/invitations
   *
   * Pass `idempotencyKey` in `opts` for safe retry semantics.
   */
  createInvitation(
    orgId: string,
    body: CreateInvitationRequest,
    opts: RequestOptions = {},
  ): Promise<CreateInvitationResponse> {
    return this.transport.request<CreateInvitationResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/invitations`,
        body,
      },
      opts,
    );
  }

  /** DELETE /v1/organizations/:orgId/invitations/:invitationId */
  revokeInvitation(
    orgId: string,
    invitationId: string,
    opts: RequestOptions = {},
  ): Promise<RevokeInvitationResponse> {
    return this.transport.request<RevokeInvitationResponse>(
      {
        method: "DELETE",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/invitations/${encodeURIComponent(invitationId)}`,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/invitations/accept
   *
   * Accept an invitation via the one-time token returned at create time.
   */
  acceptInvitation(
    orgId: string,
    body: AcceptInvitationRequest,
    opts: RequestOptions = {},
  ): Promise<AcceptInvitationResponse> {
    return this.transport.request<AcceptInvitationResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/invitations/accept`,
        body,
      },
      opts,
    );
  }

  // -------------------------------------------------------------------------
  // Join by code / request-to-join
  // -------------------------------------------------------------------------

  /** POST /v1/join — request to join a squad by its code (signed-in, cross-org). */
  join(body: JoinByCodeRequest, opts: RequestOptions = {}): Promise<JoinByCodeResponse> {
    return this.transport.request<JoinByCodeResponse>({ method: "POST", path: `/v1/join`, body }, opts);
  }

  /** GET /v1/organizations/:orgId/join-code — read the squad's join code (manager). */
  getJoinCode(orgId: string, opts: RequestOptions = {}): Promise<JoinCodeResponse> {
    return this.transport.request<JoinCodeResponse>(
      { method: "GET", path: `/v1/organizations/${encodeURIComponent(orgId)}/join-code` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/join-code/rotate — mint a new code (manager). */
  rotateJoinCode(orgId: string, opts: RequestOptions = {}): Promise<JoinCodeResponse> {
    return this.transport.request<JoinCodeResponse>(
      { method: "POST", path: `/v1/organizations/${encodeURIComponent(orgId)}/join-code/rotate` },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/join-requests — pending requests (manager). */
  listJoinRequests(orgId: string, opts: RequestOptions = {}): Promise<ListJoinRequestsResponse> {
    return this.transport.request<ListJoinRequestsResponse>(
      { method: "GET", path: `/v1/organizations/${encodeURIComponent(orgId)}/join-requests` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/join-requests/:id/approve (manager). */
  approveJoinRequest(orgId: string, requestId: string, opts: RequestOptions = {}): Promise<DecideJoinRequestResponse> {
    return this.transport.request<DecideJoinRequestResponse>(
      { method: "POST", path: `/v1/organizations/${encodeURIComponent(orgId)}/join-requests/${encodeURIComponent(requestId)}/approve` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/join-requests/:id/decline (manager). */
  declineJoinRequest(orgId: string, requestId: string, opts: RequestOptions = {}): Promise<DecideJoinRequestResponse> {
    return this.transport.request<DecideJoinRequestResponse>(
      { method: "POST", path: `/v1/organizations/${encodeURIComponent(orgId)}/join-requests/${encodeURIComponent(requestId)}/decline` },
      opts,
    );
  }
}
