# Pocketbase Schema

11 collections across 3 privacy tiers. Importable via `services/pocketbase/pb_schema.json`
(0.28-format `fields`; verified import-clean against the pinned image by the
`pocketbase-smoke` CI job). Public-safe content seeds from
`services/pocketbase/pb_seed/<collection>.json` via `bun run services/pocketbase/seed.ts`;
gated `recruiter_content` ships only as a `.template.json` to fill in privately.
Live cursors (`presence`) are **deferred to post-v1** (documented at the bottom).

## Privacy tiers (API rules)

Pocketbase rules: `null` = admin/superuser only · `""` = public · or an expression.

- 🌍 **Public-read** — `listRule`/`viewRule = ""`, writes admin-only.
- ✍️ **Public-write, moderated** — `createRule = ""` but a hook forces
  `approved=false`; only approved rows are publicly readable.
- 🔒 **Server-only** — all rules `null`. The public API can never read them;
  Astro's server reads them with a **superuser service token** (env-only).

## Collections

### 🌍 projects
| field | type | notes |
|---|---|---|
| title | text | required |
| slug | text | required, unique index |
| summary | text | card blurb |
| description | editor | rich body |
| tech | json | `["Go","Docker"]` |
| repoUrl / liveUrl | url | optional |
| coverImage | file | single, image-only |
| featured | bool | homepage "Selected Work" |
| order | number | manual sort |
| status | select | active / wip / archived |

Rules: list/view `""` · create/update/delete `null`. Index: `(featured, order)`.

### 🌍 uses_items
`category` (select: hardware/software/dev-tools/desk) · `name` · `description` ·
`url` · `order`. Rules: public read, admin write.

### 🌍 now
`focus` (text) · `note` (editor) · `updatedAt` (autodate). The live Rust/4h12m
half comes from **Wakapi's API**, not PB. Public read, admin write.

### ✍️ guestbook
`name` (≤60) · `message` (≤500) · `website` (url, optional) · `approved` (bool,
default false) · `ipHash` (hidden). Rules: list/view `approved = true` ·
create `""` · update/delete `null`. Hook forces `approved=false` + sets `ipHash`.

### ✍️ comments
`postSlug` (text, indexed → MDX post) · `author` · `body` · `parent`
(self-relation, optional threading) · `approved` · `ipHash`. Same moderated
rules as guestbook.

### 🌍 reactions
`targetType` (select: post/project) · `targetId` · `emoji` (select) ·
`sessionHash`. Rules: list/create `""` · update/delete `null`. Unique index on
`(sessionHash,targetId,emoji)` for dedup. **v1 = static counts** (read on load;
realtime bumps deferred alongside `presence`).

### 🔒 contact_messages
`name` · `email` · `subject` · `body` · `read` (bool) · `ipHash`. Rules:
create `""` · list/view/update/delete `null`. Hook `onRecordAfterCreate` → POST
to Ntfy. Inbox read via PB admin UI.

### 🔒 recruiter_content
`section` (select: cv/salary/references/availability) · `title` · `body`
(editor) · `order` · `visible` (bool). Rules: **all `null`**. After the argon2
cookie gate passes, Astro's server token fetches and renders server-side.

### 🔒 recruiter_unlocks
`ipHash` · `userAgent` · `unlockedAt`. Write-on-unlock from the gate endpoint;
fires Ntfy ("someone opened recruiter mode 👀"). All rules `null`.

## Hooks (`services/pocketbase/pb_hooks/`)

> **Requires Pocketbase ≥ 0.23.** Hooks use the v0.23+ JSVM API
> (`onRecordCreateRequest`, `onRecordAfterCreateSuccess`, `e.next()`). On 0.22
> they silently fail to register — and since `approved`/`read` are not field-
> write-protected by rules, guestbook/comments could be self-approved. The
> compose image is pinned ≥ 0.23 for exactly this reason.

1. **moderation.pb.js** — server-side write hardening for public-write
   collections (rules gate WHO writes, not WHICH fields):
   - guestbook/comments: force `approved=false` + server-stamp `ipHash`
   - contact_messages: force `read=false` + server-stamp `ipHash`
   - reactions: server-stamp `sessionHash` (from hashed IP) so dedup can't be
     defeated by a spoofed client session.
2. **ntfy.pb.js** — POST to Ntfy on `contact_messages` + `recruiter_unlocks` create.

Public-write text fields are length-capped in the schema (postSlug 200,
targetId 200, contact name/subject 120/200, ipHash/sessionHash 128) to bound
junk/oversized rows.

## Service-token pattern

Reading `null`-ruled collections needs superuser auth. Astro authenticates once
at server start as a dedicated PB superuser (creds in `.env`, server-only),
caches the token, and uses it for `recruiter_content` / `contact_messages`.
Never expose this token to the client — gated reads happen only in Astro server
endpoints / `.astro` frontmatter, never in an island.

---

## Post-v1: presence (live cursors)

`sessionHash` · `x` · `y` · `color` · `page` · `lastSeen`. Realtime subscription
drives live cursors. High-frequency writes — throttle client to ~8–10/s and run
a prune hook deleting rows older than ~10s. Deferred from v1.
