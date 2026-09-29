const db = require('../config/db');

// =========================================================
// AUTO-MIGRACIÓN DE BASE DE DATOS (Sub-Recetas)
// =========================================================
exports.inicializarTablasRecetas = async () => {
  try {
    // 1. Creamos la tabla independiente para las preparaciones base
    await db.query(`
      CREATE TABLE IF NOT EXISTS sub_recetas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        categoria VARCHAR(100) DEFAULT 'Base',
        rendimiento DECIMAL(10,3) DEFAULT 1,
        unidad_rendimiento VARCHAR(20) DEFAULT 'PZ',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Preparamos la tabla puente 'recetas' para que apunte a esta nueva tabla
    await db.query(`ALTER TABLE recetas ADD COLUMN IF NOT EXISTS sub_receta_id INTEGER;`).catch(()=>null);
    
    console.log("✅ Tabla de 'sub_recetas' y relaciones verificadas/creadas en la BD.");
  } catch (error) {
    console.error("❌ Error al inicializar sub-recetas:", error);
  }
};

exports.obtenerReceta = async (req, res) => {
    const { producto_id } = req.params; // Puede ser un producto_id o un ingrediente_id dependiendo del modo
    const modo = req.query.modo || 'platillos';

    // 👇 CORRECCIÓN QUIRÚRGICA: Quitamos el "r." para evitar romper el scope de la subconsulta en PostgreSQL
    const colFiltro = modo === 'extras' ? 'ingrediente_id' : 'producto_id';

    try {
        const query = `
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
            WHERE r.producto_id IN (SELECT sub_producto_id FROM recetas WHERE ${colFiltro} = $1 AND sub_producto_id IS NOT NULL)
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
        SELECT r.id, r.producto_id, r.cantidad_usada, r.sabor_nombre, r.ingrediente_id,
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
        WHERE r.${colFiltro} = $1
        `;

        const result = await db.query(query, [producto_id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener receta:", error);
        res.status(500).json({ error: 'Error al obtener receta', detalle: error.message });
    }
};

exports.agregarInsumoReceta = async (req, res) => {
    // 👇 Recibimos los nuevos campos híbridos
    const { producto_id, ingrediente_id, sabor_nombre, insumo_id, sub_producto_id, cantidad_usada } = req.body;

    try {
        // 🛡️ ESCUDO ANTI-BUCLES INFINITOS (Solo aplica si estamos costeando un Producto, no un Extra)
        if (sub_producto_id && producto_id) {
            // 1. Validar que no se agregue a sí mismo
            if (Number(producto_id) === Number(sub_producto_id)) {
                return res.status(400).json({ error: 'Advertencia: Un producto no puede ser ingrediente de sí mismo.' });
            }

            // 2. Validar recursividad profunda (Evitar que A -> B -> C -> A)
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
            const bucleCheck = await db.query(checkBucleQuery, [producto_id, sub_producto_id]);

            if (bucleCheck.rows.length > 0) {
                return res.status(400).json({
                    error: 'Bucle Infinito Detectado: No puedes agregar este sub-producto porque ya contiene a tu producto principal dentro de su propia receta.'
                });
            }
        }

        // 👇 Inserción de alta precisión con soporte para Sabores y Extras
        const result = await db.query(
            'INSERT INTO recetas (producto_id, ingrediente_id, sabor_nombre, insumo_id, sub_producto_id, cantidad_usada) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [producto_id || null, ingrediente_id || null, sabor_nombre || null, insumo_id || null, sub_producto_id || null, cantidad_usada]
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
        res.status(500).json({ error: 'Error al actualizar especificaciones' });
    }
};

// =========================================================
// CRUD DE SUB-RECETAS (Bases, Masas, Salsas, Preparaciones)
// =========================================================

exports.obtenerSubRecetas = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM sub_recetas ORDER BY nombre ASC");
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener sub-recetas:", error);
        res.status(500).json({ error: 'Error al obtener sub-recetas' });
    }
};

exports.crearSubReceta = async (req, res) => {
    const { nombre, categoria, rendimiento, unidad_rendimiento } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO sub_recetas (nombre, categoria, rendimiento, unidad_rendimiento) VALUES ($1, $2, $3, $4) RETURNING *",
            [nombre, categoria || 'Base', rendimiento || 1, unidad_rendimiento || 'PZ']
        );
        
        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error al crear sub-receta:", error);
        res.status(500).json({ error: 'Error al crear la sub-receta' });
    }
};

exports.actualizarSubReceta = async (req, res) => {
    const { id } = req.params;
    const { nombre, categoria, rendimiento, unidad_rendimiento } = req.body;
    try {
        const result = await db.query(
            "UPDATE sub_recetas SET nombre = $1, categoria = $2, rendimiento = $3, unidad_rendimiento = $4 WHERE id = $5 RETURNING *",
            [nombre, categoria || 'Base', rendimiento || 1, unidad_rendimiento || 'PZ', id]
        );
        
        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al actualizar sub-receta:", error);
        res.status(500).json({ error: 'Error al actualizar sub-receta' });
    }
};

exports.eliminarSubReceta = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM sub_recetas WHERE id = $1", [id]);
        
        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');
        
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar sub-receta:", error);
        res.status(500).json({ error: 'Error al eliminar la sub-receta' });
    }
};