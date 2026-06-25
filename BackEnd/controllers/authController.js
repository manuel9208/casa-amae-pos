const db = require('../config/db');

exports.identificar = async (req, res) => {
  const { telefono } = req.body;
  try {
    const empleado = await db.query('SELECT * FROM usuarios WHERE telefono = $1', [telefono]);
    if (empleado.rows.length > 0) return res.json({ tipo: 'empleado', data: empleado.rows[0] });

    const cliente = await db.query('SELECT * FROM clientes WHERE telefono = $1', [telefono]);
    if (cliente.rows.length > 0) return res.json({ tipo: 'cliente', data: cliente.rows[0] });

    return res.json({ tipo: 'nuevo' });
  } catch (error) {
    res.status(500).json({ error: 'Error al identificar' });
  }
};

exports.login = async (req, res) => {
  const { usuario, password, dispositivo_id } = req.body;
  try {
    const result = await db.query('SELECT * FROM usuarios WHERE usuario = $1 AND password = $2', [usuario, password]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const ahora = new Date();
      const hace8Horas = new Date(ahora.getTime() - (8 * 60 * 60 * 1000));

      // Control Multi-Sesión Inteligente
      let devices = [];
      if (user.ultimo_acceso && new Date(user.ultimo_acceso) > hace8Horas) {
        devices = (user.dispositivo_id || '').split(',').filter(Boolean);
      }

      // Si el equipo actual no está registrado en la sesión activa...
      if (!devices.includes(dispositivo_id)) {
        if (devices.length >= 2) {
          return res.status(403).json({ error: 'Esta cuenta ya está abierta en 2 equipos simultáneamente. Cierra la sesión en alguno de ellos primero o pide a tu administrador que reinicie tus sesiones.' });
        }
        devices.push(dispositivo_id); // Agregamos el nuevo equipo (Máximo 2)
      }

      // Detectamos si es la segunda sesión (el índice será > 0)
      const es_secundaria = devices.indexOf(dispositivo_id) > 0;

      await db.query(
        'UPDATE usuarios SET dispositivo_id = $1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $2',
        [devices.join(','), user.id]
      );

      // REVISAMOS SI ESTÁ ACTIVADO EL LOGIN AUTOMÁTICO
      const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
      const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;

      // Solo abrimos asistencia automáticamente si es la sesión primaria (para no duplicar entradas por accidente)
      if (isLoginActivo && !es_secundaria) {
        const turnoAbierto = await db.query(
          'SELECT id FROM registro_asistencias WHERE usuario_id = $1 AND hora_salida IS NULL AND fecha = CURRENT_DATE',
          [user.id]
        );
        if (turnoAbierto.rows.length === 0) {
          await db.query(
            'INSERT INTO registro_asistencias (usuario_id, fecha, hora_entrada) VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP)',
            [user.id]
          );
        }
      }

      // Mandamos la bandera 'segunda_sesion' al frontend para que sepa si debe bloquearle el Área de Trabajo
      res.json({ usuario: user, segunda_sesion: es_secundaria });
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
        devices = devices.filter(d => d !== dispositivo_id); // Removemos solo el equipo que cerró sesión
      } else {
        devices = []; // Fallback de seguridad: si no nos manda ID, limpiamos todas
      }

      await db.query('UPDATE usuarios SET dispositivo_id = $1 WHERE id = $2', [devices.length > 0 ? devices.join(',') : null, usuario_id]);
    }

    // REVISAMOS SI ESTÁ ACTIVADO EL LOGOUT AUTOMÁTICO
    const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
    const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;

    // Solo cerramos asistencia si se cerró LA ÚLTIMA sesión del usuario
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
    
    // 👇 MEJORA APLICADA: Si el administrador expulsa al empleado, también le cerramos su turno de asistencia para que no quede "colgado" ganando horas fantasma.
    const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
    const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;
    
    if (isLoginActivo) {
      await db.query(
        'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND hora_salida IS NULL',
        [id]
      );
    }

    // Disparamos un evento por Socket para expulsar los dispositivos si estuvieran activos
    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_eliminado', parseInt(id)); 
    }

    res.json({ success: true, message: 'Sesiones remotas y turno de asistencia cerrados correctamente. El usuario ya puede iniciar sesión de nuevo.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al forzar el cierre de sesión.' });
  }
};