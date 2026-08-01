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
    // 👇 AUTO-MIGRACIÓN: Crea las columnas solas si no existen (incluyendo el nuevo sistema de horarios)
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_stock BOOLEAN DEFAULT false;').catch(() => null);
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS permite_canje BOOLEAN DEFAULT true;').catch(() => null);  
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_horario BOOLEAN DEFAULT false;').catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS dias_disponibles VARCHAR(100) DEFAULT '[1,2,3,4,5,6,7]';").catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '00:00';").catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '23:59';").catch(() => null);

    const result = await db.query('SELECT * FROM productos ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};  

exports.crearProducto = async (req, res) => {
  const { 
    nombre, descripcion, precio_base, emoji, categoria, opciones, tiempo_preparacion, 
    disponible, genera_puntos, permite_canje, usa_stock, stock_preparado,
    usa_horario, dias_disponibles, hora_inicio, hora_fin // 👈 NUEVOS CAMPOS RECIBIDOS
  } = req.body;  

  const imagen_url = req.file ? req.file.path : null;  
  
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true);
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);
  const isPermiteCanje = permite_canje === undefined ? true : (permite_canje === 'true' || permite_canje === true);
  const isUsaStock = usa_stock === 'true' || usa_stock === true;
  const stockNum = parseInt(stock_preparado) || 0;  

  // 👇 Parseo seguro para horarios
  const isUsaHorario = usa_horario === 'true' || usa_horario === true;
  const diasDisp = dias_disponibles ? (typeof dias_disponibles === 'string' ? dias_disponibles : JSON.stringify(dias_disponibles)) : '[1,2,3,4,5,6,7]';
  const hInicio = hora_inicio || '00:00';
  const hFin = hora_fin || '23:59';

  try {
    // Validamos que existan las columnas por seguridad antes de insertar
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_stock BOOLEAN DEFAULT false;').catch(() => null);
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS permite_canje BOOLEAN DEFAULT true;').catch(() => null);  
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_horario BOOLEAN DEFAULT false;').catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS dias_disponibles VARCHAR(100) DEFAULT '[1,2,3,4,5,6,7]';").catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '00:00';").catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '23:59';").catch(() => null);

    const result = await db.query(
      `INSERT INTO productos 
      (nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion, rendimiento, disponible, genera_puntos, permite_canje, usa_stock, stock_preparado, usa_horario, dias_disponibles, hora_inicio, hora_fin) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15, isDisponible, isGeneraPuntos, isPermiteCanje, isUsaStock, stockNum, isUsaHorario, diasDisp, hInicio, hFin]
    );  
    
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
  const { 
    nombre, descripcion, precio_base, emoji, categoria, opciones, tiempo_preparacion, 
    disponible, genera_puntos, permite_canje, usa_stock, stock_preparado,
    usa_horario, dias_disponibles, hora_inicio, hora_fin // 👈 NUEVOS CAMPOS RECIBIDOS
  } = req.body;  

  const imagen_url = req.file ? req.file.path : null;  
  
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true);
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);
  const isPermiteCanje = permite_canje === undefined ? true : (permite_canje === 'true' || permite_canje === true);
  const isUsaStock = usa_stock === 'true' || usa_stock === true;
  const stockNum = parseInt(stock_preparado) || 0;  

  // 👇 Parseo seguro para horarios
  const isUsaHorario = usa_horario === 'true' || usa_horario === true;
  const diasDisp = dias_disponibles ? (typeof dias_disponibles === 'string' ? dias_disponibles : JSON.stringify(dias_disponibles)) : '[1,2,3,4,5,6,7]';
  const hInicio = hora_inicio || '00:00';
  const hFin = hora_fin || '23:59';

  try {
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_stock BOOLEAN DEFAULT false;').catch(() => null);
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS permite_canje BOOLEAN DEFAULT true;').catch(() => null);  
    await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS usa_horario BOOLEAN DEFAULT false;').catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS dias_disponibles VARCHAR(100) DEFAULT '[1,2,3,4,5,6,7]';").catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '00:00';").catch(() => null);
    await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '23:59';").catch(() => null);

    if (imagen_url) {
      const prodActual = await db.query('SELECT imagen_url FROM productos WHERE id = $1', [id]);
      if (prodActual.rows.length > 0 && prodActual.rows[0].imagen_url) {
        borrarDeCloudinary(prodActual.rows[0].imagen_url);
      }
    }  
    
    // 👇 Inyección final en la base de datos con los nuevos campos
    const result = await db.query(
      `UPDATE productos SET 
        nombre=$1, descripcion=$2, precio_base=$3, emoji=$4, categoria=$5, opciones=$6, 
        imagen_url=COALESCE($7, imagen_url), tiempo_preparacion=$8, disponible=$9, genera_puntos=$10, 
        permite_canje=$11, usa_stock=$12, stock_preparado=$13, usa_horario=$14, dias_disponibles=$15, 
        hora_inicio=$16, hora_fin=$17 
      WHERE id=$18 RETURNING *`,
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15, isDisponible, isGeneraPuntos, isPermiteCanje, isUsaStock, stockNum, isUsaHorario, diasDisp, hInicio, hFin, id]
    );  
    
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
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');  
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar rendimiento' });
  }
};