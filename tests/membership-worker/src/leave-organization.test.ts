import { handleLeaveOrganization } from "@membership-worker/handlers/leave";
import type { LeaveOrgDeps } from "@membership-worker/handlers/leave";
import { orgPublicId } from "@membership-worker/ids";
import { asUuid } from "@saas/db/ids";
import type { OrganizationMember, RoleAssignment } from "@saas/db/membership";

const ORG_UUID = asUuid("00000000-0000-0000-0000-0000000000aa");
const ORG_PUBLIC = orgPublicId(ORG_UUID);
const ACTOR = { subjectId: "usr_self", subjectType: "user" };

function member(): OrganizationMember {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    orgId: "00000000-0000-0000-0000-0000000000aa",
    subjectType: "user",
    subjectId: "usr_self",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrganizationMember;
}

function roleRow(role: string): RoleAssignment {
  return { scopeKind: "organization", role, revokedAt: null } as RoleAssignment;
}

interface Opts {
  found?: boolean;
  roles?: string[];
  ownerCount?: number;
}

function deps(o: Opts = {}): LeaveOrgDeps {
  const found = o.found ?? true;
  const roles = (o.roles ?? ["viewer"]).map(roleRow);
  const removed: string[] = [];
  return {
    repo: {
      async getMemberBySubjectId() {
        return found ? { ok: true, value: member() } : { ok: false, error: { kind: "not_found" } };
      },
      async listRoleAssignments() {
        return { ok: true, value: roles };
      },
      async countActiveOwners() {
        return { ok: true, value: o.ownerCount ?? 2 };
      },
      async removeMember() {
        removed.push("x");
        return { ok: true, value: member() };
      },
      async revokeAllRoleAssignments() {
        return { ok: true, value: roles };
      },
    },
  };
}

const env = { PLATFORM_DB: {} } as never;

describe("handleLeaveOrganization", () => {
  it("lets a regular member leave", async () => {
    const res = await handleLeaveOrganization(env, "req_1", ACTOR, ORG_PUBLIC, deps({ roles: ["viewer"] }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { member: { status: string } } };
    expect(json.data.member.status).toBe("removed");
  });

  it("404s when the caller is not a member", async () => {
    const res = await handleLeaveOrganization(env, "req_2", ACTOR, ORG_PUBLIC, deps({ found: false }));
    expect(res.status).toBe(404);
  });

  it("lets an owner leave when another owner remains", async () => {
    const res = await handleLeaveOrganization(env, "req_3", ACTOR, ORG_PUBLIC, deps({ roles: ["owner"], ownerCount: 2 }));
    expect(res.status).toBe(200);
  });

  it("blocks the last owner from leaving", async () => {
    const res = await handleLeaveOrganization(env, "req_4", ACTOR, ORG_PUBLIC, deps({ roles: ["owner"], ownerCount: 1 }));
    expect(res.status).toBe(422);
  });

  it("404s an invalid org id", async () => {
    const res = await handleLeaveOrganization(env, "req_5", ACTOR, "not-an-org", deps());
    expect(res.status).toBe(404);
  });
});
