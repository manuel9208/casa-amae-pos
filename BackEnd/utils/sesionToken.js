// BackEnd/utils/sesionToken.js
// =========================================================================
// 🔐 Token de sesión firmado (HMAC-SHA256), sin dependencias externas.
// Payload: { uid, eid, exp }. Se valida firma + caducidad (14 h).
// =========================================================================
const crypto = require('crypto');

const TTL_MS = 14 * 60 * 60 * 1000;
const b64u = (txt) => Buffer.from(txt).toString('base64url');
const secreto = () => String(process.env.SESSION_SECRET || '');

exports.secretoConfigurado = () => secreto().length >= 32;

exports.emitirToken = (usuario) => {
  if (!exports.secretoConfigurado() || !usuario?.id || !usuario?.empresa_id) return null;
  const payload = b64u(JSON.stringify({ uid: usuario.id, eid: usuario.empresa_id, exp: Date.now() + TTL_MS }));
  const firma = crypto.createHmac('sha256', secreto()).update(payload).digest('base64url');
  return `${payload}.${firma}`;
};

exports.verificarToken = (token) => {
  if (!exports.secretoConfigurado() || typeof token !== 'string') return null;
  const [payload, firma] = token.split('.');
  if (!payload || !firma) return null;
  const esperada = crypto.createHmac('sha256', secreto()).update(payload).digest('base64url');
  const a = Buffer.from(esperada);
  const b = Buffer.from(firma);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return datos.exp && datos.exp > Date.now() ? datos : null;
  } catch (e) {
    return null;
  }
};