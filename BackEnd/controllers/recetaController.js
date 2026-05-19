const db = require('../config/db');

exports.obtenerReceta = async (req, res) => {
  const { producto_id } = req.params;
  try {
    // 👇 MÁGIA SQL: Hacemos un JOIN complejo para calcular el costo de las sub-recetas al vuelo
    const result = await db.query(`
      SELECT r.id, r.producto_id, r.cantidad_usada, 
             r.insumo_id, i.nombre as insumo_nombre, i.unidad_medida, 
             i.costo_presentacion, i.cantidad_presentacion,
             r.sub_producto_id, p.nombre as sub_producto_nombre, p.rendimiento as sub_producto_rendimiento,
             (
                SELECT COALESCE(SUM((i2.costo_presentacion / COALESCE(NULLIF(i2.cantidad_presentacion, 0), 1)) * r2.cantidad_usada), 0)
                FROM recetas r2
                JOIN insumos i2 ON r2.insumo_id = i2.id
                WHERE r2.producto_id = r.sub_producto_id
             ) / COALESCE(NULLIF(p.rendimiento, 0), 1) as costo_subreceta
      FROM recetas r
      LEFT JOIN insumos i ON r.insumo_id = i.id
      LEFT JOIN productos p ON r.sub_producto_id = p.id
      WHERE r.producto_id = $1
    `, [producto_id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener receta:", error);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
};

exports.agregarInsumoReceta = async (req, res) => {
  const { producto_id, insumo_id, sub_producto_id, cantidad_usada } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO recetas (producto_id, insumo_id, sub_producto_id, cantidad_usada) VALUES ($1, $2, $3, $4) RETURNING *',
      [producto_id, insumo_id || null, sub_producto_id || null, cantidad_usada]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al agregar a receta:", error);
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

// 👇 NUEVA FUNCIÓN: Permite guardar de manera persistente los rendimientos por tamaño
exports.actualizarOpcionesProducto = async (req, res) => {
  const { id } = req.params;
  const { opciones } = req.body;
  try {
    const result = await db.query(
      'UPDATE productos SET opciones = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(opciones), id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar opciones del producto:", error);
    res.status(500).json({ error: 'Error al actualizar especificaciones de tamaños' });
  }
};