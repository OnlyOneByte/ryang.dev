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

async function authenticate(): Promise<PocketBase> {
  const email = process.env.PB_SERVICE_EMAIL;
  const password = process.env.PB_SERVICE_PASSWORD;
  if (!email || !password) {
    throw new Error('PB_SERVICE_EMAIL / PB_SERVICE_PASSWORD not set — cannot read gated collections.');
  }
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(email, password);
  cached = { pb, until: Date.now() + 50 * 60 * 1000 };
  return pb;
}

/**
 * Superuser-authenticated client (cached ~50 min). Server-only.
 * Re-authenticates if the cached token is missing/expired OR if PB reports the
 * store invalid (e.g. PB restarted and rotated its signing key before our TTL).
 * Throws if the service credentials are missing.
 */
export async function serverClient(): Promise<PocketBase> {
  if (cached && cached.until > Date.now() && cached.pb.authStore.isValid) {
    return cached.pb;
  }
  cached = null;
  return authenticate();
}

/**
 * Run a server-token PB call, retrying ONCE on an auth failure (401/403) by
 * forcing a fresh login. Guards against a stale cached token after a PB
 * restart that the TTL hasn't caught yet.
 */
export async function withServerClient<T>(fn: (pb: PocketBase) => Promise<T>): Promise<T> {
  const pb = await serverClient();
  try {
    return await fn(pb);
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 401 || status === 403) {
      cached = null;
      const fresh = await authenticate();
      return fn(fresh);
    }
    throw err;
  }
}
