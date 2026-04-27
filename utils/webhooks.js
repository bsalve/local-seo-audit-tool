'use strict';

const crypto = require('crypto');
const db = require('./db');

async function dispatchWebhooks(userId, eventName, payload) {
  if (!db || !userId) return;
  try {
    const hooks = await db('webhooks').where({ user_id: userId });
    for (const hook of hooks) {
      const events = hook.events.split(',').map(e => e.trim());
      if (!events.includes(eventName)) continue;
      const body = JSON.stringify({ event: eventName, data: payload, timestamp: new Date().toISOString() });
      const sig  = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SignalGrade-Signature': `sha256=${sig}` },
        body,
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }
  } catch {}
}

module.exports = { dispatchWebhooks };
