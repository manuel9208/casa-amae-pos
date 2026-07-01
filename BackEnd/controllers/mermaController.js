const db = require('../config/db');

exports.registrarMerma = async (req, res) => {
    const { tipo, item_id, nombre_item, cantidad, costo_perdido, usuario_id, origen } = req.body;

    if (!tipo || !item_id || !cantidad) {
        return res.status(400).json({ error: 'Faltan datos obligatorios para reportar la merma.' });
    }

    const client = await db.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Asegurarnos de que la tabla exista (Se ejecuta de forma segura)
        await client.query(`
            CREATE TABLE IF NOT EXISTS reporte_mermas (
                id SERIAL PRIMARY KEY,
                tipo VARCHAR(50),
                item_id INTEGER,
                nombre_item VARCHAR(255),
                cantidad NUMERIC,
                costo_perdido NUMERIC,
                usuario_id INTEGER,
                origen VARCHAR(50),
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const cantMerma = parseFloat(cantidad);

        // ========================================================
        // FLUJO 1: MERMA DE INSUMO DIRECTO
        // ========================================================
        if (tipo === 'Insumo') {
            await client.query(
                'UPDATE insumos SET stock_actual = stock_actual - $1 WHERE id = $2',
                [cantMerma, item_id]
            );
        }

        // ========================================================
        // FLUJO 2: MERMA DE RECETA BASE O PLATILLO PREPARADO
        // ========================================================
        if (tipo === 'Receta' || tipo === 'Platillo') {
            const prodRes = await client.query('SELECT usa_stock, stock_preparado, rendimiento FROM productos WHERE id = $1', [item_id]);
            
            if (prodRes.rows.length > 0) {
                const row = prodRes.rows[0];
                const isUsaStock = row.usa_stock === true || String(row.usa_stock) === 'true';
                
                if (isUsaStock) {
                    // Solo descontar stock preparado si lo controla
                    await client.query(
                        'UPDATE productos SET stock_preparado = stock_preparado - $1 WHERE id = $2',
                        [cantMerma, item_id]
                    );
                } else {
                    // Ejecutar el motor de explosión recursiva (Misma lógica que la venta)
                    const rendimiento = parseFloat(row.rendimiento) || 1;
                    let lotesADescontar = 0;

                    if (rendimiento <= 1) {
                        lotesADescontar = cantMerma;
                    } else {
                        lotesADescontar = cantMerma / rendimiento;
                    }

                    if (lotesADescontar > 0) {
                        const recursiveQuery = `
                            WITH RECURSIVE Explosion AS (
                                SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                                FROM recetas r WHERE r.producto_id = $2
                                UNION ALL
                                SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                                FROM Explosion e JOIN productos p ON e.sub_producto_id = p.id JOIN recetas r ON r.producto_id = p.id
                                WHERE e.sub_producto_id IS NOT NULL
                            )
                            UPDATE insumos SET stock_actual = stock_actual - calc.total_descontar FROM (
                                SELECT insumo_id, SUM(qty_factor) as total_descontar FROM Explosion WHERE insumo_id IS NOT NULL GROUP BY insumo_id
                            ) calc WHERE insumos.id = calc.insumo_id;
                        `;
                        await client.query(recursiveQuery, [lotesADescontar, item_id]);
                    }
                }
            }
        }

        // ========================================================
        // 3. REGISTRAR LA MERMA EN LA TABLA HISTÓRICA
        // ========================================================
        const insertRes = await client.query(
            `INSERT INTO reporte_mermas (tipo, item_id, nombre_item, cantidad, costo_perdido, usuario_id, origen)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [tipo, item_id, nombre_item, cantMerma, costo_perdido || 0, usuario_id || null, origen || 'Sistema']
        );

        await client.query('COMMIT');

        // 👇 EMITIR ACTUALIZACIÓN GLOBAL (Para que Caja y Kiosco refresquen inventario)
        const io = req.app.get('io');
        if (io) {
            io.emit('catalogo_actualizado');
        }

        res.status(201).json(insertRes.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al registrar merma:", error);
        res.status(500).json({ error: 'Error interno al registrar la merma en el inventario.' });
    } finally {
        client.release();
    }
};

exports.obtenerMermas = async (req, res) => {
    try {
        // En el futuro podemos agregar filtros de fecha si se solicita en la fase administrativa
        const result = await db.query(`
            SELECT m.*, u.nombre as usuario_nombre 
            FROM reporte_mermas m 
            LEFT JOIN usuarios u ON m.usuario_id = u.id 
            ORDER BY m.fecha_creacion DESC LIMIT 200
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de mermas.' });
    }
};