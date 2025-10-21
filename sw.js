// Service Worker for Caching and Push Notifications

const CACHE_NAME = 'family-budget-v1.1'; // Cambia la versión para forzar actualización
const APP_SHELL_URLS = [
  '/',
  '/index_new.html',
  // Añade aquí los JS, CSS, e imágenes principales que quieres que funcionen offline
];

// --- Firebase Push Notifications ---
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// --- IMPORTANTE ---
// Añade aquí tu configuración de Firebase, pero solo los campos necesarios para messaging.
const firebaseConfig = {
  apiKey: "AIzaSyDUHSpy00PRGvlnwxzEyafKVoq5QaLElBI",
  authDomain: "family-budget-362ee.firebaseapp.com",
  projectId: "family-budget-362ee",
  storageBucket: "family-budget-362ee.firebasestorage.app",
  messagingSenderId: "87616381921",
  appId: "1:87616381921:web:034e60be9b9230a76c28a0"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/icon-192x192.png' // Un icono por defecto
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- Caching Logic ---

// 1. Instalación: Cachear el App Shell
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando el App Shell:', APP_SHELL_URLS);
      // Usamos addAll para cachear los archivos base. Si uno falla, toda la instalación falla.
      // Nota: '/index_new.html' es el archivo principal, pero '/' lo representa en la URL.
      return cache.addAll(['/index_new.html']);
    })
  );
});

// 2. Activación: Limpiar cachés antiguos
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetch: Interceptar peticiones y servir desde caché
self.addEventListener('fetch', event => {
  const { request } = event;

  // No cachear peticiones de Firebase Auth o Firestore para mantener datos frescos.
  // Dejamos que Firebase maneje su propia lógica offline (que ya es bastante buena).
  if (request.url.includes('firestore.googleapis.com') || request.url.includes('identitytoolkit.googleapis.com')) {
    return; // Dejar que la petición continúe a la red
  }

  // Estrategia: Cache First para el App Shell
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Si está en caché, lo retornamos.
      if (cachedResponse) {
        return cachedResponse;
      }
      // Si no, vamos a la red, lo retornamos y lo guardamos en caché para la próxima vez.
      return fetch(request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          // No cachear respuestas que no sean OK (ej. errores 404)
          if (request.method === 'GET' && networkResponse.ok) {
             cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(error => {
      // En caso de error (ej. sin red y sin caché), podrías mostrar una página offline genérica.
      console.error('[SW] Fetch fallido:', error);
      // return caches.match('/offline.html'); // <-- Futura mejora: una página offline bonita.
    })
  );
});