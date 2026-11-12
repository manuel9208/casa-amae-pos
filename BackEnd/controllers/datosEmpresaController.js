// BackEnd/controllers/datosEmpresaController.js
// =========================================================================
// 🏢 CRUD de "Datos de la Empresa": sucursales, contactos e info extra.
// Se usa SIEMPRE detrás de resolveTenant + requerirPersonalPOS (req.usuario).
// Lectura: personal del POS. Escritura: solo admin/gerente.
// Las columnas salen de una lista blanca (ENTIDADES): nada del body llega
// como nombre de columna. Todo filtrado por empresa_id.
// =========================================================================
const db = require('../config/db');
const { invalidarCache } = require('../utils/datosEmpresaIA');

const ROLES_EDICION = ['admin', 'gerente'];
const TIPOS_CONTACTO = ['telefono', 'whatsapp', 'correo', 'fax', 'web', 'facebook', 'instagram', 'tiktok', 'otro'];
const PROPOSITOS = ['pedidos', 'atencion', 'pagos', 'facturacion', 'reservaciones', 'quejas', 'general', 'otro'];
const CATEGORIAS_EXTRA = ['pagos', 'servicios', 'politicas', 'general'];

const validarContacto = (d) => {
  if (d.tipo === undefined && d.valor === undefined) return null;
  if (d.tipo === undefined || d.valor === undefined) return 'Envía tipo y valor juntos.';
  if (['telefono', 'whatsapp', 'fax'].includes(d.tipo)) {
    const digitos = String(d.valor).replace(/\D/g, '').length;
    if (!/^[0-9+()\-\s.]{7,25}$/.test(d.valor) || digitos < 7 || digitos > 15) return 'Teléfono inválido (7 a 15 dígitos).';
  }
  if (d.tipo === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.valor)) return 'Correo inválido.';
  return null;
};

const ENTIDADES = {
  sucursales: {
    tabla: 'empresa_sucursales', max: 30,
    campos: {
      nombre: { t: 'texto', max: 120, req: true },
      direccion: { t: 'texto', max: 300 },
      referencias: { t: 'texto', max: 300 },
      ciudad_estado: { t: 'texto', max: 120 },
      latitud: { t: 'lat' },
      longitud: { t: 'lon' },
      url_mapa: { t: 'url' },
      horario_texto: { t: 'texto', max: 400 },
      es_principal: { t: 'bool' },
      visible_ia: { t: 'bool' },
      activo: { t: 'bool' },
      orden: { t: 'int' }
    }
  },
  contactos: {
    tabla: 'empresa_contactos', max: 100, validar: validarContacto,
    campos: {
      tipo: { t: 'enum', valores: TIPOS_CONTACTO, req: true },
      proposito: { t: 'enum', valores: PROPOSITOS },
      etiqueta: { t: 'texto', max: 80 },
      valor: { t: 'texto', max: 200, req: true },
      notas: { t: 'texto', max: 300 },
      sucursal_id: { t: 'ref' },
      visible_ia: { t: 'bool' },
      activo: { t: 'bool' },
      orden: { t: 'int' }
    }
  },
  extras: {
    tabla: 'empresa_info_extra', max: 60,
    campos: {
      categoria: { t: 'enum', valores: CATEGORIAS_EXTRA },
      titulo: { t: 'texto', max: 120, req: true },
      contenido: { t: 'texto', max: 1000, req: true },
      visible_ia: { t: 'bool' },
      activo: { t: 'bool' },
      orden: { t: 'int' }
    }
  }
};

const obtenerSpec = (nombre) => (Object.prototype.hasOwnProperty.call(ENTIDADES, nombre) ? ENTIDADES[nombre] : null);
const puedeEditar = (req) => ROLES_EDICION.includes(req.usuario && req.usuario.rol);
const limpiarTexto = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);

const normalizar = (def, bruto) => {
  const vacio = bruto === undefined || bruto === null || (typeof bruto === 'string' && bruto.trim() === '');
  switch (def.t) {
    case 'texto': return { valor: vacio ? null : limpiarTexto(bruto, def.max) };
    case 'url': {
      if (vacio) return { valor: null };
      const u = limpiarTexto(bruto, 500);
      return /^https?:\/\/\S+$/i.test(u) ? { valor: u } : { error: 'debe iniciar con http:// o https://' };
    }
    case 'lat':
    case 'lon': {
      if (vacio) return { valor: null };
      const n = Number(bruto);
      const lim = def.t === 'lat' ? 90 : 180;
      return Number.isFinite(n) && Math.abs(n) <= lim ? { valor: Math.round(n * 1e6) / 1e6 } : { error: `fuera de rango (±${lim})` };
    }
    case 'bool': return { valor: bruto === true || bruto === 'true' };
    case 'int': { const n = parseInt(bruto, 10); return { valor: Number.isFinite(n) ? Math.max(0, Math.min(n, 9999)) : 0 }; }
    case 'enum': {
      const v = String(bruto ?? '').toLowerCase().trim();
      return def.valores.includes(v) ? { valor: v } : { error: 'valor no permitido' };
    }
    case 'ref': {
      if (vacio) return { valor: null };
      const n = parseInt(bruto, 10);
      return Number.isInteger(n) && n > 0 ? { valor: n } : { error: 'inválido' };
    }
    default: return { error: 'tipo desconocido' };
  }
};

const construirDatos = (spec, body, parcial) => {
  const datos = {};
  for (const [col, def] of Object.entries(spec.campos)) {
    if (!(col in body)) {
      if (!parcial && def.req) return { error: `Falta el campo "${col}".` };
      continue;
    }
    const r = normalizar(def, body[col]);
    if (r.error) return { error: `Campo "${col}": ${r.error}` };
    if (def.req && (r.valor === null || r.valor === '')) return { error: `El campo "${col}" es obligatorio.` };
    datos[col] = r.valor;
  }
  if (spec.validar) {
    const e = spec.validar(datos);
    if (e) return { error: e };
  }
  return { datos };
};

const avisar = (req, empresaId, entidad, accion) => {
  invalidarCache(empresaId);
  const io = req.app.get('io');
  if (io) io.to(`empresa_${empresaId}`).emit('datos_empresa_actualizados', { entidad }); // 🔒 solo a la empresa dueña
  console.log(`🏢 [datos-empresa] ${req.usuario.nombre} (#${req.usuario.id}) ${accion} ${entidad} · empresa ${empresaId}`);
};

exports.obtenerTodo = async (req, res) => {
  const empresaId = req.empresa_id;
  try {
    const [suc, con, ext] = await Promise.all([
      db.query('SELECT * FROM empresa_sucursales WHERE empresa_id = $1 ORDER BY es_principal DESC, orden, id', [empresaId]),
      db.query('SELECT * FROM empresa_contactos WHERE empresa_id = $1 ORDER BY orden, id', [empresaId]),
      db.query('SELECT * FROM empresa_info_extra WHERE empresa_id = $1 ORDER BY orden, id', [empresaId])
    ]);
    res.json({ success: true, puede_editar: puedeEditar(req), sucursales: suc.rows, contactos: con.rows, extras: ext.rows });
  } catch (error) {
    console.error('🚨 [datos-empresa] obtenerTodo:', error.message);
    res.status(500).json({ success: false, error: 'No se pudieron cargar los datos de la empresa.' });
  }
};

const guardar = async (req, res, esActualizacion) => {
  const empresaId = req.empresa_id;
  const spec = obtenerSpec(req.params.entidad);
  if (!spec) return res.status(404).json({ success: false, error: 'Sección no válida.' });
  if (!puedeEditar(req)) return res.status(403).json({ success: false, error: 'Solo un administrador o gerente puede modificar estos datos.' });

  let id = null;
  if (esActualizacion) {
    id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: 'ID inválido.' });
  }

  const { datos, error } = construirDatos(spec, req.body || {}, esActualizacion);
  if (error) return res.status(400).json({ success: false, error });
  const cols = Object.keys(datos);
  if (cols.length === 0) return res.status(400).json({ success: false, error: 'No hay cambios que guardar.' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    if (!esActualizacion) {
      const cnt = await client.query(`SELECT COUNT(*)::int AS n FROM ${spec.tabla} WHERE empresa_id = $1`, [empresaId]);
      if (cnt.rows[0].n >= spec.max) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Se alcanzó el límite de ${spec.max} registros en esta sección.` });
      }
    }

    // 🔒 Anti-cruce: la sucursal elegida debe ser de ESTA empresa
    if (spec.tabla === 'empresa_contactos' && datos.sucursal_id) {
      const ok = await client.query('SELECT 1 FROM empresa_sucursales WHERE id = $1 AND empresa_id = $2', [datos.sucursal_id, empresaId]);
      if (ok.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'La sucursal indicada no existe.' });
      }
    }

    // Solo una sucursal principal por empresa
    if (spec.tabla === 'empresa_sucursales' && datos.es_principal === true) {
      await client.query(
        'UPDATE empresa_sucursales SET es_principal = false WHERE empresa_id = $1 AND es_principal = true AND ($2::int IS NULL OR id <> $2)',
        [empresaId, id]
      );
    }

    const valores = cols.map(c => datos[c]);
    let resultado;
    if (esActualizacion) {
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      resultado = await client.query(
        `UPDATE ${spec.tabla} SET ${sets}, actualizado_en = CURRENT_TIMESTAMP WHERE id = $${cols.length + 1} AND empresa_id = $${cols.length + 2} RETURNING *`,
        [...valores, id, empresaId]
      );
      if (resultado.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Registro no encontrado.' });
      }
    } else {
      resultado = await client.query(
        `INSERT INTO ${spec.tabla} (empresa_id, ${cols.join(', ')}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING *`,
        [empresaId, ...valores]
      );
    }

    await client.query('COMMIT');
    avisar(req, empresaId, req.params.entidad, esActualizacion ? 'actualizó' : 'creó');
    res.status(esActualizacion ? 200 : 201).json({ success: true, item: resultado.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('🚨 [datos-empresa] guardar:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo guardar. Intenta de nuevo.' });
  } finally {
    client.release();
  }
};

exports.crear = (req, res) => guardar(req, res, false);
exports.actualizar = (req, res) => guardar(req, res, true);

exports.eliminar = async (req, res) => {
  const empresaId = req.empresa_id;
  const spec = obtenerSpec(req.params.entidad);
  if (!spec) return res.status(404).json({ success: false, error: 'Sección no válida.' });
  if (!puedeEditar(req)) return res.status(403).json({ success: false, error: 'Solo un administrador o gerente puede modificar estos datos.' });
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: 'ID inválido.' });
  try {
    const r = await db.query(`DELETE FROM ${spec.tabla} WHERE id = $1 AND empresa_id = $2 RETURNING id`, [id, empresaId]); // 🔒 FILTRO EMPRESA
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Registro no encontrado.' });
    avisar(req, empresaId, req.params.entidad, 'eliminó');
    res.json({ success: true });
  } catch (error) {
    console.error('🚨 [datos-empresa] eliminar:', error.message);
    res.status(500).json({ success: false, error: 'No se pudo eliminar.' });
  }
};