const db = require('../config/db');

exports.obtenerProductos = async (req, res) => { 
  try { 
    const result = await db.query('SELECT * FROM productos ORDER BY id ASC'); 
    res.json(result.rows); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al obtener productos' }); 
  } 
};

exports.crearProducto = async (req, res) => {
  const { nombre, descripcion, precio_base, emoji, categoria, opciones, tiempo_preparacion } = req.body; 
  // 👇 CAMBIO CLOUDINARY: req.file.path
  const imagen_url = req.file ? req.file.path : null;
  try { 
    const result = await db.query(
      'INSERT INTO productos (nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion, rendimiento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1) RETURNING *', 
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15]
    ); 
    res.json(result.rows[0]); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al crear producto' }); 
  }
};

exports.actualizarProducto = async (req, res) => {
  const { id } = req.params; 
  const { nombre, descripcion, precio_base, emoji, categoria, opciones, tiempo_preparacion } = req.body; 
  // 👇 CAMBIO CLOUDINARY: req.file.path
  const imagen_url = req.file ? req.file.path : null;
  try { 
    const result = await db.query(
      'UPDATE productos SET nombre=$1, descripcion=$2, precio_base=$3, emoji=$4, categoria=$5, opciones=$6, imagen_url=COALESCE($7, imagen_url), tiempo_preparacion=$8 WHERE id=$9 RETURNING *', 
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15, id]
    ); 
    res.json(result.rows[0]); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al actualizar producto' }); 
  }
};

exports.eliminarProducto = async (req, res) => { 
  try { 
    await db.query('DELETE FROM productos WHERE id = $1', [req.params.id]); 
    res.json({ success: true }); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al eliminar producto' }); 
  } 
};

// ================= NUEVO: ACTUALIZAR RENDIMIENTO =================
exports.actualizarRendimiento = async (req, res) => {
  try {
    const result = await db.query('UPDATE productos SET rendimiento=$1 WHERE id=$2 RETURNING *', [req.body.rendimiento, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error al guardar rendimiento' }); 
  }
};