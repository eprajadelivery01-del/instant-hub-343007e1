// Service Worker para É Pra Já - Delivery (Marketplace)
// Suporte a Notificações Push Nativas do Sistema e Alertas de Cupons

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener para evento Push (quando enviado via WebPush / FCM / Server)
self.addEventListener('push', (event) => {
  let data = {
    title: 'É Pra Já - Oferta Especial! 🎁',
    body: 'Você recebeu um novo cupom de desconto!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url: '/marketplace/coupons',
    coupon: null
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    image: data.image || null,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/marketplace/coupons',
      coupon: data.coupon || null
    },
    actions: data.coupon ? [
      { action: 'copy_coupon', title: '📋 Copiar Cupom' },
      { action: 'open_app', title: '🛍️ Ver Ofertas' }
    ] : [
      { action: 'open_app', title: '🛍️ Ver Ofertas' }
    ],
    tag: 'epraja-marketing-' + Date.now(),
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Listener para mensagens diretas enviadas pelo App (fallback nativo)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, message, coupon_code, image_url } = event.data.payload;
    const options = {
      body: message || 'Confira os novos cupons disponíveis!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      image: image_url || null,
      vibrate: [200, 100, 200],
      data: {
        url: '/marketplace/coupons',
        coupon: coupon_code
      },
      tag: 'epraja-coupon-' + Date.now(),
      renotify: true
    };
    self.registration.showNotification(title || '🎉 Novo Cupom Disponível!', options);
  }
});

// Clique na notificação nativa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/marketplace/coupons';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/marketplace') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
