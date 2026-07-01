# Deploy Cheat-Sheet (paste-on-the-box)

One-screen reference for deploying `ryang.dev` on the Arcane Docker box.
Full detail in `DEPLOYMENT.md` / `LAUNCH.md`; this is the fast path.

> **Finch / other tool?** Commands below say `docker`, but the container tool is
> parameterized. Either prefix the `bun run stack:*` scripts with
> `CONTAINER_TOOL=finch`, or just read `docker` as `finch` in the raw commands
> (`finch compose ...` is drop-in). On Apple Silicon also see the cal.com caveat
> in `DEPLOYMENT.md` → use `bun run stack:up:lite`.

## First deploy

```bash
git clone git@github.com:OnlyOneByte/ryang.dev.git && cd ryang.dev
cp infra/.env.example infra/.env

# generate the two secrets you can't fake:
openssl rand -hex 32                                   # → SESSION_SECRET
bun run apps/web/scripts/hash-passphrase.ts "PASSPHRASE"  # → RECRUITER_HASH
# edit infra/.env: paste those + fill PB_SERVICE_*, NTFY_*, POSTGRES_*, etc.

docker compose -f infra/docker-compose.yml up -d        # bring up all 9 services
```

## Pocketbase bootstrap (once)

```bash
# Binary lives at /usr/local/bin/pocketbase; pass --dir=/pb_data so the
# superuser lands in the SAME data dir the server serves from (this image runs
# `serve --dir=/pb_data`; omitting it writes to a cwd-relative dir the server
# never reads → auth fails).
docker compose -f infra/docker-compose.yml exec pocketbase \
  /usr/local/bin/pocketbase superuser create "$PB_SERVICE_EMAIL" "$PB_SERVICE_PASSWORD" --dir=/pb_data
# then: http://<box-ip>:8090/_/  (LAN admin)  →  Settings → Import collections →
#       paste services/pocketbase/pb_schema.json
# seed public-safe content (idempotent; skips non-empty collections):
#   PB_URL=http://<box-ip>:8090 PB_SUPERUSER_EMAIL=$PB_SERVICE_EMAIL \
#   PB_SUPERUSER_PASSWORD=$PB_SERVICE_PASSWORD bun run services/pocketbase/seed.ts
# recruiter_content is GATED → fill pb_seed/recruiter_content.template.json + import privately
```

> ⚠️ `/resume.pdf` is a STATIC public file (`apps/web/public/resume.pdf`) with
> public-safe content only — it never reads `recruiter_content`. `salary` /
> `references` live ONLY on `/private` (gated, shown after unlock).

## Public env (lights up integrations — all fail-soft if unset)

Set in `infra/.env`, then just `docker compose ... up -d` (read at RUNTIME via
the `/env.js` endpoint + SSR — no `build web` needed; one image, any backend):

```
PUBLIC_UMAMI_URL=https://stats.ryang.dev/script.js
PUBLIC_UMAMI_ID=<uuid>                     # analytics
PUBLIC_CAL_URL=https://cal.ryang.dev/angelo/intro
KUMA_STATUS_URL=https://status.ryang.dev/api/status-page/heartbeat/<slug>
WAKAPI_API_URL=https://wakapi.ryang.dev/api ; WAKAPI_API_KEY=<key>
GITHUB_USER=OnlyOneByte ; GITHUB_TOKEN=<pat>   # token optional
```

## Router Caddy (on the router, not the box)

Add `infra/caddy/ryang.dev.Caddyfile` (replace `BOX_LAN_IP`), reload Caddy.
Maps: `ryang.dev`→4321 · `stats.`→3000 · `wakapi.`→3001 ·
`cal.`→3002 · `status.`→3010. (PB is internal-only — not routed; admin UI is
LAN at `<box-ip>:8090/_/`.)

## Day-2 ops

```bash
# update the app only
git pull && docker compose -f infra/docker-compose.yml build web && \
  docker compose -f infra/docker-compose.yml up -d

# update upstream images (umami/wakapi/cal/…)
docker compose -f infra/docker-compose.yml pull && \
  docker compose -f infra/docker-compose.yml up -d

# edit a PB hook (volume-mounted — no rebuild)
$EDITOR services/pocketbase/pb_hooks/ntfy.pb.js
docker compose -f infra/docker-compose.yml restart pocketbase

# logs / status
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs -f web
```

## Backups (do not skip)

```bash
# Pocketbase: admin UI → Settings → Backups → schedule (S3-compatible OK)
# Postgres (umami/cal):
docker compose -f infra/docker-compose.yml exec umami-db \
  pg_dump -U "$UMAMI_DB_USER" "$UMAMI_DB_NAME" > umami-$(date +%F).sql
```

## Smoke test after deploy

```bash
curl -sI https://ryang.dev | head -1                      # 200
curl -s https://ryang.dev/resume.pdf -o /tmp/r.pdf; file /tmp/r.pdf  # PDF
# recruiter: open /unlock, enter passphrase → /private renders PB content
# contact form → you get an ntfy push
```

## Local dev (any machine with Bun)

```bash
bun install
bun run --filter web dev      # http://localhost:4321  (all integrations fail-soft)
bun run --filter web build    # runs: contrast gate → astro build
bun run --filter web test     # unit tests incl. resume-leak regression
```

## Gotchas (learned the hard way)

- **Bun on a corp box** inherits CodeArtifact → 401s. `bunfig.toml` pins public npm.
- **`bun.lock`** (text) is committed; the binary `bun.lockb` is gitignored.
- **PB hooks** are JS in `pb_hooks/` — volume-mounted by default (edit+restart).
- **Cookies** need the router to forward `X-Forwarded-Proto: https` or the
  recruiter session `Secure` flag won't stick.
