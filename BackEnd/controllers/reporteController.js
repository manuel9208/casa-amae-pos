const db = require('../config/db');

exports.obtenerReporteVentas = async (req, res) => {
  const { tipo, fecha, clasificacion, tipo_consumo } = req.query; 
  
  try {
    const configRes = await db.query('SELECT hora_apertura, hora_cierre FROM configuracion WHERE id = 1');
    const horaAperturaDB = Number(configRes.rows[0]?.hora_apertura !== undefined ? configRes.rows[0].hora_apertura : 17);
    const horaCierreDB = Number(configRes.rows[0]?.hora_cierre !== undefined ? configRes.rows[0].hora_cierre : 23);

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
              COALESCE(SUM(CASE WHEN e.insumo_id IS NOT NULL THEN 
                  ((i.costo_presentacion::numeric / COALESCE(NULLIF(i.cantidad_presentacion::numeric, 0), 1)) / COALESCE(NULLIF(i.factor_rendimiento::numeric, 0), 1)) * e.qty_factor
              ELSE 0 END), 0)
              +
              COALESCE(SUM(CASE WHEN e.sub_producto_id IS NOT NULL THEN 
                  (ec_sub.costo_empaques_batch / COALESCE(NULLIF(p_sub.rendimiento::numeric, 0), 1)) * e.qty_factor
              ELSE 0 END), 0)
              +
              COALESCE(MAX(ec_root.costo_empaques_batch), 0)
          ) as costo_base_crudo
      FROM Explosion e
      LEFT JOIN insumos i ON e.insumo_id = i.id
      LEFT JOIN productos p_sub ON e.sub_producto_id = p_sub.id
      LEFT JOIN EmpaquesCosto ec_sub ON e.sub_producto_id = ec_sub.producto_id
      LEFT JOIN EmpaquesCosto ec_root ON e.root_producto_id = ec_root.producto_id
      GROUP BY e.root_producto_id;
    `);
    
    const costoMap = new Map();
    costosRes.rows.forEach(r => {
        const costoBase = Number(r.costo_base_crudo) || 0;
        const costoRealFinal = costoBase * 1.15; 
        costoMap.set(Number(r.producto_id), Number(costoRealFinal));
    });

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

    const sqlPedidos = `
      SELECT id, numero_pedido, carrito, costo_envio, total, fecha_creacion, metodo_pago, pagos_mixtos
      FROM pedidos p
      WHERE estado_preparacion != 'Cancelado' ${queryTimeConsumo}
    `;
    const pedidosRes = await db.query(sqlPedidos, params);

    // 👇 DICCIONARIO MAESTRO: Conecta los nombres de texto con su ID real (Resuelve el problema de Mar y Tierra)
    const sqlTodos = `SELECT id, nombre FROM productos`;
    const todosProds = await db.query(sqlTodos);
    const productDict = {};
    todosProds.rows.forEach(p => { 
        // Normalizamos quitando espacios extra en los extremos y pasándolo a minúsculas
        productDict[p.nombre.toLowerCase().trim()] = p.id; 
    });

    const ventasObj = {}; 
    const comedorObj = {}; 
    
    let t_efectivo = 0; let t_tarjeta = 0; let t_transf = 0; let t_envio = 0;
    const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;

    pedidosRes.rows.forEach(p => {
      t_envio += parseMoney(p.costo_envio);
      if (p.metodo_pago === 'Efectivo') t_efectivo += parseMoney(p.total);
      if (p.metodo_pago === 'Tarjeta') t_tarjeta += parseMoney(p.total);
      if (p.metodo_pago === 'Transferencia') t_transf += parseMoney(p.total);
      if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
          let pm = []; try { pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos; } catch(e) {}
          pm.forEach(x => {
              if(x.metodo === 'Efectivo') t_efectivo += parseMoney(x.monto);
              if(x.metodo === 'Tarjeta') t_tarjeta += parseMoney(x.monto);
              if(x.metodo === 'Transferencia') t_transf += parseMoney(x.monto);
          });
      }

      let carrito = [];
      if (Array.isArray(p.carrito)) {
          carrito = p.carrito;
      } else if (typeof p.carrito === 'string') {
          try { carrito = JSON.parse(p.carrito); } catch(e) {}
      }

      const isComedor = p.metodo_pago === 'Comida Personal';

      carrito.forEach(item => {
         let baseName = item.nombre || 'Desconocido';
         let cleanName = baseName.trim(); // Mantenemos el nombre intacto para no romper promos como "2 Mar y Tierra"

         // 👇 RESCATE DE ID: Si el ticket no guardó el ID, lo buscamos en el catálogo por nombre exacto
         let pId = Number(item.id) || 0;
         if (pId === 0) {
             pId = productDict[cleanName.toLowerCase()] || 0;
         }

         let rawPrice = parseMoney(item.precioFinal || item.precio_base || item.precio);
         let qty = parseMoney(item.cantidad) || 1;
         let exP = 0;
         let extraRows = [];

         if (Array.isArray(item.extras)) {
             item.extras.forEach(extra => {
                 const eName = (extra.nombre || '').trim();
                 const ePrice = parseMoney(extra.precioExtra || extra.precio_extra || extra.precio);
                 const eNameLower = eName.toLowerCase();

                 if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) {
                     return; 
                 } else if (eNameLower.includes('sabor:') || eNameLower.includes('tamaño:') || eNameLower.includes('🔸') || eNameLower.includes('🔹') || extra.tipo === 'variacion') {
                     const cleanVariationName = eName.replace(/[🔸🔹+]/g, '').trim();
                     cleanName += ` (${cleanVariationName})`;
                 } else {
                     const cleanExtraName = eName.replace(/^\+\s*/, '').trim(); 
                     exP += ePrice;
                     extraRows.push({ nombre: cleanExtraName, precio: ePrice, id: extra.id || 0 });
                 }
             });
         }

         let finalBasePrice = rawPrice - exP;
         if (finalBasePrice < 0) finalBasePrice = 0;

         const itemCat = item.categoria || item.clasificacion || 'Sin Categoría';
         const targetObj = isComedor ? comedorObj : ventasObj;

         if (!clasificacion || clasificacion === 'Todas' || clasificacion === itemCat) {
             const itemKey = `ID_${pId}_P_${finalBasePrice}_N_${cleanName}`;
             if (!targetObj[itemKey]) {
                 targetObj[itemKey] = {
                     producto_nombre: cleanName, 
                     producto_id: pId, // 👈 Ahora pId siempre tendrá el ID real de la receta
                     precio_venta: finalBasePrice, 
                     categoria: itemCat, 
                     cantidad_vendida: 0
                 };
             }
             targetObj[itemKey].cantidad_vendida += qty;
         }

         if (!clasificacion || clasificacion === 'Todas' || clasificacion === 'Extras') {
             extraRows.forEach(ext => {
                 if(ext.precio > 0 || isComedor) { 
                     const extKey = `EXT_${ext.nombre}_${ext.precio}`;
                     if (!targetObj[extKey]) {
                         targetObj[extKey] = {
                             producto_nombre: ext.nombre, 
                             producto_id: ext.id,
                             precio_venta: ext.precio, 
                             categoria: 'Extras', 
                             cantidad_vendida: 0
                         };
                     }
                     targetObj[extKey].cantidad_vendida += qty;
                 }
             });
         }
      });

      if (!clasificacion || clasificacion === 'Todas' || clasificacion === 'Envíos') {
          if (parseMoney(p.costo_envio) > 0) {
              const envKey = `ENV_${p.costo_envio}`;
              if (!ventasObj[envKey]) {
                  ventasObj[envKey] = {
                      producto_nombre: 'Envío a Domicilio', producto_id: 0,
                      precio_venta: parseMoney(p.costo_envio), categoria: 'Envíos', cantidad_vendida: 0
                  };
              }
              ventasObj[envKey].cantidad_vendida += 1; 
          }
      }
    });

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

    let detalles_comedor = Object.values(comedorObj).map(v => {
        let c_unitario = 0;
        if (v.categoria !== 'Extras' && v.categoria !== 'Envíos') {
            c_unitario = costoMap.get(Number(v.producto_id)) || 0;
        }
        return {
            ...v,
            categoria: 'Comedor', 
            categoria_original: v.categoria,
            costo_unitario: Number(c_unitario),
            subtotal_ventas: 0, 
            valor_prestacion: Number(v.cantidad_vendida) * Number(v.precio_venta), 
            subtotal_inversion: Number(v.cantidad_vendida) * Number(c_unitario),
            ganancia_neta: -(Number(v.cantidad_vendida) * Number(c_unitario)) 
        };
    });

    detalles = [...detalles, ...detalles_comedor];
    detalles.sort((a, b) => {
        const catA = a.categoria === 'Comedor' ? 4 : (a.categoria === 'Envíos' ? 3 : (a.categoria === 'Extras' ? 2 : 1));
        const catB = b.categoria === 'Comedor' ? 4 : (b.categoria === 'Envíos' ? 3 : (b.categoria === 'Extras' ? 2 : 1));
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

    const totales = {
      ventas_totales: detalles.reduce((sum, r) => sum + r.subtotal_ventas, 0),
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
            AND fecha_creacion >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE - INTERVAL '1 day' 
            AND fecha_creacion < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE
        `);
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
        const sqlDias = `SELECT TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'YYYY-MM-DD') as fecha_str, SUM(p.total) as total_dia FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} GROUP BY TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'YYYY-MM-DD') ORDER BY total_dia DESC`;
        const resDias = await db.query(sqlDias, params);
        if(resDias.rows.length > 0){
            insights.mejorDia = resDias.rows[0]; insights.peorDia = resDias.rows[resDias.rows.length - 1];
            insights.promedioDiario = resDias.rows.reduce((s, r) => s + parseFloat(r.total_dia), 0) / resDias.rows.length;
        }
    }

    if (tipo === 'anio') {
        const sqlMeses = `SELECT TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'MM') as mes, SUM(p.total) as total_mes FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' ${queryTimeConsumo} GROUP BY TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'MM') ORDER BY total_mes DESC`;
        const resMeses = await db.query(sqlMeses, params);
        if(resMeses.rows.length > 0){
             const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
             insights.mejorMes = { mes: nombresMeses[parseInt(resMeses.rows[0].mes) - 1], total: resMeses.rows[0].total_mes };
             insights.peorMes = { mes: nombresMeses[parseInt(resMeses.rows[resMeses.rows.length - 1].mes) - 1], total: resMeses.rows[resMeses.rows.length - 1].total_mes };
        }
    }

    let comparativas = [];
    try {
        const processRange = async (label, inicioSql, finSql, esUnSoloDia = false) => {
            const boundsRes = await db.query(`SELECT TO_CHAR(${inicioSql}, 'DD/MM/YYYY') as fecha_inicio, TO_CHAR((${finSql}) - INTERVAL '1 second', 'DD/MM/YYYY') as fecha_fin`, [fecha || 'NOW()']);
            const res = await db.query(`SELECT p.fecha_creacion, p.carrito, EXTRACT(HOUR FROM p.fecha_creacion AT TIME ZONE 'America/Mazatlan') as hora_local FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' AND p.fecha_creacion >= (${inicioSql}) AND p.fecha_creacion < (${finSql})`, [fecha || 'NOW()']);

            let totalPlatillos = 0; let horas = Array(24).fill(0);
            let minHoraDelRango = horaAperturaDB; let maxHoraDelRango = horaCierreDB;

            res.rows.forEach(p => {
                const hora = Number(p.hora_local);
                if (hora < minHoraDelRango) minHoraDelRango = hora;
                if (hora > maxHoraDelRango) maxHoraDelRango = hora;

                let carrito = []; try { carrito = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito; } catch(e){}
                if(!Array.isArray(carrito)) carrito = [];

                carrito.forEach(item => {
                    const cat = item.categoria || item.clasificacion || '';
                    if (cat !== 'Extras' && cat !== 'Envíos') {
                        const qty = parseMoney(item.cantidad) || 1;
                        totalPlatillos += qty; horas[hora] += qty;
                    }
                });
            });

            let mejorHora = -1; let maxItems = -1; let minItems = Infinity;
            let horasMuertasArray = []; let huboVentasEnElRango = false;

            for(let i = minHoraDelRango; i <= maxHoraDelRango; i++) {
                huboVentasEnElRango = true;
                if(horas[i] > maxItems) { maxItems = horas[i]; mejorHora = i; }
                if(horas[i] < minItems) { minItems = horas[i]; horasMuertasArray = [i]; } 
                else if (horas[i] === minItems) { horasMuertasArray.push(i); }
            }

            if (!huboVentasEnElRango) { mejorHora = -1; horasMuertasArray = []; }

            const formatHora = (h) => h === -1 ? 'N/A' : `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
            return {
                label, subtitulo: esUnSoloDia ? boundsRes.rows[0].fecha_inicio : `${boundsRes.rows[0].fecha_inicio} al ${boundsRes.rows[0].fecha_fin}`, totalPlatillos,
                mejorHora: mejorHora !== -1 ? `${formatHora(mejorHora)} a ${formatHora(mejorHora + 1)} (${maxItems} platillos)` : 'Sin ventas',
                peorHora: horasMuertasArray.length > 0 ? `${horasMuertasArray.map(h => `${formatHora(h)} a ${formatHora(h + 1)}`).join(', ')} (${minItems} platillos)` : 'Sin ventas'
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
    } catch (err) {}

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
                const resManana = await db.query(`SELECT p.carrito FROM pedidos p WHERE p.estado_preparacion != 'Cancelado' AND p.fecha_creacion >= ($1::DATE - INTERVAL '6 days') AND p.fecha_creacion < ($1::DATE - INTERVAL '5 days')`, [fecha || 'NOW()']);
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
  const { fecha } = req.query;
  try {
    let filtroFecha = "TO_CHAR(p.fecha_creacion AT TIME ZONE 'America/Mazatlan', 'YYYY-MM-DD') = TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan', 'YYYY-MM-DD')";
    let params = [];
    if (fecha) { filtroFecha = "p.fecha_creacion::DATE = $1::DATE"; params.push(fecha); }

    const query = `
      SELECT u.id AS repartidor_id, u.nombre AS repartidor_nombre, COUNT(p.id) AS total_viajes
      FROM pedidos p INNER JOIN usuarios u ON p.repartidor_id = u.id
      WHERE p.tipo_consumo = 'Domicilio' AND p.repartidor_id IS NOT NULL AND (p.estado_preparacion = 'Entregado' OR p.estado_preparacion = 'Liquidado') AND ${filtroFecha}
      GROUP BY u.id, u.nombre ORDER BY total_viajes DESC
    `;

    const result = await db.query(query, params);
    res.json({ success: true, fecha_analizada: fecha || 'Hoy', repartidores: result.rows });
  } catch (error) { res.status(500).json({ error: 'Error al procesar el reporte de rendimiento y combustible.' }); }
};