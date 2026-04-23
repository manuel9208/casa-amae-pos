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

// NUEVA FUNCIÓN: Actualizar Usuario
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