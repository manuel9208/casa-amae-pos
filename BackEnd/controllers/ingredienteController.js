const db = require('../config/db');

exports.obtenerIngredientes = async (req, res) => {
  const { empresa_id } = req;
  try {
    const result = await db.query(`
      SELECT i.*, c.nombre as clasificacion_nombre 
      FROM catalogo_ingredientes i 
      LEFT JOIN clasificaciones c ON i.clasificacion_id = c.id AND c.empresa_id = i.empresa_id
      WHERE i.empresa_id = $1
      ORDER BY i.id ASC
    `, [empresa_id]);
    res.json(result.rows);
  } catch (error) { 
    console.error("🚨 ERROR EN BASE DE DATOS (Ingredientes):", error.message);
    res.status(500).json({ error: 'Error al obtener ingredientes' }); 
  }
};

exports.crearIngrediente = async (req, res) => {
  const { empresa_id } = req;
  const { clasificacion_id, nombre, tipo, precio_extra, permite_extra } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO catalogo_ingredientes (clasificacion_id, nombre, tipo, precio_extra, permite_extra, empresa_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', 
      [clasificacion_id, nombre, tipo, precio_extra || 0, permite_extra, empresa_id]
    );
    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error al crear' }); 
  }
};

exports.actualizarIngrediente = async (req, res) => {
  const { empresa_id } = req;
  const { clasificacion_id, nombre, tipo, precio_extra, permite_extra } = req.body;
  try {
    const result = await db.query(
      'UPDATE catalogo_ingredientes SET clasificacion_id=$1, nombre=$2, tipo=$3, precio_extra=$4, permite_extra=$5 WHERE id=$6 AND empresa_id=$7 RETURNING *', 
      [clasificacion_id, nombre, tipo, precio_extra || 0, permite_extra, req.params.id, empresa_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingrediente no encontrado o no pertenece a tu negocio.' });
    }
    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error al actualizar' }); 
  }
};

exports.eliminarIngrediente = async (req, res) => {
  const { empresa_id } = req;
  try {
    const result = await db.query('DELETE FROM catalogo_ingredientes WHERE id = $1 AND empresa_id = $2 RETURNING id', [req.params.id, empresa_id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ingrediente no encontrado o no pertenece a tu negocio.' });
    }
    res.json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: 'Error al eliminar' }); 
  }
};