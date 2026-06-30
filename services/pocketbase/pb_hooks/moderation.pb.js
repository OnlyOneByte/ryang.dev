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
 *
 * JSVM SCOPING (critical): each handler callback is serialized and executed in
 * its OWN isolated runtime — module-scope functions are NOT visible inside it
 * (you get "ReferenceError: <fn> is not defined" at runtime, never at build).
 * So every helper MUST be defined INSIDE the handler. Likewise `e.realIP` is a
 * METHOD: call `e.realIP()`, not the bare property (which is a function ref).
 * Both verified against the pinned 0.28.4 image with a live self-approve probe.
 */

// Force moderation on append-style public collections: the client can never
// self-approve, and ipHash is stamped server-side from the real client IP.
onRecordCreateRequest((e) => {
  e.record.set('approved', false);
  try {
    const ip = (typeof e.realIP === 'function' ? e.realIP() : e.realIP) || '';
    const day = new Date().toISOString().slice(0, 10);
    e.record.set('ipHash', $security.sha256(`${ip}|${day}|ryang`));
  } catch (_) { /* best-effort: never block the write on hashing */ }
  e.next();
}, 'guestbook');

onRecordCreateRequest((e) => {
  e.record.set('approved', false);
  try {
    const ip = (typeof e.realIP === 'function' ? e.realIP() : e.realIP) || '';
    const day = new Date().toISOString().slice(0, 10);
    e.record.set('ipHash', $security.sha256(`${ip}|${day}|ryang`));
  } catch (_) { /* best-effort */ }
  e.next();
}, 'comments');

// contact_messages: client must not set `read` (admin-only inbox flag) or forge
// ipHash. Stamp ipHash server-side; force read=false regardless of input.
onRecordCreateRequest((e) => {
  e.record.set('read', false);
  try {
    const ip = (typeof e.realIP === 'function' ? e.realIP() : e.realIP) || '';
    const day = new Date().toISOString().slice(0, 10);
    e.record.set('ipHash', $security.sha256(`${ip}|${day}|ryang`));
  } catch (_) { /* best-effort */ }
  e.next();
}, 'contact_messages');

// reactions: stamp a server-side sessionHash from the hashed IP so vote dedup
// can't be defeated by a client spoofing a fresh sessionHash each request.
// (Per-IP/day granularity — good enough for vanity counts; not ballot-grade.)
onRecordCreateRequest((e) => {
  try {
    const ip = (typeof e.realIP === 'function' ? e.realIP() : e.realIP) || '';
    const day = new Date().toISOString().slice(0, 10);
    e.record.set('sessionHash', $security.sha256(`${ip}|${day}|ryang`));
  } catch (_) { /* best-effort */ }
  e.next();
}, 'reactions');

// scores (404 game leaderboard): client-submitted + spoofable → force
// approved=false (you approve in admin UI) and server-stamp sessionHash. A
// posted score is NOT public until approved, so a forged 9999999 can't top the
// board on its own.
onRecordCreateRequest((e) => {
  e.record.set('approved', false);
  try {
    const ip = (typeof e.realIP === 'function' ? e.realIP() : e.realIP) || '';
    const day = new Date().toISOString().slice(0, 10);
    e.record.set('sessionHash', $security.sha256(`${ip}|${day}|ryang`));
  } catch (_) { /* best-effort */ }
  e.next();
}, 'scores');
