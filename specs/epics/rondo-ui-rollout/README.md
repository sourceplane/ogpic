# Epic B — Roll the new UI onto every page (finish incorporation)

> **Status:** Proposed — awaiting verification. No code changed yet.

## Why

The Pitchside v2 UI is live for **onboarding** (login · start · create · join)
and the **demo** (`/rondo/demo`), but the pages below still render the old dark
app or dead styles. A signed-in user on their real squad still sees the old UI.

## Page-by-page audit (as-built today)

| Page | State | Action |
|------|-------|--------|
| `/rondo` (login) | ✅ new UI | drop the leftover `rondo.css` import |
| `/rondo/start` · `/new` · `/join` | ✅ new UI | — |
| `/rondo/demo` | ✅ new UI (seed) | — |
| **`/rondo/[orgSlug]`** (authenticated squad) | ❌ **old dark app** | **rebuild on the kit + live data + role gating** |
| `/rondo/callback` (OAuth return) | ❌ dark-styled | restyle to the light boot screen |

## What changes

1. **Authenticated squad (`/rondo/:orgSlug`) — the big one.** Render the new
   manager/player apps here, wired to live data:
   - **Role gating** — owner/manager → manager app; member → player app.
   - **Roster → pitch** — map a variable-size live roster onto a formation
     (the seed assumes a fixed XI; live squads vary), with each player's real
     rating/position/availability driving the token.
   - **Fixtures → games / next-match strip**, **votes → rate**, **availability
     toggle**, **join code + requests → manage squad**, plus create/leave/
     schedule/draft actions — reusing the existing live handlers.
2. **Callback** — swap the dark styling for the light boot screen.
3. **Login** — remove the now-dead `rondo.css` import.

## Approach

Incremental, verify-first: I'll show each migrated screen (screenshot) **before**
merging, and we go one surface at a time (home → squad → schedule/draft → rate →
games), so the authenticated app is never half-broken.

## Dependencies

- Best done **after** Epic A (content-only), so the migrated screens are built
  without the mockup chrome.
- Unblocks Epic C (removing the legacy dark files) once nothing imports them.

## Definition of done

Every `/rondo/*` page renders the Pitchside UI on live data with correct role
gating; no page imports the old dark UI; typecheck · lint · `next build` · CI green.
