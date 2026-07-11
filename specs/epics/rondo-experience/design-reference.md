# rondo-experience — Design Reference (extracted prototype)

Status: Frozen reference. This is the **pixel + behaviour source of truth**,
extracted from the `Rondo — Football Matcher` interactive prototype (the bundled
HTML supplied with the epic brief). `design.md` distils this into tokens and a
plan; when the two disagree about a measurement, **this file wins** for fidelity
and `design.md` wins for how it maps onto the platform. Nothing here is invented —
every hex, size, and state transition is lifted from the prototype markup + its
reference component logic.

## A. Frame & chrome

- Device frame: `390 × 844`, `border-radius:52px`, body `#0B0C0E`, outer bezel
  `box-shadow: 0 0 0 11px #141414, 0 0 0 12px #2a2a2a`. Backdrop: `radial-gradient(130%
  90% at 50% -10%, #121417 0%, #050506 62%)`.
- Status bar (52px, `z-40`): time `9:41` 14px/700 `#F4F3F0`; centered notch pill
  `118×30 #000`; signal + battery glyphs (inline SVG) `#F4F3F0`.
- Scroll area: absolute inset, `overflow-y:auto`, hidden scrollbars (`.rscroll`).
- Bottom nav: 78px, `rgba(11,12,14,.86)` + `backdrop-filter:blur(20px)`, top hairline;
  five equal tabs, icon 22px + mono 9px label; active `#F4F3F0`, idle `#5A5D63`.

## B. State machine (reference `Component`/`DCLogic`)

Single `screen` string drives everything: `login → join → squad → vote → play →
match → fixtures → members → community`. `showNav` is true for `squad, vote, play,
match, fixtures, community`. Overlays are boolean flags: `showTeams`, `voteTarget`,
`scorer`.

Reference state seed:

```
players: 12 seeded (see §C), each {id,name,pos,ovr,skills{6 keys},myStars{}}
rated: ['p3','p6','p9']            // players I've already voted on
homeIds/awayIds: null              // set by balance()
swapSel: []                        // tap-two-to-swap buffer
goals: [], motmId: null            // live match
turf: 'astro', teamSize: 7
currentTeam: 'northside'           // multi-squad
availability: {p1:'in',...,p8:'out',p5:'maybe',p11:'maybe'}
membersRemoved: [], invitesResolved: {}
```

Key methods (behaviour to reproduce server-side / client-side):
- `tierOf(ovr)` → ELITE ≥90 / GOLD ≥84 / SILVER ≥78 / BRONZE else (colors in
  `design.md` §2).
- `posColor(pos)` → GK gold / DEF blue / MID green / FWD red.
- `balance()` — **the draft**: take `availability==='in'` players, sort by OVR desc,
  greedily push each to the smaller side; tie on size → push to the side with the
  lower running OVR total. Caps each side at `teamSize`. (MM2's server engine is the
  generalized, authoritative version.)
- `toggleSwap(id)` — tap one player from each side; when two are selected across
  sides, swap them between `homeIds`/`awayIds`.
- `setVote(skill,val)` / `submitVote()` — write my star per skill; submit marks the
  player `rated`.
- `addGoalFor(team)` → opens scorer sheet → `pickScorer(p)` appends `{team,name,min}`
  (min auto-increments); `setMotm(id)` toggles MOTM.
- `selectTeam(id)` — switch active squad (resets draft).
- `cycleAvail(id)` — in → out → maybe → in.

## C. Seed roster (drives cards, votes, draft, scoring)

Outfield skills `{PAC,SHO,PAS,DRI,DEF,PHY}`, GK skills `{DIV,HAN,KIC,REF,SPD,POS}`.

| id | Name | Pos | OVR | Tier |
|----|------|-----|-----|------|
| p1 | Marco Silva | FWD | 91 | ELITE |
| p2 | Yusuf Demir | MID | 88 | GOLD |
| p3 | Kai Brandt | DEF | 86 | GOLD |
| p4 | Ravi Menon | GK | 87 | GOLD |
| p5 | Andre Pirlo | MID | 85 | GOLD |
| p6 | Sam Okafor | DEF | 83 | SILVER |
| p7 | Diego Costa | FWD | 84 | GOLD |
| p8 | Leo Fernandes | MID | 81 | SILVER |
| p9 | Tomas Nowak | DEF | 79 | SILVER |
| p10 | Jon Berg | FWD | 82 | SILVER |
| p11 | Ali Hassan | MID | 80 | SILVER |
| p12 | Noah Klein | DEF | 77 | BRONZE |

Squads: **Northside FC** (crest `N`, green, Manager role, 12 members, Sunday League
7-a-side, 1840 pts, rank #4, W3 streak) · **Vets United** (crest `V`, gold, Player
role, 18 members, 5-a-side, 1210 pts, rank #11).

## D. Screen-by-screen

### D1. Login
Radial screen bg `#15191D→#08090B`; faint 47px vertical rule texture. Logo chip
60×60 `radius:18` gradient `#1E2228→#101215` w/ inner green ring, glyph `R` 30px/900.
Wordmark `RONDO` 52px/900 letter-spacing −3px. Tagline "Balanced sides. / Every
match." 19px/600 `#D8D9DA`. Mono sub "SUNDAY-LEAGUE FOOTBALL, SORTED." 11px `#63666C`.
CTAs: primary "Continue with phone" 54px, `#F4F3F0` bg / `#0B0C0E` text 15px/800;
row of `Apple` + `Google` 52px `#141619` outline; text button "Explore a demo squad
→" mono 12px `#8A8D93`; legal 10.5px `#4E5157`. → `goJoin` / `goSquad`.

### D2. Join
Back chip 40×40. Title "Join a squad" 30px/900 −1.4px. Sub 14px `#8A8D93`. Mono label
"INVITE CODE". Six code boxes 60px tall, `radius:14`, `#141619`, 26px/800; the active
box is `#0F1114` + `1.5px #56C98D` + `box-shadow:0 0 0 4px rgba(86,201,141,.12)`,
filled chars `#F4F3F0`, empty `#3A3E44`. "OR" divider. Squad-link field
`rondo.app/j/northside` with link glyph. "RECENT INVITES" list: two tappable rows
(crest chip, name 15px/700, `12 members · Sunday League` mono 11px, chevron). Primary
"Join squad" 54px accent. → `goSquad`.

### D3. Squad (home)
Header: tappable team block (crest 52px, name 21px/900 + chevron, league mono 11px) →
`openTeams`; members icon chip → `goMembers`.
**Record strip:** 4 tiles — `14 PLAYED` (white), `9 WON` (green), `2 DRAWN` (`#C9CBCE`),
`3 LOST` (red); value 22px/900, mono 10px caption.
**Ranking row:** wide green-tinted tile `RONDO POINTS 1840` + `LOCAL RANK #4`; narrow
tile `W3 WIN STREAK` (gold).
**Manager + captain:** two tiles, hatched 42px avatar, gold "MANAGER" / green "CAPTAIN"
mono labels, name 13.5px/700.
**CTA (manager):** big green-gradient button "Create practice match / Check availability
& auto-balance" with lightning chip → `goPlay`; secondary "Manage squad & invites" →
`goMembers`. **(non-manager):** lock notice card + "Set my availability" accent button.
**Squad grid:** "Squad / 12 PLAYERS" header; 2-col FUT card grid (§E).

### D4. Vote
Title "Rate teammates" 28px/900. Sub explains votes settle → balancing.
**Window banner:** `#111316` card — green dot + "VOTING OPEN", gold "CLOSES 2d 04h";
progress bar (`voteProgress` %) accent fill; "You've rated N of 12 teammates".
**List:** each row = hatched avatar 40px, name 14px/700, `POS · OVR n` in pos color,
right button — unrated = accent "Rate", rated = green-tint "Rated ✓". → opens vote sheet.

### D5. Vote sheet (overlay)
Bottom sheet: grabber; header (48px card-tinted avatar, name 18px/900, `POS · CURRENT
OVR n`, close ✕). Six skill rows: mono skill key + 5 tappable `★` (26px, filled
`#E7C979` / empty `#2A2E34`). Skills = outfield or GK set by position. "Submit vote"
54px accent → `submitVote`.

### D6. Play / draft
Title "Practice match" 28px/900.
**Not balanced (manager):** "TEAM SIZE · PER SIDE" segmented control `5 6 7 9 11`
(active = accent fill). "AVAILABILITY" with `N IN / N MAYBE / N OUT` mono counts;
calendar-invite hint card; availability list rows with a cycling pill
(Available/Maybe/Out). Primary "Draft N available players" 56px accent w/ lightning →
`doBalance`.
**Not balanced (non-manager):** explains only manager drafts; shows "YOUR AVAILABILITY"
list.
**Balanced:** subtitle `{size}-a-side · drafted from N available`. **BalanceMeter:**
`HOME AVG` (blue) ↔ gradient bar w/ center marker ↔ `AWAY AVG` (red); caption "◆
BALANCED — n OVR GAP" green. **Two team columns** (HOME blue-tinted / AWAY red-tinted):
each player row = pos mono (pos color), short name (Ⓒ green for captain = idx 0), OVR
in tier color; row border turns green when selected for swap. Caption "TAP ONE PLAYER
FROM EACH SIDE TO SWAP". Buttons: "Re-draft" (`#141619`) + "Start match →" (accent) +
"Schedule for later" (outline → `goFixtures`).

### D7. Match (live)
Back chip + LIVE badge (`LIVE 34'`, red pulse dot, `rgba(255,122,107,.12)` pill).
**Scoreboard card:** gradient `#15181c→#0d0f12`; HOME chip (blue `H`) — `homeScore : awayScore`
52px/900 — AWAY chip (red `A`). Two goal buttons "Home goal" (blue) / "Away goal" (red)
→ open scorer sheet. **Timeline:** "MATCH EVENTS" list of `{min}'`, ball icon, scorer
name, "GOAL · HOME/AWAY"; empty state dashed card "No goals yet…". **MOTM:** "⭐ MAN OF
THE MATCH" + hint; wrap of player chips, tapped chip gold-tinted + gold star. "End &
save result" 52px → `goFixtures`.

### D8. Scorer sheet (overlay)
Bottom sheet "Who scored?"; scrollable list (max-h 340) of the scoring team's players
(avatar, name 14px/700, pos mono) → `pickScorer`.

### D9. Fixtures
Title "Fixtures" 28px/900.
**Schedule card** (gradient): "SCHEDULE A MATCH"; two fields `DATE Sat 12 Jul` /
`KICK-OFF 18:30`. "SELECT TURF" radio-cards (turf thumbnail, name 14.5px/800, `format ·
distance` mono, price gold, ✓ when selected, border green when active): _The Cage
(5-a-side · Indoor · 0.8 mi · £48/hr)_, _Riverside Astro (7-a-side · 3G · 1.4 mi ·
£65/hr)_, _Central Sports Dome (11-a-side · Grass · 3.1 mi · £90/hr)_. "Confirm & notify
squad" accent → `goPlay`.
**Recent results:** rows `05 JUL / Home vs Away / 4 – 3` (win green), `28 JUN / … / 2 – 2`
(draw `#C9CBCE`).

### D10. Members (manage squad)
Back chip + "Manage squad / N MEMBERS".
**(manager)** green-tinted "INVITE PLAYERS" card: dashed invite-code tile `RON-4F2`
18px/900 green + copy button (green); "Add player by ID…" field + "Add"; "Share invite
link" outline button. **Pending requests · N:** rows (avatar, name, `via` mono, ✕/✓
buttons; resolves to "Added"/"Declined"). **Members & roles:** rows (avatar, name, role
mono in role color — Manager gold / Captain green / Player grey, pos mono in pos color,
remove trash for manager). Manager row is non-removable.

### D11. Community (feed)
Title "Community" 28px/900. Sub "Results, news and where your squad ranks."
**Local leaderboard** card: "LOCAL LEADERBOARD" + "SEASON 26"; rows `rank · name · pts`;
own squad row highlighted green tint + green name. Reference table: 1 East End Rovers
2410 · 2 Marsh Lane FC 2180 · **4 Northside FC 1840 (me)** · 5 Dockside AFC 1720.
**Latest feed:** cards — crest chip, team + "Nh AGO", right tag pill (`+24 PTS` green /
`SOON` gold / `+8 PTS` grey); title 16px/900; body 12.5px `#9A9DA3`; footer chips
"✓ VALIDATED BY TURF" green + "★ MOTM {name}" gold. Reference items: Northside 4–3 result
(hat-trick, +24, MOTM M. Silva, validated), Rondo "Public friendlies are coming" (SOON —
teases cross-squad, **out of scope this epic**), Vets 2–2 (+8, MOTM A. Pirlo).

### D12. Team switcher sheet (overlay)
"Your teams / You can be in as many squads as you like." Rows per squad (crest, name
15px/800, `role · N MEMBERS` mono, ✓ on current, green border on current). Buttons "Join
a squad" (→ `join`) + "Create team" (accent).

## E. FUT PlayerCard (the signature primitive)

`radius:18`, tier gradient bg, hairline border, `box-shadow:0 8px 22px -12px
rgba(0,0,0,.7)`. Top: 2px tier-accent bar inset 16px. Left column: OVR 32px/900 (tier
color, −1.5px), pos mono 10px/700 (pos color), tier label 8px mono `#7c7f85`. Right:
hatched avatar 44px circle w/ initials. When `showCardStats`: 3×2 grid of `{key}{val}`
(mono key 8.5px, val 12px/800) above a hairline. Footer: name 12.5px/800 centered,
ellipsized. `short(name)` = "M. Silva"; `initials(name)` = "MS".

## F. Config props (prototype `data-props`)
- `accent` (color, default `#56C98D`, options `#56C98D #E7C979 #6EA8FF #FF7A6B`) — the
  swappable theme accent (maps to white-label token).
- `teamName` (text, default "Northside FC").
- `showCardStats` (boolean, default true) — toggles the FUT card stat grid.
