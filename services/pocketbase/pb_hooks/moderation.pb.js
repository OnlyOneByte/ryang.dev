/// <reference path="../pb_data/types.d.ts" />
/**
 * Server-side write hardening (defense-in-depth) for the moderated collections.
 * REQUIRES Pocketbase >= 0.23 (v0.23+ JSVM API: onRecordCreateRequest + e.next).
 *
 * TRUST MODEL (post-proxy): the browser NO LONGER writes to PB directly. All
 * writes come from the Astro web app via the SERVICE TOKEN, through same-origin
 * /api/* routes. Those routes already set approved=false and stamp the per-USER
 * hash (ipHash / sessionHash) derived from the forwarded client IP.
 *
 * So these hooks are now a BACKSTOP, not the primary control: they re-assert
 * approved=false on the moderated collections so a row can never be created
 * approved regardless of caller. They intentionally DO NOT touch ipHash /
 * sessionHash anymore — under the proxy, PB's `e.realIP()` is the WEB
 * CONTAINER's IP (identical for everyone), so stamping from it would collapse
 * every per-user dedup key to one value (one reaction per emoji for the whole
 * internet, an egg counter stuck at 1). The app owns those hashes now.
 *
 * The public createRule on these collections is null (service-token only), so
 * a random internet POST is rejected before these hooks even run.
 *
 * JSVM SCOPING: each callback runs in its own isolated runtime — define any
 * helper INSIDE the handler. (No helpers needed here anymore.)
 */

// guestbook / comments / scores: never allow a row to be created approved.
onRecordCreateRequest((e) => { e.record.set('approved', false); e.next(); }, 'guestbook');
onRecordCreateRequest((e) => { e.record.set('approved', false); e.next(); }, 'comments');
onRecordCreateRequest((e) => { e.record.set('approved', false); e.next(); }, 'scores');

// contact_messages: `read` is an admin-only inbox flag — force it false on create.
onRecordCreateRequest((e) => { e.record.set('read', false); e.next(); }, 'contact_messages');

// reactions: no approved/read fields; dedup is the unique (sessionHash,targetId,
// emoji) index and the app supplies sessionHash. Nothing to force here.
