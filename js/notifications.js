// Notifications Module (Firebase Cloud Messaging)
import { db } from './firebase-config.js';
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showNotification } from './ui.js';

const messaging = getMessaging();

/**
 * Initializes push notifications for the current user.
 * 1. Registers the service worker.
 * 2. Asks for permission.
 * 3. Gets the device token and saves it to Firestore.
 * @param {string} userId The current user's ID.
 */
export async function initializePushNotifications(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser.');
    return;
  }

  try {
    // 1. Registrar el Service Worker
    const swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered successfully:', swRegistration);

    // 2. Solicitar permiso
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      // 3. Obtener y guardar el token
      await getAndSaveToken(userId, swRegistration);
    } else {
      console.log('Unable to get permission to notify.');
    }
  } catch (error) {
    console.error('Error during push notification initialization:', error);
  }

  // Escuchar mensajes mientras la app está en primer plano
  onMessage(messaging, (payload) => {
    console.log('Message received while app is in foreground: ', payload);
    // Muestra una notificación personalizada tipo "toast"
    showNotification(`🔔 ${payload.notification.title}: ${payload.notification.body}`, 'info');
  });
}

/**
 * Gets the FCM token for the device and saves it to the user's document in Firestore.
 * @param {string} userId The current user's ID.
 * @param {ServiceWorkerRegistration} swRegistration The service worker registration object.
 */
async function getAndSaveToken(userId, swRegistration) {
  try {
    // Clave pública VAPID de Firebase Console
    // Ve a Project Settings > Cloud Messaging > Web configuration
    const vapidKey = "BPD-jLwzP-a-g9_g_fJ_...tu-clave-aqui..."; // <-- ¡REEMPLAZAR ESTA CLAVE!

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // Guardar el token en el documento del usuario en Firestore
      const userDocRef = doc(db, 'users', userId);
      // Usamos arrayUnion para no duplicar tokens si ya existe
      await updateDoc(userDocRef, {
        fcmTokens: arrayUnion(currentToken)
      });
      console.log('Token saved to Firestore.');
    } else {
      console.log('No registration token available. Request permission to generate one.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
}