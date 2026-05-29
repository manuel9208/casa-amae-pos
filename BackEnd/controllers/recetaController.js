const db = require('../config/db');

exports.obtenerReceta = async (req, res) => {
  const { producto_id } = req.params;
  try {
    const result = await db.query(`
      WITH RECURSIVE Explosion AS (
          -- CASO BASE: Todos los items de todas las recetas
          SELECT 
              r.producto_id AS root_producto_id,
              r.insumo_id,
              r.sub_producto_id,
              r.cantidad_usada::numeric AS qty_factor
          FROM recetas r
          
          UNION ALL
          
          -- RECURSIÓN: Si el item es una sub-receta, extraemos sus ingredientes infinitamente
          SELECT 
              e.root_producto_id,
              r.insumo_id,
              r.sub_producto_id,
              ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
          FROM Explosion e
          JOIN productos p ON e.sub_producto_id = p.id
          JOIN recetas r ON r.producto_id = p.id
          WHERE e.sub_producto_id IS NOT NULL
      ),
      CostosAnidados AS (
          -- SUMAMOS EL COSTO DE LA EXPLOSIÓN DE INSUMOS
          SELECT 
              e.root_producto_id as producto_id,
              SUM(((i.costo_presentacion::numeric / COALESCE(NULLIF(i.cantidad_presentacion::numeric, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento::numeric, 0), 1)) * e.qty_factor) as costo_total_bruto
          FROM Explosion e
          JOIN insumos i ON e.insumo_id = i.id
          GROUP BY e.root_producto_id
      )
      
      SELECT r.id, r.producto_id, r.cantidad_usada, 
             r.insumo_id, i.nombre as insumo_nombre, i.unidad_medida, 
             i.costo_presentacion, i.cantidad_presentacion, i.factor_rendimiento, i.tipo_rendimiento,
             r.sub_producto_id, p.nombre as sub_producto_nombre, p.rendimiento as sub_producto_rendimiento,
             
             -- 1. Costo unitario neto por gramo/pieza ya considerando Merma o Expansión
             ((i.costo_presentacion::numeric / COALESCE(NULLIF(i.cantidad_presentacion::numeric, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento::numeric, 0), 1)) as costo_unitario_real,
             
             -- 2. Costo de la Sub-Receta con explosión infinita
             (SELECT (ca.costo_total_bruto / COALESCE(NULLIF(p_sub.rendimiento::numeric, 0), 1)) 
              FROM CostosAnidados ca 
              JOIN productos p_sub ON p_sub.id = ca.producto_id 
              WHERE ca.producto_id = r.sub_producto_id) as costo_subreceta
             
      FROM recetas r
      LEFT JOIN insumos i ON r.insumo_id = i.id
      LEFT JOIN productos p ON r.sub_producto_id = p.id
      WHERE r.producto_id = $1
    `, [producto_id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener receta:", error);
    // 👇 Esto nos dirá exactamente dónde duele si vuelve a fallar
    res.status(500).json({ error: 'Error al obtener receta', detalle: error.message });
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