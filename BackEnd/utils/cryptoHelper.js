// BackEnd/utils/cryptoHelper.js
// =========================================================================
// 🔐 CIFRADO EN REPOSO — Variables de Entorno por Empresa (AES-256-GCM)
// -------------------------------------------------------------------------
// Protege el CONTENIDO de la columna empresas.variables (jsonb) por si
// alguien accede directo a la base de datos (dump, backup, Postgres
// comprometido). El control de ACCESO a las rutas ya lo resuelve
// verificarAdminGlobal.js — este helper es una capa adicional, independiente.
//
// Requiere ENV_VARIABLES_MASTER_KEY en el .env (64 caracteres hex = 32 bytes).
// Generarla con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// =========================================================================

const crypto = require('crypto');
const ALGORITMO = 'aes-256-gcm';

function obtenerLlave() {
  const llave = process.env.ENV_VARIABLES_MASTER_KEY;
  if (!llave || llave.length !== 64) {
    throw new Error('ENV_VARIABLES_MASTER_KEY no está configurada o no mide 64 caracteres hexadecimales.');
  }
  return Buffer.from(llave, 'hex');
}

// Cifra un texto plano -> "iv:authTag:datoCifrado" (todo en hex)
exports.encriptar = (textoPlano) => {
  if (textoPlano === null || textoPlano === undefined || textoPlano === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerLlave(), iv);
  const cifrado = Buffer.concat([cipher.update(String(textoPlano), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${cifrado.toString('hex')}`;
};

// Descifra el formato "iv:authTag:datoCifrado" -> texto plano original
exports.desencriptar = (textoCifrado) => {
  if (!textoCifrado) return '';
  try {
    const [ivHex, authTagHex, datoHex] = textoCifrado.split(':');
    if (!ivHex || !authTagHex || !datoHex) return '';
    const decipher = crypto.createDecipheriv(ALGORITMO, obtenerLlave(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const descifrado = Buffer.concat([decipher.update(Buffer.from(datoHex, 'hex')), decipher.final()]);
    return descifrado.toString('utf8');
  } catch (error) {
    console.error('🚨 [cryptoHelper] No se pudo desencriptar un valor:', error.message);
    return '';
  }
};

// Enmascara un valor plano para mostrarlo en el frontend sin exponerlo
// (ej: "AIzaSyB123456789" -> "••••••••6789")
exports.enmascarar = (textoPlano) => {
  if (!textoPlano) return '';
  const str = String(textoPlano);
  if (str.length <= 4) return '••••';
  return '••••••••' + str.slice(-4);
};