const db = require('../config/db');

exports.obtenerPromociones = async (req, res) => {
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
  const { nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin } = req.body;
  
  try {
    const result = await db.query(
      `INSERT INTO promociones 
      (nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10) RETURNING *`,
      [nombre, tipo, producto_trigger_id || null, categoria_trigger || null, producto_oferta_id, tipo_descuento, valor_descuento, JSON.stringify(dias_aplicables), hora_inicio, hora_fin]
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
  const { id } = req.params;
  const { nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin } = req.body;
  try {
    const result = await db.query(
      `UPDATE promociones SET 
        nombre = $1, tipo = $2, producto_trigger_id = $3, categoria_trigger = $4, 
        producto_oferta_id = $5, tipo_descuento = $6, valor_descuento = $7, 
        dias_aplicables = $8::jsonb, hora_inicio = $9, hora_fin = $10
      WHERE id = $11 RETURNING *`,
      [nombre, tipo, producto_trigger_id || null, categoria_trigger || null, producto_oferta_id, tipo_descuento, valor_descuento, JSON.stringify(dias_aplicables), hora_inicio, hora_fin, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promoción no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar promoción:", error);
    res.status(500).json({ error: 'Error al actualizar la promoción' });
  }
};