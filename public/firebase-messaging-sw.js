self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "TSURILOGUE";
  const options = {
    body: notification.body || data.body || "",
    icon: "/icons/tsurilog-icon.png",
    badge: "/icons/tsurilog-icon.png",
    data: {
      url: data.url || "/"
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const target = new URL(url, self.location.origin).href;
      for (const client of clients) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
