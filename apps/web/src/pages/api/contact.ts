/**
 * POST /api/contact — store a contact message (→ ntfy hook fires server-side).
 * Honeypot + rate-limit; writes via the public client (contact_messages has
 * create="" / read=null). Redirects back with a status flag. Fail-soft.
 */
import type { APIRoute } from 'astro';
import { publicClient } from '@/lib/pb/client';
import { checkRate } from '@/lib/auth/ratelimit';
import { createHash } from 'node:crypto';

export const prerender = false;

function ipHash(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${day}|ryang`).digest('hex');
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  if (String(form.get('company') ?? '')) return redirect('/contact?sent=1', 303); // honeypot

  const hash = ipHash(request);
  if (!checkRate(`contact:${hash}`).allowed) {
    return redirect('/contact?e=rate', 303);
  }

  const name = String(form.get('name') ?? '').slice(0, 120);
  const email = String(form.get('email') ?? '').slice(0, 200);
  const body = String(form.get('body') ?? '').slice(0, 5000);
  if (!name || !email || !body) return redirect('/contact?e=1', 303);

  try {
    const pb = publicClient();
    await pb.collection('contact_messages').create({ name, email, body, ipHash: hash });
  } catch {
    return redirect('/contact?e=down', 303);
  }
  return redirect('/contact?sent=1', 303);
};
