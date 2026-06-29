/**
 * Dynamic OG image endpoint:  /og/<title>.png?subtitle=…&kicker=…
 * Returns a 1200x630 branded PNG (cyberpunk card). SSR endpoint so any page can
 * point og:image at /og/<its-title>.png. Cached aggressively (cards are
 * deterministic for a given query).
 */
import type { APIRoute } from 'astro';
import { renderOgPng } from '@/og/card';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  // [...params] captures the path after /og/ (we use it as the title slugword);
  // prefer explicit ?title= when present for full control.
  const raw = params.params ?? '';
  const title = url.searchParams.get('title') || decodeURIComponent(raw).replace(/\.png$/, '') || 'Richard Yang';
  const subtitle = url.searchParams.get('subtitle') || undefined;
  const kicker = url.searchParams.get('kicker') || undefined;

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
