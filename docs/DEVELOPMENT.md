# Development

## Prerequisites

- **Bun** ≥ 1.1 — `curl -fsSL https://bun.sh/install | bash`
- **Docker** + `docker compose` (for the backing services)

## Install

```bash
bun install        # installs all workspace deps from the repo root
```

## Run the web app alone

Point the app at a Pocketbase you run locally (or the box's `pb.ryang.dev`):

```bash
cp infra/.env.example infra/.env     # set PB_URL etc. for local dev
bun run --filter web dev             # → http://localhost:4321
```

## Run the full stack locally

```bash
bun run stack:dev                    # compose up with the dev override
```

`infra/docker-compose.dev.yml` overrides the `web` service to hot-reload from a
bind mount and exposes service ports on localhost.

## Workspace layout

```
apps/web         the Astro app (only workspace member today)
packages/*       (future) shared TS — types, ui kit, etc.
```

Run a script in a specific workspace:

```bash
bun run --filter web <script>        # e.g. dev, build, preview, test
```

## Adding a Pocketbase hook

1. Add/edit a `*.pb.js` file in `services/pocketbase/pb_hooks/`.
2. `docker compose -f infra/docker-compose.yml restart pocketbase`.
3. The new logic is live (volume-mounted — no rebuild).

## Theme work

- Palette tweaks: edit the relevant `[data-theme="…"]` block in
  `apps/web/src/styles/tokens.css`. No component changes — that's the contract.
- New theme: add a token block + a registry entry in
  `apps/web/src/styles/themes.ts`. Keep `--text`/`--bg` WCAG-AA compliant.

## Conventions

- Components read **only** theme tokens (`var(--accent)`), never raw hex.
- Gated/secret reads happen in Astro server code, never in a client island.
- MDX blog posts live in `apps/web/src/content`; commit them like code.
