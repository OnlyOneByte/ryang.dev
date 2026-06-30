/**
 * GET /api/egg/stats → { completions: N } — how many distinct people have found
 * every fragment. Reads via the service token (egg_finds is null-ruled, never
 * publicly listable) and returns ONLY the aggregate count, not rows. Fail-soft:
 * PB down → { completions: 0 } so the /secret page just hides the line.
 */
import type { APIRoute } from 'astro';
import { withServerClient } from '@/lib/pb/client';

export const prerender = false;

export const GET: APIRoute = async () => {
  let completions = 0;
  try {
    const list = await withServerClient((pb) =>
      pb.collection('egg_finds').getList(1, 1, { filter: "fragment = '__complete__'" })
    );
    completions = list.totalItems ?? 0;
  } catch {
    completions = 0;
  }
  return new Response(JSON.stringify({ completions }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
};
