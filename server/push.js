// Web push through the browsers' own push services (Google for Android Chrome,
// Apple for iPhone home screen apps). Same approach as the Karensmindevej hub.

import webpush from "web-push";
import { HttpError } from "./books.js";

// Push services only accept endpoints of their own, so anything else is refused rather than POSTed to
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^(.+\.)?push\.apple\.com$/,
  /^(.+\.)?push\.services\.mozilla\.com$/,
  /^(.+\.)?notify\.windows\.com$/,
];

export function isPushEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

// The VAPID key pair that signs our messages is made on first start and kept in the database.
// Changing it would cut off every existing subscription.
export function createPush(db, subject) {
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'vapid_keys'").get();
  let keys = stored ? JSON.parse(stored.value) : null;
  if (!keys) {
    keys = webpush.generateVAPIDKeys();
    db.prepare("INSERT INTO settings (key, value) VALUES ('vapid_keys', ?)").run(JSON.stringify(keys));
  }
  const vapidDetails = { subject, publicKey: keys.publicKey, privateKey: keys.privateKey };
  return {
    publicKey: keys.publicKey,
    send: async (sub, message) => {
      // Two days is plenty for a reading update. High urgency wakes sleeping phones.
      await webpush.sendNotification(sub, JSON.stringify(message), { vapidDetails, TTL: 2 * 24 * 3600, urgency: "high" });
    },
  };
}

export function saveSubscription(db, memberId, body, userAgent) {
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || !isPushEndpoint(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
    throw new HttpError(400, "That is not a push subscription.");
  }
  // The same endpoint moves to whoever subscribed with it last
  db.prepare(`
    INSERT INTO push_subscriptions (endpoint, member_id, p256dh, auth, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (endpoint) DO UPDATE SET
      member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent
  `).run(endpoint, memberId, p256dh, auth, (userAgent || "").slice(0, 300) || null, new Date().toISOString());
}

export function deleteSubscription(db, endpoint, memberId) {
  if (memberId === undefined) db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  else db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND member_id = ?").run(endpoint, memberId);
}

function subscriptionsFor(db, memberId) {
  return db.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE member_id = ?").all(memberId)
    .map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
}

// Sends to every device the member turned notifications on for, and forgets the ones that are gone
export async function notifyMember(db, send, memberId, message) {
  let sent = 0;
  let failed = 0;
  for (const sub of subscriptionsFor(db, memberId)) {
    try {
      await send(sub, message);
      sent++;
    } catch (error) {
      failed++;
      // 404/410: notifications turned off or the app removed. 403: signed with another key.
      if ([403, 404, 410].includes(error.statusCode)) deleteSubscription(db, sub.endpoint);
      else console.error(`Push to member ${memberId} failed: ${error.message}`);
    }
  }
  return { sent, failed };
}
