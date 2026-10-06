const db = require('../config/db');

// 💡 MEJORA #4: Caché en memoria para periodos históricos CERRADOS del reporte de
// Ventas (Hace 1 Semana, Hace 1 Mes, Año Anterior, etc.). Mismo patrón que
// "respuestasCache" en iaController.js: Map en memoria + expiración por timestamp.
// El periodo ACTUAL (Hoy/Esta Semana/Este Mes/Este Año) NUNCA se cachea, porque
// cambia con cada pedido nuevo en tiempo real.
const comparativasCache = new Map();

exports.obtenerReporteVentas = async (req, res) => {
  const { tipo, fecha, fechaFin, clasificacion, tipo_consumo } = req.query; 
  
  try {
    // 👇 FIX RAÍZ: hora_apertura/hora_cierre eran columnas huérfanas, nunca conectadas
    // al horario real que se configura en "Horario Operativo Semanal" (horarios_semana).
    // Ahora calculamos la ventana operativa real como la unión de la apertura más
    // temprana y el cierre más tardío entre los días activos de la semana.
    const configRes = await db.query('SELECT horarios_semana FROM configuracion WHERE id = 1');
    let horariosSemana = {};
    try {
        const raw = configRes.rows[0]?.horarios_semana;
        horariosSemana = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    } catch (e) { horariosSemana = {}; }

    let horaAperturaDB = 8;
    let horaCierreDB = 22;
    const aperturas = [];
    const cierres = [];
    Object.values(horariosSemana).forEach(dia => {
        if (dia && dia.activo !== false && dia.apertura && dia.cierre) {
            const hA = parseInt(String(dia.apertura).split(':')[0], 10);
            const hC = parseInt(String(dia.cierre).split(':')[0], 10);
            if (!isNaN(hA)) aperturas.push(hA);
            if (!isNaN(hC)) cierres.push(hC);
        }
    });
    if (aperturas.length > 0) horaAperturaDB = Math.min(...aperturas);
    if (cierres.length > 0) horaCierreDB = Math.max(...cierres);

    // 💡 MÓDULO AISLADO: Factor Luz/Agua configurable (antes hardcodeado como * 1.15)
    let porcentajeLuzAgua = 15;
    try {
        const factorRes = await db.query(`SELECT porcentaje FROM configuracion_financiera WHERE clave = 'factor_luz_agua' LIMIT 1`);
        if (factorRes.rows.length > 0 && factorRes.rows[0].porcentaje !== null) {
            porcentajeLuzAgua = Number(factorRes.rows[0].porcentaje);
        }
    } catch (e) { /* Si la tabla aún no existe, se mantiene el 15% por defecto */ }

    const costosRes = await db.query(`
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
              r.producto_id AS root_producto_id, r.insumo_id, r.sub_producto_id, r.cantidad_usada::numeric AS qty_factor, 1 as depth
          FROM recetas r
          UNION ALL
          SELECT 
              e.root_producto_id, r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric, e.depth + 1
          FROM Explosion e
          JOIN productos p ON e.sub_producto_id = p.id
          JOIN recetas r ON r.producto_id = p.id
          WHERE e.sub_producto_id IS NOT NULL AND e.depth < 10
      )
      SELECT 
          e.root_producto_id as producto_id,
          (
              (
                  COALESCE(SUM(CASE WHEN e.insumo_id IS NOT NULL THEN 
                      ((i.costo_presentacion::numeric / COALESCE(NULLIF(i.cantidad_presentacion::numeric, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento::numeric, 0), 1)) * e.qty_factor
                  ELSE 0 END), 0)
                  +
                  COALESCE(SUM(CASE WHEN e.sub_producto_id IS NOT NULL THEN 
                      (ec_sub.costo_empaques_batch / COALESCE(NULLIF(p_sub.rendimiento::numeric, 0), 1)) * e.qty_factor
                  ELSE 0 END), 0)
              ) / COALESCE(NULLIF(MAX(p_root.rendimiento::numeric), 0), 1)
              +
              COALESCE(MAX(ec_root.costo_empaques_batch), 0)
          ) as costo_base_crudo
      FROM Explosion e
      LEFT JOIN insumos i ON e.insumo_id = i.id
      LEFT JOIN productos p_sub ON e.sub_producto_id = p_sub.id
      LEFT JOIN productos p_root ON e.root_producto_id = p_root.id
      LEFT JOIN EmpaquesCosto ec_sub ON e.sub_producto_id = ec_sub.producto_id
      LEFT JOIN EmpaquesCosto ec_root ON e.root_producto_id = ec_root.producto_id
      GROUP BY e.root_producto_id;
    `);
    
    const costoMap = new Map();
    costosRes.rows.forEach(r => {
        const costoBase = Number(r.costo_base_crudo) || 0;
        const costoRealFinal = costoBase * (1 + (porcentajeLuzAgua / 100)); 
        costoMap.set(Number(r.producto_id), Number(costoRealFinal));
    });

    let queryTimeConsumo = '';
    let params = [];
    let paramIndex = 1;

    if (tipo === 'dia' || tipo === 'historico') {
      queryTimeConsumo += ` AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE = $${paramIndex}::DATE`;
      params.push(fecha || 'NOW()'); paramIndex++;
    } else if (tipo === 'rango') {
      queryTimeConsumo += ` AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE >= $${paramIndex}::DATE AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE <= $${paramIndex + 1}::DATE`;
      params.push(fecha || 'NOW()');
      params.push(fechaFin || fecha || 'NOW()');
      paramIndex += 2;
    } else if (tipo === 'semana') {
      queryTimeConsumo += ` AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') >= DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') < DATE_TRUNC('week', $${paramIndex}::TIMESTAMP) + INTERVAL '1 week'`;
      params.push(fecha || 'NOW()'); paramIndex++;
    } else if (tipo === 'mes') {
      queryTimeConsumo += ` AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') >= DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') < DATE_TRUNC('month', $${paramIndex}::TIMESTAMP) + INTERVAL '1 month'`;
      params.push(fecha || 'NOW()'); paramIndex++;
    } else if (tipo === 'anio') {
      queryTimeConsumo += ` AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') >= DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') < DATE_TRUNC('year', $${paramIndex}::TIMESTAMP) + INTERVAL '1 year'`;
      params.push(fecha || 'NOW()'); paramIndex++;
    }

    if (tipo_consumo && tipo_consumo !== 'Todos') {
      queryTimeConsumo += ` AND p.tipo_consumo = $${paramIndex}`;
      params.push(tipo_consumo); paramIndex++;
    }

    const sqlPedidos = `
      SELECT id, numero_pedido, carrito, costo_envio, total, fecha_creacion, metodo_pago, pagos_mixtos
      FROM pedidos p
      WHERE estado_preparacion != 'Cancelado' ${queryTimeConsumo}
    `;
    const pedidosRes = await db.query(sqlPedidos, params);

    const sqlTodos = `SELECT id, nombre FROM productos`;
    const todosProds = await db.query(sqlTodos);
    const productDict = {};
    const productNameDict = {};
    todosProds.rows.forEach(p => { 
        productDict[p.nombre.toLowerCase().trim()] = p.id; 
        productNameDict[p.id] = p.nombre.trim();
    });

    const ventasObj = {}; 
    const comedorObj = {}; 
    
    let t_efectivo = 0; let t_tarjeta = 0; let t_transf = 0; let t_envio = 0;
    
    const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;

    const catFiltro = (clasificacion || 'Todas').trim().toLowerCase();

    // ===============================================
    // CÁLCULO DE VENTAS DEL RESTAURANTE
    // ===============================================
    pedidosRes.rows.forEach(p => {
      t_envio += parseMoney(p.costo_envio);
      if (p.metodo_pago === 'Efectivo') t_efectivo += parseMoney(p.total);
      if (p.metodo_pago === 'Tarjeta') t_tarjeta += parseMoney(p.total);
      if (p.metodo_pago === 'Transferencia') t_transf += parseMoney(p.total);
      
      // 👇 FIX MÁSTER: Escudo protector contra pagos mixtos corruptos en el backend
      if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
        try {
            let pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
            if (typeof pm === 'string') pm = JSON.parse(pm); // Doble parseo de seguridad
            
            if (Array.isArray(pm)) {
                pm.forEach(x => {
                    if(x.metodo === 'Efectivo') t_efectivo += parseMoney(x.monto);
                    if(x.metodo === 'Tarjeta') t_tarjeta += parseMoney(x.monto);
                    if(x.metodo === 'Transferencia') t_transf += parseMoney(x.monto);
                });
            }
        } catch(e) {
            console.error("Dato corrupto evadido en reporte de ventas:", e);
        }
      }

      let carrito = [];
      let order_gross = parseMoney(p.costo_envio);

      if (Array.isArray(p.carrito)) {
          carrito = p.carrito;
      } else if (typeof p.carrito === 'string') {
          try { carrito = JSON.parse(p.carrito); } catch(e) {}
      }

      const isComedor = p.metodo_pago === 'Comida Personal';
      let itemsTemporales = [];

      carrito.forEach(item => {
         let baseName = item.nombre || 'Desconocido';
         baseName = baseName.replace(/^\[.*?\]\s*/, '').trim(); 
         
         let pId = Number(item.id) || 0;
         if (pId === 0) pId = productDict[baseName.split('(')[0].trim().toLowerCase()] || 0;

         let realBaseName = baseName.split('(')[0].trim();
         if (pId > 0 && productNameDict[pId]) {
             realBaseName = productNameDict[pId];
         }

         let cleanName = realBaseName;

         const parentesisBlocks = baseName.match(/\(([^)]+)\)/g) || [];
         parentesisBlocks.forEach(block => {
             const innerText = block.replace(/[()]/g, '').trim().toLowerCase();
             const isVitalVariation = ['tamaño', 'tamano', 'presentacion', 'presentación', 'sabor', 'tipo'].some(k => innerText.includes(k)) ||
                              ['grande', 'mediano', 'chico', 'jumbo', 'familiar', 'sencillo', 'doble', 'crepa', 'waffle', 'baguette', 'panini', 'tortuga', 'torta', 'taco', 'burrito', 'original', 'clásico', 'clasico'].some(k => innerText === k || innerText.includes(` ${k}`) || innerText.startsWith(`${k} `));

             if (isVitalVariation) {
                 let cleanBlock = block.replace(/\(|\)/g, '');
                 cleanBlock = cleanBlock.replace(/PRESENTACION:\s*/i, '')
                                        .replace(/TAMAÑO:\s*/i, '')
                                        .replace(/TAMANO:\s*/i, '')
                                        .replace(/TIPO:\s*/i, '')
                                        .replace(/SABOR:\s*/i, '');
                 if (!cleanName.toLowerCase().includes(cleanBlock.toLowerCase().trim())) {
                     cleanName += ` (${cleanBlock.trim()})`;
                 }
             }
         });

         let rawPrice = parseMoney(item.precioFinal || item.precio_base || item.precio);
         let qty = parseMoney(item.cantidad) || 1;
         let exP = 0;
         let extraRows = [];
         
         order_gross += rawPrice * qty;

         if (Array.isArray(item.extras)) {
             item.extras.forEach(extra => {
                 const eName = (extra.nombre || '').trim();
                 const ePrice = parseMoney(extra.precioExtra || extra.precio_extra || extra.precio);
                 const eNameLower = eName.toLowerCase();

                 if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) {
                     return; 
                 }

                 const isVitalVariation = ['tamaño', 'tamano', 'presentacion', 'presentación', 'sabor', 'tipo'].some(k => eNameLower.includes(k)) ||
                              ['grande', 'mediano', 'chico', 'jumbo', 'familiar', 'sencillo', 'doble', 'crepa', 'waffle', 'baguette', 'panini', 'tortuga', 'torta', 'taco', 'burrito', 'original', 'clásico', 'clasico'].some(k => eNameLower === k || eNameLower.includes(` ${k}`) || eNameLower.startsWith(`${k} `));

                 if (isVitalVariation) {
                     let cleanVariationName = eName.replace(/[🔸🔹+]/g, '').trim();
                     cleanVariationName = cleanVariationName.replace(/PRESENTACION:\s*/i, '')
                                        .replace(/TAMAÑO:\s*/i, '')
                                        .replace(/TAMANO:\s*/i, '')
                                        .replace(/TIPO:\s*/i, '')
                                        .replace(/SABOR:\s*/i, '');
                     if (!cleanName.toLowerCase().includes(cleanVariationName.toLowerCase().trim())) {
                         cleanName += ` (${cleanVariationName.trim()})`;
                     }
                 } else {
                     if (ePrice > 0) {
                         const cleanExtraName = eName.replace(/^\+\s*/, '').trim(); 
                         exP += ePrice;
                         extraRows.push({ nombre: cleanExtraName, precio: ePrice, id: extra.id || 0 });
                     }
                 }
             });
         }

         let finalBasePrice = rawPrice - exP;
         if (finalBasePrice < 0) finalBasePrice = 0;

         let itemCat = item.categoria || item.clasificacion;
         if (!itemCat && item.nombre && item.nombre.startsWith('[')) {
             const match = item.nombre.match(/\[(.*?)\]/);
             if (match) itemCat = match[1];
         }
         itemCat = itemCat || 'Sin Categoría';

         itemsTemporales.push({
             pId, cleanName, finalBasePrice, itemCat, qty, extraRows, rawPrice
         });
      });
      
      const totalPagado = parseMoney(p.total);
      const discount = isComedor ? 0 : Math.max(0, order_gross - totalPagado);

      itemsTemporales.forEach(t => {
          const targetObj = isComedor ? comedorObj : ventasObj;
          const catItemLimpia = t.itemCat.trim().toLowerCase();
          const pasaFiltro = catFiltro === 'todas' || catFiltro === catItemLimpia;

          const item_gross_base = t.finalBasePrice * t.qty;
          const item_gross_total = t.rawPrice * t.qty;

          if (pasaFiltro) {
              const itemKey = `ID_${t.pId}_P_${t.finalBasePrice}_N_${t.cleanName}`;
              if (!targetObj[itemKey]) {
                  targetObj[itemKey] = {
                      producto_nombre: t.cleanName, 
                      producto_id: t.pId, 
                      precio_venta: t.finalBasePrice, 
                      categoria: t.itemCat, 
                      cantidad_vendida: 0,
                      descuentos_aplicados: 0
                  };
              }
              targetObj[itemKey].cantidad_vendida += t.qty;

              if (!isComedor) {
                  const propGlobal = order_gross > 0 ? (item_gross_total / order_gross) : 0;
                  const propBase = item_gross_total > 0 ? (item_gross_base / item_gross_total) : 0;
                  targetObj[itemKey].descuentos_aplicados += (discount * propGlobal * propBase);
              }
          }

          if (catFiltro === 'todas' || catFiltro === 'extras') {
              t.extraRows.forEach(ext => {
                  if(ext.precio > 0 || isComedor) { 
                      const extKey = `EXT_${ext.nombre}_${ext.precio}`;
                      if (!targetObj[extKey]) {
                          targetObj[extKey] = {
                              producto_nombre: ext.nombre, 
                              producto_id: ext.id,
                              precio_venta: ext.precio, 
                              categoria: 'Extras', 
                              cantidad_vendida: 0,
                              descuentos_aplicados: 0
                          };
                      }
                      targetObj[extKey].cantidad_vendida += t.qty;

                      if (!isComedor) {
                          const ext_gross = ext.precio * t.qty;
                          const propGlobal = order_gross > 0 ? (item_gross_total / order_gross) : 0;
                          const propExt = item_gross_total > 0 ? (ext_gross / item_gross_total) : 0;
                          targetObj[extKey].descuentos_aplicados += (discount * propGlobal * propExt);
                      }
                  }
              });
          }
      });

      if (catFiltro === 'todas' || catFiltro === 'envíos') {
          const costoEnv = parseMoney(p.costo_envio);
          if (costoEnv > 0) {
              const envKey = `ENV_${costoEnv}`;
              if (!ventasObj[envKey]) {
                  ventasObj[envKey] = {
                      producto_nombre: 'Envío a Domicilio', producto_id: 0,
                      precio_venta: costoEnv, categoria: 'Envíos', cantidad_vendida: 0,
                      descuentos_aplicados: 0
                  };
              }
              ventasObj[envKey].cantidad_vendida += 1; 

              if (!isComedor) {
                  const propGlobal = order_gross > 0 ? (costoEnv / order_gross) : 0;
                  ventasObj[envKey].descuentos_aplicados += (discount * propGlobal);
              }
          }
      }
    });

    let detalles = Object.values(ventasObj).map(v => {
        let c_unitario = 0;
        
        // 👇 B2B ELIMINADO TOTALMENTE. CÁLCULO DIRECTO.
        if (v.categoria !== 'Extras' && v.categoria !== 'Envíos') {
            c_unitario = costoMap.get(Number(v.producto_id)) || 0;
        }  

        const descProp = Number(v.descuentos_aplicados || 0);
        const subVentas = Number(v.cantidad_vendida) * Number(v.precio_venta);
        const subInversion = Number(v.cantidad_vendida) * Number(c_unitario);  

        return {
            ...v,
            costo_unitario: Number(c_unitario),
            descuentos_aplicados: descProp,
            subtotal_ventas: subVentas,
            subtotal_inversion: subInversion,
            ganancia_neta: subVentas - descProp - subInversion
        };
    });

    let detalles_comedor = Object.values(comedorObj).map(v => {
        let c_unitario = 0;
        if (v.categoria !== 'Extras' && v.categoria !== 'Envíos') {
            c_unitario = costoMap.get(Number(v.producto_id)) || 0;
        }
        
        const subInversion = Number(v.cantidad_vendida) * Number(c_unitario);

        return {
            ...v,
            categoria: 'Comedor', 
            categoria_original: v.categoria,
            costo_unitario: Number(c_unitario),
            descuentos_aplicados: 0,
            subtotal_ventas: 0, 
            valor_prestacion: Number(v.cantidad_vendida) * Number(v.precio_venta), 
            subtotal_inversion: subInversion,
            ganancia_neta: -subInversion 
        };
    });

    detalles = [...detalles, ...detalles_comedor];
    detalles.sort((a, b) => {
        const catA = a.categoria === 'Comedor' ? 5 : (a.categoria === 'Envíos' ? 4 : (a.categoria === 'Extras' ? 3 : 2));
        const catB = b.categoria === 'Comedor' ? 5 : (b.categoria === 'Envíos' ? 4 : (b.categoria === 'Extras' ? 3 : 2));
        if (catA !== catB) return catA - catB;
        return b.ganancia_neta - a.ganancia_neta;
    });

    let t_fondo = 0; let t_gastos = 0;
    try {
        const hcRes = await db.query(`SELECT * FROM historico_cortes WHERE 1=1 ${queryTimeConsumo.replace(/p\.fecha_creacion/g, 'fecha_corte')}`);
        hcRes.rows.forEach(row => {
            if(row.fondo_inicial) t_fondo += Number(row.fondo_inicial);
            if(row.total_gastos) t_gastos += Number(row.total_gastos);
        });
    } catch(e) {}

    let t_platillos = detalles.filter(d => d.categoria !== 'Extras' && d.categoria !== 'Envíos' && d.categoria !== 'Comedor').reduce((s,d) => s + d.subtotal_ventas, 0);
    let t_extras = detalles.filter(d => d.categoria === 'Extras').reduce((s,d) => s + d.subtotal_ventas, 0);

    const corteCaja = {
        venta_platillos: t_platillos,
        ingresos_extras: t_extras,
        cargos_envio: t_envio,
        fondo_caja: t_fondo,
        efectivo_fisico: t_efectivo,
        gastos_compras: t_gastos,
        tarjetas: t_tarjeta,
        transferencias: t_transf,
        efectivo_en_cajon: (t_fondo + t_efectivo) - t_gastos
    };

    const ventas_brutas_totales = detalles.reduce((sum, r) => sum + r.subtotal_ventas, 0);
    const descuentos_filtrados = detalles.reduce((sum, r) => sum + Number(r.descuentos_aplicados || 0), 0);

    const totales = {
      ventas_totales: ventas_brutas_totales,
      descuentos_otorgados: descuentos_filtrados,
      ingreso_neto_real: ventas_brutas_totales - descuentos_filtrados,
      inversion_total: detalles.reduce((sum, r) => sum + r.subtotal_inversion, 0),
      ganancia_total: detalles.reduce((sum, r) => sum + r.ganancia_neta, 0),
      productos_vendidos: detalles.reduce((sum, r) => {
         if (r.categoria !== 'Extras' && r.categoria !== 'Envíos' && r.categoria !== 'Comedor') return sum + r.cantidad_vendida;
         return sum;
      }, 0),
      ...corteCaja 
    };

    let insights = { productoMasVendido: null, productoMenosVendido: null, productosCeroVentasHoy: [], productosCeroVentasAyer: [], promedioDiario: null, mejorDia: null, peorDia: null, mejorMes: null, peorMes: null };

    const prodReales = detalles.filter(r => r.categoria !== 'Extras' && r.categoria !== 'Envíos' && r.categoria !== 'Comedor');
    if (prodReales.length > 0) {
        const sorted = [...prodReales].sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);
        insights.productoMasVendido = sorted[0];
        insights.productoMenosVendido = sorted[sorted.length - 1];
    }

    const idsVendidosHoy = new Set(prodReales.map(r => Number(r.producto_id)));
    insights.productosCeroVentasHoy = todosProds.rows.filter(p => !idsVendidosHoy.has(p.id)).map(p => p.nombre);

    try {
        const ayerRes = await db.query(`
            SELECT carrito FROM pedidos 
            WHERE estado_preparacion != 'Cancelado' 
            AND (fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE = ($1::DATE - INTERVAL '1 day')
        `, [fecha || 'NOW()']);
        
        let idsVendidosAyer = new Set();
        ayerRes.rows.forEach(p => {
            let car = []; try { car = typeof p.carrito === 'string' ? JSON.parse(p.carrito): p.carrito; } catch(e){}
            car.forEach(i => { 
                const cat = i.categoria || i.clasificacion || '';
                if (cat !== 'Extras' && cat !== 'Envíos') idsVendidosAyer.add(Number(i.id)); 
            });
        });
        insights.productosCeroVentasAyer = todosProds.rows.filter(p => !idsVendidosAyer.has(p.id)).map(p => p.nombre);
    } catch(errAyer) {}

    if (['semana', 'mes', 'anio'].includes(tipo)) {
        const sqlDias = `SELECT TO_CHAR((p.fecha_creacion AT TIME ZONE 'America/Mazatlan'), 'YYYY-MM-DD') as fecha_str, SUM(p.total) as total_dia FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} GROUP BY TO_CHAR((p.fecha_creacion AT TIME ZONE 'America/Mazatlan'), 'YYYY-MM-DD') ORDER BY total_dia DESC`;
        const resDias = await db.query(sqlDias, params);
        if(resDias.rows.length > 0){
            insights.mejorDia = resDias.rows[0]; insights.peorDia = resDias.rows[resDias.rows.length - 1];
            insights.promedioDiario = resDias.rows.reduce((s, r) => s + parseFloat(r.total_dia), 0) / resDias.rows.length;
        }
    }

    if (tipo === 'anio') {
        const sqlMeses = `SELECT TO_CHAR((p.fecha_creacion AT TIME ZONE 'America/Mazatlan'), 'MM') as mes, SUM(p.total) as total_mes FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} GROUP BY TO_CHAR((p.fecha_creacion AT TIME ZONE 'America/Mazatlan'), 'MM') ORDER BY total_mes DESC`;
        const resMeses = await db.query(sqlMeses, params);
        if(resMeses.rows.length > 0){
             const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
             insights.mejorMes = { mes: nombresMeses[parseInt(resMeses.rows[0].mes) - 1], total: resMeses.rows[0].total_mes };
             insights.peorMes = { mes: nombresMeses[parseInt(resMeses.rows[resMeses.rows.length - 1].mes) - 1], total: resMeses.rows[resMeses.rows.length - 1].total_mes };
        }
    }

    // 👇 NUEVO: Mapa de día ISODOW -> nombre, para resolver el horario EXACTO
    // del día de la semana que le corresponde a cada fecha puntual (Hoy, Hace 1
    // Semana, etc.), en vez de usar un rango "global" (min apertura/max cierre
    // de TODA la semana) que distorsiona días que cierran más temprano.
    const diasMapaHorario = { '1':'Lunes','2':'Martes','3':'Miércoles','4':'Jueves','5':'Viernes','6':'Sábado','7':'Domingo' };

    const obtenerHorarioDelDia = async (fechaSqlExpr) => {
        try {
            const r = await db.query(`SELECT EXTRACT(ISODOW FROM (${fechaSqlExpr})) as dow`, [fecha || 'NOW()']);
            const dow = r.rows[0]?.dow?.toString();
            const diaNombre = diasMapaHorario[dow];
            const diaConf = horariosSemana[diaNombre];
            if (diaConf && diaConf.activo !== false && diaConf.apertura && diaConf.cierre) {
                const hA = parseInt(String(diaConf.apertura).split(':')[0], 10);
                const hC = parseInt(String(diaConf.cierre).split(':')[0], 10);
                return {
                    apertura: !isNaN(hA) ? hA : horaAperturaDB,
                    cierre: !isNaN(hC) ? hC : horaCierreDB
                };
            }
        } catch (e) {}
        return { apertura: horaAperturaDB, cierre: horaCierreDB };
    };

    let comparativas = [];
    try {
        const processRange = async (label, inicioSql, finSql, esUnSoloDia = false, esHistorico = false) => {
            // 💡 MEJORA #4: Si es un periodo histórico cerrado (ej. "Hace 1 Semana"),
            // revisamos primero el caché antes de pegarle a la BD y recalcular todo.
            const cacheKeyStr = `comparativa_${tipo}_${fecha || 'NOW'}_${label}`;
            if (esHistorico && comparativasCache.has(cacheKeyStr)) {
                const cacheado = comparativasCache.get(cacheKeyStr);
                if (Date.now() - cacheado.timestamp < 1800000) { // 30 minutos, mismo TTL que iaController.js
                    console.log(`⚡ Sirviendo comparativa desde Caché: ${cacheKeyStr}`);
                    return cacheado.data;
                } else {
                    comparativasCache.delete(cacheKeyStr);
                }
            }

            const boundsRes = await db.query(`SELECT TO_CHAR(${inicioSql}, 'DD/MM/YYYY') as fecha_inicio, TO_CHAR((${finSql}) - INTERVAL '1 second', 'DD/MM/YYYY') as fecha_fin`, [fecha || 'NOW()']);
            
            const res = await db.query(`SELECT p.fecha_creacion, p.carrito, p.costo_envio, EXTRACT(HOUR FROM (p.fecha_creacion AT TIME ZONE 'America/Mazatlan')) as hora_local FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') >= (${inicioSql}) AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan') < (${finSql})`, [fecha || 'NOW()']);

            let totalPlatillos = 0; let horas = Array(24).fill(0);
            // 💡 MEJORA #2: Acumuladores monetarios aproximados para el indicador
            // de tendencia ↑/↓ en ResumenFinanciero.js (Ingresos Brutos, Inversión,
            // Ganancia). Reutilizan el mismo costoMap ya calculado al inicio de
            // esta función, sin pegarle de nuevo a la base de datos.
            let totalVentasPeriodo = 0; let totalInversionPeriodo = 0;
            // 👇 FIX RAÍZ: Si es un solo día (Hoy, Hace 1 Semana, Hace 1 Mes, Hace 1
            // Año en modo "dia"), usamos el horario EXACTO configurado para ESE día
            // de la semana puntual, no el máximo/mínimo de toda la semana combinada.
            let minHoraDelRango = horaAperturaDB;
            let maxHoraDelRango = horaCierreDB;
            if (esUnSoloDia) {
                const horarioEspecifico = await obtenerHorarioDelDia(inicioSql);
                minHoraDelRango = horarioEspecifico.apertura;
                maxHoraDelRango = horarioEspecifico.cierre;
            }
            // 👇 FIX RAÍZ: Cada franja se etiqueta como "hora i a hora i+1", así que
            // la ÚLTIMA franja válida debe EMPEZAR una hora antes del cierre real
            // (ej. si cierras a las 10 PM, la última franja debe ser "9 PM a 10 PM",
            // no "10 PM a 11 PM"). Por eso restamos 1 al tope superior del rango.
            maxHoraDelRango = Math.max(minHoraDelRango, maxHoraDelRango - 1);

            // 👇 NUEVO: Acumula aparte las ventas que caen FUERA del horario
            // actual (ej. un pedido a la 1 AM), sin que contaminen "Hora Muerta".
            let totalPlatillosFueraHorario = 0;
            const horasFueraDetalle = {};

            res.rows.forEach(p => {
                const hora = Number(p.hora_local);

                let carrito = []; try { carrito = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito; } catch(e){}
                if(!Array.isArray(carrito)) carrito = [];

                // 💡 MEJORA #2: Ingreso bruto aproximado del envío de esta orden
                totalVentasPeriodo += parseMoney(p.costo_envio);

                carrito.forEach(item => {
                    const cat = item.categoria || item.clasificacion || '';
                    const qty = parseMoney(item.cantidad) || 1;

                    // 💡 MEJORA #2: Ingreso bruto aproximado (incluye Platillos, Extras y
                    // Envíos, mismo criterio que "Ingresos Brutos" del periodo actual)
                    const rawPrice = parseMoney(item.precioFinal || item.precio_base || item.precio);
                    totalVentasPeriodo += rawPrice * qty;

                    if (cat !== 'Extras' && cat !== 'Envíos') {
                        totalPlatillos += qty;

                        // 💡 MEJORA #2: Inversión aproximada usando el costoMap ya calculado
                        const pId = Number(item.id) || 0;
                        totalInversionPeriodo += (costoMap.get(pId) || 0) * qty;

                        if (hora >= minHoraDelRango && hora <= maxHoraDelRango) {
                            horas[hora] += qty;
                        } else {
                            // Venta real, pero fuera del horario operativo actual
                            totalPlatillosFueraHorario += qty;
                            horasFueraDetalle[hora] = (horasFueraDetalle[hora] || 0) + qty;
                        }
                    }
                });
            });

            let mejorHora = -1; let maxItems = -1;
            let horasMuertasArray = []; let minItems = 0;

            // 1. Buscamos la Hora Pico normalmente
            for(let i = minHoraDelRango; i <= maxHoraDelRango; i++) {
                if(horas[i] > maxItems) { maxItems = horas[i]; mejorHora = i; }
            }

            // 2. Hora Muerta: primero priorizamos horas EN CERO absoluto (sin ninguna venta).
            // Si no existe ninguna hora en 0 (hubo ventas en todo el horario), entonces sí
            // tomamos la hora con el valor mínimo, aunque sea 1, 2, etc.
            const horasEnCero = [];
            for (let i = minHoraDelRango; i <= maxHoraDelRango; i++) {
                if (horas[i] === 0) horasEnCero.push(i);
            }

            if (horasEnCero.length > 0) {
                horasMuertasArray = horasEnCero;
                minItems = 0;
            } else {
                let minTemp = Infinity;
                for (let i = minHoraDelRango; i <= maxHoraDelRango; i++) {
                    if (horas[i] < minTemp) { minTemp = horas[i]; horasMuertasArray = [i]; }
                    else if (horas[i] === minTemp) { horasMuertasArray.push(i); }
                }
                minItems = minTemp;
            }

            const totalPlatillosDentroHorario = horas.reduce((s, n) => s + n, 0);
            if (totalPlatillosDentroHorario === 0) { mejorHora = -1; horasMuertasArray = []; }

            const formatHora = (h) => h === -1 ? 'N/A' : `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;

            const serieHoras = [];
            for (let i = minHoraDelRango; i <= maxHoraDelRango; i++) {
                serieHoras.push({ hora: formatHora(i), cantidad: horas[i] });
            }

            // 👇 NUEVO: Solo se arma este bloque si de verdad hubo ventas fuera de
            // horario; si no existen, queda null y el frontend simplemente no lo muestra.
            let ventasFueraHorario = null;
            if (totalPlatillosFueraHorario > 0) {
                const detalleTexto = Object.entries(horasFueraDetalle)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([h, qty]) => `${formatHora(Number(h))} a ${formatHora(Number(h) + 1)} (${qty} platillos)`)
                    .join(', ');
                ventasFueraHorario = { total: totalPlatillosFueraHorario, detalle: detalleTexto };
            }

            const resultadoFinal = {
                label, subtitulo: esUnSoloDia ? boundsRes.rows[0].fecha_inicio : `${boundsRes.rows[0].fecha_inicio} al ${boundsRes.rows[0].fecha_fin}`, totalPlatillos,
                mejorHora: mejorHora !== -1 ? `${formatHora(mejorHora)} a ${formatHora(mejorHora + 1)} (${maxItems} platillos)` : 'Sin ventas',
                peorHora: horasMuertasArray.length > 0 ? `${horasMuertasArray.map(h => `${formatHora(h)} a ${formatHora(h + 1)}`).join(', ')} (${minItems} platillos)` : 'Sin ventas',
                serieHoras,
                ventasFueraHorario,
                // 💡 MEJORA #2: Totales monetarios aproximados para el indicador ↑/↓ de ResumenFinanciero.js
                totalVentas: totalVentasPeriodo,
                totalInversion: totalInversionPeriodo,
                totalGanancia: totalVentasPeriodo - totalInversionPeriodo
            };

            // 💡 MEJORA #4: Solo se guardan en caché los periodos HISTÓRICOS (cerrados).
            // El periodo actual nunca se guarda, para que siempre refleje datos en vivo.
            if (esHistorico) {
                comparativasCache.set(cacheKeyStr, { data: resultadoFinal, timestamp: Date.now() });
            }

            return resultadoFinal;
        };

        let promesas = [];
        if (tipo === 'dia' || tipo === 'historico') {
            const fRef = `$1::DATE`;
            // 👇 Periodo actual (Hoy) al frente del arreglo: NUNCA se cachea (último parámetro = false)
            promesas.push(processRange("Hoy", `${fRef}`, `${fRef} + INTERVAL '1 day'`, true, false));
            // 💡 MEJORA #4: Estos 3 son periodos CERRADOS (el pasado no cambia) -> sí se cachean
            promesas.push(processRange("Hace 1 Semana", `${fRef} - INTERVAL '1 week'`, `${fRef} - INTERVAL '1 week' + INTERVAL '1 day'`, true, true));
            promesas.push(processRange("Hace 1 Mes", `${fRef} - INTERVAL '1 month'`, `${fRef} - INTERVAL '1 month' + INTERVAL '1 day'`, true, true));
            promesas.push(processRange("Hace 1 Año", `${fRef} - INTERVAL '1 year'`, `${fRef} - INTERVAL '1 year' + INTERVAL '1 day'`, true, true));
        } else if (tipo === 'semana') {
            const fRef = `DATE_TRUNC('week', $1::TIMESTAMP)`;
            // 👇 Semana actual al frente del arreglo: NUNCA se cachea
            promesas.push(processRange("Esta Semana", `${fRef}`, `${fRef} + INTERVAL '1 week'`, false, false));
            // 💡 MEJORA #4: Semanas ya cerradas -> sí se cachean
            promesas.push(processRange("Semana Pasada", `${fRef} - INTERVAL '1 week'`, `${fRef}`, false, true));
            promesas.push(processRange("Misma Semana (Mes Pasado)", `${fRef} - INTERVAL '4 weeks'`, `${fRef} - INTERVAL '3 weeks'`, false, true));
            promesas.push(processRange("Misma Semana (Año Pasado)", `${fRef} - INTERVAL '1 year'`, `${fRef} - INTERVAL '1 year' + INTERVAL '1 week'`, false, true));
        } else if (tipo === 'mes') {
            const fRef = `DATE_TRUNC('month', $1::TIMESTAMP)`;
            // 👇 Mes actual al frente del arreglo: NUNCA se cachea
            promesas.push(processRange("Este Mes", `${fRef}`, `${fRef} + INTERVAL '1 month'`, false, false));
            // 💡 MEJORA #4: Meses ya cerrados -> sí se cachean
            promesas.push(processRange("Mes Pasado", `${fRef} - INTERVAL '1 month'`, `${fRef}`, false, true));
            promesas.push(processRange("Mismo Mes (Año Pasado)", `${fRef} - INTERVAL '1 year'`, `${fRef} - INTERVAL '1 year' + INTERVAL '1 month'`, false, true));
        } else if (tipo === 'anio') {
            const fRef = `DATE_TRUNC('year', $1::TIMESTAMP)`;
            // 👇 Año actual al frente del arreglo: NUNCA se cachea
            promesas.push(processRange("Este Año", `${fRef}`, `${fRef} + INTERVAL '1 year'`, false, false));
            // 💡 MEJORA #4: Año ya cerrado -> sí se cachea
            promesas.push(processRange("Año Anterior", `${fRef} - INTERVAL '1 year'`, `${fRef}`, false, true));
        }
        const resultadosPromesas = await Promise.all(promesas);
        comparativas = resultadosPromesas.filter(c => c !== null);
    } catch (err) {}

    let proyecciones = null;
    try {
        // 👇 FIX: Como ahora comparativas[0] es el periodo ACTUAL (Hoy/Esta Semana/etc.),
        // las proyecciones deben seguir comparándose contra el primer periodo HISTÓRICO
        // (el que antes ocupaba la posición 0), no contra sí mismo.
        const comparativasHistoricas = comparativas.slice(1);
        if (comparativasHistoricas.length > 0) {
            const baseInmediata = comparativasHistoricas[0];
            const metaPlatillos = Math.ceil(baseInmediata.totalPlatillos * 1.05);
            const actuales = totales.productos_vendidos;

            let estadoMeta = 'neutral'; let mensajeMeta = ''; let accionRecomendada = '';
            let progreso = metaPlatillos > 0 ? Math.min(100, Math.round((actuales / metaPlatillos) * 100)) : (actuales > 0 ? 100 : 0);

            if (actuales > 0 && actuales >= metaPlatillos) {
                estadoMeta = 'excelente';
                mensajeMeta = `¡Meta Superada! Lograste vender ${actuales} platillos (la meta era ${metaPlatillos}).`;
                accionRecomendada = `Excelente trabajo. Mantén el ritmo, estás creciendo más del 5% respecto a "${baseInmediata.label}".`;
            } else if (actuales > 0 && actuales >= baseInmediata.totalPlatillos) {
                estadoMeta = 'bueno';
                mensajeMeta = `Ventas Positivas. Estás vendiendo más que "${baseInmediata.label}" pero faltan ${metaPlatillos - actuales} para la meta del 5% extra.`;
                accionRecomendada = `Haz sugerencias en caja (Upselling) para alcanzar la meta hoy.`;
            } else {
                estadoMeta = 'alerta';
                mensajeMeta = actuales === 0 ? `Inicio de Jornada. Aún no registras ventas en este periodo.` : `Rendimiento Bajo. Estás ${baseInmediata.totalPlatillos - actuales} platillos por debajo de "${baseInmediata.label}".`;
                accionRecomendada = `Faltan ${metaPlatillos - actuales} para la meta. Revisa tus horas muertas y considera lanzar promociones o cupones rápidos.`;
            }

            let metaFuturaMensaje = '';
            if (tipo === 'dia' || tipo === 'historico') {
                const resManana = await db.query(`SELECT p.carrito FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE = ($1::DATE - INTERVAL '6 days')`, [fecha || 'NOW()']);
                let platManana = 0;
                resManana.rows.forEach(p => {
                    let car = []; try{ car = typeof p.carrito === 'string' ? JSON.parse(p.carrito): p.carrito; }catch(e){}
                    car.forEach(i => {
                        const c = i.categoria||i.clasificacion||'';
                        if(c !== 'Extras' && c !== 'Envíos') platManana += Number(i.cantidad||1);
                    });
                });
                metaFuturaMensaje = `Mañana deberías apuntar a vender ${Math.max(5, Math.ceil(platManana * 1.05))} platillos.`;
            } else if (tipo === 'semana') {
                metaFuturaMensaje = `Para tu próxima semana, prepara a tu equipo para apuntar un 5% más alto que tu semana actual.`;
            }

            proyecciones = { meta_platillos: metaPlatillos, actual_platillos: actuales, base_historica: baseInmediata.totalPlatillos, progreso, estado: estadoMeta, mensaje: mensajeMeta, accion: accionRecomendada, meta_futura: metaFuturaMensaje };
        }
    } catch(errProy) {}

    res.json({ success: true, periodo: tipo, fecha_referencia: params[0], resumen: totales, detalles, insights, comparativas, proyecciones });

  } catch (error) {
    console.error("ERROR AL GENERAR REPORTE:", error);
    res.status(500).json({ error: 'Error al procesar los datos de ventas.' });
  }
};

exports.obtenerReporteCombustible = async (req, res) => {
    const { periodo = 'dia', fecha = new Date().toISOString().split('T')[0] } = req.query;

    try {
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS vehiculo VARCHAR(100);`).catch(()=>null);
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rendimiento_km_l NUMERIC(10,2) DEFAULT 15.00;`).catch(()=>null);
        await db.query(`ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS precio_gasolina NUMERIC(10,2) DEFAULT 23.50;`).catch(()=>null);

        let queryTimeConsumo = '';
        let params = [fecha];

        if (periodo === 'dia') {
            queryTimeConsumo = `(p.tiempo_entregado AT TIME ZONE 'America/Mazatlan')::DATE = $1::DATE`;
        } else if (periodo === 'semana') {
            queryTimeConsumo = `(p.tiempo_entregado AT TIME ZONE 'America/Mazatlan') >= DATE_TRUNC('week', $1::TIMESTAMP) AND (p.tiempo_entregado AT TIME ZONE 'America/Mazatlan') < DATE_TRUNC('week', $1::TIMESTAMP) + INTERVAL '1 week'`;
        } else if (periodo === 'mes') {
            queryTimeConsumo = `(p.tiempo_entregado AT TIME ZONE 'America/Mazatlan') >= DATE_TRUNC('month', $1::TIMESTAMP) AND (p.tiempo_entregado AT TIME ZONE 'America/Mazatlan') < DATE_TRUNC('month', $1::TIMESTAMP) + INTERVAL '1 month'`;
        } else if (periodo === 'anio') {
            queryTimeConsumo = `(p.tiempo_entregado AT TIME ZONE 'America/Mazatlan') >= DATE_TRUNC('year', $1::TIMESTAMP) AND (p.tiempo_entregado AT TIME ZONE 'America/Mazatlan') < DATE_TRUNC('year', $1::TIMESTAMP) + INTERVAL '1 year'`;
        } else {
            queryTimeConsumo = `(p.tiempo_entregado AT TIME ZONE 'America/Mazatlan')::DATE = $1::DATE`; 
        }

        const queryViajes = `
            SELECT 
                p.id, p.numero_pedido, p.direccion_entrega, p.distancia_km,
                p.tiempo_salida_reparto, p.tiempo_entregado,
                u.id AS repartidor_id, u.nombre AS repartidor_nombre,
                u.vehiculo, u.rendimiento_km_l
            FROM pedidos p
            INNER JOIN usuarios u ON p.repartidor_id = u.id
            WHERE p.tipo_consumo = 'Domicilio'
            AND p.repartidor_id IS NOT NULL 
            AND p.estado_preparacion IN ('Entregado', 'Liquidado', 'Finalizado')
            AND p.tiempo_entregado IS NOT NULL
            AND ${queryTimeConsumo}
            ORDER BY p.tiempo_entregado DESC
        `;
        const resultViajes = await db.query(queryViajes, params);

        let precioGasolina = 23.50;
        const confRes = await db.query('SELECT precio_gasolina FROM configuracion WHERE id = 1');
        if (confRes.rows.length > 0 && confRes.rows[0].precio_gasolina) {
            precioGasolina = Number(confRes.rows[0].precio_gasolina);
        }

        res.json({ 
            success: true, 
            viajes: resultViajes.rows,
            precio_gasolina: precioGasolina
        });

    } catch (error) {
        console.error("Error en reporte de combustible:", error);
        res.status(500).json({ error: 'Error al procesar el reporte de rendimiento y combustible.' });
    }
};

exports.guardarConfigFlotilla = async (req, res) => {
    const { precio_gasolina, conductores } = req.body;
    try {
        await db.query(`UPDATE configuracion SET precio_gasolina = $1 WHERE id = 1;`, [precio_gasolina]);

        for (const conductor of conductores) {
            await db.query(
                `UPDATE usuarios SET vehiculo = $1, rendimiento_km_l = $2 WHERE id = $3`,
                [conductor.vehiculo, conductor.rendimiento, conductor.id]
            );
        }
        res.json({ success: true, message: 'Configuración guardada en la base de datos central.' });
    } catch (error) {
        console.error("Error guardando config flotilla:", error);
        res.status(500).json({ error: 'Error interno al guardar la configuración.' });
    }
};