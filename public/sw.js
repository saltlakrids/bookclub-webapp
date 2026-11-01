// Service worker: only there for notifications. The app itself always loads from the server.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// iOS revokes the subscription of a web app that receives a push without showing a notification, so always show one
self.addEventListener("push", (event) => {
  let message = { title: "Book club" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // not JSON: show the default title
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: "/icon-192.png",
      data: { url: message.url || "/" },
    }),
  );
});

// Tapping a notification opens its page, in the app window that is already open if there is one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if (open.url !== url) await open.navigate(url).catch(() => undefined);
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
