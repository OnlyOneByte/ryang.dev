/// <reference path="../pb_data/types.d.ts" />
/**
 * Server-side write hardening for public-write collections.
 * REQUIRES Pocketbase >= 0.23 (v0.23+ JSVM API: onRecordCreateRequest + e.next).
 * If you downgrade PB below 0.23 these hooks WON'T register and the protections
 * below vanish — guestbook/comments could then be self-approved. Keep PB >= 0.23.
 *
 * Why hooks and not just rules: PB collection rules gate WHO can create, not
 * WHICH FIELDS they may set. A public writer (createRule = "") could otherwise
 * POST approved=true, a forged ipHash, or read=true. We strip/override those
 * privileged fields here so the client can never set them.
 */

function hashIp(e) {
  // Coarse, salted, daily-rotating hash — abuse/rate-limit signal, no raw PII.
  const ip = e.realIP || (e.httpContext && e.httpContext.realIP) || '';
  const day = new Date().toISOString().slice(0, 10);
  return $security.sha256(`${ip}|${day}|ryang`);
}

// Force moderation: client can never self-approve, and ipHash is server-stamped.
function moderate(e) {
  e.record.set('approved', false);
  try { e.record.set('ipHash', hashIp(e)); } catch (_) { /* best-effort */ }
}

onRecordCreateRequest((e) => {
  moderate(e);
  e.next();
}, 'guestbook');

onRecordCreateRequest((e) => {
  moderate(e);
  e.next();
}, 'comments');

// contact_messages: client must not set `read` (admin-only inbox flag) or forge
// ipHash. Stamp ipHash server-side; force read=false regardless of input.
onRecordCreateRequest((e) => {
  e.record.set('read', false);
  try { e.record.set('ipHash', hashIp(e)); } catch (_) { /* best-effort */ }
  e.next();
}, 'contact_messages');

// reactions: stamp a server-side sessionHash from the hashed IP so vote dedup
// can't be defeated by a client spoofing a fresh sessionHash each request.
// (Per-IP/day granularity — good enough for vanity counts; not ballot-grade.)
onRecordCreateRequest((e) => {
  try { e.record.set('sessionHash', hashIp(e)); } catch (_) { /* best-effort */ }
  e.next();
}, 'reactions');
