const db = require('../config/db');
const { metodoAsistenciaActivo, validarUbicacionServidor, asegurarColumnasUbicacion } = require('../utils/asistenciaHelper');

exports.obtenerUsuarios = async (req, res) => {
  try {
    // Ahora verificamos si ya tienen huella registrada
    const result = await db.query(`
      SELECT u.*,
      EXISTS(SELECT 1 FROM credenciales_biometricas c WHERE c.usuario_id = u.id) as tiene_huella
      FROM usuarios u ORDER BY id ASC
    `);
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

    const usuarioEditado = result.rows[0];

    // SOLUCIÓN TIEMPO REAL: Disparamos el evento a todos los dispositivos conectados
    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_actualizado', usuarioEditado);
    }

    res.json(usuarioEditado);
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

    // SOLUCIÓN TIEMPO REAL: Forzamos la expulsión si el usuario estaba activo
    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_eliminado', parseInt(id));
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
};

// NUEVA FUNCIÓN PARA PRESTACIONES
exports.actualizarPrestaciones = async (req, res) => {
  const { id } = req.params;
  const { prestaciones } = req.body;
  try {
    const result = await db.query(
      'UPDATE usuarios SET prestaciones = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(prestaciones || {}), id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar prestaciones' });
  }
};

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
      SELECT u.id as usuario_id, u.nombre, u.rol, a.hora_entrada, a.hora_salida, a.fecha,
      ROUND((EXTRACT(EPOCH FROM (COALESCE(a.hora_salida, CURRENT_TIMESTAMP) - a.hora_entrada))/3600)::numeric, 2) AS horas_trabajadas,
      a.lat_registro, a.lon_registro
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
      cortesNomina: cortesRes.rows
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

// =========================================================================
// 👇 FIX SEGURIDAD: Ahora recibe lat/lon y valida en el SERVIDOR (no solo en
// el navegador) que el empleado esté dentro de la geocerca/IP configurada,
// y respeta el interruptor 'portal' de configuracion_asistencia.tipo_registro.
// Antes: solo validaba pin/tipo, sin ubicación ni verificar si el método
// "Portal del Empleado" estaba realmente activado.
// =========================================================================
exports.registrarAsistencia = async (req, res) => {
  const { pin, tipo, lat, lon, dispositivo_id } = req.body;

  if (!pin || pin.length !== 4) {
    return res.status(400).json({ error: 'PIN inválido.' });
  }

  try {
    // 1. Verificar que el método "Portal del Empleado" esté habilitado en el panel
    const portalActivo = await metodoAsistenciaActivo('portal');
    if (!portalActivo) {
      return res.status(403).json({ error: 'El registro por Portal del Empleado no está habilitado por la administración.' });
    }

    // 2. Validar GPS/IP en el servidor (blindaje real, no solo confianza en el frontend)
    const validacion = await validarUbicacionServidor({ lat, lon, ip: req.ip });
    if (!validacion.success) {
      return res.status(403).json({ error: validacion.error });
    }

    // Aseguramos que existan las columnas de ubicación antes de intentar guardarlas
    await asegurarColumnasUbicacion();

    const usuarioRes = await db.query('SELECT id, nombre, rol FROM usuarios WHERE pin = $1', [pin]);

    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ error: 'PIN incorrecto o no registrado.' });
    }

    const usuario = usuarioRes.rows[0];

    // 👇 FIX: Candado Anti-Suplantación (Opción A - Bloqueo estricto)
    // Evita que un empleado use el teléfono VINCULADO a otro empleado para checar
    // asistencia con su propio PIN/huella (ej. Manuel usando el celular de Luis).
    if (dispositivo_id) {
      const vinculoRes = await db.query(
        'SELECT usuario_id FROM empleados_dispositivos WHERE dispositivo_id = $1',
        [dispositivo_id]
      );
      if (vinculoRes.rows.length > 0 && vinculoRes.rows[0].usuario_id !== usuario.id) {
        return res.status(403).json({
          error: 'Este dispositivo está vinculado a otro empleado. No puedes checar asistencia con una identidad distinta a la registrada en este equipo.'
        });
      }
    }

    // Buscamos si ya tiene un registro HOY
    const turnoHoy = await db.query(
      'SELECT id, hora_entrada, hora_salida FROM registro_asistencias WHERE usuario_id = $1 AND fecha = CURRENT_DATE',
      [usuario.id]
    );

    // Normalizamos lat/lon a número o null para guardarlos limpios en la BD
    const latGuardar = (lat !== undefined && lat !== null) ? Number(lat) : null;
    const lonGuardar = (lon !== undefined && lon !== null) ? Number(lon) : null;

    if (tipo === 'Entrada') {
      if (turnoHoy.rows.length === 0) {
        // REGLA 1: No existe, inserta la entrada
        await db.query(
          'INSERT INTO registro_asistencias (usuario_id, hora_entrada, fecha, lat_registro, lon_registro) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_DATE, $2, $3)',
          [usuario.id, latGuardar, lonGuardar]
        );
        return res.json({ success: true, mensaje: `¡Entrada registrada con éxito para ${usuario.nombre}!` });
      } else {
        // REGLA 1 (Excepción): Ya existe entrada, NO la actualizamos para conservar la más temprana
        return res.json({ success: true, mensaje: `¡Tu entrada ya estaba registrada, ${usuario.nombre}!` });
      }

    } else if (tipo === 'Salida') {
      if (turnoHoy.rows.length === 0) {
        // REGLA 2 (Excepción): No existe entrada previa, creamos el registro SOLO con salida
        await db.query(
          'INSERT INTO registro_asistencias (usuario_id, hora_salida, fecha, lat_registro, lon_registro) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_DATE, $2, $3)',
          [usuario.id, latGuardar, lonGuardar]
        );
        return res.json({ success: true, mensaje: `¡Salida registrada (sin entrada) para ${usuario.nombre}!` });
      } else {
        // REGLA 2: Actualiza salida normal (guardamos también la ubicación de la salida)
        await db.query(
          'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP, lat_registro = COALESCE(lat_registro, $2), lon_registro = COALESCE(lon_registro, $3) WHERE id = $1',
          [turnoHoy.rows[0].id, latGuardar, lonGuardar]
        );
        return res.json({ success: true, mensaje: `¡Salida registrada con éxito para ${usuario.nombre}!` });
      }
    }

  } catch (error) {
    console.error("Error en asistencia:", error);
    res.status(500).json({ error: 'Error al procesar la asistencia en el servidor.' });
  }
};

// =========================================================================
// 👇 FIX SEGURIDAD: CEREBRO DEL "TAP & GO" POR NFC
// Ahora respeta el interruptor 'nfc' de configuracion_asistencia.tipo_registro
// y valida GPS/IP en el servidor, igual que el Portal.
// Antes: aceptaba cualquier tap sin verificar si el método NFC estaba activo
// ni la ubicación del dispositivo.
// =========================================================================
exports.registrarAsistenciaNFC = async (req, res) => {
  const { nfc_uid, dispositivo_id, lat, lon } = req.body;

  if (!nfc_uid) {
    return res.status(400).json({ error: 'No se detectó el chip NFC.' });
  }

  try {
    // 1. Verificar que el método "NFC" esté habilitado en el panel
    const nfcActivo = await metodoAsistenciaActivo('nfc');
    if (!nfcActivo) {
      return res.status(403).json({ error: 'El registro por NFC no está habilitado por la administración.' });
    }

    // 2. Validar GPS/IP en el servidor
    const validacion = await validarUbicacionServidor({ lat, lon, ip: req.ip });
    if (!validacion.success) {
      return res.status(403).json({ error: validacion.error });
    }

    // 3. Soft Migration: Aseguramos que la columna exista en la BD para guardar las tarjetas
    await db.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nfc_uid VARCHAR(100) UNIQUE');
    await asegurarColumnasUbicacion();

    // 4. Buscamos al dueño de este Gafete/Pulsera NFC
    const usuarioRes = await db.query('SELECT id, nombre, rol FROM usuarios WHERE nfc_uid = $1', [nfc_uid]);

    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ error: 'Gafete no reconocido. Debe ser vinculado a un empleado primero.' });
    }

    const usuario = usuarioRes.rows[0];

    // 5. Regla de Oro: Buscamos si ya tiene un registro HOY
    const turnoHoy = await db.query(
      'SELECT id, hora_entrada, hora_salida FROM registro_asistencias WHERE usuario_id = $1 AND fecha = CURRENT_DATE',
      [usuario.id]
    );

    // Normalizamos lat/lon a número o null para guardarlos limpios en la BD
    const latGuardarNfc = (lat !== undefined && lat !== null) ? Number(lat) : null;
    const lonGuardarNfc = (lon !== undefined && lon !== null) ? Number(lon) : null;

    if (turnoHoy.rows.length === 0) {
      // PRIMER TAP DEL DÍA: Registra la Entrada
      await db.query(
        'INSERT INTO registro_asistencias (usuario_id, hora_entrada, fecha, lat_registro, lon_registro) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_DATE, $2, $3)',
        [usuario.id, latGuardarNfc, lonGuardarNfc]
      );
      return res.json({ success: true, mensaje: `¡Entrada registrada, ${usuario.nombre}! Bienvenido.` });
    } else {
      // SEGUNDO TAP (O POSTERIORES): Actualiza la Salida
      await db.query(
        'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP, lat_registro = COALESCE(lat_registro, $2), lon_registro = COALESCE(lon_registro, $3) WHERE id = $1',
        [turnoHoy.rows[0].id, latGuardarNfc, lonGuardarNfc]
      );
      return res.json({ success: true, mensaje: `¡Salida registrada, ${usuario.nombre}! Hasta pronto.` });
    }
  } catch (error) {
    console.error("Error en asistencia NFC:", error);
    res.status(500).json({ error: 'Error al procesar el gafete NFC en el servidor.' });
  }
};

// NUEVA FUNCIÓN: Obtener lista de empleados con tarjeta NFC vinculada
exports.obtenerNFCVinculados = async (req, res) => {
  try {
    await db.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nfc_uid VARCHAR(100) UNIQUE');
    const result = await db.query(`
      SELECT id AS usuario_id, nombre, rol, nfc_uid
      FROM usuarios
      WHERE nfc_uid IS NOT NULL AND nfc_uid != ''
      ORDER BY nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener NFCs vinculados:", error);
    res.status(500).json({ error: 'Error al consultar la lista de gafetes NFC.' });
  }
};

// NUEVA FUNCIÓN: Remover el vínculo NFC de un empleado
exports.desvincularGafeteNFC = async (req, res) => {
  const { id } = req.params; // id del usuario
  try {
    await db.query('UPDATE usuarios SET nfc_uid = NULL WHERE id = $1', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_actualizado', { id: parseInt(id) });
    }

    res.json({ success: true, message: 'Gafete NFC desvinculado correctamente.' });
  } catch (error) {
    console.error("Error al desvincular NFC:", error);
    res.status(500).json({ error: 'Error al desvincular el gafete NFC.' });
  }
};