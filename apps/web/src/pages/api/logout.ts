/**
 * POST /api/logout — clear the recruiter session cookie and return to home.
 */
import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '@/lib/auth/session';

export const prerender = false;

export const POST: APIRoute = async () => {
  const cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
  return new Response(null, {
    status: 303,
    headers: { Location: '/', 'Set-Cookie': cookie },
  });
};
