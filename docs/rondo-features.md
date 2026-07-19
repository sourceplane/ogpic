# Rondo — Feature Catalogue & Integration Map

Rondo is a five-a-side squad manager delivered as a **PWA web app** (Next.js on
Cloudflare Workers) backed by **Cloudflare Workers + Postgres (Supabase via
Hyperdrive)**. This document lists every feature, where it lives in the code,
and its end-to-end integration path (UI → SDK → api-edge → worker → DB).

Legend — **Status**: ✅ integrated & merged · ⚠️ integrated, verification pending
· 🔧 needs ops config.

---

## 1. Onboarding & Teams

| Feature | Status | UI | Backend path |
|---|---|---|---|
| Sign in / sign up (email code) | ✅ | `rondo-login.tsx` | `auth.loginStart/loginComplete` → identity-worker |
| Google OAuth sign-in | ✅ | `rondo-login.tsx` | `auth.oauthStartUrl` → identity-worker |
| Create team (you become owner/manager) | ✅ | `rondo/new/page.tsx` | `organizations.create` → membership-worker `create-organization` → `membership.organizations` + owner `role_assignments` |
| Invite code minted at creation | ✅ | returned in create response | bootstrap sets `organizations.join_code` |
| Join team by code (request → approval) | ✅ | `rondo/join` | `memberships.joinByCode` → `join_requests`; manager approves → `member` + viewer role |
| Team switcher (multiple squads) | ✅ | `team-switcher.tsx` | `organizations.list` |
| Initial squad picker | ✅ | `team-select.tsx` | `organizations.list` |
| Profile menu (name, my score, appearance, notifications, sign out) | ✅ | `profile-menu.tsx` | `auth.getProfile` / `auth.logout` |

## 2. Roster / Manage Squad (manager)

| Feature | Status | UI | Backend path |
|---|---|---|---|
| Add player (scout) | ⚠️ | `add-player.tsx` | `roster.scout` → matchmaker `create-player` → `matchmaker.players` |
| View & edit player score (attribute sliders) | ✅ | `player-edit.tsx` | `roster.update({attributes})` → `update-player` (OVR = mean) |
| Set captain / release player | ✅ | manage-squad | `roster.setCaptain` / `roster.release` |
| Invite code — view / share / rotate / generate | ⚠️ | settings + manage-squad | `memberships.getJoinCode` / `rotateJoinCode` (read now allowed for all members) |
| Approve / decline join requests | ✅ | manage-squad | `memberships.approve/declineJoinRequest` |
| Link player ↔ account (claim) | ✅ | `claim-sheet.tsx` | `roster.claim` (email match) → `players.subject_id` |
| Leave squad | ✅ | settings | `memberships.leave` |

## 3. Availability

| Feature | Status | UI | Backend path |
|---|---|---|---|
| Manager sets any player's availability | ✅ | pitch tokens | `availability.set` → `matchmaker.availability` |
| Player self-service (claim → in/maybe/out) | ✅ | `player-app.tsx` | `roster.claim` then `availability.set` (self, subject-gated) |
| Waitlist + auto-promote | ✅ | manager Home | computed from availability + capacity (teamSize×2) |
| RSVP reminders before kickoff | ✅ | — (cron) | matchmaker cron `runAvailabilityReminders` → notifications |

## 4. Matches

| Feature | Status | UI | Backend path |
|---|---|---|---|
| Schedule match (when/where) + notify squad | ✅ | schedule screen | `fixtures.schedule` → `create-match` (+ availability notifications) |
| Recurring weekly fixtures (×4/×8) | ✅ | schedule screen | loops `fixtures.schedule` |
| Draft balanced teams by rating | ✅ | draft screen | `draft.run` (stateless split) |
| Save drafted teams onto the match | ✅ | draft screen | `fixtures.update({teamA,teamB})` |
| Auto-start at kickoff | ✅ | — (cron) | matchmaker cron `startDueMatches` → status `live` |
| Manual start (kick off now) | ✅ | draft screen | `fixtures.update({status:"live"})` |
| Record result (full time) | ✅ | manager Home | `fixtures.update({scoreA,scoreB,status:"played"})` |
| Live indicators | ✅ | Home / Games | derived from match status |

## 5. Ratings

| Feature | Status | UI | Backend path |
|---|---|---|---|
| Open / close rating window (manager) | ✅ | Rate view + settings | `roster.open/closeRatingRound` → `rating_rounds` |
| Per-skill anonymous voting | ✅ | Rate view | `roster.castVotes` → `player_votes` |
| Blended OVR (baseline + votes) | ✅ | everywhere | `effectiveRating` in matchmaker engine |

## 6. Engagement

| Feature | Status | UI | Backend path |
|---|---|---|---|
| Player profile / stats (apps, W/D/L, win %, attributes) | ✅ | `player-stats.tsx` | computed client-side from played fixtures |
| Tap a pitch player → stats card | ✅ | Home pitch | — |
| Expandable game results (lineups + ratings) | ✅ | Games view | lineups threaded from fixtures |

## 7. Sharing & Polish

| Feature | Status | UI | Backend path |
|---|---|---|---|
| Share match card (WhatsApp) | ✅ | Games "Next up" | client-side (`wa.me`) |
| Add to calendar (.ics) | ✅ | Games "Next up" | client-side download |
| Dark mode / theming (system/light/dark) | ✅ | profile menu | CSS variables + `data-theme` |
| Notifications (service worker + enable) | ⚠️/🔧 | profile menu | `public/sw.js`; **device push needs VAPID keys (ops)** |
| Static bottom nav + scrollable screens | ✅ | all screens | layout |

---

## Known gaps / follow-ups

- **Add player / invite code (⚠️)** — code paths are correct; a recent fix makes
  add-player surface the real server error instead of failing silently, and the
  join-code read was opened to all members. If these still fail live, the error
  text now shown pinpoints the cause (permission vs validation vs DB). Under
  active verification.
- **Device push (🔧)** — the service worker + client enable flow ship; live push
  delivery needs VAPID keys + a stored subscription + a Workers web-push sender.
- **Goals / MOTM / rating history** — not tracked server-side yet; stats show
  appearances & results only (not fabricated).

## Architecture (one-liner)

TypeScript end-to-end. **Frontend**: Next.js 15 App Router + React 19, TanStack
Query, typed SDK, served as a Cloudflare Worker via OpenNext. The
platform-agnostic Rondo logic + view model lives in **`@saas/rondo-core`**
(pure TS + React hooks, no DOM), so a future React Native / Expo shell can share
it and only re-render — see `packages/rondo-core/README.md`. **Backend**:
per-domain Cloudflare Workers (identity, membership, matchmaker, notifications,
policy) behind an `api-edge` gateway; Postgres via Hyperdrive; RBAC via
`policy-engine`. Monorepo: pnpm + Turborepo.
