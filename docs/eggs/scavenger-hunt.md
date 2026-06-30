# Spec — Cross-Site Scavenger Hunt (egg #5)

> Status: SPEC (not built). The centerpiece egg: fragments hidden across the
> site; collecting all of them unlocks a secret page. Optional server-side
> counter so Angelo can watch people hunt. Public-safe, all whimsy.

## Goal

A visitor discovers a `🧩` fragment somewhere (the devtools console banner
already drops the first breadcrumb). Each fragment is a short token. Collect all
N → a final secret page renders + a bonus theme unlocks. Progress persists
client-side; finds are optionally tallied server-side for a live counter.

## Fragments (N = 7)

Each fragment is a stable id + a discovery surface. Ideas (pick 7):

| id | where | how found |
|----|-------|-----------|
| `console` | devtools console banner | already shipped (the `🧩` line) — make it reveal a token |
| `colophon-node` | colophon SVG | a hidden 8th node, only visible on hover / at a known coord |
| `terminal-flag` | terminal VFS | `cat /flag` or `find flag` (VFS already exists) |
| `404-game` | 404 mini-game | score ≥ threshold reveals a token |
| `konami` | theme unlock | unlocking fun themes drops a token |
| `zero-width` | a blog post | zero-width-char run in body; revealed by selecting text |
| `header` | any response | `X-Egg: <token>` response header (set in middleware) |

Keep the **list of fragment ids in ONE shared module** (`lib/eggs/fragments.ts`)
imported by every surface + the completion check — same single-source-of-truth
discipline as the resume allowlist. A regression test asserts the set size.

## Client state

- `localStorage` key `ryang.eggs` = JSON array of found fragment ids (deduped).
- A tiny `lib/eggs/store.ts`: `findFragment(id)`, `foundSet()`, `isComplete()`.
- On each `findFragment`, dispatch a `egg-found` CustomEvent → a toast island
  (clone `UnlockToast.svelte`) shows `🧩 3/7`.
- On `isComplete()` → dispatch `egg-complete` → unlock bonus theme (reuse
  `unlockFunThemes`-style flow) + reveal `/secret` link.

## Secret page

- `/secret` (or `/.well-known/egg`): SSR route, `prerender=false`.
- Gate: reads the same fragment set from a cookie/header the client sets on
  completion (NOT trusting localStorage alone server-side — set a signed cookie
  via a small `POST /api/egg/complete` that verifies the count, mirroring the
  recruiter-session HMAC pattern in `lib/auth/session.ts`).
- Content: a thank-you, an ASCII trophy, maybe a hidden résumé bonus or a
  "you're exactly the kind of person I want to work with → /contact".

## Optional server-side counter (PB)

New collection `egg_finds` (0.28 `fields` format; create via the live-PB →
export → merge flow used for `work_experience`/`posts`):

| field | type | notes |
|-------|------|-------|
| sessionHash | text (≤128) | server-stamped from hashed IP (moderation hook) |
| fragment | text (≤64) | which fragment |
| completedAt | text | ISO, set only on full completion |

- `createRule = ""` (public create); a hook server-stamps `sessionHash` exactly
  like `reactions` (so a client can't spoof counts) — extend `moderation.pb.js`.
- `listRule = ""` but only expose aggregate counts via a read endpoint, not raw
  rows. A `/api/egg/stats` SSR route returns `{ completions: N }` for a
  "🧩 142 people have found everything" line on `/secret`.
- Unique index on `(sessionHash, fragment)` so repeat finds don't inflate counts
  (same dedup pattern as `reactions`).

## A11y / fail-soft

- Hunt is **purely optional** — never blocks content, never required for nav.
- Zero-width-char fragment must not break screen readers: wrap in
  `aria-hidden` span, and don't put it mid-sentence.
- If PB is down, the client-side hunt still works (counter just hidden).
- Respect reduced-motion in the completion celebration (reuse the guard).

## Build order

1. `lib/eggs/fragments.ts` (shared id list) + `lib/eggs/store.ts` + toast.
2. Wire the 7 surfaces to `findFragment(id)`.
3. `/secret` page + `POST /api/egg/complete` (signed-cookie gate).
4. (optional) PB `egg_finds` collection + hook + `/api/egg/stats`.
5. Non-vacuous test: completion requires ALL ids; dropping one keeps it locked.

## Effort

Medium-large. Phases 1–3 are client + one SSR route (no backend). Phase 4 (PB)
is the "live counter" upgrade and can land later.
