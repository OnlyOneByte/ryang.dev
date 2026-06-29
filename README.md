# angryang.dev

Personal portfolio + homelab showcase for **Richard Yang** — a self-hosted,
blazing-fast Astro site backed by Pocketbase, with a 15-theme switching engine
(Cyberpunk default, Konami-unlockable skins).

This is a **monorepo**. Application code, Docker build recipes, and orchestration
config live in separate top-level folders.

```
angryang.dev/
├── docs/        ← design docs (architecture, theme engine, schema, gate, deploy)
├── apps/        ← application code (apps/web = the Astro SSR site)
├── services/    ← service-owned config/data (Pocketbase schema, hooks, migrations)
├── docker/      ← Dockerfiles (build recipes only)
└── infra/       ← orchestration (docker-compose, .env, external Caddy snippets)
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro (SSR/Node) + islands |
| Styling | Tailwind CSS + CSS-variable theme tokens |
| Backend | Pocketbase (auth, SQLite, file storage, admin UI, realtime) |
| Analytics | Umami (+ Postgres) |
| Coding stats | Wakapi (self-hosted WakaTime) |
| Scheduling | Cal.com (+ Postgres) |
| Notifications | Ntfy (push on contact / recruiter unlock) |
| PDF résumé | Gotenberg (HTML → PDF) |
| Status page | Uptime Kuma |
| Package manager / runtime | Bun (workspaces) |
| TLS / proxy | **External** router Caddy (this box serves plain HTTP on the LAN) |
| Orchestration | `docker compose` (managed in Arcane) |

## Quickstart

```bash
# 1. install Bun (one time)
curl -fsSL https://bun.sh/install | bash

# 2. install workspace deps
bun install

# 3. run the web app locally
bun run --filter web dev        # → http://localhost:4321

# 4. or bring up the full self-hosted stack
cp infra/.env.example infra/.env   # then fill in secrets
docker compose -f infra/docker-compose.yml up -d
```

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the full local workflow and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the homelab deploy.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack + 9-container topology
- [`docs/THEME-ENGINE.md`](docs/THEME-ENGINE.md) — token taxonomy, registry, Konami unlock
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — Pocketbase collections + privacy tiers
- [`docs/RECRUITER-GATE.md`](docs/RECRUITER-GATE.md) — shared-password gate flow
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — router Caddy, subdomains, backups
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local dev quickstart
