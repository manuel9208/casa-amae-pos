const db = require('../config/db');
const cloudinary = require('cloudinary').v2;
const { resolverVariables } = require('../utils/envResolver'); // 🆕 MULTI-TENANT

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

// 🆕 MULTI-TENANT: ahora recibe empresaId para borrar con las credenciales
// de Cloudinary correctas (las de esa empresa si las configuró en Admin
// Empresas, o las globales del .env como fallback).
const borrarDeCloudinary = async (urlVieja, empresaId = null) => {
  const publicId = extraerPublicId(urlVieja);
  if (publicId) {
    try {
      const options = {};
      if (empresaId) {
        const creds = await resolverVariables(empresaId, [
          'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'
        ]);
        options.cloud_name = creds.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
        options.api_key = creds.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
        options.api_secret = creds.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;
      }
      await cloudinary.uploader.destroy(publicId, options);
    } catch (err) {
      console.error("Error al destruir imagen en Cloudinary:", err);
    }
  }
};

exports.obtenerProductos = async (req, res) => {
  const empresaId = req.empresa_id; // 🆕 TENANT
  try {
    // NOTA: los ALTER TABLE de usa_stock/permite_canje/usa_horario/dias_disponibles/
    // hora_inicio/hora_fin ya NO se hacen aquí (ni en crearProducto/actualizarProducto,
    // donde estaban duplicados 3 veces) — ya viven centralizados en
    // config/migracionMultiTenant.js.
    const result = await db.query('SELECT * FROM productos WHERE empresa_id = $1 ORDER BY id ASC', [empresaId]); // 🔒 FILTRO EMPRESA
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
  const empresaId = req.empresa_id; // 🆕 TENANT

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
    const result = await db.query(
      `INSERT INTO productos 
      (nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion, rendimiento, disponible, genera_puntos, permite_canje, usa_stock, stock_preparado, usa_horario, dias_disponibles, hora_inicio, hora_fin, empresa_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`, // 🆕 TENANT
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15, isDisponible, isGeneraPuntos, isPermiteCanje, isUsaStock, stockNum, isUsaHorario, diasDisp, hInicio, hFin, empresaId]
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
  const empresaId = req.empresa_id; // 🆕 TENANT

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
    if (imagen_url) {
      const prodActual = await db.query('SELECT imagen_url FROM productos WHERE id = $1 AND empresa_id = $2', [id, empresaId]); // 🔒 FILTRO EMPRESA
      if (prodActual.rows.length > 0 && prodActual.rows[0].imagen_url) {
        await borrarDeCloudinary(prodActual.rows[0].imagen_url, empresaId); // 🆕 MULTI-TENANT
      }
    }  
    
    // 👇 Inyección final en la base de datos con los nuevos campos
    const result = await db.query(
      `UPDATE productos SET 
        nombre=$1, descripcion=$2, precio_base=$3, emoji=$4, categoria=$5, opciones=$6, 
        imagen_url=COALESCE($7, imagen_url), tiempo_preparacion=$8, disponible=$9, genera_puntos=$10, 
        permite_canje=$11, usa_stock=$12, stock_preparado=$13, usa_horario=$14, dias_disponibles=$15, 
        hora_inicio=$16, hora_fin=$17 
      WHERE id=$18 AND empresa_id=$19 RETURNING *`, // 🔒 FILTRO EMPRESA
      [nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion || 15, isDisponible, isGeneraPuntos, isPermiteCanje, isUsaStock, stockNum, isUsaHorario, diasDisp, hInicio, hFin, id, empresaId]
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
  const empresaId = req.empresa_id; // 🆕 TENANT
  try {
    const prodActual = await db.query('SELECT imagen_url FROM productos WHERE id = $1 AND empresa_id = $2', [id, empresaId]); // 🔒 FILTRO EMPRESA
    if (prodActual.rows.length > 0 && prodActual.rows[0].imagen_url) {
      await borrarDeCloudinary(prodActual.rows[0].imagen_url, empresaId); // 🆕 MULTI-TENANT
    }  
    await db.query('DELETE FROM productos WHERE id = $1 AND empresa_id = $2', [id, empresaId]); // 🔒 FILTRO EMPRESA
    
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');  
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};  

exports.actualizarRendimiento = async (req, res) => {
  const empresaId = req.empresa_id; // 🆕 TENANT
  try {
    const result = await db.query('UPDATE productos SET rendimiento=$1 WHERE id=$2 AND empresa_id=$3 RETURNING *', [req.body.rendimiento, req.params.id, empresaId]); // 🔒 FILTRO EMPRESA
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');  
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar rendimiento' });
  }
};