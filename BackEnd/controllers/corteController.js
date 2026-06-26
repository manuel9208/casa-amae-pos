const db = require('../config/db');

exports.guardarCorte = async (req, res) => {
  const {
    fecha, 
    usuario_id,
    fondo_inicial, fondo_caja,
    fondo_repartidor,
    venta_platillos, total_platillos,
    ingresos_extras, total_extras,
    cargos_envio, total_envio,
    total_efectivo,
    total_tarjeta,
    total_transferencia,
    total_gastos,
    efectivo_cajon,
    pedidos_incluidos,
    detalles_envio
  } = req.body;

  // 🛡️ ESCUDO ANTI-NULL: Forzamos a que TODO sea un número válido. 
  const f_inicial = Number(fondo_inicial ?? fondo_caja) || 0;
  const f_repartidor = Number(fondo_repartidor) || 0;
  const v_platillos = Number(venta_platillos ?? total_platillos) || 0;
  const i_extras = Number(ingresos_extras ?? total_extras) || 0;
  const c_envio = Number(cargos_envio ?? total_envio) || 0;
  const t_efectivo = Number(total_efectivo) || 0;
  const t_tarjeta = Number(total_tarjeta) || 0;
  const t_transferencia = Number(total_transferencia) || 0;
  const t_gastos = Number(total_gastos) || 0;
  const e_cajon = Number(efectivo_cajon) || 0;
  
  const fechaCorte = fecha || new Date().toISOString().split('T')[0];

  try {
    // 👇 FIX: Buscamos si el CAJERO EXACTO ya tiene un corte abierto en este día
    const existeCorte = await db.query(
      'SELECT id FROM historico_cortes WHERE fecha_corte = $1 AND usuario_id IS NOT DISTINCT FROM $2', 
      [fechaCorte, usuario_id || null]
    );

    let result;
    if (existeCorte.rows.length > 0) {
      // Si existe, lo ACTUALIZAMOS (Autoguardado del mismo turno)
      result = await db.query(
        `UPDATE historico_cortes SET 
          fondo_inicial = $1, 
          fondo_repartidor = $2, 
          venta_platillos = $3, 
          ingresos_extras = $4, 
          cargos_envio = $5,
          total_efectivo = $6, 
          total_tarjeta = $7, 
          total_transferencia = $8, 
          total_gastos = $9, 
          efectivo_cajon = $10, 
          pedidos_incluidos = COALESCE($11, pedidos_incluidos), 
          detalles_envio = COALESCE($12, detalles_envio),
          fecha_creacion = CURRENT_TIMESTAMP
        WHERE id = $13 RETURNING *`,
        [
          f_inicial, f_repartidor, v_platillos, i_extras, c_envio,
          t_efectivo, t_tarjeta, t_transferencia, t_gastos, e_cajon,
          pedidos_incluidos ? JSON.stringify(pedidos_incluidos) : null, 
          detalles_envio ? JSON.stringify(detalles_envio) : null,
          existeCorte.rows[0].id
        ]
      );
    } else {
      // Si entra otro cajero, CREAMOS UN NUEVO TURNO en el mismo día
      result = await db.query(
        `INSERT INTO historico_cortes (
          fecha_corte, usuario_id, fondo_inicial, fondo_repartidor, venta_platillos, ingresos_extras, cargos_envio,
          total_efectivo, total_tarjeta, total_transferencia, total_gastos, efectivo_cajon, pedidos_incluidos, detalles_envio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
          fechaCorte, usuario_id || null, f_inicial, f_repartidor, v_platillos, i_extras, c_envio,
          t_efectivo, t_tarjeta, t_transferencia, t_gastos, e_cajon,
          JSON.stringify(pedidos_incluidos || []), JSON.stringify(detalles_envio || {})
        ]
      );
    }

    res.json({ success: true, corte: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el corte de caja' });
  }
};

exports.obtenerHistorial = async (req, res) => {
  const { fecha, completo } = req.query;

  try {
    let result;
    if (fecha) {
        result = await db.query(`
          SELECT c.*, u.nombre as usuario_nombre 
          FROM historico_cortes c 
          LEFT JOIN usuarios u ON c.usuario_id = u.id 
          WHERE c.fecha_corte = $1
          ORDER BY c.fecha_creacion ASC
        `, [fecha]);
    } else {
        result = await db.query(`
          SELECT c.*, u.nombre as usuario_nombre 
          FROM historico_cortes c 
          LEFT JOIN usuarios u ON c.usuario_id = u.id 
          ORDER BY c.fecha_corte DESC, c.fecha_creacion DESC
        `);
    }
    
    if (fecha && result.rows.length > 0) {
        // 👇 FIX: Si piden completo devolvemos todos los turnos del día, si no, solo el último
        if (completo === 'true') {
            res.json(result.rows);
        } else {
            res.json(result.rows[result.rows.length - 1]);
        }
    } else if (fecha && result.rows.length === 0) {
        res.status(404).json({ error: 'Corte no encontrado.' });
    } else {
        res.json(result.rows);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
};