# Identity & access

Who you are and what you may do: authentication (users, sessions, API keys,
OAuth) and deny-by-default authorization. Owned end to end by the identity and
policy workers with the pure policy-engine library between them.

**Boundary:** identity never knows about tenancy shapes or product features —
it answers "who is this?" and "may they?", nothing else. Membership assembles
the authorization facts; policy evaluates them.

Components: `identity-worker`, `policy-worker`, `policy-engine`.
