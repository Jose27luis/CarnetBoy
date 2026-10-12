self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = typeof data.title === 'string' ? data.title : 'Carnet CRED';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      icon: '/logoCarnet.png',
      badge: '/logoCarnet.png',
      data: { url: typeof data.url === 'string' ? data.url : '/carnet' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data && event.notification.data.url ? event.notification.data.url : '/carnet', self.location.origin);

  if (target.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(target.href);
          return client.focus();
        }
      }

      return self.clients.openWindow(target.href);
    }),
  );
});
