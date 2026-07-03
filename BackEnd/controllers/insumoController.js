const db = require('../config/db');

exports.obtenerInsumos = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM insumos ORDER BY nombre ASC');
    const insumosLimpios = result.rows.map(ins => ({
      ...ins,
      stock_actual: isNaN(parseFloat(ins.stock_actual)) ? 0 : parseFloat(ins.stock_actual),
      costo_presentacion: isNaN(parseFloat(ins.costo_presentacion)) ? 0 : parseFloat(ins.costo_presentacion),
      cantidad_presentacion: isNaN(parseFloat(ins.cantidad_presentacion)) || parseFloat(ins.cantidad_presentacion) <= 0 ? 1 : parseFloat(ins.cantidad_presentacion),
      factor_rendimiento: isNaN(parseFloat(ins.factor_rendimiento)) ? 1 : parseFloat(ins.factor_rendimiento),
      es_empaque: ins.es_empaque === true || ins.es_empaque === 'true'
    }));
    res.json(insumosLimpios);
  } catch(e) {
    res.status(500).json({error: 'Error al obtener insumos'});
  }
};

exports.crearInsumo = async (req, res) => {
  const { nombre, unidad_medida, cantidad_presentacion, costo_presentacion, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio } = req.body;
  try {
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
    const result = await db.query(
      `INSERT INTO insumos
      (nombre, unidad_medida, cantidad_presentacion, costo_presentacion, stock_actual, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio, factor_rendimiento)
      VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9) RETURNING *`,
      [nombreLimpio, unidad_medida, parseFloat(cantidad_presentacion), parseFloat(costo_presentacion), Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) {
    console.error("Error al crear insumo:", e);
    res.status(500).json({error: 'Error al crear el insumo en el servidor.'});
  }
};

exports.actualizarInsumo = async (req, res) => {
  const { id } = req.params;
  const { nombre, unidad_medida, cantidad_presentacion, costo_presentacion, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio } = req.body;
  try {
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
    const result = await db.query(
      `UPDATE insumos SET
      nombre=$1, unidad_medida=$2, cantidad_presentacion=$3, costo_presentacion=$4, es_empaque=$5,
      tipo_rendimiento=$6, peso_prueba_crudo=$7, peso_prueba_limpio=$8, factor_rendimiento=$9
      WHERE id=$10 RETURNING *`,
      [nombreLimpio, unidad_medida, parseFloat(cantidad_presentacion), parseFloat(costo_presentacion), Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento, id]
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
  try {
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
      'INSERT INTO compras_insumos (insumo_id, paquetes, costo_unitario, costo_total, origen) VALUES ($1, $2, $3, $4, $5)',
      [id, paquetes, costo_uni, costo_total, origen]
    );
    await db.query('COMMIT');
    res.json(result.rows[0]);
  } catch(e) {
    await db.query('ROLLBACK');
    console.error("Error al comprar insumo:", e);
    res.status(500).json({error: 'Error al procesar la compra.'});
  }
};

exports.obtenerComprasHoy = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ci.id, ci.costo_total, i.nombre
      FROM compras_insumos ci
      JOIN insumos i ON ci.insumo_id = i.id
      WHERE DATE(ci.fecha_compra) = CURRENT_DATE AND ci.origen = 'Caja'
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({error: 'Error al obtener compras de hoy'});
  }
};

// 👇 NUEVA LÓGICA DE FILTRADO PARA EL REPORTE DE COMPRAS
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