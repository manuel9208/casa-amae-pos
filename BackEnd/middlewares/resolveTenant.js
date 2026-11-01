// BackEnd/middlewares/resolveTenant.js
// =========================================================================
// 🏢 MIDDLEWARE DE RESOLUCIÓN DE TENANT (EMPRESA)
// -------------------------------------------------------------------------
// Determina a qué empresa pertenece cada petición, usando 2 estrategias
// según el tipo de ruta:
//
//   1) Rutas YA autenticadas (req.usuario existe, viene del JWT/sesión)
//      -> usa el empresa_id que ya trae el usuario logueado.
//
//   2) Rutas públicas/sin sesión aún (login, identificar, Kiosco)
//      -> usa el header "X-Empresa-Slug" que cada frontend (desplegado
//      en Vercel, configurado con su propia variable de entorno
//      REACT_APP_EMPRESA_SLUG) manda en cada petición.
//
// Deja el resultado en req.empresa_id, disponible para todos los
// controladores que se ejecuten después en la cadena de middlewares.
// =========================================================================

const db = require('../config/db');

exports.resolveTenant = async (req, res, next) => {
    try {
        // Caso 1: ya hay un usuario autenticado en esta petición (login previo)
        if (req.usuario && req.usuario.empresa_id) {
            req.empresa_id = req.usuario.empresa_id;
            return next();
        }

        // Caso 2: resolver por el header que manda el frontend
        const slugHeader = req.headers['x-empresa-slug'];

        if (!slugHeader) {
            return res.status(400).json({
                error: 'No se pudo determinar la empresa de la petición. Falta el header X-Empresa-Slug.'
            });
        }

        const result = await db.query(
            'SELECT id, nombre, activo FROM empresas WHERE slug = $1',
            [String(slugHeader).trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Empresa no reconocida.' });
        }

        if (!result.rows[0].activo) {
            return res.status(403).json({ error: 'Esta empresa se encuentra desactivada temporalmente.' });
        }

        req.empresa_id = result.rows[0].id;
        req.empresa_nombre = result.rows[0].nombre;
        return next();

    } catch (error) {
        console.error('🚨 Error en resolveTenant:', error);
        res.status(500).json({ error: 'Error interno al resolver la empresa de la petición.' });
    }
};