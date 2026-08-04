const db = require('../config/db');

// 👇 MOTOR DE AUTO-MIGRACIÓN: Destruye el candado rígido de la base de datos
// Esto nos permite guardar 'descuento_fijo' o cualquier nuevo tipo en el futuro.
const asegurarMigracionPromociones = async () => {
  try {
    await db.query('ALTER TABLE promociones DROP CONSTRAINT IF EXISTS promociones_tipo_descuento_check;');
  } catch (e) {
    console.error("Aviso: Migración de promociones omitida o ya aplicada.");
  }
};

exports.obtenerPromociones = async (req, res) => {
  await asegurarMigracionPromociones();
  try {
    const result = await db.query(`
      SELECT p.*, 
             t.nombre AS trigger_nombre, 
             o.nombre AS oferta_nombre, o.imagen_url AS oferta_imagen
      FROM promociones p
      LEFT JOIN productos t ON p.producto_trigger_id = t.id
      LEFT JOIN productos o ON p.producto_oferta_id = o.id
      ORDER BY p.activo DESC, p.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener promociones' });
  }
};

exports.crearPromocion = async (req, res) => {
  await asegurarMigracionPromociones();
  const { nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin, config_oferta } = req.body;
  
  try {
    // Sanitizamos el JSON para soportar el nuevo Motor Avanzado de Opciones
    const configOfertaParsed = typeof config_oferta === 'string' ? config_oferta : JSON.stringify(config_oferta || {});

    const result = await db.query(
      `INSERT INTO promociones 
      (nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin, config_oferta) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb) RETURNING *`,
      [nombre, tipo, producto_trigger_id || null, categoria_trigger || null, producto_oferta_id || null, tipo_descuento, valor_descuento, JSON.stringify(dias_aplicables), hora_inicio, hora_fin, configOfertaParsed]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la promoción' });
  }
};

exports.actualizarEstadoPromocion = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const result = await db.query('UPDATE promociones SET activo = $1 WHERE id = $2 RETURNING *', [activo, id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado de la promoción' });
  }
};

exports.eliminarPromocion = async (req, res) => {
  try {
    await db.query('DELETE FROM promociones WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la promoción' });
  }
};

exports.actualizarPromocion = async (req, res) => {
  await asegurarMigracionPromociones();
  const { id } = req.params;
  const { nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin, config_oferta } = req.body;
  try {
    const configOfertaParsed = typeof config_oferta === 'string' ? config_oferta : JSON.stringify(config_oferta || {});

    const result = await db.query(
      `UPDATE promociones SET 
        nombre = $1, tipo = $2, producto_trigger_id = $3, categoria_trigger = $4, 
        producto_oferta_id = $5, tipo_descuento = $6, valor_descuento = $7, 
        dias_aplicables = $8::jsonb, hora_inicio = $9, hora_fin = $10, config_oferta = $11::jsonb
      WHERE id = $12 RETURNING *`,
      [nombre, tipo, producto_trigger_id || null, categoria_trigger || null, producto_oferta_id || null, tipo_descuento, valor_descuento, JSON.stringify(dias_aplicables), hora_inicio, hora_fin, configOfertaParsed, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promoción no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar promoción:", error);
    res.status(500).json({ error: 'Error al actualizar la promoción' });
  }
};