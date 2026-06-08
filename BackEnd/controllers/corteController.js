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
  // Si desde el Frontend envían un campo vacío (""), null o undefined, se convierte en 0 automáticamente.
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
    // 1. Buscamos si ya existe el corte de ese día exacto
    const existeCorte = await db.query('SELECT id FROM historico_cortes WHERE fecha_corte = $1', [fechaCorte]);

    let result;
    if (existeCorte.rows.length > 0) {
      // 2. Si existe, lo ACTUALIZAMOS (Esto evita que se saturen los registros)
      result = await db.query(
        `UPDATE historico_cortes SET 
          usuario_id = COALESCE($1, usuario_id),
          fondo_inicial = $2, 
          fondo_repartidor = $3, 
          venta_platillos = $4, 
          ingresos_extras = $5, 
          cargos_envio = $6,
          total_efectivo = $7, 
          total_tarjeta = $8, 
          total_transferencia = $9, 
          total_gastos = $10, 
          efectivo_cajon = $11, 
          pedidos_incluidos = COALESCE($12, pedidos_incluidos), 
          detalles_envio = COALESCE($13, detalles_envio),
          fecha_creacion = CURRENT_TIMESTAMP
        WHERE fecha_corte = $14 RETURNING *`,
        [
          usuario_id || null, 
          f_inicial, 
          f_repartidor, 
          v_platillos, 
          i_extras, 
          c_envio,
          t_efectivo, 
          t_tarjeta, 
          t_transferencia, 
          t_gastos, 
          e_cajon,
          pedidos_incluidos ? JSON.stringify(pedidos_incluidos) : null, 
          detalles_envio ? JSON.stringify(detalles_envio) : null,
          fechaCorte
        ]
      );
    } else {
      // 3. Si no existe, creamos uno NUEVO
      result = await db.query(
        `INSERT INTO historico_cortes (
          fecha_corte, usuario_id, fondo_inicial, fondo_repartidor, venta_platillos, ingresos_extras, cargos_envio,
          total_efectivo, total_tarjeta, total_transferencia, total_gastos, efectivo_cajon, pedidos_incluidos, detalles_envio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
          fechaCorte, 
          usuario_id || null, 
          f_inicial, 
          f_repartidor, 
          v_platillos, 
          i_extras, 
          c_envio,
          t_efectivo, 
          t_tarjeta, 
          t_transferencia, 
          t_gastos, 
          e_cajon,
          JSON.stringify(pedidos_incluidos || []), 
          JSON.stringify(detalles_envio || {})
        ]
      );
    }

    res.json({ success: true, corte: result.rows[0] });
  } catch (error) {
    console.error('Error al guardar corte:', error);
    res.status(500).json({ error: 'Error al guardar el corte de caja' });
  }
};

exports.obtenerHistorial = async (req, res) => {
  const { fecha } = req.query;

  try {
    let result;
    if (fecha) {
        // Buscamos EXACTAMENTE POR fecha_corte
        result = await db.query(`
          SELECT c.*, u.nombre as usuario_nombre 
          FROM historico_cortes c 
          LEFT JOIN usuarios u ON c.usuario_id = u.id 
          WHERE c.fecha_corte = $1
          ORDER BY c.id DESC
        `, [fecha]);
    } else {
        result = await db.query(`
          SELECT c.*, u.nombre as usuario_nombre 
          FROM historico_cortes c 
          LEFT JOIN usuarios u ON c.usuario_id = u.id 
          ORDER BY c.fecha_corte DESC
        `);
    }
    
    if (fecha && result.rows.length > 0) {
        res.json(result.rows[0]);
    } else if (fecha && result.rows.length === 0) {
        res.status(404).json({ error: 'Corte no encontrado.' });
    } else {
        res.json(result.rows);
    }
  } catch (error) {
    console.error('Error al obtener historial de cortes:', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
};