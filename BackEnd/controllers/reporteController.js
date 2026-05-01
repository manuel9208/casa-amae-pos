const db = require('../config/db');

exports.obtenerReporteVentas = async (req, res) => {
  // Recibimos el tipo de reporte (dia, semana, mes, anio, historico) y la fecha de referencia
  const { tipo, fecha } = req.query; 
  let queryExtra = '';
  let params = [];

  // 1. DEFINICIÓN DE RANGOS DE TIEMPO
  if (tipo === 'dia') {
    queryExtra = 'AND p.fecha_creacion::DATE = $1::DATE';
    params = [fecha || 'NOW()'];
  } else if (tipo === 'semana') {
    queryExtra = "AND p.fecha_creacion >= DATE_TRUNC('week', $1::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('week', $1::TIMESTAMP) + INTERVAL '1 week'";
    params = [fecha || 'NOW()'];
  } else if (tipo === 'mes') {
    queryExtra = "AND p.fecha_creacion >= DATE_TRUNC('month', $1::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('month', $1::TIMESTAMP) + INTERVAL '1 month'";
    params = [fecha || 'NOW()'];
  } else if (tipo === 'anio') {
    queryExtra = "AND p.fecha_creacion >= DATE_TRUNC('year', $1::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('year', $1::TIMESTAMP) + INTERVAL '1 year'";
    params = [fecha || 'NOW()'];
  } else if (tipo === 'historico') {
    // Para ver por ejemplo "Día de las madres" de cualquier año pasado
    queryExtra = "AND TO_CHAR(p.fecha_creacion, 'MM-DD') = TO_CHAR($1::DATE, 'MM-DD')";
    params = [fecha];
  }

  try {
    /**
     * EXPLICACIÓN DE LA CONSULTA (SÚPER BLINDADA):
     * 1. PRECIO: Buscamos primero 'precioFinal' (que incluye tamaños y extras). Si no está, 'precio_base', y si no, 'precio'.
     * 2. CANTIDAD: Sumamos la llave 'cantidad' si existe, de lo contrario vale 1. Así evitamos contar mal.
     * 3. COSTOS: Cruzamos con la tabla de recetas e insumos.
     */
    const sql = `
      WITH ventas_desglosadas AS (
        SELECT 
          (item->>'nombre')::varchar AS producto_nombre,
          (item->>'id')::integer AS producto_id,
          -- 👇 CORRECCIÓN 1: Prioridad absoluta al precioFinal (Dinero real pagado)
          COALESCE((item->>'precioFinal'), (item->>'precio_base'), (item->>'precio'), '0')::decimal AS precio_venta,
          -- 👇 CORRECCIÓN 2: Sumar la cantidad correctamente
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

    // Totales generales para el resumen del reporte
    const totales = {
      ventas_totales: result.rows.reduce((sum, r) => sum + parseFloat(r.subtotal_ventas), 0),
      inversion_total: result.rows.reduce((sum, r) => sum + parseFloat(r.subtotal_inversion), 0),
      ganancia_total: result.rows.reduce((sum, r) => sum + parseFloat(r.ganancia_neta), 0),
      productos_vendidos: result.rows.reduce((sum, r) => sum + parseInt(r.cantidad_vendida), 0) // ParseInt para asegurar que suma números
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