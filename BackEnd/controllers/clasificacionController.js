const db = require('../config/db');

exports.obtenerClasificaciones = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clasificaciones ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Error al obtener clasificaciones' }); }
};

exports.crearClasificacion = async (req, res) => {
  // 👇 Agregamos genera_puntos
  const { nombre, destino, emoji, genera_puntos } = req.body;
  const imagen_url = req.file ? req.file.path : null;
  
  // Parseo seguro del booleano (por defecto en true)
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);

  try {
    const result = await db.query(
      'INSERT INTO clasificaciones (nombre, destino, emoji, imagen_url, genera_puntos) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
      [nombre, destino, emoji, imagen_url, isGeneraPuntos]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Error al crear' }); }
};

exports.actualizarClasificacion = async (req, res) => {
  const { id } = req.params;
  // 👇 Agregamos genera_puntos
  const { nombre, destino, emoji, genera_puntos } = req.body;
  const imagen_url = req.file ? req.file.path : null;
  
  // Parseo seguro del booleano (por defecto en true)
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);

  try {
    const result = await db.query(
      'UPDATE clasificaciones SET nombre=$1, destino=$2, emoji=$3, imagen_url=COALESCE($4, imagen_url), genera_puntos=$5 WHERE id=$6 RETURNING *', 
      [nombre, destino, emoji, imagen_url, isGeneraPuntos, id]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Error al actualizar' }); }
};

exports.eliminarClasificacion = async (req, res) => {
  try {
    await db.query('DELETE FROM clasificaciones WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar' }); }
};