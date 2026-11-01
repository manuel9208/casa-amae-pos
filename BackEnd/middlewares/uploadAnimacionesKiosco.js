// BackEnd/middlewares/uploadAnimacionesKiosco.js
// =========================================================================
// 📤 SUBIDA AISLADA PARA ANIMACIONES DEL KIOSCO (Lottie JSON + Video)
// -------------------------------------------------------------------------
// NO reutiliza el `storage` global de api.js porque ese solo contempla
// video/PDF/imagen -> un archivo .json caería mal clasificado (como imagen)
// y Cloudinary fallaría al intentar convertirlo a webp. Este storage es
// 100% propio, no modifica ni afecta las subidas existentes de
// Logo/TV/Catálogos, que siguen usando su storage de siempre en api.js.
// =========================================================================

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// cloudinary.config() ya se ejecuta una sola vez en api.js — es un singleton,
// así que este storage nuevo hereda automáticamente esas mismas credenciales.

const storageAnimacionesKiosco = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    if (file.mimetype.includes('video')) {
      return {
        folder: 'pos_animaciones_kiosco',
        resource_type: 'video',
        allowedFormats: ['mp4', 'webm', 'mov']
      };
    }
    if (file.mimetype.includes('image')) {
      // Para el thumbnail/preview (ej. poster del video o miniatura del Lottie)
      return {
        folder: 'pos_animaciones_kiosco',
        resource_type: 'image',
        allowedFormats: ['jpeg', 'png', 'jpg', 'webp'],
        format: 'webp',
        transformation: [{ width: 400, crop: 'scale' }]
      };
    }
    // Lottie: JSON puro -> 'raw', igual que ya se trata el PDF en el storage general de api.js
    return {
      folder: 'pos_animaciones_kiosco',
      resource_type: 'raw',
      allowedFormats: ['json']
    };
  }
});

exports.uploadAnimacionKiosco = multer({ storage: storageAnimacionesKiosco });