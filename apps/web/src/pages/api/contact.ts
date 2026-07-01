/**
 * POST /api/contact — store a contact message (→ ntfy hook fires server-side).
 * Honeypot + rate-limit; writes via the public client (contact_messages has
 * create="" / read=null). Redirects back with a status flag. Fail-soft.
 */
import type { APIRoute } from 'astro';
import { withServerClient } from '@/lib/pb/client';
import { checkRate } from '@/lib/auth/ratelimit';
import { clientHash } from '@/lib/auth/client-hash';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  if (String(form.get('company') ?? '')) return redirect('/contact?sent=1', 303); // honeypot

  const hash = clientHash(request);
  if (!checkRate(`contact:${hash}`).allowed) {
    return redirect('/contact?e=rate', 303);
  }

  const name = String(form.get('name') ?? '').slice(0, 120);
  const email = String(form.get('email') ?? '').slice(0, 200);
  const body = String(form.get('body') ?? '').slice(0, 5000);
  if (!name || !email || !body) return redirect('/contact?e=1', 303);

  try {
    await withServerClient((pb) =>
      pb.collection('contact_messages').create({ name, email, body, read: false, ipHash: hash })
    );
  } catch {
    return redirect('/contact?e=down', 303);
  }
  return redirect('/contact?sent=1', 303);
};
