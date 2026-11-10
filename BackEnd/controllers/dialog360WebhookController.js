// BackEnd/controllers/dialog360WebhookController.js
// =========================================================================
// 📲 360dialog: webhook entrante por empresa (secreto en la URL) y endpoint
// para que el admin vea/copie su URL. Todo filtrado por empresa_id.
// =========================================================================
const crypto = require('crypto');
const db = require('../config/db');

// POST /whatsapp/360dialog/webhook/:secreto  (público: lo llama 360dialog)
exports.recibirWebhook360 = async (req, res) => {
  res.sendStatus(200); // siempre 200: no revela si el secreto es válido
  try {
    const secreto = String(req.params.secreto || '');
    if (!/^[a-f0-9]{48}$/.test(secreto)) return;

    const r = await db.query(
      `SELECT * FROM whatsapp_configuraciones WHERE webhook_secret = $1 AND proveedor = '360dialog'`,
      [secreto]
    );
    const cfg = r.rows[0];
    if (!cfg) return;

    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const mensaje = value?.messages?.[0];
    if (!mensaje) return; // estados de entrega/lectura: fuera de alcance

    await require('../utils/whatsappRouterIA').procesarMensajeEntrante({
      value, mensaje, phoneNumberId: null, cfgOverride: cfg
    });
  } catch (error) {
    console.error('🚨 Error en webhook de 360dialog:', error.message);
  }
};

// GET /omnichannel/360dialog/webhook-url  (admin del negocio)
exports.obtenerUrlWebhook = async (req, res) => {
  try {
    const nuevo = crypto.randomBytes(24).toString('hex'); // 48 caracteres hex
    const r = await db.query(
      `UPDATE whatsapp_configuraciones
       SET webhook_secret = COALESCE(webhook_secret, $1)
       WHERE empresa_id = $2
       RETURNING webhook_secret`,
      [nuevo, req.empresa_id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Aún no hay configuración de WhatsApp.' });
    const url = `${req.protocol}://${req.get('host')}/api/whatsapp/360dialog/webhook/${r.rows[0].webhook_secret}`;
    res.json({ success: true, url });
  } catch (error) {
    console.error('🚨 Error en obtenerUrlWebhook:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo generar la URL del webhook.' });
  }
};