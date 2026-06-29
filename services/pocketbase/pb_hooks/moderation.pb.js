/// <reference path="../pb_data/types.d.ts" />
/**
 * Force moderation on public-write collections.
 *
 * A visitor can submit to `guestbook` and `comments` (createRule = ""), but
 * MUST NOT be able to self-approve or spoof identity. On create we:
 *   - force approved = false (admin flips it later in the PB admin UI)
 *   - stamp a hashed IP (abuse/rate-limit signal; no raw PII stored)
 *
 * Only `approved = true` rows are publicly readable (see listRule/viewRule).
 */

function hashIp(e) {
  // Coarse, salted, daily-rotating hash — enough to dedup/rate-limit abuse
  // without storing a raw IP. Date salt means it can't be correlated long-term.
  const ip = e.realIP || (e.httpContext && e.httpContext.realIP) || '';
  const day = new Date().toISOString().slice(0, 10);
  return $security.sha256(`${ip}|${day}|ryang`);
}

function moderate(e) {
  e.record.set('approved', false);
  try {
    e.record.set('ipHash', hashIp(e));
  } catch (_) {
    /* ipHash is best-effort */
  }
}

onRecordCreateRequest((e) => {
  moderate(e);
  e.next();
}, 'guestbook');

onRecordCreateRequest((e) => {
  moderate(e);
  e.next();
}, 'comments');
