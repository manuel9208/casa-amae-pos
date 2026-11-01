const db = require('../config/db');
const { borrarDeCloudinary } = require('../utils/cloudinaryHelpers');

// ==========================================
// MÓDULO AISLADO: ANIMACIONES DEL KIOSCO (Lottie + Video Premium)
// 100% aislado: NO se modifica la tabla `empresas` ni `clasificaciones`.
// El control de permisos por empresa vive en su PROPIA tabla nueva
// (kiosco_animaciones_permisos), solo relacionada por lectura (FK) a empresas.id.
// ==========================================

exports.inicializarTablas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS kiosco_biblioteca_animaciones (
        id VARCHAR(100) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        emoji VARCHAR(10),
        url_json TEXT NOT NULL,
        url_preview TEXT,
        fecha_creacion TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.query(`
      ALTER TABLE kiosco_biblioteca_animaciones
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'lottie'
      CHECK (tipo IN ('lottie', 'video'));
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS kiosco_animaciones_categoria (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nombre_categoria_kiosco VARCHAR(255) NOT NULL,
        animacion_id VARCHAR(100) REFERENCES kiosco_biblioteca_animaciones(id) ON DELETE SET NULL,
        fecha_creacion TIMESTAMP DEFAULT NOW(),
        UNIQUE(empresa_id, nombre_categoria_kiosco)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS kiosco_animaciones_permisos (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nivel VARCHAR(20) NOT NULL DEFAULT 'ninguno' CHECK (nivel IN ('ninguno', 'lottie', 'premium')),
        fecha_actualizacion TIMESTAMP DEFAULT NOW(),
        UNIQUE(empresa_id)
      );
    `);

    console.log('✅ Tablas de Animaciones del Kiosco verificadas/creadas correctamente (con permisos aislados Lottie + Video).');
  } catch (error) {
    console.error('🚨 Error al inicializar tablas de Animaciones del Kiosco:', error);
  }
};

const obtenerNivelPermiso = async (empresaId) => {
  const result = await db.query(
    'SELECT nivel FROM kiosco_animaciones_permisos WHERE empresa_id = $1',
    [empresaId]
  );
  return result.rows[0]?.nivel || 'ninguno';
};

// ==========================================
// BIBLIOTECA MAESTRA — filtrada según el nivel de permiso de la empresa que consulta
// ==========================================
exports.obtenerBibliotecaAnimaciones = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const nivel = await obtenerNivelPermiso(empresaId);

    let filtroTipo = [];
    if (nivel === 'lottie') filtroTipo = ['lottie'];
    if (nivel === 'premium') filtroTipo = ['lottie', 'video'];

    if (filtroTipo.length === 0) {
      return res.json([]);
    }

    const result = await db.query(
      'SELECT * FROM kiosco_biblioteca_animaciones WHERE tipo = ANY($1) ORDER BY tipo ASC, nombre ASC',
      [filtroTipo]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener biblioteca de animaciones:', error);
    res.status(500).json({ error: 'Error al obtener la biblioteca de animaciones.' });
  }
};

// ==========================================
// 🆕 BIBLIOTECA COMPLETA SIN FILTRAR — SOLO SÚPER-ADMIN GLOBAL
// Necesaria para que el panel de administración de la biblioteca maestra
// (subir/borrar) vea TODO lo existente, sin importar el nivel de ninguna
// empresa puntual. Protegida en la ruta por verificarAdminGlobal.
// ==========================================
exports.obtenerBibliotecaCompletaAdmin = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM kiosco_biblioteca_animaciones ORDER BY tipo ASC, nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener biblioteca completa (admin):', error);
    res.status(500).json({ error: 'Error al obtener la biblioteca completa.' });
  }
};

// ==========================================
// SELECCIÓN POR EMPRESA
// ==========================================
exports.obtenerAnimacionesEmpresa = async (req, res) => {
  const empresaId = req.empresa_id;
  try {
    const result = await db.query(
      `SELECT kac.nombre_categoria_kiosco, kac.animacion_id, kba.url_json, kba.url_preview, kba.tipo, kba.nombre as animacion_nombre
       FROM kiosco_animaciones_categoria kac
       LEFT JOIN kiosco_biblioteca_animaciones kba ON kba.id = kac.animacion_id
       WHERE kac.empresa_id = $1`,
      [empresaId]
    );
    res.json({ success: true, animaciones: result.rows });
  } catch (error) {
    console.error('Error al obtener animaciones de la empresa:', error);
    res.status(500).json({ error: 'Error al obtener las animaciones configuradas.' });
  }
};

exports.guardarAnimacionCategoria = async (req, res) => {
  const empresaId = req.empresa_id;
  const { nombre_categoria_kiosco, animacion_id } = req.body;

  if (!nombre_categoria_kiosco) {
    return res.status(400).json({ error: 'Falta el nombre de la categoría del Kiosco.' });
  }

  try {
    if (animacion_id) {
      const nivel = await obtenerNivelPermiso(empresaId);

      if (nivel === 'ninguno') {
        return res.status(403).json({ error: 'Tu plan actual no incluye animaciones del Kiosco. Contacta a soporte para activarlo.' });
      }

      const animRes = await db.query('SELECT tipo FROM kiosco_biblioteca_animaciones WHERE id = $1', [animacion_id]);
      const tipoAnimacion = animRes.rows[0]?.tipo;

      if (tipoAnimacion === 'video' && nivel !== 'premium') {
        return res.status(403).json({ error: 'Los videos premium requieren el plan completo. Tu plan actual solo incluye animaciones Lottie.' });
      }
    }

    const result = await db.query(
      `INSERT INTO kiosco_animaciones_categoria (empresa_id, nombre_categoria_kiosco, animacion_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (empresa_id, nombre_categoria_kiosco)
       DO UPDATE SET animacion_id = $3
       RETURNING *`,
      [empresaId, nombre_categoria_kiosco, animacion_id || null]
    );
    res.json({ success: true, asignacion: result.rows[0] });
  } catch (error) {
    console.error('Error al guardar animación de categoría:', error);
    res.status(500).json({ error: 'Error al guardar la animación seleccionada.' });
  }
};

exports.eliminarAnimacionCategoria = async (req, res) => {
  const empresaId = req.empresa_id;
  const { id } = req.params;
  try {
    await db.query(
      'DELETE FROM kiosco_animaciones_categoria WHERE id = $1 AND empresa_id = $2',
      [id, empresaId]
    );
    res.json({ success: true, message: 'Animación eliminada de la categoría. Volverá al tinte de color por defecto.' });
  } catch (error) {
    console.error('Error al eliminar animación de categoría:', error);
    res.status(500).json({ error: 'Error al eliminar la animación.' });
  }
};

// ==========================================
// 🆕 GESTIÓN DE PERMISOS — SOLO SÚPER-ADMIN GLOBAL
// ==========================================
exports.obtenerPermisosTodasEmpresas = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.id AS empresa_id, e.nombre AS empresa_nombre, COALESCE(kap.nivel, 'ninguno') AS nivel
      FROM empresas e
      LEFT JOIN kiosco_animaciones_permisos kap ON kap.empresa_id = e.id
      ORDER BY e.nombre ASC
    `);
    res.json({ success: true, empresas: result.rows });
  } catch (error) {
    console.error('Error al obtener permisos de animaciones por empresa:', error);
    res.status(500).json({ error: 'Error al obtener los permisos.' });
  }
};

exports.actualizarPermisoEmpresa = async (req, res) => {
  const { empresa_id, nivel } = req.body;

  if (!empresa_id || !['ninguno', 'lottie', 'premium'].includes(nivel)) {
    return res.status(400).json({ error: 'Datos inválidos. Nivel debe ser: ninguno, lottie o premium.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO kiosco_animaciones_permisos (empresa_id, nivel, fecha_actualizacion)
       VALUES ($1, $2, NOW())
       ON CONFLICT (empresa_id)
       DO UPDATE SET nivel = $2, fecha_actualizacion = NOW()
       RETURNING *`,
      [empresa_id, nivel]
    );
    res.json({ success: true, permiso: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar permiso de empresa:', error);
    res.status(500).json({ error: 'Error al actualizar el permiso.' });
  }
};

// ==========================================
// 🆕 GESTIÓN DE LA BIBLIOTECA MAESTRA — SOLO SÚPER-ADMIN GLOBAL
// ==========================================
exports.subirAnimacionBiblioteca = async (req, res) => {
  try {
    const { id, nombre, emoji, tipo } = req.body;

    if (!id || !nombre || !tipo || !['lottie', 'video'].includes(tipo)) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (id, nombre, tipo) o el tipo no es válido.' });
    }

    const archivoFile = (req.files || []).find(f => f.fieldname === 'archivo');
    const previewFile = (req.files || []).find(f => f.fieldname === 'preview');

    if (!archivoFile) {
      return res.status(400).json({ error: 'Falta el archivo de la animación (Lottie JSON o Video).' });
    }

    const idLimpio = String(id).trim().toLowerCase().replace(/\s+/g, '_');
    const url_json = archivoFile.path;
    const url_preview = previewFile ? previewFile.path : null;

    const result = await db.query(
      `INSERT INTO kiosco_biblioteca_animaciones (id, nombre, emoji, url_json, url_preview, tipo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         nombre = $2, emoji = $3, url_json = $4,
         url_preview = COALESCE($5, kiosco_biblioteca_animaciones.url_preview),
         tipo = $6
       RETURNING *`,
      [idLimpio, nombre, emoji || null, url_json, url_preview, tipo]
    );

    res.json({ success: true, animacion: result.rows[0] });
  } catch (error) {
    console.error('Error al subir animación a la biblioteca:', error);
    res.status(500).json({ error: 'Error al subir la animación. Verifica el formato del archivo.' });
  }
};

exports.eliminarAnimacionBiblioteca = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.query('SELECT url_json, url_preview FROM kiosco_biblioteca_animaciones WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'La animación no existe.' });
    }

    await db.query('DELETE FROM kiosco_biblioteca_animaciones WHERE id = $1', [id]);

    if (existing.rows[0].url_json) borrarDeCloudinary(existing.rows[0].url_json);
    if (existing.rows[0].url_preview) borrarDeCloudinary(existing.rows[0].url_preview);

    res.json({ success: true, message: 'Animación eliminada de la biblioteca. Las categorías que la usaban volverán al tinte de color por defecto.' });
  } catch (error) {
    console.error('Error al eliminar animación de la biblioteca:', error);
    res.status(500).json({ error: 'Error al eliminar la animación.' });
  }
};