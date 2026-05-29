const db = require('../config/db');

exports.obtenerReceta = async (req, res) => {
  const { producto_id } = req.params;
  try {
    // 👇 MÁGIA SQL CORREGIDA: Saca el costo del insumo si es directo, o de la sub-receta recursiva
    const result = await db.query(`
      WITH RECURSIVE CostosSubrecetas AS (
          -- CASO BASE: Obtener el costo de los insumos puros
          SELECT r.producto_id, 
                 SUM(((i.costo_presentacion / COALESCE(NULLIF(i.cantidad_presentacion, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento, 0), 1)) * r.cantidad_usada) as costo_insumos_puros
          FROM recetas r
          JOIN insumos i ON r.insumo_id = i.id
          GROUP BY r.producto_id
      ),
      CostosAnidados AS (
          -- SUMAMOS: Insumos Puros + Sub-recetas hijas
          SELECT p.id as producto_id, p.rendimiento,
                 COALESCE(cp.costo_insumos_puros, 0) + 
                 COALESCE((SELECT SUM((cr.costo_insumos_puros / COALESCE(NULLIF(psub.rendimiento, 0), 1)) * r_sub.cantidad_usada)
                           FROM recetas r_sub
                           JOIN CostosSubrecetas cr ON r_sub.sub_producto_id = cr.producto_id
                           JOIN productos psub ON r_sub.sub_producto_id = psub.id
                           WHERE r_sub.producto_id = p.id), 0) as costo_total_bruto
          FROM productos p
          LEFT JOIN CostosSubrecetas cp ON p.id = cp.producto_id
      )
      
      SELECT r.id, r.producto_id, r.cantidad_usada, 
             r.insumo_id, i.nombre as insumo_nombre, i.unidad_medida, 
             i.costo_presentacion, i.cantidad_presentacion, i.factor_rendimiento, i.tipo_rendimiento,
             r.sub_producto_id, p.nombre as sub_producto_nombre, p.rendimiento as sub_producto_rendimiento,
             
             -- 1. Costo unitario neto por gramo/pieza ya considerando Merma o Expansión
             (i.costo_presentacion / COALESCE(NULLIF(i.cantidad_presentacion, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento, 0), 1) as costo_unitario_real,
             
             -- 2. Costo Real de la Sub-Receta extraído del bloque recursivo
             (SELECT (costo_total_bruto / COALESCE(NULLIF(rendimiento, 0), 1)) FROM CostosAnidados WHERE producto_id = r.sub_producto_id) as costo_subreceta
             
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