# Implementation Status — rondo-experience

> Trust code reality over this doc. Where this file and the running system
> disagree, the system is the source of truth and this file is the bug.

## Summary

| ID | Status | Notes |
|----|--------|-------|
| RX0 | Not started | Design system + responsive app shell |
| RX1 | Not started | Auth & onboarding (Login, Join) |
| RX2 | Not started | Squad home + team switcher |
| RX3 | Not started | Rate teammates (voting → OVR) — new backend slice |
| RX4 | Not started | Availability + Play (draft) — new backend slice |
| RX5 | Not started | Live match — new backend slice |
| RX6 | Not started | Fixtures (schedule + results) |
| RX7 | Not started | Manage squad (members) |
| RX8 | Not started | Community (points, leaderboard, feed) — new backend slice |
| RX9 | Not started | Desktop adaptation, theming & a11y |
| RX10 | Not started | Verification & polish |

## As-built

_Nothing shipped yet. This epic is Draft; RX0 is Ready to start._

The charter, the design system + per-screen pixel spec, the extracted prototype
reference, the RX0–RX10 plan, the risk register, and the test plan are authored
(this PR). Implementation begins at RX0.

## Per-screen pixel deviation log

_Populated per milestone as screens land (see `test-plan.md` §1). Each entry:
screen · deviation · one-line justification._

## Verification record

_Populated as milestones are verified (pixel-diff, responsive matrix, live
walkthrough, parity). See `test-plan.md`._

## Open follow-ups

- Answer the open questions in `risks-and-open-questions.md` (Q2/Q6 before RX3;
  Q1/Q5 before RX0/RX9).
- Coordinate the RX3/RX4/RX5/RX8 schema/action additions with
  `../matchmaker/design.md` so the `matchmaker` bounded context is not forked (R2).
