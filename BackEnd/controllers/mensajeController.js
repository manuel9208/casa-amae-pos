const db = require('../config/db');
const webpush = require('web-push');

exports.enviarMensaje = async (req, res) => {
  const { empresa_id } = req;
  const { admin_id, empleado_id, mensaje } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO mensajes_empleados (admin_id, empleado_id, mensaje, empresa_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [admin_id, empleado_id, mensaje, empresa_id]
    );

    // Enviar Notificación Push al Empleado
    try {
      const subs = await db.query("SELECT suscripcion FROM suscripciones_push WHERE usuario_id = $1 AND empresa_id = $2", [empleado_id, empresa_id]);
      const payload = JSON.stringify({ title: 'NUEVO ENCARGO 📋', body: 'Tienes un nuevo mensaje del administrador. Revisa tu portal.' });  
      for(let row of subs.rows) {
        const sub = typeof row.suscripcion === 'string' ? JSON.parse(row.suscripcion) : row.suscripcion;
        await webpush.sendNotification(sub, payload).catch(() => {});
      }
    } catch(e) { console.error("Error push mensaje:", e.message); }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
};

exports.obtenerMensajesAdmin = async (req, res) => {
  const { empresa_id } = req;
  try {
    const result = await db.query(`
      SELECT m.*, u.nombre as empleado_nombre, u.rol 
      FROM mensajes_empleados m 
      JOIN usuarios u ON m.empleado_id = u.id AND u.empresa_id = m.empresa_id
      WHERE m.empresa_id = $1
      ORDER BY m.fecha_envio DESC LIMIT 100
    `, [empresa_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

exports.obtenerMensajesEmpleado = async (req, res) => {
  const { empresa_id } = req;
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM mensajes_empleados WHERE empleado_id = $1 AND empresa_id = $2 ORDER BY fecha_envio DESC', [id, empresa_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

exports.marcarComoLeido = async (req, res) => {
  const { empresa_id } = req;
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE mensajes_empleados SET leido = true, fecha_lectura = CURRENT_TIMESTAMP WHERE id = $1 AND empresa_id = $2 RETURNING *',
      [id, empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado o no pertenece a tu negocio.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado del mensaje' });
  }
};

exports.eliminarMensaje = async (req, res) => {
  const { empresa_id } = req;
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM mensajes_empleados WHERE id = $1 AND empresa_id = $2 RETURNING id', [id, empresa_id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado o no pertenece a tu negocio.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
};