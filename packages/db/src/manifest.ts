import type { MigrationManifest } from "./types.js";

export const manifest: MigrationManifest = {
  version: 1,
  migrations: [
    {
      id: "000_control_baseline",
      context: "control",
      path: "000_control/up.sql",
      checksum:
        "2a5d7f30684c99e3ff441ca8a2c38038dedd1bab4db4a40e92cd36bb22be297f",
      description:
        "Baseline control migration — creates the migration tracking schema",
    },
    {
      id: "010_identity_core",
      context: "identity",
      path: "010_identity_core/up.sql",
      checksum:
        "f8db63c83e2b1b29e6d0b9b133a7db490e2adcfdf26bfc6ce55c63c8a629075d",
      description:
        "Identity persistence foundation — users, auth identities, login challenges, sessions",
    },
    {
      id: "020_membership_core",
      context: "membership",
      path: "020_membership_core/up.sql",
      checksum:
        "50da482998db74431866aa5285737026239a28618017019320ee7bb20e49381d",
      description:
        "Membership persistence foundation — organizations, members, invitations, role assignments",
    },
    {
      id: "030_events_audit_core",
      context: "events",
      path: "030_events_audit_core/up.sql",
      checksum:
        "388aa634380200595ff3a3d15c638e696bf9b93e46330327e84ef10cec8a3f58",
      description:
        "Events/audit persistence foundation — canonical event log and audit entry projections",
    },
    {
      id: "040_projects_core",
      context: "projects",
      path: "040_projects_core/up.sql",
      checksum:
        "d7cb842130856986157629965fd9afba6b36e737e73b125884b64976d2f8b7f6",
      description:
        "Projects persistence foundation — projects and environments tables with tenant isolation",
    },
    {
      id: "050_identity_security_events",
      context: "identity",
      path: "050_identity_security_events/up.sql",
      checksum:
        "a1bb9f50075ea93e389feb7c7282bdbd5b5ebf6671f789b0f7a707110ae74ca2",
      description:
        "Identity-owned security-event source facts — pre-organization user activity log",
    },
    {
      id: "060_identity_api_keys",
      context: "identity",
      path: "060_identity_api_keys/up.sql",
      checksum:
        "834e71e40f729cdf1cd4db32a4071b62c09fd63c9ea4bbf0c035c15c94ff99a1",
      description:
        "Identity-owned service principals and API keys — org-bound automation actors and credential persistence",
    },
    {
      id: "070_config_settings_flags",
      context: "config",
      path: "070_config_settings_flags/up.sql",
      checksum:
        "be2b60f0ddb6f342a8c9038db602e142a34d36ffa7f7a17f4d218231087d6562",
      description:
        "Config persistence foundation — scoped settings, feature flags, and secret metadata",
    },
    {
      id: "080_webhooks_core",
      context: "webhooks",
      path: "080_webhooks_core/up.sql",
      checksum:
        "bfffc592f82028dd06865833bfd5e8124dbfe51e2e02aecccea4b14b42e9f2a6",
      description:
        "Webhook persistence foundation — endpoints, subscriptions, and delivery attempts",
    },
    {
      id: "090_webhooks_delivery",
      context: "webhooks",
      path: "090_webhooks_delivery/up.sql",
      checksum:
        "a881356b376afd2cccbf326a9bfb7e393e073cd88b3923a38d34907457c39021",
      description:
        "Webhook delivery runtime — fixes event_id type, adds dispatch cursor and delivery indexes",
    },
    {
      id: "100_metering_foundation",
      context: "metering",
      path: "100_metering_foundation/up.sql",
      checksum:
        "d02693e6ec3d76193d58b9038a211c877adbf1c141e4f40d9ca8bb7a78c90930",
      description:
        "Metering persistence foundation — usage records, rollups, quota definitions, and quota violations",
    },
    {
      id: "110_billing_foundation",
      context: "billing",
      path: "110_billing_foundation/up.sql",
      checksum:
        "980564a806e89c0039f012f7c0ec49267920aea549b394c5af3712722e4b9f8f",
      description:
        "Billing persistence foundation — provider-neutral plans, billing customers, subscriptions, invoices, and entitlements",
    },
    {
      id: "120_notifications_core",
      context: "notifications",
      path: "120_notifications_core/up.sql",
      checksum:
        "868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb",
      description:
        "Notifications persistence foundation — preferences, notifications, attempts, suppressions",
    },
    {
      id: "130_webhook_secret_rotation_grace",
      context: "webhooks",
      path: "130_webhook_secret_rotation_grace/up.sql",
      checksum:
        "4c5474e7b5ca228adc18ca09b7cd2387938efab8f1e55b675fd4aee6e3ec4e5a",
      description:
        "Dual-secret rotation window — adds previous_secret_{ciphertext,version,expires_at} for grace-period delivery signing",
    },
    {
      id: "140_support_action_records",
      context: "support",
      path: "140_support_action_records/up.sql",
      checksum:
        "50262de186b5ec91797e25532b56cf69028f3975dcc58751c07de6ef1517f190",
      description:
        "Support persistence foundation — append-only audited support-action ledger owned by the admin-support worker",
    },
    {
      id: "150_entitlement_decision_observations",
      context: "billing",
      path: "150_entitlement_decision_observations/up.sql",
      checksum:
        "ba7a1a00ad723752e1bdedc8bcd47c210b24ae18bd3245cb71af84432aefa7f8",
      description:
        "Entitlement-decision observability — append-only, counts-only observation table (org × entitlement key × outcome) owned by the billing context",
    },
    {
      id: "160_identity_user_last_org",
      context: "identity",
      path: "160_identity_user_last_org/up.sql",
      checksum:
        "d102ce426114b032407f6e03ee2e02de65ccb25e4f42df25b340e5a641829dc6",
      description:
        "Per-user last-viewed organization preference (nullable slug hint on identity.users) backing the console's cross-device default landing",
    },
    {
      id: "170_membership_org_parent",
      context: "membership",
      path: "170_membership_org_parent/up.sql",
      checksum:
        "8af612994d6ad4f76e416ec034cdcfc9e2e416bed04c4fde405481627b4093b2",
      description:
        "Optional parent-organization pointer (nullable parent_org_id on membership.organizations) — the dormant seam for the saas-multi-org-billing epic; NULL = standalone, no behavior change",
    },
    {
      id: "180_integrations_foundation",
      context: "integrations",
      path: "180_integrations_foundation/up.sql",
      checksum:
        "e86ac972013587fcd3b04be5c1daa1306a456990ebbb9d30e9b5d79770772497",
      description:
        "Integrations persistence foundation (IG0, dormant) — provider-agnostic connections, GitHub installation facts, repo links with branch→environment maps, the durable inbound-delivery inbox, and the encrypted installation-token cache",
    },
    {
      id: "190_integrations_delivery_attribution",
      context: "integrations",
      path: "190_integrations_delivery_attribution/up.sql",
      checksum:
        "535487194c9c4a129e013282a5f51a5c3e6e2afb3f15c5a0b5f1028e0c5af73f",
      description:
        "Connection pointer on the inbound-delivery inbox (nullable connection_id + partial index) — lets the per-connection delivery log scope precisely; attributed by the IG2 cron drain",
    },
    {
      id: "200_matchmaker_core",
      context: "matchmaker",
      path: "200_matchmaker_core/up.sql",
      checksum:
        "86a9e5b279d7e96dcc2766bb095054b1c9afd81e083460bb392e67757b7cc599",
      description:
        "Matchmaker product persistence foundation — the shared roster (players with computed OVR + attribute sets) and fixtures (matches with immutable lineup snapshots + share token), tenant-isolated by org_id and owned by the matchmaker worker",
    },
    {
      id: "210_matchmaker_availability",
      context: "matchmaker",
      path: "210_matchmaker_availability/up.sql",
      checksum:
        "833bd41a231cf1037d4d3c4eceae383588300b7acd352a96e13fa972b6958a58",
      description:
        "Per-player availability (in/maybe/out) for a community's next practice match, keyed on (org_id, player_id) and owned by the matchmaker worker",
    },
    {
      id: "220_matchmaker_captain",
      context: "matchmaker",
      path: "220_matchmaker_captain/up.sql",
      checksum:
        "de9855849981614f0db41074829edd4d289d367615d0afae26ef0f3a015cef86",
      description:
        "Team captain designation on the roster (is_captain, at most one per org via a partial unique index), owned by the matchmaker worker",
    },
    {
      id: "230_membership_join_requests",
      context: "membership",
      path: "230_membership_join_requests/up.sql",
      checksum:
        "c92bd383b1fda028c200c1dd33b0da7b232487ca6f9a04e95487d9902c95fcb8",
      description:
        "Join-by-code / request-to-join: a shareable rotatable join_code on organizations plus a join_requests table (pending/approved/declined) for manager approval, owned by the membership context",
    },
    {
      id: "240_matchmaker_player_votes",
      context: "matchmaker",
      path: "240_matchmaker_player_votes/up.sql",
      checksum:
        "53dd63f46bb1288a0dbb075fca596a9faa88b899de434f6c45e24927e58f6a86",
      description:
        "Community skill voting on the roster (player_votes, 1-5 stars per member per skill) that blends into a player's published overall rating, owned by the matchmaker worker",
    },
    {
      id: "250_matchmaker_match_venue",
      context: "matchmaker",
      path: "250_matchmaker_match_venue/up.sql",
      checksum:
        "5fb827c313766f5e918d4bf7af46bc1221b76c4ab800276165f388f79a760463",
      description:
        "Practice-match venue on fixtures (venue_name, venue_address, venue_booked) so a manager can record or secure a pitch, owned by the matchmaker worker",
    },
    {
      id: "260_matchmaker_player_email",
      context: "matchmaker",
      path: "260_matchmaker_player_email/up.sql",
      checksum:
        "9ba23b586605c878bd7de6cb58a48743a4aa56d613c67a55dce61a516f2b1a8b",
      description:
        "Optional contact email on roster players (groundwork for match availability-request emails), owned by the matchmaker worker",
    },
    {
      id: "280_matchmaker_rating_rounds",
      context: "matchmaker",
      path: "280_matchmaker_rating_rounds/up.sql",
      checksum:
        "e6212824366a83c1bbc0252706246c0b5a0d85743dba2ab44520ddd0c973ba35",
      description:
        "Manager-gated rating rounds (voting windows; at most one open per org) that gate peer voting on the roster, owned by the matchmaker worker",
    },
  ],
};
