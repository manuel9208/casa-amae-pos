// BackEnd/middlewares/requerirPersonalPOS.js
// =========================================================================
// 🔐 Guard para endpoints con datos sensibles (chats de WhatsApp, Baileys).
// Se usa DESPUÉS de resolveTenant. Falla CERRADO.
// Valida: token firmado + misma empresa que el tenant + usuario vigente en BD.
// Deja req.usuario = { id, nombre, rol, empresa_id } para los controladores.
// =========================================================================
const db = require('../config/db');
const { verificarToken, secretoConfigurado } = require('../utils/sesionToken');

const ROLES_PERMITIDOS = ['admin', 'gerente', 'jefe', 'cajero'];

exports.requerirPersonalPOS = async (req, res, next) => {
  try {
    if (!secretoConfigurado()) {
      console.error('🚨 [SESION] Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de entorno.');
      return res.status(500).json({ success: false, error: 'El servidor no tiene configurada la seguridad de sesión.' });
    }

    const cabecera = req.headers.authorization || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
    const datos = verificarToken(token);
    if (!datos) {
      return res.status(401).json({ success: false, codigo: 'SESION_REQUERIDA', error: 'Sesión requerida. Cierra sesión y vuelve a entrar.' });
    }

    // Anti-cruce: el token debe pertenecer a la misma empresa que resolvió el tenant
    if (Number(datos.eid) !== Number(req.empresa_id)) {
      return res.status(403).json({ success: false, error: 'Sesión de otra empresa.' });
    }

    const r = await db.query(
      'SELECT id, nombre, rol, empresa_id FROM usuarios WHERE id = $1 AND empresa_id = $2',
      [datos.uid, req.empresa_id]
    );
    const usuario = r.rows[0];
    if (!usuario) {
      return res.status(401).json({ success: false, codigo: 'SESION_REQUERIDA', error: 'La sesión ya no es válida.' });
    }
    if (!ROLES_PERMITIDOS.includes(usuario.rol)) {
      return res.status(403).json({ success: false, error: 'Tu rol no tiene acceso a esta función.' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('🚨 Error en requerirPersonalPOS:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo validar la sesión.' });
  }
};