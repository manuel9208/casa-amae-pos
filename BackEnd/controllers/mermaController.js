const db = require('../config/db');

exports.registrarMerma = async (req, res) => {
  const { tipo, item_id, nombre_item, cantidad, costo_perdido, usuario_id, origen } = req.body;
  const empresaId = req.empresa_id; // 🆕 TENANT
  if (!tipo || !item_id || !cantidad) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para reportar la merma.' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
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
    // FLUJO 1: MERMA DE INSUMO DIRECTO (sin cambios)
    // ========================================================
    if (tipo === 'Insumo') {
      await client.query(
        'UPDATE insumos SET stock_actual = stock_actual - $1 WHERE id = $2 AND empresa_id = $3',
        [cantMerma, item_id, empresaId]
      );
    }

    // ========================================================
    // FLUJO 2A: MERMA DE PLATILLO PREPARADO (sin cambios — sigue en "productos")
    // ========================================================
    if (tipo === 'Platillo') {
      const prodRes = await client.query('SELECT usa_stock, stock_preparado, rendimiento FROM productos WHERE id = $1 AND empresa_id = $2', [item_id, empresaId]);
      if (prodRes.rows.length > 0) {
        const row = prodRes.rows[0];
        const isUsaStock = row.usa_stock === true || String(row.usa_stock) === 'true';
        if (isUsaStock) {
          await client.query(
            'UPDATE productos SET stock_preparado = stock_preparado - $1 WHERE id = $2 AND empresa_id = $3',
            [cantMerma, item_id, empresaId]
          );
        } else {
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
                FROM recetas r WHERE r.producto_id = $2 AND r.empresa_id = $3
                UNION ALL
                SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                FROM Explosion e
                JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $3
                JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $3
                WHERE e.sub_producto_id IS NOT NULL
              )
              UPDATE insumos SET stock_actual = stock_actual - calc.total_descontar FROM (
                SELECT insumo_id, SUM(qty_factor) as total_descontar FROM Explosion WHERE insumo_id IS NOT NULL GROUP BY insumo_id
              ) calc WHERE insumos.id = calc.insumo_id AND insumos.empresa_id = $3;
            `;
            await client.query(recursiveQuery, [lotesADescontar, item_id, empresaId]);
          }
        }
      }
    }

    // ========================================================
    // 🆕 FLUJO 2B: MERMA DE SUB-RECETA / BASE — ahora apunta a "sub_recetas"
    // (antes consultaba erróneamente "productos", tabla que ya no se usa
    // para sub-recetas). El motor recursivo ahora ancla por "sub_receta_id",
    // igual patrón que ya usa recetaController.obtenerReceta.
    // ========================================================
    if (tipo === 'Receta') {
      const subRecetaRes = await client.query('SELECT rendimiento FROM sub_recetas WHERE id = $1 AND empresa_id = $2', [item_id, empresaId]);
      if (subRecetaRes.rows.length > 0) {
        const rendimiento = parseFloat(subRecetaRes.rows[0].rendimiento) || 1;
        let lotesADescontar = 0;
        if (rendimiento <= 1) {
          lotesADescontar = cantMerma;
        } else {
          lotesADescontar = cantMerma / rendimiento;
        }
        if (lotesADescontar > 0) {
          const recursiveQuerySubReceta = `
            WITH RECURSIVE Explosion AS (
              SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
              FROM recetas r WHERE r.sub_receta_id = $2 AND r.empresa_id = $3
              UNION ALL
              SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
              FROM Explosion e
              JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $3
              JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $3
              WHERE e.sub_producto_id IS NOT NULL
            )
            UPDATE insumos SET stock_actual = stock_actual - calc.total_descontar FROM (
              SELECT insumo_id, SUM(qty_factor) as total_descontar FROM Explosion WHERE insumo_id IS NOT NULL GROUP BY insumo_id
            ) calc WHERE insumos.id = calc.insumo_id AND insumos.empresa_id = $3;
          `;
          await client.query(recursiveQuerySubReceta, [lotesADescontar, item_id, empresaId]);
        }
      }
    }

    // ========================================================
    // 3. REGISTRAR LA MERMA EN LA TABLA HISTÓRICA (sin cambios)
    // ========================================================
    const insertRes = await client.query(
      `INSERT INTO reporte_mermas (tipo, item_id, nombre_item, cantidad, costo_perdido, usuario_id, origen, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tipo, item_id, nombre_item, cantMerma, costo_perdido || 0, usuario_id || null, origen || 'Sistema', empresaId]
    );
    await client.query('COMMIT');

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
  const { periodo = 'dia', fecha = new Date().toISOString().split('T')[0], tipo = 'Todos' } = req.query;
  const empresaId = req.empresa_id;
  try {
    let query = `
      SELECT m.*, u.nombre as usuario_nombre
      FROM reporte_mermas m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.empresa_id = $1
    `;
    let params = [empresaId];
    let paramIndex = 2;

    if (periodo === 'dia') {
      query += ` AND m.fecha_creacion::DATE = $${paramIndex}::DATE`;
    } else if (periodo === 'semana') {
      query += ` AND m.fecha_creacion >= DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) AND m.fecha_creacion < DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) + INTERVAL '1 week'`;
    } else if (periodo === 'mes') {
      query += ` AND DATE_TRUNC('month', m.fecha_creacion::TIMESTAMP) = DATE_TRUNC('month', $${paramIndex}::TIMESTAMP)`;
    } else if (periodo === 'anio') {
      query += ` AND DATE_TRUNC('year', m.fecha_creacion::TIMESTAMP) = DATE_TRUNC('year', $${paramIndex}::TIMESTAMP)`;
    }
    params.push(fecha);
    paramIndex++;

    if (tipo !== 'Todos') {
      query += ` AND m.tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    query += ` ORDER BY m.fecha_creacion DESC LIMIT 500`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el historial de mermas.' });
  }
};