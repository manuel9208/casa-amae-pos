const db = require('../config/db');  

exports.obtenerUsuarios = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM usuarios ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};  

exports.obtenerAyudantesCocina = async (req, res) => {
  try {
    const result = await db.query("SELECT id, nombre, permisos FROM usuarios WHERE rol = 'ayudante_cocina' ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ayudantes de cocina' });
  }
};  

exports.crearUsuario = async (req, res) => {
  const { nombre, usuario, password, rol, permisos, telefono, pin } = req.body;  
  const telefonoFinal = telefono && String(telefono).trim() !== '' ? telefono : null;
  const pinFinal = pin && String(pin).trim() !== '' ? pin : null;  
  try {
    if (pinFinal) {
      const pinExistente = await db.query('SELECT id FROM usuarios WHERE pin = $1', [pinFinal]);
      if (pinExistente.rows.length > 0) {
        return res.status(400).json({ error: 'Ese PIN de seguridad ya está en uso por otro empleado. Elige uno distinto.' });
      }
    }  
    const result = await db.query(
      'INSERT INTO usuarios (nombre, usuario, password, rol, permisos, telefono, pin) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nombre, usuario, password, rol, JSON.stringify(permisos || {}), telefonoFinal, pinFinal]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El número de teléfono o nombre de usuario ya está registrado.' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};  

exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, password, rol, permisos, telefono, pin } = req.body;  
  const telefonoFinal = telefono && String(telefono).trim() !== '' ? telefono : null;
  const pinFinal = pin && String(pin).trim() !== '' ? pin : null;  
  try {
    if (pinFinal) {
      const pinExistente = await db.query('SELECT id FROM usuarios WHERE pin = $1 AND id != $2', [pinFinal, id]);
      if (pinExistente.rows.length > 0) {
        return res.status(400).json({ error: 'Ese PIN de seguridad ya está en uso por otro empleado. Elige uno distinto.' });
      }
    }  
    let result;
    if (password && password.trim() !== '') {
      result = await db.query(
        'UPDATE usuarios SET nombre = $1, usuario = $2, password = $3, rol = $4, permisos = $5, telefono = $6, pin = $7 WHERE id = $8 RETURNING *',
        [nombre, usuario, password, rol, JSON.stringify(permisos || {}), telefonoFinal, pinFinal, id]
      );
    } else {
      result = await db.query(
        'UPDATE usuarios SET nombre = $1, usuario = $2, rol = $3, permisos = $4, telefono = $5, pin = $6 WHERE id = $7 RETURNING *',
        [nombre, usuario, rol, JSON.stringify(permisos || {}), telefonoFinal, pinFinal, id]
      );
    }  
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
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
  } catch (error) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
};  

// 👇 ACTUALIZADO: Ahora extrae también los datos del Histórico de Cortes
exports.obtenerReporteRendimiento = async (req, res) => {
  const { periodo = 'dia', fecha = new Date().toISOString().split('T')[0], usuario_id = 'Todos' } = req.query;  
  let queryFiltroFechaAsistencia = '';
  let queryFiltroFechaPedido = '';
  let queryFiltroFechaCorte = '';
  let queryUsuarioAsistencia = '';
  let queryUsuarioPedido = '';  
  let params = [fecha];
  let paramIndex = 2;  

  if (periodo === 'dia') {
    queryFiltroFechaAsistencia = 'a.fecha::DATE = $1::DATE';
    queryFiltroFechaPedido = 'p.fecha_creacion::DATE = $1::DATE';
    queryFiltroFechaCorte = 'fecha_corte::DATE = $1::DATE';
  } else if (periodo === 'semana') {
    queryFiltroFechaAsistencia = "DATE_TRUNC('week', a.fecha::TIMESTAMP) = DATE_TRUNC('week', $1::TIMESTAMP)";
    queryFiltroFechaPedido = "DATE_TRUNC('week', p.fecha_creacion::TIMESTAMP) = DATE_TRUNC('week', $1::TIMESTAMP)";
    queryFiltroFechaCorte = "DATE_TRUNC('week', fecha_corte::TIMESTAMP) = DATE_TRUNC('week', $1::TIMESTAMP)";
  } else if (periodo === 'mes') {
    queryFiltroFechaAsistencia = "DATE_TRUNC('month', a.fecha::TIMESTAMP) = DATE_TRUNC('month', $1::TIMESTAMP)";
    queryFiltroFechaPedido = "DATE_TRUNC('month', p.fecha_creacion::TIMESTAMP) = DATE_TRUNC('month', $1::TIMESTAMP)";
    queryFiltroFechaCorte = "DATE_TRUNC('month', fecha_corte::TIMESTAMP) = DATE_TRUNC('month', $1::TIMESTAMP)";
  } else if (periodo === 'anio') {
    queryFiltroFechaAsistencia = "DATE_TRUNC('year', a.fecha::TIMESTAMP) = DATE_TRUNC('year', $1::TIMESTAMP)";
    queryFiltroFechaPedido = "DATE_TRUNC('year', p.fecha_creacion::TIMESTAMP) = DATE_TRUNC('year', $1::TIMESTAMP)";
    queryFiltroFechaCorte = "DATE_TRUNC('year', fecha_corte::TIMESTAMP) = DATE_TRUNC('year', $1::TIMESTAMP)";
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

    // 👇 NUEVO: Consultamos la tabla de cortes históricos
    const cortesRes = await db.query(`
      SELECT id, fecha_corte, datos_corte, fecha_creacion
      FROM historico_nominas
      WHERE ${queryFiltroFechaCorte}
      ORDER BY fecha_creacion DESC
    `, [fecha]);

    res.json({ 
      asistenciasHoy: asistenciasHoyRes.rows, 
      historialAsistencias: historialRes.rows, 
      rendimientoCocina: rendimientoRes.rows,
      cortesNomina: cortesRes.rows // 👈 Añadido al paquete de datos devuelto al front
    });
  } catch (error) { res.status(500).json({ error: 'Error al obtener reportes' }); }
};

exports.actualizarHorario = async (req, res) => {
  const { id } = req.params;
  const { horario_semanal } = req.body;
  try {
    const result = await db.query(
      'UPDATE usuarios SET horario_semanal = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(horario_semanal || {}), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el horario' });
  }
};

exports.guardarCorteNomina = async (req, res) => {
  const { datos_corte, usuario_admin_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO historico_nominas (usuario_admin_id, datos_corte) VALUES ($1, $2) RETURNING *',
      [usuario_admin_id || null, JSON.stringify(datos_corte)]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar el corte de nómina' });
  }
};

exports.registrarAsistencia = async (req, res) => {
  const { pin, tipo } = req.body; // tipo = 'Entrada' o 'Salida'

  if (!pin || pin.length !== 4) {
    return res.status(400).json({ error: 'PIN inválido.' });
  }

  try {
    const usuarioRes = await db.query('SELECT id, nombre, rol FROM usuarios WHERE pin = $1', [pin]);
    
    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ error: 'PIN incorrecto o no registrado.' });
    }

    const usuario = usuarioRes.rows[0];

    // Buscamos si ya existe algún turno HOY para este empleado
    const turnoHoy = await db.query(
      'SELECT id, hora_entrada, hora_salida FROM registro_asistencias WHERE usuario_id = $1 AND fecha = CURRENT_DATE',
      [usuario.id]
    );

    if (tipo === 'Entrada') {
      if (turnoHoy.rows.length === 0) {
        // No hay checadas previas hoy. Registramos la primera (y definitiva) hora de entrada.
        await db.query(
          'INSERT INTO registro_asistencias (usuario_id, hora_entrada, fecha) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_DATE)',
          [usuario.id]
        );
        return res.json({ success: true, mensaje: `¡Entrada registrada con éxito para ${usuario.nombre}!` });
      } else {
        // Ya tiene una entrada hoy. Se respeta la primera hora, no se crea un duplicado. Retornamos OK silencioso.
        return res.json({ success: true, mensaje: `¡Tu entrada ya estaba registrada, ${usuario.nombre}!` });
      }

    } else if (tipo === 'Salida') {
      if (turnoHoy.rows.length === 0) {
        // No puede salir si no tiene una fila de entrada hoy.
        return res.status(400).json({ error: `¡${usuario.nombre}, debes registrar tu entrada primero!` });
      } else {
        // Ya tiene una fila hoy. Actualizamos la salida con la hora actual. 
        // Si ya tenía salida previa de hace horas, se sobrescribirá a esta más tarde.
        await db.query(
          'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP WHERE id = $1',
          [turnoHoy.rows[0].id]
        );
        return res.json({ success: true, mensaje: `¡Salida registrada con éxito para ${usuario.nombre}!` });
      }
    }

  } catch (error) {
    console.error("Error en asistencia:", error);
    res.status(500).json({ error: 'Error al procesar la asistencia en el servidor.' });
  }
};