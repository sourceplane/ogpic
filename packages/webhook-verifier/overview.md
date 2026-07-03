# Webhook Verifier

Verifies signatures on inbound webhooks for the Ogpic platform. It provides the
shared logic used to authenticate webhook payloads before they are trusted and
processed.

## Responsibilities
- Verify signatures on inbound webhook requests.
- Provide a reusable primitive for webhook-consuming components.
- Reject payloads that fail signature validation.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
