const cloudinary = require('cloudinary').v2;
const { resolverVariables } = require('./envResolver'); // 🆕 MULTI-TENANT

const extraerPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const urlLimpia = url.split('?')[0];
    const parts = urlLimpia.split('/upload/');
    if (parts.length < 2) return null;

    let pathSinVersion = parts[1].replace(/^v\d+\//, '');
    const lastDotIndex = pathSinVersion.lastIndexOf('.');

    if (lastDotIndex !== -1) {
        pathSinVersion = pathSinVersion.substring(0, lastDotIndex);
    }
    return pathSinVersion;
  } catch (e) {
    console.error('Error extrayendo ID de Cloudinary:', e);
    return null;
  }
};

// 🆕 MULTI-TENANT: ahora acepta un empresaId opcional (último parámetro).
// Si se recibe, resuelve las credenciales propias de esa empresa (con
// fallback automático a las globales del .env) antes de destruir el
// archivo — así el borrado SIEMPRE usa la misma cuenta de Cloudinary
// donde el archivo realmente fue subido, nunca la global por accidente.
// Si no se pasa empresaId (compatibilidad retro), usa cloudinary.config()
// global tal cual, exactamente como funcionaba antes.
const borrarDeCloudinary = async (urlVieja, empresaId = null) => {
  const publicId = extraerPublicId(urlVieja);
  if (publicId) {
      try {
          const esVideo = urlVieja.includes('/video/upload/');
          const esRaw = urlVieja.includes('/raw/upload/');
          const options = {
              resource_type: esVideo ? 'video' : (esRaw ? 'raw' : 'image'),
              invalidate: true
          };

          if (empresaId) {
            const creds = await resolverVariables(empresaId, [
              'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'
            ]);
            options.cloud_name = creds.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
            options.api_key = creds.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
            options.api_secret = creds.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;
          }

          await cloudinary.uploader.destroy(publicId, options);
          console.log(`✅ Archivo basura eliminado de Cloudinary (${options.resource_type}): ${publicId}`);
      } catch (err) {
          console.error(`🚨 Error al borrar basura en Cloudinary (${publicId}):`, err);
      }
  }
};

module.exports = { extraerPublicId, borrarDeCloudinary };