// BackEnd/middlewares/protegerCreacionPedido.js
// =========================================================================
// 🔐 Guard de POST /pedidos (se usa DESPUÉS de resolveTenant).
//  - Personal con sesión vigente de ESTA empresa: pasa tal cual (Caja, etc.).
//  - Público (Kiosco/Web/QR/Tótem): el estado solo puede ser 'Pendiente' (o la
//    cola offline), y canjear puntos exige X-Canje-Token (NIP/huella) del mismo cliente.
// WhatsApp no pasa por aquí (llama directo al controlador).
// =========================================================================
const { verificarToken } = require('../utils/sesionToken');
const { verificarTokenCanje } = require('../utils/sesionTokenCliente');

const ESTADOS_PUBLICOS = ['Pendiente', 'Sincronizado Offline'];

exports.protegerCreacionPedido = (req, res, next) => {
  const empresaId = Number(req.empresa_id);

  const cabecera = String(req.headers.authorization || '');
  const datos = cabecera.startsWith('Bearer ') ? verificarToken(cabecera.slice(7).trim()) : null;
  if (datos && Number(datos.eid) === empresaId) return next();

  const body = req.body || {};
  if (body.estado_preparacion && !ESTADOS_PUBLICOS.includes(body.estado_preparacion)) {
    console.warn(`⚠️ [pedidos] solicitud sin sesión intentó crear pedido en estado "${body.estado_preparacion}" (empresa ${empresaId}). Se fuerza a Pendiente.`);
    body.estado_preparacion = 'Pendiente';
  }

  if ((Number(body.descuento_puntos) || 0) > 0) {
    const t = verificarTokenCanje(String(req.headers['x-canje-token'] || ''));
    const clienteId = Number.parseInt(body.cliente_id, 10);
    if (!t || t.eid !== empresaId || !Number.isInteger(clienteId) || t.cid !== clienteId) {
      return res.status(403).json({ error: 'Para canjear puntos confirma tu NIP o tu huella e inténtalo de nuevo.' });
    }
  }
  next();
};