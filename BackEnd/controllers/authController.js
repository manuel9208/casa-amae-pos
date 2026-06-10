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

      if (user.dispositivo_id && user.dispositivo_id !== dispositivo_id) {
        if (user.ultimo_acceso && new Date(user.ultimo_acceso) > hace8Horas) {
          return res.status(403).json({ error: 'Esta cuenta ya está abierta en otro equipo. Cierra la sesión allá primero.' });
        }
      }

      await db.query(
        'UPDATE usuarios SET dispositivo_id = $1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $2',
        [dispositivo_id, user.id]
      );

      // 👇 REVISAMOS SI ESTÁ ACTIVADO EL LOGIN AUTOMÁTICO
      const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
      const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;

      if (isLoginActivo) {
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

      res.json({ usuario: user });
    } else {
      res.status(401).json({ error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

exports.logout = async (req, res) => {
  const { usuario_id } = req.body;
  try {
    await db.query('UPDATE usuarios SET dispositivo_id = NULL WHERE id = $1', [usuario_id]);

    // 👇 REVISAMOS SI ESTÁ ACTIVADO EL LOGOUT AUTOMÁTICO
    const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
    const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;

    if (isLoginActivo) {
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