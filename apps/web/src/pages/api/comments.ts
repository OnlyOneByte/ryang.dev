/**
 * /api/comments — same-origin proxy for blog comments (PB is private).
 *   GET  ?postSlug=… → approved comments for that post (oldest first)
 *   POST → submit a comment (JSON {postSlug, author, body, trap})
 *
 * Server-side via the service token; writes forced approved=false + per-user
 * ipHash. Honeypot + rate-limit. Fail-soft.
 */
import type { APIRoute } from 'astro';
import { withServerClient } from '@/lib/pb/client';
import { checkRate } from '@/lib/auth/ratelimit';
import { clientHash } from '@/lib/auth/client-hash';

export const prerender = false;

type Comment = { id: string; author: string; body: string; created: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const postSlug = (url.searchParams.get('postSlug') || '').slice(0, 200);
  if (!postSlug) return json({ comments: [] }, 400);
  try {
    const list = await withServerClient((pb) =>
      pb.collection('comments').getList(1, 50, {
        // bind the value (no interpolation → no filter injection)
        filter: pb.filter('postSlug = {:slug} && approved = true', { slug: postSlug }),
        sort: 'created',
      })
    );
    const comments: Comment[] = (list.items as any[]).map((r) => ({
      id: r.id, author: r.author, body: r.body, created: r.created,
    }));
    return json({ comments });
  } catch {
    return json({ comments: [] });
  }
};

export const POST: APIRoute = async ({ request }) => {
  let postSlug = '', author = '', body = '', trap = '';
  try {
    const b = await request.json();
    postSlug = String(b.postSlug ?? '').trim().slice(0, 200);
    author = String(b.author ?? '').trim().slice(0, 60);
    body = String(b.body ?? '').trim().slice(0, 1000);
    trap = String(b.trap ?? '');
  } catch {
    return json({ ok: false, error: 'bad-input' }, 400);
  }

  if (trap) return json({ ok: true }); // honeypot
  if (!postSlug || !author || !body) return json({ ok: false, error: 'missing' }, 400);

  const hash = clientHash(request);
  if (!checkRate(`comments:${hash}`).allowed) return json({ ok: false, error: 'rate' }, 429);

  try {
    await withServerClient((pb) =>
      pb.collection('comments').create({ postSlug, author, body, approved: false, ipHash: hash })
    );
  } catch {
    return json({ ok: false, error: 'backend' }, 502);
  }
  return json({ ok: true, pending: true });
};
