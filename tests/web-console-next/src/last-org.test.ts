import {
  defaultOrgDestination,
  resolvePostAuthDestination,
} from "@web-console-next/lib/last-org";

describe("defaultOrgDestination", () => {
  it("routes to the last-used org's Overview when one is remembered", () => {
    expect(defaultOrgDestination("acme")).toBe("/orgs/acme/overview");
  });

  it("falls back to onboarding when none is remembered — there is no org-less landing view", () => {
    expect(defaultOrgDestination(null)).toBe("/onboarding");
  });

  it("lands on the Overview under every profile — Solo and baseline share the home surface", () => {
    // The landing target no longer branches on the profile; the Overview page
    // exists (and is useful) under both Solo and baseline.
    expect(defaultOrgDestination("acme")).toBe("/orgs/acme/overview");
    expect(defaultOrgDestination(null)).toBe("/onboarding");
  });
});

describe("resolvePostAuthDestination", () => {
  const org = (id: string, slug: string, createdAt: string) => ({ id, slug, createdAt });
  const profile = (lastOrgSlug: string | null) => ({
    getProfile: async () => ({ user: { lastOrgSlug } }),
  });
  const failingProfile = {
    getProfile: async (): Promise<{ user: { lastOrgSlug?: string | null } }> => {
      throw new Error("api-key token");
    },
  };

  it("prefers the server-side last-org preference", async () => {
    const dest = await resolvePostAuthDestination({
      auth: profile("acme"),
      organizations: { list: async () => ({ organizations: [] }) },
    });
    expect(dest).toBe("/orgs/acme/overview");
  });

  it("sends a first sign-in (no orgs) to mandatory onboarding", async () => {
    const dest = await resolvePostAuthDestination({
      auth: profile(null),
      organizations: { list: async () => ({ organizations: [] }) },
    });
    expect(dest).toBe("/onboarding");
  });

  it("lands on the account's billing-parent (earliest-created) org when no preference is set", async () => {
    const dest = await resolvePostAuthDestination({
      auth: profile(null),
      organizations: {
        list: async () => ({
          organizations: [
            org("org_b", "beta", "2026-02-01T00:00:00Z"),
            org("org_a", "alpha", "2026-01-01T00:00:00Z"),
          ],
        }),
      },
    });
    expect(dest).toBe("/orgs/alpha/overview");
  });

  it("still resolves via the org list when the profile read fails", async () => {
    const dest = await resolvePostAuthDestination({
      auth: failingProfile,
      organizations: {
        list: async () => ({ organizations: [org("org_a", "alpha", "2026-01-01T00:00:00Z")] }),
      },
    });
    expect(dest).toBe("/orgs/alpha/overview");
  });

  it("falls back to the local cache (empty here) when every read fails", async () => {
    const dest = await resolvePostAuthDestination({
      auth: failingProfile,
      organizations: {
        list: async () => {
          throw new Error("offline");
        },
      },
    });
    // No window/localStorage in this environment, so the cache is empty and the
    // resolver defers to onboarding — which itself forwards once orgs load.
    expect(dest).toBe("/onboarding");
  });
});
