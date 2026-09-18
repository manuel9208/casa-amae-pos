const db = require('../config/db');

// =========================================================
// AUTO-MIGRACIÓN DE BASE DE DATOS (Solo al arrancar)
// =========================================================
exports.inicializarInsumos = async () => {
  try {
    await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS insumos_sustitutos JSONB DEFAULT '[]'::jsonb;`);
    console.log("✅ Columna de sustitutos múltiples verificada/creada en la BD.");
  } catch (error) {
    console.error("❌ Error al inicializar columna de insumos_sustitutos:", error);
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
      insumo_sustituto_id: ins.insumo_sustituto_id || '' // 👈 NUEVO: Campo de Respaldo
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
    insumo_sustituto_id // 👈 NUEVO
  } = req.body;

  try {
    // 👇 AUTO-MIGRACIÓN: Crea la columna en PostgreSQL automáticamente si no existe
    await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS insumo_sustituto_id INTEGER;`).catch(()=>null);

    const nombreLimpio = String(nombre).trim();
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
      (nombre, unidad_medida, cantidad_presentacion, costo_presentacion, stock_actual, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio, factor_rendimiento, insumo_sustituto_id)
      VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [nombreLimpio, unidad_medida, parseFloat(cantidad_presentacion), parseFloat(costo_presentacion), Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento, sustitutoFinal]
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
    insumo_sustituto_id // 👈 NUEVO
  } = req.body;

  try {
    await db.query(`ALTER TABLE insumos ADD COLUMN IF NOT EXISTS insumo_sustituto_id INTEGER;`).catch(()=>null);

    const nombreLimpio = String(nombre).trim();
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
      tipo_rendimiento=$6, peso_prueba_crudo=$7, peso_prueba_limpio=$8, factor_rendimiento=$9, insumo_sustituto_id=$10
      WHERE id=$11 RETURNING *`,
      [nombreLimpio, unidad_medida, parseFloat(cantidad_presentacion), parseFloat(costo_presentacion), Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento, sustitutoFinal, id]
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