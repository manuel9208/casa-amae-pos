// BackEnd/middlewares/requerirDuenoParaHuella.js
// =========================================================================
// 🔐 Guard del enrolamiento de huella (/huellas/generar-registro y /verificar-registro).
//  - usuario_id: solo ese mismo empleado, o admin/gerente/jefe de la misma empresa.
//  - cliente_id: solo ese mismo cliente (X-Cliente-Token) o personal del negocio.
// Se usa DESPUÉS de resolveTenant.
// =========================================================================
const db = require('../config/db');
const { verificarToken } = require('../utils/sesionToken');
const { verificarTokenCliente } = require('../utils/sesionTokenCliente');

const ROLES_ADMIN = ['admin', 'gerente', 'jefe'];
const ROLES_PERSONAL = ['admin', 'gerente', 'jefe', 'cajero'];

exports.requerirDuenoParaHuella = async (req, res, next) => {
  try {
    const empresaId = Number(req.empresa_id);
    const body = req.body || {};
    const usuarioId = Number.parseInt(body.usuario_id, 10);
    const clienteId = Number.parseInt(body.cliente_id, 10);

    const cabecera = String(req.headers.authorization || '');
    const datos = cabecera.startsWith('Bearer ') ? verificarToken(cabecera.slice(7).trim()) : null;
    const personal = datos && Number(datos.eid) === empresaId ? datos : null;

    if (Number.isInteger(usuarioId) && usuarioId > 0) {
      if (!personal) return res.status(401).json({ error: 'Sesión requerida. Cierra sesión y vuelve a entrar.' });
      if (Number(personal.uid) === usuarioId) return next();
      const r = await db.query('SELECT rol FROM usuarios WHERE id = $1 AND empresa_id = $2', [personal.uid, empresaId]);
      if (r.rows[0] && ROLES_ADMIN.includes(r.rows[0].rol)) return next();
      return res.status(403).json({ error: 'No puedes registrar huellas de otra cuenta.' });
    }

    if (Number.isInteger(clienteId) && clienteId > 0) {
      if (personal) {
        const r = await db.query('SELECT rol FROM usuarios WHERE id = $1 AND empresa_id = $2', [personal.uid, empresaId]);
        if (r.rows[0] && ROLES_PERSONAL.includes(r.rows[0].rol)) return next();
      }
      const t = verificarTokenCliente(String(req.headers['x-cliente-token'] || ''));
      if (t && t.eid === empresaId && t.cid === clienteId) return next();
      return res.status(401).json({ error: 'Vuelve a identificarte para registrar tu huella.' });
    }

    return res.status(400).json({ error: 'No se recibió ID válido.' });
  } catch (error) {
    console.error('🚨 Error en requerirDuenoParaHuella:', error.message);
    res.status(500).json({ error: 'No se pudo validar la sesión.' });
  }
};