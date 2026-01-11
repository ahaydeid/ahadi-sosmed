self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Pesan Baru';
    const options = {
      body: data.body || 'Anda menerima pesan baru.',
      icon: data.icon || '/icon.png',
      badge: '/icon.png',
      data: data.url, // URL untuk dibuka saat diklik
      tag: data.tag || 'new-message',
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error parsing push data:', err);
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Pesan Baru', {
        body: 'Ada pesan baru untuk Anda.',
        icon: '/icon.png',
        badge: '/icon.png',
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
