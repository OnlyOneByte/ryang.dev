# Spec — 404 Game Leaderboard + Unlock (egg #7)

> Status: ✅ BUILT. The "catch the falling bytes" 404 game now has stakes: a
> moderated high-score table and a catch-30 theme unlock. Public-safe.
>
> Shipped: `scores` PB collection (moderated) + `moderation.pb.js` hook +
> `score` index · `POST /api/score` (clamp + rate-limit + service write) ·
> leaderboard on `404.astro` (fail-soft) · submit UI + `UNLOCK_THRESHOLD=30` in
> `Game404.svelte` · `scores` self-approve probe added to `smoke-test.sh`.
> Verified e2e: spoofed `approved:true` forced false + unlisted; valid submit
> stored `approved=false`; absurd score clamped; leaderboard renders approved
> rows. (Original spec below.)

## Goal

Playing the 404 game (already shipped) currently has no persistence. Add:
1. A high-score leaderboard (initials + score), moderated like the guestbook.
2. Beating a score threshold unlocks a bonus theme (reuses the unlock flow).

## Data model — PB `scores` collection

Create via the live-PB → export → merge flow (same as `work_experience`/`posts`;
0.28 `fields` format). Treat it as **public-write, moderated** exactly like
`guestbook`/`comments` — scores are user-submitted and spoofable, so don't trust
them blindly.

| field | type | notes |
|-------|------|-------|
| initials | text (≤3, required) | arcade-style; sanitize to `[A-Z]{1,3}` |
| score | number (required) | |
| approved | bool | hook forces false; you approve in admin UI |
| sessionHash | text (≤128) | server-stamped (hook), for dedup/abuse signal |

- `createRule = ""` · `listRule = "approved = true"` · view same · update/delete null.
- Extend `moderation.pb.js`: on `scores` create → `approved=false` +
  server-stamp `sessionHash` (the helper-inline-per-handler pattern the file
  already uses). **This means a posted score is NOT public until you approve it**
  — prevents a `9999999` from instantly topping the board.
- Index on `score` (desc reads) — `CREATE INDEX idx_scores_score ON scores (score)`.

## Anti-cheat (be realistic)

Client JS scores are inherently forgeable; moderation is the real backstop. Cheap
deterrents worth doing, none load-bearing:
- Submit score server-side via `POST /api/score` (SSR route), not direct PB write
  from the browser — lets you clamp absurd values + rate-limit per IP (reuse the
  in-memory limiter from `/api/unlock`).
- Cap accepted score at a sane ceiling; reject the rest with a generic message.
- The unlock (below) is client-side and honor-system — that's fine, it's a toy.

## Leaderboard UI

- On the 404 page, below the game: top 10 approved scores (PB `publicClient`,
  `sort:'-score'`, `filter:'approved=true'`), fail-soft to "no scores yet".
- Game-over → if score qualifies, prompt for initials → `POST /api/score`.
  Show "submitted — appears once approved" (set expectation; matches guestbook).

## Theme unlock

- On reaching `UNLOCK_THRESHOLD` (e.g. 50) in a single run, dispatch the
  existing unlock flow (`unlockFunThemes()` or a dedicated bonus theme) +
  `themes-unlocked` event → existing `UnlockToast` fires. No new toast needed.
- Threshold lives in ONE const shared by the game + any test.

## Fail-soft / a11y

- PB down → game still plays, leaderboard hidden, unlock still works (it's local).
- Game already has a reduced-motion static fallback — leaderboard is just a list,
  no new motion.
- Initials input: real `<input maxlength=3>`, uppercased, `[A-Z]` only.

## Build order

1. PB `scores` collection + `moderation.pb.js` hook extension + index.
2. `POST /api/score` SSR route (clamp + rate-limit + PB create via service token).
3. Leaderboard list on the 404 page (publicClient, fail-soft).
4. Game-over submit flow + threshold unlock wired to existing toast.
5. Verify with the PB smoke-test approach: post a self-approve-spoofed score,
   assert it comes back `approved=false` and isn't publicly listed.

## Effort

Medium. One PB collection (reuses the moderation hook + smoke-test pattern), one
SSR route, modest UI on an existing page. Smaller than the scavenger hunt.
