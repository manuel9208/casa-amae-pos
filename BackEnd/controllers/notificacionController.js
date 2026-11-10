// BackEnd/controllers/notificacionController.js
const db = require('../config/db');

exports.guardarSuscripcion = async (req, res) => {
  const { empresa_id } = req; // 🔒 TENANT: inyectado por resolveTenant.js en api.js
  const { suscripcion, usuario_id, cliente_id } = req.body;

  if (!suscripcion) {
    return res.status(400).json({ error: 'La suscripción es requerida.' });
  }

  try {
    // Verificamos si esta suscripción ya existe para no duplicar
    const endpoint = suscripcion.endpoint;
    const existe = await db.query(
      "SELECT id FROM suscripciones_push WHERE suscripcion->>'endpoint' = $1 AND empresa_id = $2",
      [endpoint, empresa_id]
    );

    if (existe.rows.length === 0) {
      await db.query(
        `INSERT INTO suscripciones_push (usuario_id, cliente_id, suscripcion, empresa_id) 
         VALUES ($1, $2, $3, $4)`,
        [usuario_id || null, cliente_id || null, JSON.stringify(suscripcion), empresa_id]
      );
    }

    res.status(201).json({ message: 'Suscripción guardada exitosamente.' });
  } catch (error) {
    console.error("Error al guardar suscripción push:", error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};