#!/usr/bin/env bun
/**
 * One-time helper: argon2-hash the recruiter passphrase. Run on the box; paste
 * the printed hash into infra/.env as RECRUITER_HASH. Never commit the plaintext.
 *
 *   bun run apps/web/scripts/hash-passphrase.ts "your-shared-passphrase"
 */
import { hash } from '@node-rs/argon2';

const passphrase = process.argv[2];
if (!passphrase) {
  console.error('usage: bun run scripts/hash-passphrase.ts "<passphrase>"');
  process.exit(1);
}

// argon2id defaults are sane for an interactive secret; tune if desired.
const digest = await hash(passphrase, {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
});

console.log('\nRECRUITER_HASH=' + digest + '\n');
console.log('Paste the line above into infra/.env (do NOT commit the plaintext).');
