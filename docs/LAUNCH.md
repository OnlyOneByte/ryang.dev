# Launch Runbook (M10)

Everything to take `angryang.dev` from "builds locally" to "live on the Arcane
box behind the router". Steps marked **[you]** require your box / DNS / domain
and can't be done from the dev desktop.

## 0. Pre-flight (done in-repo)

- [x] `bun run --filter web build` green · `astro check` 0 errors · contrast 15/15
- [x] 19 routes build; OG cards render; recruiter gate E2E-verified
- [x] No committed secrets; `.env` is gitignored; `.env.example` documents all vars
- [x] CI runs install + check + contrast + build on every push

## 1. Provision the box **[you]**

```bash
git clone git@github.com:OnlyOneByte/angryang.dev.git
cd angryang.dev
cp infra/.env.example infra/.env
# fill EVERY secret in infra/.env — see the table in docs/DEPLOYMENT.md
#   RECRUITER_HASH:  bun run apps/web/scripts/hash-passphrase.ts "<passphrase>"
#   SESSION_SECRET:  openssl rand -hex 32
#   PB_SERVICE_*, NTFY_*, WAKAPI_*, GITHUB_TOKEN, UMAMI_*, CAL_*, POSTGRES_* …
docker compose -f infra/docker-compose.yml up -d
```

## 2. Bootstrap Pocketbase **[you]**

```bash
docker compose -f infra/docker-compose.yml exec pocketbase \
  /pb/pocketbase superuser create "$PB_SERVICE_EMAIL" "$PB_SERVICE_PASSWORD"
```
Then PB admin UI → Settings → Import collections → paste
`services/pocketbase/pb_schema.json`. Add a couple `projects`, `uses_items`,
a `now` row, and your `recruiter_content` sections.

## 3. Wire the public env into the web build **[you]**

These `PUBLIC_*` vars are read at build/SSR and light up the integrations
(they're all fail-soft, so the site works without them — but this is launch):

| var | turns on |
|---|---|
| `PUBLIC_PB_URL=https://pb.ryang.dev` | guestbook/comments/reactions (browser) |
| `PUBLIC_UMAMI_URL` + `PUBLIC_UMAMI_ID` | analytics snippet |
| `PUBLIC_CAL_URL=https://cal.ryang.dev/...` | /cal embed |
| `KUMA_STATUS_URL` | live footer status |
| `WAKAPI_API_URL` + `WAKAPI_API_KEY` | "Currently" coding stats |
| `GITHUB_TOKEN` + `GITHUB_USER` | higher-rate GitHub widget |

Rebuild the web image after setting them: `docker compose ... build web && up -d`.

## 4. DNS + router Caddy **[you]**

Point these A/AAAA records at the router, then add the snippets from
`infra/caddy/ryang.dev.Caddyfile` (replace `BOX_LAN_IP`) and reload Caddy:

```
ryang.dev, www  →  router
pb.ryang.dev    →  router   (Pocketbase)
stats.ryang.dev →  router   (Umami)
wakapi.ryang.dev→  router   (Wakapi)
cal.ryang.dev   →  router   (Cal.com)
status.ryang.dev→  router   (Uptime Kuma)
```

Verify TLS + that the app sees `X-Forwarded-Proto: https` (recruiter cookie
needs Secure to stick).

## 5. Backups **[you]**

- PB admin → Settings → Backups → schedule (optionally S3-compatible target).
- `umami-db` / `cal-db`: nightly `pg_dump` cron.
- Weekly off-box copy of the `pb_data` volume.

## 6. Post-launch verification

- [ ] Each subdomain serves over HTTPS; no mixed-content
- [ ] Recruiter flow: unlock with the real passphrase → /private renders PB content
- [ ] Contact form → you get an ntfy push
- [ ] Guestbook/comment submit → appears as pending in PB admin
- [ ] Theme switch persists across nav; Konami unlock works; /404 game plays
- [ ] Lighthouse: perf/a11y/best-practices/SEO all ≥ 95 (see CI step)
- [ ] Social preview: paste a URL in a card validator → OG image shows

## 7. Lighthouse CI (in repo)

`.github/workflows/ci.yml` includes a Lighthouse job (runs against the built
preview). Tune budgets in `apps/web/lighthouserc.json`. It's advisory on PRs;
make it blocking once the numbers settle.

---

When all of §6 is checked: **launch 🚀**
