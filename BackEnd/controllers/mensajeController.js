const db = require('../config/db');
const webpush = require('web-push');

exports.enviarMensaje = async (req, res) => {
  const { admin_id, empleado_id, mensaje } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO mensajes_empleados (admin_id, empleado_id, mensaje) VALUES ($1, $2, $3) RETURNING *',
      [admin_id, empleado_id, mensaje]
    );

    // Enviar Notificación Push al Empleado
    try {
      const subs = await db.query("SELECT suscripcion FROM suscripciones_push WHERE usuario_id = $1", [empleado_id]);
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
  try {
    const result = await db.query(`
      SELECT m.*, u.nombre as empleado_nombre, u.rol 
      FROM mensajes_empleados m 
      JOIN usuarios u ON m.empleado_id = u.id 
      ORDER BY m.fecha_envio DESC LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

exports.obtenerMensajesEmpleado = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM mensajes_empleados WHERE empleado_id = $1 ORDER BY fecha_envio DESC', [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

exports.marcarComoLeido = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE mensajes_empleados SET leido = true, fecha_lectura = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado del mensaje' });
  }
};

exports.eliminarMensaje = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM mensajes_empleados WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
};