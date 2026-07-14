export interface Env {
  PLATFORM_DB?: Hyperdrive;
  POLICY_WORKER?: Fetcher;
  BILLING_WORKER?: Fetcher;
  NOTIFICATIONS_WORKER?: Fetcher;
  ENVIRONMENT: string;
  DEBUG_DELIVERY?: string;
  /**
   * When "true", creating additional organizations is unrestricted — the MO2
   * multi-org billing gate is skipped. Rondo squads are teams, and a user may be
   * in several at once, so there is no per-org paywall. Unset restores the
   * billing-gated behaviour.
   */
  ORG_CREATION_UNRESTRICTED?: string;
}
