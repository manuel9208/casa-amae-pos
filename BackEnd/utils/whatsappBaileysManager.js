// BackEnd/utils/whatsappBaileysManager.js
// =========================================================================
// 📱 GESTOR BAILEYS (WhatsApp por QR) — una sesión por empresa, persistida
// en Postgres (whatsapp_sesiones). Todo filtrado por empresa_id.
// ⚠️ Requiere UNA sola instancia del backend (dos instancias se pelean la sesión).
// La librería se carga de forma perezosa: si falta, el POS arranca igual.
// Variables de entorno:
//   BAILEYS_ENABLED=true    -> habilita la vinculación (apagado por defecto)
//   BAILEYS_LOG=warn|info   -> nivel de log de Baileys (por defecto 'silent')
//   BAILEYS_BROWSER=ubuntu|windows -> nombre con el que aparece el dispositivo (por defecto 'MiSistemaPOS')
// =========================================================================
const db = require('../config/db');

// 🔇 libsignal (dependencia de Baileys) imprime con console.* la renegociación de llaves de cifrado.
// Es ruido normal que se recupera solo. Se filtra SOLO por prefijo exacto: cualquier otro log
// (incluidos los [BAILEYS] propios) pasa intacto. La bandera evita parchear dos veces.
const RUIDO_LIBSIGNAL = /^(Closing session|Closing open session|Decrypted message with closed session|Failed to decrypt message with any known session|Session error:|Removing old closed session|Migrating session)/;
if (!global.__filtroRuidoLibsignal) {
  global.__filtroRuidoLibsignal = true;
  ['log', 'info', 'warn', 'error'].forEach((metodo) => {
    const original = console[metodo].bind(console);
    console[metodo] = (...args) => {
      if (typeof args[0] === 'string' && RUIDO_LIBSIGNAL.test(args[0])) return;
      original(...args);
    };
  });
}

const MAX_INTENTOS = 8;
const VERSION_TTL_MS = 6 * 60 * 60 * 1000;
const VERSION_TIMEOUT_MS = 8000;      // consulta de versión a GitHub
const CONEXION_TIMEOUT_MS = 45000;    // sin QR ni conexión en este tiempo => se corta y se avisa

const sesiones = new Map();   // empresaId -> estado en memoria
const propios = new Set();    // ids de mensajes enviados por el POS (para no tratarlos como "del celular")
const mapaLid = new Map();    // `${empresaId}:${digitos}` -> jid @lid (si WhatsApp no entrega el teléfono)
let libCache = null;
let versionCache = { valor: undefined, ts: 0 };

const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const habilitado = () => process.env.BAILEYS_ENABLED === 'true';

const cargarLib = async () => {
  if (libCache) return libCache;
  try {
    // import() dinámico: funciona igual con Baileys 6 (CommonJS) y 7 (ESM)
    const mod = await import('@whiskeysockets/baileys');
    const base = (mod.default && typeof mod.default === 'object') ? mod.default : mod;
    const makeWASocket = typeof base.default === 'function' ? base.default : base.makeWASocket;
    if (typeof makeWASocket !== 'function') throw new Error('no se encontró makeWASocket');
    libCache = { ...base, makeWASocket };
    return libCache;
  } catch (e) {
    console.error('🚨 [BAILEYS] No se pudo cargar la librería:', e.message);
    throw new Error('No se pudo cargar @whiskeysockets/baileys. Revisa que esté instalada (npm install) y los logs del servidor.');
  }
};

// Nombre con el que aparece el dispositivo en WhatsApp (configurable por variable de entorno)
const navegadorBaileys = () => {
  const modo = String(process.env.BAILEYS_BROWSER || '').toLowerCase();
  if (modo === 'ubuntu') return ['Ubuntu', 'Chrome', '22.04.4'];
  if (modo === 'windows') return ['Windows', 'Chrome', '10.0.22631'];
  return ['MiSistemaPOS', 'Chrome', '1.0.0'];
};

// 🔒 Solo a la sala de la empresa. Payload sin datos personales.
const emitir = (empresaId, payload) => {
  const io = global.ioInstance;
  if (io) io.to(`empresa_${empresaId}`).emit('omnichannel_actualizado', payload);
};

const digitosDeJid = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

const borrarSesion = (empresaId) =>
  db.query('DELETE FROM whatsapp_sesiones WHERE empresa_id = $1', [empresaId]);

// ─────────────────────────────────────────────────────────────
// Estado de autenticación de Baileys guardado en Postgres.
// keys.get / keys.set usan UNA consulta por llamada (no una por llave):
// al emparejar, Baileys escribe decenas de llaves de golpe y de la otra forma
// saturaba el pool de conexiones que comparten los demás negocios.
// ─────────────────────────────────────────────────────────────
const usarEstadoPostgres = async (empresaId, lib) => {
  const { initAuthCreds, BufferJSON, proto } = lib;

  const revivir = (crudo) => (crudo ? JSON.parse(JSON.stringify(crudo), BufferJSON.reviver) : null);

  const leer = async (id) => {
    const r = await db.query(
      'SELECT datos FROM whatsapp_sesiones WHERE empresa_id = $1 AND session_id = $2',
      [empresaId, id]
    );
    return r.rows[0] ? revivir(r.rows[0].datos) : null;
  };

  const escribir = (id, valor) => db.query(
    `INSERT INTO whatsapp_sesiones (empresa_id, session_id, datos)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (empresa_id, session_id) DO UPDATE SET datos = EXCLUDED.datos, updated_at = NOW()`,
    [empresaId, id, JSON.stringify(valor, BufferJSON.replacer)]
  );

  const creds = (await leer('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          if (!ids.length) return data;
          const r = await db.query(
            'SELECT session_id, datos FROM whatsapp_sesiones WHERE empresa_id = $1 AND session_id = ANY($2::text[])',
            [empresaId, ids.map(id => `${type}-${id}`)]
          );
          const mapa = new Map(r.rows.map(f => [f.session_id, f.datos]));
          for (const id of ids) {
            let v = revivir(mapa.get(`${type}-${id}`));
            if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v);
            data[id] = v;
          }
          return data;
        },
        set: async (data) => {
          const ids = [];
          const valores = [];
          const borrados = [];
          for (const categoria of Object.keys(data)) {
            for (const id of Object.keys(data[categoria])) {
              const valor = data[categoria][id];
              const sid = `${categoria}-${id}`;
              if (valor) { ids.push(sid); valores.push(JSON.stringify(valor, BufferJSON.replacer)); }
              else borrados.push(sid);
            }
          }
          if (ids.length) {
            await db.query(
              `INSERT INTO whatsapp_sesiones (empresa_id, session_id, datos)
               SELECT $1::int, t.sid, t.d::jsonb FROM UNNEST($2::text[], $3::text[]) AS t(sid, d)
               ON CONFLICT (empresa_id, session_id) DO UPDATE SET datos = EXCLUDED.datos, updated_at = NOW()`,
              [empresaId, ids, valores]
            );
          }
          if (borrados.length) {
            await db.query(
              'DELETE FROM whatsapp_sesiones WHERE empresa_id = $1 AND session_id = ANY($2::text[])',
              [empresaId, borrados]
            );
          }
        }
      }
    },
    saveCreds: () => escribir('creds', creds)
  };
};

// Versión de WhatsApp Web con tiempo límite: si GitHub no responde (firewall/proxy),
// Baileys usa su versión por defecto en vez de quedarse esperando para siempre.
const obtenerVersion = async (lib) => {
  if (versionCache.valor && Date.now() - versionCache.ts < VERSION_TTL_MS) return versionCache.valor;
  try {
    const { version } = await Promise.race([
      lib.fetchLatestBaileysVersion(),
      new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('timeout consultando version de WhatsApp Web')), VERSION_TIMEOUT_MS))
    ]);
    versionCache = { valor: version, ts: Date.now() };
    return version;
  } catch (e) {
    console.warn(`[BAILEYS] No se pudo consultar la version de WhatsApp Web (${e.message}); se usa la version por defecto.`);
    return versionCache.valor; // undefined => Baileys usa su versión por defecto
  }
};

const detenerSocket = (s) => {
  if (!s || !s.sock) return;
  try {
    ['connection.update', 'creds.update', 'messages.upsert'].forEach(ev => s.sock.ev.removeAllListeners(ev));
    s.sock.end(undefined);
  } catch (e) { /* ya cerrado */ }
  s.sock = null;
};

// ─────────────────────────────────────────────────────────────
// Mensajes entrantes -> enrutador omnicanal (mismo flujo que Meta)
// ─────────────────────────────────────────────────────────────
const manejarMensajes = async (empresaId, { messages, type }) => {
  if (type !== 'notify') return; // los mensajes enviados por el propio POS llegan como "append"
  const lib = libCache;
  const router = require('./whatsappRouterIA');

  for (const m of messages) {
    try {
      const key = m.key || {};
      let jid = key.remoteJid;
      if (!jid || !m.message) continue;
      if (jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;

      // WhatsApp a veces identifica al contacto con un "@lid" en vez de su teléfono
      if (jid.endsWith('@lid')) {
        const alterno = key.senderPn || key.remoteJidAlt || key.participantPn;
        if (alterno) jid = alterno;
        else mapaLid.set(`${empresaId}:${digitosDeJid(jid)}`, jid);
      }

      const waId = digitosDeJid(jid);
      if (!waId) continue;

      const contenido = lib.normalizeMessageContent(m.message);
      const tipo = contenido ? lib.getContentType(contenido) : null;
      if (!tipo || ['protocolMessage', 'senderKeyDistributionMessage', 'reactionMessage', 'pollUpdateMessage', 'messageContextInfo'].includes(tipo)) continue;

      const texto = String(
        contenido.conversation ||
        contenido.extendedTextMessage?.text ||
        contenido.buttonsResponseMessage?.selectedDisplayText ||
        contenido.listResponseMessage?.title || ''
      );

      // El dueño respondió desde su celular: se registra y la IA se pausa en ese chat
      if (key.fromMe) {
        if (propios.has(key.id) || !texto) continue;
        await router.registrarSalienteHumanoCelular(empresaId, waId, texto);
        continue;
      }

      const cfgRes = await db.query('SELECT * FROM whatsapp_configuraciones WHERE empresa_id = $1', [empresaId]);
      const cfg = cfgRes.rows[0];
      if (!cfg || cfg.proveedor !== 'baileys') continue;

      // Sin await: el enrutador procesa un mensaje a la vez por chat (cola interna)
      router.procesarMensajeEntrante({
        value: { contacts: [{ profile: { name: m.pushName || '' } }] },
        mensaje: { from: waId, id: key.id, type: texto ? 'text' : tipo.replace(/Message$/, ''), text: { body: texto } },
        phoneNumberId: null,
        cfgOverride: cfg
      }).catch(e => console.error(`🚨 [BAILEYS] Error procesando mensaje (empresa ${empresaId}):`, e.message));
    } catch (e) {
      console.error(`🚨 [BAILEYS] Mensaje ignorado por error (empresa ${empresaId}):`, e.message);
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Cierre de conexión / reconexión
// ─────────────────────────────────────────────────────────────
const manejarCierre = async (empresaId, s, creds, lastDisconnect) => {
  if (s.cerrando) return;   // desvinculación iniciada desde el POS: cerrarSesion se encarga de todo
  const code = lastDisconnect?.error?.output?.statusCode;
  detenerSocket(s);
  s.qr = null;
  s.numero = null;
  s.codigoVinculacion = null;

  if (s.pareando && code !== 515) {               // el emparejamiento por código no se completó
    await borrarSesion(empresaId);                // limpia las credenciales provisionales que deja Baileys
    s.pareando = false;
    s.estado = 'sin_sesion';
    s.motivo = 'El código de 8 dígitos expiró o no se completó. Genera uno nuevo.';
  } else if (code === 401 || code === 500) {      // desvinculado desde el celular / sesión inválida
    await borrarSesion(empresaId);
    s.estado = 'sin_sesion';
    s.motivo = code === 401 ? 'El dispositivo fue desvinculado desde el celular. Vuelve a vincularlo.' : 'La sesión guardada era inválida. Vuelve a vincular.';
  } else if (code === 440) {                      // sesión abierta en otro lugar: NO pelear
    s.estado = 'desconectado';
    s.motivo = 'La sesión se abrió en otro servidor o dispositivo. No se reconectará sola.';
  } else if (code === 403) {
    s.estado = 'desconectado';
    s.motivo = 'WhatsApp rechazó la conexión (posible restricción del número).';
  } else if (code === 515) {                      // reinicio normal justo después de escanear el QR
    iniciar(empresaId).catch(e => console.error('🚨 [BAILEYS] Reinicio post-QR falló:', e.message));
    return;
  } else if (!creds?.me) {                        // QR nunca escaneado: no insistir (evita spam de vinculación)
    s.estado = 'desconectado';
    s.motivo = 'El código QR expiró. Genera uno nuevo.';
  } else {                                        // caída de red: reintento con espera creciente
    s.intentos += 1;
    if (s.intentos > MAX_INTENTOS) {
      s.estado = 'desconectado';
      s.motivo = 'No se pudo reconectar. Pulsa "Reconectar".';
    } else {
      s.estado = 'conectando';
      const espera = Math.min(60000, 2000 * 2 ** (s.intentos - 1));
      s.timer = setTimeout(() => iniciar(empresaId).catch(e => console.error('🚨 [BAILEYS] Reconexión falló:', e.message)), espera);
    }
  }
  emitir(empresaId, { tipo: 'canal' });
};

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────
const iniciar = async (empresaId, opciones = {}) => {
  if (!habilitado()) {
    throw new Error('La vinculación por QR está desactivada en este servidor (BAILEYS_ENABLED).');
  }
  const lib = await cargarLib();
  let s = sesiones.get(empresaId);
  if (!s) {
    s = {
      sock: null, estado: 'sin_sesion', qr: null, numero: null, motivo: null, intentos: 0, timer: null, iniciando: false,
      modo: 'qr', telefono: null, codigoVinculacion: null, pareando: false, cerrando: false
    };
    sesiones.set(empresaId, s);
  }
  if (s.iniciando) return s;
  if (s.sock && ['conectando', 'esperando_qr', 'conectado'].includes(s.estado)) return s;

  s.iniciando = true;
  try {
    clearTimeout(s.timer);
    detenerSocket(s);
    s.estado = 'conectando';
    s.qr = null;
    s.motivo = null;
    s.cerrando = false;
    s.modo = opciones.modo || s.modo || 'qr';
    if (opciones.telefono) s.telefono = opciones.telefono;
    s.codigoVinculacion = null;
    let codigoPedido = false;

    const { state, saveCreds } = await usarEstadoPostgres(empresaId, lib);
    // 🔇 Mensajes conocidos e inofensivos de Baileys (chats @bot / dispositivos vinculados, sesiones que se renegocian solas)
    const RUIDO_BAILEYS = /failed to decrypt message|stream errored out|unexpected error in 'init queries'/;
    const destinoLog = new (require('stream').Writable)({
      write(chunk, _enc, cb) {
        const linea = chunk.toString();
        if (!RUIDO_BAILEYS.test(linea)) process.stdout.write(linea);
        cb();
      }
    });
    const logger = require('pino')({ level: process.env.BAILEYS_LOG || 'silent' }, destinoLog); // BAILEYS_LOG=warn|info|debug para diagnosticar
    const version = await obtenerVersion(lib);
    const makeWASocket = lib.makeWASocket;

    const sock = makeWASocket({
      version,
      logger,
      auth: { creds: state.creds, keys: lib.makeCacheableSignalKeyStore(state.keys, logger) },
      printQRInTerminal: false,
      browser: navegadorBaileys(),
      markOnlineOnConnect: false,          // el celular sigue recibiendo sus notificaciones
      syncFullHistory: false,
      generateHighQualityLinkPreview: false
    });
    s.sock = sock;
    console.log(`[BAILEYS] Socket creado para empresa ${empresaId} (version: ${version ? version.join('.') : 'por defecto'}).`);

    // Si en 45 s no llegó ni QR ni conexión, se corta y se avisa (en vez de quedarse "Conectando" sin fin)
    setTimeout(() => {
      if (s.sock !== sock || s.estado !== 'conectando') return;
      console.error(`🚨 [BAILEYS] Empresa ${empresaId}: sin respuesta de WhatsApp tras ${CONEXION_TIMEOUT_MS / 1000} s. Revisa red/firewall o la version de Baileys.`);
      if (state.creds?.me) {
        // Número ya vinculado: se trata como caída de red (reintento con espera creciente)
        manejarCierre(empresaId, s, state.creds, { error: { message: 'timeout de conexion' } })
          .catch(e => console.error('🚨 [BAILEYS] Error en reintento por timeout:', e.message));
      } else {
        detenerSocket(s);
        s.estado = 'desconectado';
        s.motivo = 'WhatsApp no respondió a tiempo. Revisa la conexión a internet del servidor y vuelve a intentar.';
        emitir(empresaId, { tipo: 'canal' });
      }
    }, CONEXION_TIMEOUT_MS).unref();

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
      if (s.sock !== sock) return; // evento de un socket ya reemplazado
      const { connection, lastDisconnect, qr } = u;
      if (connection || qr) console.log(`[BAILEYS] empresa ${empresaId} -> connection=${connection || '-'} qr=${qr ? 'si' : 'no'} codigo=${lastDisconnect?.error?.output?.statusCode || '-'} motivo=${lastDisconnect?.error?.message || '-'}`);
      if (qr) {
        s.estado = 'esperando_qr';
        if (s.modo === 'codigo' && s.telefono) {
          s.qr = null;
          if (!codigoPedido && !state.creds.registered) {
            codigoPedido = true;
            s.pareando = true;
            sock.requestPairingCode(s.telefono)
              .then((codigo) => {
                if (s.sock !== sock) return;
                s.codigoVinculacion = codigo;
                emitir(empresaId, { tipo: 'canal' });
              })
              .catch((e) => {
                s.pareando = false;
                console.error(`🚨 [BAILEYS] Empresa ${empresaId}: no se pudo generar el código de vinculación: ${e.message}`);
                if (s.sock !== sock) return;
                detenerSocket(s);
                s.estado = 'desconectado';
                s.motivo = 'No se pudo generar el código de 8 dígitos. Revisa el número (con lada de país) o usa el QR.';
                emitir(empresaId, { tipo: 'canal' });
              });
          }
        } else {
          s.qr = qr;
        }
        emitir(empresaId, { tipo: 'canal' });
      }
      if (connection === 'open') {
        s.estado = 'conectado';
        s.qr = null;
        s.pareando = false;
        s.codigoVinculacion = null;
        s.motivo = null;
        s.intentos = 0;
        s.numero = digitosDeJid(sock.user?.id);
        console.log(`✅ [BAILEYS] Empresa ${empresaId} conectada (${s.numero}).`);
        emitir(empresaId, { tipo: 'canal' });
      }
      if (connection === 'close') {
        manejarCierre(empresaId, s, state.creds, lastDisconnect)
          .catch(e => console.error('🚨 [BAILEYS] Error manejando cierre:', e.message));
      }
    });

    sock.ev.on('messages.upsert', (evt) => {
      if (s.sock !== sock) return;
      manejarMensajes(empresaId, evt).catch(e => console.error('🚨 [BAILEYS] Error en upsert:', e.message));
    });

    return s;
  } catch (e) {
    s.estado = 'desconectado';
    s.motivo = e.message;
    throw e;
  } finally {
    s.iniciando = false;
  }
};

// Corta un intento atorado y empieza de cero SIN borrar la sesión guardada en Postgres
const reiniciar = async (empresaId, opciones = {}) => {
  const s = sesiones.get(empresaId);
  if (s) {
    clearTimeout(s.timer);
    detenerSocket(s);
    if (s.pareando) await borrarSesion(empresaId);   // descarta credenciales provisionales de un código a medias
    s.pareando = false;
    s.codigoVinculacion = null;
    s.iniciando = false;
    s.estado = 'sin_sesion';
    s.qr = null;
    s.motivo = null;
    s.intentos = 0;
  }
  return iniciar(empresaId, opciones);
};

const cerrarSesion = async (empresaId) => {
  const s = sesiones.get(empresaId);
  if (s) {
    clearTimeout(s.timer);
    s.cerrando = true;   // evita que manejarCierre escriba el aviso "desvinculado desde el celular"
    try { if (s.sock && s.estado === 'conectado') await s.sock.logout(); } catch (e) { /* ya cerrada */ }
    detenerSocket(s);
    s.estado = 'sin_sesion';
    s.qr = null;
    s.numero = null;
    s.motivo = null;
    s.intentos = 0;
    s.pareando = false;
    s.codigoVinculacion = null;
  }
  await borrarSesion(empresaId);
  if (s) s.cerrando = false;
  emitir(empresaId, { tipo: 'canal' });
};

const estadoDe = (empresaId) => {
  const s = sesiones.get(empresaId);
  return s
    ? { estado: s.estado, numero: s.numero, motivo: s.motivo, modo: s.modo }
    : { estado: 'sin_sesion', numero: null, motivo: null, modo: 'qr' };
};

const obtenerCodigo = (empresaId) => {
  const s = sesiones.get(empresaId);
  return s && s.estado === 'esperando_qr' ? s.codigoVinculacion : null;
};

const obtenerQr = (empresaId) => {
  const s = sesiones.get(empresaId);
  return s && s.estado === 'esperando_qr' ? s.qr : null;
};

const enviarTexto = async (empresaId, telefono, texto) => {
  const s = sesiones.get(empresaId);
  if (!s || s.estado !== 'conectado' || !s.sock) return false;
  let jid = mapaLid.get(`${empresaId}:${telefono}`);
  if (!jid) {
    s.jidCache = s.jidCache || new Map();
    jid = s.jidCache.get(telefono);
    if (!jid) {
      try {
        const r = await s.sock.onWhatsApp(telefono);
        if (r && r[0] && r[0].exists) { jid = r[0].jid; s.jidCache.set(telefono, jid); }
      } catch (e) { /* si falla, se usa el formato directo */ }
    }
    if (!jid) jid = `${telefono}@s.whatsapp.net`;
  }
  try {
    // "Escribiendo..." es cosmético: si falla, el mensaje se envía igual
    try {
      await s.sock.sendPresenceUpdate('composing', jid);
      await dormir(600);
    } catch (e) { /* ignorado a propósito */ }

    const r = await s.sock.sendMessage(jid, { text: texto });
    if (r?.key?.id) {
      propios.add(r.key.id);
      setTimeout(() => propios.delete(r.key.id), 2 * 60 * 1000).unref();
    }
    return true;
  } catch (e) {
    console.error(`🚨 [BAILEYS] No se pudo enviar (empresa ${empresaId}):`, e.message);
    return false;
  }
};

// Al arrancar: reconecta (escalonado) las empresas que ya tenían un número vinculado
const restaurarSesiones = async () => {
  if (!habilitado()) return;
  const r = await db.query(`
    SELECT ws.empresa_id
    FROM whatsapp_sesiones ws
    JOIN whatsapp_configuraciones wc ON wc.empresa_id = ws.empresa_id
    WHERE ws.session_id = 'creds' AND wc.proveedor = 'baileys' AND ws.datos ? 'me'
  `);
  for (const fila of r.rows) {
    iniciar(fila.empresa_id).catch(e => console.error(`🚨 [BAILEYS] No se pudo restaurar empresa ${fila.empresa_id}:`, e.message));
    await dormir(3000);
  }
  if (r.rows.length) console.log(`📱 [BAILEYS] ${r.rows.length} sesión(es) restaurada(s).`);
};

module.exports = { iniciar, reiniciar, cerrarSesion, estadoDe, obtenerQr, obtenerCodigo, enviarTexto, restaurarSesiones };