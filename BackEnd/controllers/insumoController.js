const db = require('../config/db');

// =========================================================
// AUTO-MIGRACIÓN DE BASE DE DATOS (Solo al arrancar)
// =========================================================
exports.inicializarInsumos = async () => {
    try {
        await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS insumos_sustitutos JSONB DEFAULT '[]'::jsonb;`);
        // 👇 AUTO-MIGRACIÓN PARA EMPAQUES INTELIGENTES
        await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS descontar_solo_llevando BOOLEAN DEFAULT false;`);
        await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS es_empaque_global BOOLEAN DEFAULT false;`);
        await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS regla_empaque_global JSONB DEFAULT '{}'::jsonb;`);
        // 👇 NUEVO: AUTO-MIGRACIÓN PARA ALERTAS PUSH DE STOCK BAJO POR INSUMO
        await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS alerta_stock_activa BOOLEAN DEFAULT false;`);
        await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS alerta_stock_minimo NUMERIC DEFAULT 0;`);
        await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS alerta_ya_enviada BOOLEAN DEFAULT false;`);
        console.log("✅ Columnas de empaques inteligentes y sustitutos creadas en la BD.");  

                // 👇 NUEVO: Tabla singleton para el borrador del botón "Surtir"
        await db.query(`
            CREATE TABLE IF NOT EXISTS surtidos_borrador (
                id SERIAL PRIMARY KEY,
                datos JSONB DEFAULT '{}',
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        const checkBorrador = await db.query('SELECT id FROM surtidos_borrador WHERE id = 1');
        if (checkBorrador.rows.length === 0) {
            await db.query(`INSERT INTO surtidos_borrador (id, datos) VALUES (1, '{}')`);
        }
        console.log("✅ Tabla de 'surtidos_borrador' verificada/creada en la BD.");

        // 👇 AUTO-INYECCIÓN: Crea el Insumo Fantasma si no existe en la BD
        const checkRepartidor = await db.query("SELECT id FROM insumos WHERE LOWER(nombre) = 'repartidor externo'");
        if (checkRepartidor.rows.length === 0) {
            await db.query(`
                INSERT INTO insumos 
                (nombre, unidad_medida, cantidad_presentacion, costo_presentacion, stock_actual, es_empaque, tipo_rendimiento, factor_rendimiento) 
                VALUES ('Repartidor Externo', 'Viaje', 1, 0, 0, false, 'Directo', 1)
            `);
            console.log("✅ Insumo fantasma 'Repartidor Externo' creado automáticamente para cuadre de caja.");
        }
    } catch (error) {
        console.error("❌ Error al inicializar insumos:", error);
    }
};

exports.obtenerInsumos = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM insumos ORDER BY nombre ASC');
    const insumosLimpios = result.rows.map(ins => ({
      ...ins,
      stock_actual: isNaN(parseFloat(ins.stock_actual)) ? 0 : parseFloat(ins.stock_actual),
      costo_presentacion: isNaN(parseFloat(ins.costo_presentacion)) ? 0 : parseFloat(ins.costo_presentacion),
      cantidad_presentacion: isNaN(parseFloat(ins.cantidad_presentacion)) || parseFloat(ins.cantidad_presentacion) <= 0 ? 1 : parseFloat(ins.cantidad_presentacion),
      factor_rendimiento: isNaN(parseFloat(ins.factor_rendimiento)) ? 1 : parseFloat(ins.factor_rendimiento),
      es_empaque: ins.es_empaque === true || ins.es_empaque === 'true',
      insumo_sustituto_id: ins.insumo_sustituto_id || '',
      // 👇 NUEVOS CAMPOS DE EMPAQUES MAPEAADOS
      descontar_solo_llevando: ins.descontar_solo_llevando === true,
      es_empaque_global: ins.es_empaque_global === true,
      regla_empaque_global: typeof ins.regla_empaque_global === 'string' ? JSON.parse(ins.regla_empaque_global) : (ins.regla_empaque_global || {}),
      // 👇 NUEVO: Campos de alerta de stock bajo por insumo
      alerta_stock_activa: ins.alerta_stock_activa === true,
      alerta_stock_minimo: isNaN(parseFloat(ins.alerta_stock_minimo)) ? 0 : parseFloat(ins.alerta_stock_minimo)
      }));
    res.json(insumosLimpios);
  } catch(e) {
    res.status(500).json({error: 'Error al obtener insumos'});
  }
};  

exports.crearInsumo = async (req, res) => {
  const {
      nombre, unidad_medida, cantidad_presentacion, costo_presentacion,
      es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio,
      insumo_sustituto_id,
      descontar_solo_llevando, es_empaque_global, regla_empaque_global,
      alerta_stock_activa, alerta_stock_minimo // 👈 NUEVO: alerta de stock bajo desde el Alta
  } = req.body;  

  try {
    // 👇 AUTO-MIGRACIÓN: Crea la columna en PostgreSQL automáticamente si no existe
    await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS insumo_sustituto_id INTEGER;`).catch(()=>null);

    const nombreLimpio = String(nombre || '').trim().replace(/\s+/g, ' ').toUpperCase();
        const check = await db.query('SELECT id FROM insumos WHERE LOWER(nombre) = LOWER($1)', [nombreLimpio]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un insumo o empaque con ese nombre exacto.' });
        }

    let factor_rendimiento = 1.0000;
    const tipo = tipo_rendimiento || 'Directo';
    if (tipo === 'Merma' || tipo === 'Expansión') {
      const crudo = parseFloat(peso_prueba_crudo) || 0;
      const limpio = parseFloat(peso_prueba_limpio) || 0;
      if (crudo > 0) factor_rendimiento = limpio / crudo;
    }

    const sustitutoFinal = (es_empaque && insumo_sustituto_id) ? parseInt(insumo_sustituto_id) : null;

    const result = await db.query(
      `INSERT INTO insumos
      (nombre, unidad_medida, cantidad_presentacion, costo_presentacion, stock_actual, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio, factor_rendimiento, insumo_sustituto_id, descontar_solo_llevando, es_empaque_global, regla_empaque_global, alerta_stock_activa, alerta_stock_minimo)
      VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [nombreLimpio, unidad_medida, parseFloat(cantidad_presentacion), parseFloat(costo_presentacion), Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento, sustitutoFinal, Boolean(descontar_solo_llevando), Boolean(es_empaque_global), JSON.stringify(regla_empaque_global || {}), Boolean(alerta_stock_activa), parseFloat(alerta_stock_minimo) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) {
    console.error("Error al crear insumo:", e);
    res.status(500).json({error: 'Error al crear el insumo en el servidor.'});
  }
};  

exports.actualizarInsumo = async (req, res) => {
  const { id } = req.params;
  const {
    nombre, unidad_medida, cantidad_presentacion, costo_presentacion,
    es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio,
    insumo_sustituto_id,
    descontar_solo_llevando, es_empaque_global, regla_empaque_global,
    alerta_stock_activa, alerta_stock_minimo // 👈 NUEVO: alerta de stock bajo desde el formulario de edición
  } = req.body;  

  try {
    await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS insumo_sustituto_id INTEGER;`).catch(()=>null);

    const nombreLimpio = String(nombre || '').trim().replace(/\s+/g, ' ').toUpperCase();
        const check = await db.query('SELECT id FROM insumos WHERE LOWER(nombre) = LOWER($1) AND id != $2', [nombreLimpio, id]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe OTRO insumo con ese nombre.' });
        }

    let factor_rendimiento = 1.0000;
    const tipo = tipo_rendimiento || 'Directo';
    if (tipo === 'Merma' || tipo === 'Expansión') {
      const crudo = parseFloat(peso_prueba_crudo) || 0;
      const limpio = parseFloat(peso_prueba_limpio) || 0;
      if (crudo > 0) factor_rendimiento = limpio / crudo;
    }

    const sustitutoFinal = (es_empaque && insumo_sustituto_id) ? parseInt(insumo_sustituto_id) : null;

    const result = await db.query(
      `UPDATE insumos SET
      nombre=$1, unidad_medida=$2, cantidad_presentacion=$3, costo_presentacion=$4, es_empaque=$5,
      tipo_rendimiento=$6, peso_prueba_crudo=$7, peso_prueba_limpio=$8, factor_rendimiento=$9, insumo_sustituto_id=$10,
      descontar_solo_llevando=$11, es_empaque_global=$12, regla_empaque_global=$13, alerta_stock_activa=$14, alerta_stock_minimo=$15
      WHERE id=$16 RETURNING *`,
      [nombreLimpio, unidad_medida, parseFloat(cantidad_presentacion), parseFloat(costo_presentacion), Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento, sustitutoFinal, Boolean(descontar_solo_llevando), Boolean(es_empaque_global), JSON.stringify(regla_empaque_global || {}), Boolean(alerta_stock_activa), parseFloat(alerta_stock_minimo) || 0, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al editar insumo:", error);
    res.status(500).json({ error: 'Error al editar insumo' });
  }
};  

exports.comprarInsumo = async (req, res) => {
  const { id } = req.params;
  let paquetes_comprados = req.body.paquetes_comprados !== undefined ? req.body.paquetes_comprados : req.body.paquetes;
  let nuevo_costo_paquete = req.body.nuevo_costo_paquete !== undefined ? req.body.nuevo_costo_paquete : req.body.costo_unitario;
  let origen = req.body.origen || 'Caja';
  let usuario_id = req.body.usuario_id || null; 
  try {
    await db.query(`ALTER TABLE compras_insumos ADD COLUMN IF NOT EXISTS usuario_id INTEGER;`).catch(()=>null);  
    await db.query('BEGIN');
    const ins = await db.query('SELECT cantidad_presentacion, costo_presentacion, stock_actual, factor_rendimiento FROM insumos WHERE id = $1', [id]);
    if (ins.rows.length === 0) throw new Error(`Insumo no encontrado: ${id}`);  
    
    const cant_paquete = parseFloat(ins.rows[0].cantidad_presentacion) || 1;
    const paquetes = parseFloat(paquetes_comprados) || 0;
    const factor = parseFloat(ins.rows[0].factor_rendimiento) || 1;  
    
    let costo_uni = parseFloat(nuevo_costo_paquete);
    if (isNaN(costo_uni)) {
      costo_uni = parseFloat(ins.rows[0].costo_presentacion) || 0;
    }  
    
    const stock_agregado = cant_paquete * paquetes * factor;
    const costo_total = paquetes * costo_uni;
    const stock_actual_real = parseFloat(ins.rows[0].stock_actual) || 0;
    const nuevo_stock_total = stock_actual_real + stock_agregado;  
    
    const result = await db.query(
      'UPDATE insumos SET stock_actual = $1, costo_presentacion = $2 WHERE id = $3 RETURNING *',
      [nuevo_stock_total, costo_uni, id]
    );  
    
    await db.query(
      'INSERT INTO compras_insumos (insumo_id, paquetes, costo_unitario, costo_total, origen, usuario_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, paquetes, costo_uni, costo_total, origen, usuario_id]
    );  
    await db.query('COMMIT');
    res.json(result.rows[0]);
  } catch(e) {
    await db.query('ROLLBACK');
    console.error("Error al comprar insumo:", e);
    res.status(500).json({error: 'Error al procesar la compra.'});
  }
};  

exports.fijarStockExacto = async (req, res) => {
  const { id } = req.params;
  const { stock_real } = req.body; 
  try {
    const result = await db.query(
      'UPDATE insumos SET stock_actual = $1 WHERE id = $2 RETURNING *',
      [parseFloat(stock_real), id]
    );
    res.json(result.rows[0]);
  } catch(e) {
    console.error("Error al fijar stock exacto:", e);
    res.status(500).json({error: 'Error al actualizar el inventario.'});
  }
};

exports.obtenerComprasHoy = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ci.id, ci.costo_total, i.nombre, ci.usuario_id, ci.fecha_compra as created_at
      FROM compras_insumos ci
      JOIN insumos i ON ci.insumo_id = i.id
      WHERE DATE(ci.fecha_compra) = CURRENT_DATE AND ci.origen = 'Caja'
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({error: 'Error al obtener compras de hoy'});
  }
};  

exports.obtenerReporteCompras = async (req, res) => {
  const { periodo = 'dia', fecha = new Date().toISOString().split('T')[0] } = req.query;
  try {
    let query = `
      SELECT ci.id, ci.costo_total, ci.costo_unitario, ci.paquetes, ci.fecha_compra, ci.origen,
      i.nombre as insumo_nombre, i.unidad_medida
      FROM compras_insumos ci
      JOIN insumos i ON ci.insumo_id = i.id
      WHERE 1=1
    `;
    let params = [fecha];  
    if (periodo === 'dia') {
      query += ` AND ci.fecha_compra::DATE = $1::DATE`;
    } else if (periodo === 'semana') {
      query += ` AND ci.fecha_compra >= DATE_TRUNC('week', $1::TIMESTAMP) AND ci.fecha_compra < DATE_TRUNC('week', $1::TIMESTAMP) + INTERVAL '1 week'`;
    } else if (periodo === 'mes') {
      query += ` AND DATE_TRUNC('month', ci.fecha_compra::TIMESTAMP) = DATE_TRUNC('month', $1::TIMESTAMP)`;
    } else if (periodo === 'anio') {
      query += ` AND DATE_TRUNC('year', ci.fecha_compra::TIMESTAMP) = DATE_TRUNC('year', $1::TIMESTAMP)`;
    }  
    query += ` ORDER BY ci.fecha_compra DESC`;  
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    console.error("Error al obtener reporte de compras:", e);
    res.status(500).json({error: 'Error al obtener reporte de compras'});
  }
};  

// LÓGICA DE AUDITORÍAS (Bipartita)
exports.inicializarTablasAuditoria = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS auditorias_inventario (
        id SERIAL PRIMARY KEY,
        estado VARCHAR(50) DEFAULT 'solicitada',
        datos JSONB DEFAULT '{}',
        fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre TIMESTAMP
      );
    `);
  } catch (error) {
    console.error("❌ Error al inicializar tabla auditorias_inventario:", error);
  }
};

exports.obtenerAuditoriaActiva = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM auditorias_inventario WHERE estado != 'completada' ORDER BY id DESC LIMIT 1`);
    res.json(result.rows[0] || null);
  } catch(e) {
    res.status(500).json({error: 'Error al obtener auditoría activa'});
  }
};

exports.solicitarAuditoria = async (req, res) => {
  try {
    const activa = await db.query(`SELECT id FROM auditorias_inventario WHERE estado != 'completada'`);
    if (activa.rows.length > 0) return res.status(400).json({error: 'Ya hay un inventario en curso.'});

    const result = await db.query(`INSERT INTO auditorias_inventario (estado, datos) VALUES ('solicitada', '{}') RETURNING *`);
    const io = req.app.get('io');
    if (io) io.emit('auditoria_actualizada');

    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({error: 'Error al solicitar inventario'});
  }
};

exports.guardarProgresoAuditoria = async (req, res) => {
  const { id } = req.params;
  const { datos, enviar_a_revision } = req.body;
  try {
    const estado = enviar_a_revision ? 'revision' : 'en_progreso';
    const result = await db.query(
      `UPDATE auditorias_inventario SET datos = $1, estado = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(datos), estado, id]
    );

    const io = req.app.get('io');
    if (io) io.emit('auditoria_actualizada');

    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({error: 'Error al guardar progreso'});
  }
};

exports.resolverAuditoria = async (req, res) => {
  const { id } = req.params;
  const { accion } = req.body; 
  try {
    await db.query('BEGIN');
    const auditoria = await db.query(`SELECT datos FROM auditorias_inventario WHERE id = $1`, [id]);
    
    if (accion === 'rechazar') {
      await db.query(`UPDATE auditorias_inventario SET estado = 'en_progreso' WHERE id = $1`, [id]);
    } 
    else if (accion === 'aprobar') {
      const datos = auditoria.rows[0].datos;
      for (const [insumoId, cantidad] of Object.entries(datos)) {
        await db.query(`UPDATE insumos SET stock_actual = $1 WHERE id = $2`, [parseFloat(cantidad), insumoId]);
      }
      await db.query(`UPDATE auditorias_inventario SET estado = 'completada', fecha_cierre = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    }
    await db.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.emit('auditoria_actualizada');
      io.emit('catalogo_actualizado'); 
    }

    res.json({ success: true });
  } catch(e) {
    await db.query('ROLLBACK');
    res.status(500).json({error: 'Error al resolver auditoría'});
  }
};

exports.reiniciarStock = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('UPDATE insumos SET stock_actual = 0 WHERE id = $1 RETURNING *', [id]);
    res.json(result.rows[0]);
  } catch(e) {
    res.status(500).json({error: 'Error al reiniciar stock'});
  }
};  

exports.eliminarInsumo = async (req, res) => {
  try {
    await db.query('DELETE FROM insumos WHERE id = $1', [req.params.id]);
    res.json({success: true});
  } catch(e) {
    res.status(500).json({error: 'Error al eliminar insumo'});
  }
};

// =========================================================
// ALERTAS PUSH DE STOCK BAJO POR INSUMO (independiente del Admin/Edición general)
// =========================================================
exports.actualizarAlertaStock = async (req, res) => {
  const { id } = req.params;
  const { alerta_stock_activa, alerta_stock_minimo } = req.body;
  try {
    const result = await db.query(
      `UPDATE insumos SET alerta_stock_activa = $1, alerta_stock_minimo = $2, alerta_ya_enviada = false WHERE id = $3 RETURNING *`,
      [Boolean(alerta_stock_activa), parseFloat(alerta_stock_minimo) || 0, id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error("Error al actualizar alerta de stock:", e);
    res.status(500).json({ error: 'Error al guardar la alerta de stock.' });
  }
};

// =========================================================
// VERIFICADOR PERIÓDICO (se engancha al cron de api.js, cada 60s)
// =========================================================
exports.verificarAlertasStockPersonalizado = async (io) => {
  try {
    const result = await db.query(`
      SELECT id, nombre, stock_actual, unidad_medida, alerta_stock_minimo, alerta_ya_enviada
      FROM insumos
      WHERE alerta_stock_activa = true
    `);

    for (const ins of result.rows) {
      const stockActual = parseFloat(ins.stock_actual) || 0;
      const minimo = parseFloat(ins.alerta_stock_minimo) || 0;
      const yaEnviada = ins.alerta_ya_enviada === true;

      if (stockActual <= minimo && !yaEnviada) {
        // 👇 Dispara el push UNA SOLA VEZ y marca el candado
        await notificarStaff(
          null,
          '⚠️ Stock Bajo',
          `${ins.nombre} está en ${stockActual} ${ins.unidad_medida} (mínimo configurado: ${minimo}).`
        );
        await db.query(`UPDATE insumos SET alerta_ya_enviada = true WHERE id = $1`, [ins.id]);
        if (io) io.emit('alerta_stock_insumo', { id: ins.id, nombre: ins.nombre });
      } else if (stockActual > minimo && yaEnviada) {
        // 👇 Se reabasteció: rearma el candado para la próxima caída
        await db.query(`UPDATE insumos SET alerta_ya_enviada = false WHERE id = $1`, [ins.id]);
      }
    }
  } catch (e) {
    console.error("❌ Error al verificar alertas de stock por insumo:", e);
  }
};

// =========================================================
// NOTIFICAR STAFF (duplicado intencional de pedidoController.js, Opción B
// confirmada: evita tocar ese archivo y el riesgo de romper el flujo de pedidos)
// =========================================================
const webpush = require('web-push');
const notificarStaff = async (rolesArray, titulo, cuerpo) => {
    try {
        let query = "SELECT s.suscripcion FROM suscripciones_push s JOIN usuarios u ON s.usuario_id = u.id";
        let subs;
        if (rolesArray && rolesArray.length > 0) {
            const placeholders = rolesArray.map((_, i) => `$${i+1}`).join(',');
            query += ` WHERE u.rol IN (${placeholders})`;
            subs = await db.query(query, rolesArray);
        } else {
            subs = await db.query(query);
        }
        const payload = JSON.stringify({ title: titulo, body: cuerpo });
        for(let row of subs.rows) {
            const sub = typeof row.suscripcion === 'string' ? JSON.parse(row.suscripcion) : row.suscripcion;
            await webpush.sendNotification(sub, payload).catch(e => console.log("Push desactivado o expirado (staff):", e.message));
        }
    } catch(e) { console.error("Error al notificar staff (insumos):", e.message); }
};

// =========================================================
// SURTIDO DIARIO (Botón "Surtir") — Borrador único + aplicación en bloque
// =========================================================
exports.obtenerBorradorSurtido = async (req, res) => {
  try {
    const result = await db.query('SELECT datos FROM surtidos_borrador WHERE id = 1');
    const datos = result.rows.length > 0 ? result.rows[0].datos : {};
    res.json({ success: true, datos: datos || {} });
  } catch (e) {
    console.error("Error al obtener borrador de surtido:", e);
    res.status(500).json({ error: 'Error al obtener el borrador de surtido.' });
  }
};

exports.guardarBorradorSurtido = async (req, res) => {
  const { datos } = req.body;
  try {
    await db.query(
      `UPDATE surtidos_borrador SET datos = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = 1`,
      [JSON.stringify(datos || {})]
    );
    res.json({ success: true });
  } catch (e) {
    console.error("Error al guardar borrador de surtido:", e);
    res.status(500).json({ error: 'Error al guardar el borrador de surtido.' });
  }
};

exports.aplicarSurtido = async (req, res) => {
  const { datos } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const entradas = Object.entries(datos || {}).filter(([, cantidad]) => parseFloat(cantidad) > 0);

    for (const [insumoId, cantidad] of entradas) {
      await client.query(
        'UPDATE insumos SET stock_actual = stock_actual + $1 WHERE id = $2',
        [parseFloat(cantidad), insumoId]
      );
    }

    // Vaciamos el borrador: el surtido ya quedó aplicado de golpe
    await client.query(`UPDATE surtidos_borrador SET datos = '{}', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = 1`);

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json({ success: true, insumosActualizados: entradas.length });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error al aplicar surtido:", e);
    res.status(500).json({ error: 'Error al aplicar el surtido.' });
  } finally {
    client.release();
  }
};