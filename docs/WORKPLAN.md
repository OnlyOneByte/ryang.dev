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
- [x] Lock `/unlock` to a legible theme (chrome=false + forceTheme cyberpunk)
- [ ] Unlock toast + reduced-motion-safe confetti/glitch
- [ ] Verify no-flash across all 15 themes (cold load each via cookie)
- [ ] WCAG-AA contrast check per theme (build-time gate)
- [ ] Lock `/private` to a legible theme (when the gate page lands in M5)

## M2 — Backend stack up

- [ ] Bring up compose stack on the box (`stack:up`)
- [ ] Import `pb_schema.json` via PB admin UI
- [ ] Create the service-token superuser; fill `infra/.env`
- [ ] Confirm hooks fire (moderation forces `approved=false`; ntfy pings)
- [ ] Smoke-test `serverClient()` reads a `recruiter_content` row

## M3 — Core content surfaces

- [ ] Home: full hero + Currently block + CTAs + featured work + build-info footer
- [ ] Build-info footer (deploy SHA, build time, uptime, service health)
- [ ] `/work` projects index (PB `projects`, featured + filter by tech)
- [ ] `/work/[slug]` project detail
- [ ] `/uses` page (PB `uses_items`, grouped by category)
- [ ] `/colophon` — interactive architecture diagram of this very stack
- [ ] Self-hosted fonts; AVIF/WebP responsive images

## M4 — Blog (MDX)

- [ ] Astro content collection in `src/content` (frontmatter schema)
- [ ] `/blog` index + `/blog/[slug]` with Shiki highlight, reading time, auto-TOC
- [ ] RSS feed + sitemap
- [ ] Build-time OG image generation (satori) per page
- [ ] `comments` wired (moderated; keyed on postSlug)

## M5 — Recruiter gate

- [ ] `scripts/hash-passphrase.ts` (argon2 hash generator)
- [ ] `POST /api/unlock` — argon2 verify + signed cookie + rate-limit + lockout
- [ ] Write `recruiter_unlocks` row → ntfy ping on success
- [ ] `/private` server-renders `recruiter_content` via service token
- [ ] Middleware: redirect `/private` → `/unlock` without a valid cookie

## M6 — Live data widgets (server-fetched, cached)

- [ ] GitHub activity (pinned repos / contribution graph / latest commits)
- [ ] Wakapi "Currently" status (real coding-time feed → home block)
- [ ] Short server-side cache (TTL) so keys stay server-side, fast renders

## M7 — Interactions (Pocketbase-backed)

- [ ] Guestbook (moderated append + admin approve)
- [ ] Reactions (👍🔥❤️ — **static counts** for v1; realtime deferred)
- [ ] Contact form → `contact_messages` + ntfy ping
- [ ] Honeypot / basic rate-limit on public writes

## M8 — Companion services wired into the site

- [ ] Umami analytics snippet (cookieless; `stats.ryang.dev`)
- [ ] Cal.com booking embed / "Book a call" CTA (`cal.ryang.dev`)
- [ ] `/resume.pdf` → render print HTML from PB → Gotenberg → stream PDF
- [ ] Uptime Kuma status page + "homelab status" island reading its API

## M9 — Fun & polish

- [ ] 404 mini-game (pure island)
- [ ] Terminal easter egg (`whoami`, `ls projects`, `sudo hire-me`)
- [ ] Astro View Transitions between pages
- [ ] Scroll-driven section reveals (CSS scroll-timeline)
- [ ] WebGL hero (subtle; watch bundle) — optional
- [ ] Interactive resume timeline — optional
- [ ] Micro-delight: magnetic buttons, custom cursor, achievement toasts
- [ ] a11y pass: focus rings, skip-links, reduced-motion, axe clean

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
