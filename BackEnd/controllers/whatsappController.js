// BackEnd/controllers/whatsappController.js
// =========================================================================
// 📲 WEBHOOK WHATSAPP (Meta Cloud API) — Consulta de estado de pedido
// -------------------------------------------------------------------------
// Pieza 3 del roadmap (Documento A): quick-win de solo lectura. El cliente
// escribe cualquier mensaje a nuestro número de WhatsApp y recibe el estado
// de su pedido más reciente. NO arma pedidos, NO es el asistente conversacional
// completo (eso es la Fase 4, pendiente).
//
// 🆕 MULTI-TENANT: Meta NO manda headers personalizados (no hay X-Empresa-Slug),
// así que NO se usa resolveTenant.js aquí (mismo criterio ya aplicado al puente
// biométrico ZKTeco en api.js). El tenant se resuelve DENTRO del controlador,
// cruzando el "phone_number_id" que manda Meta contra configuracion.wa_phone_id
// (reutilizamos la columna que YA existe, sin crear una tabla whatsapp_config
// nueva — Principio DRY).
// =========================================================================

const db = require('../config/db');
const { normalizarTelefonoMX, mensajePorEstado, enviarTextoLibreWhatsApp } = require('../utils/whatsappHelpers'); // 🆕 FASE 4: extraído para reutilizar aquí y en whatsappHerramientasController.js
const { generarRespuestaConHerramientas } = require('./iaController'); // 🆕 FASE 4: motor de function calling
const herramientas = require('./whatsappHerramientasController'); // 🆕 FASE 4: las 5 herramientas del asistente
const omnichannelRouter = require('../utils/whatsappRouterIA'); // 🆕 OMNICANAL: IA + Human Handoff (módulo aislado)
const { verificarFirmaWebhook } = require('../utils/whatsappFirma'); // 🔒 4c: firma del webhook de Meta

// =========================================================================
// 🆕 FASE 4: tabla de estado conversacional del asistente de pedidos por
// WhatsApp — guarda el carrito en construcción mientras el cliente conversa.
// Mismo patrón de auto-migración usado en el resto del sistema (ver
// proveedorController.js, notificacionesConfigController.js), registrada
// en api.js junto a las demás inicializaciones.
// =========================================================================
exports.inicializarTablaWhatsapp = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_conversaciones (
                id SERIAL PRIMARY KEY,
                empresa_id INTEGER REFERENCES empresas(id),
                telefono VARCHAR(15) NOT NULL,
                carrito_borrador JSONB DEFAULT '[]'::jsonb,
                historial_ia JSONB DEFAULT '[]'::jsonb,
                paso_actual VARCHAR(50) DEFAULT 'inicio',
                item_en_progreso JSONB DEFAULT NULL,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(empresa_id, telefono)
            );
        `);
        await db.query(`ALTER TABLE whatsapp_conversaciones ADD COLUMN IF NOT EXISTS historial_ia JSONB DEFAULT '[]'::jsonb;`).catch(()=>null); // 🔧 por si la tabla ya existía sin esta columna
        console.log('✅ Tabla "whatsapp_conversaciones" verificada/creada correctamente.');
    } catch (error) {
        console.error('🚨 Error al verificar/crear "whatsapp_conversaciones":', error);
    }
};

// 🔒 Token de verificación del webhook — secreto compartido que TÚ eliges y
// declaras una sola vez en el dashboard de Meta (Webhooks > Verify Token) por
// cada negocio. No es por-empresa: es la "llave de la puerta" de este endpoint,
// igual para los 4 negocios, porque el tenant real se resuelve después, ya
// adentro, por phone_number_id. Vive en variable de entorno del backend único.
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'pos_whatsapp_verify';

// =========================================================================
// 🆕 FASE 4: System Prompt del asistente conversacional de pedidos
// (texto literal aprobado en el Documento A, sección 5 — sin modificar).
// =========================================================================
const SYSTEM_PROMPT_PEDIDOS = (nombreNegocio) => `
Eres el asistente de pedidos de ${nombreNegocio} por WhatsApp. Tu única fuente de verdad
es el catálogo que te entregan las herramientas; NUNCA inventes productos, precios,
ingredientes, variantes ni límites de selección que no vengan de una función.

REGLAS INQUEBRANTABLES:
1. Para cada producto que el cliente mencione, usa la herramienta buscar_producto.
   Si no existe, dilo claramente y sugiere alternativas reales del catálogo.
2. Un producto solo se considera "completo" cuando:
   - Toda categoría de tipo variacion obligatoria (Tamaño/Sabor) tiene un valor.
   - Todo grupo_obligatorio tiene exactamente 1 valor elegido.
   - Todo grupo_opcional respeta su "limite" (puede ir vacío si no es obligatorio,
     pero nunca debe exceder el límite informado por la herramienta).
3. NUNCA preguntes por "ingredientes base" (receta original) salvo que el cliente
   diga explícitamente que quiere quitar o cambiar algo de la receta.
4. Si una categoría ya trae un valor "es_default" true, NO preguntes por ella;
   asúmela automáticamente y menciónala solo de forma breve al confirmar el ítem.
5. Nunca registres el pedido final hasta que el cliente confirme explícitamente
   con una frase de cierre ("ya es todo", "eso sería todo", "confirma mi pedido").
   Cuando confirme, usa la herramienta registrar_pedido.
6. Si el cliente pide más elementos de un grupo_opcional que su "limite",
   recházalo amablemente e indica el máximo real.
7. Sé breve y conversacional, como un mesero real. Pregunta un paso a la vez.
8. Responde siempre en el idioma del cliente.
9. Cuando un ítem quede completo con todas sus opciones resueltas, usa
   registrar_item_en_conversacion con el objeto completo antes de seguir.
10. Si el cliente pregunta por el estado de un pedido anterior (no uno nuevo),
    usa consultar_estado_pedido en vez de iniciar un carrito nuevo.

Tu respuesta final de cada turno (cuando ya NO necesites llamar ninguna herramienta
más) DEBE ser texto plano en formato JSON exacto, sin backticks ni markdown:
{
  "mensaje_para_cliente": "texto natural a enviar por WhatsApp",
  "accion": "seguir_conversando" | "pedido_listo_para_registrar" | "consulta_estado"
}
`;

// =========================================================================
// GET /whatsapp/webhook — verificación inicial exigida por Meta al dar de
// alta el webhook en el dashboard (hub.challenge). Se hace UNA sola vez por
// negocio al configurar su Meta App, pero la ruta debe quedar siempre activa.
// =========================================================================
exports.verificarWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

// =========================================================================
// POST /whatsapp/webhook — mensajes entrantes reales de Meta.
// =========================================================================
exports.recibirWebhook = async (req, res) => {
    // 🆕 Responder 200 INMEDIATO: Meta reintenta agresivamente si no recibe
    // 200 en pocos segundos, y puede duplicar el mismo mensaje varias veces.
    // 🔒 4c: valida la firma ANTES de aceptar el mensaje (en modo "log" solo registra, no bloquea)
    const firma = await verificarFirmaWebhook(req);
    if (!firma.ok) return res.sendStatus(403);

    res.sendStatus(200);

    try {
        const entry = req.body?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const mensaje = value?.messages?.[0];

        if (!mensaje) return; // Eventos de "status" (entregado/leído) no traen "messages" — fuera del alcance de este quick-win

        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) return;

        // 🆕 OMNICANAL: si este número está registrado en whatsapp_configuraciones, el enrutador lo atiende
        // (registro en Caja, pausa_ia, candado Premium). Si devuelve manejado:false, sigue el flujo legacy.
        const omni = await omnichannelRouter.procesarMensajeEntrante({ value, mensaje, phoneNumberId });
        if (omni.manejado) return;

        // 🔐 Resolución de tenant: phone_number_id -> empresa_id, reutilizando
        // configuracion.wa_phone_id (misma columna que ya usa enviarPlantillaWhatsApp).
        const confRes = await db.query(
            'SELECT empresa_id, wa_api_token FROM configuracion WHERE wa_phone_id = $1 AND wa_api_activa = true',
            [phoneNumberId]
        );
        if (confRes.rows.length === 0) return; // Número no reconocido o negocio con WhatsApp desactivado
        const { empresa_id: empresaId, wa_api_token: waApiToken } = confRes.rows[0];

        const waIdOrigen = mensaje.from; // Ej. "5216621234567"
        const telefono10 = normalizarTelefonoMX(waIdOrigen);
        if (telefono10.length !== 10) return;

        const textoEntrante = mensaje.text?.body || '';
        const negocioRes = await db.query('SELECT nombre_negocio FROM configuracion WHERE empresa_id = $1', [empresaId]);
        const nombreNegocio = negocioRes.rows[0]?.nombre_negocio || 'nuestro restaurante';

        // 🔒 FIX: los 2 flags comerciales son INDEPENDIENTES entre sí (Documento A,
        // sección 8) y se consultan en UNA sola query — antes se cortaba todo el
        // flujo si whatsapp_notificaciones estaba apagado, sin importar si
        // whatsapp_pedidos_ia estaba activo, dejando al asistente conversacional
        // inservible para cualquier negocio que no tuviera también notificaciones.
        const flagsRes = await db.query('SELECT whatsapp_pedidos_ia, whatsapp_notificaciones FROM empresas WHERE id = $1', [empresaId]);
        const pedidosIAHabilitado = !!flagsRes.rows[0]?.whatsapp_pedidos_ia;
        const notificacionesHabilitado = !!flagsRes.rows[0]?.whatsapp_notificaciones;

        if (pedidosIAHabilitado) {
            await manejarConversacionPedido(empresaId, telefono10, waIdOrigen, textoEntrante, nombreNegocio, phoneNumberId, waApiToken);
            return;
        }

        // 👇 Comportamiento YA EXISTENTE (quick-win de consulta de estado) — sin cambios,
        // solo gateado por whatsapp_notificaciones (candado propio de este flujo).
        if (!notificacionesHabilitado) return;

        const clienteRes = await db.query('SELECT id FROM clientes WHERE telefono = $1 AND empresa_id = $2', [telefono10, empresaId]);
        const clienteId = clienteRes.rows[0]?.id || null;

        const pedidoRes = await db.query(
            `SELECT * FROM pedidos
             WHERE empresa_id = $1
             AND (cliente_id = $2 OR direccion_entrega LIKE '%CONTACTO: ' || $3 || '%')
             ORDER BY id DESC LIMIT 1`,
            [empresaId, clienteId, telefono10]
        );

        let textoRespuesta;
        if (pedidoRes.rows.length === 0) {
            textoRespuesta = `Hola 👋, soy el asistente de ${nombreNegocio}. No encontramos pedidos recientes asociados a este número.`;
        } else {
            textoRespuesta = `Hola 👋, soy el asistente de ${nombreNegocio}. ${mensajePorEstado(pedidoRes.rows[0])}`;
        }

        await enviarTextoLibreWhatsApp(phoneNumberId, waApiToken, waIdOrigen, textoRespuesta);
    } catch (error) {
        console.error('🚨 Error al procesar webhook de WhatsApp:', error.message);
    }
};

// =========================================================================
// 🆕 FASE 4: Motor conversacional de pedidos — ejecuta el loop de function
// calling contra Gemini, persiste el historial/carrito en whatsapp_conversaciones,
// y dispara pedidoCtrl.crearPedido cuando el cliente confirma.
// =========================================================================
const manejarConversacionPedido = async (empresaId, telefono10, waIdOrigen, textoEntrante, nombreNegocio, phoneNumberId, waApiToken) => {
    try {
        const iaConfigRes = await db.query('SELECT * FROM ia_configuracion WHERE empresa_id = $1', [empresaId]);
        const configIA = iaConfigRes.rows[0];
        if (!configIA || !configIA.modulo_activo) {
            await enviarTextoLibreWhatsApp(phoneNumberId, waApiToken, waIdOrigen, 'Por el momento no podemos tomar tu pedido por este medio. Contáctanos directamente, por favor.');
            return;
        }

        const convRes = await db.query('SELECT * FROM whatsapp_conversaciones WHERE empresa_id = $1 AND telefono = $2', [empresaId, telefono10]);
        const historialPrevio = convRes.rows[0]?.historial_ia
            ? (typeof convRes.rows[0].historial_ia === 'string' ? JSON.parse(convRes.rows[0].historial_ia) : convRes.rows[0].historial_ia)
            : [];

        const io = global.ioInstance || null; // ⚠️ PENDIENTE: ver nota de index.js más abajo
        const ejecutorHerramientas = async (nombreHerramienta, args) => {
            switch (nombreHerramienta) {
                case 'buscar_producto': return await herramientas.buscarProducto(empresaId, args.nombre_buscado);
                case 'obtener_opciones_personalizacion': return await herramientas.obtenerOpcionesPersonalizacion(empresaId, args.producto_id);
                case 'registrar_item_en_conversacion': return await herramientas.registrarItemEnConversacion(empresaId, telefono10, args.item);
                case 'registrar_pedido': return await herramientas.registrarPedido(empresaId, telefono10, io);
                case 'consultar_estado_pedido': return await herramientas.consultarEstadoPedido(empresaId, telefono10);
                default: return { error: `Herramienta desconocida: ${nombreHerramienta}` };
            }
        };

        const { textoFinal, historialActualizado } = await generarRespuestaConHerramientas(
            SYSTEM_PROMPT_PEDIDOS(nombreNegocio),
            historialPrevio,
            textoEntrante,
            herramientas.TOOLS_DECLARATION,
            ejecutorHerramientas,
            configIA,
            empresaId
        );

        let mensajeParaCliente = textoFinal;
        try {
            const limpio = textoFinal.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(limpio);
            mensajeParaCliente = parsed.mensaje_para_cliente || textoFinal;
        } catch (e) {
            // Si el modelo no devolvió JSON válido, se manda el texto crudo (fail-safe, no rompe la conversación)
        }

        await db.query(`
            INSERT INTO whatsapp_conversaciones (empresa_id, telefono, historial_ia, paso_actual, actualizado_en)
            VALUES ($1, $2, $3::jsonb, 'conversando', CURRENT_TIMESTAMP)
            ON CONFLICT (empresa_id, telefono) DO UPDATE SET
                historial_ia = $3::jsonb, paso_actual = 'conversando', actualizado_en = CURRENT_TIMESTAMP
        `, [empresaId, telefono10, JSON.stringify(historialActualizado)]);

        await enviarTextoLibreWhatsApp(phoneNumberId, waApiToken, waIdOrigen, mensajeParaCliente);
        omnichannelRouter.registrarSalienteExterno(empresaId, waIdOrigen, mensajeParaCliente); // 🆕 espejo en el panel de Caja
    } catch (error) {
        console.error('🚨 Error en el asistente conversacional de WhatsApp:', error.message);
        await enviarTextoLibreWhatsApp(phoneNumberId, waApiToken, waIdOrigen, 'Tuvimos un problema procesando tu mensaje. Intenta de nuevo en unos minutos.');
    }
};