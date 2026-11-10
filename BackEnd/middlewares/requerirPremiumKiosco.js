// BackEnd/middlewares/requerirPremiumKiosco.js
// =========================================================================
// 🔒 El asistente del Kiosco solo responde si la EMPRESA tiene Premium y
// el módulo encendido. Se valida en el servidor, no solo en la interfaz.
// =========================================================================
const db = require('../config/db');

exports.requerirPremiumKiosco = async (req, res, next) => {
  try {
    const r = await db.query(
      'SELECT tier_premium, kiosco_ia_activo FROM ia_configuracion WHERE empresa_id = $1',
      [req.empresa_id]
    );
    const c = r.rows[0];
    if (c && c.tier_premium === true && c.kiosco_ia_activo === true) return next();
    return res.status(403).json({ success: false, error: 'El asistente no está disponible en este momento.' });
  } catch (error) {
    console.error('🚨 Error en requerirPremiumKiosco:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo validar el asistente.' });
  }
};