# Epic — Rondo (focused product)

> **Status:** Active. Supersedes the broad `rondo-experience` epic for the
> current push. Anything in `rondo-experience` not listed here is **deferred**
> and must be **hidden from the UI** (not deleted from history) until revived.

Rondo is a five‑a‑side/practice‑football squad app: a manager runs a squad,
players rate each other, and the manager schedules practice matches with
auto‑balanced teams and gets everyone there via WhatsApp + email. This epic
narrows the product to exactly that loop, makes **Rondo the default app**
(no `/rondo` prefix, no generic‑SaaS console surface), and holds it to a
clean, uncluttered UI.

## In scope (the whole product, for now)

1. **Auth** — proper sign‑up + sign‑in (email code + Google), one smooth entry.
2. **Teams**
   - Create a team, **or** join one (invite code / request‑to‑join).
   - In a joined team, see the **roster and each player's stats**.
   - **Leave a team** at will.
3. **Rating system (manager‑gated voting window)**
   - Every player starts at the **same baseline score**.
   - The **manager opens a voting window**; while open, members rate each
     other (per‑skill stars).
   - Scores **auto‑adjust from the aggregate vote** and feed team creation.
   - The manager can close the window.
4. **Scheduling a practice match** (manager)
   - Pick date/time and the **recipients** of the availability request
     (default: **all players ticked**; manager can untick).
   - Selected players get a **WhatsApp + email** availability request and mark
     themselves **in / maybe / out**.
   - When enough players are **in**, the manager **completes the schedule**.
   - **Venue** = free‑text turf name + a **Google Maps location** (link/URL or
     lat‑lng). *No turf booking in this epic — that is a future goal.*
   - **Auto team creation** by player **score + position** using an efficient
     balancing algorithm; the manager can **regenerate**, **swap players**, and
     **edit the line‑ups at any time — including after the match is scheduled**.
   - On completion, **every player gets a WhatsApp + in‑app notification** with
     the full match details: venue, kick‑off, and **the team they're on**.

## Out of scope — hide from the UI now

News / feed, Rondo points, community / leaderboard, live match scoring, turf
**booking**, and the entire generic **ogpic** SaaS console surface (orgs list,
projects, environments, billing, integrations, webhooks, api‑keys admin, …).
These screens are removed from navigation and routing so the product shows
**only** the loop above. Backend workers that Rondo depends on
(identity/auth, membership, matchmaker, notifications, policy) are **retained** —
"remove ogpic" means the **generic UI surface and product framing**, not the
multi‑tenant backend that powers Rondo (deleting that would break Rondo).

## Architecture decisions

- **Rondo‑first console.** The console app's root (`/`) *is* Rondo. The
  `/rondo/*` routes collapse to `/*` (old paths 301 → new), and the
  `(app)/orgs/**` generic console tree is removed from the build. Navigation is
  trimmed to the focus surfaces (Squad · Rate · Play). One brand: Rondo.
- **Reuse the bounded contexts already built.**
  - *membership* — orgs (= teams), roles, invitations, join‑by‑code /
    request‑to‑join, **+ leave‑team** (self‑removal).
  - *matchmaker* — roster, per‑skill **votes → blended score**, draft/balance
    engine, fixtures + **venue**, availability, **+ rating rounds**,
    **+ recipient‑scoped availability**, **+ editable scheduled line‑ups**.
  - *notifications* — email today; **+ a credential‑gated WhatsApp channel**.
- **Rating rounds.** A per‑team *voting window* (open/closed, opened by the
  manager) gates peer voting. Baseline scores are **equal for everyone**; the
  published score is the vote‑driven blend (extends the existing
  `effectiveRating`). Closing the window freezes scores until the next round.
- **WhatsApp is credential‑gated** (like Google OAuth and email delivery):
  a provider‑agnostic WhatsApp channel that activates only when its
  credentials are configured and **degrades to email‑only** otherwise, so the
  product is fully functional without WhatsApp secrets in dev/CI. Player
  **phone numbers** live on the roster next to the contact email.
- **Venue location** carries a Google Maps value (URL or `lat,lng`) alongside
  the turf name; rendered as a tappable map link. No booking.

## Increment plan (one incremental PR each → review → merge)

1. **Rondo‑first shell + declutter.** Root serves Rondo; drop the `/rondo`
   prefix (redirect old paths); remove the generic console UI and the
   out‑of‑scope Rondo screens; trim the nav to Squad · Rate · Play. No backend
   change. *Deliverable: the app opens straight into Rondo, nothing else.*
2. **Leave team + player‑stats view.** `membership.leaveOrganization`
   (self‑removal, owner‑guarded) wired to a "Leave squad" action; a clean
   per‑player stats panel on the Squad screen.
3. **Rating rounds.** Manager opens/closes a voting window; equal baselines;
   gated peer voting; live score auto‑adjust; a focused **Rate** screen.
4. **Scheduling v2.** Recipient selection (default all); auto‑team generation
   by score + position; swap/regenerate/edit line‑ups **after** scheduling;
   turf name + Google Maps location; the "complete schedule" flow.
5. **WhatsApp + email notifications.** Player phone numbers; the credential‑
   gated WhatsApp channel; availability‑request and schedule‑complete/team
   messages over WhatsApp **and** email + in‑app.
6. **Polish + verification.** End‑to‑end walkthrough (mobile + desktop),
   accessibility + responsive pass, dead‑code removal, and a final
   demo‑ready check that every feature above works.

## Definition of done

Each increment ships behind the platform bar — unit tests, typecheck, lint,
worker dry‑run bundles, `next build`, and the CI matrix green — then is
squash‑merged. The epic is done when a new user can: sign up → create or join a
team → see stats → (manager) open a voting round and everyone rates → schedule
a match with auto‑balanced editable teams → and every selected player is
notified over WhatsApp + email + in‑app — with **no** out‑of‑scope UI visible.

## Progress / as-built

All six increments merged (each behind the full platform bar — unit tests,
typecheck, lint, worker dry-runs, `next build`, CI green):

| # | Increment | PR |
|---|-----------|----|
| 1 | Rondo is the default app; generic console retired from the UI; nav trimmed to **Squad / Rate / Play / Fixtures** | #50 |
| 2 | **Leave a squad** (self-service, last-owner-guarded); player stats confirmed on the Squad screen | #51 |
| 3 | **Rating rounds** — manager-gated voting window, equal-baseline reset, votes auto-adjust the published score, voting locked when closed | #52 |
| 4 | **Scheduling v2** — Google Maps venue + editable line-ups after scheduling (auto-balance already ships via the draft engine) | #53 |
| 5a | **Player phone numbers** (WhatsApp contact) | #54 |
| 5b | **Credential-gated WhatsApp channel** — availability requests fan out over WhatsApp + email; the channel-dispatching provider degrades to local-debug when unconfigured | #55 |

Verified end-to-end with a Playwright walkthrough of the demo loop (desktop +
mobile): root opens into Rondo, the nav shows only Squad / Rate / Play /
Fixtures (no Feed/community), the Squad screen renders the FUT cards + "Create
practice match", and the Rate screen shows the live "VOTING OPEN" round — zero
console errors.

### Deferred (noted in the increment PRs; the core loop works without them)

- Physically deleting the dormant generic-console route tree (`app/(app)/**`)
  and flattening the `/rondo/*` URL prefix to `/*` (increment 1 retired them
  functionally via redirects).
- Manager-selected availability **recipients** (default all) and the two-step
  "complete the schedule" flow (the availability-request send already fans out
  to every reachable player).
- Pre-match **cron reminders** and a dedicated post-schedule line-up editor UI
  (the `update-match` backend already supports editing scheduled line-ups).
- The **live WhatsApp API send** is credential-gated and unverifiable in
  CI/sandbox; the adapter, dispatch, gating, and degradation are covered by
  tests.
