const db = require('../config/db');

exports.obtenerReporteVentas = async (req, res) => {
  // Recibimos los nuevos filtros desde el frontend
  const { tipo, fecha, clasificacion, tipo_consumo } = req.query; 
  let queryExtra = '';
  let params = [];
  let paramIndex = 1;

  // 1. DEFINICIÓN DE RANGOS DE TIEMPO
  if (tipo === 'dia') {
    queryExtra += ` AND p.fecha_creacion::DATE = $${paramIndex}::DATE`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'semana') {
    queryExtra += ` AND p.fecha_creacion >= DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) + INTERVAL '1 week'`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'mes') {
    queryExtra += ` AND p.fecha_creacion >= DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) + INTERVAL '1 month'`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'anio') {
    queryExtra += ` AND p.fecha_creacion >= DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) + INTERVAL '1 year'`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'historico') {
    queryExtra += ` AND TO_CHAR(p.fecha_creacion, 'MM-DD') = TO_CHAR($${paramIndex}::DATE, 'MM-DD')`;
    params.push(fecha);
    paramIndex++;
  }

  // 2. NUEVOS FILTROS DINÁMICOS
  if (tipo_consumo && tipo_consumo !== 'Todos') {
    queryExtra += ` AND p.tipo_consumo = $${paramIndex}`;
    params.push(tipo_consumo);
    paramIndex++;
  }

  if (clasificacion && clasificacion !== 'Todas') {
    queryExtra += ` AND (item->>'categoria') = $${paramIndex}`;
    params.push(clasificacion);
    paramIndex++;
  }

  try {
    const sql = `
      WITH ventas_desglosadas AS (
        SELECT 
          (item->>'nombre')::varchar AS producto_nombre,
          (item->>'id')::integer AS producto_id,
          COALESCE((item->>'precioFinal'), (item->>'precio_base'), (item->>'precio'), '0')::decimal AS precio_venta,
          SUM(COALESCE((item->>'cantidad')::integer, 1))::integer AS cantidad_vendida
        FROM pedidos p,
        jsonb_array_elements(p.carrito) AS item
        WHERE p.estado_preparacion != 'Cancelado'
        ${queryExtra}
        GROUP BY 1, 2, 3
      ),
      costos_productos AS (
        SELECT 
          r.producto_id,
          SUM((i.costo_presentacion / i.cantidad_presentacion) * r.cantidad_usada) AS costo_unitario
        FROM recetas r
        JOIN insumos i ON r.insumo_id = i.id
        GROUP BY r.producto_id
      )
      SELECT 
        v.producto_nombre,
        v.cantidad_vendida,
        v.precio_venta,
        COALESCE(c.costo_unitario, 0) AS costo_unitario,
        (v.cantidad_vendida * v.precio_venta) AS subtotal_ventas,
        (v.cantidad_vendida * COALESCE(c.costo_unitario, 0)) AS subtotal_inversion,
        ((v.cantidad_vendida * v.precio_venta) - (v.cantidad_vendida * COALESCE(c.costo_unitario, 0))) AS ganancia_neta
      FROM ventas_desglosadas v
      LEFT JOIN costos_productos c ON v.producto_id = c.producto_id
      ORDER BY ganancia_neta DESC;
    `;

    const result = await db.query(sql, params);

    const totales = {
      ventas_totales: result.rows.reduce((sum, r) => sum + parseFloat(r.subtotal_ventas), 0),
      inversion_total: result.rows.reduce((sum, r) => sum + parseFloat(r.subtotal_inversion), 0),
      ganancia_total: result.rows.reduce((sum, r) => sum + parseFloat(r.ganancia_neta), 0),
      productos_vendidos: result.rows.reduce((sum, r) => sum + parseInt(r.cantidad_vendida), 0) 
    };

    res.json({
      success: true,
      periodo: tipo,
      fecha_referencia: params[0],
      resumen: totales,
      detalles: result.rows
    });

  } catch (error) {
    console.error("ERROR AL GENERAR REPORTE:", error);
    res.status(500).json({ error: 'Error al procesar los datos de ventas.' });
  }
};