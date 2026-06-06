const db = require('../config/db');  

const asegurarTablaCortes = async () => {
  try {
    // 🛡️ BLINDAJE: Solo agregamos las columnas JSON nuevas si no existen.
    // Las columnas de dinero se mantienen con sus nombres oficiales de Postgres.
    await db.query(`
      ALTER TABLE historico_cortes
      ADD COLUMN IF NOT EXISTS desglose_gastos JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS detalles_envio JSONB DEFAULT '{}'::jsonb;
    `);
  } catch (error) {
    console.error("Error al asegurar tabla de cortes:", error);
  }
};
asegurarTablaCortes();  

// 👇 RUTA PARA EL AUTO-GUARDADO SILENCIOSO
exports.guardarCorte = async (req, res) => {
  const {
    fecha, fondo_caja, total_platillos, total_extras, total_envio,
    total_efectivo, total_tarjeta, total_transferencia, total_gastos, desglose_gastos,
    detalles_envio
  } = req.body;  

  try {
    // 1. Buscamos si ya existe el corte de hoy
    const existeCorte = await db.query('SELECT id FROM historico_cortes WHERE fecha_corte = $1', [fecha]);

    let result;
    
    // Calculamos el efectivo esperado en el cajón (Fondo + Efectivo - Gastos)
    const efectivoCajonCalculado = (Number(fondo_caja) || 0) + (Number(total_efectivo) || 0) - (Number(total_gastos) || 0);

    if (existeCorte.rows.length > 0) {
      // 2. Si el corte ya existe, lo actualizamos (TRADUCCIÓN DE NOMBRES)
      result = await db.query(`
        UPDATE historico_cortes SET 
          fondo_inicial = $2, 
          venta_platillos = $3, 
          ingresos_extras = $4, 
          cargos_envio = $5,
          total_efectivo = $6, 
          total_tarjeta = $7, 
          total_transferencia = $8, 
          total_gastos = $9,
          efectivo_cajon = $10,
          desglose_gastos = $11, 
          detalles_envio = $12, 
          fecha_creacion = CURRENT_TIMESTAMP
        WHERE fecha_corte = $1 RETURNING *;
      `, [
        fecha, 
        fondo_caja || 0, 
        total_platillos || 0, 
        total_extras || 0, 
        total_envio || 0,
        total_efectivo || 0, 
        total_tarjeta || 0, 
        total_transferencia || 0, 
        total_gastos || 0,
        efectivoCajonCalculado,
        JSON.stringify(desglose_gastos || []), 
        JSON.stringify(detalles_envio || {})
      ]);
    } else {
      // 3. Si no existe, creamos uno nuevo (TRADUCCIÓN DE NOMBRES)
      result = await db.query(`
        INSERT INTO historico_cortes (
          fecha_corte, fondo_inicial, venta_platillos, ingresos_extras, cargos_envio,
          total_efectivo, total_tarjeta, total_transferencia, total_gastos, efectivo_cajon,
          pedidos_incluidos, desglose_gastos, detalles_envio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '[]'::jsonb, $11, $12) RETURNING *;
      `, [
        fecha, 
        fondo_caja || 0, 
        total_platillos || 0, 
        total_extras || 0, 
        total_envio || 0,
        total_efectivo || 0, 
        total_tarjeta || 0, 
        total_transferencia || 0, 
        total_gastos || 0,
        efectivoCajonCalculado,
        JSON.stringify(desglose_gastos || []), 
        JSON.stringify(detalles_envio || {})
      ]);
    }

    res.status(200).json({ success: true, corte: result.rows[0] });
  } catch (error) {
    console.error("Error al auto-guardar el corte:", error);
    res.status(500).json({ error: 'Error al auto-guardar el corte' });
  }
};  

exports.obtenerHistorial = async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) return res.status(400).json({ error: 'Falta fecha' });

  try {
    const result = await db.query('SELECT * FROM historico_cortes WHERE fecha_corte = $1::DATE', [fecha]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vacío' });
    
    const row = result.rows[0];
    
    // 👇 TRADUCCIÓN INVERSA: Le devolvemos al FrontEnd los nombres de variables que espera leer
    res.json({
      id: row.id,
      fecha: row.fecha_corte,
      fondo_caja: row.fondo_inicial,
      total_platillos: row.venta_platillos,
      total_extras: row.ingresos_extras,
      total_envio: row.cargos_envio,
      total_efectivo: row.total_efectivo,
      total_tarjeta: row.total_tarjeta,
      total_transferencia: row.total_transferencia,
      total_gastos: row.total_gastos,
      desglose_gastos: row.desglose_gastos,
      detalles_envio: row.detalles_envio
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Error BD' });
  }
};