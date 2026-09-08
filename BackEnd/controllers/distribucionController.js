const db = require('../config/db');
const cloudinary = require('cloudinary').v2;

// ==========================================
// 🛡️ AUTO-MIGRACIÓN DE TABLA: DISTRIBUCIÓN
// ==========================================
exports.inicializarTablas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS dist_articulos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT DEFAULT '',
        categoria VARCHAR(255) NOT NULL,
        unidad_medida VARCHAR(50) DEFAULT 'PZ',
        equivalencia NUMERIC(10,2) DEFAULT 1,
        costo_inversion NUMERIC(10,2) DEFAULT 0,
        disponible BOOLEAN DEFAULT true,
        genera_puntos BOOLEAN DEFAULT true,
        permite_canje BOOLEAN DEFAULT true,
        permite_credito BOOLEAN DEFAULT false,
        usa_stock BOOLEAN DEFAULT true,
        stock_actual NUMERIC(10,2) DEFAULT 0,
        stock_minimo_alerta NUMERIC(10,2) DEFAULT 0,
        precios JSONB DEFAULT '[]',
        emoji VARCHAR(50) DEFAULT '📦',
        imagen_url TEXT,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabla 'dist_articulos' (Módulo Distribución) verificada/creada con todos sus campos.");
  } catch (error) {
    console.error("🚨 Error al inicializar tablas de distribución:", error);
  }
};

// ==========================================
// 🧹 HELPERS DE CLOUDINARY
// ==========================================
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

// ==========================================
// 📦 RUTAS CRUD: CATÁLOGO DE ARTÍCULOS
// ==========================================
exports.obtenerArticulos = async (req, res) => {
  try {
    // Escudo de Auto-Migración por si la tabla ya existía antes de estos cambios
    await db.query('ALTER TABLE dist_articulos ADD COLUMN IF NOT EXISTS descripcion TEXT DEFAULT \'\';').catch(() => null);
    await db.query('ALTER TABLE dist_articulos ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT true;').catch(() => null);
    
    const result = await db.query('SELECT * FROM dist_articulos WHERE activo = true ORDER BY categoria ASC, nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error("Error BD al obtener artículos:", error);
    res.status(500).json({ error: 'Error al obtener el catálogo de distribución.' });
  }
};

exports.crearArticulo = async (req, res) => {
  const {
    nombre, descripcion, categoria, unidad_medida, equivalencia, costo_inversion,
    disponible, genera_puntos, permite_canje, permite_credito, usa_stock, stock_actual, stock_minimo_alerta, 
    precios, emoji
  } = req.body;

  const imagen_url = req.file ? req.file.path : null;
  
  // Parseo Seguro para los datos que llegan como FormData (Strings)
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true);
  const isGeneraPuntos = genera_puntos === 'true' || genera_puntos === true;
  const isPermiteCanje = permite_canje === 'true' || permite_canje === true;
  const isPermiteCredito = permite_credito === 'true' || permite_credito === true;
  const isUsaStock = usa_stock === 'true' || usa_stock === true;
  
  const eqParsed = parseFloat(equivalencia) || 1;
  const costoParsed = parseFloat(costo_inversion) || 0;
  const stockAct = parseFloat(stock_actual) || 0;
  const stockMin = parseFloat(stock_minimo_alerta) || 0;
  const preciosParsed = typeof precios === 'string' ? precios : JSON.stringify(precios || []);

  try {
    const result = await db.query(
      `INSERT INTO dist_articulos 
      (nombre, descripcion, categoria, unidad_medida, equivalencia, costo_inversion, disponible, genera_puntos, permite_canje, permite_credito, usa_stock, stock_actual, stock_minimo_alerta, precios, emoji, imagen_url) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [nombre, descripcion || '', categoria, unidad_medida, eqParsed, costoParsed, isDisponible, isGeneraPuntos, isPermiteCanje, isPermiteCredito, isUsaStock, stockAct, stockMin, preciosParsed, emoji || '📦', imagen_url]
    );

    // Aviso en vivo a las demás pantallas para refrescar el catálogo
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear artículo de distribución:", error);
    res.status(500).json({ error: 'Error al registrar el artículo.' });
  }
};

exports.actualizarArticulo = async (req, res) => {
  const { id } = req.params;
  const {
    nombre, descripcion, categoria, unidad_medida, equivalencia, costo_inversion,
    disponible, genera_puntos, permite_canje, permite_credito, usa_stock, stock_actual, stock_minimo_alerta, 
    precios, emoji
  } = req.body;

  const imagen_url = req.file ? req.file.path : null;

  // Parseo Seguro
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true);
  const isGeneraPuntos = genera_puntos === 'true' || genera_puntos === true;
  const isPermiteCanje = permite_canje === 'true' || permite_canje === true;
  const isPermiteCredito = permite_credito === 'true' || permite_credito === true;
  const isUsaStock = usa_stock === 'true' || usa_stock === true;
  
  const eqParsed = parseFloat(equivalencia) || 1;
  const costoParsed = parseFloat(costo_inversion) || 0;
  const stockAct = parseFloat(stock_actual) || 0;
  const stockMin = parseFloat(stock_minimo_alerta) || 0;
  const preciosParsed = typeof precios === 'string' ? precios : JSON.stringify(precios || []);

  try {
    if (imagen_url) {
      const artActual = await db.query('SELECT imagen_url FROM dist_articulos WHERE id = $1', [id]);
      if (artActual.rows.length > 0 && artActual.rows[0].imagen_url) {
        borrarDeCloudinary(artActual.rows[0].imagen_url);
      }
    }

    const result = await db.query(
      `UPDATE dist_articulos SET 
      nombre=$1, descripcion=$2, categoria=$3, unidad_medida=$4, equivalencia=$5, costo_inversion=$6, 
      disponible=$7, genera_puntos=$8, permite_canje=$9, permite_credito=$10, usa_stock=$11, stock_actual=$12, stock_minimo_alerta=$13, precios=$14, emoji=$15,
      imagen_url = COALESCE($16, imagen_url)
      WHERE id=$17 RETURNING *`,
      [nombre, descripcion || '', categoria, unidad_medida, eqParsed, costoParsed, isDisponible, isGeneraPuntos, isPermiteCanje, isPermiteCredito, isUsaStock, stockAct, stockMin, preciosParsed, emoji, imagen_url, id]
    );

    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar artículo:", error);
    res.status(500).json({ error: 'Error al actualizar el artículo.' });
  }
};

exports.eliminarArticulo = async (req, res) => {
  const { id } = req.params;
  try {
    const artActual = await db.query('SELECT imagen_url FROM dist_articulos WHERE id = $1', [id]);
    if (artActual.rows.length > 0 && artActual.rows[0].imagen_url) {
      borrarDeCloudinary(artActual.rows[0].imagen_url);
    }
    
    // Lo borramos físicamente
    await db.query('DELETE FROM dist_articulos WHERE id = $1', [id]);

    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar artículo:", error);
    res.status(500).json({ error: 'Error al eliminar el artículo.' });
  }
};