// BackEnd/controllers/empresasController.js
// =========================================================================
// 🏢 PANEL ADMIN EMPRESAS — Exclusivo Admin Global
// -------------------------------------------------------------------------
// Gestiona el alta de empresas y las Variables de Entorno por empresa,
// guardadas cifradas dentro de la columna empresas.variables (jsonb) ya
// existente. CERO tabla nueva, CERO ALTER TABLE.
//
// 🆕 CATÁLOGO DE CLAVES (qué variables existen, ej. CLOUDINARY_API_KEY):
// en vez de crear una tabla nueva, se reutiliza la MISMA tabla "empresas"
// con una fila especial "centinela" (slug reservado, NO es un negocio
// real) cuya columna variables.claves guarda el arreglo de nombres de
// variables disponibles para TODAS las empresas. Esa fila queda oculta
// del listado normal de empresas (listarEmpresas la excluye) y no puede
// recibir tráfico real (activo = false), por lo que resolveTenant.js la
// rechazaría si alguien intentara usarla como tenant.
// =========================================================================

const db = require('../config/db');
const { encriptar, desencriptar, enmascarar } = require('../utils/cryptoHelper');

// Slug reservado de la fila centinela — NUNCA debe asignarse a una empresa real
const SLUG_CATALOGO = '__catalogo_variables__';

// Catálogo inicial (semilla) — solo se usa la primera vez que arranca el sistema
const CLAVES_INICIALES = [
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'FRONTEND_URL',
  'RP_ID',
  'VAPID_EMAIL',
  'VAPID_PRIVATE_KEY',
  'VAPID_PUBLIC_KEY'
];

// =========================================================================
// 🛡️ AUTO-CREACIÓN DE LA TABLA empresas + fila centinela del catálogo
// =========================================================================
exports.inicializarTablaEmpresas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        slug VARCHAR(50) NOT NULL,
        variables JSONB DEFAULT '{}',
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT NOW(),
        CONSTRAINT empresas_slug_key UNIQUE (slug)
      );
    `);

    // 🔧 FIX: Forzar la restricción única en la tabla si ya existía desde antes
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_slug_key') THEN 
          ALTER TABLE empresas ADD CONSTRAINT empresas_slug_key UNIQUE (slug); 
        END IF; 
      END $$;
    `);

    // 🆕 Fase 2 — Candados comerciales de WhatsApp, independientes entre sí.
    // NO son secretos (por eso van aparte de "variables", que sí se cifra).
    // Exclusivos del panel AdminEmpresas.js (ver endpoints de toggle más abajo).
    await db.query(`ALTER TABLE empresas ADD COLUMN IF NOT EXISTS whatsapp_pedidos_ia BOOLEAN DEFAULT false;`);
    await db.query(`ALTER TABLE empresas ADD COLUMN IF NOT EXISTS whatsapp_notificaciones BOOLEAN DEFAULT false;`);

    // Sembrar la fila centinela del catálogo si todavía no existe
    await db.query(
      `INSERT INTO empresas (nombre, slug, variables, activo)
       VALUES ($1, $2, $3::jsonb, false)
       ON CONFLICT (slug) DO NOTHING`,
      ['[SISTEMA] Catálogo de Variables', SLUG_CATALOGO, JSON.stringify({ claves: CLAVES_INICIALES })]
    );

    console.log('✅ Tabla "empresas" y catálogo de variables verificados/creados correctamente.');
  } catch (error) {
    console.error('🚨 Error al verificar/crear la tabla "empresas":', error);
  }
};

// Helper interno: obtiene el arreglo de claves del catálogo (con auto-reparación)
async function obtenerClavesCatalogo() {
  const result = await db.query('SELECT variables FROM empresas WHERE slug = $1', [SLUG_CATALOGO]);
  if (result.rows.length === 0) {
    // Fila centinela perdida por alguna razón: la recreamos con la semilla inicial
    await db.query(
      `INSERT INTO empresas (nombre, slug, variables, activo)
       VALUES ($1, $2, $3::jsonb, false)
       ON CONFLICT (slug) DO NOTHING`,
      ['[SISTEMA] Catálogo de Variables', SLUG_CATALOGO, JSON.stringify({ claves: CLAVES_INICIALES })]
    );
    return CLAVES_INICIALES;
  }
  const data = result.rows[0].variables || {};
  return Array.isArray(data.claves) ? data.claves : CLAVES_INICIALES;
}

// GET /admin-global/variables-catalogo -> lista de claves disponibles (ej. para pintar los inputs)
exports.obtenerCatalogoClaves = async (req, res) => {
  try {
    const claves = await obtenerClavesCatalogo();
    res.json({ claves });
  } catch (error) {
    console.error('🚨 Error al obtener catálogo de claves:', error);
    res.status(500).json({ error: 'No se pudo obtener el catálogo de variables.' });
  }
};

// POST /admin-global/variables-catalogo  { clave }  -> agrega una variable nueva al catálogo GLOBAL
exports.agregarClaveCatalogo = async (req, res) => {
  try {
    let { clave } = req.body;
    if (!clave || !String(clave).trim()) {
      return res.status(400).json({ error: 'El nombre de la variable es obligatorio.' });
    }

    // Normaliza: mayúsculas, solo letras/números/guion bajo (estilo .env estándar)
    clave = String(clave).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!clave) {
      return res.status(400).json({ error: 'El nombre de la variable no es válido.' });
    }

    const clavesActuales = await obtenerClavesCatalogo();
    if (clavesActuales.includes(clave)) {
      return res.status(409).json({ error: `La variable "${clave}" ya existe en el catálogo.` });
    }

    const nuevasClaves = [...clavesActuales, clave];
    await db.query(
      `UPDATE empresas SET variables = jsonb_set(COALESCE(variables, '{}'::jsonb), '{claves}', $1::jsonb) WHERE slug = $2`,
      [JSON.stringify(nuevasClaves), SLUG_CATALOGO]
    );

    res.status(201).json({ ok: true, claves: nuevasClaves });
  } catch (error) {
    console.error('🚨 Error al agregar clave al catálogo:', error);
    res.status(500).json({ error: 'No se pudo agregar la variable al catálogo.' });
  }
};

// GET /admin-global/empresas
exports.listarEmpresas = async (req, res) => {
  try {
    // 🆕 Se excluye la fila centinela del catálogo — no es una empresa real
    // 🆕 Fase 2: se incluyen los dos flags comerciales de WhatsApp para pintar
    // sus switches en AdminEmpresas.js
    const result = await db.query(
      'SELECT id, nombre, slug, activo, creado_en, whatsapp_pedidos_ia, whatsapp_notificaciones, notificaciones_push FROM empresas WHERE slug <> $1 ORDER BY nombre ASC',
      [SLUG_CATALOGO]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('🚨 Error al listar empresas:', error);
    res.status(500).json({ error: 'No se pudo obtener la lista de empresas.' });
  }
};

// POST /admin-global/empresas  { nombre }
exports.crearEmpresa = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
    }

    const slug = String(nombre).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
      .replace(/[^a-z0-9]+/g, ''); // solo letras y números

    // 🆕 Defensa extra: nadie puede crear una empresa cuyo slug choque
    // conceptualmente con la fila centinela del catálogo.
    if (!slug || slug === 'catalogovariables') {
      return res.status(400).json({ error: 'El nombre no generó un identificador (slug) válido.' });
    }

    const result = await db.query(
      `INSERT INTO empresas (nombre, slug, variables, activo)
       VALUES ($1, $2, '{}'::jsonb, true)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id, nombre, slug, activo, creado_en`,
      [String(nombre).trim(), slug]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: `Ya existe una empresa con el identificador "${slug}". Usa un nombre distinto.` });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('🚨 Error al crear empresa:', error);
    res.status(500).json({ error: 'No se pudo crear la empresa.' });
  }
};

// GET /admin-global/empresas/:id/variables -> valores enmascarados
exports.obtenerVariablesEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT variables FROM empresas WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada.' });

    const claves = await obtenerClavesCatalogo();
    const guardadas = result.rows[0].variables || {};
    const respuesta = {};

    claves.forEach(clave => {
      const valorCifrado = guardadas[clave];
      if (!valorCifrado) {
        respuesta[clave] = { configurada: false, mascara: '' };
      } else {
        const valorPlano = desencriptar(valorCifrado);
        respuesta[clave] = { configurada: !!valorPlano, mascara: enmascarar(valorPlano) };
      }
    });

    res.json(respuesta);
  } catch (error) {
    console.error('🚨 Error al obtener variables de empresa:', error);
    res.status(500).json({ error: 'No se pudieron obtener las variables de la empresa.' });
  }
};

// GET /admin-global/empresas/:id/variables/:clave/revelar -> valor real (el "ojo")
exports.revelarVariable = async (req, res) => {
  try {
    const { id, clave } = req.params;
    const clavesPermitidas = await obtenerClavesCatalogo();
    if (!clavesPermitidas.includes(clave)) {
      return res.status(400).json({ error: 'Esa clave no es gestionable desde este panel.' });
    }

    const result = await db.query('SELECT variables FROM empresas WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada.' });

    const guardadas = result.rows[0].variables || {};
    const valorCifrado = guardadas[clave];
    const valorPlano = valorCifrado ? desencriptar(valorCifrado) : '';

    res.json({ clave, valor: valorPlano });
  } catch (error) {
    console.error('🚨 Error al revelar variable:', error);
    res.status(500).json({ error: 'No se pudo revelar la variable.' });
  }
};

// PUT /admin-global/empresas/:id/variables  { variables: { CLAVE: 'nuevoValor', ... } }
exports.actualizarVariables = async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    if (!variables || typeof variables !== 'object') {
      return res.status(400).json({ error: 'Formato de variables inválido.' });
    }

    const result = await db.query('SELECT variables FROM empresas WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada.' });

    const clavesPermitidas = await obtenerClavesCatalogo();
    const actuales = result.rows[0].variables || {};
    const nuevas = { ...actuales };

    Object.keys(variables).forEach(clave => {
      if (!clavesPermitidas.includes(clave)) return; // ignora cualquier clave no autorizada
      const valor = variables[clave];
      // Si llega vacío, NO se toca (evita borrar un valor ya guardado por error de UI)
      if (valor === '' || valor === null || valor === undefined) return;
      nuevas[clave] = encriptar(valor);
    });

    await db.query('UPDATE empresas SET variables = $1 WHERE id = $2', [JSON.stringify(nuevas), id]);

    // 🆕 Refleja el cambio de inmediato en Cloudinary/VAPID/RP_ID sin esperar
    // el TTL del caché de envResolver.js
    const { invalidarCache } = require('../utils/envResolver');
    invalidarCache(Number(id));

    res.json({ ok: true, mensaje: 'Variables actualizadas correctamente.' });
  } catch (error) {
    console.error('🚨 Error al actualizar variables:', error);
    res.status(500).json({ error: 'No se pudieron actualizar las variables.' });
  }
};

// =========================================================================
// 🆕 FASE 2 — CANDADOS COMERCIALES DE WHATSAPP (Exclusivo Admin Global)
// -------------------------------------------------------------------------
// PUT /admin-global/empresas/:id/whatsapp-flag  { clave: 'whatsapp_pedidos_ia' | 'whatsapp_notificaciones', valor: true|false }
// Dos booleanos INDEPENDIENTES, validados por nombre exacto de columna para
// evitar inyección de nombre de columna (whitelist estricta).
// =========================================================================
const FLAGS_WHATSAPP_PERMITIDOS = ['whatsapp_pedidos_ia', 'whatsapp_notificaciones', 'notificaciones_push'];

exports.actualizarFlagWhatsapp = async (req, res) => {
  try {
    const { id } = req.params;
    const { clave, valor } = req.body;

    if (!FLAGS_WHATSAPP_PERMITIDOS.includes(clave)) {
      return res.status(400).json({ error: `Flag no reconocido. Usa uno de: ${FLAGS_WHATSAPP_PERMITIDOS.join(', ')}` });
    }

    const result = await db.query(`UPDATE empresas SET ${clave} = $1 WHERE id = $2 RETURNING id, ${clave}`, [!!valor, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada.' });

    res.json({ ok: true, empresa_id: Number(id), clave, valor: !!valor });
  } catch (error) {
    console.error('🚨 Error al actualizar flag de WhatsApp:', error);
    res.status(500).json({ error: 'No se pudo actualizar el flag de WhatsApp.' });
  }
};