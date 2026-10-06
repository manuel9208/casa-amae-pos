const db = require('../config/db');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk'); // 👇 NUEVO: SDK de Claude (Anthropic)

const respuestasCache = new Map();

// 👇 Cadena de modelos: gemini-3.8-flash como principal (mejor calidad), con
// gemini-3.5-flash-lite como respaldo automático si el primero se satura (503).
// Así repartimos la carga entre DOS cuotas distintas de Google en vez de una sola.
const GEMINI_MODELS_FALLBACK = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

// 👇 FIX CRÍTICO (bug del contador de consultas): "new Date().toISOString()" SIEMPRE
// devuelve la fecha en UTC, ignorando por completo el "process.env.TZ = 'America/Mazatlan'"
// configurado en index.js. Eso provocaba que el contador de 15 consultas/día (y el límite
// de 1 imagen/día) se reiniciara o se calculara mal en la ventana de ~7 horas donde el
// "día UTC" ya cambió pero para el negocio (Mazatlán) seguía siendo el mismo día.
// Esta función SÍ respeta la zona horaria local del proceso Node.
const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
};

// 👇 Blindaje anti-Markdown: limpia **negritas**, #encabezados y `código` antes
// de mostrar la respuesta en el Chat, ya que ChatCopiloto.js no interpreta Markdown.
const limpiarMarkdown = (texto) => {
  if (!texto) return texto;
  return texto
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/^\s*[\*\+]\s+/gm, '- ');
};

// =========================================================================
// 📅 MOTOR DE FECHAS COMPARATIVAS (Semana/Mes/Año/Rango)
// -------------------------------------------------------------------------
// Reglas de negocio CONFIRMADAS:
// - semana: actual, semana anterior, misma semana mes pasado, misma semana año pasado
// - mes (DEFAULT): mes actual, mes pasado, mismo mes año pasado
// - año: año actual, año pasado
// - rango: rango elegido, rango anterior equivalente (mismo tamaño), mismo rango año pasado
// Todas las fechas se devuelven en formato 'YYYY-MM-DD' listas para usarse en SQL
// con BETWEEN $1 AND $2 (parametrizado, sin riesgo de inyección).
// =========================================================================
const formatearFechaSQL = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const restarMeses = (fecha, meses) => {
  const nueva = new Date(fecha);
  nueva.setMonth(nueva.getMonth() - meses);
  return nueva;
};

const restarAnios = (fecha, anios) => {
  const nueva = new Date(fecha);
  nueva.setFullYear(nueva.getFullYear() - anios);
  return nueva;
};

const obtenerLunesDeSemana = (fecha) => {
  const nueva = new Date(fecha);
  const dia = nueva.getDay(); // 0=domingo, 1=lunes...
  const diff = dia === 0 ? -6 : 1 - dia;
  nueva.setDate(nueva.getDate() + diff);
  return nueva;
};

/**
 * Calcula los rangos de fechas a comparar según el modo elegido por el usuario.
 * @param {string} modo - 'semana' | 'mes' | 'año' | 'rango'
 * @param {string} fechaReferencia - 'YYYY-MM-DD' opcional (para elegir "qué" semana/mes/año ver, no solo el actual)
 * @param {string} rangoInicioManual - 'YYYY-MM-DD', obligatorio solo si modo='rango'
 * @param {string} rangoFinManual - 'YYYY-MM-DD', obligatorio solo si modo='rango'
 */
const calcularRangosTiempo = (modo = 'mes', fechaReferencia = null, rangoInicioManual = null, rangoFinManual = null) => {
  const hoyLocal = fechaReferencia ? new Date(`${fechaReferencia}T00:00:00`) : new Date();
  const rangos = {};

  if (modo === 'semana') {
    const lunesActual = obtenerLunesDeSemana(hoyLocal);
    const domingoActual = new Date(lunesActual); domingoActual.setDate(domingoActual.getDate() + 6);
    rangos.actual = { inicio: formatearFechaSQL(lunesActual), fin: formatearFechaSQL(domingoActual), label: `Semana del ${formatearFechaSQL(lunesActual)} al ${formatearFechaSQL(domingoActual)}` };

    const lunesAnterior = new Date(lunesActual); lunesAnterior.setDate(lunesAnterior.getDate() - 7);
    const domingoAnterior = new Date(domingoActual); domingoAnterior.setDate(domingoAnterior.getDate() - 7);
    rangos.anterior = { inicio: formatearFechaSQL(lunesAnterior), fin: formatearFechaSQL(domingoAnterior), label: `Semana anterior (${formatearFechaSQL(lunesAnterior)} al ${formatearFechaSQL(domingoAnterior)})` };

    const lunesMesPasado = restarMeses(lunesActual, 1);
    const domingoMesPasado = restarMeses(domingoActual, 1);
    rangos.mesPasado = { inicio: formatearFechaSQL(lunesMesPasado), fin: formatearFechaSQL(domingoMesPasado), label: `Misma semana, mes pasado (${formatearFechaSQL(lunesMesPasado)} al ${formatearFechaSQL(domingoMesPasado)})` };

    const lunesAnioPasado = restarAnios(lunesActual, 1);
    const domingoAnioPasado = restarAnios(domingoActual, 1);
    rangos.anioPasado = { inicio: formatearFechaSQL(lunesAnioPasado), fin: formatearFechaSQL(domingoAnioPasado), label: `Misma semana, año pasado (${formatearFechaSQL(lunesAnioPasado)} al ${formatearFechaSQL(domingoAnioPasado)})` };

  } else if (modo === 'año') {
    const anioActual = hoyLocal.getFullYear();
    rangos.actual = { inicio: `${anioActual}-01-01`, fin: `${anioActual}-12-31`, label: `Año ${anioActual}` };
    rangos.anterior = { inicio: `${anioActual - 1}-01-01`, fin: `${anioActual - 1}-12-31`, label: `Año ${anioActual - 1}` };
    rangos.anioPasado = rangos.anterior; // Para "año", el "anterior" y el "mismo periodo año pasado" son el mismo dato

  } else if (modo === 'rango') {
    if (!rangoInicioManual || !rangoFinManual) {
      throw new Error('Debes indicar fecha de inicio y fin para el modo "rango".');
    }
    const inicioActual = new Date(`${rangoInicioManual}T00:00:00`);
    const finActual = new Date(`${rangoFinManual}T00:00:00`);
    const diffDias = Math.round((finActual - inicioActual) / (1000 * 60 * 60 * 24)) + 1;

    rangos.actual = { inicio: formatearFechaSQL(inicioActual), fin: formatearFechaSQL(finActual), label: `Del ${formatearFechaSQL(inicioActual)} al ${formatearFechaSQL(finActual)}` };

    const finAnterior = new Date(inicioActual); finAnterior.setDate(finAnterior.getDate() - 1);
    const inicioAnterior = new Date(finAnterior); inicioAnterior.setDate(inicioAnterior.getDate() - diffDias + 1);
    rangos.anterior = { inicio: formatearFechaSQL(inicioAnterior), fin: formatearFechaSQL(finAnterior), label: `Rango anterior equivalente (${formatearFechaSQL(inicioAnterior)} al ${formatearFechaSQL(finAnterior)})` };

    const inicioAnioPasado = restarAnios(inicioActual, 1);
    const finAnioPasado = restarAnios(finActual, 1);
    rangos.anioPasado = { inicio: formatearFechaSQL(inicioAnioPasado), fin: formatearFechaSQL(finAnioPasado), label: `Mismo rango, año pasado (${formatearFechaSQL(inicioAnioPasado)} al ${formatearFechaSQL(finAnioPasado)})` };

  } else {
    // modo === 'mes' (DEFAULT)
    const primerDiaMes = new Date(hoyLocal.getFullYear(), hoyLocal.getMonth(), 1);
    const ultimoDiaMes = new Date(hoyLocal.getFullYear(), hoyLocal.getMonth() + 1, 0);
    rangos.actual = { inicio: formatearFechaSQL(primerDiaMes), fin: formatearFechaSQL(ultimoDiaMes), label: `Mes actual (${primerDiaMes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})` };

    const primerDiaMesPasado = restarMeses(primerDiaMes, 1);
    const ultimoDiaMesPasado = new Date(primerDiaMesPasado.getFullYear(), primerDiaMesPasado.getMonth() + 1, 0);
    rangos.anterior = { inicio: formatearFechaSQL(primerDiaMesPasado), fin: formatearFechaSQL(ultimoDiaMesPasado), label: `Mes pasado (${primerDiaMesPasado.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})` };

    const primerDiaMesAnioPasado = restarAnios(primerDiaMes, 1);
    const ultimoDiaMesAnioPasado = new Date(primerDiaMesAnioPasado.getFullYear(), primerDiaMesAnioPasado.getMonth() + 1, 0);
    rangos.anioPasado = { inicio: formatearFechaSQL(primerDiaMesAnioPasado), fin: formatearFechaSQL(ultimoDiaMesAnioPasado), label: `Mismo mes, año pasado (${primerDiaMesAnioPasado.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})` };
  }

  return rangos;
};

// 👇 Resume ingresos/pedidos/cancelaciones de un rango de fechas específico (reutilizable
// para el periodo actual Y para cada periodo comparativo, evitando duplicar la query 4 veces).
const obtenerResumenPeriodo = async (fechaInicio, fechaFin) => {
  try {
    const res = await db.query(`
      SELECT 
        COUNT(CASE WHEN estado_preparacion != 'Cancelado' THEN 1 END) as pedidos_validos,
        COALESCE(SUM(CASE WHEN estado_preparacion != 'Cancelado' THEN total ELSE 0 END), 0) as ingresos_validos,
        COUNT(CASE WHEN estado_preparacion = 'Cancelado' THEN 1 END) as pedidos_cancelados,
        COALESCE(SUM(CASE WHEN estado_preparacion = 'Cancelado' THEN total ELSE 0 END), 0) as dinero_cancelado
      FROM pedidos
      WHERE fecha_creacion::date BETWEEN $1 AND $2
    `, [fechaInicio, fechaFin]);
    return {
      pedidos: Number(res.rows[0].pedidos_validos),
      ingresos: Number(res.rows[0].ingresos_validos),
      cancelados: Number(res.rows[0].pedidos_cancelados),
      dineroCancelado: Number(res.rows[0].dinero_cancelado)
    };
  } catch (e) {
    return { pedidos: 0, ingresos: 0, cancelados: 0, dineroCancelado: 0 };
  }
};

const calcularVariacionPct = (actual, anterior) => {
  if (!anterior || anterior === 0) return null;
  return Number((((actual - anterior) / anterior) * 100).toFixed(1));
};

// =========================================================================
// 0. CEREBRO ENRUTADOR DINÁMICO (Sin dependencias globales rígidas)
// =========================================================================
// 👇 CAMBIO DE ARQUITECTURA: "proveedorElegido" ahora llega como parámetro explícito,
// enviado por el FRONTEND según lo que el usuario seleccionó en su sesión de Chat.
// Ya NO se usa "configIA.proveedor_activo" como fuente de verdad (ese campo se
// mantiene en la tabla solo por compatibilidad, pero deja de dictar el comportamiento).
const generarRespuestaTexto = async (systemPrompt, userPrompt, temperature = 0.3, maxRetries = 3, cacheKey = null, configIA = null, proveedorElegido = null) => {
  // 1. Verificación de Caché (Respuesta guardada por 30 minutos = 0 costo)
  if (cacheKey && respuestasCache.has(cacheKey)) {
    const dataCached = respuestasCache.get(cacheKey);
    if (Date.now() - dataCached.timestamp < 1800000) { 
      console.log(`⚡ Sirviendo respuesta IA desde Caché: ${cacheKey}`);
      return dataCached.texto;
    } else {
      respuestasCache.delete(cacheKey);
    }
  }

  // 2. Control Lógico de Cuotas (Nuestro candado de 15 consultas)
  // 👇 FIX: Usamos obtenerFechaHoyLocal() en vez de toISOString() para que el "día"
  // se calcule en la zona horaria real del negocio (America/Mazatlan), no en UTC.
  const hoy = obtenerFechaHoyLocal();
  const fechaUsoDB = configIA?.fecha_uso ? new Date(configIA.fecha_uso).toLocaleDateString('en-CA') : hoy;
  
  let consultasUsadas = (fechaUsoDB === hoy) ? (configIA?.consultas_hoy || 0) : 0;

  // Bloqueo estricto solo para cuentas FREE
  if (!configIA?.tier_premium && consultasUsadas >= 15) {
    throw new Error("Has alcanzado el límite de 15 consultas gratuitas diarias. Activa el modo Premium o espera a mañana.");
  }

  // 3. Inicialización Dinámica de Llaves desde Base de Datos
  // 👇 El proveedor ahora lo decide el USUARIO en el Chat (proveedorElegido), no un
  // valor fijo guardado por el Admin. Si por algún motivo no llega nada (ej. una
  // llamada vieja del sistema), caemos a 'gemini' como default seguro.
  const proveedor = proveedorElegido || 'gemini';

  // 👇 DOBLE CANDADO: El Admin Global decide qué proveedores EXISTEN como opción
  // (gemini_habilitado / openai_habilitado / claude_habilitado). Aunque alguien
  // manipule "proveedor_activo" manualmente (ej. desde Postman), si ese proveedor
  // no fue habilitado por el Admin, se bloquea aquí mismo en el backend.
  const mapaHabilitados = {
    gemini: configIA?.gemini_habilitado !== false, // true por default (retrocompatible)
    openai: configIA?.openai_habilitado === true,
    claude: configIA?.claude_habilitado === true
  };
  if (mapaHabilitados[proveedor] !== true) {
    throw new Error(`El proveedor "${proveedor}" que elegiste no está disponible. El Administrador Global debe habilitarlo primero en Ajustes de IA.`);
  }

  if (proveedor === 'gemini') {
    const apiKey = (configIA?.api_key_gemini || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) throw new Error("Falta la llave de Gemini. El Administrador Global debe agregarla en Ajustes de IA.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const promptCompleto = `INSTRUCCIÓN DEL SISTEMA (Contexto interno, no lo menciones):\n${systemPrompt}\n\nPREGUNTA DEL USUARIO:\n${userPrompt}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 👇 Usa el modelo principal en el primer intento; si falla, prueba el de respaldo
        const modeloActual = GEMINI_MODELS_FALLBACK[Math.min(attempt - 1, GEMINI_MODELS_FALLBACK.length - 1)];
        const model = genAI.getGenerativeModel({ model: modeloActual });
        const result = await model.generateContent(promptCompleto);
        let textoFinal = result.response.text();
        textoFinal = limpiarMarkdown(textoFinal);
        
        if (cacheKey) respuestasCache.set(cacheKey, { texto: textoFinal, timestamp: Date.now() });
        await registrarConsumoIA(hoy);

        return textoFinal;
      } catch (error) {
        console.warn(`⏳ Advertencia IA (Intento ${attempt}/${maxRetries}):`, error.message);
        
        if (error.message.includes('429')) {
          throw new Error("Cuota de Google agotada temporalmente. Por favor, espera 1 minuto.");
        } else if (error.message.includes('503') && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (error.message.includes('API key not valid')) {
          throw new Error("La llave de Gemini ingresada es inválida. Revisa la configuración.");
        } else if (attempt >= maxRetries) {
          throw new Error("Los servidores de IA están experimentando alta demanda. Intenta de nuevo.");
        }
      }
    }
    throw new Error("Los servidores de IA están experimentando alta demanda. Intenta de nuevo.");

  } else if (proveedor === 'claude') {
    // 👇 NUEVO: MODO CLAUDE (Anthropic)
    const apiKey = (configIA?.api_key_claude || process.env.CLAUDE_API_KEY || '').trim();
    if (!apiKey) throw new Error("Falta la llave de Claude. El Administrador Global debe agregarla en Ajustes de IA.");
    const anthropic = new Anthropic({ apiKey });

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 1024,
        temperature: temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const textoFinal = limpiarMarkdown(response.content?.[0]?.text || '');
      if (cacheKey) respuestasCache.set(cacheKey, { texto: textoFinal, timestamp: Date.now() });
      await registrarConsumoIA(hoy);
      return textoFinal;
    } catch (error) {
      const msgErr = error.message || '';
      if (msgErr.includes('authentication_error') || msgErr.includes('invalid x-api-key') || msgErr.includes('401')) {
        throw new Error("La llave de Claude ingresada es inválida.");
      } else if (msgErr.includes('credit balance') || msgErr.includes('insufficient')) {
        throw new Error("Tu cuenta de Anthropic (Claude) se ha quedado sin saldo.");
      }
      throw new Error("Error de conexión con Claude.");
    }

  } else {
    // MODO OPENAI (ChatGPT)
    const apiKey = (configIA?.api_key_openai || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error("Falta la llave de ChatGPT. El Administrador Global debe agregarla en Ajustes de IA.");
    const openai = new OpenAI({ apiKey });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: temperature,
      });
      const textoFinal = limpiarMarkdown(response.choices[0].message.content);
      if (cacheKey) respuestasCache.set(cacheKey, { texto: textoFinal, timestamp: Date.now() });
      await registrarConsumoIA(hoy);
      return textoFinal;
    } catch (error) {
      if (error.message.includes('Incorrect API key')) {
        throw new Error("La llave de ChatGPT ingresada es inválida.");
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error("Tu cuenta de OpenAI se ha quedado sin saldo.");
      }
      throw new Error("Error de conexión con OpenAI.");
    }
  }
};

const registrarConsumoIA = async (fechaHoy) => {
  try {
    await db.query(`
      UPDATE ia_configuracion 
      SET consultas_hoy = CASE WHEN fecha_uso = $1::date THEN consultas_hoy + 1 ELSE 1 END,
          fecha_uso = $1::date
      WHERE id = 1
    `, [fechaHoy]);
  } catch (error) {
    console.error("Error al registrar consumo IA:", error);
  }
};

// =========================================================================
// 1. AUTO-MIGRACIÓN AISLADA
// =========================================================================
exports.inicializarTablaIA = async () => {
  try {
    // 👇 Esquema completo y actualizado para INSTALACIONES NUEVAS (marcas blancas que
    // aún no tienen esta tabla). Ya incluye Claude y los 3 candados de habilitación
    // desde el origen, para que una sucursal nueva no dependa de los ALTER de abajo.
    await db.query(`
      CREATE TABLE IF NOT EXISTS ia_configuracion (
        id SERIAL PRIMARY KEY,
        ultima_imagen_ia TIMESTAMP,
        modulo_activo BOOLEAN DEFAULT true,
        tier_premium BOOLEAN DEFAULT false,
        proveedor_activo VARCHAR(20) DEFAULT 'gemini',
        api_key_gemini TEXT DEFAULT NULL,
        api_key_openai TEXT DEFAULT NULL,
        api_key_claude TEXT DEFAULT NULL,
        gemini_habilitado BOOLEAN DEFAULT true,
        openai_habilitado BOOLEAN DEFAULT false,
        claude_habilitado BOOLEAN DEFAULT false,
        imagen_proveedor VARCHAR(20) DEFAULT 'gemini',
        contexto_negocio TEXT DEFAULT NULL,
        consultas_hoy INTEGER DEFAULT 0,
        fecha_uso DATE DEFAULT CURRENT_DATE
      );
    `);
    
    await db.query(`INSERT INTO ia_configuracion (id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM ia_configuracion WHERE id = 1);`);

    // Inyección segura de columnas por si venimos de versiones anteriores
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS proveedor_activo VARCHAR(20) DEFAULT 'gemini';`);
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS api_key_gemini TEXT DEFAULT NULL;`);
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS api_key_openai TEXT DEFAULT NULL;`);
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS consultas_hoy INTEGER DEFAULT 0;`);
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS fecha_uso DATE DEFAULT CURRENT_DATE;`);

    // 👇 NUEVO: Soporte Multi-Proveedor (Claude) + Doble Candado de habilitación.
    // "gemini_habilitado" nace en TRUE para no romper instalaciones existentes
    // (hoy todas operan con Gemini por default). OpenAI y Claude nacen en FALSE
    // hasta que el Admin Global decida activarlos manualmente en Ajustes de IA.
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS api_key_claude TEXT DEFAULT NULL;`);
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS gemini_habilitado BOOLEAN DEFAULT true;`);
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS openai_habilitado BOOLEAN DEFAULT false;`);
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS claude_habilitado BOOLEAN DEFAULT false;`);

    // 👇 NUEVO: Selector de proveedor de IMÁGENES ('gemini' | 'openai' | 'ambos' | 'ninguno').
    // Nace en 'gemini' por default para que las marcas existentes obtengan de inmediato
    // una alternativa GRATUITA a DALL-E sin que el Admin tenga que configurar nada.
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS imagen_proveedor VARCHAR(20) DEFAULT 'gemini';`);

    // 👇 NUEVO: Contexto del negocio (descrito libremente por el dueño) para que la IA
    // entienda estacionalidad, público objetivo y particularidades antes de analizar.
    await db.query(`ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS contexto_negocio TEXT DEFAULT NULL;`);

    // 👇 NUEVO: Historial de chat con reinicio diario. Una SOLA fila por usuario+contexto
    // (UNIQUE), que se sobreescribe cada día vía UPSERT en guardarHistorialChat(). Así
    // la tabla nunca crece sin control y el historial se "reinicia" solo al cambiar de
    // fecha, sin necesidad de ningún cron de limpieza.
    await db.query(`
      CREATE TABLE IF NOT EXISTS ia_conversaciones (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        contexto VARCHAR(30) NOT NULL,
        fecha DATE DEFAULT CURRENT_DATE,
        mensajes JSONB DEFAULT '[]'::jsonb,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, contexto)
      );
    `);
    
    console.log(`✅ Módulo IA inicializado con candados dinámicos y Multi-Llave (Gemini/OpenAI/Claude).`);
  } catch (error) {
    console.error('🚨 Error al inicializar tabla del módulo IA:', error);
  }
};

const obtenerConfigIA = async () => {
  const confRes = await db.query('SELECT * FROM ia_configuracion WHERE id = 1');
  if (confRes.rows.length === 0) throw new Error('Configuración de IA no encontrada.');
  if (!confRes.rows[0].modulo_activo) throw new Error('El módulo de IA está desactivado temporalmente por el Administrador.');
  return confRes.rows[0];
};

// =========================================================================
// 2. ENDPOINTS DE ADMINISTRACIÓN DE IA
// =========================================================================
exports.obtenerConfiguracionIA = async (req, res) => {
  try {
    const config = await obtenerConfigIA();
    // Enmascaramos las llaves por seguridad antes de enviarlas al front
    const maskKey = (key) => key ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : '';
    
    res.json({
      success: true,
      modulo_activo: config.modulo_activo,
      tier_premium: config.tier_premium,
      proveedor_activo: config.proveedor_activo,
      api_key_gemini: maskKey(config.api_key_gemini),
      api_key_openai: maskKey(config.api_key_openai),
      api_key_claude: maskKey(config.api_key_claude),
      gemini_habilitado: config.gemini_habilitado,
      openai_habilitado: config.openai_habilitado,
      claude_habilitado: config.claude_habilitado,
      imagen_proveedor: config.imagen_proveedor,
      contexto_negocio: config.contexto_negocio || '',
      consultas_hoy: config.consultas_hoy,
      fecha_uso: config.fecha_uso
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la configuración de IA.' });
  }
};

exports.actualizarConfiguracionIA = async (req, res) => {
  const {
    modulo_activo, tier_premium, proveedor_activo,
    api_key_gemini, api_key_openai, api_key_claude,
    gemini_habilitado, openai_habilitado, claude_habilitado,
    imagen_proveedor, contexto_negocio
  } = req.body;
  try {
    const geminiParam = (api_key_gemini && !api_key_gemini.includes('...')) ? api_key_gemini.trim() : null;
    const openaiParam = (api_key_openai && !api_key_openai.includes('...')) ? api_key_openai.trim() : null;
    const claudeParam = (api_key_claude && !api_key_claude.includes('...')) ? api_key_claude.trim() : null;

    // 👇 NUEVO CANDADO: no se puede HABILITAR un proveedor si no hay ninguna llave
    // disponible para él (ni la que se manda ahora, ni la que ya existía en BD).
    // Esto blinda el backend por si el frontend llegara a fallar en bloquear el switch.
    const configActual = await db.query('SELECT api_key_gemini, api_key_openai, api_key_claude FROM ia_configuracion WHERE id = 1');
    const actual = configActual.rows[0] || {};

    const tieneLlaveGemini = !!(geminiParam || actual.api_key_gemini);
    const tieneLlaveOpenAI = !!(openaiParam || actual.api_key_openai);
    const tieneLlaveClaude = !!(claudeParam || actual.api_key_claude);

    if (gemini_habilitado && !tieneLlaveGemini) {
      return res.status(400).json({ error: 'No puedes habilitar Gemini sin antes guardar su llave API.' });
    }
    if (openai_habilitado && !tieneLlaveOpenAI) {
      return res.status(400).json({ error: 'No puedes habilitar OpenAI/ChatGPT sin antes guardar su llave API.' });
    }
    if (claude_habilitado && !tieneLlaveClaude) {
      return res.status(400).json({ error: 'No puedes habilitar Claude sin antes guardar su llave API.' });
    }

    await db.query(`
      UPDATE ia_configuracion SET 
        modulo_activo = $1, 
        tier_premium = $2, 
        proveedor_activo = $3,
        api_key_gemini = COALESCE($4, api_key_gemini),
        api_key_openai = COALESCE($5, api_key_openai),
        api_key_claude = COALESCE($6, api_key_claude),
        gemini_habilitado = $7,
        openai_habilitado = $8,
        claude_habilitado = $9,
        imagen_proveedor = $10,
        contexto_negocio = $11
      WHERE id = 1
    `, [modulo_activo, tier_premium, proveedor_activo, geminiParam, openaiParam, claudeParam, gemini_habilitado, openai_habilitado, claude_habilitado, imagen_proveedor, contexto_negocio || null]);

    res.json({ success: true, mensaje: 'Configuración de IA actualizada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la configuración de IA.' });
  }
};

// =========================================================================
// 3. ANALISTA FINANCIERO AVANZADO
// =========================================================================
exports.analizarVentas = async (req, res) => {
  // 👇 NUEVO: modoTiempo ('semana'|'mes'|'año'|'rango'), fechaReferencia (para elegir
  // "qué" semana/mes/año ver) y rangoInicio/rangoFin (solo si modoTiempo='rango').
  const { prompt, proveedor, modoTiempo, fechaReferencia, rangoInicio, rangoFin } = req.body;
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido.' });

  try {
    const configIA = await obtenerConfigIA();

    let rangos;
    try {
      rangos = calcularRangosTiempo(modoTiempo || 'mes', fechaReferencia, rangoInicio, rangoFin);
    } catch (errFechas) {
      return res.status(400).json({ error: errFechas.message });
    }

    let mermasTotal = 0, listaMermas = [], platillosVendidos = [];
    let primerDiaVenta = 'Desconocido', ventasPorDiaStr = 'Sin datos', topClientes = [];
    let tendenciaMensualStr = 'Sin datos suficientes';
    let productosSinVenta = [];
    let insumosStockBajo = [];
    let insumosMayorGasto = [];
    let mermasPorTipoOrigen = [];
    let gastosTotal = 0;

    // 👇 NUEVO: Resúmenes de ingresos/pedidos para CADA periodo del comparativo
    const resumenActual = await obtenerResumenPeriodo(rangos.actual.inicio, rangos.actual.fin);
    const resumenAnterior = await obtenerResumenPeriodo(rangos.anterior.inicio, rangos.anterior.fin);
    const resumenAnioPasado = await obtenerResumenPeriodo(rangos.anioPasado.inicio, rangos.anioPasado.fin);
    const resumenMesPasado = rangos.mesPasado ? await obtenerResumenPeriodo(rangos.mesPasado.inicio, rangos.mesPasado.fin) : null;

    const ingresosB2C = resumenActual.ingresos;
    const pedidosB2C = resumenActual.pedidos;
    const pedidosCancelados = resumenActual.cancelados;
    const dineroCancelado = resumenActual.dineroCancelado;

    try {
      const gastosRes = await db.query(`SELECT COALESCE(SUM(total_pago), 0) as total FROM gastos_proveedores WHERE estado IN ('Pagado', 'Aprobado') AND fecha_compra::date BETWEEN $1 AND $2`, [rangos.actual.inicio, rangos.actual.fin]);
      gastosTotal += Number(gastosRes.rows[0].total);
      const comprasRes = await db.query(`SELECT COALESCE(SUM(costo_total), 0) as total FROM compras_insumos WHERE fecha_compra::date BETWEEN $1 AND $2`, [rangos.actual.inicio, rangos.actual.fin]);
      gastosTotal += Number(comprasRes.rows[0].total);
    } catch(e) {}

    try {
      const mermasRes = await db.query(`SELECT nombre_item, SUM(costo_perdido) as perdida, SUM(cantidad) as cantidad FROM reporte_mermas WHERE fecha_creacion::date BETWEEN $1 AND $2 GROUP BY nombre_item ORDER BY perdida DESC LIMIT 5`, [rangos.actual.inicio, rangos.actual.fin]);
      mermasTotal = mermasRes.rows.reduce((acc, curr) => acc + Number(curr.perdida), 0);
      listaMermas = mermasRes.rows;
    } catch(e) {}

    try {
      const platillosRes = await db.query(`SELECT obj->>'nombre' as platillo, SUM(CAST(obj->>'cantidad' AS INTEGER)) as cantidad FROM pedidos p, jsonb_array_elements(p.carrito) obj WHERE p.estado_preparacion != 'Cancelado' AND p.fecha_creacion::date BETWEEN $1 AND $2 GROUP BY platillo ORDER BY cantidad DESC LIMIT 10`, [rangos.actual.inicio, rangos.actual.fin]);
      platillosVendidos = platillosRes.rows;
    } catch(e) {}

    try {
      const histRes = await db.query(`SELECT MIN(fecha_creacion) as primer_dia FROM pedidos WHERE estado_preparacion != 'Cancelado'`);
      if (histRes.rows.length > 0 && histRes.rows[0].primer_dia) primerDiaVenta = new Date(histRes.rows[0].primer_dia).toLocaleDateString('es-MX');
      
      const diasRes = await db.query(`
        SELECT EXTRACT(ISODOW FROM fecha_creacion) as dia_numero, COUNT(id) as pedidos, COALESCE(SUM(total), 0) as ingresos
        FROM pedidos WHERE estado_preparacion != 'Cancelado' GROUP BY dia_numero ORDER BY ingresos ASC
      `);
      const nombresDias = { 1:'Lunes', 2:'Martes', 3:'Miércoles', 4:'Jueves', 5:'Viernes', 6:'Sábado', 7:'Domingo' };
      const diasFormateados = diasRes.rows.map(d => `${nombresDias[d.dia_numero]}: $${Number(d.ingresos).toFixed(2)} (${d.pedidos} ordenes)`);
      if (diasFormateados.length > 0) ventasPorDiaStr = diasFormateados.join(' | ');
    } catch(e) {}

    try {
      const crmRes = await db.query(`
        SELECT c.nombre, c.puntos, COUNT(p.id) as visitas_periodo 
        FROM clientes c 
        LEFT JOIN pedidos p ON c.id = p.cliente_id AND p.fecha_creacion::date BETWEEN $1 AND $2
        GROUP BY c.id, c.nombre, c.puntos 
        ORDER BY visitas_periodo DESC, c.puntos DESC LIMIT 5
      `, [rangos.actual.inicio, rangos.actual.fin]);
      topClientes = crmRes.rows;
    } catch(e) {}

    try {
      const tendenciaRes = await db.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha_creacion), 'TMMonth YYYY') as mes,
               DATE_TRUNC('month', fecha_creacion) as mes_fecha,
               COUNT(CASE WHEN estado_preparacion != 'Cancelado' THEN 1 END) as pedidos,
               COALESCE(SUM(CASE WHEN estado_preparacion != 'Cancelado' THEN total ELSE 0 END), 0) as ingresos
        FROM pedidos
        WHERE fecha_creacion >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha_creacion)
        ORDER BY mes_fecha ASC
      `);
      if (tendenciaRes.rows.length > 0) {
        tendenciaMensualStr = tendenciaRes.rows.map(m => `${m.mes.trim()}: $${Number(m.ingresos).toFixed(2)} (${m.pedidos} pedidos)`).join(' | ');
      }
    } catch(e) {}

    try {
      const sinVentaRes = await db.query(`
        SELECT p.nombre, p.categoria, p.precio_base
        FROM productos p
        WHERE p.disponible = true
        AND NOT EXISTS (
          SELECT 1 FROM pedidos pe, jsonb_array_elements(pe.carrito) obj
          WHERE pe.estado_preparacion != 'Cancelado'
          AND pe.fecha_creacion::date BETWEEN $1 AND $2
          AND LOWER(TRIM(obj->>'nombre')) = LOWER(TRIM(p.nombre))
        )
        ORDER BY p.nombre ASC LIMIT 15
      `, [rangos.actual.inicio, rangos.actual.fin]);
      productosSinVenta = sinVentaRes.rows;
    } catch(e) {}

    try {
      const stockRes = await db.query(`SELECT nombre, unidad_medida, stock_actual FROM insumos WHERE es_empaque = false ORDER BY stock_actual ASC LIMIT 10`);
      insumosStockBajo = stockRes.rows;
    } catch(e) {}

    try {
      const gastoInsumoRes = await db.query(`
        SELECT i.nombre, SUM(ci.costo_total) as gasto_total, SUM(ci.paquetes) as paquetes_comprados
        FROM compras_insumos ci JOIN insumos i ON ci.insumo_id = i.id
        WHERE ci.fecha_compra::date BETWEEN $1 AND $2
        GROUP BY i.nombre ORDER BY gasto_total DESC LIMIT 10
      `, [rangos.actual.inicio, rangos.actual.fin]);
      insumosMayorGasto = gastoInsumoRes.rows;
    } catch(e) {}

    try {
      const mermasTipoRes = await db.query(`
        SELECT tipo, origen, COUNT(*) as eventos, SUM(costo_perdido) as perdida_total
        FROM reporte_mermas
        WHERE fecha_creacion::date BETWEEN $1 AND $2
        GROUP BY tipo, origen ORDER BY perdida_total DESC
      `, [rangos.actual.inicio, rangos.actual.fin]);
      mermasPorTipoOrigen = mermasTipoRes.rows;
    } catch(e) {}

    const margenBruto = ingresosB2C - gastosTotal - mermasTotal;

    // 👇 NUEVO: Construcción del bloque de comparativo temporal según el modo elegido
    let comparativoStr = `Periodo actual (${rangos.actual.label}): $${resumenActual.ingresos.toFixed(2)} (${resumenActual.pedidos} pedidos)`;
    comparativoStr += ` || Periodo anterior comparable (${rangos.anterior.label}): $${resumenAnterior.ingresos.toFixed(2)} (${resumenAnterior.pedidos} pedidos)`;
    const varAnterior = calcularVariacionPct(resumenActual.ingresos, resumenAnterior.ingresos);
    if (varAnterior !== null) comparativoStr += ` [Variación: ${varAnterior > 0 ? '+' : ''}${varAnterior}%]`;

    comparativoStr += ` || Mismo periodo, año pasado (${rangos.anioPasado.label}): $${resumenAnioPasado.ingresos.toFixed(2)} (${resumenAnioPasado.pedidos} pedidos)`;
    const varAnioPasado = calcularVariacionPct(resumenActual.ingresos, resumenAnioPasado.ingresos);
    if (varAnioPasado !== null) comparativoStr += ` [Variación: ${varAnioPasado > 0 ? '+' : ''}${varAnioPasado}%]`;

    if (resumenMesPasado) {
      comparativoStr += ` || Misma semana, mes pasado (${rangos.mesPasado.label}): $${resumenMesPasado.ingresos.toFixed(2)} (${resumenMesPasado.pedidos} pedidos)`;
    }

    const contextoNegocio = configIA.contexto_negocio || 'El dueño aún no ha configurado un contexto de negocio en Ajustes de IA.';

    const systemPrompt = `
      Eres AdminIA, el Director Financiero, Operativo (CFO/COO) y Gerente de CRM de este restaurante.
      Analiza la salud del negocio basado ÚNICA Y EXCLUSIVAMENTE en estos DATOS REALES:

      🏪 CONTEXTO DEL NEGOCIO (descrito por el dueño, úsalo para entender el giro, público y temporadas especiales antes de recomendar):
      ${contextoNegocio}

      📊 COMPARATIVO TEMPORAL (Modo seleccionado: ${modoTiempo || 'mes'}):
      ${comparativoStr}
      ⚠️ Nota: las comparaciones de "mismo periodo" son aproximadas por calendario (pueden variar ±3 días).

      📅 DATOS HISTÓRICOS GLOBALES:
      - Primer día de ventas: ${primerDiaVenta}
      - Rendimiento por DÍA DE LA SEMANA (histórico completo): ${ventasPorDiaStr}
      - TENDENCIA MENSUAL (Últimos 6 meses): ${tendenciaMensualStr}

      💰 REPORTE FINANCIERO DEL PERIODO ACTUAL (${rangos.actual.label}):
      - Ventas Exitosas: $${ingresosB2C.toFixed(2)} (${pedidosB2C} pedidos).
      - Pedidos Cancelados: ${pedidosCancelados} ($${dineroCancelado.toFixed(2)} perdidos).
      - Gastos de Operación: $${gastosTotal.toFixed(2)}.
      - Mermas: $${mermasTotal.toFixed(2)}.
      - Margen Bruto Estimado: $${margenBruto.toFixed(2)}.

      🍔 PRODUCTOS Y 👥 CLIENTES (del periodo actual):
      - Top Ventas: ${JSON.stringify(platillosVendidos)}
      - Productos SIN NINGUNA VENTA en este periodo: ${JSON.stringify(productosSinVenta)}
      - Mejores Clientes (CRM): ${JSON.stringify(topClientes)}

      🗑️ MERMAS Y DESPERDICIO:
      - Top 5 items con más pérdida: ${JSON.stringify(listaMermas)}
      - Desglose por Tipo y Origen: ${JSON.stringify(mermasPorTipoOrigen)}

      📦 INVENTARIO E INSUMOS:
      - Insumos en RIESGO DE DESABASTO (stock actual más bajo): ${JSON.stringify(insumosStockBajo)}
      - Insumos con MAYOR GASTO en el periodo: ${JSON.stringify(insumosMayorGasto)}

      REGLAS INQUEBRANTABLES:
      1. SIEMPRE responde en Español. La moneda es el Peso ($).
      2. Cíñete a los datos de arriba. Si las ventas dicen $0.00, dile al usuario la verdad.
      3. Si te preguntan "qué día descansar", analiza el "Rendimiento por DÍA DE LA SEMANA".
      4. Si te preguntan por tendencias, meses buenos/malos o crecimiento, usa el "COMPARATIVO TEMPORAL" y la "TENDENCIA MENSUAL".
      5. REGLA DE ESTACIONALIDAD: Antes de recomendar ELIMINAR un producto del menú por bajas ventas en el periodo actual, compara contra "Mismo periodo, año pasado" dentro del COMPARATIVO TEMPORAL. Si vendió bien en fechas similares el año pasado, NUNCA recomiendes eliminarlo: explica que es probablemente estacional y sugiere una promoción para cuando se acerque su temporada alta, conectada al CONTEXTO DEL NEGOCIO. Si tampoco vendió el año pasado, ahí sí puedes sugerir retirarlo con más confianza.
      6. REGLA DE TENDENCIA: Usa el COMPARATIVO TEMPORAL para hablar de crecimiento o caída real, no solo del periodo actual aislado. Si la variación es negativa, revisa si coincide con una caída similar el año pasado (podría ser temporada baja normal).
      7. REGLA DE MARKETING PROACTIVO: Siempre que detectes una oportunidad clara, cierra tu respuesta con 1-2 sugerencias concretas de marketing conectadas al CONTEXTO DEL NEGOCIO. Sé específico, no genérico.
      8. PROHIBIDO usar formato Markdown (nada de **negritas**, #, backticks). Texto plano, guion simple (-) para listas.
      9. JAMÁS muestres formato JSON al usuario. Usa viñetas limpias.
    `;

    // 👇 NUEVO: Datos CRUDOS listos para graficar en el frontend con Recharts.
    // IMPORTANTE: estos números NO pasan por la IA, vienen directo de las mismas
    // variables ya calculadas arriba desde Postgres — así la gráfica SIEMPRE
    // coincide exactamente con lo que dice el texto de la respuesta.
    const graficoData = {
      comparativoTemporal: {
        titulo: `Ingresos — Comparativo (${modoTiempo || 'mes'})`,
        categorias: [
          'Actual',
          'Anterior',
          ...(resumenMesPasado ? ['Mes pasado'] : []),
          'Año pasado'
        ],
        valores: [
          Number(resumenActual.ingresos.toFixed(2)),
          Number(resumenAnterior.ingresos.toFixed(2)),
          ...(resumenMesPasado ? [Number(resumenMesPasado.ingresos.toFixed(2))] : []),
          Number(resumenAnioPasado.ingresos.toFixed(2))
        ]
      },
      topPlatillos: {
        titulo: 'Top Platillos Vendidos (periodo actual)',
        categorias: platillosVendidos.slice(0, 7).map(p => p.platillo),
        valores: platillosVendidos.slice(0, 7).map(p => Number(p.cantidad))
      },
      mermasPorTipo: {
        titulo: 'Pérdida por Tipo de Merma',
        categorias: mermasPorTipoOrigen.map(m => `${m.tipo} (${m.origen})`),
        valores: mermasPorTipoOrigen.map(m => Number(Number(m.perdida_total).toFixed(2)))
      },
      insumosMayorGasto: {
        titulo: 'Insumos con Mayor Gasto (periodo actual)',
        categorias: insumosMayorGasto.slice(0, 7).map(i => i.nombre),
        valores: insumosMayorGasto.slice(0, 7).map(i => Number(Number(i.gasto_total).toFixed(2)))
      }
    };

    const cacheKeyStr = `finanzas_${modoTiempo || 'mes'}_${rangos.actual.inicio}_${proveedor || 'gemini'}_${prompt.substring(0, 30)}`;
    const respuestaText = await generarRespuestaTexto(systemPrompt, prompt, 0.2, 3, cacheKeyStr, configIA, proveedor);
    
    res.json({ success: true, respuesta: respuestaText, rangoUsado: rangos.actual, graficoData });
  } catch (error) {
    const msg = error.message.includes('límite') || error.message.includes('llave') || error.message.includes('desactivado') || error.message.includes('Premium') || error.message.includes('saldo')
      ? error.message : 'Error interno al procesar el análisis financiero.';
    res.status(500).json({ error: msg });
  }
};

// =========================================================================
// 4. GESTOR DE TALENTO (RRHH)
// =========================================================================
exports.analizarEmpleados = async (req, res) => {
  const { prompt, proveedor, modoTiempo, fechaReferencia, rangoInicio, rangoFin } = req.body;
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido.' });

  try {
    const configIA = await obtenerConfigIA();

    let rangos;
    try {
      rangos = calcularRangosTiempo(modoTiempo || 'mes', fechaReferencia, rangoInicio, rangoFin);
    } catch (errFechas) {
      return res.status(400).json({ error: errFechas.message });
    }

    let listaAsistencias = [], listaCocina = [], listaReparto = [], ultimaNomina = 'No hay nóminas registradas';
    let finanzasPersonal = [];

    try {
      const asistenciasRes = await db.query(`SELECT u.nombre, u.rol, COUNT(a.id) as dias_asistidos, COALESCE(SUM(ROUND((EXTRACT(EPOCH FROM (COALESCE(a.hora_salida, CURRENT_TIMESTAMP) - a.hora_entrada))/3600)::numeric, 2)), 0) AS horas FROM usuarios u LEFT JOIN registro_asistencias a ON u.id = a.usuario_id AND a.fecha::date BETWEEN $1 AND $2 WHERE u.rol != 'admin' GROUP BY u.id, u.nombre, u.rol ORDER BY horas DESC`, [rangos.actual.inicio, rangos.actual.fin]);
      listaAsistencias = asistenciasRes.rows;
    } catch(e) {}

    try {
      const cocinaRes = await db.query(`SELECT u.nombre as chef, COUNT(p.id) as ordenes, ROUND(AVG(EXTRACT(EPOCH FROM (p.tiempo_listo - p.tiempo_inicio_preparacion))/60)::numeric, 1) AS mins_promedio FROM pedidos p JOIN usuarios u ON p.chef_id = u.id WHERE p.tiempo_listo IS NOT NULL AND p.fecha_creacion::date BETWEEN $1 AND $2 GROUP BY u.nombre ORDER BY mins_promedio ASC`, [rangos.actual.inicio, rangos.actual.fin]);
      listaCocina = cocinaRes.rows;
    } catch(e) {}

    try {
      const repartidoresRes = await db.query(`SELECT u.nombre as repartidor, COUNT(p.id) as entregas, ROUND(AVG(EXTRACT(EPOCH FROM (p.tiempo_entregado - p.tiempo_salida_reparto))/60)::numeric, 1) AS mins_entrega_promedio FROM pedidos p JOIN usuarios u ON p.repartidor_id = u.id WHERE p.tiempo_entregado IS NOT NULL AND p.fecha_creacion::date BETWEEN $1 AND $2 GROUP BY u.nombre ORDER BY mins_entrega_promedio ASC`, [rangos.actual.inicio, rangos.actual.fin]);
      listaReparto = repartidoresRes.rows;
    } catch(e) {}

    try {
      const nominaRes = await db.query(`SELECT fecha_creacion FROM historico_nominas ORDER BY fecha_creacion DESC LIMIT 1`);
      if (nominaRes.rows.length > 0) ultimaNomina = new Date(nominaRes.rows[0].fecha_creacion).toLocaleDateString('es-MX');
    } catch(e) {}

    try {
      const empleadosRes = await db.query(`SELECT id, nombre, rol, prestaciones FROM usuarios WHERE rol != 'admin'`);
      finanzasPersonal = empleadosRes.rows.map(u => {
        let prest = {};
        try {
          prest = typeof u.prestaciones === 'string' ? JSON.parse(u.prestaciones || '{}') : (u.prestaciones || {});
        } catch(e) { prest = {}; }
        const prestamosActivos = Array.isArray(prest.prestamos) ? prest.prestamos.filter(p => p.activo) : [];
        const deudaTotal = prestamosActivos.reduce((acc, p) => acc + Number(p.saldo_restante || 0), 0);
        return {
          nombre: u.nombre,
          rol: u.rol,
          deuda_prestamos: Number(deudaTotal.toFixed(2)),
          horas_extra_acumuladas: Number(prest.horas_extras_acumuladas || 0)
        };
      }).filter(f => f.deuda_prestamos > 0 || f.horas_extra_acumuladas > 0);
    } catch(e) {}

    const contextoNegocio = configIA.contexto_negocio || 'El dueño aún no ha configurado un contexto de negocio en Ajustes de IA.';

    const systemPrompt = `
      Eres AdminIA, el Director de Recursos Humanos (HR) de este restaurante.
      Analiza al personal basado ÚNICA Y EXCLUSIVAMENTE en estos DATOS REALES del periodo: ${rangos.actual.label}

      🏪 CONTEXTO DEL NEGOCIO: ${contextoNegocio}

      👨‍🍳 RENDIMIENTO EN COCINA: ${JSON.stringify(listaCocina)}
      🛵 RENDIMIENTO EN REPARTO: ${JSON.stringify(listaReparto)}
      📅 ASISTENCIAS Y HORAS TRABAJADAS: ${JSON.stringify(listaAsistencias)}
      💵 Última nómina procesada: ${ultimaNomina}
      💰 PRÉSTAMOS ACTIVOS Y HORAS EXTRA PENDIENTES POR EMPLEADO: ${JSON.stringify(finanzasPersonal)}

      REGLAS INQUEBRANTABLES:
      1. SIEMPRE responde en Español y usa Pesos ($).
      2. NUNCA inventes información.
      3. Habla con autoridad de liderazgo.
      4. Si te preguntan por comparar contra otro periodo, indica que puede cambiar el selector de tiempo del Chat; hoy solo tienes datos de "${rangos.actual.label}".
      5. PROHIBIDO usar formato Markdown (nada de **negritas**, #, backticks). Texto plano, guion simple (-) para listas.
      6. JAMÁS muestres formato JSON.
    `;

    const cacheKeyStr = `rrhh_${modoTiempo || 'mes'}_${rangos.actual.inicio}_${proveedor || 'gemini'}_${prompt.substring(0, 30)}`;
    const respuestaText = await generarRespuestaTexto(systemPrompt, prompt, 0.3, 3, cacheKeyStr, configIA, proveedor);
    
    res.json({ success: true, respuesta: respuestaText, rangoUsado: rangos.actual });
  } catch (error) {
    const msg = error.message.includes('límite') || error.message.includes('llave') || error.message.includes('desactivado') || error.message.includes('Premium') || error.message.includes('saldo')
      ? error.message : 'Error al procesar el análisis de empleados.';
    res.status(500).json({ error: msg });
  }
};

// =========================================================================
// 5. ASISTENTE CREATIVO (Chat Libre)
// =========================================================================
exports.chatLibre = async (req, res) => {
  const { prompt, proveedor } = req.body; // 👇 NUEVO: proveedor elegido por el usuario
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido.' });

  try {
    const configIA = await obtenerConfigIA();
    const systemPrompt = "Eres AdminIA, el asistente creativo y copiloto de negocios exclusivo de este sistema POS. REGLAS INQUEBRANTABLES: 1. SIEMPRE responde en Español. 2. Tu moneda base es el Peso Mexicano/Latino ($), NUNCA dólares ni USD. 3. Sé amable, conciso, proactivo y da consejos de marketing o liderazgo relacionados con restaurantes. 4. PROHIBIDO usar formato Markdown (nada de **negritas**, #, backticks); escribe en texto plano usando guion simple (-) para listas.";
    
    const respuestaText = await generarRespuestaTexto(systemPrompt, prompt, 0.7, 3, null, configIA, proveedor);
    res.json({ success: true, respuesta: respuestaText });
  } catch (error) {
    const msg = error.message.includes('límite') || error.message.includes('llave') || error.message.includes('desactivado') || error.message.includes('Premium') || error.message.includes('saldo')
      ? error.message : 'Error al procesar la respuesta creativa.';
    res.status(500).json({ error: msg });
  }
};

// =========================================================================
// 6. GENERADOR DE IMÁGENES (Gemini "Nano Banana" GRATIS + DALL-E 3 Premium)
// =========================================================================

// 👇 NUEVO: Genera una imagen con el modelo de imagen de Gemini (familia "Nano Banana").
// A diferencia de la generación de texto, aquí la respuesta trae los bytes de la imagen
// codificados en base64 dentro de "inlineData", no texto plano. Devolvemos un Data URI
// listo para usarse directo en un <img src="..."> del frontend, sin requerir Cloudinary
// ni pasos extra de subida — así mantenemos el mismo contrato de respuesta { url }.
const generarImagenGemini = async (promptImagen, apiKey) => {
  if (!apiKey) throw new Error("No hay llave de Gemini configurada para generar imágenes. Agrégala en Ajustes de IA.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  const result = await model.generateContent(
    `Un diseño publicitario o fotografía profesional de ultra alta calidad para un restaurante: ${promptImagen}`
  );

  const parts = result.response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData && p.inlineData.data);

  if (!imagePart) {
    throw new Error("Gemini no devolvió ninguna imagen. Intenta reformular tu descripción.");
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
};

// 👇 NUEVO: Genera una imagen con DALL-E 3 (OpenAI). Se aisló la lógica que antes
// vivía directo en "exports.generarImagen", sin cambiar su comportamiento interno.
const generarImagenDallE = async (promptImagen, apiKey) => {
  if (!apiKey) throw new Error("No hay llave de ChatGPT configurada para generar imágenes. Agrégala en Ajustes de IA.");
  const openai = new OpenAI({ apiKey });

  const imageResponse = await openai.images.generate({
    model: "dall-e-3",
    prompt: `Un diseño publicitario o fotografía profesional de ultra alta calidad para un restaurante: ${promptImagen}`,
    n: 1,
    size: "1024x1024",
  });

  return imageResponse.data[0].url;
};

exports.generarImagen = async (req, res) => {
  // 👇 NUEVO: "proveedor" ahora lo elige el usuario en el Studio Mágico (Gemini o DALL-E),
  // no se usa más "configIA.imagen_proveedor" como la opción fija a ejecutar. Ese campo
  // en la BD ahora solo define QUÉ proveedores de imagen están disponibles (igual que
  // gemini_habilitado/openai_habilitado para texto), no cuál se usa.
  const { prompt, proveedor } = req.body;
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido para generar la imagen.' });

  try {
    const configIA = await obtenerConfigIA();
    const imagenHabilitados = configIA.imagen_proveedor || 'gemini'; // 'gemini' | 'openai' | 'ambos' | 'ninguno'
    const imagenProveedor = proveedor || 'gemini';

    if (imagenHabilitados === 'ninguno') {
      return res.status(403).json({ error: 'La generación de imágenes está deshabilitada por el Administrador Global.' });
    }
    // 👇 Validamos que el proveedor elegido por el usuario esté realmente disponible
    // según lo que el Admin configuró (gemini/openai/ambos).
    if (imagenHabilitados !== 'ambos' && imagenHabilitados !== imagenProveedor) {
      return res.status(403).json({ error: `El proveedor "${imagenProveedor}" que elegiste no está disponible. El Administrador Global debe habilitarlo primero.` });
    }

    const hoy = obtenerFechaHoyLocal();
    // 👇 El límite de "1 imagen por día" aplica SOLO a DALL-E (tiene costo real por uso).
    // Gemini es gratuito, así que no consume ni respeta este candado interno.
    const limiteDallEAlcanzado = configIA.ultima_imagen_ia
      ? new Date(configIA.ultima_imagen_ia).toLocaleDateString('en-CA') === hoy
      : false;

    let urlFinal = null;
    let proveedorUsado = null;

    // 👇 Ya NO es una cascada automática: se ejecuta directamente el proveedor que
    // el usuario eligió en el Studio Mágico (Gemini o DALL-E), sin intentar el otro
    // como respaldo silencioso. Si falla, se le informa al usuario para que decida.
    if (imagenProveedor === 'gemini') {
      const geminiKey = (configIA.api_key_gemini || process.env.GEMINI_API_KEY || '').trim();
      urlFinal = await generarImagenGemini(prompt, geminiKey);
      proveedorUsado = 'gemini';

    } else if (imagenProveedor === 'openai') {
      if (!configIA.tier_premium) {
        throw new Error('La generación de imágenes con DALL-E 3 requiere activar el nivel Premium en los Ajustes de IA.');
      }
      if (limiteDallEAlcanzado) {
        throw new Error('Límite alcanzado: Solo puedes generar 1 imagen con DALL-E por día.');
      }
      const openaiKey = (configIA.api_key_openai || process.env.OPENAI_API_KEY || '').trim();
      urlFinal = await generarImagenDallE(prompt, openaiKey);
      proveedorUsado = 'openai';
      await db.query('UPDATE ia_configuracion SET ultima_imagen_ia = CURRENT_TIMESTAMP WHERE id = 1');
    }

    if (!urlFinal) {
      throw new Error('No se pudo generar la imagen con ningún proveedor disponible.');
    }

    res.json({
      success: true,
      mensaje: `Imagen generada con éxito usando ${proveedorUsado === 'gemini' ? 'Gemini (gratis)' : 'DALL-E 3'}.`,
      proveedor: proveedorUsado,
      url: urlFinal
    });

    } catch (error) {
      console.error('🚨 Error real al generar imagen:', error);

      // 👇 NUEVO: Diferenciamos "sin facturación vinculada" (limit: 0) de un
      // simple "ya usaste tu cuota gratuita de hoy" (limit > 0 pero agotado).
      const esCuotaCero = error.status === 429 && /limit[:\s]*0\b/i.test(error.message || '');
      const esCuotaAgotada = error.status === 429 || /quota exceeded/i.test(error.message || '') || /RESOURCE_EXHAUSTED/i.test(error.message || '');

      let msg;
      if (esCuotaCero) {
        msg = 'Tu proyecto de Google AI Studio no tiene un método de pago vinculado, por eso tu cuota de generación de imágenes con Gemini está en 0 tokens. Entra a aistudio.google.com, vincula la facturación (puedes seguir en el plan gratuito) y vuelve a intentarlo.';
      } else if (esCuotaAgotada) {
        msg = 'Alcanzaste el límite gratuito de generación de imágenes de Gemini por hoy. Intenta más tarde o usa DALL-E si tienes Premium activo.';
      } else {
        msg = (error.message.includes('Premium') || error.message.includes('llave') || error.message.includes('Límite') || error.message.includes('desactivado') || error.message.includes('saldo') || error.message.includes('deshabilitada') || error.message.includes('Gemini no devolvió'))
          ? error.message : 'Error interno al generar la imagen.';
      }

      res.status(500).json({ error: msg });
    }
};

// =========================================================================
// 7. HISTORIAL DE CHAT (Reinicio diario, sin saturar la BD)
// =========================================================================
exports.obtenerHistorialChat = async (req, res) => {
  const { usuario_id, contexto } = req.query;
  if (!usuario_id || !contexto) return res.json({ success: true, mensajes: [] });

  try {
    const hoy = obtenerFechaHoyLocal();
    const result = await db.query(
      'SELECT mensajes, fecha FROM ia_conversaciones WHERE usuario_id = $1 AND contexto = $2',
      [usuario_id, contexto]
    );

    if (result.rows.length === 0) return res.json({ success: true, mensajes: [] });

    const fila = result.rows[0];
    const fechaGuardada = new Date(fila.fecha).toLocaleDateString('en-CA');

    // 👇 Si la fila es de un día anterior, se IGNORA (reinicio diario).
    // No se borra aquí: el próximo guardado la sobreescribirá automáticamente.
    if (fechaGuardada !== hoy) {
      return res.json({ success: true, mensajes: [] });
    }

    const mensajes = typeof fila.mensajes === 'string' ? JSON.parse(fila.mensajes) : fila.mensajes;
    res.json({ success: true, mensajes: Array.isArray(mensajes) ? mensajes : [] });
  } catch (error) {
    console.error('Error al obtener historial del chat:', error);
    // 👇 Fallback silencioso: un fallo aquí NUNCA debe romper el Chat
    res.json({ success: true, mensajes: [] });
  }
};

exports.guardarHistorialChat = async (req, res) => {
  const { usuario_id, contexto, mensajes } = req.body;
  if (!usuario_id || !contexto) return res.status(400).json({ error: 'Faltan datos para guardar el historial.' });

  try {
    const hoy = obtenerFechaHoyLocal();
    // 👇 UPSERT: una sola fila por usuario+contexto. Si ya existía de otro día,
    // se SOBREESCRIBE con los mensajes de hoy (reinicio diario, sin crecer la BD).
    await db.query(`
      INSERT INTO ia_conversaciones (usuario_id, contexto, fecha, mensajes, actualizado_en)
      VALUES ($1, $2, $3::date, $4::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (usuario_id, contexto)
      DO UPDATE SET fecha = $3::date, mensajes = $4::jsonb, actualizado_en = CURRENT_TIMESTAMP
    `, [usuario_id, contexto, hoy, JSON.stringify(mensajes || [])]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error al guardar historial del chat:', error);
    res.status(500).json({ error: 'Error al guardar el historial.' });
  }
};