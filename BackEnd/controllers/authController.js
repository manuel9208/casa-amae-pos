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

      // LÓGICA DE BLOQUEO DE SESIONES CONCURRENTES (Expira en 8 horas)
      const ahora = new Date();
      const hace8Horas = new Date(ahora.getTime() - (8 * 60 * 60 * 1000));

      if (user.dispositivo_id && user.dispositivo_id !== dispositivo_id) {
        // Si el dispositivo no coincide, revisamos si la sesión vieja ya caducó
        if (user.ultimo_acceso && new Date(user.ultimo_acceso) > hace8Horas) {
          return res.status(403).json({ error: 'Esta cuenta ya está abierta en otro equipo. Cierra la sesión allá primero.' });
        }
      }

      // Si todo está bien, registramos su dispositivo y lo dejamos pasar
      await db.query(
        'UPDATE usuarios SET dispositivo_id = $1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $2', 
        [dispositivo_id, user.id]
      );

      res.json({ usuario: user });
    } else {
      res.status(401).json({ error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

// NUEVA FUNCIÓN PARA LIBERAR EL CANDADO
exports.logout = async (req, res) => {
  const { usuario_id } = req.body;
  try {
    await db.query('UPDATE usuarios SET dispositivo_id = NULL WHERE id = $1', [usuario_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};