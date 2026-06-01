const db = require('../config/db');

exports.obtenerReporteVentas = async (req, res) => {
  const { tipo, fecha, clasificacion, tipo_consumo } = req.query; 
  
  try {
    // ==========================================================
    // 1. OBTENER COSTOS DE RECETAS (CON CTE RECURSIVO Y PROTECCIÓN)
    // ==========================================================
    const costosRes = await db.query(`
      WITH RECURSIVE DesgloseReceta AS (
          -- Caso base
          SELECT 
              r.producto_id as producto_raiz,
              r.insumo_id,
              r.sub_producto_id,
              r.cantidad_usada::NUMERIC, -- Forzamos a NUMERIC para evitar error de tipos
              1 as depth -- Nivel de profundidad
          FROM recetas r

          UNION ALL

          -- Caso recursivo
          SELECT 
              dr.producto_raiz,
              r2.insumo_id,
              r2.sub_producto_id,
              (dr.cantidad_usada * r2.cantidad_usada)::NUMERIC,
              dr.depth + 1
          FROM DesgloseReceta dr
          JOIN recetas r2 ON dr.sub_producto_id = r2.producto_id
          -- Protegemos contra ciclos infinitos limitando a 10 niveles de sub-recetas
          WHERE dr.sub_producto_id IS NOT NULL AND dr.depth < 10
      )
      SELECT 
          dr.producto_raiz as producto_id, 
          SUM(
            COALESCE(
              (i.costo_presentacion / NULLIF(i.cantidad_presentacion, 0)) * dr.cantidad_usada, 
              0
            )
          ) AS costo_unitario
      FROM DesgloseReceta dr
      JOIN insumos i ON dr.insumo_id = i.id
      WHERE dr.insumo_id IS NOT NULL
      GROUP BY dr.producto_raiz;
    `);
    
    const costoMap = new Map();
    costosRes.rows.forEach(r => costoMap.set(Number(r.producto_id), Number(r.costo_unitario)));

    // ==========================================================
    // 2. CONSTRUIR FILTROS DE FECHA Y CONSUMO
    // ==========================================================
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

    // ==========================================================
    // 3. CONSULTAR TODOS LOS PEDIDOS VÁLIDOS
    // ==========================================================
    const sqlPedidos = `
      SELECT id, numero_pedido, carrito, costo_envio, total, fecha_creacion
      FROM pedidos p
      WHERE estado_preparacion != 'Cancelado' ${queryTimeConsumo}
    `;
    const pedidosRes = await db.query(sqlPedidos, params);

    // ==========================================================
    // 4. PROCESAMIENTO INTELIGENTE DEL CARRITO
    // ==========================================================
    const ventasObj = {}; 

    pedidosRes.rows.forEach(p => {
      let carrito = [];
      try { carrito = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito; } catch(e) {}
      if (!Array.isArray(carrito)) carrito = [];

      carrito.forEach(item => {
         let baseName = item.nombre || 'Desconocido';
         let pureBasePrice = Number(item.precio_base !== undefined ? item.precio_base : (item.precio || 0));
         let qty = Number(item.cantidad || 1);
         let finalBasePrice = pureBasePrice;
         
         let extraRows = [];

         if (Array.isArray(item.extras)) {
             item.extras.forEach(extra => {
                 const eName = (extra.nombre || '').trim();
                 const ePrice = Number(extra.precioExtra || extra.precio_extra || extra.precio || 0);
                 const eNameLower = eName.toLowerCase();

                 if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) {
                     return; 
                 }
                 else if (eNameLower.includes('sabor:') || eNameLower.includes('tamaño:') || eNameLower.includes('🔸') || eNameLower.includes('🔹') || extra.tipo === 'variacion') {
                     const cleanVariationName = eName.replace(/[🔸🔹+]/g, '').trim();
                     baseName += ` (${cleanVariationName})`;
                     finalBasePrice += ePrice; 
                 }
                 else {
                     const cleanExtraName = eName.replace(/^\+\s*/, '').trim(); 
                     extraRows.push({ nombre: cleanExtraName, precio: ePrice, id: extra.id || 0 });
                 }
             });
         }

         const itemCat = item.categoria || item.clasificacion || 'Sin Categoría';
         if (!clasificacion || clasificacion === 'Todas' || clasificacion === itemCat) {
             const itemKey = `BAS_${baseName}_${finalBasePrice}`;
             if (!ventasObj[itemKey]) {
                 ventasObj[itemKey] = {
                     producto_nombre: baseName, producto_id: item.id || 0,
                     precio_venta: finalBasePrice, categoria: itemCat, cantidad_vendida: 0
                 };
             }
             ventasObj[itemKey].cantidad_vendida += qty;
         }

         if (!clasificacion || clasificacion === 'Todas' || clasificacion === 'Extras') {
             extraRows.forEach(ext => {
                 if(ext.precio > 0) { 
                     const extKey = `EXT_${ext.nombre}_${ext.precio}`;
                     if (!ventasObj[extKey]) {
                         ventasObj[extKey] = {
                             producto_nombre: ext.nombre, producto_id: ext.id,
                             precio_venta: ext.precio, categoria: 'Extras', cantidad_vendida: 0
                         };
                     }
                     ventasObj[extKey].cantidad_vendida += qty;
                 }
             });
         }
      });

      if (!clasificacion || clasificacion === 'Todas' || clasificacion === 'Envíos') {
          if (Number(p.costo_envio) > 0) {
              const envKey = `ENV_${p.costo_envio}`;
              if (!ventasObj[envKey]) {
                  ventasObj[envKey] = {
                      producto_nombre: 'Envío a Domicilio', producto_id: 0,
                      precio_venta: Number(p.costo_envio), categoria: 'Envíos', cantidad_vendida: 0
                  };
              }
              ventasObj[envKey].cantidad_vendida += 1; 
          }
      }
    });

    // ==========================================================
    // 5. ENSAMBLAR Y CALCULAR FINANZAS
    // ==========================================================
    let detalles = Object.values(ventasObj).map(v => {
        let c_unitario = 0;
        if (v.categoria !== 'Extras' && v.categoria !== 'Envíos') {
            c_unitario = costoMap.get(Number(v.producto_id)) || 0;
        }
        return {
            ...v,
            costo_unitario: Number(c_unitario),
            subtotal_ventas: Number(v.cantidad_vendida) * Number(v.precio_venta),
            subtotal_inversion: Number(v.cantidad_vendida) * Number(c_unitario),
            ganancia_neta: (Number(v.cantidad_vendida) * Number(v.precio_venta)) - (Number(v.cantidad_vendida) * Number(c_unitario))
        };
    });

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

    // ==========================================================
    // 6. GENERAR INSIGHTS INTELIGENTES
    // ==========================================================
    let insights = { 
      productoMasVendido: null, productoMenosVendido: null, 
      productosCeroVentasHoy: [], productosCeroVentasAyer: [],
      promedioDiario: null, mejorDia: null, peorDia: null, mejorMes: null, peorMes: null 
    };

    const prodReales = detalles.filter(r => r.categoria !== 'Extras' && r.categoria !== 'Envíos');
    if (prodReales.length > 0) {
        const sorted = [...prodReales].sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);
        insights.productoMasVendido = sorted[0];
        insights.productoMenosVendido = sorted[sorted.length - 1];
    }

    const idsVendidosHoy = new Set(prodReales.map(r => Number(r.producto_id)));
    const sqlTodos = `SELECT id, nombre FROM productos WHERE estado = 'Activo' OR disponible = true`;
    const todosProds = await db.query(sqlTodos);
    insights.productosCeroVentasHoy = todosProds.rows.filter(p => !idsVendidosHoy.has(p.id)).map(p => p.nombre);

    try {
        const ayerRes = await db.query(`
            SELECT carrito FROM pedidos 
            WHERE estado_preparacion != 'Cancelado' 
            AND fecha_creacion >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE - INTERVAL '1 day' 
            AND fecha_creacion < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE
        `);
        let idsVendidosAyer = new Set();
        ayerRes.rows.forEach(p => {
            let car = []; 
            try { car = typeof p.carrito === 'string' ? JSON.parse(p.carrito): p.carrito; } catch(e){}
            car.forEach(i => { 
                const cat = i.categoria || i.clasificacion || '';
                if (cat !== 'Extras' && cat !== 'Envíos') idsVendidosAyer.add(Number(i.id)); 
            });
        });
        insights.productosCeroVentasAyer = todosProds.rows.filter(p => !idsVendidosAyer.has(p.id)).map(p => p.nombre);
    } catch(errAyer) { console.error("Error consultando ventas de ayer:", errAyer); }

    if (['semana', 'mes', 'anio'].includes(tipo)) {
        const sqlDias = `
          SELECT TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'YYYY-MM-DD') as fecha_str, SUM(p.total) as total_dia 
          FROM pedidos p 
          WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} 
          GROUP BY TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'YYYY-MM-DD') 
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
          SELECT TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'MM') as mes, SUM(p.total) as total_mes 
          FROM pedidos p 
          WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} 
          GROUP BY TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'MM') 
          ORDER BY total_mes DESC
        `;
        const resMeses = await db.query(sqlMeses, params);
        if(resMeses.rows.length > 0){
             const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
             insights.mejorMes = { mes: nombresMeses[parseInt(resMeses.rows[0].mes) - 1], total: resMeses.rows[0].total_mes };
             insights.peorMes = { mes: nombresMeses[parseInt(resMeses.rows[resMeses.rows.length - 1].mes) - 1], total: resMeses.rows[resMeses.rows.length - 1].total_mes };
        }
    }

    // ==========================================================
    // 7. COMPARATIVAS HISTÓRICAS
    // ==========================================================
    let comparativas = [];
    try {
        const processRange = async (label, inicioSql, finSql, esUnSoloDia = false) => {
            const boundsRes = await db.query(`
                SELECT 
                    TO_CHAR(${inicioSql}, 'DD/MM/YYYY') as fecha_inicio,
                    TO_CHAR((${finSql}) - INTERVAL '1 second', 'DD/MM/YYYY') as fecha_fin
            `, [fecha || 'NOW()']);
            
            const subtituloFechas = esUnSoloDia ? boundsRes.rows[0].fecha_inicio : `${boundsRes.rows[0].fecha_inicio} al ${boundsRes.rows[0].fecha_fin}`;

            const res = await db.query(`
                SELECT p.fecha_creacion, p.carrito,
                EXTRACT(HOUR FROM p.fecha_creacion AT TIME ZONE 'America/Mazatlan') as hora_local
                FROM pedidos p
                WHERE p.estado_preparacion != 'Cancelado'
                  AND p.fecha_creacion >= (${inicioSql})
                  AND p.fecha_creacion < (${finSql})
            `, [fecha || 'NOW()']);

            let totalPlatillos = 0;
            let horas = Array(24).fill(0);
            
            let minHoraDelRango = 17; 
            let maxHoraDelRango = 23;

            res.rows.forEach(p => {
                const hora = Number(p.hora_local);
                
                if (hora < minHoraDelRango) minHoraDelRango = hora;
                if (hora > maxHoraDelRango) maxHoraDelRango = hora;

                let carrito = [];
                try { carrito = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito; } catch(e){}
                if(!Array.isArray(carrito)) carrito = [];

                carrito.forEach(item => {
                    const cat = item.categoria || item.clasificacion || '';
                    if (cat !== 'Extras' && cat !== 'Envíos') {
                        const qty = Number(item.cantidad || 1);
                        totalPlatillos += qty;
                        horas[hora] += qty;
                    }
                });
            });

            let mejorHora = -1; let maxItems = -1;
            let minItems = Infinity;
            let horasMuertasArray = [];
            let huboVentasEnElRango = false;

            for(let i = minHoraDelRango; i <= maxHoraDelRango; i++) {
                huboVentasEnElRango = true;
                if(horas[i] > maxItems) { maxItems = horas[i]; mejorHora = i; }
                
                if(horas[i] < minItems) { 
                    minItems = horas[i]; 
                    horasMuertasArray = [i]; 
                } else if (horas[i] === minItems) {
                    horasMuertasArray.push(i); 
                }
            }

            if (!huboVentasEnElRango) { mejorHora = -1; horasMuertasArray = []; }

            const formatHora = (h) => {
                 if(h === -1) return 'N/A';
                 const ampm = h >= 12 ? 'PM' : 'AM';
                 const hr = h % 12 || 12;
                 return `${hr}:00 ${ampm}`;
            };

            const textoHorasMuertas = horasMuertasArray.map(h => `${formatHora(h)} a ${formatHora(h + 1)}`).join(', ');

            return {
                label, subtitulo: subtituloFechas, totalPlatillos,
                mejorHora: mejorHora !== -1 ? `${formatHora(mejorHora)} a ${formatHora(mejorHora + 1)} (${maxItems} platillos)` : 'Sin ventas',
                peorHora: horasMuertasArray.length > 0 ? `${textoHorasMuertas} (${minItems} platillos)` : 'Sin ventas'
            };
        };

        let promesas = [];

        if (tipo === 'dia' || tipo === 'historico') {
            const fRef = `$1::DATE`;
            promesas.push(processRange("Hace 1 Semana", `${fRef} - INTERVAL '1 week'`, `${fRef} - INTERVAL '1 week' + INTERVAL '1 day'`, true));
            promesas.push(processRange("Hace 1 Mes", `${fRef} - INTERVAL '1 month'`, `${fRef} - INTERVAL '1 month' + INTERVAL '1 day'`, true));
            promesas.push(processRange("Hace 1 Año", `${fRef} - INTERVAL '1 year'`, `${fRef} - INTERVAL '1 year' + INTERVAL '1 day'`, true));
        } else if (tipo === 'semana') {
            const fRef = `DATE_TRUNC('week', $1::TIMESTAMP)`;
            promesas.push(processRange("Semana Pasada", `${fRef} - INTERVAL '1 week'`, `${fRef}`, false));
            promesas.push(processRange("Misma Semana (Mes Pasado)", `${fRef} - INTERVAL '4 weeks'`, `${fRef} - INTERVAL '3 weeks'`, false));
            promesas.push(processRange("Misma Semana (Año Pasado)", `${fRef} - INTERVAL '1 year'`, `${fRef} - INTERVAL '1 year' + INTERVAL '1 week'`, false));
        } else if (tipo === 'mes') {
            const fRef = `DATE_TRUNC('month', $1::TIMESTAMP)`;
            promesas.push(processRange("Mes Pasado", `${fRef} - INTERVAL '1 month'`, `${fRef}`, false));
            promesas.push(processRange("Mismo Mes (Año Pasado)", `${fRef} - INTERVAL '1 year'`, `${fRef} - INTERVAL '1 year' + INTERVAL '1 month'`, false));
        } else if (tipo === 'anio') {
            const fRef = `DATE_TRUNC('year', $1::TIMESTAMP)`;
            promesas.push(processRange("Año Anterior", `${fRef} - INTERVAL '1 year'`, `${fRef}`, false));
        }
        
        const resultadosPromesas = await Promise.all(promesas);
        comparativas = resultadosPromesas.filter(c => c !== null);

    } catch (errComparativa) {
        console.error("Error procesando comparativas:", errComparativa);
    }

    // ==========================================================
    // 8. METAS Y PROYECCIONES INTELIGENTES 
    // ==========================================================
    let proyecciones = null;
    try {
        if (comparativas.length > 0) {
            const baseInmediata = comparativas[0];
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
                const resManana = await db.query(`
                    SELECT p.carrito FROM pedidos p 
                    WHERE p.estado_preparacion != 'Cancelado' 
                    AND p.fecha_creacion >= ($1::DATE - INTERVAL '6 days') 
                    AND p.fecha_creacion < ($1::DATE - INTERVAL '5 days')
                `, [fecha || 'NOW()']);
                let platManana = 0;
                resManana.rows.forEach(p => {
                    let car = []; try{ car = typeof p.carrito === 'string' ? JSON.parse(p.carrito): p.carrito; }catch(e){}
                    car.forEach(i => {
                        const c = i.categoria||i.clasificacion||'';
                        if(c !== 'Extras' && c !== 'Envíos') platManana += Number(i.cantidad||1);
                    });
                });
                const metaManana = Math.max(5, Math.ceil(platManana * 1.05));
                metaFuturaMensaje = `Mañana deberías apuntar a vender ${metaManana} platillos.`;
            } else if (tipo === 'semana') {
                metaFuturaMensaje = `Para tu próxima semana, prepara a tu equipo para apuntar un 5% más alto que tu semana actual.`;
            }

            proyecciones = {
                meta_platillos: metaPlatillos, actual_platillos: actuales, base_historica: baseInmediata.totalPlatillos,
                progreso, estado: estadoMeta, mensaje: mensajeMeta, accion: accionRecomendada, meta_futura: metaFuturaMensaje
            };
        }
    } catch(errProy) { console.error("Error en proyecciones:", errProy); }

    res.json({ success: true, periodo: tipo, fecha_referencia: params[0], resumen: totales, detalles, insights, comparativas, proyecciones });

  } catch (error) {
    console.error("ERROR AL GENERAR REPORTE:", error);
    res.status(500).json({ error: 'Error al procesar los datos de ventas.' });
  }
};