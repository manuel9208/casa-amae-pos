const CACHE_NAME = 'pos-offline-v1';

// Qué archivos queremos guardar obligatoriamente en memoria
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. INSTALACIÓN: Guardamos los archivos base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto, guardando archivos...');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. INTERCEPCIÓN: Aquí atrapamos las peticiones cuando no hay red
self.addEventListener('fetch', event => {
  // A las peticiones de la base de datos (/api/) NO les hacemos caché aún (eso es la Fase 2)
  if (event.request.url.includes('/api/')) {
      return; 
  }

  // Estrategia "Network First": Intenta descargar de internet, si falla, saca la copia de repuesto.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falló el internet, devolvemos la versión guardada en caché
        return caches.match(event.request);
      })
  );
});

// 3. LIMPIEZA: Para cuando actualices tu sistema en el futuro
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ============================================================================
// 4. NOTIFICACIONES PUSH (NUEVO)
// ============================================================================

// Escucha el evento "push" que manda el backend (incluso minimizado)
self.addEventListener('push', function(event) {
    if (event.data) {
      const data = event.data.json();
      
      const options = {
        body: data.body,
        icon: '/logo192.png', // Debe coincidir con el logo en tu carpeta public
        badge: '/logo192.png', // El icono pequeño de la barra superior en Android
        vibrate: [200, 100, 200, 100, 200, 100, 200], // Patrón de vibración tipo llamada/alerta
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
            url: self.registration.scope // Redirige a la app si hacen clic en la notificación
        }
      };
      
      // Muestra la alerta nativa en Windows/Android/iOS
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    }
});
  
// Qué pasa cuando el usuario toca la notificación
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // Si el Kiosco o la Caja ya está abierta en una pestaña, la trae al frente
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si estaba completamente cerrada, la abre
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});