const db = require('../config/db');

exports.obtenerReporteVentas = async (req, res) => {
  const { tipo, fecha, clasificacion, tipo_consumo } = req.query; 
  
  try {
    // 1. OBTENER COSTOS DE RECETAS PARA CALCULAR INVERSIÓN
    const costosRes = await db.query(`
      SELECT r.producto_id, SUM((i.costo_presentacion / i.cantidad_presentacion) * r.cantidad_usada) AS costo_unitario
      FROM recetas r
      JOIN insumos i ON r.insumo_id = i.id
      GROUP BY r.producto_id
    `);
    const costoMap = new Map();
    costosRes.rows.forEach(r => costoMap.set(Number(r.producto_id), Number(r.costo_unitario)));

    // 2. CONSTRUIR FILTROS DE FECHA Y CONSUMO
    let queryTimeConsumo = '';
    let params = [];
    let paramIndex = 1;

    if (tipo === 'dia') {
      queryTimeConsumo += ` AND p.fecha_creacion::DATE = $${paramIndex}::DATE`;
      params.push(fecha || 'NOW()'); paramIndex++;
    } else if (tipo === 'semana') {
      queryTimeConsumo += ` AND p.fecha_creacion >= DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) + INTERVAL '1 week'`;
      params.push(fecha || 'NOW()'); paramIndex++;
    } else if (tipo === 'mes') {
      queryTimeConsumo += ` AND p.fecha_creacion >= DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) + INTERVAL '1 month'`;
      params.push(fecha || 'NOW()'); paramIndex++;
    } else if (tipo === 'anio') {
      queryTimeConsumo += ` AND p.fecha_creacion >= DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) AND p.fecha_creacion < DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) + INTERVAL '1 year'`;
      params.push(fecha || 'NOW()'); paramIndex++;
    } else if (tipo === 'historico') {
      queryTimeConsumo += ` AND TO_CHAR(p.fecha_creacion, 'MM-DD') = TO_CHAR($${paramIndex}::DATE, 'MM-DD')`;
      params.push(fecha); paramIndex++;
    }

    if (tipo_consumo && tipo_consumo !== 'Todos') {
      queryTimeConsumo += ` AND p.tipo_consumo = $${paramIndex}`;
      params.push(tipo_consumo); paramIndex++;
    }

    // 3. CONSULTAR TODOS LOS PEDIDOS VÁLIDOS
    const sqlPedidos = `
      SELECT id, numero_pedido, carrito, costo_envio, total, fecha_creacion
      FROM pedidos p
      WHERE estado_preparacion != 'Cancelado' ${queryTimeConsumo}
    `;
    const pedidosRes = await db.query(sqlPedidos, params);

    // 4. PROCESAMIENTO INTELIGENTE DEL CARRITO (JavaScript)
    const ventasObj = {}; // Almacenará los productos agrupados

    pedidosRes.rows.forEach(p => {
      let carrito = [];
      try { 
        carrito = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito; 
      } catch(e) {}
      
      if (!Array.isArray(carrito)) carrito = [];

      carrito.forEach(item => {
         let baseName = item.nombre || 'Desconocido';
         let pureBasePrice = Number(item.precio_base !== undefined ? item.precio_base : (item.precio || 0));
         let qty = Number(item.cantidad || 1);
         let finalBasePrice = pureBasePrice;
         
         let extraRows = [];

         // Analizamos los extras/modificadores
         if (Array.isArray(item.extras)) {
             item.extras.forEach(extra => {
                 const eName = (extra.nombre || '').trim();
                 const ePrice = Number(extra.precioExtra || extra.precio_extra || extra.precio || 0);
                 const eNameLower = eName.toLowerCase();

                 // A) IGNORAR: Notas, ingredientes removidos ("Sin ...", "❌", "📝")
                 if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) {
                     return; // No hace nada, lo salta por completo
                 }
                 
                 // B) FUSIONAR: Sabores y Tamaños ("🔸 Sabor: BBQ")
                 else if (eNameLower.includes('sabor:') || eNameLower.includes('tamaño:') || eNameLower.includes('🔸') || eNameLower.includes('🔹') || extra.tipo === 'variacion') {
                     // Limpiamos emojis y prefijos raros para que se lea bonito
                     const cleanVariationName = eName.replace(/[🔸🔹+]/g, '').trim();
                     baseName += ` (${cleanVariationName})`;
                     finalBasePrice += ePrice; // Sumamos el costo de la variación al platillo base
                 }
                 
                 // C) EXTRA REAL: Se muestra por separado (si tiene precio o es válido)
                 else {
                     const cleanExtraName = eName.replace(/^\+\s*/, '').trim(); // Quita el "+ " inicial
                     extraRows.push({
                         nombre: cleanExtraName,
                         precio: ePrice,
                         id: extra.id || 0
                     });
                 }
             });
         }

         // Guardar Platillo Base en el reporte
         const itemCat = item.categoria || item.clasificacion || 'Sin Categoría';
         if (!clasificacion || clasificacion === 'Todas' || clasificacion === itemCat) {
             const itemKey = `BAS_${baseName}_${finalBasePrice}`;
             if (!ventasObj[itemKey]) {
                 ventasObj[itemKey] = {
                     producto_nombre: baseName,
                     producto_id: item.id || 0,
                     precio_venta: finalBasePrice,
                     categoria: itemCat,
                     cantidad_vendida: 0
                 };
             }
             ventasObj[itemKey].cantidad_vendida += qty;
         }

         // Guardar Extras Reales en el reporte
         if (!clasificacion || clasificacion === 'Todas' || clasificacion === 'Extras') {
             extraRows.forEach(ext => {
                 // Solo guardamos si el extra generó dinero (precio > 0)
                 if(ext.precio > 0) { 
                     const extKey = `EXT_${ext.nombre}_${ext.precio}`;
                     if (!ventasObj[extKey]) {
                         ventasObj[extKey] = {
                             producto_nombre: ext.nombre,
                             producto_id: ext.id,
                             precio_venta: ext.precio,
                             categoria: 'Extras',
                             cantidad_vendida: 0
                         };
                     }
                     ventasObj[extKey].cantidad_vendida += qty;
                 }
             });
         }
      });

      // Guardar Costos de Envío
      if (!clasificacion || clasificacion === 'Todas' || clasificacion === 'Envíos') {
          if (Number(p.costo_envio) > 0) {
              const envKey = `ENV_${p.costo_envio}`;
              if (!ventasObj[envKey]) {
                  ventasObj[envKey] = {
                      producto_nombre: 'Envío a Domicilio',
                      producto_id: 0,
                      precio_venta: Number(p.costo_envio),
                      categoria: 'Envíos',
                      cantidad_vendida: 0
                  };
              }
              ventasObj[envKey].cantidad_vendida += 1; // Un envío por orden
          }
      }
    });

    // 5. ENSAMBLAR Y CALCULAR FINANZAS
    let detalles = Object.values(ventasObj).map(v => {
        let c_unitario = 0;
        if (v.categoria !== 'Extras' && v.categoria !== 'Envíos') {
            c_unitario = costoMap.get(Number(v.producto_id)) || 0;
        }
        return {
            ...v,
            costo_unitario: c_unitario,
            subtotal_ventas: v.cantidad_vendida * v.precio_venta,
            subtotal_inversion: v.cantidad_vendida * c_unitario,
            ganancia_neta: (v.cantidad_vendida * v.precio_venta) - (v.cantidad_vendida * c_unitario)
        };
    });

    // Ordenar: Platillos primero, luego Extras, luego Envíos. Dentro de cada uno, por ganancia.
    detalles.sort((a, b) => {
        const catA = a.categoria === 'Envíos' ? 3 : (a.categoria === 'Extras' ? 2 : 1);
        const catB = b.categoria === 'Envíos' ? 3 : (b.categoria === 'Extras' ? 2 : 1);
        if (catA !== catB) return catA - catB;
        return b.ganancia_neta - a.ganancia_neta;
    });

    const totales = {
      ventas_totales: detalles.reduce((sum, r) => sum + r.subtotal_ventas, 0),
      inversion_total: detalles.reduce((sum, r) => sum + r.subtotal_inversion, 0),
      ganancia_total: detalles.reduce((sum, r) => sum + r.ganancia_neta, 0),
      productos_vendidos: detalles.reduce((sum, r) => {
         if (r.categoria !== 'Extras' && r.categoria !== 'Envíos') return sum + r.cantidad_vendida;
         return sum;
      }, 0)
    };

    // 6. GENERAR INSIGHTS INTELIGENTES
    let insights = { 
      productoMasVendido: null, productoMenosVendido: null, productosCeroVentas: [], 
      promedioDiario: null, mejorDia: null, peorDia: null, mejorMes: null, peorMes: null 
    };

    const prodReales = detalles.filter(r => r.categoria !== 'Extras' && r.categoria !== 'Envíos');
    if (prodReales.length > 0) {
        const sorted = [...prodReales].sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);
        insights.productoMasVendido = sorted[0];
        insights.productoMenosVendido = sorted[sorted.length - 1];
    }

    // Calcular Cero Ventas (productos activos en menú que no están en la lista vendida)
    const idsVendidos = new Set(prodReales.map(r => Number(r.producto_id)));
    const sqlTodos = `SELECT id, nombre FROM productos WHERE estado = 'Activo' OR disponible = true`;
    const todosProds = await db.query(sqlTodos);
    insights.productosCeroVentas = todosProds.rows.filter(p => !idsVendidos.has(p.id)).map(p => p.nombre);

    // Calcular Mejores Días (Solucionado para evitar "Invalid Date")
    if (['semana', 'mes', 'anio'].includes(tipo)) {
        const sqlDias = `
          SELECT TO_CHAR(p.fecha_creacion, 'YYYY-MM-DD') as fecha_str, SUM(p.total) as total_dia 
          FROM pedidos p 
          WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} 
          GROUP BY TO_CHAR(p.fecha_creacion, 'YYYY-MM-DD') 
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

    res.json({ success: true, periodo: tipo, fecha_referencia: params[0], resumen: totales, detalles, insights });

  } catch (error) {
    console.error("ERROR AL GENERAR REPORTE:", error);
    res.status(500).json({ error: 'Error al procesar los datos de ventas.' });
  }
};