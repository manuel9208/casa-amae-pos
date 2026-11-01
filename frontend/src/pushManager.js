import { apiFetch } from './utils/apiFetch';

// Función necesaria para convertir tu llave VAPID pública a un formato que el navegador entienda (Uint8Array)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const suscribirANotificaciones = async (usuario_id = null, cliente_id = null) => {
  // 1. Validar que el navegador soporte Service Workers y Push API nativa
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Este navegador no soporta notificaciones Push.');
    return false;
  }

  try {
    // 2. Pedir permiso al usuario con la alerta nativa del navegador
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      console.warn('El usuario denegó el permiso para notificaciones.');
      return false;
    }

    // 3. Obtener el Service Worker que ya tienes registrado
    const registro = await navigator.serviceWorker.ready;

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

    // 🆕 MULTI-TENANT: la llave pública VAPID ya NO viene fija del build
    // (REACT_APP_VAPID_PUBLIC_KEY), ahora se pide al backend, que la resuelve
    // por empresa (empresas.variables) con fallback a la global del .env.
    // Así, si cambias la llave VAPID de un cliente, NO hace falta re-desplegar
    // su frontend en Vercel.
    const resConfig = await apiFetch(`${apiUrl}/configuracion`);
    const dataConfig = await resConfig.json();
    const publicVapidKey = dataConfig?.vapid_public_key;

    if (!publicVapidKey) {
      console.error('El backend no devolvió una llave VAPID pública válida para esta empresa.');
      return false;
    }

    const suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 5. Enviar la suscripción a tu Backend
    const res = await apiFetch(`${apiUrl}/suscripciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suscripcion: suscripcion,
        usuario_id: usuario_id,
        cliente_id: cliente_id
      })
    });

    if (res.ok) {
      console.log('¡Suscripción Push enviada al backend correctamente!');
      return true;
    } else {
      console.error('Fallo al guardar la suscripción en el backend.');
      return false;
    }

  } catch (error) {
    console.error('Error durante la suscripción push:', error);
    return false;
  }
};