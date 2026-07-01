/**
 * Runtime public-config endpoint — serves `globalThis.__PUBLIC_ENV` as JS.
 *
 * WHY: client-facing PUBLIC_* vars (PB/Umami URLs) would otherwise be inlined by
 * Vite at BUILD time (import.meta.env), freezing them into the bundle — so a
 * single published image couldn't be pointed at a different backend via
 * container env, and prerendered pages (the blog) would bake the build-time
 * value with no way to override. Serving them from an SSR endpoint read at
 * REQUEST time makes the same image configurable purely by `process.env`.
 *
 * These are PUBLIC values (they ship to browsers anyway) — never put secrets
 * here. Precedence: container `process.env` wins; falls back to the build-time
 * value (so `bun run dev` with a local .env still works) then the islands' own
 * hardcoded default.
 */
import type { APIRoute } from 'astro';

export const prerender = false; // MUST be runtime — the whole point is per-request env

// Literal import.meta.env access so Vite can statically inline the dev/build
// fallback (dynamic indexing wouldn't be replaced).
// PUBLIC_PB_URL is intentionally NOT here anymore: the browser no longer talks
// to Pocketbase directly (guestbook/comments/reactions go through same-origin
// /api/* proxies). Only the analytics snippet needs runtime public config now.
const FALLBACK: Record<string, string | undefined> = {
  PUBLIC_UMAMI_URL: import.meta.env.PUBLIC_UMAMI_URL,
  PUBLIC_UMAMI_ID: import.meta.env.PUBLIC_UMAMI_ID,
};

export const GET: APIRoute = () => {
  const env: Record<string, string> = {};
  for (const key of Object.keys(FALLBACK)) {
    const value = process.env[key] || FALLBACK[key];
    if (value) env[key] = value;
  }
  const body = `globalThis.__PUBLIC_ENV=${JSON.stringify(env)};`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      // Short cache: values change only on container restart. Keep it low so a
      // redeploy with new env is picked up promptly.
      'Cache-Control': 'public, max-age=60',
    },
  });
};
