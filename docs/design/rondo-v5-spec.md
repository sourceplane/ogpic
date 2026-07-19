# Rondo v5 — "Night-Pitch" Design & Feature Spec

Source of truth for the v5 redesign epic. Derived from the Claude Design
project *Football Matcher App Design → Rondo v5.dc.html* (imported 2026-07-19;
local copy kept by the architect). Every implementation agent works against
THIS document — when in doubt, match the design file's numbers exactly.

---

## 1. Design tokens

| Token | Value | Use |
|---|---|---|
| `paper` | `#E9E4D8` | page background |
| `surface` | `#F5F2E9` | phone/screen background |
| `card` | `#FFFFFF` | cards, inputs, nav dock |
| `sheet` | `#F7F4EB` | bottom sheets |
| `ink` | `#0E1B14` | primary text; `rgba(14,27,20,.55)` secondary, `.45/.4` tertiary |
| `green` | `#1E8A5E` | primary accent, CTAs, team A kit |
| `greenBright` | `#5FD8A2` | links on dark |
| `gold` | `#C9A24B` / text `#8A6D2C` / bg `rgba(201,162,75,.18)` | manager identity, pending states |
| `rust` | `#B0512F` | alerts, dropouts, destructive, team B kit |
| `wa` | `#25D366` / text `#128C4B` | WhatsApp bridge affordances |
| `heroGrad` | `linear-gradient(150deg,#0C1912 0%,#17402B 70%,#1E8A5E 185%)` | ticket hero cards, login backdrop |
| `pitchTop` | `linear-gradient(180deg,#143523,#102B1C)` | night pitch, team A half |
| `pitchBottom` | `linear-gradient(0deg,#2E1D10,#241A12)` | night pitch, team B half |
| `pitchLine` | `rgba(245,242,233,.32)` | pitch lines, 2px |
| `track` | `#E8E4D6` | progress track, empty segments |

Fonts: **Space Grotesk** (UI) + **JetBrains Mono** (labels/chips/stats).
Mono label style: 8–10px, weight 600–700, letter-spacing 1–2px, uppercase.

Shape language: cards 14–20px radius; hero tickets 22–24px; sheets 26px
top-radius; phone frame 32px. Buttons 50–54px tall, radius 15–17px.
Floating dock: height 62px, radius 22px, white, shadow
`0 12px 28px -12px rgba(14,27,20,.4)`, margin `8px 14px 12px`.

Signature elements:
- **Ticket hero** — heroGrad card, decorative circle outlines (border
  `rgba(245,242,233,.1)`), dashed divider `1.5px dashed rgba(245,242,233,.22)`,
  mono chips.
- **Night pitch** — two-tone halves (green top / rust bottom), inset border
  10–12px `pitchLine` radius 10, halfway line, center `VS` circle (`#0E1B14`),
  glowing round player tokens (kit color, `box-shadow: 0 0 14–16px <kit>66..90`),
  name tags `rgba(245,242,233,.9)` pills. "You" token: double ring
  `0 0 0 3px rgba(245,242,233,.95), 0 0 0 6px <kit>`.
- **Segments** — 5 tappable blocks per attribute (height 24–26px, radius 8,
  filled `green`, empty `track`); replaces sliders.
- **Toasts** — bottom-center dark pill (`#0E1B14`), 2.6s auto-hide.
- **Bottom sheets** — `sheet` bg, grab handle, backdrop `rgba(14,27,20,.4)`.

## 2. Information architecture

Manager dock: **HOME · MATCHES · CHAT · SQUAD** (profile via header avatar).
Player dock: **HOME · MATCHES · CHAT · RATE** (badge `!` on RATE when window
open, on MATCHES when a poll needs a vote).

### Screens (manager)
1. **Login** — heroGrad panel with logo + strapline, Google button, email field, Continue.
2. **Team hub** — team cards (role chip MANAGER/PLAYER, member/live counts), Create-a-team (green card), Join-a-team (dashed).
3. **Home** — header (team name ▾ → hub, avatar → profile); ticket hero (next match, confirmed avatars, `N POLLS LIVE` + `ALL MATCHES →` chips); dropout alert banner (rust) when unresolved dropout; quick actions **New match** (green, "POLL THE SQUAD") + **Voting window** (status chip); Team chat row (last message + count); LAST RESULT row; PLAYED/WON/FORM stat tiles; Invite players dashed row (code visible, Share →).
4. **Matches** — list of match cards: label, phase chip (`POLL LIVE`/`FINALIZING`/`DRAFTING`/`SCHEDULED`), sub, progress bar `POLL → DRAFT → SCHEDULED` (33/55/75/100%, gold until scheduled then green), `+ New match`.
5. **New match wizard** — 3 steps w/ progress bars: (1) times multi-select + add another; (2) turfs multi-select (name + sub + map pin), custom-turf input + map placeholder; (3) poll deadline (24H/48H/MANUAL) + REVIEW summary + posts-to note. CTA `Next →` / `Publish poll to squad`.
6. **Match detail** — phase-dependent:
   - *poll*: live banner (closes X · N/12 voted), WhatsApp mirror banner (when bridge on), TIMES·VOTES + TURFS·VOTES bars, VOTED chips (WA tag for ghost voters), WAITING chips, `Close poll & finalize →`.
   - *finalizing*: pick final time + turf (radio rows with vote counts, best pre-selected), `Auto-generate balanced teams` (uses strength scores).
   - *draft*: kit names + avg `A:B` + gap chip (`BALANCED · GAP n` / `GAP n — CONSIDER A SWAP`), interactive night pitch (tap token to swap side), redraft + `Finalize schedule`.
   - *scheduled*: confirmed ticket (time, turf, Directions ↗), dropout card (rust: `Replace with X (ovr)` / `Adjust manually`), lineup pitch (read-only, `Edit on pitch →`), `Cancel match`.
7. **Chat** — header (crest, online/members, invite shortcut); reverse-scroll feed; bubbles (mine: green/right, theirs: white/left + mono name, manager name gold), reactions pill, ticks; system cards: **poll card** (dark gradient, leading option, progress, `N/12 VOTED · OPEN/CLOSED`, `Vote now → / Voted ✓ / View →`), **match-confirmed card** (white, green border, when/where, `View lineup →`), **notes** (centered mono pills); composer (+ sheet, input, send).
8. **Squad** — search, position chips (ALL/GK/DEF/MID/FWD), count line, rows: avatar (dashed ring for ghosts), name, pos, tag (`MGR` gold / `WHATSAPP` green / `NO APP` / `XI` / `RES`), OVR; `+ Add` (no-app sheet) and `+ Invite`.
9. **Edit player** — identity + OVR·LIVE; position chips; 6 attributes × 5 segments (PACE SHOOTING PASSING DRIBBLING DEFENDING STAMINA); **Manager role toggle**; Remove from team / Save changes.
10. **Ratings (voting window)** — status chip, N/12 voted progress, `Open voting window` / `Close voting & settle scores` (rust when open), note that opening posts to chat.
11. **Profile** — identity card (gold ring, MANAGER chip, email); Club settings row; Invite code & link row; Notifications toggle; Switch team; Sign out.
12. **Sheets** — *Plus/Create*: Availability poll, Invite to team, Match result, Photo, Location, Announcement (last four stubs w/ toast). *Invite*: dashed TEAM CODE + Copy, Share link + QR stub, WhatsApp bridge toggle, `Add a player without the app →`, join link. *Add player (no app)*: name, position chips, WhatsApp-updates toggle, `Add to roster`.

### Screens (player)
1. **Login** — same as manager.
2. **Claim profile** (when roster ghost matches account) — "We found you on a roster", dashed profile card (games/goals/WA-votes tiles), WA merge note, `This is me — claim profile` / `Not me — join with a code`.
3. **Hub** — team cards + Join-a-team.
4. **Home** — chips row (`YOUR OVR n`, position, `RATE NOW →` rust chip when window open); ticket hero (+ `VOTE NEEDED (n)` rust chip); chat row; last result; GAMES/GOALS/MOTM tiles.
5. **Matches** — cards w/ action line (`● VOTE NEEDED` rust / `YOU ARE PLAYING` green / `YOU ARE OUT` / `WAITING FOR MANAGER`); "Only managers can schedule" note.
6. **Match detail** — *poll not-voted*: "Dani asked: when can you play?", times + turfs multi-select checkboxes, `Submit availability`; *poll voted*: green confirmation + Edit, live result bars, VOTED/WAITING chips; *finalizing/draft*: empty state "Poll closed — you'll get a push"; *scheduled*: ticket + `TEAM <KIT>`/`OUT` chip, dropout card ("Can't make it anymore?" reason chips Injured/Work/Travel/Family → `Drop out · <reason>`; when out: rust banner + Undo unless replaced), lineup pitch (self glowing).
7. **Chat** — same as manager (poll card CTA = `Vote now →`).
8. **Rate** — closed state (lock, explanation) / open: `NN / NN RATED`, teammate card (identity, OVR chip, 6×5 segments, `Save & next →`).
9. **Profile** — identity + OVR; YOUR SCORE (read-only segments, "from teammate votes"); notifications, switch team, sign out.
10. **Plus sheet** — Photo, Location (stubs), My availability → Matches.

## 3. Domain model additions (backend)

New match lifecycle: `poll → finalizing → draft → scheduled → live → played | cancelled`.
(Existing matches keep working: creation without a poll starts at `draft` or
`scheduled` exactly as today.)

### Migration 350_matchmaker_match_polls
- Extend `matchmaker.matches.status` CHECK to add `'poll','finalizing','draft'`.
- `matchmaker.match_polls`: `match_id UUID PK`, `org_id UUID NOT NULL`,
  `deadline_kind TEXT CHECK (IN ('24h','48h','manual'))`, `deadline_at TIMESTAMPTZ NULL`,
  `closed_at TIMESTAMPTZ NULL`, `created_at`, `updated_at`.
- `matchmaker.match_poll_options`: `id UUID PK`, `match_id`, `org_id`,
  `kind TEXT CHECK (IN ('time','turf'))`, `label TEXT NOT NULL`,
  `detail TEXT NULL`, `starts_at TIMESTAMPTZ NULL`, `position INT NOT NULL DEFAULT 0`,
  `created_at`. Index `(match_id, kind, position)`.
- `matchmaker.match_poll_votes`: `option_id UUID`, `match_id`, `org_id`,
  `player_id UUID`, `created_at`, `PK (option_id, player_id)`.
  Index `(match_id, player_id)`.
- `matchmaker.match_dropouts`: `match_id`, `org_id`, `player_id`,
  `reason TEXT NOT NULL`, `resolved_at TIMESTAMPTZ NULL`, `created_at`,
  `PK (match_id, player_id)`.
- `matchmaker.org_settings`: `org_id UUID PK`, `whatsapp_bridge BOOLEAN NOT NULL DEFAULT false`, `updated_at`.

### Migration 360_matchmaker_chat
- `matchmaker.chat_messages`: `id UUID PK`, `org_id UUID NOT NULL`,
  `kind TEXT CHECK (IN ('text','note','poll','sched'))`,
  `body TEXT NOT NULL DEFAULT ''`, `match_id UUID NULL`,
  `author_player_id UUID NULL`, `author_subject_id TEXT NULL`,
  `author_name TEXT NULL`, `reactions JSONB NOT NULL DEFAULT '{}'`,
  `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  Index `(org_id, created_at DESC, id DESC)`.

Both registered in `packages/db/src/migrations/manifest.ts` with sha256
checksums (`node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync(p)).digest('hex'))"`).

## 4. API contracts (api-edge → matchmaker-worker unless noted)

All routes org-scoped `/v1/organizations/{orgId}/…`; actor headers as today;
RBAC via policy-worker (actions listed in §5). Facade: extend
`ORG_MATCHES_RE`/new regexes in `matchmaker-facade.ts`; bodies forwarded for
POST/PUT/PATCH/DELETE-with-body (DELETE has no body here).

**Polls**
- `POST /matches` (extended body): `{ scheduledAt?, location?, format?, poll?: { times: [{label, startsAt?}], turfs: [{label, detail?}], deadline: '24h'|'48h'|'manual' } }`.
  With `poll`: status `poll`, provisional `scheduled_at` = earliest time option's
  `startsAt` (or `scheduledAt`), creates poll + options rows, posts chat `poll`
  card + (if bridge on) mirror `note`. Without: today's behavior.
- `GET /matches/{id}/poll` → `{ poll: {deadlineKind, deadlineAt, closedAt}, options: [{id, kind, label, detail, startsAt, votes, voterPlayerIds}], voters: [playerId…], eligible: n }`.
- `PUT /matches/{id}/poll/votes` (self-service; manager may pass `playerId`):
  `{ optionIds: string[] }` — replaces that player's votes for the match. Posts
  chat `note` on first vote.
- `POST /matches/{id}/poll/close` (manager) → status `finalizing`, sets `closed_at`, chat note.
- `POST /matches/{id}/finalize` (manager): `{ timeOptionId, turfOptionId }` →
  sets `scheduled_at`/`location` from options, status `draft`.
- Cron (`scheduled.ts`): auto-close polls whose `deadline_at` passed → same as manual close.

**Dropouts**
- `PUT /matches/{id}/dropout` (self): `{ reason }` → upsert dropout, notify managers, chat note.
- `DELETE /matches/{id}/dropout` (self): undo (only while unresolved).
- `POST /matches/{id}/dropouts/{playerId}/resolve` (manager): `{ replacementPlayerId? }` —
  marks resolved; if replacement given, swaps into the same team slot in
  `team_a`/`team_b`, chat note.

**Chat**
- `GET /chat?limit=50&before=<iso>` → `{ messages: [{id, kind, body, matchId, authorPlayerId, authorSubjectId, authorName, reactions, createdAt}] }` (newest first).
- `POST /chat`: `{ body }` (kind `text`; author from actor; server resolves display name).
- `PUT /chat/{id}/reactions`: `{ emoji }` → toggles actor's reaction (reactions
  stored `{ "⚽": [subjectId…] }`).
- System messages (`note`/`poll`/`sched`) are inserted by workers on: poll
  publish/close/finalize, schedule, dropout, replacement, rating window
  open/close, member joined/claimed.

**Org settings (matchmaker)**
- `GET /settings` → `{ whatsappBridge }` (any member).
- `PUT /settings` (manager): `{ whatsappBridge }`.

**Member role (membership-worker)**
- `PUT /organizations/{id}/members/{memberId}/role` (owner/admin): `{ role: 'admin'|'viewer' }` —
  flips the member's role assignment (promote/demote manager). Cannot change
  the owner; cannot self-demote the last owner/admin.

## 5. Policy actions (policy-engine + policy-worker redeploy)

| Action | owner | admin | builder | viewer |
|---|---|---|---|---|
| `organization.chat.read` | ✓ | ✓ | ✓ | ✓ |
| `organization.chat.post` | ✓ | ✓ | ✓ | ✓ |
| `organization.poll.vote` | ✓ | ✓ | ✓ | ✓ |
| `organization.poll.manage` | ✓ | ✓ | — | — |
| `organization.dropout.set` | ✓ | ✓ | ✓ | ✓ |
| `organization.settings.read` | ✓ | ✓ | ✓ | ✓ |
| `organization.settings.write` | ✓ | ✓ | — | — |
| `organization.member_role.set` | ✓ | ✓ | — | — |

⚠ `apps/policy-worker/component.yaml` must be touched in the same PR
(policy-engine changes don't select the worker in orun's changed-only plan).

## 6. SDK additions (`@saas/sdk`)

`matchmaker`/`roster`-adjacent clients: `polls.get/vote/close/finalize`,
`dropouts.set/undo/resolve`, `chat.list/post/react`, `orgSettings.get/set`,
`memberships.setMemberRole`. All typed against §4 responses.

## 7. rondo-core VM (Phase 2)

Extend `RondoSeed`/`useRondo` with: `phase` per match (mapped from status),
`poll` (options+votes+voters+deadline), `chat` (rows + send + react + poll/sched
card refs), `dropouts` (mine + squad), `orgSettings`, wizard state machine
(times/turfs/deadline drafts), `claim` context, and stats (games/goals/MOTM —
goals/MOTM 0 until tracked). Formation math (`placeRoster`/`placeDraft`)
unchanged. No DOM in this package (invariant).

## 8. Out of scope / stubs (explicit)

- Real WhatsApp mirroring (needs external messaging provider) — the bridge
  toggle persists, ghost/no-app players + WA tags render, and "mirrored" chat
  notes post; actual WA delivery is future ops work.
- Photo/Location/Announcement/Match-result chat attachments — sheet entries
  show a "(coming soon)" toast, matching the design's own stubs.
- Google Maps pin — map placeholder panel ships; a real map/geocode is future.
- Goals/MOTM per-player attribution — tiles render real zeros until tracked.
