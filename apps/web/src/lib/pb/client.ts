/**
 * Pocketbase access.
 *
 * - publicClient(): for public collections (projects, uses, now, reactions,
 *   approved guestbook/comments). Safe to use anywhere.
 * - serverClient(): authenticates as the superuser SERVICE TOKEN and can read
 *   null-ruled collections (recruiter_content, contact_messages). MUST only be
 *   called from Astro server code (endpoints / .astro frontmatter) — never an
 *   island. The token never reaches the browser.
 */
import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://pocketbase:8090';

/** Unauthenticated client for public reads. */
export function publicClient(): PocketBase {
  return new PocketBase(PB_URL);
}

let cached: { pb: PocketBase; until: number } | null = null;

/**
 * Superuser-authenticated client (cached ~50 min). Server-only.
 * Throws if the service credentials are missing.
 */
export async function serverClient(): Promise<PocketBase> {
  const now = Date.now();
  if (cached && cached.until > now && cached.pb.authStore.isValid) {
    return cached.pb;
  }
  const email = process.env.PB_SERVICE_EMAIL;
  const password = process.env.PB_SERVICE_PASSWORD;
  if (!email || !password) {
    throw new Error('PB_SERVICE_EMAIL / PB_SERVICE_PASSWORD not set — cannot read gated collections.');
  }
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(email, password);
  cached = { pb, until: now + 50 * 60 * 1000 };
  return pb;
}
