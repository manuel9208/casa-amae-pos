// BackEnd/middlewares/uploadAsistenteKiosco.js
// =========================================================================
// 📤 SUBIDA AISLADA PARA EL PERSONAJE ASISTENTE IA DEL KIOSCO (Imagen + Lottie JSON + Video)
// -------------------------------------------------------------------------
// Hermano directo de uploadAnimacionesKiosco.js (mismo patrón, misma
// resolución de credenciales Cloudinary POR EMPRESA vía req.empresa_id),
// pero mantenido como archivo 100% independiente — a petición explícita —
// para que el módulo del Asistente IA del Kiosco pueda modificarse a
// futuro (carpeta, formatos, límites) sin tocar ni arriesgar el módulo
// de Animaciones de Categorías del menú, que sigue intacto en su propio
// archivo.
//
// Única diferencia real: folder = 'pos_asistente_kiosco' (en vez de
// 'pos_animaciones_kiosco'), para que ambos tipos de media NUNCA se
// mezclen dentro de la misma carpeta de Cloudinary de cada negocio.
//
// Usado tanto por el súper-admin (biblioteca maestra de personajes)
// como por el propio negocio (personaje personalizado, Nivel 3) — en
// ambos casos resolverVariables ya decide la cuenta Cloudinary correcta
// según req.empresa_id, puesto por resolveTenant en la ruta.
// =========================================================================

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { resolverVariables } = require('../utils/envResolver');

const storageAsistenteKiosco = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const creds = await resolverVariables(req.empresa_id, [
      'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'
    ]);
    const credencialesCloudinary = {
      cloud_name: creds.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: creds.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
      api_secret: creds.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET
    };

    if (file.mimetype.includes('video')) {
      return {
        ...credencialesCloudinary,
        folder: 'pos_asistente_kiosco',
        resource_type: 'video',
        allowedFormats: ['mp4', 'webm', 'mov']
      };
    }
    if (file.mimetype.includes('image')) {
      return {
        ...credencialesCloudinary,
        folder: 'pos_asistente_kiosco',
        resource_type: 'image',
        allowedFormats: ['jpeg', 'png', 'jpg', 'webp'],
        format: 'webp',
        transformation: [{ width: 400, crop: 'scale' }]
      };
    }
    // Lottie: JSON puro -> 'raw', mismo criterio que PDF en el storage general y que Lottie en Animaciones.
    return {
      ...credencialesCloudinary,
      folder: 'pos_asistente_kiosco',
      resource_type: 'raw',
      allowedFormats: ['json']
    };
  }
});

exports.uploadAsistenteKiosco = multer({ storage: storageAsistenteKiosco });