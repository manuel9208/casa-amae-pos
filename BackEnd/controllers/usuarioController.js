const db = require('../config/db');

exports.obtenerUsuarios = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM usuarios ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.crearUsuario = async (req, res) => {
  const { nombre, usuario, password, rol, permisos, telefono } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, usuario, password, rol, permisos, telefono) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, usuario, password, rol, JSON.stringify(permisos || {}), telefono]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Actualizar Usuario
exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, password, rol, permisos, telefono } = req.body;
  
  try {
    let result;
    // Si el frontend envió una nueva contraseña, actualizamos TODO incluyendo la contraseña
    if (password && password.trim() !== '') {
      result = await db.query(
        'UPDATE usuarios SET nombre = $1, usuario = $2, password = $3, rol = $4, permisos = $5, telefono = $6 WHERE id = $7 RETURNING *',
        [nombre, usuario, password, rol, JSON.stringify(permisos || {}), telefono, id]
      );
    } else {
      // Si no enviaron contraseña, actualizamos todo lo demás y dejamos la contraseña intacta
      result = await db.query(
        'UPDATE usuarios SET nombre = $1, usuario = $2, rol = $3, permisos = $4, telefono = $5 WHERE id = $6 RETURNING *',
        [nombre, usuario, rol, JSON.stringify(permisos || {}), telefono, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

exports.eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

// ==========================================
// NUEVA FUNCIÓN: REPORTES DE RENDIMIENTO Y ASISTENCIA
// ==========================================
exports.obtenerReporteRendimiento = async (req, res) => {
  try {
    // 1. Obtener las asistencias del día actual
    const asistenciasRes = await db.query(`
      SELECT u.nombre, u.rol, a.hora_entrada, a.hora_salida, a.fecha
      FROM registro_asistencias a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.fecha = CURRENT_DATE
      ORDER BY a.hora_entrada DESC
    `);

    // 2. Calcular rendimiento de cocina del día actual
    // Convierte la diferencia de timestamps a segundos (EPOCH), luego a minutos y saca el promedio
    const rendimientoRes = await db.query(`
      SELECT 
        u.nombre AS chef, 
        COUNT(p.id) AS pedidos_completados,
        ROUND(AVG(EXTRACT(EPOCH FROM (p.tiempo_listo - p.tiempo_inicio_preparacion))/60)::numeric, 2) AS tiempo_promedio_minutos
      FROM pedidos p
      JOIN usuarios u ON p.chef_id = u.id
      WHERE (p.estado_preparacion = 'Listo' OR p.estado_preparacion = 'Entregado')
        AND p.tiempo_inicio_preparacion IS NOT NULL
        AND p.tiempo_listo IS NOT NULL
        AND DATE(p.fecha_creacion) = CURRENT_DATE
      GROUP BY u.nombre
      ORDER BY pedidos_completados DESC
    `);

    res.json({
      asistencias: asistenciasRes.rows,
      rendimientoCocina: rendimientoRes.rows
    });
  } catch (error) {
    console.error("Error al obtener reportes de rendimiento:", error);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
};