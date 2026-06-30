# Deployment

Self-hosted on one Docker box, managed via Arcane + `docker compose`. TLS
terminates at an **external router Caddy** (a different machine); this box only
serves plain HTTP on the LAN.

## Topology

```
Internet ──▶ Router (Caddy: TLS + reverse_proxy) ──▶ Docker box (LAN IP, HTTP)
```

The router maps each public subdomain to a LAN `host:port`. The box binds
service ports on the LAN interface only; nothing is publicly exposed except via
the router.

## 1. First-time setup

```bash
git clone git@github.com:OnlyOneByte/ryang.dev.git
cd ryang.dev
cp infra/.env.example infra/.env
# fill in every secret in infra/.env (see table below)
docker compose -f infra/docker-compose.yml up -d
```

Then, one-time Pocketbase bootstrap:

```bash
# create the superuser the app authenticates as. Binary: /usr/local/bin/pocketbase.
# --dir=/pb_data targets the server's data dir (this image runs `serve --dir=/pb_data`);
# omitting it writes to a cwd-relative dir the server never reads → auth fails.
docker compose -f infra/docker-compose.yml exec pocketbase \
  /usr/local/bin/pocketbase superuser create "$PB_SERVICE_EMAIL" "$PB_SERVICE_PASSWORD" --dir=/pb_data
# import the schema (via admin UI → Settings → Import collections,
# paste services/pocketbase/pb_schema.json)
```

### Finch / Apple Silicon (Mac)

The container tool is parameterized — `bun run stack:*` uses `${CONTAINER_TOOL:-docker}`.
On a Mac with [Finch](https://github.com/runfinch/finch) instead of Docker:

```bash
finch vm init && finch vm start          # one-time: provision + start the Lima VM
CONTAINER_TOOL=finch bun run stack:up     # or: finch compose -f infra/docker-compose.yml up -d
```

All `docker compose …` commands in these docs work verbatim as `finch compose …`
(including `exec`, `logs`, `pull`). The `CONTAINER_TOOL` env var only affects the
`bun run stack:*` convenience scripts.

**cal.com is amd64-only** (no arm64 image). On Apple Silicon it runs only under
slow emulation and is the most fragile service to first-boot. Since `/cal` is
fail-soft (shows a "book via /contact" fallback when `PUBLIC_CAL_URL` is unset),
bring up everything *except* cal:

```bash
CONTAINER_TOOL=finch bun run stack:up:lite   # web + pocketbase + umami(+db) + wakapi + ntfy + kuma + gotenberg
```

> If umami/cal flake on first boot, your Finch may predate compose
> `depends_on: condition: service_healthy` support — check `finch --version` and
> update (the DB healthcheck gating that prevents the race is in the compose file).

## 2. Router Caddyfile

Add the snippets from `infra/caddy/ryang.dev.Caddyfile` to your router's Caddy
config, replacing `BOX_LAN_IP` with the Docker box's LAN address, then reload
Caddy. Each block is a `reverse_proxy` to a `host:port` on the box.

## 3. Environment variables

| var | used by | purpose |
|---|---|---|
| `PUBLIC_SITE_URL` | web | `https://ryang.dev` (cookie origin, CORS) |
| `RECRUITER_HASH` | web | argon2 hash of the recruiter passphrase |
| `SESSION_SECRET` | web | signs the recruiter session cookie |
| `PB_URL` | web | internal Pocketbase URL (`http://pocketbase:8090`) |
| `PB_PUBLIC_URL` | web | public PB URL (`https://pb.ryang.dev`) |
| `PB_SERVICE_EMAIL` / `PB_SERVICE_PASSWORD` | web, pocketbase | service-token superuser |
| `NTFY_URL` / `NTFY_TOPIC` | web, pocketbase | push notifications |
| `WAKAPI_API_URL` / `WAKAPI_API_KEY` | web | "Currently" coding stats |
| `GITHUB_TOKEN` / `GITHUB_USER` | web | GitHub activity widget |
| `GOTENBERG_URL` | web | HTML→PDF résumé (`http://gotenberg:3000`) |
| `UMAMI_*`, `CAL_*` | umami, cal | analytics + scheduling (own DBs) |
| `POSTGRES_*` (x2) | umami-db, cal-db | Postgres credentials |

## 4. Backups (the part that matters)

- **Pocketbase** is the only durable app datastore. Back up the `pb_data` volume
  on a schedule (`pocketbase` has built-in backups in the admin UI → Settings →
  Backups; can target an S3-compatible bucket).
- **umami-db / cal-db** Postgres volumes — `pg_dump` on a cron if you care about
  analytics/scheduling history.
- The **web** app is stateless (content is git + PB). No backup needed.
- Recommended: nightly volume snapshot + weekly off-box copy.

## 5. Pocketbase hooks: mount vs bake

- **Default (dev + homelab):** compose volume-mounts
  `services/pocketbase/pb_hooks/` into the upstream image. Edit a hook →
  `docker compose restart pocketbase` → live. No rebuild.
- **Reproducible prod:** build `docker/pocketbase.Dockerfile` (bakes hooks into
  an immutable image). Use when you want a registry-pullable, self-contained
  image. See that Dockerfile's header comment.

## 6. Updating

```bash
git pull
docker compose -f infra/docker-compose.yml build web   # rebuild only the app
docker compose -f infra/docker-compose.yml up -d
```

Upstream images (umami, wakapi, cal, etc.) update via
`docker compose pull && up -d`. Watchtower can automate this later if desired.
