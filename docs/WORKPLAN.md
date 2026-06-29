# Work Plan

Roadmap from scaffold → launched site. Milestones are roughly sequential but
many tasks parallelize. **v1 target** = a polished, self-hosted portfolio with
the theme engine, core content, recruiter gate, blog, live widgets, and the
companion services. Deferred items are parked at the bottom.

Legend: `[ ]` todo · `[~]` partial/scaffolded · `[x]` done

---

## M0 — Foundation ✅ (scaffold complete)

- [x] Monorepo layout (apps / docker / infra / services / docs)
- [x] Bun workspaces root + Astro/Tailwind/TS config
- [x] Theme token contract + 15 theme blocks (`tokens.css`), Cyberpunk default
- [x] Theme registry, store, konami logic
- [x] Base layout with no-flash SSR theme
- [x] Pocketbase schema (8 collections) + moderation/ntfy hooks
- [x] docker-compose (9 services) + dev override + `.env.example`
- [x] Router Caddyfile snippets
- [x] 6 design docs + this work plan
- [x] **`bun install` builds clean** — Bun 1.3.14; public-registry `bunfig.toml`;
      `astro build` ✓ + `astro check` 0/0/0. (sitemap removed → returns in M4)
- [x] Minimal CI (GitHub Actions: Bun install + `astro check` + build, SHA-stamped)

## M1 — Theme engine (finish the interactive layer)

- [x] `ThemeSwitcher` island (nav dropdown; reads `visibleThemes(unlocked)`)
- [x] `⌘K` command palette with "Theme: <name>" actions + nav links
- [x] Wire `initKonami()` + footer-dot `tapUnlock()` (mobile) on mount
- [x] Tailwind v4 wired (CSS-first @theme → tokens); Svelte 4→5 runes fix;
      SSR smoke-tested (cookie theming honored, 0 render errors)
- [x] Lock `/unlock` to a legible theme (chrome=false + forceTheme cyberpunk) —
      browser-verified: stays cyberpunk under a `zine` cookie, 0 nav
- [x] Unlock toast + reduced-motion-safe confetti (UnlockToast island; confetti
      guarded on prefers-reduced-motion; global keyframes for JS-created nodes)
- [x] WCAG-AA contrast gate (`scripts/contrast-check.ts`, wired into build + CI).
      Caught 7 real AA failures across 6 themes — all fixed; 15/15 pass now
- [x] Browser-verified themes (cyberpunk/light/vaporwave/blueprint/solarpunk/zine)
      via headless chromium + cookie; SSR applies correct data-theme each time
- [x] Fixed double-footer (index had inline footer + Base footer → 1 now)
- [x] No-flash sweep: all 15 themes SSR-render the correct data-theme via cookie
      (+ bogus cookie falls back to cyberpunk). Verified.

**M1 complete.**

## M2 — Backend stack up  ⚠️ BLOCKED: needs the Arcane box + real secrets

- [x] Compose file statically validated (10 services, networks, volumes; all 11
      `${VAR}` refs documented in `.env.example`). Verified off-box via YAML lint.
- [ ] Bring up compose stack — **must run on the personal Arcane Docker box**,
      NOT the corp dev desktop (this box has Docker 25 but no Compose v2 plugin,
      and the stack is personal). User-driven: `docker compose -f infra/... up -d`
- [ ] Import `pb_schema.json` via PB admin UI
- [ ] Create the service-token superuser; fill `infra/.env`
- [ ] Confirm hooks fire (moderation forces `approved=false`; ntfy pings)
- [ ] Smoke-test `serverClient()` reads a `recruiter_content` row

## M3 — Core content surfaces

- [x] Home: hero + Currently block + CTAs + featured work + build-info footer
      (PB-backed with static dev fallback). Browser-verified.
- [x] Build-info footer (deploy SHA via vite define; service-health dot)
- [x] `/work` projects index (PB `projects` + fallback; client-side tech filter)
- [x] `/work/[slug]` project detail (PB getFirstListItem + fixtures; redirects if missing)
- [x] `/uses` page (PB `uses_items`, grouped by category, + fallback)
- [x] `/colophon` — interactive SVG architecture diagram of this stack
      (click-a-node, theme-token styled). Browser-verified interaction works.
- [x] Self-hosted fonts — Fontsource variable Inter + JetBrains Mono (bundled
      woff2, zero external requests; verified 0 google-font refs in output).
      Token stacks prefer them with system fallbacks.
- [x] OG share cards — satori + resvg, dynamic `/og/<title>.png` endpoint
      (1200x630 cyberpunk card; fonts embedded via a ?arraybuffer vite plugin so
      no runtime FS read). OG + Twitter meta wired into Base for every page;
      browser-verified the rendered PNG. (full per-page polish: M9)
- [ ] AVIF/WebP responsive images (deferred to M9 — no real images yet)

**M3 done** (5 surfaces + self-hosted fonts + OG cards; build/check green,
runtime-verified). PB-with-static-fallback so everything renders before M2.

## M4 — Blog (MDX)

- [x] Astro content collection in `src/content` (frontmatter schema + 2 posts)
- [x] `/blog` index + `/blog/[slug]` (Shiki highlight via MDX, reading time, tags;
      prerendered, theme-token prose styling)
- [x] RSS feed (`/rss.xml`) — sitemap dropped (sitemap@3.7 crashes under this
      SSR+prerender mix; RSS is the primary feed). OG cards per post via ogTitle.
- [x] `comments` island wired (moderated; fail-soft if PB down). Browser-verified.
- [ ] Build-time OG image generation already covered by the /og endpoint (M3)


## M5 — Recruiter gate  ✅ (end-to-end verified)

- [x] `scripts/hash-passphrase.ts` (argon2id generator) — verified produces a hash
- [x] `POST /api/unlock` — argon2 verify + signed httpOnly cookie + in-memory
      rate-limit (8/15min) + generic errors (no oracle)
- [x] Writes `recruiter_unlocks` row → ntfy hook on success (fail-soft if backend down)
- [x] `/private` server-renders `recruiter_content` via PB service token
      (fallback placeholders if backend down); pinned to a legible theme
- [x] Middleware guards `/private*` → redirect to /unlock without a valid cookie
- [x] `/api/logout` clears the cookie
- [x] **E2E verified**: deny-no-cookie (302), wrong-pass (303 no cookie),
      right-pass (303 + signed cookie), authed render (200 ● unlocked),
      TAMPERED cookie rejected (302). 0 server errors.

Session = HMAC-SHA256-signed token (SESSION_SECRET), constant-time verify,
30-day expiry. No DB session table — the signed cookie is the proof.

## M6 — Live data widgets (server-fetched, cached)  ✅

- [x] GitHub activity — server fetch (token-optional), 30-min TTL cache; home
      shows repos/followers/last-push + top-4 repo cards. LIVE-verified against
      OnlyOneByte (real data: 5 repos, ★ counts). Fail-soft: bad user → hidden.
- [x] Wakapi "Currently" — WakaTime-compatible summary fetch, 10-min cache;
      home block shows top language + today's time. Fail-soft → "building
      things" placeholder when unconfigured (lights up once the box API is set).
- [x] Short server-side TTL cache (lib/widgets/cache.ts) keeps tokens server-side.


## M7 — Interactions (Pocketbase-backed)  ✅

- [x] Guestbook (/guestbook): moderated append (server hook forces approved=
      false) + honeypot; lists approved entries; fail-soft if PB down
- [x] Reactions (👍🔥❤️ STATIC counts) island on blog posts; optimistic bump,
      server-side unique-index dedup + local "already reacted"; realtime deferred
- [x] Contact form (/contact + POST /api/contact) → contact_messages (ntfy hook)
      + honeypot + rate-limit; verified honeypot POST is silently dropped
- [x] Nav updated (guestbook, contact). build ✓ + check 36 files/0 errors;
      all pages 200, 0 errors, honeypot verified.


## M8 — Companion services wired into the site  ✅ (env-gated, fail-soft)

- [x] Umami snippet (Analytics.astro) — emitted only when PUBLIC_UMAMI_URL/_ID
      set; cookieless; verified absent without env (clean dev/preview)
- [x] Cal.com (/cal) — embeds PUBLIC_CAL_URL iframe when set, else a graceful
      "book via /contact" fallback (verified)
- [x] /resume.pdf — renders print HTML from recruiter_content (fallback résumé)
      → Gotenberg Chromium → streams PDF; if Gotenberg down, serves the HTML
      (browser Print-to-PDF). Fallback path verified (name + sections render)
- [x] Homelab status (lib/widgets/status.ts) → footer up/total from Uptime Kuma
      status API when KUMA_STATUS_URL set, else static "9/9". Wired into Footer.
- [x] build ✓ + check 40 files/0 errors; all routes 200, 0 errors.


## M9 — Fun & polish  ✅

- [x] 404 mini-game (Game404.svelte) — "catch the falling bytes" canvas game;
      arrow/pointer control; reduced-motion → static message. Browser-verified live.
- [x] Terminal easter egg (Terminal.svelte) — backtick toggles a shell with
      whoami/ls/theme/sudo hire-me/clear/exit. Verified opens on backtick.
- [x] Astro View Transitions (ViewTransitions; note: this Astro exports
      ViewTransitions, not ClientRouter) — smooth cross-page nav
- [x] a11y: skip-link, visible focus rings, global prefers-reduced-motion guard
      (kills view-transitions + long animations + smooth scroll)
- [ ] WebGL hero / resume timeline / magnetic buttons (optional — deferred)
- [ ] full axe sweep (deferred to M10 final eyes-on)

build ✓ + check 41 files/0 errors; 404 + transitions + terminal verified.


## M10 — Deploy & launch

- [ ] Point `ryang.dev` (+ `pb. stats. wakapi. cal. status.`) DNS at the router
- [ ] Apply router Caddyfile; verify TLS + forwarded headers
- [ ] Backups: PB `pb_data` schedule (+ off-box copy); pg_dump crons
- [ ] Lighthouse CI budget (perf/a11y/SEO) in the pipeline
- [ ] Final eyes-on across themes + mobile; launch 🚀

---

## Post-v1 backlog

- [ ] Live cursors (`presence` collection) + realtime reactions
- [ ] Tier-3 layout *modes*: Terminal/TUI, Bento, Editorial (DOM reshape)
- [ ] AI "ask my résumé" bot (self-hosted Ollama container)
- [ ] Newsletter (Listmonk), Meilisearch site search, URL shortener
- [ ] Webmentions / IndieWeb, git-commit RSS, /now + TIL streams
- [ ] Watchtower auto-updates for upstream images

---

## Suggested build order

A pragmatic path that front-loads visible progress and unblocks everything else:

```
M0 finish (build clean)  →  M2 (stack up)  →  M1 (theme switcher)  →
M3 (core surfaces)  →  M5 (recruiter gate)  →  M6 (live widgets)  →
M4 (blog)  →  M7 (interactions)  →  M8 (companion services)  →
M9 (polish)  →  M10 (launch)
```

Rationale: get the backend live early (M2) so content surfaces (M3) have real
data; ship the theme switcher right after so every later screen is built in the
final visual language; gate + widgets are high-signal for recruiters; blog and
interactions layer on; polish and launch last.
