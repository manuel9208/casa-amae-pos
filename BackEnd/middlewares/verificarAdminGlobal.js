// BackEnd/middlewares/verificarAdminGlobal.js
// =========================================================================
// 🛡️ GUARDIA EXCLUSIVA PARA RUTAS DE SÚPER-ADMIN GLOBAL (monetización)
// -------------------------------------------------------------------------
// El sistema actual no mantiene sesión/JWT server-side en cada petición
// (apiFetch.js solo agrega X-Empresa-Slug). Por eso, para las rutas que
// controlan monetización real (quién paga Lottie/Video del Kiosco), se usa
// una llave secreta fija conocida SOLO por el súper-admin global, guardada
// como variable de entorno en el backend — nunca expuesta en el frontend.
//
// Como el sistema es MULTI-TENANT con UN SOLO backend para todas las
// marcas blancas, esta misma llave sirve para administrar los permisos de
// CUALQUIER empresa dada de alta, sin importar su slug.
// =========================================================================

exports.verificarAdminGlobal = (req, res, next) => {
  const llaveRecibida = req.headers['x-superadmin-key'];

  if (!process.env.SUPERADMIN_SECRET_KEY) {
    console.error('🚨 Falta configurar SUPERADMIN_SECRET_KEY en las variables de entorno del servidor.');
    return res.status(500).json({ error: 'El servidor no tiene configurada la seguridad de súper-admin.' });
  }

  if (!llaveRecibida || llaveRecibida !== process.env.SUPERADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Acceso restringido: esta acción solo puede realizarla el administrador global del sistema.' });
  }

  next();
};