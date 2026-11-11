// BackEnd/controllers/omnichannelChatController.js
// =========================================================================
// 💬 CHAT DE WHATSAPP EN CAJA (Human Handoff) — endpoints REST
// Todo filtrado por req.empresa_id. Nunca se devuelven credenciales ni wamid.
// =========================================================================
const crypto = require('crypto');
const db = require('../config/db');
const { enviarTextoPorProveedor } = require('../utils/whatsappHelpers');
const baileysManager = require('../utils/whatsappBaileysManager'); // 🆕 FASE 4b

const MAX_MENSAJES_CHAT = 200;                 // mismo tope que el enrutador
const MAX_TEXTO = 2000;
const VENTANA_MS = 24 * 60 * 60 * 1000;        // ventana de servicio de Meta

const idValido = (v) => /^\d+$/.test(String(v)) && Number(v) <= 2147483647;

// 🔒 Solo a la sala de la empresa. Payload sin datos personales (los Kioscos comparten sala).
const emitir = (empresaId, payload) => {
  const io = global.ioInstance;
  if (io) io.to(`empresa_${empresaId}`).emit('omnichannel_actualizado', payload);
};

const ventanaAbierta = (proveedor, ultimoMensajeCliente) => {
  if (proveedor === 'baileys') return true; // sin ventana de plantillas
  if (!ultimoMensajeCliente) return false;
  return Date.now() - new Date(ultimoMensajeCliente).getTime() < VENTANA_MS;
};

// ─────────────────────────────────────────────────────────────
// GET /omnichannel/chats — bandeja
// ─────────────────────────────────────────────────────────────
exports.listarChats = async (req, res) => {
  try {
    const empresaId = req.empresa_id;

    const waRes = await db.query(
      `SELECT proveedor, meta_phone_id, meta_api_token, dialog360_token, ia_habilitada
       FROM whatsapp_configuraciones WHERE empresa_id = $1`,
      [empresaId]
    );
    const wa = waRes.rows[0];
    const canalListo = !!wa && (
      (wa.proveedor === 'meta' && wa.meta_phone_id && wa.meta_api_token) ||
      (wa.proveedor === '360dialog' && wa.dialog360_token) ||
      (wa.proveedor === 'baileys' && baileysManager.estadoDe(empresaId).estado !== 'sin_sesion')
    );
    // Canal sin configurar (o Baileys, pendiente de su fase): la Caja no muestra la burbuja
    if (!canalListo) return res.json({ success: true, habilitado: false, ia_activa: false, chats: [], no_leidos: 0 });

    const iaRes = await db.query('SELECT tier_premium FROM ia_configuracion WHERE empresa_id = $1', [empresaId]);
    const iaActiva = wa.ia_habilitada === true && iaRes.rows[0]?.tier_premium === true;

    const chatsRes = await db.query(`
      SELECT id, telefono_cliente, nombre_cliente, pausa_ia, proveedor,
             ultimo_mensaje, ultimo_mensaje_cliente, COALESCE(no_leidos, 0) AS no_leidos,
             LEFT(COALESCE(mensajes -> -1 ->> 'contenido', ''), 80) AS ultimo_texto,
             mensajes -> -1 ->> 'rol' AS ultimo_rol
      FROM omnichannel_chats
      WHERE empresa_id = $1
        AND (cerrado_en IS NULL OR ultimo_mensaje > cerrado_en)
      ORDER BY ultimo_mensaje DESC
      LIMIT 100
    `, [empresaId]);

    const noLeidos = chatsRes.rows.reduce((acc, c) => acc + Number(c.no_leidos || 0), 0);
    res.json({ success: true, habilitado: true, ia_activa: iaActiva, chats: chatsRes.rows, no_leidos: noLeidos });
  } catch (error) {
    console.error('🚨 Error en listarChats:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo cargar la bandeja de WhatsApp.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /omnichannel/chats/:id — conversación (marca como leída)
// ─────────────────────────────────────────────────────────────
exports.obtenerChat = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    if (!idValido(req.params.id)) return res.status(400).json({ success: false, error: 'Chat inválido.' });

    const r = await db.query(`
      UPDATE omnichannel_chats SET no_leidos = 0
      WHERE id = $1 AND empresa_id = $2
      RETURNING id, telefono_cliente, nombre_cliente, pausa_ia, proveedor, mensajes, ultimo_mensaje_cliente
    `, [req.params.id, empresaId]);
    const row = r.rows[0];
    if (!row) return res.status(404).json({ success: false, error: 'Conversación no encontrada.' });

    const mensajes = (Array.isArray(row.mensajes) ? row.mensajes : []).map(m => ({
      id: m.id, rol: m.rol, contenido: m.contenido, ts: m.ts, error_envio: !!m.error_envio
    }));

    res.json({
      success: true,
      chat: {
        id: row.id,
        telefono_cliente: row.telefono_cliente,
        nombre_cliente: row.nombre_cliente,
        pausa_ia: row.pausa_ia,
        proveedor: row.proveedor,
        ventana_abierta: ventanaAbierta(row.proveedor, row.ultimo_mensaje_cliente),
        mensajes
      }
    });
  } catch (error) {
    console.error('🚨 Error en obtenerChat:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo abrir la conversación.' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /omnichannel/chats/:id/mensajes — el cajero responde
// Al responder, la IA se pausa en ese chat (para que no se cruce con la persona).
// ─────────────────────────────────────────────────────────────
exports.enviarMensajeCajero = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    if (!idValido(req.params.id)) return res.status(400).json({ success: false, error: 'Chat inválido.' });

    const texto = String(req.body?.texto || '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, MAX_TEXTO);
    if (!texto) return res.status(400).json({ success: false, error: 'Escribe un mensaje.' });

    const chatRes = await db.query(
      `SELECT id, telefono_cliente, proveedor, ultimo_mensaje_cliente
       FROM omnichannel_chats WHERE id = $1 AND empresa_id = $2`,
      [req.params.id, empresaId]
    );
    const chat = chatRes.rows[0];
    if (!chat) return res.status(404).json({ success: false, error: 'Conversación no encontrada.' });

    if (!ventanaAbierta(chat.proveedor, chat.ultimo_mensaje_cliente)) {
      return res.status(409).json({
        success: false,
        codigo: 'VENTANA_24H',
        error: 'Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp solo permite escribirle con una plantilla aprobada.'
      });
    }

    const cfgRes = await db.query('SELECT * FROM whatsapp_configuraciones WHERE empresa_id = $1', [empresaId]);
    const cfg = cfgRes.rows[0];
    if (!cfg) return res.status(409).json({ success: false, error: 'El canal de WhatsApp no está configurado.' });

    const enviado = await enviarTextoPorProveedor(cfg, chat.telefono_cliente, texto);
    if (!enviado) {
      return res.status(502).json({
        success: false,
        codigo: 'ENVIO_FALLIDO',
        error: 'WhatsApp no aceptó el mensaje. Revisa las credenciales del canal o intenta de nuevo.'
      });
    }

    const msg = {
      id: crypto.randomUUID(),
      rol: 'cajero',
      contenido: texto,
      ts: new Date().toISOString(),
      autor: req.usuario?.nombre || null
    };

    await db.query(`
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
      WHERE id = $1 AND empresa_id = $2
    `, [chat.id, empresaId, JSON.stringify([msg]), MAX_MENSAJES_CHAT]);

    emitir(empresaId, { tipo: 'mensaje', chat_id: chat.id });
    res.json({ success: true });
  } catch (error) {
    console.error('🚨 Error en enviarMensajeCajero:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo enviar el mensaje.' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /omnichannel/chats/:id/pausa — tomar control / devolver a la IA
// ─────────────────────────────────────────────────────────────
exports.cambiarPausaIA = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    if (!idValido(req.params.id)) return res.status(400).json({ success: false, error: 'Chat inválido.' });
    if (typeof req.body?.pausa !== 'boolean') return res.status(400).json({ success: false, error: 'Valor de pausa inválido.' });

    const r = await db.query(
      'UPDATE omnichannel_chats SET pausa_ia = $3 WHERE id = $1 AND empresa_id = $2 RETURNING id, pausa_ia',
      [req.params.id, empresaId, req.body.pausa]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Conversación no encontrada.' });

    emitir(empresaId, { tipo: 'pausa', chat_id: r.rows[0].id });
    res.json({ success: true, pausa_ia: r.rows[0].pausa_ia });
  } catch (error) {
    console.error('🚨 Error en cambiarPausaIA:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo cambiar el modo del chat.' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /omnichannel/chats/:id/cerrar — oculta la conversación de la bandeja.
// Conserva el historial; reaparece sola si el cliente vuelve a escribir.
// ─────────────────────────────────────────────────────────────
exports.cerrarChat = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    if (!idValido(req.params.id)) return res.status(400).json({ success: false, error: 'Chat inválido.' });

    const r = await db.query(
      'UPDATE omnichannel_chats SET cerrado_en = NOW(), no_leidos = 0 WHERE id = $1 AND empresa_id = $2 RETURNING id',
      [req.params.id, empresaId]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Conversación no encontrada.' });

    emitir(empresaId, { tipo: 'cierre', chat_id: r.rows[0].id });
    res.json({ success: true });
  } catch (error) {
    console.error('🚨 Error en cerrarChat:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo cerrar la conversación.' });
  }
};