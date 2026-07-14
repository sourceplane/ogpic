export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  /**
   * Lifecycle status (e.g. 'active', 'suspended'). Optional — populated by the
   * organization list so the console can surface a frozen-child warning (MO3);
   * other endpoints may omit it.
   */
  status?: string;
  /**
   * The requesting caller's org-scoped role (e.g. 'owner', 'admin', 'member',
   * 'viewer'). Populated by the organization list so the client can gate the UI
   * (manager vs player) without a manager-only probe; omitted elsewhere.
   */
  role?: string;
  /**
   * The squad's shareable join code. Populated by create-organization (minted at
   * bootstrap) so the creator/manager can share it immediately without a second
   * gated read; omitted by other endpoints.
   */
  joinCode?: string;
  createdAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
}

export interface CreateOrganizationResponse {
  organization: PublicOrganization;
  membership: {
    role: string;
    joinedAt: string;
  };
}

export interface ListOrganizationsResponse {
  organizations: PublicOrganization[];
}

export interface GetOrganizationResponse {
  organization: PublicOrganization;
}

export interface PublicMemberRoleAssignment {
  role: string;
  scopeKind: string;
}

export interface PublicMember {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  joinedAt: string;
  roles: PublicMemberRoleAssignment[];
}

export interface ListMembersResponse {
  members: PublicMember[];
}

export const ORGANIZATION_ROLES = ["owner", "admin", "builder", "viewer", "billing_admin"] as const;
export type InvitationRole = (typeof ORGANIZATION_ROLES)[number];

export interface CreateInvitationRequest {
  email: string;
  role: InvitationRole;
}

export interface PublicInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface CreateInvitationResponse {
  invitation: PublicInvitation;
  delivery?: { mode: string; token: string };
}

export interface ListInvitationsResponse {
  invitations: PublicInvitation[];
}

export interface RevokeInvitationResponse {
  invitation: PublicInvitation;
}

export interface UpdateMemberRoleRequest {
  role: string;
}

export interface UpdateMemberRoleResponse {
  member: PublicMember;
}

export interface RemoveMemberResponse {
  member: PublicMember;
}

/** Response for the caller leaving an organization (self-removal). */
export interface LeaveOrganizationResponse {
  member: PublicMember;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface AcceptInvitationResponse {
  invitation: PublicInvitation;
  membership: {
    id: string;
    role: string;
    joinedAt: string;
    status: string;
  };
}

// ── Join by code / request-to-join ──────────────────────────────
// A signed-in user submits a squad's join code → a pending join request the
// manager (owner/admin) approves (creating a viewer membership) or declines.

export type JoinRequestStatus = "pending" | "approved" | "declined";

export interface PublicJoinRequest {
  id: string;
  subjectId: string;
  status: JoinRequestStatus;
  requestedRole: string;
  createdAt: string;
  decidedAt: string | null;
}

/** POST /v1/join — a signed-in user requests to join by code. */
export interface JoinByCodeRequest {
  code: string;
}
export interface JoinByCodeResponse {
  request: PublicJoinRequest;
  orgName: string;
  orgSlug: string;
}

export interface JoinCodeResponse {
  code: string;
}
export interface ListJoinRequestsResponse {
  joinRequests: PublicJoinRequest[];
}
export interface DecideJoinRequestResponse {
  request: PublicJoinRequest;
}
