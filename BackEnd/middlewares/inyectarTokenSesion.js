// BackEnd/middlewares/inyectarTokenSesion.js
// =========================================================================
// 🔐 Agrega un token de sesión firmado a la respuesta de los logins de
// EMPLEADOS (/login y huella), sin modificar sus controladores.
// Los clientes (tipo 'cliente') NUNCA reciben token.
// =========================================================================
const { emitirToken } = require('../utils/sesionToken');

exports.inyectarTokenSesion = (req, res, next) => {
  const jsonOriginal = res.json.bind(res);
  res.json = (cuerpo) => {
    try {
      if (cuerpo && res.statusCode < 400) {
        const u = cuerpo.usuario || (cuerpo.tipo === 'empleado' ? cuerpo.data : null);
        if (u && u.id) {
          const token = emitirToken({ id: u.id, empresa_id: u.empresa_id || req.empresa_id });
          if (token) cuerpo = { ...cuerpo, token };
        }
      }
    } catch (e) { /* nunca debe romper el login */ }
    return jsonOriginal(cuerpo);
  };
  next();
};