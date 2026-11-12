// BackEnd/utils/sesionTokenCliente.js
// =========================================================================
// 🔐 Token de sesión del CLIENTE del Kiosco (HMAC-SHA256, sin dependencias).
// Payload: { typ:'cli', cid, eid, exp }. TTL 9 h (igual que la sesión persistente del front).
// Separación de dominio: la clave se DERIVA de SESSION_SECRET con una etiqueta propia,
// así un token de cliente NUNCA valida como token de empleado (sesionToken.js) ni al revés.
// Si SESSION_SECRET no está configurada devuelve null: el cliente queda como invitado.
// =========================================================================
const crypto = require('crypto');

const TTL_MS = 9 * 60 * 60 * 1000;
const b64u = (txt) => Buffer.from(txt).toString('base64url');
const secretoBase = () => String(process.env.SESSION_SECRET || '');
const secretoConfigurado = () => secretoBase().length >= 32;
const claveCliente = () => crypto.createHmac('sha256', secretoBase()).update('kiosco-cliente-v1').digest();
const firmar = (payload) => crypto.createHmac('sha256', claveCliente()).update(payload).digest('base64url');

let avisado = false;

exports.emitirTokenCliente = ({ id, empresa_id } = {}) => {
  if (!secretoConfigurado()) {
    if (!avisado) { avisado = true; console.warn('⚠️ [token-cliente] SESSION_SECRET ausente o < 32 caracteres: los clientes del Kiosco quedarán como invitados en el chat IA.'); }
    return null;
  }
  if (!id || !empresa_id) return null;
  const payload = b64u(JSON.stringify({ typ: 'cli', cid: Number(id), eid: Number(empresa_id), exp: Date.now() + TTL_MS }));
  return `${payload}.${firmar(payload)}`;
};

exports.verificarTokenCliente = (token) => {
  if (!secretoConfigurado() || typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  const a = Buffer.from(firmar(partes[0]));
  const b = Buffer.from(partes[1]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
    const valido = d.typ === 'cli' && Number.isInteger(d.cid) && Number.isInteger(d.eid) && d.exp > Date.now();
    return valido ? d : null;
  } catch (e) {
    return null;
  }
};

// =========================================================================
// 🎁 Token de CANJE de puntos (typ:'canje', 30 min). Prueba de NIP o huella.
// Clave derivada propia: NUNCA valida como token de cliente ni de empleado.
// =========================================================================
const TTL_CANJE_MS = 30 * 60 * 1000;
const claveCanje = () => crypto.createHmac('sha256', secretoBase()).update('kiosco-canje-v1').digest();
const firmarCanje = (payload) => crypto.createHmac('sha256', claveCanje()).update(payload).digest('base64url');

exports.emitirTokenCanje = ({ id, empresa_id } = {}) => {
  if (!secretoConfigurado() || !id || !empresa_id) return null;
  const payload = b64u(JSON.stringify({ typ: 'canje', cid: Number(id), eid: Number(empresa_id), exp: Date.now() + TTL_CANJE_MS }));
  return `${payload}.${firmarCanje(payload)}`;
};

exports.verificarTokenCanje = (token) => {
  if (!secretoConfigurado() || typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  const a = Buffer.from(firmarCanje(partes[0]));
  const b = Buffer.from(partes[1]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
    return d.typ === 'canje' && Number.isInteger(d.cid) && Number.isInteger(d.eid) && d.exp > Date.now() ? d : null;
  } catch (e) {
    return null;
  }
};