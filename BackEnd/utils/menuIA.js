// BackEnd/utils/menuIA.js
// =========================================================================
// 🍽️ MENÚ ÚNICO PARA TODAS LAS IA (WhatsApp conversacional, WhatsApp pedidos
// y asistente del Kiosco). Siempre desde la BD, filtrado por empresa_id, con
// las mismas reglas de visibilidad que el Kiosco.
// =========================================================================
const db = require('../config/db');

const TTL_MS = 60 * 1000;
const cache = new Map(); // empresaId -> { ts, data }

const STOPWORDS = new Set(['de','del','la','el','los','las','y','e','con','sin','un','una','unos','unas','al','en','por','para','mi','me','quiero','dame','pon','ponme','orden','ordenes','favor','sabor','sabores','precio','precios','cuanto','cuesta']);

const parseOpciones = (v) => {
  try { const o = typeof v === 'string' ? JSON.parse(v || '[]') : v; return Array.isArray(o) ? o : []; } catch (e) { return []; }
};

const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokens = (t) => normalizar(t).split(' ')
  .filter(x => x.length >= 2 && !STOPWORDS.has(x))
  .map(x => (x.length > 3 && x.endsWith('s') ? x.slice(0, -1) : x));

const lev = (a, b) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
};

// 1 = exacta; 0.85 = prefijo; 0.7 = error de 1-2 letras (rol/roll, boneles/boneless, abanero/habanero)
const calidadToken = (q, t) => {
  if (q === t) return 1;
  if (q.length >= 3 && t.startsWith(q)) return 0.85;
  if (t.length >= 3 && q.startsWith(t) && q.length - t.length <= 2) return 0.75;
  const largo = Math.max(q.length, t.length);
  const tol = largo >= 8 ? 2 : (largo >= 4 ? 1 : 0);
  return tol && lev(q, t) <= tol ? 0.7 : 0;
};
const mejorCalidad = (tk, lista) => lista.reduce((m, t) => Math.max(m, calidadToken(tk, t)), 0);

const dinero = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

// 💰 REGLA ÚNICA DE PRECIO CON VARIACIÓN (idéntica a Caja: asistenteCalculos.js, y al Kiosco: ModalPersonalizar.js):
//  - precioExtra == base -> el sabor trae el precio completo (Shakespeare $98)       -> +0
//  - precioExtra  > base -> se cobra la diferencia sobre la base                      -> +(opción - base)
//  - precioExtra  < base -> se toma como recargo (0 = "mismo precio", Brownie NUEZ 1) -> +opción
const deltaVariacion = (precioBase, precioOpcion) => {
  const base = Number(precioBase || 0);
  const opcion = Number(precioOpcion || 0);
  if (opcion === base) return 0;
  if (opcion > base) return opcion - base;
  return opcion;
};
const precioFinalConVariacion = (precioBase, precioOpcion) =>
  Math.round((Number(precioBase || 0) + deltaVariacion(precioBase, precioOpcion)) * 100) / 100;

// Precio legible, ya con la regla de arriba. Con 2+ grupos de variación (ej. Tamaño y Sabor)
// cada grupo se muestra como si fuera el único.
const precioTexto = (it) => {
  if (!it.variaciones.length) return dinero(it.precio_base);
  const grupos = new Map();
  it.variaciones.forEach(v => {
    if (!grupos.has(v.categoria)) grupos.set(v.categoria, []);
    grupos.get(v.categoria).push(v);
  });
  return [...grupos.entries()].map(([cat, vs]) => {
    const precios = vs.map(v => precioFinalConVariacion(it.precio_base, v.precio));
    const iguales = precios.every(p => p === precios[0]);
    return iguales
      ? `${cat}: ${vs.map(v => v.nombre).join(', ')} (${dinero(precios[0])} cada uno)`
      : `${cat}: ${vs.map((v, i) => `${v.nombre} ${dinero(precios[i])}`).join(', ')}`;
  }).join(' · ');
};

const obtenerCatalogo = async (empresaId) => {
  const c = cache.get(empresaId);
  if (c && Date.now() - c.ts < TTL_MS) return c.data;

  // Mismas reglas del Kiosco: producto disponible, y su categoría activa (o "General")
  const r = await db.query(`
    SELECT p.id, p.nombre, p.categoria, p.descripcion, p.precio_base, p.opciones, p.usa_stock, p.stock_preparado
    FROM productos p
    LEFT JOIN clasificaciones c ON c.nombre = p.categoria AND c.empresa_id = p.empresa_id
    WHERE p.empresa_id = $1
      AND p.disponible = true
      AND (COALESCE(p.categoria, 'General') = 'General' OR c.nombre IS NOT NULL)
      AND COALESCE(c.disponible, true) = true
    ORDER BY p.categoria NULLS LAST, p.nombre
    LIMIT 400
  `, [empresaId]);

  const data = r.rows.map(p => {
    const variaciones = parseOpciones(p.opciones)
      .filter(o => o && o.tipo === 'variacion' && o.nombre)
      .map(v => ({ nombre: String(v.nombre).trim(), categoria: String(v.categoria || 'Opción').trim(), precio: Number(v.precioExtra || 0) }));
    return {
      id: p.id,
      nombre: String(p.nombre || '').trim(),
      categoria: String(p.categoria || 'General').trim(),
      descripcion: p.descripcion || '',
      precio_base: Number(p.precio_base || 0),
      variaciones,
      agotado: (p.usa_stock === true || String(p.usa_stock) === 'true') && Number(p.stock_preparado || 0) <= 0,
      tNombre: tokens(p.nombre),
      tCategoria: tokens(p.categoria),
      tVariaciones: variaciones.flatMap(v => tokens(v.nombre))
    };
  });
  cache.set(empresaId, { ts: Date.now(), data });
  return data;
};

// Compacto a propósito (sin descripciones): cabe completo y cuesta pocos tokens
const construirMenuTexto = (items, maxChars = 12000) => {
  const porCat = new Map();
  items.forEach(it => {
    if (!porCat.has(it.categoria)) porCat.set(it.categoria, []);
    porCat.get(it.categoria).push(it);
  });
  return [...porCat.entries()]
    .map(([cat, lista]) => `${cat}: ` + lista.map(it => `${it.nombre} — ${precioTexto(it)}${it.agotado ? ' [AGOTADO]' : ''}`).join(' | '))
    .join('\n')
    .slice(0, maxChars);
};

const resolverProducto = async (empresaId, texto) => {
  const items = await obtenerCatalogo(empresaId);
  const q = tokens(texto);
  if (q.length === 0) return { encontrado: false };

  // ¿Las palabras coinciden con el nombre de una CATEGORÍA? (ej. "boneles")
  const catCoincide = [...new Set(items.map(i => i.categoria))].find(c => {
    const tc = tokens(c);
    return tc.length > 0 && q.every(tk => tc.some(t => calidadToken(tk, t) >= 0.7));
  });
  const categoria_coincidente = catCoincide ? {
    nombre: catCoincide,
    productos: items.filter(i => i.categoria === catCoincide).slice(0, 15)
      .map(i => ({ nombre: i.nombre, precio_texto: precioTexto(i), agotado: i.agotado }))
  } : null;

  const qNorm = q.join(' ');
  const puntuados = items.map(it => {
    let score = 0, cubiertos = 0;
    q.forEach(tk => {
      const m = Math.max(mejorCalidad(tk, it.tNombre) * 2, mejorCalidad(tk, it.tCategoria), mejorCalidad(tk, it.tVariaciones));
      if (m > 0) { cubiertos++; score += m; }
    });
    return { it, score, cobertura: cubiertos / q.length, exacto: it.tNombre.join(' ') === qNorm };
  }).filter(x => x.cobertura >= 0.5);

  if (puntuados.length === 0) return { encontrado: false, categoria_coincidente };

  puntuados.sort((a, b) =>
    (Number(b.exacto) - Number(a.exacto)) || (b.cobertura - a.cobertura) || (b.score - a.score) || (a.it.nombre.length - b.it.nombre.length));

  const mejor = puntuados[0];
  const empatados = puntuados.filter(x => x.cobertura === mejor.cobertura && Math.abs(x.score - mejor.score) < 0.15);
  const exactos = puntuados.filter(x => x.exacto);
  const ambiguo = exactos.length > 1 || (!mejor.exacto && empatados.length > 1);
  const it = mejor.it;

  if (it.agotado && !ambiguo) return { encontrado: false, motivo: 'sin_stock', nombre: it.nombre, categoria_coincidente };

  const variacion = it.variaciones.find(v => tokens(v.nombre).some(vt => q.some(tk => calidadToken(tk, vt) >= 0.7)));

  return {
    encontrado: true,
    producto_id: it.id,
    nombre: it.nombre,
    categoria: it.categoria,
    descripcion: it.descripcion,
    precio_base: it.precio_base,
    precio_texto: precioTexto(it),
    variacion_coincidente: variacion ? variacion.nombre : null, // nombre EXACTO de la BD
    coincidencia_parcial: mejor.cobertura < 1,
    ambiguo,
    otras_coincidencias: puntuados.slice(1, 5).map(x => ({ producto_id: x.it.id, nombre: x.it.nombre, categoria: x.it.categoria, precio_texto: precioTexto(x.it) })),
    categoria_coincidente,
    preguntar_categoria: !!categoria_coincidente // el cliente nombró una categoría: preguntar antes de agregar
  };
};

const invalidarCache = (empresaId) => { if (empresaId) cache.delete(empresaId); else cache.clear(); };

module.exports = { obtenerCatalogo, construirMenuTexto, resolverProducto, precioTexto, precioFinalConVariacion, invalidarCache };