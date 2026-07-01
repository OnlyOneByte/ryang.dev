/**
 * /api/guestbook — same-origin proxy so the browser never talks to Pocketbase
 * directly (PB is private on the compose network).
 *   GET  → approved entries (newest first)
 *   POST → sign the guestbook (JSON {name, message, website, trap})
 *
 * All PB access is server-side via the service token. Writes are forced
 * approved=false and stamped with a per-USER ipHash (from the forwarded client
 * IP — see client-hash.ts), never the web container's IP. Honeypot + rate-limit
 * deter spam. Fail-soft: PB down → GET returns [], POST returns a soft error.
 */
import type { APIRoute } from 'astro';
import { withServerClient } from '@/lib/pb/client';
import { checkRate } from '@/lib/auth/ratelimit';
import { clientHash } from '@/lib/auth/client-hash';

export const prerender = false;

type Entry = { id: string; name: string; message: string; website?: string; created: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const GET: APIRoute = async () => {
  try {
    const list = await withServerClient((pb) =>
      pb.collection('guestbook').getList(1, 50, { filter: 'approved = true', sort: '-created' })
    );
    const entries: Entry[] = (list.items as any[]).map((r) => ({
      id: r.id, name: r.name, message: r.message, website: r.website || undefined, created: r.created,
    }));
    return json({ entries });
  } catch {
    return json({ entries: [] }); // fail-soft: island shows "offline"/empty
  }
};

export const POST: APIRoute = async ({ request }) => {
  let name = '', message = '', website = '', trap = '';
  try {
    const b = await request.json();
    name = String(b.name ?? '').trim().slice(0, 60);
    message = String(b.message ?? '').trim().slice(0, 500);
    website = String(b.website ?? '').trim().slice(0, 200);
    trap = String(b.trap ?? '');
  } catch {
    return json({ ok: false, error: 'bad-input' }, 400);
  }

  if (trap) return json({ ok: true }); // honeypot: pretend success, write nothing
  if (!name || !message) return json({ ok: false, error: 'missing' }, 400);

  const hash = clientHash(request);
  if (!checkRate(`guestbook:${hash}`).allowed) return json({ ok: false, error: 'rate' }, 429);

  try {
    await withServerClient((pb) =>
      pb.collection('guestbook').create({
        name, message, website: website || undefined,
        approved: false, ipHash: hash,
      })
    );
  } catch {
    return json({ ok: false, error: 'backend' }, 502);
  }
  return json({ ok: true, pending: true });
};
