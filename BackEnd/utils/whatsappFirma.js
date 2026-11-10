// BackEnd/utils/whatsappFirma.js
// =========================================================================
// 🔒 Verificación de firma X-Hub-Signature-256 del webhook de Meta.
// El App Secret se busca primero por empresa (variables del panel Admin
// Global, clave META_APP_SECRET) y luego en process.env.META_APP_SECRET
// (útil si todos los negocios cuelgan de UNA sola Meta App).
// Modo (WHATSAPP_FIRMA_MODO): off | log (default) | enforce
// =========================================================================
const crypto = require('crypto');
const db = require('../config/db');

const modoActual = () => String(process.env.WHATSAPP_FIRMA_MODO || 'log').toLowerCase();

// Resolución de tenant por Phone ID (igual criterio que el webhook)
const resolverEmpresaId = async (phoneNumberId) => {
  const a = await db.query(
    'SELECT empresa_id FROM whatsapp_configuraciones WHERE meta_phone_id = $1 LIMIT 1',
    [String(phoneNumberId)]
  );
  if (a.rows[0]) return a.rows[0].empresa_id;
  const b = await db.query(
    'SELECT empresa_id FROM configuracion WHERE wa_phone_id = $1 AND wa_api_activa = true LIMIT 1',
    [String(phoneNumberId)]
  );
  return b.rows[0]?.empresa_id || null;
};

const obtenerAppSecret = async (empresaId) => {
  try {
    const { resolverVariables } = require('./envResolver');
    const v = await resolverVariables(empresaId, ['META_APP_SECRET']);
    if (v && v.META_APP_SECRET) return String(v.META_APP_SECRET).trim();
  } catch (e) { /* sin variable por empresa: cae al entorno */ }
  return String(process.env.META_APP_SECRET || '').trim();
};

const firmaCoincide = (rawBody, header, secret) => {
  if (!rawBody || !header || !secret) return false;
  const esperado = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Devuelve { ok, motivo }. ok=false SOLO en modo enforce.
exports.verificarFirmaWebhook = async (req) => {
  const modo = modoActual();
  if (modo === 'off') return { ok: true, motivo: 'off' };
  const bloquear = modo === 'enforce';

  try {
    const phoneNumberId = req.body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (!phoneNumberId) return { ok: true, motivo: 'sin_phone_id' }; // el handler lo ignora igual

    const empresaId = await resolverEmpresaId(phoneNumberId);
    if (!empresaId) return { ok: true, motivo: 'tenant_desconocido' }; // el handler lo ignora igual

    const secret = await obtenerAppSecret(empresaId);
    if (!secret) {
      console.warn(`⚠️ [WA-FIRMA] Empresa ${empresaId} sin META_APP_SECRET (modo ${modo}).`);
      return { ok: !bloquear, motivo: 'sin_secret' };
    }

    if (!firmaCoincide(req.rawBody, req.get('x-hub-signature-256'), secret)) {
      console.warn(`🚨 [WA-FIRMA] Firma inválida o ausente (empresa ${empresaId}, modo ${modo}).`);
      return { ok: !bloquear, motivo: 'firma_invalida' };
    }
    return { ok: true, motivo: 'ok' };
  } catch (error) {
    console.error('🚨 [WA-FIRMA] Error verificando firma:', error.message);
    return { ok: !bloquear, motivo: 'error' };
  }
};