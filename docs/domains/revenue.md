# Revenue

Money: plans, subscriptions, invoices (via the Polar provider) and the usage
metering that feeds entitlements and quotas. Local rows are a projection of
the provider of record — reconciliation always flows from Polar inward.

Components: `billing-worker`, `metering-worker`.
