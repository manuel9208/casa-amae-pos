const db = require('../config/db');
const { borrarDeCloudinary } = require('../utils/cloudinaryHelpers');

// ==========================================
// MÓDULO AISLADO: PERSONAJE ASISTENTE IA DEL KIOSCO (Imagen + Lottie + Video Premium)
// 100% separado de kiosco_animaciones_categoria / kiosco_biblioteca_animaciones
// (tablas y endpoints propios) para poder modificarse sin tocar ese módulo.
// El control de permisos SÍ se reutiliza: usa el mismo candado ya existente
// en `kiosco_animaciones_permisos` (nivel: ninguno/lottie/premium), filtrado
// SIEMPRE por empresa_id. No se duplica lógica de permisos ni panel admin:
// el switch que ya gestiona el súper-admin para animaciones de categorías
// gobierna también el acceso al personaje del asistente.
// ==========================================

exports.inicializarTablas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS kiosco_asistente_biblioteca (
        id VARCHAR(100) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        emoji VARCHAR(10),
        tipo VARCHAR(20) NOT NULL DEFAULT 'imagen' CHECK (tipo IN ('imagen', 'lottie', 'video')),
        url_media TEXT NOT NULL,
        url_preview TEXT,
        fecha_creacion TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS kiosco_asistente_empresa (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        fuente VARCHAR(20) NOT NULL DEFAULT 'default' CHECK (fuente IN ('default', 'biblioteca', 'personalizado')),
        biblioteca_id VARCHAR(100) REFERENCES kiosco_asistente_biblioteca(id) ON DELETE SET NULL,
        tipo_personalizado VARCHAR(20) CHECK (tipo_personalizado IN ('imagen', 'lottie', 'video')),
        url_personalizado TEXT,
        url_preview_personalizado TEXT,
        nombre_asistente VARCHAR(100) DEFAULT 'Asistente',
        mensaje_saludo TEXT DEFAULT '¡Hola! ¿En qué te puedo ayudar hoy?',
        activo BOOLEAN NOT NULL DEFAULT true,
        fecha_actualizacion TIMESTAMP DEFAULT NOW(),
        UNIQUE(empresa_id)
      );
    `);

    // 🆕 Inyección segura para instalaciones previas a este campo (empresas que
    // ya tenían fila en esta tabla antes de agregar mensaje_saludo)
    await db.query(`ALTER TABLE kiosco_asistente_empresa ADD COLUMN IF NOT EXISTS mensaje_saludo TEXT DEFAULT '¡Hola! ¿En qué te puedo ayudar hoy?';`);

    console.log('✅ Tablas del Asistente IA del Kiosco verificadas/creadas correctamente (candados compartidos con Animaciones del Kiosco).');
  } catch (error) {
    console.error('🚨 Error al inicializar tablas del Asistente IA del Kiosco:', error);
  }
};

// Reutiliza EL MISMO candado de kiosco_animaciones_permisos (misma tabla, mismos niveles).
// Se duplica la consulta (no se importa el otro controller) para mantener este módulo
// totalmente desacoplado, tal como se pidió.
const obtenerNivelPermisoAsistente = async (empresaId) => {
  const result = await db.query(
    'SELECT nivel FROM kiosco_animaciones_permisos WHERE empresa_id = $1',
    [empresaId]
  );
  return result.rows[0]?.nivel || 'ninguno';
};

// ==========================================
// BIBLIOTECA MAESTRA DE PERSONAJES — filtrada según el nivel de permiso de la empresa
// ==========================================
exports.obtenerBibliotecaAsistentes = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const nivel = await obtenerNivelPermisoAsistente(empresaId);

    let filtroTipo = [];
    if (nivel === 'lottie') filtroTipo = ['imagen', 'lottie'];
    if (nivel === 'premium') filtroTipo = ['imagen', 'lottie', 'video'];

    if (filtroTipo.length === 0) {
      return res.json([]);
    }

    const result = await db.query(
      'SELECT * FROM kiosco_asistente_biblioteca WHERE tipo = ANY($1) ORDER BY tipo ASC, nombre ASC',
      [filtroTipo]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener biblioteca de personajes del asistente:', error);
    res.status(500).json({ error: 'Error al obtener la biblioteca de personajes.' });
  }
};

// ==========================================
// 🆕 BIBLIOTECA COMPLETA SIN FILTRAR — SOLO SÚPER-ADMIN GLOBAL
// ==========================================
exports.obtenerBibliotecaCompletaAdmin = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM kiosco_asistente_biblioteca ORDER BY tipo ASC, nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener biblioteca completa de personajes (admin):', error);
    res.status(500).json({ error: 'Error al obtener la biblioteca completa.' });
  }
};

// ==========================================
// SELECCIÓN ACTUAL DEL PERSONAJE POR EMPRESA (consumido por el Kiosco)
// ==========================================
exports.obtenerAsistenteEmpresa = async (req, res) => {
  const empresaId = req.empresa_id;
  try {
    const result = await db.query(
      `SELECT kae.fuente, kae.nombre_asistente, kae.mensaje_saludo, kae.tipo_personalizado, kae.url_personalizado, kae.url_preview_personalizado,
              kab.id AS biblioteca_id, kab.nombre AS biblioteca_nombre, kab.tipo AS biblioteca_tipo,
              kab.url_media AS biblioteca_url_media, kab.url_preview AS biblioteca_url_preview
       FROM kiosco_asistente_empresa kae
       LEFT JOIN kiosco_asistente_biblioteca kab ON kab.id = kae.biblioteca_id
       WHERE kae.empresa_id = $1`,
      [empresaId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, asistente: { fuente: 'default', mensaje_saludo: '¡Hola! ¿En qué te puedo ayudar hoy?' } });
    }

    res.json({ success: true, asistente: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener el personaje configurado de la empresa:', error);
    res.status(500).json({ error: 'Error al obtener la configuración del asistente.' });
  }
};

// ==========================================
// GUARDAR SELECCIÓN DEL NEGOCIO — desde biblioteca O personaje subido (Cloudinary)
// ==========================================
exports.guardarAsistenteEmpresa = async (req, res) => {
  const empresaId = req.empresa_id;
  const { fuente, biblioteca_id, nombre_asistente, mensaje_saludo } = req.body;

  try {
    const nivel = await obtenerNivelPermisoAsistente(empresaId);

    if (fuente === 'biblioteca') {
      if (nivel === 'ninguno') {
        return res.status(403).json({ error: 'Tu plan actual no incluye personalizar el asistente IA. Contacta a soporte para activarlo.' });
      }
      if (!biblioteca_id) return res.status(400).json({ error: 'Falta el id del personaje de la biblioteca.' });

      const bibRes = await db.query('SELECT tipo FROM kiosco_asistente_biblioteca WHERE id = $1', [biblioteca_id]);
      const tipoSeleccionado = bibRes.rows[0]?.tipo;
      if (!tipoSeleccionado) return res.status(404).json({ error: 'El personaje seleccionado no existe en la biblioteca.' });

      if (tipoSeleccionado === 'video' && nivel !== 'premium') {
        return res.status(403).json({ error: 'Los personajes en video requieren el plan Premium. Tu plan actual solo incluye imagen/Lottie.' });
      }

      const result = await db.query(
        `INSERT INTO kiosco_asistente_empresa (empresa_id, fuente, biblioteca_id, tipo_personalizado, url_personalizado, url_preview_personalizado, nombre_asistente, mensaje_saludo)
         VALUES ($1, 'biblioteca', $2, NULL, NULL, NULL, COALESCE($3, 'Asistente'), COALESCE($4, '¡Hola! ¿En qué te puedo ayudar hoy?'))
         ON CONFLICT (empresa_id) DO UPDATE SET
           fuente = 'biblioteca', biblioteca_id = $2, tipo_personalizado = NULL,
           url_personalizado = NULL, url_preview_personalizado = NULL,
           nombre_asistente = COALESCE($3, kiosco_asistente_empresa.nombre_asistente),
           mensaje_saludo = COALESCE($4, kiosco_asistente_empresa.mensaje_saludo),
           fecha_actualizacion = NOW()
         RETURNING *`,
        [empresaId, biblioteca_id, nombre_asistente || null, mensaje_saludo || null]
      );
      return res.json({ success: true, asistente: result.rows[0] });
    }

    if (fuente === 'personalizado') {
      if (nivel === 'ninguno') {
        return res.status(403).json({ error: 'Tu plan actual no incluye subir un personaje personalizado. Contacta a soporte para activarlo.' });
      }

      const archivoFile = (req.files || []).find(f => f.fieldname === 'archivo');
      if (!archivoFile) return res.status(400).json({ error: 'Falta el archivo del personaje (imagen, Lottie JSON o video).' });

      const tipoArchivo = (req.body.tipo_personalizado || '').toLowerCase();
      if (!['imagen', 'lottie', 'video'].includes(tipoArchivo)) {
        return res.status(400).json({ error: 'Tipo de archivo inválido. Debe ser imagen, lottie o video.' });
      }

      if (tipoArchivo === 'video' && nivel !== 'premium') {
        return res.status(403).json({ error: 'Subir un personaje en video requiere el plan Premium.' });
      }

      const previewFile = (req.files || []).find(f => f.fieldname === 'preview');

      const result = await db.query(
        `INSERT INTO kiosco_asistente_empresa (empresa_id, fuente, biblioteca_id, tipo_personalizado, url_personalizado, url_preview_personalizado, nombre_asistente, mensaje_saludo)
         VALUES ($1, 'personalizado', NULL, $2, $3, $4, COALESCE($5, 'Asistente'), COALESCE($6, '¡Hola! ¿En qué te puedo ayudar hoy?'))
         ON CONFLICT (empresa_id) DO UPDATE SET
           fuente = 'personalizado', biblioteca_id = NULL, tipo_personalizado = $2,
           url_personalizado = $3, url_preview_personalizado = COALESCE($4, kiosco_asistente_empresa.url_preview_personalizado),
           nombre_asistente = COALESCE($5, kiosco_asistente_empresa.nombre_asistente),
           mensaje_saludo = COALESCE($6, kiosco_asistente_empresa.mensaje_saludo),
           fecha_actualizacion = NOW()
         RETURNING *`,
        [empresaId, tipoArchivo, archivoFile.path, previewFile ? previewFile.path : null, nombre_asistente || null, mensaje_saludo || null]
      );
      return res.json({ success: true, asistente: result.rows[0] });
    }

    return res.status(400).json({ error: 'El campo "fuente" debe ser "biblioteca" o "personalizado".' });
  } catch (error) {
    console.error('Error al guardar el asistente de la empresa:', error);
    res.status(500).json({ error: 'Error al guardar la configuración del asistente.' });
  }
};

// ==========================================
// ELIMINAR PERSONALIZACIÓN — vuelve al personaje por defecto del sistema (gratis, Nivel 1)
// ==========================================
exports.eliminarAsistenteEmpresa = async (req, res) => {
  const empresaId = req.empresa_id;
  try {
    const existing = await db.query(
      'SELECT fuente, url_personalizado, url_preview_personalizado FROM kiosco_asistente_empresa WHERE empresa_id = $1',
      [empresaId]
    );

    await db.query('DELETE FROM kiosco_asistente_empresa WHERE empresa_id = $1', [empresaId]);

    if (existing.rows[0]?.fuente === 'personalizado') {
      if (existing.rows[0].url_personalizado) borrarDeCloudinary(existing.rows[0].url_personalizado, empresaId);
      if (existing.rows[0].url_preview_personalizado) borrarDeCloudinary(existing.rows[0].url_preview_personalizado, empresaId);
    }

    res.json({ success: true, message: 'Personaje eliminado. El Kiosco usará el asistente por defecto del sistema.' });
  } catch (error) {
    console.error('Error al eliminar el asistente de la empresa:', error);
    res.status(500).json({ error: 'Error al eliminar la configuración del asistente.' });
  }
};

// ==========================================
// 🆕 GESTIÓN DE LA BIBLIOTECA MAESTRA DE PERSONAJES — SOLO SÚPER-ADMIN GLOBAL
// ==========================================
exports.subirAsistenteBiblioteca = async (req, res) => {
  try {
    const { id, nombre, emoji, tipo } = req.body;

    if (!id || !nombre || !tipo || !['imagen', 'lottie', 'video'].includes(tipo)) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (id, nombre, tipo) o el tipo no es válido.' });
    }

    const archivoFile = (req.files || []).find(f => f.fieldname === 'archivo');
    const previewFile = (req.files || []).find(f => f.fieldname === 'preview');

    if (!archivoFile) {
      return res.status(400).json({ error: 'Falta el archivo del personaje (imagen, Lottie JSON o Video).' });
    }

    const idLimpio = String(id).trim().toLowerCase().replace(/\s+/g, '_');
    const url_media = archivoFile.path;
    const url_preview = previewFile ? previewFile.path : null;

    const result = await db.query(
      `INSERT INTO kiosco_asistente_biblioteca (id, nombre, emoji, url_media, url_preview, tipo)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         nombre = $2, emoji = $3, url_media = $4,
         url_preview = COALESCE($5, kiosco_asistente_biblioteca.url_preview),
         tipo = $6
       RETURNING *`,
      [idLimpio, nombre, emoji || null, url_media, url_preview, tipo]
    );

    res.json({ success: true, personaje: result.rows[0] });
  } catch (error) {
    console.error('Error al subir personaje a la biblioteca:', error);
    res.status(500).json({ error: 'Error al subir el personaje. Verifica el formato del archivo.' });
  }
};

exports.eliminarAsistenteBiblioteca = async (req, res) => {
  const { id } = req.params;
  const empresaId = req.empresa_id; // Cuenta Cloudinary correcta para el borrado, igual que en Animaciones del Kiosco
  try {
    const existing = await db.query('SELECT url_media, url_preview FROM kiosco_asistente_biblioteca WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'El personaje no existe.' });
    }

    await db.query('DELETE FROM kiosco_asistente_biblioteca WHERE id = $1', [id]);

    if (existing.rows[0].url_media) borrarDeCloudinary(existing.rows[0].url_media, empresaId);
    if (existing.rows[0].url_preview) borrarDeCloudinary(existing.rows[0].url_preview, empresaId);

    res.json({ success: true, message: 'Personaje eliminado de la biblioteca. Las empresas que lo tenían asignado volverán al personaje por defecto.' });
  } catch (error) {
    console.error('Error al eliminar personaje de la biblioteca:', error);
    res.status(500).json({ error: 'Error al eliminar el personaje.' });
  }
};