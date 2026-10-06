const db = require('../config/db');
const { metodoAsistenciaActivo, validarUbicacionServidor, asegurarColumnasUbicacion } = require('../utils/asistenciaHelper');
const { validarAccesoMDM } = require('../utils/mdmValidator');

exports.identificar = async (req, res) => {
  const { telefono } = req.body;
  try {
    const empleado = await db.query('SELECT * FROM usuarios WHERE telefono = $1', [telefono]);
    if (empleado.rows.length > 0) return res.json({ tipo: 'empleado', data: empleado.rows[0] });

    const cliente = await db.query(`
      SELECT c.*,
      EXISTS(SELECT 1 FROM credenciales_biometricas cb WHERE cb.cliente_id = c.id) as tiene_huella
      FROM clientes c WHERE telefono = $1
    `, [telefono]);

    if (cliente.rows.length > 0) return res.json({ tipo: 'cliente', data: cliente.rows[0] });

    return res.json({ tipo: 'nuevo' });
  } catch (error) {
    res.status(500).json({ error: 'Error al identificar' });
  }
};

exports.login = async (req, res) => {
  const { usuario, password, dispositivo_id, lat, lon } = req.body;
  try {
    const result = await db.query('SELECT * FROM usuarios WHERE usuario = $1 AND password = $2', [usuario, password]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // BLOQUEO MDM (Equipo Oficial siempre manda; Rol Restringido ya no bloquea
      // login, solo limita pantallas cuando el equipo es foráneo). Lógica
      // centralizada en mdmValidator.js para no duplicarla con huellasController.js.
      let mdmInfo = { bloqueadoTotal: false, pantallasPermitidas: 'todas' };
      try {
        mdmInfo = await validarAccesoMDM(user, dispositivo_id);
        if (mdmInfo.bloqueadoTotal) {
          return res.status(403).json({ error: mdmInfo.motivoBloqueo });
        }
      } catch(e) { console.error("Error en validación MDM", e); }

      const ahora = new Date();
      const hace8Horas = new Date(ahora.getTime() - (8 * 60 * 60 * 1000));

      let devices = [];
      if (user.ultimo_acceso && new Date(user.ultimo_acceso) > hace8Horas) {
        devices = (user.dispositivo_id || '').split(',').filter(Boolean);
      }

      if (!devices.includes(dispositivo_id)) {
        if (devices.length >= 2) {
          return res.status(403).json({ error: 'Esta cuenta ya está abierta en 2 equipos simultáneamente. Cierra la sesión en alguno de ellos primero.' });
        }
        devices.push(dispositivo_id);
      }

      const es_secundaria = devices.indexOf(dispositivo_id) > 0;

      await db.query(
        'UPDATE usuarios SET dispositivo_id = $1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $2',
        [devices.join(','), user.id]
      );

      // 👇 FIX SEGURIDAD: El registro de asistencia por Login ahora también valida
      // GPS/IP en el servidor, igual que el Portal del Empleado. IMPORTANTE: el LOGIN
      // en sí NUNCA se bloquea por ubicación (el empleado debe poder trabajar en
      // Caja/Cocina/Admin sin importar dónde esté) — solo se omite el REGISTRO DE
      // ASISTENCIA si la ubicación no es válida, avisando al empleado sin frenarlo.
      const isLoginActivo = await metodoAsistenciaActivo('login');
      let avisoAsistencia = null;

      if (isLoginActivo && !es_secundaria) {
        const validacionUbicacion = await validarUbicacionServidor({ lat, lon, ip: req.ip });

        if (validacionUbicacion.success) {
          await asegurarColumnasUbicacion();
          const latGuardar = (lat !== undefined && lat !== null) ? Number(lat) : null;
          const lonGuardar = (lon !== undefined && lon !== null) ? Number(lon) : null;

          const turnoAbierto = await db.query(
            'SELECT id FROM registro_asistencias WHERE usuario_id = $1 AND hora_salida IS NULL AND fecha = CURRENT_DATE',
            [user.id]
          );
          if (turnoAbierto.rows.length === 0) {
            await db.query(
              'INSERT INTO registro_asistencias (usuario_id, fecha, hora_entrada, lat_registro, lon_registro) VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, $2, $3)',
              [user.id, latGuardar, lonGuardar]
            );
          }
        } else {
          // No se bloquea el login, solo se informa que la asistencia no se registró
          avisoAsistencia = validacionUbicacion.error;
          console.warn(`⚠️ Asistencia por Login NO registrada para ${user.usuario}: ${validacionUbicacion.error}`);
        }
      }

      return res.json({ usuario: user, segunda_sesion: es_secundaria, aviso_asistencia: avisoAsistencia, pantallas_permitidas_mdm: mdmInfo.pantallasPermitidas });
    } else {
      res.status(401).json({ error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

exports.logout = async (req, res) => {
  const { usuario_id, dispositivo_id } = req.body;
  try {
    const userRes = await db.query('SELECT dispositivo_id FROM usuarios WHERE id = $1', [usuario_id]);

    if (userRes.rows.length > 0) {
      let devices = (userRes.rows[0].dispositivo_id || '').split(',').filter(Boolean);

      if (dispositivo_id) {
        devices = devices.filter(d => d !== dispositivo_id);
      } else {
        devices = [];
      }

      await db.query('UPDATE usuarios SET dispositivo_id = $1 WHERE id = $2', [devices.length > 0 ? devices.join(',') : null, usuario_id]);
    }

    const isLoginActivo = await metodoAsistenciaActivo('login');

    const userCheck = await db.query('SELECT dispositivo_id FROM usuarios WHERE id = $1', [usuario_id]);
    const quedanDispositivos = userCheck.rows.length > 0 && userCheck.rows[0].dispositivo_id !== null && userCheck.rows[0].dispositivo_id !== '';

    if (isLoginActivo && !quedanDispositivos) {
      await db.query(
        'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND hora_salida IS NULL',
        [usuario_id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

exports.forzarLogout = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE usuarios SET dispositivo_id = NULL WHERE id = $1', [id]);

    const isLoginActivo = await metodoAsistenciaActivo('login');

    if (isLoginActivo) {
      await db.query(
        'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND hora_salida IS NULL',
        [id]
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_eliminado', parseInt(id));
    }

    res.json({ success: true, message: 'Sesiones remotas y turno de asistencia cerrados correctamente. El usuario ya puede iniciar sesión de nuevo.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al forzar el cierre de sesión.' });
  }
};

// =========================================================================
// GESTIÓN DE VÍNCULOS DE DISPOSITIVOS (ASISTENCIA / ANTI-TRAMPAS)
// =========================================================================

exports.vincularDispositivo = async (req, res) => {
  const { usuario_id, dispositivo_id, pin } = req.body;
  try {
    const userRes = await db.query('SELECT pin FROM usuarios WHERE id = $1', [usuario_id]);
    if (userRes.rows.length === 0 || String(userRes.rows[0].pin) !== String(pin)) {
      return res.status(401).json({ error: 'PIN incorrecto. No se pudo vincular el equipo.' });
    }

    await db.query('CREATE TABLE IF NOT EXISTS empleados_dispositivos (id SERIAL PRIMARY KEY, usuario_id INT UNIQUE, dispositivo_id TEXT UNIQUE, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

    await db.query(`
      INSERT INTO empleados_dispositivos (usuario_id, dispositivo_id, fecha)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (usuario_id)
      DO UPDATE SET dispositivo_id = EXCLUDED.dispositivo_id, fecha = CURRENT_TIMESTAMP
    `, [usuario_id, dispositivo_id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_actualizado', { id: usuario_id });
    }

    res.json({ success: true, message: '¡Equipo vinculado exitosamente a tu cuenta!' });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Este celular ya se encuentra vinculado a otra cuenta de usuario.' });
    } else {
      res.status(500).json({ error: 'Error al vincular el dispositivo.' });
    }
  }
};

exports.obtenerDispositivosVinculados = async (req, res) => {
  try {
    await db.query('CREATE TABLE IF NOT EXISTS empleados_dispositivos (id SERIAL PRIMARY KEY, usuario_id INT UNIQUE, dispositivo_id TEXT UNIQUE, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

    const result = await db.query(`
      SELECT ed.id, ed.usuario_id, ed.dispositivo_id, ed.fecha, u.nombre, u.rol
      FROM empleados_dispositivos ed
      JOIN usuarios u ON ed.usuario_id = u.id
      ORDER BY ed.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
};

exports.desvincularDispositivo = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Consultar el usuario_id antes de eliminar para enviarlo en el socket
    const devCheck = await db.query('SELECT usuario_id FROM empleados_dispositivos WHERE id = $1', [id]);
    const usuario_id = devCheck.rows.length > 0 ? devCheck.rows[0].usuario_id : null;

    // 2. Eliminar la vinculación
    await db.query('DELETE FROM empleados_dispositivos WHERE id = $1', [id]);

    // 3. Emitir el evento con un objeto válido para evitar crashing en App.js
    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_actualizado', { id: usuario_id || 0 });
      io.emit('dispositivo_desvinculado', { id: parseInt(id), usuario_id });
    }

    res.json({ success: true, message: 'Dispositivo desvinculado correctamente. El empleado ya puede iniciar sesión en otro equipo.' });
  } catch (error) {
    console.error("Error al desvincular dispositivo:", error);
    res.status(500).json({ error: 'Error al desvincular el dispositivo.' });
  }
};