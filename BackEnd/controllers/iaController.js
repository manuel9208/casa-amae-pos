const db = require('../config/db');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const respuestasCache = new Map();

// =========================================================================
// 0. CEREBRO ENRUTADOR DINÁMICO (Sin dependencias globales rígidas)
// =========================================================================
const generarRespuestaTexto = async (systemPrompt, userPrompt, temperature = 0.3, maxRetries = 3, cacheKey = null, configIA = null) => {
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
  const hoy = new Date().toISOString().split('T')[0];
  const fechaUsoDB = configIA?.fecha_uso ? new Date(configIA.fecha_uso).toISOString().split('T')[0] : hoy;
  
  let consultasUsadas = (fechaUsoDB === hoy) ? (configIA?.consultas_hoy || 0) : 0;

  // Bloqueo estricto solo para cuentas FREE
  if (!configIA?.tier_premium && consultasUsadas >= 15) {
    throw new Error("Has alcanzado el límite de 15 consultas gratuitas diarias. Activa el modo Premium o espera a mañana.");
  }

  // 3. Inicialización Dinámica de Llaves desde Base de Datos
  const proveedor = configIA?.proveedor_activo || 'gemini';

  if (proveedor === 'gemini') {
    const apiKey = (configIA?.api_key_gemini || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) throw new Error("Falta la llave de Gemini. El Administrador Global debe agregarla en Ajustes de IA.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const promptCompleto = `INSTRUCCIÓN DEL SISTEMA (Contexto interno, no lo menciones):\n${systemPrompt}\n\nPREGUNTA DEL USUARIO:\n${userPrompt}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
        const result = await model.generateContent(promptCompleto);
        const textoFinal = result.response.text();
        
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
        } else {
          throw new Error("Los servidores de IA están experimentando alta demanda. Intenta de nuevo.");
        }
      }
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
      const textoFinal = response.choices[0].message.content;
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
    await db.query(`
      CREATE TABLE IF NOT EXISTS ia_configuracion (
        id SERIAL PRIMARY KEY,
        ultima_imagen_ia TIMESTAMP,
        modulo_activo BOOLEAN DEFAULT true,
        tier_premium BOOLEAN DEFAULT false,
        proveedor_activo VARCHAR(20) DEFAULT 'gemini',
        api_key_gemini TEXT DEFAULT NULL,
        api_key_openai TEXT DEFAULT NULL,
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
    
    console.log(`✅ Módulo IA inicializado con candados dinámicos y Multi-Llave.`);
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
      consultas_hoy: config.consultas_hoy,
      fecha_uso: config.fecha_uso
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la configuración de IA.' });
  }
};

exports.actualizarConfiguracionIA = async (req, res) => {
  const { modulo_activo, tier_premium, proveedor_activo, api_key_gemini, api_key_openai } = req.body;
  try {
    // Solo actualizamos las llaves si el usuario mandó un valor nuevo (que no tenga "...")
    const updateGemini = api_key_gemini && !api_key_gemini.includes('...') ? `api_key_gemini = '${api_key_gemini.trim()}',` : '';
    const updateOpenAI = api_key_openai && !api_key_openai.includes('...') ? `api_key_openai = '${api_key_openai.trim()}',` : '';

    await db.query(`
      UPDATE ia_configuracion SET 
        modulo_activo = $1, 
        tier_premium = $2, 
        proveedor_activo = $3,
        ${updateGemini}
        ${updateOpenAI}
        id = 1
      WHERE id = 1
    `, [modulo_activo, tier_premium, proveedor_activo]);

    res.json({ success: true, mensaje: 'Configuración de IA actualizada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la configuración de IA.' });
  }
};

// =========================================================================
// 3. ANALISTA FINANCIERO AVANZADO
// =========================================================================
exports.analizarVentas = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido.' });

  try {
    const configIA = await obtenerConfigIA();
    
    let ingresosB2C = 0, pedidosB2C = 0, pedidosCancelados = 0, dineroCancelado = 0;
    let gastosTotal = 0, mermasTotal = 0, listaMermas = [], platillosVendidos = [];
    let primerDiaVenta = 'Desconocido', ventasPorDiaStr = 'Sin datos', topClientes = [];

    try {
      const b2cRes = await db.query(`
        SELECT 
          COUNT(CASE WHEN estado_preparacion != 'Cancelado' THEN 1 END) as pedidos_validos,
          COALESCE(SUM(CASE WHEN estado_preparacion != 'Cancelado' THEN total ELSE 0 END), 0) as ingresos_validos,
          COUNT(CASE WHEN estado_preparacion = 'Cancelado' THEN 1 END) as pedidos_cancelados,
          COALESCE(SUM(CASE WHEN estado_preparacion = 'Cancelado' THEN total ELSE 0 END), 0) as dinero_cancelado
        FROM pedidos 
        WHERE fecha_creacion >= CURRENT_DATE - INTERVAL '30 days'
      `);
      pedidosB2C = b2cRes.rows[0].pedidos_validos; 
      ingresosB2C = Number(b2cRes.rows[0].ingresos_validos);
      pedidosCancelados = b2cRes.rows[0].pedidos_cancelados;
      dineroCancelado = Number(b2cRes.rows[0].dinero_cancelado);
    } catch(e) {}

    try {
      const gastosRes = await db.query(`SELECT COALESCE(SUM(total_pago), 0) as total FROM gastos_proveedores WHERE estado IN ('Pagado', 'Aprobado') AND fecha_compra >= CURRENT_DATE - INTERVAL '30 days'`);
      gastosTotal += Number(gastosRes.rows[0].total);
      const comprasRes = await db.query(`SELECT COALESCE(SUM(costo_total), 0) as total FROM compras_insumos WHERE fecha_compra >= CURRENT_DATE - INTERVAL '30 days'`);
      gastosTotal += Number(comprasRes.rows[0].total);
    } catch(e) {}

    try {
      const mermasRes = await db.query(`SELECT nombre_item, SUM(costo_perdido) as perdida, SUM(cantidad) as cantidad FROM reporte_mermas WHERE fecha_creacion >= CURRENT_DATE - INTERVAL '30 days' GROUP BY nombre_item ORDER BY perdida DESC LIMIT 5`);
      mermasTotal = mermasRes.rows.reduce((acc, curr) => acc + Number(curr.perdida), 0);
      listaMermas = mermasRes.rows;
    } catch(e) {}

    try {
      const platillosRes = await db.query(`SELECT obj->>'nombre' as platillo, SUM(CAST(obj->>'cantidad' AS INTEGER)) as cantidad FROM pedidos p, jsonb_array_elements(p.carrito) obj WHERE p.estado_preparacion != 'Cancelado' AND p.fecha_creacion >= CURRENT_DATE - INTERVAL '30 days' GROUP BY platillo ORDER BY cantidad DESC LIMIT 10`);
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
        SELECT c.nombre, c.puntos, COUNT(p.id) as visitas_mes 
        FROM clientes c 
        LEFT JOIN pedidos p ON c.id = p.cliente_id AND p.fecha_creacion >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY c.id, c.nombre, c.puntos 
        ORDER BY visitas_mes DESC, c.puntos DESC LIMIT 5
      `);
      topClientes = crmRes.rows;
    } catch(e) {}

    const margenBruto = ingresosB2C - gastosTotal - mermasTotal;

    const systemPrompt = `
      Eres AdminIA, el Director Financiero, Operativo (CFO/COO) y Gerente de CRM de este restaurante.
      Analiza la salud del negocio basado ÚNICA Y EXCLUSIVAMENTE en estos DATOS REALES:

      📅 DATOS HISTÓRICOS Y TENDENCIAS GLOBALES:
      - Primer día de ventas: ${primerDiaVenta}
      - Rendimiento por DÍA DE LA SEMANA (Ordenados de PEOR a MEJOR día): ${ventasPorDiaStr}. 

      💰 REPORTE FINANCIERO Y FUGAS (Últimos 30 días):
      - Ventas Exitosas: $${ingresosB2C.toFixed(2)} (${pedidosB2C} pedidos).
      - Pedidos Cancelados: Hubo ${pedidosCancelados} cancelaciones que representan $${dineroCancelado.toFixed(2)} en ventas perdidas.
      - Gastos de Operación (Insumos): $${gastosTotal.toFixed(2)}.
      - Dinero a la basura (Mermas): $${mermasTotal.toFixed(2)}.
      - Margen Bruto Estimado: $${margenBruto.toFixed(2)}.

      🍔 PRODUCTOS Y 👥 CLIENTES (Últimos 30 días):
      - Top Ventas: ${JSON.stringify(platillosVendidos)}
      - Top Mermas: ${JSON.stringify(listaMermas)}
      - Mejores Clientes (CRM): ${JSON.stringify(topClientes)}

      REGLAS INQUEBRANTABLES:
      1. SIEMPRE responde en Español. La moneda es el Peso ($).
      2. Cíñete a los datos de arriba. Si las ventas dicen $0.00, dile al usuario la verdad.
      3. Si te preguntan "qué día descansar", analiza el "Rendimiento por DÍA DE LA SEMANA".
      4. JAMÁS muestres formato JSON al usuario. Usa viñetas limpias.
    `;

    const cacheKeyStr = `finanzas_${new Date().toISOString().split('T')[0]}_${prompt.substring(0, 30)}`;
    const respuestaText = await generarRespuestaTexto(systemPrompt, prompt, 0.2, 3, cacheKeyStr, configIA);
    
    res.json({ success: true, respuesta: respuestaText });
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
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido.' });

  try {
    const configIA = await obtenerConfigIA();
    let listaAsistencias = [], listaCocina = [], listaReparto = [], ultimaNomina = 'No hay nóminas registradas';

    try {
      const asistenciasRes = await db.query(`SELECT u.nombre, u.rol, COUNT(a.id) as dias_asistidos, COALESCE(SUM(ROUND((EXTRACT(EPOCH FROM (COALESCE(a.hora_salida, CURRENT_TIMESTAMP) - a.hora_entrada))/3600)::numeric, 2)), 0) AS horas FROM usuarios u LEFT JOIN registro_asistencias a ON u.id = a.usuario_id AND a.fecha >= CURRENT_DATE - INTERVAL '30 days' WHERE u.rol != 'admin' GROUP BY u.id, u.nombre, u.rol ORDER BY horas DESC`);
      listaAsistencias = asistenciasRes.rows;
    } catch(e) {}

    try {
      const cocinaRes = await db.query(`SELECT u.nombre as chef, COUNT(p.id) as ordenes, ROUND(AVG(EXTRACT(EPOCH FROM (p.tiempo_listo - p.tiempo_inicio_preparacion))/60)::numeric, 1) AS mins_promedio FROM pedidos p JOIN usuarios u ON p.chef_id = u.id WHERE p.tiempo_listo IS NOT NULL AND p.fecha_creacion >= CURRENT_DATE - INTERVAL '30 days' GROUP BY u.nombre ORDER BY mins_promedio ASC`);
      listaCocina = cocinaRes.rows;
    } catch(e) {}

    try {
      const repartidoresRes = await db.query(`SELECT u.nombre as repartidor, COUNT(p.id) as entregas, ROUND(AVG(EXTRACT(EPOCH FROM (p.tiempo_entregado - p.tiempo_salida_reparto))/60)::numeric, 1) AS mins_entrega_promedio FROM pedidos p JOIN usuarios u ON p.repartidor_id = u.id WHERE p.tiempo_entregado IS NOT NULL AND p.fecha_creacion >= CURRENT_DATE - INTERVAL '30 days' GROUP BY u.nombre ORDER BY mins_entrega_promedio ASC`);
      listaReparto = repartidoresRes.rows;
    } catch(e) {}

    try {
      const nominaRes = await db.query(`SELECT fecha_creacion FROM historico_nominas ORDER BY fecha_creacion DESC LIMIT 1`);
      if (nominaRes.rows.length > 0) ultimaNomina = new Date(nominaRes.rows[0].fecha_creacion).toLocaleDateString('es-MX');
    } catch(e) {}

    const systemPrompt = `
      Eres AdminIA, el Director de Recursos Humanos (HR) de este restaurante.
      Analiza al personal basado ÚNICA Y EXCLUSIVAMENTE en estos DATOS REALES (Últimos 30 días):

      👨‍🍳 RENDIMIENTO EN COCINA: ${JSON.stringify(listaCocina)}
      🛵 RENDIMIENTO EN REPARTO: ${JSON.stringify(listaReparto)}
      📅 ASISTENCIAS Y HORAS TRABAJADAS: ${JSON.stringify(listaAsistencias)}
      💵 Última nómina procesada: ${ultimaNomina}

      REGLAS INQUEBRANTABLES:
      1. SIEMPRE responde en Español y usa Pesos ($).
      2. NUNCA inventes información.
      3. Habla con autoridad de liderazgo. JAMÁS muestres formato JSON.
    `;

    const cacheKeyStr = `rrhh_${new Date().toISOString().split('T')[0]}_${prompt.substring(0, 30)}`;
    const respuestaText = await generarRespuestaTexto(systemPrompt, prompt, 0.3, 3, cacheKeyStr, configIA);
    
    res.json({ success: true, respuesta: respuestaText });
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
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido.' });

  try {
    const configIA = await obtenerConfigIA();
    const systemPrompt = "Eres AdminIA, el asistente creativo y copiloto de negocios exclusivo de este sistema POS. REGLAS INQUEBRANTABLES: 1. SIEMPRE responde en Español. 2. Tu moneda base es el Peso Mexicano/Latino ($), NUNCA dólares ni USD. 3. Sé amable, conciso, proactivo y da consejos de marketing o liderazgo relacionados con restaurantes.";
    
    const respuestaText = await generarRespuestaTexto(systemPrompt, prompt, 0.7, 3, null, configIA);
    res.json({ success: true, respuesta: respuestaText });
  } catch (error) {
    const msg = error.message.includes('límite') || error.message.includes('llave') || error.message.includes('desactivado') || error.message.includes('Premium') || error.message.includes('saldo')
      ? error.message : 'Error al procesar la respuesta creativa.';
    res.status(500).json({ error: msg });
  }
};

// =========================================================================
// 6. GENERADOR DE IMÁGENES (DALL-E 3)
// =========================================================================
exports.generarImagen = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'El prompt es requerido para generar la imagen.' });

  try {
    const configIA = await obtenerConfigIA();

    if (!configIA.tier_premium) {
      return res.status(403).json({ error: 'La generación de imágenes publicitarias requiere activar el nivel Premium en los Ajustes de IA.' });
    }

    const apiKey = (configIA.api_key_openai || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error("No hay llave de ChatGPT configurada para generar imágenes. Agrégala en Ajustes de IA.");
    const openai = new OpenAI({ apiKey });

    const hoy = new Date().toISOString().split('T')[0];
    if (configIA.ultima_imagen_ia) {
      const fechaUltima = new Date(configIA.ultima_imagen_ia).toISOString().split('T')[0];
      if (fechaUltima === hoy) {
        return res.status(429).json({ error: 'Límite alcanzado: Solo puedes generar 1 imagen con DALL-E por día.' });
      }
    }

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Un diseño publicitario o fotografía profesional de ultra alta calidad para un restaurante: ${prompt}`,
      n: 1,
      size: "1024x1024",
    });

    await db.query('UPDATE ia_configuracion SET ultima_imagen_ia = CURRENT_TIMESTAMP WHERE id = 1');

    res.json({ 
      success: true, 
      mensaje: 'Imagen generada con éxito.',
      url: imageResponse.data[0].url 
    });

  } catch (error) {
    const msg = error.message.includes('Premium') || error.message.includes('llave') || error.message.includes('Límite') || error.message.includes('desactivado') || error.message.includes('saldo')
      ? error.message : 'Error interno al comunicarse con el modelo DALL-E 3.';
    res.status(500).json({ error: msg });
  }
};