const db = require('../config/db');

exports.obtenerUsuarios = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM usuarios ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// ==========================================
// OBTENER SOLO AYUDANTES DE COCINA
// ==========================================
exports.obtenerAyudantesCocina = async (req, res) => {
  try {
    const result = await db.query("SELECT id, nombre, permisos FROM usuarios WHERE rol = 'ayudante_cocina' ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener ayudantes:", error);
    res.status(500).json({ error: 'Error al obtener ayudantes de cocina' });
  }
};

exports.crearUsuario = async (req, res) => {
  const { nombre, usuario, password, rol, permisos, telefono } = req.body;
  
  // 🛡️ BLINDAJE: Si viene vacío o con espacios, guardamos NULL para evitar el error syntax de BIGINT
  const telefonoFinal = telefono && String(telefono).trim() !== '' ? telefono : null;

  try {
    const result = await db.query(
      'INSERT INTO usuarios (nombre, usuario, password, rol, permisos, telefono) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, usuario, password, rol, JSON.stringify(permisos || {}), telefonoFinal]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    // Código 23505: Violación de restricción única (Unique Constraint)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de teléfono o nombre de usuario ya está registrado.' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Actualizar Usuario
exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, password, rol, permisos, telefono } = req.body;
  
  // 🛡️ BLINDAJE: Sanitización del teléfono
  const telefonoFinal = telefono && String(telefono).trim() !== '' ? telefono : null;
  
  try {
    let result;
    if (password && password.trim() !== '') {
      result = await db.query(
        'UPDATE usuarios SET nombre = $1, usuario = $2, password = $3, rol = $4, permisos = $5, telefono = $6 WHERE id = $7 RETURNING *',
        [nombre, usuario, password, rol, JSON.stringify(permisos || {}), telefonoFinal, id]
      );
    } else {
      result = await db.query(
        'UPDATE usuarios SET nombre = $1, usuario = $2, rol = $3, permisos = $4, telefono = $5 WHERE id = $6 RETURNING *',
        [nombre, usuario, rol, JSON.stringify(permisos || {}), telefonoFinal, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de teléfono o nombre de usuario ya está en uso.' });
    }
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
// REPORTES DE RENDIMIENTO Y ASISTENCIA
// ==========================================
exports.obtenerReporteRendimiento = async (req, res) => {
  const { periodo = 'dia', fecha = new Date().toISOString().split('T')[0], usuario_id = 'Todos' } = req.query;

  let queryFiltroFechaAsistencia = '';
  let queryFiltroFechaPedido = '';
  let queryUsuarioAsistencia = '';
  let queryUsuarioPedido = '';
  
  let params = [fecha];
  let paramIndex = 2;

  if (periodo === 'dia') {
    queryFiltroFechaAsistencia = 'a.fecha::DATE = $1::DATE';
    queryFiltroFechaPedido = 'p.fecha_creacion::DATE = $1::DATE';
  } else if (periodo === 'semana') {
    queryFiltroFechaAsistencia = "DATE_TRUNC('week', a.fecha::TIMESTAMP) = DATE_TRUNC('week', $1::TIMESTAMP)";
    queryFiltroFechaPedido = "DATE_TRUNC('week', p.fecha_creacion::TIMESTAMP) = DATE_TRUNC('week', $1::TIMESTAMP)";
  } else if (periodo === 'mes') {
    queryFiltroFechaAsistencia = "DATE_TRUNC('month', a.fecha::TIMESTAMP) = DATE_TRUNC('month', $1::TIMESTAMP)";
    queryFiltroFechaPedido = "DATE_TRUNC('month', p.fecha_creacion::TIMESTAMP) = DATE_TRUNC('month', $1::TIMESTAMP)";
  } else if (periodo === 'anio') {
    queryFiltroFechaAsistencia = "DATE_TRUNC('year', a.fecha::TIMESTAMP) = DATE_TRUNC('year', $1::TIMESTAMP)";
    queryFiltroFechaPedido = "DATE_TRUNC('year', p.fecha_creacion::TIMESTAMP) = DATE_TRUNC('year', $1::TIMESTAMP)";
  }

  if (usuario_id && usuario_id !== 'Todos') {
    queryUsuarioAsistencia = ` AND a.usuario_id = $${paramIndex}`;
    queryUsuarioPedido = ` AND p.chef_id = $${paramIndex}`;
    params.push(usuario_id);
    paramIndex++;
  }

  try {
    const asistenciasHoyRes = await db.query(`
      SELECT u.nombre, u.rol, a.hora_entrada, a.hora_salida, a.fecha
      FROM registro_asistencias a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.fecha = CURRENT_DATE ${queryUsuarioAsistencia.replace(`$${paramIndex-1}`, usuario_id !== 'Todos' ? usuario_id : '')}
      ORDER BY a.hora_entrada DESC
    `);

    const historialRes = await db.query(`
      SELECT u.nombre, u.rol, a.hora_entrada, a.hora_salida, a.fecha,
             ROUND((EXTRACT(EPOCH FROM (COALESCE(a.hora_salida, CURRENT_TIMESTAMP) - a.hora_entrada))/3600)::numeric, 2) AS horas_trabajadas
      FROM registro_asistencias a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE ${queryFiltroFechaAsistencia} ${queryUsuarioAsistencia}
      ORDER BY a.fecha DESC, a.hora_entrada DESC
    `, params);

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
        AND ${queryFiltroFechaPedido}
        ${queryUsuarioPedido}
      GROUP BY u.nombre
      ORDER BY pedidos_completados DESC
    `, params);

    res.json({
      asistenciasHoy: asistenciasHoyRes.rows,         
      historialAsistencias: historialRes.rows,        
      rendimientoCocina: rendimientoRes.rows          
    });
  } catch (error) {
    console.error("Error al obtener reportes de rendimiento:", error);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
};