const db = require('../config/db');  

exports.obtenerReceta = async (req, res) => {
  const { producto_id } = req.params;
  try {
    const result = await db.query(`
      WITH RECURSIVE EmpaquesCosto AS (
        SELECT p.id as producto_id,
        COALESCE(SUM(
          ((i.costo_presentacion::numeric / COALESCE(NULLIF(i.cantidad_presentacion::numeric, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento::numeric, 0), 1)) * (emp->>'cantidad')::numeric
        ), 0) as costo_empaques_batch
        FROM productos p
        LEFT JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.opciones) = 'array' THEN p.opciones ELSE '[]'::jsonb END
        ) AS opt ON opt->>'categoria' = 'EmpaquesUnicos'
        LEFT JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(opt->'empaques') = 'array' THEN opt->'empaques' ELSE '[]'::jsonb END
        ) AS emp ON true
        LEFT JOIN insumos i ON i.id = NULLIF(emp->>'insumo_id', '')::int
        GROUP BY p.id
      ),
      Explosion AS (
        SELECT
          r.producto_id AS root_producto_id,
          r.insumo_id,
          r.sub_producto_id,
          r.cantidad_usada::numeric AS qty_factor
        FROM recetas r
        WHERE r.producto_id IN (SELECT sub_producto_id FROM recetas WHERE producto_id = $1 AND sub_producto_id IS NOT NULL)  
        UNION ALL  
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
      CostoTotalSubrecetas AS (
        SELECT
          e.root_producto_id as producto_id,  
          COALESCE(SUM(CASE WHEN e.insumo_id IS NOT NULL THEN
            ((i.costo_presentacion::numeric / COALESCE(NULLIF(i.cantidad_presentacion::numeric, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento::numeric, 0), 1)) * e.qty_factor
          ELSE 0 END), 0)
          +
          COALESCE(SUM(CASE WHEN e.sub_producto_id IS NOT NULL THEN
            (ec_sub.costo_empaques_batch / COALESCE(NULLIF(p_sub.rendimiento::numeric, 0), 1)) * e.qty_factor
          ELSE 0 END), 0)
          +
          COALESCE(MAX(ec_root.costo_empaques_batch), 0) as costo_total_bruto  
        FROM Explosion e
        LEFT JOIN insumos i ON e.insumo_id = i.id
        LEFT JOIN productos p_sub ON e.sub_producto_id = p_sub.id
        LEFT JOIN EmpaquesCosto ec_sub ON e.sub_producto_id = ec_sub.producto_id
        LEFT JOIN EmpaquesCosto ec_root ON e.root_producto_id = ec_root.producto_id
        GROUP BY e.root_producto_id
      )  
      SELECT r.id, r.producto_id, r.cantidad_usada,
        r.insumo_id, i.nombre as insumo_nombre, i.unidad_medida,
        i.costo_presentacion, i.cantidad_presentacion, i.factor_rendimiento, i.tipo_rendimiento,
        r.sub_producto_id, p.nombre as sub_producto_nombre, p.rendimiento as sub_producto_rendimiento,  
        ((i.costo_presentacion::numeric / COALESCE(NULLIF(i.cantidad_presentacion::numeric, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento::numeric, 0), 1)) as costo_unitario_real,  
        (SELECT (ca.costo_total_bruto / COALESCE(NULLIF(p_sub.rendimiento::numeric, 0), 1))
         FROM CostoTotalSubrecetas ca
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
    res.status(500).json({ error: 'Error al obtener receta', detalle: error.message });
  }
};  

exports.agregarInsumoReceta = async (req, res) => {
  const { producto_id, insumo_id, sub_producto_id, cantidad_usada } = req.body;
  
  try {
    // 👇 FIX: ESCUDO ANTI-BUCLES INFINITOS PARA SUB-RECETAS
    if (sub_producto_id) {
      // 1. Validar que no se agregue a sí mismo
      if (Number(producto_id) === Number(sub_producto_id)) {
        return res.status(400).json({ error: 'Advertencia: Un producto no puede ser ingrediente de sí mismo.' });
      }

      // 2. Validar recursividad profunda (Evitar que A -> B -> C -> A)
      // Buscamos si el "Padre" (producto_id) ya existe como "Hijo" dentro del sub-producto que estamos intentando agregar
      const checkBucleQuery = `
        WITH RECURSIVE Descendientes AS (
          SELECT sub_producto_id FROM recetas WHERE producto_id = $1 AND sub_producto_id IS NOT NULL
          UNION ALL
          SELECT r.sub_producto_id FROM recetas r
          INNER JOIN Descendientes d ON r.producto_id = d.sub_producto_id
          WHERE r.sub_producto_id IS NOT NULL
        )
        SELECT sub_producto_id FROM Descendientes WHERE sub_producto_id = $2 LIMIT 1;
      `;
      const bucleCheck = await db.query(checkBucleQuery, [sub_producto_id, producto_id]);
      
      if (bucleCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Bucle Infinito Detectado: No puedes agregar este sub-producto porque ya contiene a tu producto principal dentro de su propia receta.' 
        });
      }
    }

    const result = await db.query(
      'INSERT INTO recetas (producto_id, insumo_id, sub_producto_id, cantidad_usada) VALUES ($1, $2, $3, $4) RETURNING *',
      [producto_id, insumo_id || null, sub_producto_id || null, cantidad_usada]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al agregar a receta:", error);
    res.status(500).json({ error: 'Error al agregar el elemento a la receta.' });
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