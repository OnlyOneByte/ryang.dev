# Architecture

## Overview

`ryang.dev` is a self-hosted personal portfolio. Everything runs on one
Docker box on the LAN; TLS terminates at an **external router Caddy**, which
reverse-proxies to plain-HTTP services on the box.

```
Internet ──▶ Router (Caddy: TLS + reverse proxy) ──▶ Docker box (LAN, plain HTTP)
                                                      ├─ web         :4321  Astro SSR
                                                      ├─ pocketbase  :8090  auth/SQLite/files/realtime
                                                      ├─ umami       :3000  analytics
                                                      ├─ umami-db     (Postgres, internal)
                                                      ├─ wakapi      :3001  coding stats
                                                      ├─ cal         :3002  scheduling
                                                      ├─ cal-db       (Postgres, internal)
                                                      ├─ ntfy        :8085  push (internal)
                                                      ├─ uptime-kuma :3010  status page
                                                      └─ gotenberg   :3020  HTML→PDF (internal)
```

## Public subdomains (mapped by the router)

| Subdomain | → box service |
|---|---|
| `ryang.dev` | `web:4321` |
| `pb.ryang.dev` | `pocketbase:8090` |
| `stats.ryang.dev` | `umami:3000` |
| `wakapi.ryang.dev` | `wakapi:3001` |
| `cal.ryang.dev` | `cal:3002` |
| `status.ryang.dev` | `uptime-kuma:3010` |

`ntfy` and `gotenberg` stay internal — only `web` talks to them over the compose network.

## Request / trust model

- The browser only ever sees **HTTPS** (`https://ryang.dev`). The box speaks
  HTTP on the LAN; the router adds TLS.
- Cookies are issued `Secure` + `SameSite=Lax` + `httpOnly` keyed to the public
  origin. The app trusts the router's `X-Forwarded-Proto` / `X-Forwarded-For`.
- CORS / CSRF allowlists are pinned to `https://ryang.dev` (+ subdomains).

## Data ownership (no duplication)

- **Analytics** → Umami (own Postgres). The app does **not** store pageviews.
- **Coding stats** → Wakapi (own DB/API). The "Currently" widget reads Wakapi.
- **Blog posts** → MDX in `apps/web/src/content` (git-backed). Pocketbase only
  stores `comments.postSlug` pointing at them.
- **Structured content + interactions** → Pocketbase (see `SCHEMA.md`).
- **Visitor accounts** → none. Recruiter mode is a shared password; the only PB
  auth identity is the superuser admin + the server's service token.

## Repo layout

```
docs/        design docs (this file + 5 others)
apps/web/    the Astro app (pages, islands, MDX, theme engine, PB client)
services/pocketbase/   pb_schema.json, pb_hooks/, pb_migrations/  (volume-mounted)
docker/      web.Dockerfile (+ optional pocketbase.Dockerfile)
infra/       docker-compose.yml, .env.example, caddy/ryang.dev.Caddyfile
```

## Tooling

- **Bun** is the package manager, runtime, bundler, and test runner. Root
  `package.json` declares workspaces (`apps/*`, `packages/*`).
- The `web` container is built `FROM oven/bun` (small, fast cold start).
- Pocketbase runs from the upstream image with `pb_hooks/` **volume-mounted**
  for fast iteration; an optional `docker/pocketbase.Dockerfile` bakes hooks
  into an immutable image for reproducible prod.

## Performance posture ("blazing fast")

- Astro ships **zero JS by default**; only islands hydrate.
- Self-hosted fonts (no Google Fonts), AVIF/WebP responsive images.
- Theme switch is a pure CSS-variable swap (no re-render, no rebuild).
- Build-info footer surfaces deploy SHA, uptime, and service health.
