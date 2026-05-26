const db = require('../config/db');

exports.guardarSuscripcion = async (req, res) => {
  const { suscripcion, usuario_id, cliente_id } = req.body;

  if (!suscripcion) {
    return res.status(400).json({ error: 'La suscripción es requerida.' });
  }

  try {
    // Verificamos si esta suscripción ya existe para no duplicar
    const endpoint = suscripcion.endpoint;
    const existe = await db.query(
      "SELECT id FROM suscripciones_push WHERE suscripcion->>'endpoint' = $1",
      [endpoint]
    );

    if (existe.rows.length === 0) {
      await db.query(
        `INSERT INTO suscripciones_push (usuario_id, cliente_id, suscripcion) 
         VALUES ($1, $2, $3)`,
        [usuario_id || null, cliente_id || null, JSON.stringify(suscripcion)]
      );
    }

    res.status(201).json({ message: 'Suscripción guardada exitosamente.' });
  } catch (error) {
    console.error("Error al guardar suscripción push:", error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};