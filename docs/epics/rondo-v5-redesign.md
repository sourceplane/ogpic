# Epic: Rondo v5 "Night-Pitch" redesign — UI + features, end-to-end

**Status:** in progress · **Spec:** [`docs/design/rondo-v5-spec.md`](../design/rondo-v5-spec.md)

Rebuild the Rondo UI to the v5 night-pitch design and ship every feature the
design shows, working end-to-end (UI → SDK → api-edge → workers → Postgres),
delivered as reviewed, CI-green, merged PRs per phase.

## Phases

| # | Deliverable | PR |
|---|---|---|
| 0 | Spec + epic + multi-agent infrastructure (this doc, `.claude/agents/*`) | — |
| 1 | Backend: match polls (times/turfs/votes/deadline/close/finalize), team chat (+reactions+system cards), dropouts (+resolution), org settings (WA bridge), member-role endpoint, policy actions, SDK | — |
| 2 | `@saas/rondo-core`: phases, poll/chat/dropout/wizard/claim VM slices | — |
| 3 | Web UI: full night-pitch rebuild, all manager + player screens | — |
| 4 | Integration verification + feature-map update | — |

Each phase: implement → tests → adversarial review → fix → PR → CI → merge.

## Multi-agent delivery model

Defined in `.claude/agents/` and orchestrated with deterministic workflows:

- **Architect / direction — Fable** (main session): owns this spec, the phase
  boundaries, API contracts, final review, and merges. Writes shared
  foundations that would otherwise conflict (migrations manifest, route
  tables).
- **`rondo-implementer` (Sonnet):** implements one well-scoped work item
  against the spec; runs typecheck/tests for the packages it touches.
- **`rondo-test-writer` (Sonnet):** writes/extends unit tests for a work item
  it did not implement; verifies failure modes, not just happy paths.
- **`rondo-reviewer` (Opus):** adversarial review of a diff against the spec;
  findings are fixed before the PR opens.

Work items within a phase fan out in parallel only when they touch disjoint
files; shared files are laid down first by the architect.

## Feature checklist (from the design)

Manager: login/hub/create/join · home ticket hero + polls chip + dropout
banner · match list w/ phase progress · 3-step wizard · poll detail (votes,
voters, WA tags, close) · finalize slot picker · draft pitch (swap, gap,
redraft) · scheduled ticket + dropout resolution + cancel · team chat (text,
reactions, poll/sched cards, notes, composer + create sheet) · squad
(search/filter/tags) · edit player (position, segments, manager toggle,
remove) · voting window · profile · invite sheet (code, share, WA bridge
toggle) · add-no-app-player sheet.

Player: login/claim/hub · home (OVR chip, RATE NOW, vote-needed chips,
GAMES/GOALS/MOTM) · matches w/ action labels · poll voting (times+turfs,
submit, edit, live results) · waiting states · scheduled (team chip, drop-out
w/ reason, undo, replaced state, lineup) · chat · rate flow (segments, save &
next, closed state) · profile (read-only score) · plus sheet.
