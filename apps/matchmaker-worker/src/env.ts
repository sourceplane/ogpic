export interface Env {
  PLATFORM_DB?: Hyperdrive;
  MEMBERSHIP_WORKER?: Fetcher;
  POLICY_WORKER?: Fetcher;
  NOTIFICATIONS_WORKER?: Fetcher;
  ENVIRONMENT: string;
  /** When "true", skips the availability-request enqueue (dev/local flows). */
  DEBUG_DELIVERY?: string;
}
