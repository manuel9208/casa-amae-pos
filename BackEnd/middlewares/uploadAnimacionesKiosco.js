// BackEnd/middlewares/uploadAnimacionesKiosco.js
// =========================================================================
// 📤 SUBIDA AISLADA PARA ANIMACIONES DEL KIOSCO (Lottie JSON + Video)
// -------------------------------------------------------------------------
// NO reutiliza el `storage` global de api.js porque ese solo contempla
// video/PDF/imagen -> un archivo .json caería mal clasificado (como imagen)
// y Cloudinary fallaría al intentar convertirlo a webp. Este storage es
// 100% propio, no modifica ni afecta las subidas existentes de
// Logo/TV/Catálogos, que siguen usando su storage de siempre en api.js.
//
// 🆕 MULTI-TENANT: cloudinary.config() global YA NO trae credenciales
// (cada empresa guarda las suyas cifradas en empresas.variables). Se
// inyectan cloud_name/api_key/api_secret POR LLAMADA, resolviendo la
// empresa desde la que el súper-admin está operando (req.empresa_id,
// puesto por resolveTenant en la ruta). Así la Biblioteca Maestra se sube
// siempre con la cuenta Cloudinary de esa empresa — nunca una cuenta
// global ni prestada de otro negocio.
// =========================================================================

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { resolverVariables } = require('../utils/envResolver');

const storageAnimacionesKiosco = new CloudinaryStorage({
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
        folder: 'pos_animaciones_kiosco',
        resource_type: 'video',
        allowedFormats: ['mp4', 'webm', 'mov']
      };
    }
    if (file.mimetype.includes('image')) {
      return {
        ...credencialesCloudinary,
        folder: 'pos_animaciones_kiosco',
        resource_type: 'image',
        allowedFormats: ['jpeg', 'png', 'jpg', 'webp'],
        format: 'webp',
        transformation: [{ width: 400, crop: 'scale' }]
      };
    }
    // Lottie: JSON puro -> 'raw', igual que ya se trata el PDF en el storage general de api.js
    return {
      ...credencialesCloudinary,
      folder: 'pos_animaciones_kiosco',
      resource_type: 'raw',
      allowedFormats: ['json']
    };
  }
});

exports.uploadAnimacionKiosco = multer({ storage: storageAnimacionesKiosco });