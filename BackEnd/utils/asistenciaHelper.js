// BackEnd/utils/asistenciaHelper.js
// =========================================================================
// 🛡️ CEREBRO DE VALIDACIÓN DE ASISTENCIA (SERVER-SIDE)
// Réplica exacta, del lado del backend, de la lógica que ya vive en
// src/components/admin/asistencia/useValidadorAsistencia.js (Frontend).
//
// Se creó porque la validación de GPS/IP SOLO ocurría en el navegador del
// empleado, permitiendo saltarse las reglas de ubicación manipulando el
// navegador o llamando a la API directamente (Postman/DevTools).
//
// También centraliza (Principio DRY) la verificación de qué métodos de
// checado están activos en "tipo_registro", evitando que cada controlador
// (authController, huellasController, usuarioController, biometricoController)
// tenga su propia copia de esta lógica.
// =========================================================================

const db = require('../config/db');

// =========================================================================
// 🧪 INTERRUPTOR DE PRUEBAS LOCALES (IP / GPS SIMULADOS)
// -------------------------------------------------------------------------
// Cuando pruebas en localhost, req.ip llega como "::1" (loopback) y el
// navegador no tiene forma de "fingir" estar en la sucursal para el GPS.
// Estas constantes te permiten simular manualmente esos valores SOLO en tu
// máquina, para poder probar el flujo real de validación (Portal, NFC,
// Login) sin tener que desplegar a Render cada vez.
//
// 👉 CÓMO USARLO EN LOCAL:
//    1. Pon tu IP pública real (la que te muestra el botón "Detectar IP"
//       del panel admin) en IP_LOCAL_SIMULADA.
//    2. Si también validas GPS, pon coordenadas dentro del rango permitido
//       en GPS_LOCAL_SIMULADO.
//    3. Prueba el checado en el Portal del Empleado normalmente.
//
// 🚨 ANTES DE SUBIR A PRODUCCIÓN (Render):
//    - Deja ambas constantes en "null" (o coméntalas). Es lo único que
//      necesitas recordar cambiar.
//    - Como doble seguro, si accidentalmente las dejas activas y el server
//      corre con NODE_ENV=production, el sistema IGNORA la simulación
//      automáticamente y lo advierte en los logs de Render.
// =========================================================================
const IP_LOCAL_SIMULADA = null; // Ej: '187.251.104.179'  -> ⚠️ Dejar en null antes de producción
//const IP_LOCAL_SIMULADA = '187.251.104.179'; // tu IP real registrada en la lista blanca
const GPS_LOCAL_SIMULADO = null; // Ej: { lat: 24.71011098, lon: -107.38739283 } -> ⚠️ Dejar en null antes de producción
//const GPS_LOCAL_SIMULADO = { lat: 24.71007052, lon: -107.38742068 }; // dentro del radio de tu geocerca

const simulacionActiva = () => (IP_LOCAL_SIMULADA !== null || GPS_LOCAL_SIMULADO !== null);
const enProduccion = () => process.env.NODE_ENV === 'production';

// Fórmula de Haversine (idéntica a la del frontend) para calcular distancia en metros
const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Verifica si un método de checado específico ('portal', 'nfc', 'login', 'zkteco')
 * está habilitado dentro de configuracion_asistencia.tipo_registro.
 *
 * Incluye retrocompatibilidad exclusiva para 'login' con la columna vieja
 * "asistencia_login" de la tabla "configuracion", por si alguna base de datos
 * de marca blanca todavía no ha sido migrada a configuracion_asistencia.
 *
 * @param {string} metodo - 'portal' | 'nfc' | 'login' | 'zkteco'
 * @returns {Promise<boolean>}
 */
const metodoAsistenciaActivo = async (metodo) => {
  try {
    const confAsist = await db.query('SELECT tipo_registro FROM configuracion_asistencia WHERE id = 1');

    if (confAsist.rows.length > 0) {
      let metodosActivos = [];
      try {
        metodosActivos = typeof confAsist.rows[0].tipo_registro === 'string'
          ? JSON.parse(confAsist.rows[0].tipo_registro)
          : confAsist.rows[0].tipo_registro;
      } catch (e) { metodosActivos = []; }

      return Array.isArray(metodosActivos) && metodosActivos.includes(metodo);
    }

    // Retrocompatibilidad exclusiva para 'login' con la columna vieja de "configuracion"
    if (metodo === 'login') {
      const colCheck = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='configuracion' AND column_name='asistencia_login'");
      if (colCheck.rows.length > 0) {
        const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
        return confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;
      }
    }

    return false;
  } catch (e) {
    console.error(`🚨 Error al verificar si el método "${metodo}" está activo:`, e.message || e);
    return false;
  }
};

/**
 * Valida en el SERVIDOR (no solo en el navegador) si una checada de asistencia
 * cumple con las reglas de IP / GPS / Ambas configuradas por el administrador
 * en ModalConfigAsistencia.js.
 *
 * @param {Object} datos
 * @param {number|string} [datos.lat] - Latitud reportada por el dispositivo del empleado.
 * @param {number|string} [datos.lon] - Longitud reportada por el dispositivo del empleado.
 * @param {string} [datos.ip] - IP pública reportada por el dispositivo del empleado.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const validarUbicacionServidor = async ({ lat, lon, ip } = {}) => {
  try {
    // 👇 INTERRUPTOR DE PRUEBAS LOCALES: solo actúa si activaste alguna constante
    // arriba Y el servidor NO está corriendo en producción (doble seguro).
    if (simulacionActiva()) {
      if (enProduccion()) {
        console.error('🚨🚨 ALERTA: Dejaste IP_LOCAL_SIMULADA / GPS_LOCAL_SIMULADO activos en asistenciaHelper.js y este server está en PRODUCCIÓN. Se ignoró la simulación por seguridad. Recuerda dejarlas en null antes de desplegar.');
      } else {
        if (IP_LOCAL_SIMULADA !== null) {
          console.warn(`🧪 [MODO PRUEBA LOCAL] Suplantando IP real ("${ip}") por IP simulada: "${IP_LOCAL_SIMULADA}"`);
          ip = IP_LOCAL_SIMULADA;
        }
        if (GPS_LOCAL_SIMULADO !== null) {
          console.warn(`🧪 [MODO PRUEBA LOCAL] Suplantando GPS real por coordenadas simuladas: lat=${GPS_LOCAL_SIMULADO.lat}, lon=${GPS_LOCAL_SIMULADO.lon}`);
          lat = GPS_LOCAL_SIMULADO.lat;
          lon = GPS_LOCAL_SIMULADO.lon;
        }
      }
    }

    const confGeneral = await db.query('SELECT validacion_activa, rango_metros FROM configuracion_asistencia WHERE id = 1');
    const reglas = confGeneral.rows[0] || {};
    const modoValidacion = reglas.validacion_activa || 'ninguna';
    const rangoPermitido = reglas.rango_metros || 50;

    // Si el Admin desactivó la seguridad, pasamos directo
    if (modoValidacion === 'ninguna') {
      return { success: true };
    }

    // Validación de IP (Red Wi-Fi)
    if (modoValidacion === 'ip' || modoValidacion === 'ambas') {
      if (!ip) {
        return { success: false, error: 'No se pudo determinar tu dirección IP para validar el acceso.' };
      }
      const ipsRes = await db.query('SELECT ip FROM asistencia_ips');
      const ipValida = ipsRes.rows.some(row => row.ip === ip);
      if (!ipValida) {
        console.warn(`⚠️ IP rechazada. Recibida: "${ip}". Autorizadas: ${ipsRes.rows.map(r => r.ip).join(', ')}`);
        return { success: false, error: 'Tu red actual no está autorizada. Conéctate al Wi-Fi de la sucursal.' };
      }
    }

    // Validación de GPS (Geocerca)
    if (modoValidacion === 'ubicacion' || modoValidacion === 'ambas') {
      if (lat === undefined || lon === undefined || lat === null || lon === null) {
        return { success: false, error: 'No se recibió tu ubicación GPS. Otorga permisos de ubicación e intenta de nuevo.' };
      }

      const ubicacionesRes = await db.query('SELECT latitud, longitud FROM asistencia_ubicaciones');
      if (ubicacionesRes.rows.length === 0) {
        return { success: false, error: 'El sistema exige GPS pero no hay ubicaciones configuradas por el administrador.' };
      }

      let dentroDelRango = false;
      for (const geocerca of ubicacionesRes.rows) {
        const distancia = calcularDistanciaMetros(
          Number(lat), Number(lon),
          Number(geocerca.latitud), Number(geocerca.longitud)
        );
        if (distancia <= rangoPermitido) {
          dentroDelRango = true;
          break;
        }
      }

      if (!dentroDelRango) {
        return { success: false, error: `Estás fuera de la sucursal. Acércate al área permitida (Tolerancia: ${rangoPermitido} metros).` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("🚨 Error en validarUbicacionServidor:", error.message || error);
    return { success: false, error: 'Error del servidor al validar reglas de asistencia.' };
  }
};

/**
 * Auto-migración: asegura que existan las columnas lat_registro / lon_registro
 * en registro_asistencias para poder guardar la ubicación exacta de cada checada
 * (Portal, NFC, Login) y así compararla visualmente contra la geocerca oficial
 * en ReporteAsistencias.js. Es "fire and forget": si falla, no debe tumbar
 * ningún registro de asistencia real.
 */
const asegurarColumnasUbicacion = async () => {
  try {
    await db.query(`
      ALTER TABLE registro_asistencias
      ADD COLUMN IF NOT EXISTS lat_registro DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS lon_registro DECIMAL(11, 8)
    `);
  } catch (e) {
    console.error('🚨 Error al asegurar columnas de ubicación en registro_asistencias:', e.message || e);
  }
};

module.exports = {
  calcularDistanciaMetros,
  metodoAsistenciaActivo,
  validarUbicacionServidor,
  asegurarColumnasUbicacion
};