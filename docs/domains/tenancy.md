# Tenancy

The organizational model: organizations (workspaces), members, invitations,
role assignments, teams, and the projects/environments that state and runs
hang off. The invariant every table carries: `org_id` scoping with composite
FKs — cross-tenant reads are a sev-1, never a bug.

Components: `membership-worker`, `projects-worker`.
