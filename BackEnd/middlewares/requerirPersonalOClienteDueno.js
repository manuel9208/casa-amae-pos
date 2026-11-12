// BackEnd/middlewares/requerirPersonalOClienteDueno.js
// =========================================================================
// 🔐 Permite el paso a:
//   1) Personal con sesión vigente de ESTA empresa -> delega TODO en requerirPersonalPOS (DRY).
//   2) El propio cliente: X-Cliente-Token válido, de esta empresa, con cid == id solicitado.
// Cualquier otro caso termina en el 401/403 de requerirPersonalPOS.
// Para el cliente puede quitar campos del body (ej. puntos, nip) y marca req.actorCliente.
// El personal se evalúa PRIMERO para que un token de cliente "olvidado" en la tablet
// nunca le recorte campos a un cajero que edita al mismo cliente.
// Se usa DESPUÉS de resolveTenant.
// =========================================================================
const { requerirPersonalPOS } = require('./requerirPersonalPOS');
const { verificarToken } = require('../utils/sesionToken');
const { verificarTokenCliente } = require('../utils/sesionTokenCliente');

exports.requerirPersonalOClienteDueno = ({ origen = 'params', campo = 'id', camposProhibidosCliente = [] } = {}) => (req, res, next) => {
  const empresaId = Number(req.empresa_id);

  const cabecera = String(req.headers.authorization || '');
  const datosPersonal = cabecera.startsWith('Bearer ') ? verificarToken(cabecera.slice(7).trim()) : null;
  if (datosPersonal && Number(datosPersonal.eid) === empresaId) return requerirPersonalPOS(req, res, next);

  const t = verificarTokenCliente(String(req.headers['x-cliente-token'] || ''));
  const fuente = origen === 'body' ? (req.body || {}) : (req.params || {});
  const idSolicitado = Number.parseInt(fuente[campo], 10);
  if (t && t.eid === empresaId && Number.isInteger(idSolicitado) && t.cid === idSolicitado) {
    camposProhibidosCliente.forEach(c => { if (req.body) delete req.body[c]; });
    req.actorCliente = { id: t.cid, empresa_id: t.eid };
    return next();
  }

  return requerirPersonalPOS(req, res, next);
};