const db = require('../config/db');

exports.obtenerIngredientes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, c.nombre as clasificacion_nombre 
      FROM catalogo_ingredientes i 
      LEFT JOIN clasificaciones c ON i.clasificacion_id = c.id 
      ORDER BY i.id ASC
    `);
    res.json(result.rows);
  } catch (error) { 
    console.error("🚨 ERROR EN BASE DE DATOS (Ingredientes):", error.message);
    res.status(500).json({ error: 'Error al obtener ingredientes' }); 
  }
};

exports.crearIngrediente = async (req, res) => {
  const { clasificacion_id, nombre, tipo, precio_extra, permite_extra } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO catalogo_ingredientes (clasificacion_id, nombre, tipo, precio_extra, permite_extra) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
      [clasificacion_id, nombre, tipo, precio_extra || 0, permite_extra]
    );
    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error al crear' }); 
  }
};

exports.actualizarIngrediente = async (req, res) => {
  const { clasificacion_id, nombre, tipo, precio_extra, permite_extra } = req.body;
  try {
    const result = await db.query(
      'UPDATE catalogo_ingredientes SET clasificacion_id=$1, nombre=$2, tipo=$3, precio_extra=$4, permite_extra=$5 WHERE id=$6 RETURNING *', 
      [clasificacion_id, nombre, tipo, precio_extra || 0, permite_extra, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error al actualizar' }); 
  }
};

exports.eliminarIngrediente = async (req, res) => {
  try {
    await db.query('DELETE FROM catalogo_ingredientes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: 'Error al eliminar' }); 
  }
};