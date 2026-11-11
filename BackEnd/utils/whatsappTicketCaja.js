// BackEnd/utils/whatsappTicketCaja.js
// =========================================================================
// 🧾 Ticket del pedido por WhatsApp, enviado manualmente desde Caja.
// Todo se arma en el backend leyendo la BD (filtrado por empresa_id).
// =========================================================================
const db = require('../config/db');
const { enviarTextoPorProveedor, normalizarTelefonoMX } = require('./whatsappHelpers');

const dinero = (n) => `$${Number(n || 0).toFixed(2)}`;
const parseJSON = (v, def) => { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? def); } catch (e) { return def; } };

const telefonoDelPedido = async (empresaId, pedido) => {
  if (pedido.cliente_id) {
    const r = await db.query('SELECT telefono FROM clientes WHERE id = $1 AND empresa_id = $2', [pedido.cliente_id, empresaId]);
    const t = String(normalizarTelefonoMX(String(r.rows[0]?.telefono || '').replace(/\D/g, '')) || '');
    if (t.length === 10) return t;
  }
  const m = String(pedido.direccion_entrega || '').match(/(?:TEL|TELÉFONO|CONTACTO):\s*([0-9\s-]+)/i);
  const t = String(normalizarTelefonoMX(m ? m[1].replace(/\D/g, '') : '') || '');
  return t.length === 10 ? t : null;
};

const nombreDelPedido = async (empresaId, pedido) => {
  const m = String(pedido.direccion_entrega || '').match(/A NOMBRE DE:\s*([^|]+)/i);
  if (m && m[1].trim()) return m[1].trim();
  if (pedido.cliente_id) {
    const r = await db.query(
      "SELECT TRIM(COALESCE(nombre,'') || ' ' || COALESCE(apellido,'')) AS nombre FROM clientes WHERE id = $1 AND empresa_id = $2",
      [pedido.cliente_id, empresaId]
    );
    if (r.rows[0]?.nombre) return r.rows[0].nombre;
  }
  return '';
};

// Misma limpieza de dirección que usa la tarjeta de Por Confirmar
const direccionLimpia = (raw) => String(raw || '')
  .replace(/\[PAGARÁ CON:[^\]]*\]/gi, '')
  .replace(/[[(].*?(?:cambio|pagar).*?[\])]/gi, '')
  .replace(/A NOMBRE DE:\s*([^|]+)/gi, '')
  .replace(/(?:TEL:|TELÉFONO:|CONTACTO:)\s*[0-9\s-]*/gi, '')
  .split('|').map(p => p.trim()).filter(Boolean).join(', ').trim();

const construirDetalle = (carritoRaw) => {
  const lineas = new Map();
  parseJSON(carritoRaw, []).forEach((it) => {
    const extras = (it.extras || []).map(e => e.nombre).filter(n => n && !/^🔗\s*Ref:/i.test(n));
    const clave = `${it.nombre}|${extras.join('|')}|${it.precioFinal}`;
    const prev = lineas.get(clave) || { nombre: it.nombre, extras, precio: Number(it.precioFinal || 0), cant: 0 };
    prev.cant += Number(it.cantidad) || 1;
    lineas.set(clave, prev);
  });
  return [...lineas.values()].map(l =>
    `${l.cant}x ${l.nombre}  ${dinero(l.precio * l.cant)}${l.extras.length ? `\n   + ${l.extras.join(', ')}` : ''}`
  ).join('\n');
};

exports.enviarTicketPedido = async (empresaId, pedidoId) => {
  const pRes = await db.query(
    `SELECT id, numero_pedido, tipo_consumo, total, costo_envio, descuento_puntos, carrito, direccion_entrega, cliente_id
     FROM pedidos WHERE id = $1 AND empresa_id = $2`,
    [pedidoId, empresaId]
  );
  const pedido = pRes.rows[0];
  if (!pedido) return { ok: false, motivo: 'pedido_no_encontrado' };

  const telefono = await telefonoDelPedido(empresaId, pedido);
  if (!telefono) return { ok: false, motivo: 'sin_telefono' };

  const cfgRes = await db.query('SELECT * FROM whatsapp_configuraciones WHERE empresa_id = $1', [empresaId]);
  const cfg = cfgRes.rows[0];
  if (!cfg) return { ok: false, motivo: 'canal_no_configurado' };

  const negRes = await db.query('SELECT nombre_negocio FROM configuracion WHERE empresa_id = $1', [empresaId]);
  const nombreNegocio = negRes.rows[0]?.nombre_negocio || 'nuestro restaurante';
  const nombreCliente = await nombreDelPedido(empresaId, pedido);

  const esDomicilio = pedido.tipo_consumo === 'Domicilio';
  const envio = Number(pedido.costo_envio || 0);
  const total = Number(pedido.total || 0);

  const partes = [
    `🧾 *Ticket — ${nombreNegocio}*`,
    `*Pedido #${pedido.numero_pedido}* · ${pedido.tipo_consumo}`
  ];
  if (nombreCliente) partes.push(`👤 ${nombreCliente}`);
  const dir = esDomicilio ? direccionLimpia(pedido.direccion_entrega) : '';
  if (dir) partes.push(`📍 ${dir}`);
  partes.push('', construirDetalle(pedido.carrito), '');
  if (esDomicilio) {
    partes.push(`Subtotal: ${dinero(total - envio)}`);
    partes.push(`🛵 Envío: ${dinero(envio)}`);
  }
  if (Number(pedido.descuento_puntos) > 0) partes.push(`🎁 Puntos aplicados: ${pedido.descuento_puntos}`);
  partes.push(`*Total: ${dinero(total)}*`, 'Gracias por tu preferencia 🙌');

  const enviado = await enviarTextoPorProveedor(cfg, `52${telefono}`, partes.join('\n'));
  return enviado ? { ok: true } : { ok: false, motivo: 'envio_fallido' };
};