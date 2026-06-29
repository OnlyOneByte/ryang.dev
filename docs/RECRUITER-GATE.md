# Recruiter Gate

A single **shared passphrase** you hand out personally ("someone has to reach
out to me"). No visitor accounts, no sign-up. Unlocks a private CV / salary
expectations / references section.

## Flow

```
Visitor hits /private  ──▶  no valid session cookie  ──▶  redirect to /unlock
   enters the passphrase you gave them
       │
       ▼
POST /api/unlock  (Astro server endpoint)
   argon2.verify(input, RECRUITER_HASH from env)
   ✓ match  ──▶  set signed cookie: httpOnly · Secure · SameSite=Lax · 30-day
                 write a recruiter_unlocks row → Ntfy ping
   ✗ miss   ──▶  rate-limited 401 (generic error; lockout after N tries)
       │
       ▼
/private renders SERVER-SIDE (Astro frontmatter holds the PB service token)
   fetches recruiter_content (all-null rules; only the server token can read it)
   data never reaches the browser until after the cookie check passes
```

## Security properties

- Passphrase is **never in the image** — only an argon2 hash in `.env`
  (`RECRUITER_HASH`), generated once with a helper script.
- Session cookie is **signed** with `SESSION_SECRET`; `httpOnly` (no JS access);
  `Secure` + `SameSite=Lax` keyed to the public `https://ryang.dev` origin,
  trusting the router's `X-Forwarded-Proto`.
- The gated content lives in a **non-public Pocketbase collection**
  (`recruiter_content`, all rules `null`); only Astro's server token reads it.
- The `/unlock` endpoint is **rate-limited** with generic errors (no
  "wrong password" vs "no user" leak).
- `/unlock` and `/private` are pinned to a legible theme (cyberpunk/light) so a
  skin can never hurt CV readability.

## Env

| var | purpose |
|---|---|
| `RECRUITER_HASH` | argon2 hash of the shared passphrase (generate once) |
| `SESSION_SECRET` | HMAC key used to sign the session cookie |
| `PB_SERVICE_EMAIL` / `PB_SERVICE_PASSWORD` | PB superuser the server authenticates as |

## Generating the hash

```bash
# one-time, on the box (never commit the plaintext)
bun run apps/web/scripts/hash-passphrase.ts "your-shared-passphrase"
# → paste the printed argon2 hash into infra/.env as RECRUITER_HASH
```
