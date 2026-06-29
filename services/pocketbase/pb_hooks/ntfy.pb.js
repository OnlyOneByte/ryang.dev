/// <reference path="../pb_data/types.d.ts" />
/**
 * Ntfy push notifications.
 *
 *  - contact_messages create  → "📬 New contact message from <name>"
 *  - recruiter_unlocks create  → "👀 Someone opened recruiter mode"
 *
 * Reads NTFY_URL + NTFY_TOPIC from the environment. Fail-soft: a notification
 * error never blocks the record write.
 */

function notify(title, message) {
  const base = $os.getenv('NTFY_URL');
  const topic = $os.getenv('NTFY_TOPIC');
  if (!base || !topic) return; // notifications optional
  try {
    $http.send({
      url: `${base.replace(/\/$/, '')}/${topic}`,
      method: 'POST',
      body: message,
      headers: { Title: title },
      timeout: 5,
    });
  } catch (err) {
    console.log('[ntfy] send failed (non-fatal):', err);
  }
}

onRecordAfterCreateSuccess((e) => {
  const name = e.record.getString('name') || 'someone';
  notify('📬 New contact message', `From ${name} via ryang.dev`);
  e.next();
}, 'contact_messages');

onRecordAfterCreateSuccess((e) => {
  notify('👀 Recruiter mode opened', 'Someone unlocked the recruiter section on ryang.dev');
  e.next();
}, 'recruiter_unlocks');
