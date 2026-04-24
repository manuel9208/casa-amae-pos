const db = require('../config/db');

exports.getClasificaciones = async (req, res) => {
  try { res.json((await db.query("SELECT * FROM clasificaciones ORDER BY id ASC")).rows); }
  catch (e) { res.status(500).json({error: 'Error'}); }
};

exports.crearClasificacion = async (req, res) => {
  const { nombre, destino, emoji } = req.body;
  // 👇 CAMBIO CLOUDINARY: req.file.path
  const imagen_url = req.file ? req.file.path : null;
  try { 
    res.status(201).json((await db.query("INSERT INTO clasificaciones (nombre, destino, emoji, imagen_url) VALUES ($1, $2, $3, $4) RETURNING *", [nombre, destino || 'Cocina', emoji || '🍽️', imagen_url])).rows[0]); 
  } catch (e) { res.status(500).json({error: 'Error'}); }
};

exports.actualizarClasificacion = async (req, res) => {
  const { id } = req.params;
  const { nombre, destino, emoji } = req.body;
  try {
    let query, values;
    if (req.file) {
      // 👇 CAMBIO CLOUDINARY: req.file.path
      const imagen_url = req.file.path;
      query = "UPDATE clasificaciones SET nombre = $1, destino = $2, emoji = $3, imagen_url = $4 WHERE id = $5 RETURNING *";
      values = [nombre, destino || 'Cocina', emoji || '🍽️', imagen_url, id];
    } else {
      query = "UPDATE clasificaciones SET nombre = $1, destino = $2, emoji = $3 WHERE id = $4 RETURNING *";
      values = [nombre, destino || 'Cocina', emoji || '🍽️', id];
    }
    const actualizado = await db.query(query, values);
    res.json(actualizado.rows[0]);
  } catch (e) { res.status(500).json({error: 'Error al actualizar clasificación'}); }
};

exports.eliminarClasificacion = async (req, res) => {
  try { await db.query("DELETE FROM clasificaciones WHERE id=$1", [req.params.id]); res.json({mensaje: 'OK'}); }
  catch (e) { res.status(500).json({error: 'Error'}); }
};

exports.getIngredientes = async (req, res) => {
  try { res.json((await db.query("SELECT i.*, c.nombre as clasificacion_nombre FROM catalogo_ingredientes i JOIN clasificaciones c ON i.clasificacion_id = c.id ORDER BY c.nombre, i.tipo, i.nombre")).rows); }
  catch (e) { res.status(500).json({error: 'Error'}); }
};

exports.crearIngrediente = async (req, res) => {
  const { clasificacion_id, nombre, tipo, precio_extra, permite_extra } = req.body;
  try {
    const existe = await db.query('SELECT id FROM catalogo_ingredientes WHERE clasificacion_id = $1 AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))', [clasificacion_id, nombre]);
    if (existe.rows.length > 0) return res.status(400).json({ error: `El ingrediente "${nombre}" ya está registrado en esta clasificación.` });
    const pExtra = permite_extra !== undefined ? permite_extra : true;
    const insertado = await db.query("INSERT INTO catalogo_ingredientes (clasificacion_id, nombre, tipo, precio_extra, permite_extra) VALUES ($1, $2, $3, $4, $5) RETURNING *", [clasificacion_id, nombre, tipo, precio_extra || 0, pExtra]);
    res.status(201).json(insertado.rows[0]);
  } catch (e) { res.status(500).json({error: 'Error al crear el ingrediente'}); }
};

exports.actualizarIngrediente = async (req, res) => {
  const { id } = req.params; const { nombre, tipo, precio_extra, permite_extra } = req.body;
  try {
    const existe = await db.query('SELECT id FROM catalogo_ingredientes WHERE clasificacion_id = (SELECT clasificacion_id FROM catalogo_ingredientes WHERE id = $1) AND LOWER(TRIM(nombre)) = LOWER(TRIM($2)) AND id != $1', [id, nombre]);
    if (existe.rows.length > 0) return res.status(400).json({ error: `Ya existe otro ingrediente llamado "${nombre}".` });
    const pExtra = permite_extra !== undefined ? permite_extra : true;
    const actualizado = await db.query("UPDATE catalogo_ingredientes SET nombre = $1, tipo = $2, precio_extra = $3, permite_extra = $4 WHERE id = $5 RETURNING *", [nombre, tipo, precio_extra || 0, pExtra, id]);
    res.json(actualizado.rows[0]);
  } catch (e) { res.status(500).json({error: 'Error al actualizar'}); }
};

exports.eliminarIngrediente = async (req, res) => {
  try { await db.query("DELETE FROM catalogo_ingredientes WHERE id=$1", [req.params.id]); res.json({mensaje: 'OK'}); }
  catch (e) { res.status(500).json({error: 'Error'}); }
};