/**
 * /api/reactions — same-origin proxy for emoji reaction tallies (PB is private).
 *   GET  ?targetType=…&targetId=… → { counts: {emoji: n} }
 *   POST → add one reaction (JSON {targetType, targetId, emoji})
 *
 * Dedup is a unique PB index (sessionHash, targetId, emoji); sessionHash is the
 * per-USER hash (from the forwarded client IP), stamped server-side so it can't
 * be spoofed AND so it isn't collapsed to the web container's IP. A duplicate
 * create hits the unique index → we treat the 400 as an idempotent no-op.
 */
import type { APIRoute } from 'astro';
import { withServerClient } from '@/lib/pb/client';
import { checkRate } from '@/lib/auth/ratelimit';
import { clientHash } from '@/lib/auth/client-hash';

export const prerender = false;

const EMOJIS = ['thumbsup', 'fire', 'heart'] as const;
type Emoji = (typeof EMOJIS)[number];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const targetType = (url.searchParams.get('targetType') || 'post').slice(0, 40);
  const targetId = (url.searchParams.get('targetId') || '').slice(0, 200);
  const counts: Record<Emoji, number> = { thumbsup: 0, fire: 0, heart: 0 };
  if (!targetId) return json({ counts });
  try {
    const list = await withServerClient((pb) =>
      pb.collection('reactions').getFullList({
        filter: pb.filter('targetType = {:tt} && targetId = {:tid}', { tt: targetType, tid: targetId }),
      })
    );
    for (const r of list as any[]) {
      if (r.emoji in counts) counts[r.emoji as Emoji]++;
    }
    return json({ counts });
  } catch {
    return json({ counts }); // fail-soft: zeros
  }
};

export const POST: APIRoute = async ({ request }) => {
  let targetType = 'post', targetId = '', emoji = '';
  try {
    const b = await request.json();
    targetType = String(b.targetType ?? 'post').slice(0, 40);
    targetId = String(b.targetId ?? '').trim().slice(0, 200);
    emoji = String(b.emoji ?? '');
  } catch {
    return json({ ok: false, error: 'bad-input' }, 400);
  }

  if (!targetId || !EMOJIS.includes(emoji as Emoji)) return json({ ok: false, error: 'bad-input' }, 400);

  const hash = clientHash(request);
  if (!checkRate(`reactions:${hash}`).allowed) return json({ ok: false, error: 'rate' }, 429);

  try {
    await withServerClient((pb) =>
      pb.collection('reactions').create({ targetType, targetId, emoji, sessionHash: hash })
    );
    return json({ ok: true });
  } catch (err: any) {
    // Unique-index dedup (already reacted) → idempotent success, not an error.
    const status = err?.status ?? err?.response?.status;
    if (status === 400) return json({ ok: true, duplicate: true });
    return json({ ok: false, error: 'backend' }, 502);
  }
};
