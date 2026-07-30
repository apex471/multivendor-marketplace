self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Certified Luxury World';
  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/apple-icon.png',
    image: data.image || undefined, // Support rich image previews on lock screen
    badge: '/apple-icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  // Broadcast push event to all active clients/tabs so they update in real time
  if (self.clients && self.clients.matchAll) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      clientList.forEach(function(client) {
        client.postMessage({
          type: 'PUSH_NOTIFICATION',
          title: title,
          body: options.body,
          url: options.data.url
        });
      });
    });
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (self.clients) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // If a tab of our site is already open, focus it
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});
