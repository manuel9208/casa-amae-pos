const db = require('../config/db');

exports.obtenerClasificaciones = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clasificaciones ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Error al obtener clasificaciones' }); }
};

exports.crearClasificacion = async (req, res) => {
  const { nombre, destino, emoji } = req.body;
  const imagen_url = req.file ? '/uploads/' + req.file.filename : null;
  try {
    const result = await db.query('INSERT INTO clasificaciones (nombre, destino, emoji, imagen_url) VALUES ($1, $2, $3, $4) RETURNING *', [nombre, destino, emoji, imagen_url]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Error al crear' }); }
};

exports.actualizarClasificacion = async (req, res) => {
  const { id } = req.params;
  const { nombre, destino, emoji } = req.body;
  const imagen_url = req.file ? '/uploads/' + req.file.filename : null;
  try {
    const result = await db.query('UPDATE clasificaciones SET nombre=$1, destino=$2, emoji=$3, imagen_url=COALESCE($4, imagen_url) WHERE id=$5 RETURNING *', [nombre, destino, emoji, imagen_url, id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Error al actualizar' }); }
};

exports.eliminarClasificacion = async (req, res) => {
  try {
    await db.query('DELETE FROM clasificaciones WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar' }); }
};