// BackEnd/controllers/kioscoChatIaController.js
const db = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Misma cadena de respaldo que usa iaController.js (generarRespuestaTexto):
// si el modelo principal se satura (503), el siguiente intento prueba el
// modelo de respaldo, repartiendo la carga entre dos cuotas distintas de Google.
const GEMINI_MODELS_FALLBACK = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

// =========================================================================
// 🤖 MÓDULO AISLADO: CHAT IA DEL KIOSCO (Punto 5 del roadmap WhatsApp/IA)
// -------------------------------------------------------------------------
// 100% independiente de iaController.js (panel admin con sesión) a propósito:
// este endpoint es PÚBLICO (sin login), por lo que necesita su propio
// candado anti-abuso por sesión/cliente, su propia tabla y su propio caché,
// sin arriesgar ni compartir cuota/caché con el Copiloto administrativo.
// Aislado por empresa_id desde el diseño (sin arrastrar el bug histórico
// de ia_configuracion como tabla singleton global).
// =========================================================================

const LIMITE_PREGUNTAS_DIA = 20; // Por sesión/cliente, no por negocio completo
const respuestasCacheKiosco = new Map();

exports.inicializarTablas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS kiosco_chat_ia_uso (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        identificador_sesion VARCHAR(150) NOT NULL,
        consultas_hoy INTEGER NOT NULL DEFAULT 0,
        fecha_uso DATE NOT NULL DEFAULT CURRENT_DATE,
        UNIQUE(empresa_id, identificador_sesion)
      );
    `);
    console.log('✅ Tabla de uso del Chat IA del Kiosco verificada/creada correctamente (candado anti-abuso por sesión).');
  } catch (error) {
    console.error('🚨 Error al inicializar tabla del Chat IA del Kiosco:', error);
  }
};

const verificarYRegistrarUso = async (empresaId, identificadorSesion) => {
  const hoy = new Date().toISOString().split('T')[0];

  const result = await db.query(
    `INSERT INTO kiosco_chat_ia_uso (empresa_id, identificador_sesion, consultas_hoy, fecha_uso)
     VALUES ($1, $2, 1, $3::date)
     ON CONFLICT (empresa_id, identificador_sesion) DO UPDATE SET
       consultas_hoy = CASE WHEN kiosco_chat_ia_uso.fecha_uso = $3::date THEN kiosco_chat_ia_uso.consultas_hoy + 1 ELSE 1 END,
       fecha_uso = $3::date
     RETURNING consultas_hoy, fecha_uso`,
    [empresaId, identificadorSesion, hoy]
  );

  const usoActual = result.rows[0];
  if (Number(usoActual.consultas_hoy) > LIMITE_PREGUNTAS_DIA) {
    throw new Error(`Has alcanzado el límite de ${LIMITE_PREGUNTAS_DIA} preguntas gratuitas por hoy. Vuelve mañana o pide ayuda directamente al personal.`);
  }
};

// =========================================================================
// 🆕 Datos personales del cliente identificado (puntos + últimos pedidos)
// -------------------------------------------------------------------------
// SOLO se consulta si llega cliente_id (sesión iniciada). Reutiliza el mismo
// patrón/columnas que ya usa pedidoController.obtenerPedidosCliente
// (WHERE cliente_id = $1 AND empresa_id = $2), sin tocar ese controlador.
// Fallos aquí NUNCA deben tumbar la respuesta del asistente (try/catch mudo,
// igual que el patrón ya usado en iaController.js para datos opcionales).
// =========================================================================
const obtenerDatosClienteIdentificado = async (empresaId, clienteId) => {
  let puntosCliente = null;
  let ultimosPedidos = [];

  try {
    const clienteRes = await db.query(
      'SELECT nombre, puntos FROM clientes WHERE id = $1 AND empresa_id = $2',
      [clienteId, empresaId]
    );
    if (clienteRes.rows.length > 0) {
      puntosCliente = clienteRes.rows[0].puntos;
    }
  } catch (e) { /* silencioso, no debe tumbar la respuesta */ }

  try {
    const pedidosRes = await db.query(
      `SELECT numero_pedido, estado_preparacion, total, fecha_creacion
       FROM pedidos
       WHERE cliente_id = $1 AND empresa_id = $2
       ORDER BY id DESC LIMIT 5`,
      [clienteId, empresaId]
    );
    ultimosPedidos = pedidosRes.rows;
  } catch (e) { /* silencioso */ }

  return { puntosCliente, ultimosPedidos };
};

// =========================================================================
// ENDPOINT PRINCIPAL: Preguntas sobre menú/precios/ingredientes/puntos/pedidos
// -------------------------------------------------------------------------
// El catálogo de productos/clasificaciones/extras llega YA CARGADO desde el
// frontend (el propio Kiosco.js ya los tiene en memoria) — evita consultas
// extra a la BD y mantiene el backend liviano. Los datos del cliente
// identificado (puntos, pedidos) SÍ se consultan en vivo, porque cambian
// constantemente y no deben venir del frontend sin validar.
// =========================================================================
exports.consultarMenu = async (req, res) => {
  const empresaId = req.empresa_id;
  const {
    pregunta,
    identificador_sesion,
    productos,
    clasificaciones,
    catalogoIngredientes,
    nombre_negocio,
    cliente_id // 🆕 null/undefined = invitado sin sesión
  } = req.body;

  if (!pregunta || !pregunta.trim()) {
    return res.status(400).json({ error: 'Falta la pregunta.' });
  }
  if (!identificador_sesion) {
    return res.status(400).json({ error: 'Falta el identificador de sesión.' });
  }
  if (!Array.isArray(productos)) {
    return res.status(400).json({ error: 'Falta el catálogo de productos del Kiosco.' });
  }

  try {
    await verificarYRegistrarUso(empresaId, identificador_sesion);

    // 🔒 FIX DE SEGURIDAD: el cacheKey ahora incluye identificador_sesion.
    // Antes solo era empresa+pregunta, lo cual filtraría puntos/pedidos de
    // un cliente a otro que escribiera la misma pregunta (ambos comparten
    // la misma respuesta cacheada). Al ser personalizado, cada sesión tiene
    // su propio slot de caché.
    const preguntaNormalizada = pregunta.trim().toLowerCase().substring(0, 80);
    const cacheKey = `menu_${empresaId}_${identificador_sesion}_${preguntaNormalizada}`;

    if (respuestasCacheKiosco.has(cacheKey)) {
      const cached = respuestasCacheKiosco.get(cacheKey);
      if (Date.now() - cached.timestamp < 1800000) {
        return res.json({ success: true, respuesta: cached.texto });
      }
      respuestasCacheKiosco.delete(cacheKey);
    }

    // 🔒 Resuelto por empresa_id (ya no "id = 1"), consistente con ia_configuracion multi-tenant.
    const configIARes = await db.query('SELECT api_key_gemini FROM ia_configuracion WHERE empresa_id = $1', [empresaId]);
    const apiKey = (configIARes.rows[0]?.api_key_gemini || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) throw new Error('El asistente no está disponible en este momento. Intenta más tarde.');

    // 🔧 FIX: la columna real de precio en productos es "precio_base" (ver
    // productoController.js), NO "precio". Se deja "precio" como fallback
    // por si en algún punto llega ya normalizado desde el frontend.
    const catalogoLimpio = productos.slice(0, 200).map(p => ({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio_base ?? p.precio ?? null,
      descripcion: p.descripcion || undefined
    }));
    const categoriasLimpias = (Array.isArray(clasificaciones) ? clasificaciones : []).map(c => c.nombre);

    // 🆕 Extras/ingredientes con precio — antes NUNCA se enviaban, por eso el
    // asistente no podía responder "precio del extra tocino". Mapeo con
    // fallback de nombre de campo por robustez (la tabla puede exponer
    // "precio" o "precio_extra" según el origen del dato).
    const extrasLimpios = (Array.isArray(catalogoIngredientes) ? catalogoIngredientes : [])
      .slice(0, 200)
      .map(i => ({
        nombre: i.nombre,
        precio: i.precio ?? i.precio_extra ?? i.precioExtra ?? 0,
        tipo: i.tipo || undefined
      }));

    // 🆕 Bloque de personalización — SOLO si hay sesión iniciada (cliente_id presente)
    let bloquePersonalizado = '';
    if (cliente_id) {
      const { puntosCliente, ultimosPedidos } = await obtenerDatosClienteIdentificado(empresaId, cliente_id);
      bloquePersonalizado = `
      🔐 CLIENTE IDENTIFICADO (sesión activa, SÍ puedes responder directo con estos datos reales, sin redirigir a ningún lado):
      - Puntos de fidelidad actuales: ${puntosCliente !== null ? puntosCliente : 'no disponible'}
      - Últimos pedidos (el más reciente es el primero del arreglo): ${JSON.stringify(ultimosPedidos)}
      `;
    }

    const systemPrompt = `
      Eres el asistente virtual del Kiosco de autoservicio de "${nombre_negocio || 'este restaurante'}".
      Tu propósito es resolver de forma RÁPIDA Y DIRECTA las dudas del cliente sobre: precios de productos,
      precios de extras/ingredientes, recomendaciones del menú, sus puntos de fidelidad y el estado de sus pedidos.

      📋 CATÁLOGO DE PRODUCTOS (única fuente de verdad, no inventes nada fuera de esta lista):
      ${JSON.stringify(catalogoLimpio)}

      📂 CATEGORÍAS DISPONIBLES: ${JSON.stringify(categoriasLimpias)}

      🧂 EXTRAS/INGREDIENTES DISPONIBLES CON SU PRECIO (única fuente de verdad para precios de extras):
      ${JSON.stringify(extrasLimpios)}
      ${bloquePersonalizado}

      REGLAS INQUEBRANTABLES:
      1. SIEMPRE responde en Español, tono amable y breve (máximo 3-4 líneas).
      2. La moneda es el Peso ($). NUNCA inventes un platillo, precio, ingrediente o dato que no esté en los catálogos de arriba.
      3. NO puedes armar el pedido ni agregar nada al carrito. Si el cliente quiere ordenar, dile que seleccione el producto directamente en el menú tocándolo.
      4. Si preguntan por sus PUNTOS o el ESTADO/HISTORIAL de SU pedido (ej. "¿ya va mi orden?", "cuánto falta", "cuál fue mi último pedido", "cuántos puntos tengo"):
         - Si en este prompt existe la sección "🔐 CLIENTE IDENTIFICADO", RESPONDE DIRECTO con esos datos reales. NUNCA lo mandes a revisar otra pantalla si ya tienes el dato aquí.
         - Si NO existe esa sección (no hay sesión iniciada), dile amablemente que para consultar sus puntos o pedidos necesita identificarse primero con el botón "👤 Identificarme".
      5. Si preguntan algo totalmente ajeno al menú/puntos/pedidos (clima, política, etc.), redirige amablemente la conversación al menú.
      6. JAMÁS muestres formato JSON crudo al cliente.
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    const promptCompleto = `${systemPrompt}\n\nPREGUNTA DEL CLIENTE:\n${pregunta}`;

    let textoFinal = null;
    const maxRetries = GEMINI_MODELS_FALLBACK.length;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 👇 Usa el modelo principal en el primer intento; si falla, prueba el de respaldo
        const modeloActual = GEMINI_MODELS_FALLBACK[Math.min(attempt - 1, GEMINI_MODELS_FALLBACK.length - 1)];
        const model = genAI.getGenerativeModel({ model: modeloActual });
        const result = await model.generateContent(promptCompleto);
        textoFinal = result.response.text();
        break;
      } catch (errGemini) {
        console.warn(`⏳ [kiosco-chat-ia] Intento ${attempt}/${maxRetries} falló:`, errGemini.message);
        const esSaturado = errGemini.message && errGemini.message.includes('503');
        if (esSaturado && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (attempt >= maxRetries) {
          throw esSaturado
            ? new Error('El asistente está muy solicitado en este momento. Intenta de nuevo en unos segundos.')
            : errGemini;
        } else {
          throw errGemini;
        }
      }
    }

    respuestasCacheKiosco.set(cacheKey, { texto: textoFinal, timestamp: Date.now() });

    res.json({ success: true, respuesta: textoFinal });
  } catch (error) {
    console.error('🚨 [kiosco-chat-ia] Error:', error.message);
    const msg = error.message.includes('límite') || error.message.includes('disponible') || error.message.includes('solicitado')
      ? error.message
      : 'El asistente no pudo responder en este momento. Intenta de nuevo.';
    res.status(error.message.includes('límite') ? 429 : 500).json({ error: msg });
  }
};