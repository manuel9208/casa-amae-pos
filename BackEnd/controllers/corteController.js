const db = require('../config/db');

exports.guardarCorte = async (req, res) => {
  const {
    usuario_id,
    fondo_inicial,
    fondo_repartidor,
    venta_platillos,
    ingresos_extras,
    cargos_envio,
    total_efectivo,
    total_tarjeta,
    total_transferencia,
    total_gastos,
    efectivo_cajon,
    pedidos_incluidos,
    detalles_envio
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO historico_cortes (
        usuario_id, fondo_inicial, fondo_repartidor, venta_platillos, ingresos_extras, cargos_envio,
        total_efectivo, total_tarjeta, total_transferencia, total_gastos, efectivo_cajon, pedidos_incluidos, detalles_envio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        usuario_id, 
        fondo_inicial, 
        fondo_repartidor || 0, 
        venta_platillos, 
        ingresos_extras, 
        cargos_envio,
        total_efectivo, 
        total_tarjeta, 
        total_transferencia, 
        total_gastos, 
        efectivo_cajon,
        JSON.stringify(pedidos_incluidos || []), 
        JSON.stringify(detalles_envio || {})
      ]
    );
    res.json({ success: true, corte: result.rows[0] });
  } catch (error) {
    console.error('Error al guardar corte:', error);
    res.status(500).json({ error: 'Error al guardar el corte de caja' });
  }
};

exports.obtenerHistorial = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, u.nombre as usuario_nombre 
      FROM historico_cortes c 
      LEFT JOIN usuarios u ON c.usuario_id = u.id 
      ORDER BY c.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener historial de cortes:', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
};