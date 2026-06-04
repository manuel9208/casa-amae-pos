const db = require('../config/db');

const asegurarTablaCortes = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS historico_cortes (
        id SERIAL PRIMARY KEY,
        fecha DATE UNIQUE NOT NULL,
        fondo_caja DECIMAL(10,2) DEFAULT 0,
        total_platillos DECIMAL(10,2) DEFAULT 0,
        total_extras DECIMAL(10,2) DEFAULT 0,
        total_envio DECIMAL(10,2) DEFAULT 0,
        total_efectivo DECIMAL(10,2) DEFAULT 0,
        total_tarjeta DECIMAL(10,2) DEFAULT 0,
        total_transferencia DECIMAL(10,2) DEFAULT 0,
        total_gastos DECIMAL(10,2) DEFAULT 0,
        desglose_gastos JSONB DEFAULT '[]'::jsonb,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 👇 BLINDAJE: Agregamos la columna JSON para guardar el corte exclusivo de Motos
    await db.query(`
      ALTER TABLE historico_cortes 
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
    detalles_envio // 👈 Recibimos la nueva data del frontend
  } = req.body;

  try {
    const query = `
      INSERT INTO historico_cortes (
        fecha, fondo_caja, total_platillos, total_extras, total_envio, 
        total_efectivo, total_tarjeta, total_transferencia, total_gastos, desglose_gastos, detalles_envio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (fecha) DO UPDATE SET
        fondo_caja = EXCLUDED.fondo_caja,
        total_platillos = EXCLUDED.total_platillos,
        total_extras = EXCLUDED.total_extras,
        total_envio = EXCLUDED.total_envio,
        total_efectivo = EXCLUDED.total_efectivo,
        total_tarjeta = EXCLUDED.total_tarjeta,
        total_transferencia = EXCLUDED.total_transferencia,
        total_gastos = EXCLUDED.total_gastos,
        desglose_gastos = EXCLUDED.desglose_gastos,
        detalles_envio = EXCLUDED.detalles_envio,
        fecha_registro = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const values = [
      fecha, fondo_caja || 0, total_platillos || 0, total_extras || 0, total_envio || 0,
      total_efectivo || 0, total_tarjeta || 0, total_transferencia || 0, total_gastos || 0,
      JSON.stringify(desglose_gastos || []),
      JSON.stringify(detalles_envio || {}) // 👈 Lo guardamos en la base de datos
    ];

    const result = await db.query(query, values);
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
    const result = await db.query('SELECT * FROM historico_cortes WHERE fecha = $1::DATE', [fecha]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vacío' });
    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error BD' }); 
  }
};