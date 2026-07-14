# Epic C — Remove unwanted files

> **Status:** Proposed — awaiting verification. Nothing deleted yet.

## Audit

The repo has **no** stray build artifacts, `.bak`/`.tmp`/`.orig`, logs, or
`.DS_Store` tracked (`.open-next`/`.next`/`.turbo` are gitignored). The unwanted
files are dev-only harnesses and the superseded dark UI.

### Remove now (safe — dev-only, unlinked)

| File | Why |
|------|-----|
| `app/rondo/preview/page.tsx` | redundant — it just aliases `/rondo/demo` |
| `app/rondo/kit/page.tsx` | the design-system gallery; served its review purpose |

### Remove after Epic B (still imported by `/rondo/[orgSlug]` + `/callback`)

The legacy **dark** UI — deleting now would break the authenticated app, so this
waits until Epic B migrates those pages off it:

| File | Size |
|------|------|
| `components/rondo/screens.tsx` | 57 KB |
| `components/rondo/rondo-app.tsx` | 12 KB |
| `components/rondo/use-rondo.ts` | 12 KB |
| `components/rondo/ui.tsx` · `logic.ts` · `live.ts` · `player-card.tsx` | — |
| `styles/rondo.css` | the dark token system |
| Archivo font (in `app/rondo/layout.tsx`) | superseded by Space Grotesk |

### Keep (not unwanted)

- `specs/epics/rondo-experience/` — historical record, superseded by
  `rondo-focused`; harmless. Delete only if you want the history gone.
- `/rondo/demo` — the public token-free preview.

## Sequencing

1. **C1 (now):** delete the two dev harness routes.
2. **C2 (after Epic B):** delete the legacy dark UI + Archivo; verify `next build`
   with zero dangling imports.

## Definition of done

No dev-only harness routes and no legacy dark UI remain; `grep` finds no imports
of the deleted modules; typecheck · lint · `next build` · CI green.

## Verify checklist (for you)

- [ ] OK to delete `/rondo/preview` and `/rondo/kit` now?
- [ ] Delete the legacy dark UI as part of Epic B's completion — yes?
- [ ] Keep or drop the superseded `rondo-experience` epic docs?

## Done (as-built)

The product is now **Rondo-only**. Removed in one pass (verified by typecheck ·
lint · full `next build` · runtime smoke):

- **Generic console** — the entire `app/(app)/**` tree (orgs, projects,
  environments, billing, integrations, webhooks, settings, account) and the
  generic top-level routes `auth` · `login` · `onboarding` · `demo`.
- **Generic component libraries** — `components/{account,audit,billing,config,
  integrations,matchmaker,notifications,orgs,precondition,security,settings,
  shell,ui,usage,webhooks}` and the orphaned `lib/{last-org,cn,slug,solo-mode,
  use-org,use-unsaved-guard}`.
- **Last old Rondo files** — `components/rondo/ui.tsx`, `player-card.tsx`,
  `styles/rondo.css`, and the **Archivo** font.
- **Dev harnesses** — `/rondo/kit`, `/rondo/preview`.
- Slimmed `app/providers.tsx` to the Rondo essentials (theme · query · session);
  default theme is now light.

Remaining routes: `/` (→ /rondo), `/rondo`, `/rondo/{[orgSlug],callback,demo,
join,new,start}`. The data layer the app relies on (`use-rondo` · `live` ·
`logic` · `lib/{api,query,session,use-async,query-keys,app-config}`) is retained.
