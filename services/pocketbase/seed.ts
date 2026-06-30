#!/usr/bin/env bun
/**
 * Seed Pocketbase with public-safe content from pb_seed/<collection>.json.
 *
 * Each file in pb_seed/ named "<collection>.json" is a plain array of records
 * POSTed to that collection. Run AFTER importing pb_schema.json and creating
 * the service superuser.
 *
 *   PB_URL=http://localhost:8090 \
 *   PB_SUPERUSER_EMAIL=... PB_SUPERUSER_PASSWORD=... \
 *   bun run services/pocketbase/seed.ts [--force] [--only projects,now]
 *
 * Idempotent: a collection that already has rows is SKIPPED unless --force.
 *
 * SAFETY: recruiter_content is intentionally NOT seeded here — it holds GATED
 * salary/references content and ships only as recruiter_content.template.json
 * for you to fill in + import privately (admin UI). This script refuses to load
 * any *.template.json so gated placeholders can never land in a real DB by
 * accident.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED_DIR = join(dirname(fileURLToPath(import.meta.url)), 'pb_seed');
const PB_URL = (process.env.PB_URL || 'http://localhost:8090').replace(/\/$/, '');
const EMAIL = process.env.PB_SUPERUSER_EMAIL || process.env.PB_SERVICE_EMAIL;
const PASSWORD = process.env.PB_SUPERUSER_PASSWORD || process.env.PB_SERVICE_PASSWORD;

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args[args.indexOf('--only') + 1];
const only = args.includes('--only') && onlyArg ? new Set(onlyArg.split(',')) : null;

if (!EMAIL || !PASSWORD) {
  console.error('✗ set PB_SUPERUSER_EMAIL + PB_SUPERUSER_PASSWORD (or PB_SERVICE_*)');
  process.exit(1);
}

async function api(path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(`${PB_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body } as const;
}

// auth as superuser
const auth = await api('/api/collections/_superusers/auth-with-password', {
  method: 'POST',
  body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
});
if (!auth.ok) {
  console.error(`✗ superuser auth failed (${auth.status}). Check creds + that the superuser exists in this PB's data dir.`);
  process.exit(1);
}
const token: string = (auth.body as any).token;
console.log(`✓ authenticated as ${EMAIL}`);

// discover seed files: "<collection>.json" — skip *.template.json (gated content)
const files = readdirSync(SEED_DIR)
  .filter((f) => f.endsWith('.json') && !f.endsWith('.template.json'))
  .sort();

let inserted = 0;
let skipped = 0;
for (const file of files) {
  const collection = file.replace(/\.json$/, '');
  if (only && !only.has(collection)) continue;

  const records = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8'));
  if (!Array.isArray(records)) {
    console.error(`  ✗ ${file}: expected a JSON array, skipping`);
    continue;
  }

  // idempotency: skip if the collection already has any rows (unless --force)
  const existing = await api(`/api/collections/${collection}/records?perPage=1`, {}, token);
  if (!existing.ok) {
    console.error(`  ✗ ${collection}: cannot read (${existing.status}) — does the collection exist? (import pb_schema.json first)`);
    continue;
  }
  const total = (existing.body as any).totalItems ?? 0;
  if (total > 0 && !force) {
    console.log(`  • ${collection}: ${total} existing row(s) — skipping (use --force to add anyway)`);
    skipped += records.length;
    continue;
  }

  let n = 0;
  for (const rec of records) {
    const r = await api(`/api/collections/${collection}/records`, {
      method: 'POST',
      body: JSON.stringify(rec),
    }, token);
    if (!r.ok) {
      console.error(`  ✗ ${collection}: insert failed (${r.status}): ${JSON.stringify(r.body).slice(0, 200)}`);
      continue;
    }
    n++;
  }
  console.log(`  ✓ ${collection}: inserted ${n}/${records.length}`);
  inserted += n;
}

console.log(`\nDone — inserted ${inserted}, skipped ${skipped}.`);
console.log('Note: recruiter_content is NOT seeded here (gated). Fill recruiter_content.template.json and import it privately.');
