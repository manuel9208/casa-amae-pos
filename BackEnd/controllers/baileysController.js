// BackEnd/controllers/baileysController.js
// =========================================================================
// 📱 Endpoints del panel de vinculación Baileys (QR). SOLO admin del negocio:
// quien escanea el QR toma el control del WhatsApp del negocio.
// Se usa DESPUÉS de resolveTenant y requerirPersonalPOS (fallan cerrado).
// =========================================================================
const db = require('../config/db');
const manager = require('../utils/whatsappBaileysManager');

exports.soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ success: false, error: 'Solo el administrador puede vincular el número.' });
  }
  next();
};

exports.estado = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    let qr = null;
    const qrCrudo = manager.obtenerQr(empresaId);
    if (qrCrudo) qr = await require('qrcode').toDataURL(qrCrudo, { margin: 1, width: 320 });
    res.json({ success: true, ...manager.estadoDe(empresaId), qr });
  } catch (error) {
    console.error('🚨 Error en baileys.estado:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo obtener el estado de la conexión.' });
  }
};

exports.conectar = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const wa = await db.query('SELECT proveedor FROM whatsapp_configuraciones WHERE empresa_id = $1', [empresaId]);
    if (wa.rows[0]?.proveedor !== 'baileys') {
      return res.status(409).json({ success: false, error: 'Primero selecciona "Baileys" como proveedor de WhatsApp.' });
    }
    if (req.body && req.body.forzar === true) await manager.reiniciar(empresaId);
    else await manager.iniciar(empresaId);
    res.json({ success: true, ...manager.estadoDe(empresaId) });
  } catch (error) {
    console.error('🚨 Error en baileys.conectar:', error.message);
    res.status(500).json({ success: false, error: error.message || 'No se pudo iniciar la vinculación.' });
  }
};

exports.desconectar = async (req, res) => {
  try {
    await manager.cerrarSesion(req.empresa_id);
    res.json({ success: true, ...manager.estadoDe(req.empresa_id) });
  } catch (error) {
    console.error('🚨 Error en baileys.desconectar:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo desvincular el número.' });
  }
};