// BackEnd/middlewares/inyectarTokenCliente.js
// =========================================================================
// 🔐 Agrega `token_cliente` a la respuesta cuando quien se identifica es un CLIENTE
// (/identificar, /clientes/registro, /huellas/verificar-login). No toca los controladores.
// Los empleados no reciben este token (tienen el suyo vía inyectarTokenSesion).
// =========================================================================
const { emitirTokenCliente } = require('../utils/sesionTokenCliente');

exports.inyectarTokenCliente = (req, res, next) => {
  const jsonOriginal = res.json.bind(res);
  res.json = (cuerpo) => {
    try {
      if (cuerpo && res.statusCode < 400) {
        const cliente = cuerpo.tipo === 'cliente' ? cuerpo.data : (!cuerpo.tipo ? cuerpo.cliente : null);
        if (cliente && cliente.id) {
          const token = emitirTokenCliente({ id: cliente.id, empresa_id: req.empresa_id });
          if (token) cuerpo = { ...cuerpo, token_cliente: token };
        }
      }
    } catch (e) { /* nunca debe romper el login */ }
    return jsonOriginal(cuerpo);
  };
  next();
};