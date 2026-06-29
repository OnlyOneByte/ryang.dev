/**
 * GET /api/status — homelab up/total for the footer dot. Fetched client-side by
 * the Footer island so it NEVER blocks page render (the layout used to await
 * this on every page). Fail-soft → null when unconfigured/unreachable.
 */
import type { APIRoute } from 'astro';
import { getHomelabStatus } from '@/lib/widgets/status';

export const prerender = false;

export const GET: APIRoute = async () => {
  const s = await getHomelabStatus(); // already cached + timeout-bounded
  return new Response(JSON.stringify(s ?? null), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
};
