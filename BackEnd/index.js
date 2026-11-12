require('dotenv').config();

// 👇 SOLUCIÓN ZONA HORARIA NODE.JS: Obligamos al servidor a usar tu hora local
process.env.TZ = 'America/Mazatlan';

const express = require('express');
const cors = require('cors');
const path = require('path');
const webpush = require('web-push'); // Importar web-push para notificaciones
const http = require('http'); // 🆕 Requerido para envolver express y acoplar sockets
const { Server } = require('socket.io'); // 🆕 Motor WebSockets de alto rendimiento
const apiRoutes = require('./routes/api');
const db = require('./config/db'); // 🆕 Necesario para resolver empresa_id por slug en el middleware de sockets

// 🆕 [MULTI-TENANT] Importación del módulo de migración centralizada.
// Nombres confirmados directamente en config/migracionMultiTenant.js:
//   - crearTablasBaseSiNoExisten  (Bloque A: CREATE TABLE IF NOT EXISTS)
//   - agregarEmpresaIdATablas     (Bloque B: ALTER TABLE ... ADD COLUMN empresa_id)
const {
  crearTablasBaseSiNoExisten,
  agregarEmpresaIdATablas
} = require('./config/migracionMultiTenant');
const { migrarOmnicanal } = require('./config/migracionOmnicanal'); // 🆕 Módulo Omnicanal (migración aislada)
const { migrarDatosEmpresa } = require('./config/migracionDatosEmpresa'); // 🏢 Datos de la Empresa (migración aislada)

const app = express();

// 👇 FIX CRÍTICO: Render (y la mayoría de los hostings en la nube) entregan
// el tráfico HTTP a través de un proxy/balanceador interno. Sin esta línea,
// Express NUNCA ve la IP pública real del empleado en "req.ip" (ve la IP
// interna del proxy de Render, siempre la misma), lo que provocaba que
// validarUbicacionServidor() en asistenciaHelper.js SIEMPRE rechazara la
// checada por "Red no autorizada", incluso con la IP correctamente
// registrada en la lista blanca. Con "trust proxy" activo, Express lee el
// header "X-Forwarded-For" que reenvía Render con la IP real del cliente.
app.set('trust proxy', 1);

const server = http.createServer(app); // 🆕 Envoltura HTTP nativa sobre express

// 🆕 Configuración e inicialización blindada de Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Permite conexiones descentralizadas de marcas blancas
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Empresa-Slug']
  }
});

// 🔒 [MULTI-TENANT] Middleware de resolución de tenant para WebSockets
// Equivalente al resolveTenant.js que ya usan las rutas REST, pero para sockets:
// exige que el frontend mande el slug de su empresa al conectar (handshake.auth).
// Si el slug no existe o no coincide con ninguna empresa, se rechaza la conexión.
io.use(async (socket, next) => {
  try {
    const slug = socket.handshake.auth?.empresa_slug;
    if (!slug) return next(new Error('Falta empresa_slug en el handshake del socket'));

    const result = await db.query('SELECT id FROM empresas WHERE slug = $1', [slug]);
    if (result.rows.length === 0) return next(new Error('Empresa no encontrada'));

    socket.empresa_id = result.rows[0].id; // 🆕 queda disponible en todo el ciclo de vida del socket
    next();
  } catch (err) {
    next(new Error('Error al resolver tenant del socket'));
  }
});

// ⚡ GATEWAY Y SALAS DE COMUNICACIÓN EN TIEMPO REAL
io.on('connection', (socket) => {
  socket.join(`empresa_${socket.empresa_id}`); // 🔒 Aísla este socket en la sala de SU empresa
  console.log(`📡 Dispositivo POS en línea (Socket ID): ${socket.id}, Empresa: ${socket.empresa_id}`);

  // Canal operativo general (Caja, Cocina, TV)
  socket.on('join_canal', (canal) => {
    socket.join(`empresa_${socket.empresa_id}_${canal}`); // 🔒 el canal ahora también queda aislado por empresa
    console.log(`👤 Dispositivo unido al canal operativo: empresa_${socket.empresa_id}_${canal}`);
  });

  // Canal privado de tracking para repartidores
  socket.on('reparto:registrar_repartidor', (repartidorId) => {
    socket.join(`repartidor_${repartidorId}`);
    console.log(`Driver #${repartidorId} suscrito al feed de operaciones.`);
  });

  // 👇 NUEVO: Puente para control de multi-sesiones y pantallas
  socket.on('solicitar_cierre_pantalla', (data) => {
    io.to(`empresa_${socket.empresa_id}`).emit('forzar_cierre_pantalla', data); // 🔒 solo a la empresa dueña del socket
    console.log(`🔄 Re-enrutando cierre de pantalla ${data.pantalla} para empresa_${socket.empresa_id}, usuario ID: ${data.usuarioId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Conexión finalizada con el dispositivo: ${socket.id}`);
  });
});

// 🌟 TRUCO ARQUITECTÓNICO: Exponemos 'io' globalmente dentro del contexto de Express
app.set('io', io);

// 🆕 FASE 4: referencia global adicional para código que corre FUERA del ciclo
// req/res de Express (ej. whatsappController.js, disparado por el webhook de
// Meta en segundo plano) y que por lo tanto no tiene acceso a req.app.get('io').
global.ioInstance = io;

// --- CONFIGURACIÓN DE CORS GENERAL ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Empresa-Slug', 'X-Superadmin-Key', 'X-Cliente-Token', 'X-Canje-Token']
}));

app.use(express.json({
  // 🔒 4c: conserva el cuerpo crudo ÚNICAMENTE del webhook de WhatsApp (para validar X-Hub-Signature-256)
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api/whatsapp/webhook')) req.rawBody = buf;
  }
}));

// Configuración de llaves VAPID para notificaciones Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:soporte@tudominio.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.info("ℹ️ Sin llaves VAPID globales en .env: el push usa las llaves de cada empresa (Admin Empresas).");
}

// 👇 PUENTE BIOMÉTRICO (ZKTECO ADMS): Intercepta el checador y rutea el tráfico sin perder las huellas
app.use('/iclock', (req, res) => {
  res.redirect(307, `/api/iclock${req.url}`);
});

// Tus rutas de API
app.use('/api', apiRoutes);

// Para que las imágenes se puedan ver en internet
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🛡️ Instancia compartida por varios negocios: un rechazo de promesa sin capturar
// (ej. dentro de Baileys) no debe tumbar el servidor de todos. Se registra y se continúa.
process.on('unhandledRejection', (motivo) => {
  console.error('🚨 [UNHANDLED REJECTION]', motivo);
});

const PORT = process.env.PORT || 4000;

// =========================================================================
// 🆕 [MULTI-TENANT] ARRANQUE BLINDADO: la migración se ejecuta ANTES de
// aceptar tráfico. Ambos bloques (A y B) usan "IF NOT EXISTS" en su SQL,
// por lo tanto son 100% idempotentes: se pueden correr en cada arranque
// sin riesgo de duplicar tablas, columnas ni romper datos existentes.
//
// Si la migración falla, se detiene el arranque (process.exit(1)) para
// evitar levantar el servidor contra una base de datos en estado
// inconsistente (ej. controladores esperando "empresa_id" que no existe).
// =========================================================================
async function iniciarServidor() {
  try {
    console.log('🔧 [MULTI-TENANT] Verificando/aplicando migración de base de datos...');

    await crearTablasBaseSiNoExisten(); // Bloque A: tablas nuevas completas
    await agregarEmpresaIdATablas();    // Bloque B: empresa_id en tablas existentes
    await migrarOmnicanal();            // 🆕 Omnicanal: columnas/índices aislados (no se revierten con el Bloque B)
    await migrarDatosEmpresa();         // 🏢 Datos de la Empresa: nunca lanza error (no tumba el arranque)

    console.log('✅ [MULTI-TENANT] Base de datos verificada correctamente. Procediendo a levantar el servidor...');

    // 🌟 CORRECCIÓN CRÍTICA: Arrancamos con server.listen en lugar de app.listen para levantar Sockets e HTTP juntos
    server.listen(PORT, () => {
      console.log(`🚀 Servidor e hilos de Socket.io corriendo en puerto ${PORT}`);
      // 🆕 Omnicanal: reconecta (escalonado) los números Baileys ya vinculados, guardados en Postgres
      require('./utils/whatsappBaileysManager').restaurarSesiones()
        .catch(e => console.error('🚨 [BAILEYS] Error al restaurar sesiones:', e.message));
    });

  } catch (error) {
    console.error('🚨 [MULTI-TENANT] Error crítico durante la migración. El servidor NO se levantará para proteger la integridad de los datos:', error);
    process.exit(1);
  }
}

iniciarServidor();