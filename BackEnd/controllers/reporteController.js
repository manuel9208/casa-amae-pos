const db = require('../config/db');

exports.obtenerReporteVentas = async (req, res) => {
  const { tipo, fecha, clasificacion, tipo_consumo } = req.query; 
  
  // 1. Filtros de Tiempo y Consumo (Aplican a toda la orden)
  let queryTimeConsumo = '';
  let params = [];
  let paramIndex = 1;

  if (tipo === 'dia') {
    queryTimeConsumo += ` AND p.fecha_creacion::DATE = $${paramIndex}::DATE`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'semana') {
    queryTimeConsumo += ` AND p.fecha_creacion >= DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) + INTERVAL '1 week'`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'mes') {
    queryTimeConsumo += ` AND p.fecha_creacion >= DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) + INTERVAL '1 month'`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'anio') {
    queryTimeConsumo += ` AND p.fecha_creacion >= DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) + INTERVAL '1 year'`;
    params.push(fecha || 'NOW()');
    paramIndex++;
  } else if (tipo === 'historico') {
    queryTimeConsumo += ` AND TO_CHAR(p.fecha_creacion, 'MM-DD') = TO_CHAR($${paramIndex}::DATE, 'MM-DD')`;
    params.push(fecha);
    paramIndex++;
  }

  if (tipo_consumo && tipo_consumo !== 'Todos') {
    queryTimeConsumo += ` AND p.tipo_consumo = $${paramIndex}`;
    params.push(tipo_consumo);
    paramIndex++;
  }

  // 2. Filtro de Clasificación (Aplica a la capa final desglosada)
  let queryClasificacion = '';
  if (clasificacion && clasificacion !== 'Todas') {
    queryClasificacion += ` AND categoria = $${paramIndex}`;
    params.push(clasificacion);
    paramIndex++;
  }

  try {
    // MAGIA SQL: Separamos el Platillo Base, los Extras, y los Gastos de Envío 
    const sql = `
      WITH base_items AS (
        SELECT 
          (item->>'nombre')::varchar AS producto_nombre,
          (item->>'id')::integer AS producto_id,
          COALESCE((item->>'precio_base'), (item->>'precio'), (item->>'precioFinal'), '0')::decimal AS precio_venta,
          COALESCE(item->>'categoria', item->>'clasificacion', 'Sin Categoría')::varchar AS categoria,
          COALESCE((item->>'cantidad')::integer, 1) AS cantidad
        FROM pedidos p, jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.carrito) = 'array' THEN p.carrito ELSE '[]'::jsonb END
        ) AS item
        WHERE p.estado_preparacion != 'Cancelado'
        ${queryTimeConsumo}
      ),
      extra_items AS (
        SELECT 
          (extra->>'nombre')::varchar AS producto_nombre,
          COALESCE((extra->>'id')::integer, 0) AS producto_id,
          COALESCE((extra->>'precioExtra'), (extra->>'precio_extra'), (extra->>'precio'), '0')::decimal AS precio_venta,
          'Extras'::varchar AS categoria,
          COALESCE((item->>'cantidad')::integer, 1) AS cantidad
        FROM pedidos p,
        jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.carrito) = 'array' THEN p.carrito ELSE '[]'::jsonb END
        ) AS item,
        jsonb_array_elements(
          CASE WHEN jsonb_typeof(item->'extras') = 'array' THEN item->'extras' ELSE '[]'::jsonb END
        ) AS extra
        WHERE p.estado_preparacion != 'Cancelado'
        ${queryTimeConsumo}
      ),
      envio_items AS (
        SELECT 
          'Envío a Domicilio'::varchar AS producto_nombre,
          0 AS producto_id,
          p.costo_envio::decimal AS precio_venta,
          'Envíos'::varchar AS categoria,
          1 AS cantidad
        FROM pedidos p
        WHERE p.estado_preparacion != 'Cancelado'
          AND COALESCE(p.costo_envio, 0) > 0
        ${queryTimeConsumo}
      ),
      todos_los_items AS (
        SELECT * FROM base_items
        UNION ALL
        SELECT * FROM extra_items
        UNION ALL
        SELECT * FROM envio_items
      ),
      ventas_desglosadas AS (
        SELECT 
          producto_nombre,
          producto_id,
          precio_venta,
          categoria,
          SUM(cantidad)::integer AS cantidad_vendida
        FROM todos_los_items
        WHERE 1=1 ${queryClasificacion}
        GROUP BY 1, 2, 3, 4
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
        ((v.cantidad_vendida * v.precio_venta) - (v.cantidad_vendida * COALESCE(c.costo_unitario, 0))) AS ganancia_neta,
        v.categoria
      FROM ventas_desglosadas v
      LEFT JOIN costos_productos c ON v.producto_id = c.producto_id
      ORDER BY 
        CASE 
           WHEN v.categoria = 'Envíos' THEN 3 
           WHEN v.categoria = 'Extras' THEN 2 
           ELSE 1 
        END ASC,
        ganancia_neta DESC;
    `;

    const result = await db.query(sql, params);

    const totales = {
      ventas_totales: result.rows.reduce((sum, r) => sum + parseFloat(r.subtotal_ventas), 0),
      inversion_total: result.rows.reduce((sum, r) => sum + parseFloat(r.subtotal_inversion), 0),
      ganancia_total: result.rows.reduce((sum, r) => sum + parseFloat(r.ganancia_neta), 0),
      productos_vendidos: result.rows.reduce((sum, r) => {
         if (r.categoria !== 'Extras' && r.categoria !== 'Envíos') return sum + parseInt(r.cantidad_vendida);
         return sum;
      }, 0) 
    };

    // 👇 =====================================================================
    // NUEVO: GENERACIÓN DE INSIGHTS (ANÁLISIS INTELIGENTE)
    // =====================================================================
    let insights = {
        productoMasVendido: null,
        productoMenosVendido: null,
        productosCeroVentas: [],
        promedioDiario: null,
        mejorDia: null,
        peorDia: null,
        mejorMes: null,
        peorMes: null
    };

    // A. PRODUCTOS MÁS Y MENOS VENDIDOS
    const productosReales = result.rows.filter(r => r.categoria !== 'Extras' && r.categoria !== 'Envíos');
    if (productosReales.length > 0) {
        const sorted = [...productosReales].sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);
        insights.productoMasVendido = sorted[0];
        insights.productoMenosVendido = sorted[sorted.length - 1];
    }

    // B. PRODUCTOS CON CERO VENTAS (Los que están en el menú pero no se vendieron)
    const sqlCero = `
        SELECT nombre FROM productos 
        WHERE id NOT IN (
            SELECT (item->>'id')::integer 
            FROM pedidos p, 
            jsonb_array_elements(CASE WHEN jsonb_typeof(p.carrito) = 'array' THEN p.carrito ELSE '[]'::jsonb END) AS item 
            WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} AND item->>'id' IS NOT NULL
        )
    `;
    const resultCero = await db.query(sqlCero, params);
    insights.productosCeroVentas = resultCero.rows.map(r => r.nombre);

    // C. ANÁLISIS DIARIO (Solo para Semana, Mes o Año)
    if (['semana', 'mes', 'anio'].includes(tipo)) {
        const sqlDias = `
            SELECT DATE(p.fecha_creacion) as fecha, SUM(p.total) as total_dia 
            FROM pedidos p 
            WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} 
            GROUP BY DATE(p.fecha_creacion) 
            ORDER BY total_dia DESC
        `;
        const resDias = await db.query(sqlDias, params);
        if(resDias.rows.length > 0){
            insights.mejorDia = resDias.rows[0];
            insights.peorDia = resDias.rows[resDias.rows.length - 1];
            const sum = resDias.rows.reduce((s, r) => s + parseFloat(r.total_dia), 0);
            insights.promedioDiario = sum / resDias.rows.length;
        }
    }

    // D. ANÁLISIS MENSUAL (Solo para Año)
    if (tipo === 'anio') {
        const sqlMeses = `
            SELECT TO_CHAR(p.fecha_creacion, 'MM') as mes, SUM(p.total) as total_mes 
            FROM pedidos p 
            WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} 
            GROUP BY TO_CHAR(p.fecha_creacion, 'MM') 
            ORDER BY total_mes DESC
        `;
        const resMeses = await db.query(sqlMeses, params);
        if(resMeses.rows.length > 0){
             const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
             insights.mejorMes = { mes: nombresMeses[parseInt(resMeses.rows[0].mes) - 1], total: resMeses.rows[0].total_mes };
             insights.peorMes = { mes: nombresMeses[parseInt(resMeses.rows[resMeses.rows.length - 1].mes) - 1], total: resMeses.rows[resMeses.rows.length - 1].total_mes };
        }
    }

    res.json({
      success: true,
      periodo: tipo,
      fecha_referencia: params[0],
      resumen: totales,
      detalles: result.rows,
      insights: insights // 👈 Enviamos los insights calculados
    });

  } catch (error) {
    console.error("ERROR AL GENERAR REPORTE:", error);
    res.status(500).json({ error: 'Error al procesar los datos de ventas.' });
  }
};