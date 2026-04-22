const db = require('../config/db');

exports.obtenerReceta = async (req, res) => {
  const { producto_id } = req.params;
  try {
    // Hacemos un JOIN para traer los datos del insumo junto con la cantidad usada
    const result = await db.query(`
      SELECT r.id, r.producto_id, r.insumo_id, r.cantidad_usada, 
             i.nombre as insumo_nombre, i.unidad_medida, 
             i.costo_presentacion, i.cantidad_presentacion
      FROM recetas r
      JOIN insumos i ON r.insumo_id = i.id
      WHERE r.producto_id = $1
    `, [producto_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener receta' });
  }
};

exports.agregarInsumoReceta = async (req, res) => {
  const { producto_id, insumo_id, cantidad_usada } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO recetas (producto_id, insumo_id, cantidad_usada) VALUES ($1, $2, $3) RETURNING *',
      [producto_id, insumo_id, cantidad_usada]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar a receta' });
  }
};

exports.eliminarInsumoReceta = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM recetas WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar item de receta' });
  }
};