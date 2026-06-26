const db = require('../config/db');
const cloudinary = require('cloudinary').v2; 

const extraerPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const pathSinVersion = parts[1].replace(/^v\d+\//, '');
    const publicId = pathSinVersion.substring(0, pathSinVersion.lastIndexOf('.'));
    return publicId || pathSinVersion;
  } catch (e) { return null; }
};

const borrarDeCloudinary = (urlVieja) => {
  const publicId = extraerPublicId(urlVieja);
  if (publicId) { 
    cloudinary.uploader.destroy(publicId).catch(err => {
      console.error("Error al destruir imagen en Cloudinary:", err);
    }); 
  }
};

exports.obtenerProductos = async (req, res) => { 
  try { 
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_stock BOOLEAN DEFAULT false;').catch(() => null);

    const result = await db.query('SELECT * FROM productos ORDER BY id ASC'); 
    res.json(result.rows); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al obtener productos' }); 
  } 
};

exports.crearProducto = async (req, res) => {
  const { nombre, descripcion, precio_base, emoji, categoria, opciones, tiempo_preparacion, disponible, genera_puntos, usa_stock, stock_preparado } = req.body; 
  
  const imagen_url = req.file ? req.file.path : null;
  
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true);
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);
  const isUsaStock = usa_stock === 'true' || usa_stock === true;
  const stockNum = parseInt(stock_preparado) || 0;

  try { 
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_stock BOOLEAN DEFAULT false;').catch(() => null);

    const result = await db.query(
      'INSERT INTO productos (nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion, rendimiento, disponible, genera_puntos, usa_stock, stock_preparado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12) RETURNING *', 
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15, isDisponible, isGeneraPuntos, isUsaStock, stockNum]
    ); 
    
    // 👇 EMISIÓN DE EVENTO SOCKET A TODA LA RED
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json(result.rows[0]); 
  } catch (error) { 
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: 'Error al crear producto' }); 
  }
};

exports.actualizarProducto = async (req, res) => {
  const { id } = req.params; 
  const { nombre, descripcion, precio_base, emoji, categoria, opciones, tiempo_preparacion, disponible, genera_puntos, usa_stock, stock_preparado } = req.body; 
  
  const imagen_url = req.file ? req.file.path : null;
  
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true);
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);
  const isUsaStock = usa_stock === 'true' || usa_stock === true;
  const stockNum = parseInt(stock_preparado) || 0;

  try { 
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_stock BOOLEAN DEFAULT false;').catch(() => null);

    if (imagen_url) {
      const prodActual = await db.query('SELECT imagen_url FROM productos WHERE id = $1', [id]);
      if (prodActual.rows.length > 0 && prodActual.rows[0].imagen_url) {
        borrarDeCloudinary(prodActual.rows[0].imagen_url);
      }
    }

    const result = await db.query(
      'UPDATE productos SET nombre=$1, descripcion=$2, precio_base=$3, emoji=$4, categoria=$5, opciones=$6, imagen_url=COALESCE($7, imagen_url), tiempo_preparacion=$8, disponible=$9, genera_puntos=$10, usa_stock=$11, stock_preparado=$12 WHERE id=$13 RETURNING *', 
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15, isDisponible, isGeneraPuntos, isUsaStock, stockNum, id]
    ); 
    
    // 👇 EMISIÓN DE EVENTO SOCKET A TODA LA RED
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json(result.rows[0]); 
  } catch (error) { 
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: 'Error al actualizar producto' }); 
  }
};

exports.eliminarProducto = async (req, res) => { 
  const { id } = req.params;
  try { 
    const prodActual = await db.query('SELECT imagen_url FROM productos WHERE id = $1', [id]);
    if (prodActual.rows.length > 0 && prodActual.rows[0].imagen_url) {
      borrarDeCloudinary(prodActual.rows[0].imagen_url);
    }

    await db.query('DELETE FROM productos WHERE id = $1', [id]); 
    
    // 👇 EMISIÓN DE EVENTO SOCKET A TODA LA RED
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json({ success: true }); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al eliminar producto' }); 
  } 
};

exports.actualizarRendimiento = async (req, res) => {
  try {
    const result = await db.query('UPDATE productos SET rendimiento=$1 WHERE id=$2 RETURNING *', [req.body.rendimiento, req.params.id]);
    
    // 👇 EMISIÓN DE EVENTO SOCKET A TODA LA RED
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error al guardar rendimiento' }); 
  }
};