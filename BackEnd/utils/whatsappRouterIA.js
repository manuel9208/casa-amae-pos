// BackEnd/utils/whatsappRouterIA.js
// =========================================================================
// 🤖📱 ENRUTADOR OMNICANAL DE WHATSAPP (IA + Human Handoff)
// Módulo aislado: se engancha al webhook existente con UNA llamada.
// Devuelve { manejado: true }  -> el webhook termina aquí.
//          { manejado: false } -> el webhook continúa con su flujo legacy.
// =========================================================================
const crypto = require('crypto');
const db = require('../config/db');
const { resolverVariable } = require('./envResolver');
const { generarRespuestaTexto } = require('../controllers/iaController');
const { enviarTextoPorProveedor, normalizarTelefonoMX } = require('./whatsappHelpers');
const {
  construirSystemPrompt, detectarPeticionHumano, sanitizarEntrada,
  procesarRespuestaIA, calcularDelayEscrituraMs
} = require('./whatsappPromptIA');

const MAX_MENSAJES_CHAT = 200;      // tope de historial por chat (JSONB)
const TURNOS_HISTORIAL = 12;        // turnos que se mandan al modelo
const MAX_RESPUESTAS_IA = 8;        // por chat...
const VENTANA_RITMO_MS = 5 * 60 * 1000; // ...cada 5 minutos

const FRASES_TRASPASO = [
  'Claro, te paso con una persona del equipo para que te atienda. Dame un momento 🙌',
  'Con gusto, ahorita le aviso a alguien del equipo para que continúe contigo. Un momentito.',
  'Va, te comunico con una persona del equipo. En breve te escriben por aquí mismo.'
];
const FRASE_FALLO_IA = 'Dame un momento por favor, enseguida te atiendo 🙌';

// ─────────────────────────────────────────────────────────────
// Utilidades en memoria (instancia única en Render)
// ─────────────────────────────────────────────────────────────
const colas = new Map();      // clave empresa:telefono -> promesa (un mensaje a la vez por chat)
const ventanas = new Map();   // clave -> timestamps de respuestas IA
const cacheContexto = new Map(); // empresa_id -> { ts, data }

const encolar = (clave, tarea) => {
  const previa = colas.get(clave) || Promise.resolve();
  const siguiente = previa.catch(() => {}).then(tarea);
  colas.set(clave, siguiente);
  siguiente
    .finally(() => { if (colas.get(clave) === siguiente) colas.delete(clave); })
    .catch(() => {});
  return siguiente;
};

const excedeRitmo = (clave) => {
  const ahora = Date.now();
  const arr = (ventanas.get(clave) || []).filter(t => ahora - t < VENTANA_RITMO_MS);
  arr.push(ahora);
  ventanas.set(clave, arr);
  return arr.length > MAX_RESPUESTAS_IA;
};

setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of ventanas) if (!v.length || ahora - v[v.length - 1] > 10 * 60 * 1000) ventanas.delete(k);
}, 10 * 60 * 1000).unref();

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

// 🔒 Emisión SOLO a la sala de la empresa. Payload SIN datos personales:
// los Kioscos (públicos) también están en esa sala. Caja consulta el detalle por REST.
const emitir = (empresaId, payload) => {
  const io = global.ioInstance;
  if (io) io.to(`empresa_${empresaId}`).emit('omnichannel_actualizado', payload);
};

// ─────────────────────────────────────────────────────────────
// Persistencia (omnichannel_chats) — siempre filtrada por empresa_id
// ─────────────────────────────────────────────────────────────
const nuevoMensaje = (rol, contenido, extra = {}) => ({
  id: crypto.randomUUID(), rol, contenido, ts: new Date().toISOString(), ...extra
});

// Append atómico + recorte a los últimos N mensajes (sin leer-modificar-escribir en Node)
const agregarMensaje = async (empresaId, telefono, nombre, msg, esCliente, proveedor = 'meta') => {
  const r = await db.query(`
    INSERT INTO omnichannel_chats
      (empresa_id, telefono_cliente, nombre_cliente, proveedor, mensajes, ultimo_mensaje, ultimo_mensaje_cliente, no_leidos)
    VALUES ($1, $2, $3, $7, $4::jsonb, NOW(),
            CASE WHEN $5::boolean THEN NOW() END,
            CASE WHEN $5::boolean THEN 1 ELSE 0 END)
    ON CONFLICT (empresa_id, telefono_cliente) DO UPDATE SET
      nombre_cliente = COALESCE(omnichannel_chats.nombre_cliente, EXCLUDED.nombre_cliente),
      mensajes = (
        SELECT COALESCE(jsonb_agg(s.e ORDER BY s.n), '[]'::jsonb)
        FROM (
          SELECT t.e, t.n
          FROM jsonb_array_elements(omnichannel_chats.mensajes || EXCLUDED.mensajes) WITH ORDINALITY AS t(e, n)
          ORDER BY t.n DESC LIMIT $6::int
        ) s
      ),
      ultimo_mensaje = NOW(),
      ultimo_mensaje_cliente = CASE WHEN $5::boolean THEN NOW() ELSE omnichannel_chats.ultimo_mensaje_cliente END,
      no_leidos = CASE WHEN $5::boolean THEN COALESCE(omnichannel_chats.no_leidos, 0) + 1
                       ELSE COALESCE(omnichannel_chats.no_leidos, 0) END
    RETURNING id, pausa_ia, mensajes
  `, [empresaId, telefono, nombre || null, JSON.stringify([msg]), esCliente, MAX_MENSAJES_CHAT, proveedor]);
  return r.rows[0];
};

const yaProcesado = async (empresaId, telefono, wamid) => {
  if (!wamid) return false;
  const r = await db.query(
    `SELECT 1 FROM omnichannel_chats
     WHERE empresa_id = $1 AND telefono_cliente = $2 AND mensajes @> $3::jsonb LIMIT 1`,
    [empresaId, telefono, JSON.stringify([{ wamid }])]
  );
  return r.rows.length > 0;
};

const pausarIA = (empresaId, chatId) =>
  db.query('UPDATE omnichannel_chats SET pausa_ia = true WHERE id = $1 AND empresa_id = $2', [chatId, empresaId]);

// ─────────────────────────────────────────────────────────────
// Contexto del negocio (menú + horario), cacheado 60 s por empresa
// ─────────────────────────────────────────────────────────────
const formatearHorario = (h) => {
  try {
    const o = typeof h === 'string' ? JSON.parse(h) : (h || {});
    return Object.entries(o)
      .filter(([, v]) => v && v.activo)
      .map(([dia, v]) => `${dia}: ${v.apertura}-${v.cierre}`)
      .join('; ');
  } catch (e) { return ''; }
};

const obtenerContextoNegocio = async (empresaId) => {
  const c = cacheContexto.get(empresaId);
  if (c && Date.now() - c.ts < 60000) return c.data;

  const [conf, prods] = await Promise.all([
    db.query(
      'SELECT nombre_negocio, negocio_abierto, horarios_semana FROM configuracion WHERE empresa_id = $1 LIMIT 1',
      [empresaId]
    ),
    db.query(
      `SELECT nombre, categoria, precio_base, descripcion FROM productos
       WHERE empresa_id = $1 AND disponible = true ORDER BY categoria, nombre LIMIT 200`,
      [empresaId]
    )
  ]);

  const cfg = conf.rows[0] || {};
  const urlPedidos = String(await resolverVariable(empresaId, 'FRONTEND_URL') || '').trim().replace(/\/$/, '');
  const data = {
    urlPedidos,
    nombreNegocio: cfg.nombre_negocio || 'el negocio',
    abierto: cfg.negocio_abierto === true || String(cfg.negocio_abierto) === 'true',
    horarioTexto: formatearHorario(cfg.horarios_semana),
    menuTexto: prods.rows
      .map(p => `- ${p.nombre} (${p.categoria || 'General'}): $${Number(p.precio_base).toFixed(2)}${p.descripcion ? ' — ' + String(p.descripcion).slice(0, 80) : ''}`)
      .join('\n')
      .slice(0, 6000)
  };
  cacheContexto.set(empresaId, { ts: Date.now(), data });
  return data;
};

const resolverNombreCliente = async (empresaId, waId, nombrePerfil) => {
  try {
    const tel = normalizarTelefonoMX(waId);
    if (tel.length === 10) {
      const r = await db.query('SELECT nombre FROM clientes WHERE empresa_id = $1 AND telefono = $2 LIMIT 1', [empresaId, Number(tel)]);
      if (r.rows[0]?.nombre) return String(r.rows[0].nombre).split(' ')[0];
    }
  } catch (e) { /* silencioso: el nombre es solo cortesía */ }
  return nombrePerfil ? nombrePerfil.split(' ')[0] : '';
};

// ─────────────────────────────────────────────────────────────
// Selección de motor: respeta *_habilitado y exige llave (propia o de entorno)
// ─────────────────────────────────────────────────────────────
const elegirProveedor = (ia) => {
  const disponible = {
    gemini: () => ia.gemini_habilitado !== false && !!(ia.api_key_gemini || process.env.GEMINI_API_KEY),
    openai: () => ia.openai_habilitado === true && !!(ia.api_key_openai || process.env.OPENAI_API_KEY),
    claude: () => ia.claude_habilitado === true && !!(ia.api_key_claude || process.env.CLAUDE_API_KEY)
  };
  return [ia.proveedor_activo, 'gemini', 'openai', 'claude']
    .filter(p => p && disponible[p])
    .find(p => disponible[p]()) || null;
};

const extraerTexto = (m) => {
  switch (m.type) {
    case 'text': return { texto: m.text?.body || '', esTexto: true };
    case 'button': return { texto: m.button?.text || '', esTexto: true };
    case 'interactive':
      return { texto: m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '', esTexto: true };
    default: return { texto: `[${m.type || 'mensaje'}]`, esTexto: false };
  }
};

const armarUserPrompt = (historial, textoNuevo) => {
  const lineas = historial
    .slice(-TURNOS_HISTORIAL)
    .map(m => `${m.rol === 'cliente' ? 'CLIENTE' : 'TÚ (equipo)'}: ${m.contenido}`)
    .join('\n');
  return `CONVERSACIÓN HASTA AHORA:\n${lineas || '(inicio de la conversación)'}\n\nÚLTIMO MENSAJE DEL CLIENTE (responde solo a este, en 1 a 3 frases):\n${textoNuevo}`;
};

// ─────────────────────────────────────────────────────────────
// PUNTO DE ENTRADA — llamado desde whatsappController.recibirWebhook
// ─────────────────────────────────────────────────────────────
exports.procesarMensajeEntrante = async ({ value, mensaje, phoneNumberId, cfgOverride = null }) => {
  // 🔐 Meta: tenant por Phone ID (índice único). Baileys entrega su fila de config ya resuelta por empresa.
  const cfgRes = cfgOverride
    ? { rows: [cfgOverride] }
    : await db.query(
        `SELECT * FROM whatsapp_configuraciones WHERE meta_phone_id = $1 AND proveedor = 'meta' LIMIT 1`,
        [String(phoneNumberId)]
      );
  const cfg = cfgRes.rows[0];
  if (!cfg) return { manejado: false }; // negocio sin Omnicanal: sigue el flujo legacy intacto

  const empresaId = cfg.empresa_id;
  const waId = String(mensaje.from || '').replace(/\D/g, '');
  if (!waId) return { manejado: true };

  const { texto, esTexto } = extraerTexto(mensaje);
  const textoLimpio = sanitizarEntrada(texto);
  const nombrePerfil = sanitizarEntrada(value?.contacts?.[0]?.profile?.name || '', 100);

  return encolar(`${empresaId}:${waId}`, async () => {
    // 1) Idempotencia: Meta reintenta webhooks
    if (await yaProcesado(empresaId, waId, mensaje.id)) return { manejado: true };

    // 2) Registrar SIEMPRE (con o sin IA): Caja debe ver todo
    const chat = await agregarMensaje(
      empresaId, waId, nombrePerfil,
      nuevoMensaje('cliente', textoLimpio || texto, { wamid: mensaje.id || null }),
      true,
      cfg.proveedor || 'meta'
    );
    emitir(empresaId, { tipo: 'mensaje', chat_id: chat.id });

    // 3) Human Handoff activo: la IA no lee ni responde
    if (chat.pausa_ia) return { manejado: true };

    // 4) 🔒 Candado comercial EN EL SERVIDOR: Premium + IA de WhatsApp encendida
    const iaRes = await db.query('SELECT * FROM ia_configuracion WHERE empresa_id = $1', [empresaId]);
    const iaCfg = iaRes.rows[0];
    if (!(cfg.ia_habilitada === true && iaCfg?.tier_premium === true)) return { manejado: true }; // 100% manual

    // 5) Adjuntos/audio/imagen: la IA no los interpreta -> los atiende una persona
    if (!esTexto || !textoLimpio) return { manejado: true };

    // 6) Freno anti-bucle / anti-gasto de tokens
    if (excedeRitmo(`${empresaId}:${waId}`)) return { manejado: true };

    // 7) Coexistencia con el asistente de pedidos legacy (empresas.whatsapp_pedidos_ia)
    const flags = await db.query('SELECT whatsapp_pedidos_ia FROM empresas WHERE id = $1', [empresaId]);
    const pedidosIA = !!flags.rows[0]?.whatsapp_pedidos_ia; // 🆕 con el candado activo, el paso 9 usa el asistente de pedidos (cualquier canal)

    // 8) Cliente pide una persona -> traspaso inmediato (sin gastar tokens)
    if (detectarPeticionHumano(textoLimpio)) {
      const frase = FRASES_TRASPASO[Math.floor(Math.random() * FRASES_TRASPASO.length)];
      await dormir(calcularDelayEscrituraMs(frase));
      await enviarTextoPorProveedor(cfg, waId, frase);
      await agregarMensaje(empresaId, waId, null, nuevoMensaje('ia', frase), false);
      await pausarIA(empresaId, chat.id);
      emitir(empresaId, { tipo: 'handoff', chat_id: chat.id });
      return { manejado: true };
    }

    // 9) Respuesta de la IA
    const proveedor = elegirProveedor(iaCfg);
    if (!proveedor) return { manejado: true }; // sin motor/llave utilizable: queda manual

    try {
      const ctx = await obtenerContextoNegocio(empresaId);

      // 🆕 PEDIDOS POR IA (cualquier canal): el número y el ticket los manda el backend, no el modelo.
      // Si Gemini no está disponible, se cae al asistente general (que ya no promete pedidos).
      const geminiOk = iaCfg.gemini_habilitado !== false && !!(iaCfg.api_key_gemini || process.env.GEMINI_API_KEY);
      if (pedidosIA && geminiOk) {
        const resPed = await require('./whatsappPedidosIA').procesarPedidoPorIA({
          empresaId, waId, textoCliente: textoLimpio, iaCfg,
          nombreAgente: cfg.nombre_agente || 'Ana', contexto: ctx, io: global.ioInstance
        });
        for (const parte of resPed.mensajes) {
          await dormir(calcularDelayEscrituraMs(parte));
          const enviadoPed = await enviarTextoPorProveedor(cfg, waId, parte);
          await agregarMensaje(empresaId, waId, null, nuevoMensaje('ia', parte, enviadoPed ? {} : { error_envio: true }), false, cfg.proveedor || 'meta');
        }
        if (resPed.transferir) {
          await pausarIA(empresaId, chat.id);
          emitir(empresaId, { tipo: 'handoff', chat_id: chat.id });
        } else {
          emitir(empresaId, { tipo: 'mensaje', chat_id: chat.id });
        }
        return { manejado: true };
      }
      const nombreCliente = await resolverNombreCliente(empresaId, waId, nombrePerfil);
      const systemPrompt = construirSystemPrompt({
        nombreNegocio: ctx.nombreNegocio,
        nombreAgente: cfg.nombre_agente || 'Ana',
        nombreCliente,
        horarioTexto: ctx.horarioTexto,
        menuTexto: ctx.menuTexto,
        negocioAbierto: ctx.abierto,
        urlPedidos: ctx.urlPedidos
      });

      const historial = (chat.mensajes || []).slice(0, -1); // sin el mensaje que acabamos de registrar
      const raw = await generarRespuestaTexto(
        systemPrompt, armarUserPrompt(historial, textoLimpio), 0.7, 3, null, iaCfg, proveedor, empresaId
      );
      const { texto: respuesta, transferir } = procesarRespuestaIA(raw);

      await dormir(calcularDelayEscrituraMs(respuesta));
      const enviado = await enviarTextoPorProveedor(cfg, waId, respuesta);
      await agregarMensaje(empresaId, waId, null, nuevoMensaje('ia', respuesta, enviado ? {} : { error_envio: true }), false);

      if (transferir) {
        await pausarIA(empresaId, chat.id);
        emitir(empresaId, { tipo: 'handoff', chat_id: chat.id });
      } else {
        emitir(empresaId, { tipo: 'mensaje', chat_id: chat.id });
      }
    } catch (error) {
      // Si la IA falla: se pausa, se avisa a Caja y el cliente no se queda en silencio
      console.error(`🚨 [OMNICANAL] IA falló (empresa ${empresaId}):`, error.message);
      try {
        await enviarTextoPorProveedor(cfg, waId, FRASE_FALLO_IA);
        await agregarMensaje(empresaId, waId, null, nuevoMensaje('ia', FRASE_FALLO_IA), false);
        await pausarIA(empresaId, chat.id);
        emitir(empresaId, { tipo: 'ia_fallo', chat_id: chat.id });
      } catch (e) { /* último recurso: el mensaje del cliente ya quedó registrado */ }
    }
    return { manejado: true };
  });
};

// Espejo de respuestas enviadas por el flujo legacy (pedidos IA), SOLO si el chat ya existe en Omnicanal
exports.registrarSalienteExterno = async (empresaId, waId, texto) => {
  try {
    const r = await db.query(`
      UPDATE omnichannel_chats SET
        mensajes = (
          SELECT COALESCE(jsonb_agg(s.e ORDER BY s.n), '[]'::jsonb)
          FROM (
            SELECT t.e, t.n
            FROM jsonb_array_elements(omnichannel_chats.mensajes || $3::jsonb) WITH ORDINALITY AS t(e, n)
            ORDER BY t.n DESC LIMIT $4::int
          ) s
        ),
        ultimo_mensaje = NOW()
      WHERE empresa_id = $1 AND telefono_cliente = $2
      RETURNING id
    `, [empresaId, String(waId), JSON.stringify([nuevoMensaje('ia', texto)]), MAX_MENSAJES_CHAT]);
    if (r.rows[0]) emitir(empresaId, { tipo: 'mensaje', chat_id: r.rows[0].id });
  } catch (e) { console.error('⚠️ [OMNICANAL] No se pudo espejar mensaje saliente:', e.message); }
};

// 📱 Baileys: el dueño respondió desde el celular -> se registra como humano y se pausa la IA en ese chat
exports.registrarSalienteHumanoCelular = async (empresaId, waId, texto) => {
  try {
    const r = await db.query(`
      UPDATE omnichannel_chats SET
        mensajes = (
          SELECT COALESCE(jsonb_agg(s.e ORDER BY s.n), '[]'::jsonb)
          FROM (
            SELECT t.e, t.n
            FROM jsonb_array_elements(omnichannel_chats.mensajes || $3::jsonb) WITH ORDINALITY AS t(e, n)
            ORDER BY t.n DESC LIMIT $4::int
          ) s
        ),
        ultimo_mensaje = NOW(),
        pausa_ia = true,
        no_leidos = 0
      WHERE empresa_id = $1 AND telefono_cliente = $2
      RETURNING id
    `, [empresaId, String(waId), JSON.stringify([nuevoMensaje('cajero', texto, { desde_celular: true })]), MAX_MENSAJES_CHAT]);
    if (r.rows[0]) emitir(empresaId, { tipo: 'pausa', chat_id: r.rows[0].id });
  } catch (e) { console.error('⚠️ [OMNICANAL] No se pudo registrar respuesta desde el celular:', e.message); }
};