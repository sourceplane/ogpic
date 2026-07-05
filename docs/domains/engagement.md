# Engagement

Reaching people and systems: transactional email and Slack delivery with
preferences/rules/throttling, plus outgoing webhooks with signed deliveries
and a replayable inbox. Fire-and-forget from the caller's perspective —
notification failures never fail a request path.

Components: `notifications-worker`, `webhooks-worker`,
`notifications-client`, `webhook-verifier`.
