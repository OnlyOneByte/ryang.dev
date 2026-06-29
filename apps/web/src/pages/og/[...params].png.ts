/**
 * Dynamic OG image endpoint:  /og/<title>.png?subtitle=…&kicker=…
 * Returns a 1200x630 branded PNG (cyberpunk card). SSR endpoint so any page can
 * point og:image at /og/<its-title>.png. Cached aggressively (cards are
 * deterministic for a given query).
 */
import type { APIRoute } from 'astro';
import { renderOgPng } from '@/og/card';
import { checkRate } from '@/lib/auth/ratelimit';
import { createHash } from 'node:crypto';

export const prerender = false;

// Cap user-controlled text so a giant string can't blow up the satori render.
const clamp = (s: string | null | undefined, n: number) => (s ?? '').slice(0, n) || undefined;

export const GET: APIRoute = async ({ params, url, request, clientAddress }) => {
  // Rate-limit renders per client: each unique URL is a full satori+resvg
  // render (real CPU). Without this, /og/<random>.png is a cheap amplification
  // vector. Cached responses don't re-enter here at the proxy, but the origin
  // still needs protection for cache-miss floods.
  const ipKey = createHash('sha256')
    .update((clientAddress || request.headers.get('x-forwarded-for') || 'unknown') + '|og')
    .digest('hex');
  if (!checkRate(`og:${ipKey}`).allowed) {
    return new Response('Too many image requests.', { status: 429, headers: { 'Retry-After': '900' } });
  }

  const raw = params.params ?? '';
  const title = clamp(url.searchParams.get('title') || decodeURIComponent(raw).replace(/\.png$/, ''), 120) || 'Angelo Yang';
  const subtitle = clamp(url.searchParams.get('subtitle'), 160);
  const kicker = clamp(url.searchParams.get('kicker'), 40);

  try {
    const png = await renderOgPng({ title, subtitle, kicker });
    // Pass the underlying ArrayBuffer to the Blob — a bare Uint8Array trips the
    // DOM lib's BodyInit/BlobPart typing even though it works at runtime.
    const bytes = new Uint8Array(png);
    return new Response(new Blob([bytes.buffer], { type: 'image/png' }), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return new Response(`OG render failed: ${(err as Error).message}`, { status: 500 });
  }
};
