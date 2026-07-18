const db = require('../config/db');

// 👇 ESCUDO DE ZONA HORARIA PARA EL SERVIDOR (Node.js)
const getMazatlanDateStr = () => {
  const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(new Date());
  let dDay, dMonth, dYear;
  parts.forEach(part => {
      if(part.type === 'day') dDay = part.value;
      if(part.type === 'month') dMonth = part.value;
      if(part.type === 'year') dYear = part.value;
  });
  return `${dYear}-${dMonth}-${dDay}`;
};

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
    detalles_envio,
    turno_cerrado // 👈 Bandera para saber si se sella el turno
  } = req.body;

  // 🛡️ ESCUDO ANTI-NULL
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
  const isCerrado = turno_cerrado === true;
  
  // 👇 FIX: Evita que el servidor UTC asigne la fecha de "mañana" después de las 6:00 PM
  const fechaCorte = fecha || getMazatlanDateStr();

  try {
    // 👇 FIX: Casteo a ::DATE para ignorar horas y evitar desfaces
    const existeCorte = await db.query(
      'SELECT id FROM historico_cortes WHERE fecha_corte::DATE = $1::DATE AND usuario_id IS NOT DISTINCT FROM $2 AND turno_cerrado = false ORDER BY id DESC LIMIT 1', 
      [fechaCorte, usuario_id || null]
    );

    let result;
    if (existeCorte.rows.length > 0) {
      // Si existe y está abierto, lo ACTUALIZAMOS
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
          turno_cerrado = $13,
          fecha_creacion = CURRENT_TIMESTAMP
        WHERE id = $14 RETURNING *`,
        [
          f_inicial, f_repartidor, v_platillos, i_extras, c_envio,
          t_efectivo, t_tarjeta, t_transferencia, t_gastos, e_cajon,
          pedidos_incluidos ? JSON.stringify(pedidos_incluidos) : null, 
          detalles_envio ? JSON.stringify(detalles_envio) : null,
          isCerrado,
          existeCorte.rows[0].id
        ]
      );
    } else {
      // Si entra otro cajero o inicia otro turno, CREAMOS UN NUEVO TURNO
      result = await db.query(
        `INSERT INTO historico_cortes (
          fecha_corte, usuario_id, fondo_inicial, fondo_repartidor, venta_platillos, ingresos_extras, cargos_envio,
          total_efectivo, total_tarjeta, total_transferencia, total_gastos, efectivo_cajon, pedidos_incluidos, detalles_envio, turno_cerrado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
        [
          fechaCorte, usuario_id || null, f_inicial, f_repartidor, v_platillos, i_extras, c_envio,
          t_efectivo, t_tarjeta, t_transferencia, t_gastos, e_cajon,
          JSON.stringify(pedidos_incluidos || []), JSON.stringify(detalles_envio || {}), isCerrado
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
        // 👇 FIX: Casteo a ::DATE para garantizar que matché solo el día
        result = await db.query(`
          SELECT c.*, u.nombre as usuario_nombre 
          FROM historico_cortes c 
          LEFT JOIN usuarios u ON c.usuario_id = u.id 
          WHERE c.fecha_corte::DATE = $1::DATE
          ORDER BY c.id ASC
        `, [fecha]);
    } else {
        result = await db.query(`
          SELECT c.*, u.nombre as usuario_nombre 
          FROM historico_cortes c 
          LEFT JOIN usuarios u ON c.usuario_id = u.id 
          ORDER BY c.fecha_corte DESC, c.id DESC
        `);
    }
    
    if (fecha && result.rows.length > 0) {
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