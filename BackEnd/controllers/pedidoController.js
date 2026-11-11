const db = require('../config/db');
const webpush = require('web-push');
const cocinaOperativaCtrl = require('./cocinaOperativaController');
const { resolverVariables } = require('../utils/envResolver'); // 🆕 MULTI-TENANT
const notificacionesConfigCtrl = require('./notificacionesConfigController'); // 🆕 FASE 3: cierre de círculo (require en un solo sentido, sin ciclo)

// 🆕 MULTI-TENANT: ya NO se configura una sola vez al arrancar el servidor
// con process.env global. Ahora se resuelve POR EMPRESA, justo antes de cada
// tanda de envíos, leyendo primero empresas.variables y cayendo a process.env
// si esa empresa aún no configuró sus propias llaves VAPID (fallback seguro).
// 🆕 Aviso visible (máx. 1 vez por hora y empresa) cuando el push no puede enviarse por falta de llaves
const avisosVapid = new Map();
const avisarSinVapid = (empresaId, motivo) => {
  const ahora = Date.now();
  if (ahora - (avisosVapid.get(empresaId) || 0) < 60 * 60 * 1000) return;
  avisosVapid.set(empresaId, ahora);
  console.warn(`⚠️ [PUSH] Empresa ${empresaId}: ${motivo}. No se enviarán notificaciones push hasta configurarlas en Admin Empresas.`);
};

const configurarVapidPorEmpresa = async (empresaId) => {
    try {
        // 🔒 Candado comercial del Admin Global: push apagado para esta empresa (default: encendido)
        const flagPush = await db.query('SELECT notificaciones_push FROM empresas WHERE id = $1', [empresaId]);
        if (flagPush.rows[0] && flagPush.rows[0].notificaciones_push === false) return null;

        const vars = await resolverVariables(empresaId, ['VAPID_EMAIL', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']);
        const email = String(vars.VAPID_EMAIL || 'soporte@pos.com').trim();
        const publicKey = String(vars.VAPID_PUBLIC_KEY || '').trim();
        const privateKey = String(vars.VAPID_PRIVATE_KEY || '').trim();
        if (publicKey && privateKey) {
        // El valor guardado puede traer ya "mailto:" o ser https://: solo se antepone si hace falta
        const subject = /^(mailto:|https?:\/\/)/i.test(email) ? email : `mailto:${email}`;
          return { subject, publicKey, privateKey }; // se pasa en CADA envío: sin estado global entre empresas
        }
            avisarSinVapid(empresaId, 'sin llaves VAPID (ni propias en Admin Empresas ni globales en el servidor)');
        return null;
        } catch (e) {
        console.log("No se pudieron configurar las llaves VAPID para la empresa:", empresaId, e.message);
        return false;
    }
};

// =========================================================
// FUNCIONES GLOBALES DE NOTIFICACIÓN PUSH
// =========================================================
// 🆕 Envía con las llaves de ESTA empresa y borra suscripciones muertas (404/410).
// El log trae el status: 401/403 = llave distinta, 410 = suscripción expirada.
const enviarPushSeguro = async (sub, payload, vapidDetails, empresaId, etiqueta) => {
  try {
    await webpush.sendNotification(sub, payload, { vapidDetails });
  } catch (e) {
    console.log(`Push no entregado (${etiqueta}, empresa ${empresaId}): status=${e.statusCode || '-'} ${e.body ? String(e.body).slice(0, 120) : e.message}`);
    if ((e.statusCode === 404 || e.statusCode === 410) && sub && sub.endpoint) {
      db.query("DELETE FROM suscripciones_push WHERE suscripcion->>'endpoint' = $1 AND empresa_id = $2", [sub.endpoint, empresaId]).catch(() => {});
    }
  }
};

const notificarCliente = async (cliente_id, titulo, cuerpo, empresaId) => { // 🆕 TENANT: nuevo parámetro empresaId
    if(!cliente_id) return;
    try {
        const vapidListo = await configurarVapidPorEmpresa(empresaId); // 🆕 por empresa, antes de enviar
        if (!vapidListo) return;

        const subs = await db.query("SELECT suscripcion FROM suscripciones_push WHERE cliente_id = $1 AND empresa_id = $2", [cliente_id, empresaId]); // 🔒 FILTRO EMPRESA
        const payload = JSON.stringify({ title: titulo, body: cuerpo });
        for(let row of subs.rows) {
            const sub = typeof row.suscripcion === 'string' ? JSON.parse(row.suscripcion) : row.suscripcion;
            await enviarPushSeguro(sub, payload, vapidListo, empresaId, 'cliente');
        }
    } catch(e) { console.error("Error al notificar cliente:", e.message); }
};

const notificarStaff = async (rolesArray, titulo, cuerpo, empresaId) => { // 🆕 TENANT: nuevo parámetro empresaId
    try {
        const vapidListo = await configurarVapidPorEmpresa(empresaId); // 🆕 por empresa, antes de enviar
        if (!vapidListo) return;

        let query = "SELECT s.suscripcion FROM suscripciones_push s JOIN usuarios u ON s.usuario_id = u.id";
        let subs;
        if (rolesArray && rolesArray.length > 0) {
            const placeholders = rolesArray.map((_, i) => `$${i+1}`).join(',');
            query += ` WHERE u.rol IN (${placeholders}) AND u.empresa_id = $${rolesArray.length + 1} AND s.empresa_id = $${rolesArray.length + 1}`; // 🔒 FILTRO EMPRESA
            subs = await db.query(query, [...rolesArray, empresaId]);
        } else {
            query += ` WHERE u.empresa_id = $1 AND s.empresa_id = $1`; // 🔒 FILTRO EMPRESA
            subs = await db.query(query, [empresaId]);
        }
        const payload = JSON.stringify({ title: titulo, body: cuerpo });
        for(let row of subs.rows) {
            const sub = typeof row.suscripcion === 'string' ? JSON.parse(row.suscripcion) : row.suscripcion;
            await enviarPushSeguro(sub, payload, vapidListo, empresaId, 'staff');
        }
    } catch(e) { console.error("Error al notificar staff:", e.message); }
};

// =========================================================================
// 🆕 FASE 3 (cierre de círculo): disparador genérico de eventos.
// Sustituye los bloques hardcodeados de notificarStaff/notificarCliente —
// ahora TODO pasa por lo configurado en notificaciones_configuracion
// (destinatarios por rol + mensajes editables), con fallback automático
// a los defaults (= comportamiento actual) si el negocio nunca lo tocó.
// El canal "cliente_whatsapp" NO se envía aquí (ver nota de plantillas Meta
// en el plan de WhatsApp) — solo se resuelve destinatarios/mensaje de
// Staff y Push-Cliente, que no tienen esa restricción.
// =========================================================================
const TITULOS_PUSH_STAFF = {
    pedido_nuevo: '¡Nuevo Pedido!',
    pedido_directo_cocina: '👨‍🍳 Nueva Comanda (Comedor)',
    pedido_confirmado_cocina: '👨‍🍳 Nueva Comanda',
    en_preparacion: 'Preparando Orden',
    pedido_listo: 'Orden Lista ✅',
    asignado_repartidor: '🛵 Pedido Asignado', // 🆕 FASE 3
    entregado: 'Pedido Entregado', // 🆕 FASE 3
    cancelado: 'Pedido Cancelado ❌'
};
const TITULOS_PUSH_CLIENTE = {
    pedido_nuevo: 'Orden Recibida 🕒',
    pedido_directo_cocina: 'Orden Confirmada ✅',
    pedido_confirmado_cocina: 'Orden Confirmada ✅',
    en_preparacion: '¡En el fuego! 🔥',
    pedido_listo: '¡Tu comida está lista! 🍔',
    repartidor_en_camino: '¡Orden en Camino! 🛵',
    entregado: '¡Gracias por tu compra! 🙌', // 🆕 FASE 3
    cancelado: 'Pedido Cancelado'
};

const dispararEvento = async (empresaId, evento, datos = {}) => {
    try {
        const cfg = await notificacionesConfigCtrl.obtenerConfigEventoInterno(empresaId, evento);
        if (!cfg) return; // evento no reconocido en el catálogo: no rompe nada, simplemente no notifica

        const reemplazarVariables = (txt) => {
            if (!txt) return txt;
            let out = txt;
            Object.keys(datos).forEach(key => { out = out.replace(new RegExp(`{{${key}}}`, 'g'), datos[key] ?? ''); });
            return out;
        };

        const rolesStaff = ['admin', 'gerente', 'cajero', 'chef', 'cocina', 'ayudante_cocina', 'repartidor']
            .filter(rol => cfg.destinatarios[rol]);

        if (rolesStaff.length > 0 && cfg.mensaje_staff) {
            notificarStaff(rolesStaff, TITULOS_PUSH_STAFF[evento] || 'Notificación', reemplazarVariables(cfg.mensaje_staff), empresaId);
        }

        if (cfg.destinatarios.cliente_push && datos.cliente_id && cfg.mensaje_cliente_push) {
            notificarCliente(datos.cliente_id, TITULOS_PUSH_CLIENTE[evento] || 'Notificación', reemplazarVariables(cfg.mensaje_cliente_push), empresaId);
        }

        // 🆕 WhatsApp al cliente — SOLO si hay plantilla aprobada mapeada para este evento.
        const nombrePlantilla = TEMPLATES_WHATSAPP_CLIENTE[evento];
        if (cfg.destinatarios.cliente_whatsapp && datos.pedido) {
            const telefonoCliente = await resolverTelefonoCliente(empresaId, datos.pedido);
            if (telefonoCliente) {
                const negocioRes = await db.query('SELECT nombre_negocio FROM configuracion WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
                const nombreNegocio = negocioRes.rows[0]?.nombre_negocio || 'nuestro restaurante';
                let parametrosTexto;
                if (evento === 'pedido_listo') {
                    const instruccion = datos.pedido.tipo_consumo === 'Domicilio' ? 'Ya va en camino a tu domicilio 🛵' : datos.pedido.tipo_consumo === 'Recoger en Local' ? 'Puedes pasar a la sucursal por ella 🚗' : 'Por favor pasa a la barra a recogerla 🍔';
                    parametrosTexto = [datos.numero_pedido, nombreNegocio, instruccion];
                } else {
                    parametrosTexto = [datos.numero_pedido, nombreNegocio];
                }
                const textoLibre = reemplazarVariables(
  String(cfg.mensaje_cliente_whatsapp || '')
    .replace(/{{nombre_negocio}}/g, nombreNegocio)
    .replace(/{{instruccion_entrega}}/g, parametrosTexto[2] || '')
);
enviarPlantillaWhatsApp(empresaId, telefonoCliente, nombrePlantilla, parametrosTexto, textoLibre);
            }
        }
    } catch (e) {
        console.error(`Error al disparar evento "${evento}":`, e.message);
    }
};
exports.dispararEvento = dispararEvento; // 🆕 FASE 3: reutilizado por repartidorController.js (Principio DRY)

// 🆕 Resuelve el teléfono del cliente para un pedido — MISMO criterio que ya
// usaba el bloque inline de 'Listo' (cliente registrado o CONTACTO: en la dirección).
const resolverTelefonoCliente = async (empresaId, pedido) => {
    if (pedido.cliente_id) {
        const clienteRes = await db.query('SELECT telefono FROM clientes WHERE id = $1 AND empresa_id = $2', [pedido.cliente_id, empresaId]);
        if (clienteRes.rows.length > 0) return clienteRes.rows[0].telefono;
    } else if (pedido.direccion_entrega && pedido.direccion_entrega.includes('CONTACTO:')) {
        const match = pedido.direccion_entrega.match(/CONTACTO:\s*(\d+)/);
        if (match && match[1]) return match[1];
    }
    return null;
};

// 🆕 Envío genérico de plantilla aprobada de Meta — reutilizable para cualquier evento.
// Si Meta aún no aprueba la plantilla, solo lo loguea (no rompe el flujo del pedido).
const enviarPlantillaWhatsApp = async (empresaId, telefonoCliente, nombrePlantilla, parametrosTexto, textoLibre = '') => {
    try {
        // 🆕 FASE 2: candado comercial — revalidación real en backend, nunca confiar solo en el candado visual de NotificacionesWA.js
        const empresaFlagRes = await db.query('SELECT whatsapp_notificaciones FROM empresas WHERE id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
        const comercialHabilitado = empresaFlagRes.rows[0]?.whatsapp_notificaciones === true;
        if (!comercialHabilitado) return;

        // 🆕 CANAL ÚNICO: el elegido en Centro Omnicanal (whatsapp_configuraciones).
        // Baileys / 360dialog envían texto libre; Meta sigue usando plantillas aprobadas.
        const waCfgRes = await db.query('SELECT * FROM whatsapp_configuraciones WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
        const waCfg = waCfgRes.rows[0];
        if (waCfg && (waCfg.proveedor === 'baileys' || waCfg.proveedor === '360dialog')) {
        if (!textoLibre || !telefonoCliente || String(telefonoCliente).length !== 10) return;
        const { enviarTextoPorProveedor } = require('../utils/whatsappHelpers');
        const enviado = await enviarTextoPorProveedor(waCfg, `52${telefonoCliente}`, textoLibre);
        if (!enviado) console.error(`⚠️ No se pudo enviar la notificación por ${waCfg.proveedor} (empresa ${empresaId}).`);
        return;
        }

        let config = null;
        if (waCfg && waCfg.proveedor === 'meta' && waCfg.meta_phone_id && waCfg.meta_api_token) {
            config = { wa_api_token: waCfg.meta_api_token, wa_phone_id: waCfg.meta_phone_id };
        } else {
            const configRes = await db.query('SELECT wa_api_activa, wa_api_token, wa_phone_id FROM configuracion WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
            const legacy = configRes.rows[0];
            if (legacy && (legacy.wa_api_activa === true || legacy.wa_api_activa === 'true') && legacy.wa_api_token && legacy.wa_phone_id) config = legacy;
        }
        if (!config || !nombrePlantilla) return; // Meta solo envía plantillas aprobadas
        if (!telefonoCliente || telefonoCliente.length !== 10) return;

        const numeroDestino = `52${telefonoCliente}`;
        const payloadMeta = {
            messaging_product: "whatsapp", recipient_type: "individual", to: numeroDestino, type: "template",
            template: {
                name: nombrePlantilla, language: { code: "es_MX" },
                components: [{ type: "body", parameters: parametrosTexto.map(texto => ({ type: "text", text: String(texto) })) }]
            }
        };
        const waRes = await fetch(`https://graph.facebook.com/v17.0/${config.wa_phone_id}/messages`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${config.wa_api_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payloadMeta)
        });
        const waData = await waRes.json();
        if (!waData.error) console.log(`✅ Plantilla "${nombrePlantilla}" enviada a ${numeroDestino}`);
        else console.error(`⚠️ Meta rechazó la plantilla "${nombrePlantilla}" (posiblemente aún no aprobada):`, waData.error.message);
    } catch (e) { console.error("Error de red al enviar plantilla de WhatsApp:", e.message); }
};

// 🆕 Mapa evento -> nombre de plantilla APROBADA en Meta. Si el evento no está
// aquí (o Meta aún no la aprueba), simplemente no se intenta el envío por
// WhatsApp, aunque el toggle del negocio esté activo — así nunca se manda
// texto libre fuera de ventana de 24h, que Meta rechazaría de inmediato.
const TEMPLATES_WHATSAPP_CLIENTE = {
    pedido_listo: 'alerta_pedido_listo',             // ✅ ya aprobada y en uso
    repartidor_en_camino: 'alerta_pedido_en_camino', // ⏳ pendiente de aprobación en Meta
    cancelado: 'alerta_pedido_cancelado'             // ⏳ pendiente de aprobación en Meta
};

const limpiarNulos = (obj) => {
    const newObj = { ...obj };
    for (let key in newObj) { if (newObj[key] === undefined) { delete newObj[key]; } }
    return newObj;
};

// =========================================================
// OBTENER HISTORIAL DEL DÍA
// =========================================================
exports.obtenerPedidosHoy = async (req, res) => {
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const query = `
        SELECT p.*, TRIM(COALESCE(c.nombre, '') || ' ' || COALESCE(c.apellido, '')) AS cliente_nombre
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        WHERE (p.fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE
        AND p.empresa_id = $1
        ORDER BY p.fecha_creacion DESC
        `;
        const result = await db.query(query, [empresaId]); // 🔒 FILTRO EMPRESA
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Error al obtener pedidos' }); }
};

// =========================================================
// CREAR UN NUEVO PEDIDO (Motor con Fallback Múltiple JSONB)
// =========================================================
exports.crearPedido = async (req, res) => {
    const datosPuros = limpiarNulos(req.body);
    const { cliente_id, chef_id, origen, tipo_consumo, direccion_entrega, metodo_pago, total, carrito, estado_preparacion, mesa, cupon_codigo, descuento_puntos, costo_envio, pagos_mixtos } = datosPuros;
    const empresaId = req.empresa_id; // 🆕 TENANT
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        if (carrito && carrito.length > 0) {
            const cantRequerida = {};
            for (const item of carrito) {
                const pId = item.producto_id || item.id;
                if (pId && !isNaN(parseInt(pId))) {
                    const cleanId = parseInt(pId);
                    cantRequerida[cleanId] = (cantRequerida[cleanId] || 0) + (parseInt(item.cantidad) || 1);
                }
            }
            for (const [pId, cant] of Object.entries(cantRequerida)) {
                const checkRes = await client.query('SELECT nombre, usa_stock, stock_preparado FROM productos WHERE id = $1 AND empresa_id = $2', [pId, empresaId]); // 🔒 FILTRO EMPRESA
                if (checkRes.rows.length > 0) {
                    const row = checkRes.rows[0];
                    if (row.usa_stock === true || String(row.usa_stock) === 'true') {
                        const stockActual = parseInt(row.stock_preparado) || 0;
                        if (stockActual < cant) {
                            await client.query('ROLLBACK');
                            return res.status(400).json({ error: `Stock insuficiente para "${row.nombre}". Solo quedan ${stockActual} unidades.` });
                        }
                    }
                }
            }
        }

        const nroRes = await client.query("SELECT COALESCE(MAX(numero_pedido), 0) + 1 AS num FROM pedidos WHERE (fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE AND empresa_id = $1", [empresaId]); // 🔒 FILTRO EMPRESA: el consecutivo diario ahora es POR EMPRESA
        const sigNumero = nroRes.rows[0].num;
        let estadoReal = estado_preparacion || 'Pendiente';

        // 🍳 BANDERA: Flujo sin Cocina (tabla independiente configuracion_operativa)
        // Si el negocio NO usa cocina, cualquier estado que normalmente abriría una
        // comanda en el KDS (Preparando/Pagado/Aceptado) se reescribe a 'Listo', para
        // que el pedido aterrice directo en Entregas/Cobrar, sin pasar por Cocina.js.
        // Si usa_cocina=true (o la tabla aún no responde), el comportamiento queda
        // EXACTAMENTE IGUAL que hoy — cero impacto en negocios existentes.
        try {
            const confOpRes = await client.query('SELECT usa_cocina FROM configuracion_operativa WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA ⚠️ Depende de la migración futura de configOperativaCtrl.js (tarea 14)
            const usaCocina = confOpRes.rows.length === 0 ? true : (confOpRes.rows[0].usa_cocina !== false);
            if (!usaCocina && ['Preparando', 'Pagado', 'Aceptado'].includes(estadoReal)) {
                estadoReal = 'Listo';
            }
        } catch (errConfOp) {
            console.error("Aviso: no se pudo leer configuracion_operativa, se usa flujo con cocina por defecto:", errConfOp.message);
        }

        const carritoStr = typeof carrito === 'string' ? carrito : JSON.stringify(carrito || []);

        let costoEnvioFinal = 0;
        if (costo_envio !== undefined) {
            if (typeof costo_envio === 'object' && costo_envio !== null && costo_envio.costo !== undefined) {
                costoEnvioFinal = Number(costo_envio.costo);
            } else {
                costoEnvioFinal = Number(String(costo_envio).replace(/[^0-9.-]+/g,"")) || 0;
            }
        }

        const insertQuery = `
        INSERT INTO pedidos (
            cliente_id, numero_pedido, chef_id, tipo_consumo, metodo_pago, total, carrito,
            origen, estado_preparacion, direccion_entrega, descuento_puntos,
            costo_envio, pagos_mixtos, mesa, cupon_codigo, empresa_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *
        `; // 🆕 TENANT
        const values = [cliente_id, sigNumero, chef_id, tipo_consumo, metodo_pago, total, carritoStr, origen || 'Kiosco', estadoReal, direccion_entrega, descuento_puntos || 0, costoEnvioFinal, pagos_mixtos ? JSON.stringify(pagos_mixtos) : null, mesa || null, cupon_codigo || null, empresaId]; // 🆕 TENANT
        const result = await client.query(insertQuery, values);
        const pedidoInsertado = result.rows[0];

        if (mesa) {
            await client.query("UPDATE mesas SET estado = 'Ocupada', pedido_actual_id = $1 WHERE numero_mesa = $2 AND empresa_id = $3", [pedidoInsertado.id, mesa, empresaId]); // 🔒 FILTRO EMPRESA
        }

        // 👇 NUEVO MOTOR DE EXPLOSIÓN: Base + Sabores + Extras (CON INTELIGENCIA DE SUSTITUTOS MÚLTIPLES)
        if (carrito && carrito.length > 0) {
            for (const item of carrito) {
                const pId = item.producto_id || item.id;
                const cantidadVendida = parseInt(item.cantidad) || 1;  

                if (!pId || isNaN(parseInt(pId))) continue;  

                // 👇 FIX MÁSTER: Detección exacta leyendo el Ticket visual y los Grupos no seleccionados
                const ingredientesOmitidos = [];
                
                // 1. Omitidos visualmente (Botón "Sin ..." o Sustitución explícita)
                (item.extras || []).forEach(ex => {
                    if (ex.tipo === 'base' && String(ex.nombre).startsWith('Sin ')) {
                        // 👇 FIX: Colapsamos espacios dobles además de bajar a minúsculas, para que
                        // coincida siempre contra ibase.nombre sin importar cómo se haya escrito.
                        ingredientesOmitidos.push(String(ex.nombre).replace('Sin ', '').trim().replace(/\s+/g, ' ').toLowerCase());
                    } else if (ex.tipo === 'sustitucion' && String(ex.nombre).includes(' x ')) {
                        const parts = String(ex.nombre).replace('🔄 Cambio: ', '').split(' x ');
                        if (parts.length === 2) {
                            ingredientesOmitidos.push(parts[0].trim().replace(/\s+/g, ' ').toLowerCase());
                        }
                    }
                });

                // 2. Omitidos por Grupos (Si el ingrediente está en un grupo, pero NO fue seleccionado, se ignora del inventario)
                const opcionesGrupos = (item.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' || o.tipo === 'grupo_opcional');
                
                opcionesGrupos.forEach(opt => {
                    const nombreOpcionLimpio = String(opt.nombre).trim().toLowerCase();
                    
                    // Verificamos si el cliente SÍ eligió esta opción (revisando los extras del ticket)
                    const fueSeleccionada = (item.extras || []).some(ex => {
                        const isGroupType = ex.tipo === 'grupo_obligatorio' || ex.tipo === 'grupo_opcional';
                        return isGroupType && String(ex.nombre).toLowerCase().includes(nombreOpcionLimpio);
                    });
                    
                    // Si la opción existe en el grupo pero NO fue seleccionada por el cliente, la agregamos a omitidos
                    if (!fueSeleccionada) {
                        ingredientesOmitidos.push(nombreOpcionLimpio);
                    }
                });

                const nombresVariaciones = (item.extras || [])
                    .filter(e => e.tipo === 'variacion')
                    .map(e => String(e.nombre).trim().toLowerCase()); 
                const arrayVariacionesGlobal = nombresVariaciones.length > 0 ? nombresVariaciones : [null]; 

                const prodRes = await client.query('SELECT nombre, rendimiento, stock_preparado, usa_stock FROM productos WHERE id = $1 AND empresa_id = $2', [pId, empresaId]); // 🔒 FILTRO EMPRESA

                if (prodRes.rows.length > 0) {
                    const row = prodRes.rows[0];
                    const isUsaStock = row.usa_stock === true || String(row.usa_stock) === 'true';

                    if (isUsaStock) {
                        await client.query('UPDATE productos SET stock_preparado = stock_preparado - $1 WHERE id = $2 AND empresa_id = $3', [cantidadVendida, pId, empresaId]); // 🔒 FILTRO EMPRESA
                    } else {
                        const rendimiento = parseFloat(row.rendimiento) || 1;
                        let lotesADescontar = cantidadVendida / rendimiento;  

                        if (lotesADescontar > 0) {
                            const arrayVariaciones = nombresVariaciones.length > 0 ? nombresVariaciones : [null];
                            
                            // 👇 QUERY PLATILLOS CON MÚLTIPLES RESPALDOS Y EMPAQUES INTELIGENTES
                            const esParaLlevar = ['Domicilio', 'Recoger en Local', 'Para llevar'].includes(tipo_consumo);
                            
                            const recursiveQueryPlatillo = `
                                WITH RECURSIVE Explosion AS (
                                    SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                                    FROM recetas r
                                    LEFT JOIN insumos ibase ON r.insumo_id = ibase.id AND ibase.empresa_id = $6
                                    WHERE r.producto_id = $2
                                    AND r.empresa_id = $6
                                    AND (r.sabor_nombre IS NULL OR LOWER(TRIM(r.sabor_nombre)) = ANY($3::text[]))
                                    -- 👇 FIX MÁSTER: Evita el bug de Postgres al recibir arreglos vacíos o nulos
                                    AND (
                                        array_length($5::text[], 1) IS NULL 
                                        OR ibase.nombre IS NULL 
                                        OR NOT (REGEXP_REPLACE(LOWER(TRIM(ibase.nombre)), '\\s+', ' ', 'g') = ANY($5::text[]))
                                    )
                                    UNION ALL
                                    SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                                    FROM Explosion e
                                    JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $6
                                    JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $6
                                    WHERE e.sub_producto_id IS NOT NULL
                                ),
                                Requeridos AS (
                                    SELECT e.insumo_id, SUM(e.qty_factor) as total_descontar 
                                    FROM Explosion e
                                    LEFT JOIN insumos i_check ON e.insumo_id = i_check.id AND i_check.empresa_id = $6
                                    WHERE e.insumo_id IS NOT NULL 
                                    -- 👇 REGLA MAGICA: Ignora empaques configurados solo para llevar si el pedido es Local
                                    AND (i_check.descontar_solo_llevando = false OR (i_check.descontar_solo_llevando = true AND $4 = true))
                                    GROUP BY e.insumo_id
                                ),
                                MapeoSustitutos AS (
                                    SELECT 
                                        CASE 
                                            WHEN i.stock_actual <= 0 AND i.insumos_sustitutos IS NOT NULL AND jsonb_array_length(i.insumos_sustitutos) > 0 THEN i.insumos_sustitutos
                                            ELSE jsonb_build_array(i.id)
                                        END as array_ids,
                                        r.total_descontar
                                    FROM Requeridos r
                                    JOIN insumos i ON r.insumo_id = i.id AND i.empresa_id = $6
                                ),
                                TotalesFinales AS (
                                    SELECT CAST(jsonb_array_elements_text(array_ids) AS INTEGER) as final_insumo_id, SUM(total_descontar) as qty
                                    FROM MapeoSustitutos GROUP BY final_insumo_id
                                )
                                UPDATE insumos i SET stock_actual = i.stock_actual - t.qty
                                FROM TotalesFinales t WHERE i.id = t.final_insumo_id AND i.empresa_id = $6;
                            `; // 🔒 FILTRO EMPRESA aplicado en TODOS los niveles de la recursión (ancla + UNION ALL)
                            // 👇 FIX: Pasamos el arreglo limpio. Postgres lo manejará de forma segura
                            const arrayOmitidos = ingredientesOmitidos.length > 0 ? ingredientesOmitidos : [];
                            await client.query(recursiveQueryPlatillo, [lotesADescontar, pId, arrayVariaciones, esParaLlevar, arrayOmitidos, empresaId]); // 🆕 TENANT: $6
                        }
                    }

                    // 👇 QUERY EXTRAS/EMPAQUES OBLIGATORIOS (Aplicando la misma regla de respaldos múltiples)
                    if (item.extras && item.extras.length > 0) {
                        for (const extra of item.extras) {
                            if (['grupo_opcional', 'grupo_obligatorio', 'extra', 'sustitucion'].includes(extra.tipo)) {
                                // Extraemos el nombre real del ingrediente según el formato visual
                                let nombreExtraLimpio = '';
                                if (extra.tipo === 'sustitucion') {
                                    nombreExtraLimpio = extra.nombre.split(' x ')[1]?.trim(); // "🔄 Cambio: Cebolla x Tomate" -> "Tomate"
                                } else if (extra.tipo === 'extra') {
                                    // 👇 FIX: El frontend actual genera "[Agregado] Nombre", no "🔸 Nombre".
                                    // Mantenemos ambos .replace() por compatibilidad retroactiva con pedidos antiguos ya guardados.
                                    nombreExtraLimpio = extra.nombre.replace('[Agregado] ', '').replace('🔸 ', '').replace('Extra ', '').trim();
                                } else if (extra.nombre.includes(': ')) {
                                    nombreExtraLimpio = extra.nombre.split(': ')[1].trim(); // "🔹 Leches: Entera" -> "Entera"
                                } else {
                                    nombreExtraLimpio = extra.nombre.trim();
                                }

                                if (!nombreExtraLimpio) continue;

                                // 👇 FIX DEFINITIVO: En vez de confiar en "isDefault" (que es solo la preselección visual
                                // del kiosco y puede NO coincidir con el insumo que el admin hardcodeó en la receta física),
                                // consultamos directamente si este insumo específico ya está en la receta del producto/tamaño.
                                if (extra.tipo === 'grupo_obligatorio' || extra.tipo === 'grupo_opcional') {
                                    const yaEnRecetaBase = await client.query(
                                        `SELECT 1 FROM recetas r
                                        JOIN insumos i2 ON r.insumo_id = i2.id AND i2.empresa_id = $4
                                        WHERE r.producto_id = $1
                                        AND r.empresa_id = $4
                                        AND (r.sabor_nombre IS NULL OR LOWER(TRIM(r.sabor_nombre)) = ANY($2::text[]))
                                        AND LOWER(TRIM(i2.nombre)) = LOWER(TRIM($3))
                                        LIMIT 1`,
                                        [pId, arrayVariacionesGlobal, nombreExtraLimpio, empresaId] // 🆕 TENANT: $4
                                    );
                                    if (yaEnRecetaBase.rows.length > 0) {
                                        continue; // Este insumo ya se descontó vía la receta base/tamaño. Evita doble descuento.
                                    }
                                }

                                // 👇 FIX MÁSTER: Búsqueda insensible a mayúsculas/minúsculas
                                const ingRes = await client.query(
                                    `SELECT ci.id FROM catalogo_ingredientes ci
                                    JOIN clasificaciones c ON ci.clasificacion_id = c.id AND c.empresa_id = $3
                                    WHERE LOWER(TRIM(ci.nombre)) = LOWER(TRIM($1))
                                    AND LOWER(TRIM(c.nombre)) = LOWER(TRIM($2))
                                    AND ci.empresa_id = $3
                                    LIMIT 1`,
                                    [nombreExtraLimpio, item.categoria, empresaId] // 🆕 TENANT: $3
                                );
                                
                                if (ingRes.rows.length > 0) {
                                    const ingredienteId = ingRes.rows[0].id;
                                    
                                    const esParaLlevarExtra = ['Domicilio', 'Recoger en Local', 'Para llevar'].includes(tipo_consumo);
                                    
                                    const recursiveQueryExtra = `
                                        WITH RECURSIVE Explosion AS (
                                            SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                                            FROM recetas r WHERE r.ingrediente_id = $2 AND r.empresa_id = $4
                                            UNION ALL
                                            SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                                            FROM Explosion e
                                            JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $4
                                            JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $4
                                            WHERE e.sub_producto_id IS NOT NULL
                                        ),
                                        Requeridos AS (
                                            SELECT e.insumo_id, SUM(e.qty_factor) as total_descontar 
                                            FROM Explosion e
                                            LEFT JOIN insumos i_check ON e.insumo_id = i_check.id AND i_check.empresa_id = $4
                                            WHERE e.insumo_id IS NOT NULL 
                                            AND (i_check.descontar_solo_llevando = false OR (i_check.descontar_solo_llevando = true AND $3 = true))
                                            GROUP BY e.insumo_id
                                        ),
                                        MapeoSustitutos AS (
                                            SELECT 
                                                CASE 
                                                    WHEN i.stock_actual <= 0 AND i.insumos_sustitutos IS NOT NULL AND jsonb_array_length(i.insumos_sustitutos) > 0 THEN i.insumos_sustitutos
                                                    ELSE jsonb_build_array(i.id)
                                                END as array_ids, 
                                                r.total_descontar
                                            FROM Requeridos r JOIN insumos i ON r.insumo_id = i.id AND i.empresa_id = $4
                                        ),
                                        TotalesFinales AS (
                                            SELECT CAST(jsonb_array_elements_text(array_ids) AS INTEGER) as final_insumo_id, SUM(total_descontar) as qty 
                                            FROM MapeoSustitutos GROUP BY final_insumo_id
                                        )
                                        UPDATE insumos i SET stock_actual = i.stock_actual - t.qty FROM TotalesFinales t WHERE i.id = t.final_insumo_id AND i.empresa_id = $4;
                                    `; // 🔒 FILTRO EMPRESA aplicado en TODOS los niveles de la recursión
                                    await client.query(recursiveQueryExtra, [cantidadVendida, ingredienteId, esParaLlevarExtra, empresaId]); // 🆕 TENANT: $4
                                }
                            }
                        }
                    }
                }
            }
        }

        // 👇 NUEVO MOTOR: DESCUENTO DE EMPAQUES GLOBALES (Portavasos, Bolsas, etc)
        if (carrito && carrito.length > 0) {
            const esParaLlevarGlobal = ['Domicilio', 'Recoger en Local', 'Para llevar'].includes(tipo_consumo);
            
            const empaquesGlobalesRes = await client.query(`
                SELECT id, regla_empaque_global, stock_actual, insumos_sustitutos 
                FROM insumos 
                WHERE es_empaque_global = true AND empresa_id = $2 AND (descontar_solo_llevando = false OR (descontar_solo_llevando = true AND $1 = true))
            `, [esParaLlevarGlobal, empresaId]); // 🔒 FILTRO EMPRESA

            for (const empG of empaquesGlobalesRes.rows) {
                const regla = typeof empG.regla_empaque_global === 'string' ? JSON.parse(empG.regla_empaque_global) : (empG.regla_empaque_global || {});
                const categoriasAplicables = regla.categorias_aplicables || [];
                const divisor = Number(regla.regla_divisor) || 1;

                if (categoriasAplicables.length > 0) {
                    // Contamos cuántos artículos del carrito aplican para esta regla
                    let itemsAplicables = 0;
                    for (const item of carrito) {
                        if (categoriasAplicables.includes(item.categoria)) {
                            itemsAplicables += (parseInt(item.cantidad) || 1);
                        }
                    }

                    if (itemsAplicables > 0) {
                        // Matemática perfecta: 5 cafés / capacidad de 4 = 1.25 -> 2 portavasos
                        const piezasADescontar = Math.ceil(itemsAplicables / divisor);
                        
                        let targetId = empG.id;
                        if (empG.stock_actual <= 0 && empG.insumos_sustitutos && empG.insumos_sustitutos.length > 0) {
                            targetId = empG.insumos_sustitutos[0]; // Toma el primer respaldo
                        }

                        await client.query('UPDATE insumos SET stock_actual = stock_actual - $1 WHERE id = $2 AND empresa_id = $3', [piezasADescontar, targetId, empresaId]); // 🔒 FILTRO EMPRESA
                    }
                }
            }
        }

        if (cliente_id && descuento_puntos > 0) {
            await client.query('UPDATE clientes SET puntos = puntos - $1 WHERE id = $2 AND empresa_id = $3', [descuento_puntos, cliente_id, empresaId]); // 🔒 FILTRO EMPRESA
        }  
        if (cupon_codigo) {
            await client.query('UPDATE cupones SET usos_actuales = COALESCE(usos_actuales, 0) + 1 WHERE codigo = $1 AND empresa_id = $2', [cupon_codigo, empresaId]); // 🔒 FILTRO EMPRESA
        }

        await client.query('COMMIT');  

        const io = req.app.get('io');
        if (io) {
            io.to(`empresa_${empresaId}`).emit('catalogo_actualizado'); // 🔒 FILTRO EMPRESA
            io.to(`empresa_${empresaId}`).emit('nuevo_pedido'); // 🔒 FILTRO EMPRESA
        }

        if (estadoReal === 'Pagado') {
            if (cliente_id) {
                try {
                    const confRes = await db.query('SELECT * FROM configuracion WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
                    if (confRes.rows.length > 0) {
                        const config = confRes.rows[0];
                        if (config.puntos_activos === true || config.puntos_activos === 'true' || config.puntos_activos === undefined) {
                            const porcentaje = config.puntos_porcentaje !== undefined ? Number(config.puntos_porcentaje) : 10;
                            const valorPeso = config.puntos_valor_peso !== undefined ? Number(config.puntos_valor_peso) : 1;
                            
                            let totalElegible = 0;
                            const carritoItems = typeof pedidoInsertado.carrito === 'string' ? JSON.parse(pedidoInsertado.carrito) : pedidoInsertado.carrito;
                            if (carritoItems && carritoItems.length > 0) {
                                for (const item of carritoItems) {
                                    let genera = true;
                                    if (item.id) {
                                        const prodRes = await db.query(`SELECT p.genera_puntos as p_genera, c.genera_puntos as c_genera FROM productos p LEFT JOIN clasificaciones c ON p.categoria = c.nombre AND c.empresa_id = $2 WHERE p.id = $1 AND p.empresa_id = $2`, [item.id, empresaId]); // 🔒 FILTRO EMPRESA
                                        if (prodRes.rows.length > 0) {
                                            const data = prodRes.rows[0];
                                            if (data.p_genera === false || data.c_genera === false) genera = false;
                                        }
                                    }
                                    if (genera) totalElegible += Number(item.precioFinal || 0) * Number(item.cantidad || 1);
                                }
                            }
                            
                            const puntosAplicados = Number(pedidoInsertado.descuento_puntos) || 0;
                            totalElegible -= (puntosAplicados * valorPeso);
                            if (totalElegible < 0) totalElegible = 0;

                            const puntosAGanar = Math.floor(totalElegible * (porcentaje / 100));
                            if (puntosAGanar > 0) await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2 AND empresa_id = $3', [puntosAGanar, cliente_id, empresaId]); // 🔒 FILTRO EMPRESA
                        }
                    }
                } catch(e) {}
            }

            dispararEvento(empresaId, 'pedido_directo_cocina', { numero_pedido: pedidoInsertado.numero_pedido, cliente_id }); // 🆕 FASE 3: lee destinatarios/mensajes desde notificaciones_configuracion
        } else {
            dispararEvento(empresaId, 'pedido_nuevo', { numero_pedido: pedidoInsertado.numero_pedido, cliente_id }); // 🆕 FASE 3
        }
        res.status(201).json(pedidoInsertado);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al crear pedido:", error);
        res.status(500).json({ error: 'Error en el servidor al crear pedido' });
    } finally {
        client.release();
    }
};

// =========================================================
// ACTUALIZAR DATOS BRUTOS DEL PEDIDO
// =========================================================
exports.actualizarPedido = async (req, res) => {
    const { id } = req.params;
    const datosPuros = limpiarNulos(req.body);
    const empresaId = req.empresa_id; // 🆕 TENANT
    
    const { cliente_id, tipo_consumo, metodo_pago, direccion_entrega, total, carrito, estado_preparacion, mesa, costo_envio, cupon_codigo, descuento_puntos } = datosPuros;
    
    try {
        const carritoStr = typeof carrito === 'string' ? carrito : JSON.stringify(carrito || []);
        let costoEnvioFinal = 0;
        
        if (costo_envio !== undefined) {
            if (typeof costo_envio === 'object' && costo_envio !== null && costo_envio.costo !== undefined) {
                costoEnvioFinal = Number(costo_envio.costo);
            } else {
                costoEnvioFinal = Number(String(costo_envio).replace(/[^0-9.-]+/g,"")) || 0;
            }
        }

        const prevRes = await db.query('SELECT cupon_codigo, descuento_puntos, cliente_id FROM pedidos WHERE id = $1 AND empresa_id = $2', [id, empresaId]); // 🔒 FILTRO EMPRESA
        const cuponAnterior = prevRes.rows.length > 0 ? prevRes.rows[0].cupon_codigo : null;
        const puntosAnteriores = prevRes.rows.length > 0 ? Number(prevRes.rows[0].descuento_puntos || 0) : 0;
        const dbClienteId = prevRes.rows.length > 0 ? prevRes.rows[0].cliente_id : null;

        let updateFields = []; let params = []; let paramIndex = 1;
        if (cliente_id !== undefined) { updateFields.push(`cliente_id = $${paramIndex++}`); params.push(cliente_id); }
        if (tipo_consumo !== undefined) { updateFields.push(`tipo_consumo = $${paramIndex++}`); params.push(tipo_consumo); }
        if (metodo_pago !== undefined) { updateFields.push(`metodo_pago = $${paramIndex++}`); params.push(metodo_pago); }
        if (direccion_entrega !== undefined) { updateFields.push(`direccion_entrega = $${paramIndex++}`); params.push(direccion_entrega); }
        if (total !== undefined) { updateFields.push(`total = $${paramIndex++}`); params.push(total); }
        if (carrito !== undefined) { updateFields.push(`carrito = $${paramIndex++}`); params.push(carritoStr); }
        if (estado_preparacion !== undefined) { updateFields.push(`estado_preparacion = $${paramIndex++}`); params.push(estado_preparacion); }
        if (mesa !== undefined) { updateFields.push(`mesa = $${paramIndex++}`); params.push(mesa); }
        if (costo_envio !== undefined) { updateFields.push(`costo_envio = $${paramIndex++}`); params.push(costoEnvioFinal); }
        if (cupon_codigo !== undefined) { updateFields.push(`cupon_codigo = $${paramIndex++}`); params.push(cupon_codigo); }
        
        if (descuento_puntos !== undefined) {
            const puntosNuevos = Number(descuento_puntos);
            const targetClient = cliente_id || dbClienteId;
            if (targetClient && puntosNuevos !== puntosAnteriores) {
                const diff = puntosNuevos - puntosAnteriores;
                await db.query('UPDATE clientes SET puntos = puntos - $1 WHERE id = $2 AND empresa_id = $3', [diff, targetClient, empresaId]); // 🔒 FILTRO EMPRESA
            }
            updateFields.push(`descuento_puntos = $${paramIndex++}`);
            params.push(puntosNuevos);
        }

        if (updateFields.length === 0) return res.json({ success: true, message: 'No hay cambios' });
        params.push(id);
        const idParamIndex = paramIndex; paramIndex++;
        params.push(empresaId); // 🆕 TENANT
        const empresaParamIndex = paramIndex;

        const query = `UPDATE pedidos SET ${updateFields.join(', ')} WHERE id = $${idParamIndex} AND empresa_id = $${empresaParamIndex} RETURNING *`; // 🔒 FILTRO EMPRESA
        const result = await db.query(query, params);

        if (cupon_codigo && cupon_codigo !== cuponAnterior) {
            await db.query('UPDATE cupones SET usos_actuales = COALESCE(usos_actuales, 0) + 1 WHERE codigo = $1 AND empresa_id = $2', [cupon_codigo, empresaId]); // 🔒 FILTRO EMPRESA
        }

        // 👇 FIX: Sincronización Total — faltaba emitir el evento de actualización.
        // Sin esto, al editar un pedido (carrito, total, dirección, estado) ninguna otra
        // pantalla (Cocina/KDS, otra Caja, Kiosco del cliente) se enteraba en tiempo real.
        const io = req.app.get('io');
        if (io) io.to(`empresa_${empresaId}`).emit('pedido_actualizado');

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al actualizar pedido:", error);
        res.status(500).json({ error: 'Error en el servidor al actualizar pedido' });
    }
};

// =========================================================
// MOTOR DE TRANSICIONES DE ESTADO Y FLUJO DE CAJA-COCINA
// =========================================================
exports.actualizarEstado = async (req, res) => {
    const { id } = req.params;
    const { estado_preparacion, chef_id, carrito, metodo_pago, total, costo_envio, pagos_mixtos, repartidor_id, descuento_puntos, log_evento } = req.body;
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const prevRes = await db.query('SELECT estado_preparacion, cliente_id, descuento_puntos, total, carrito, mesa, chef_id, tipo_consumo, metodo_pago FROM pedidos WHERE id = $1 AND empresa_id = $2', [id, empresaId]); // 🔒 FILTRO EMPRESA
        if (prevRes.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
        const pedidoPrevio = prevRes.rows[0];

        let estadoReal = estado_preparacion;
        const metodoPagoAct = metodo_pago !== undefined ? metodo_pago : pedidoPrevio.metodo_pago;
        
        const isPagadoDinero = ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto', 'Puntos'].includes(metodoPagoAct);

        // 🍳 BANDERA: Flujo sin Cocina (tabla independiente configuracion_operativa)
        // Barrera anti-trampa: si algo (frontend viejo, caché, llamada directa a la API)
        // intenta mandar un pedido a 'Preparando' en un negocio sin cocina, se reescribe
        // a 'Listo' para que caiga en Entregas/Cobrar en vez de abrir comanda en el KDS.
        // Si usa_cocina=true (o la tabla aún no responde), queda igual que hoy.
        try {
            const confOpRes = await db.query('SELECT usa_cocina FROM configuracion_operativa WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA ⚠️ Depende de la migración futura de configOperativaCtrl.js (tarea 14)
            const usaCocina = confOpRes.rows.length === 0 ? true : (confOpRes.rows[0].usa_cocina !== false);
            if (!usaCocina && estadoReal === 'Preparando') {
                estadoReal = 'Listo';
            }
        } catch (errConfOp) {
            console.error("Aviso: no se pudo leer configuracion_operativa, se usa flujo con cocina por defecto:", errConfOp.message);
        }

        // 👇 FIX: Antes solo aplicaba a "Local" sin mesa. Esto dejaba pedidos de
        // "Para llevar" y "Recoger en Local" atascados para siempre en 'Entregado',
        // nunca llegaban a 'Finalizado'. Domicilio queda EXCLUIDO a propósito: su cierre
        // real depende del despacho/liquidación del repartidor, no solo de "Entregado"+pagado.
        const tiposAutoFinalizables = ['Local', 'Para llevar', 'Recoger en Local', 'Recoger'];
        if (estadoReal === 'Entregado' && tiposAutoFinalizables.includes(pedidoPrevio.tipo_consumo) && !pedidoPrevio.mesa && isPagadoDinero) {
            estadoReal = 'Finalizado'; 
        }

        let updateFields = ['estado_preparacion = $1'];
        let params = [estadoReal];
        let queryIndex = 2;

        if (descuento_puntos && Number(descuento_puntos) > 0 && pedidoPrevio.cliente_id) {
            await db.query('UPDATE clientes SET puntos = puntos - $1 WHERE id = $2 AND empresa_id = $3', [descuento_puntos, pedidoPrevio.cliente_id, empresaId]); // 🔒 FILTRO EMPRESA
            updateFields.push(`descuento_puntos = COALESCE(descuento_puntos, 0) + $${queryIndex}`);
            params.push(descuento_puntos);
            queryIndex++;
        }

        if (chef_id !== undefined) { updateFields.push(`chef_id = $${queryIndex}`); params.push(chef_id); queryIndex++; }
        if (repartidor_id !== undefined) { updateFields.push(`repartidor_id = $${queryIndex}`); params.push(repartidor_id); queryIndex++; }
        if (carrito !== undefined) { updateFields.push(`carrito = $${queryIndex}`); params.push(typeof carrito === 'string' ? carrito : JSON.stringify(carrito)); queryIndex++; }
        if (metodo_pago !== undefined) { updateFields.push(`metodo_pago = $${queryIndex}`); params.push(metodo_pago); queryIndex++; }
        if (total !== undefined) { updateFields.push(`total = $${queryIndex}`); params.push(total); queryIndex++; }
        if (pagos_mixtos !== undefined) { updateFields.push(`pagos_mixtos = $${queryIndex}`); params.push(JSON.stringify(pagos_mixtos)); queryIndex++; }
        if (costo_envio !== undefined) {
            let finalEnvio = 0;
            if (typeof costo_envio === 'object' && costo_envio !== null) finalEnvio = Number(costo_envio.costo || 0);
            else finalEnvio = Number(String(costo_envio).replace(/[^0-9.-]+/g,"")) || 0;
            updateFields.push(`costo_envio = $${queryIndex}`); params.push(finalEnvio); queryIndex++;
        }

        // 🛡️ FIX: Solo se setea la PRIMERA vez que el pedido entra a Preparando.
// Si ya existía un valor (por una acción previa en la misma comanda), se conserva intacto.
if (estadoReal === 'Preparando') { updateFields.push(`tiempo_inicio_preparacion = COALESCE(tiempo_inicio_preparacion, CURRENT_TIMESTAMP)`); }
        if (estadoReal === 'Listo') { updateFields.push(`tiempo_listo = CURRENT_TIMESTAMP`); }
        if (estadoReal === 'En Camino') { updateFields.push(`tiempo_salida_reparto = CURRENT_TIMESTAMP`); }
        if (estadoReal === 'Entregado' || estadoReal === 'Finalizado') { updateFields.push(`tiempo_entregado = CURRENT_TIMESTAMP`); }

        params.push(id);
        const idQueryIndex = queryIndex; queryIndex++;
        params.push(empresaId); // 🆕 TENANT
        const empresaQueryIndex = queryIndex;

        const result = await db.query(`UPDATE pedidos SET ${updateFields.join(', ')} WHERE id = $${idQueryIndex} AND empresa_id = $${empresaQueryIndex} RETURNING *`, params); // 🔒 FILTRO EMPRESA
        const pedidoActual = result.rows[0];

        // 👇 FASE 2: Log append-only de colaboración (quién preparó/ayudó/terminó cada ítem y cuándo)
        if (log_evento && Array.isArray(log_evento.indices) && log_evento.accion) {
            log_evento.indices.forEach(idx => {
                cocinaOperativaCtrl.registrarEventoProduccion(id, idx, log_evento.usuario_id, log_evento.accion, empresaId); // 🆕 TENANT
            });
        }

        if (pedidoPrevio.mesa) {
            if (estadoReal === 'Cancelado' || estadoReal === 'Finalizado') {
                await db.query("UPDATE mesas SET estado = 'Libre', pedido_actual_id = NULL WHERE numero_mesa = $1 AND empresa_id = $2", [pedidoPrevio.mesa, empresaId]); // 🔒 FILTRO EMPRESA
            } else if (estadoReal === 'Entregado' && !isPagadoDinero) {
                await db.query("UPDATE mesas SET estado = 'Por Pagar' WHERE numero_mesa = $1 AND empresa_id = $2", [pedidoPrevio.mesa, empresaId]); // 🔒 FILTRO EMPRESA
            } else {
                await db.query("UPDATE mesas SET estado = 'Ocupada' WHERE numero_mesa = $1 AND empresa_id = $2", [pedidoPrevio.mesa, empresaId]); // 🔒 FILTRO EMPRESA
            }
        }

            if (estadoReal === 'Cancelado' && pedidoPrevio.estado_preparacion !== 'Cancelado') {
            // 1. Devolver Puntos al Cliente
            if (pedidoPrevio.descuento_puntos && Number(pedidoPrevio.descuento_puntos) > 0 && pedidoPrevio.cliente_id) {
                await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2 AND empresa_id = $3', [pedidoPrevio.descuento_puntos, pedidoPrevio.cliente_id, empresaId]); // 🔒 FILTRO EMPRESA
            }

            const carritoRestaurar = typeof pedidoPrevio.carrito === 'string' ? JSON.parse(pedidoPrevio.carrito) : (pedidoPrevio.carrito || []);
            
            // 👇 NUEVO MOTOR DE EXPLOSIÓN INVERSO (Devolución de Mermas, Sabores y Extras)
            if (carritoRestaurar.length > 0) {
                for (const item of carritoRestaurar) {
                    const pId = item.producto_id || item.id;
                    const cantidadDevuelta = parseInt(item.cantidad) || 1;

                    if (!pId || isNaN(parseInt(pId))) continue;

                                        // Extraemos las variaciones que el cliente había elegido
                    const nombresVariaciones = (item.extras || [])
                        .filter(e => e.tipo === 'variacion')
                        .map(e => String(e.nombre).trim().toLowerCase());
                    const arrayVariaciones = nombresVariaciones.length > 0 ? nombresVariaciones : [null];

                    // 👇 FIX NUEVO: Reconstruimos la misma lista de "ingredientesOmitidos" calculada al crear
                    // el pedido. Sin esto, al cancelar se devolvía stock de insumos que el cliente había quitado
                    // (ej. "Sin Queso") y que por lo tanto NUNCA se habían descontado (fuga de inventario/stock fantasma).
                    const ingredientesOmitidosRestaurar = [];
                    (item.extras || []).forEach(ex => {
                        if (ex.tipo === 'base' && String(ex.nombre).startsWith('Sin ')) {
                            ingredientesOmitidosRestaurar.push(String(ex.nombre).replace('Sin ', '').trim().replace(/\s+/g, ' ').toLowerCase());
                        } else if (ex.tipo === 'sustitucion' && String(ex.nombre).includes(' x ')) {
                            const parts = String(ex.nombre).replace('🔄 Cambio: ', '').split(' x ');
                            if (parts.length === 2) {
                                ingredientesOmitidosRestaurar.push(parts[0].trim().replace(/\s+/g, ' ').toLowerCase());
                            }
                        }
                    });
                    const opcionesGruposRestaurar = (item.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' || o.tipo === 'grupo_opcional');
                    opcionesGruposRestaurar.forEach(opt => {
                        const nombreOpcionLimpio = String(opt.nombre).trim().toLowerCase();
                        const fueSeleccionada = (item.extras || []).some(ex => {
                            const isGroupType = ex.tipo === 'grupo_obligatorio' || ex.tipo === 'grupo_opcional';
                            return isGroupType && String(ex.nombre).toLowerCase().includes(nombreOpcionLimpio);
                        });
                        if (!fueSeleccionada) ingredientesOmitidosRestaurar.push(nombreOpcionLimpio);
                    });
                    const arrayOmitidosRestaurar = ingredientesOmitidosRestaurar.length > 0 ? ingredientesOmitidosRestaurar : [];

                    // Procesamos la devolución del Platillo Base y Sabores
                    const prodRes = await db.query('SELECT usa_stock, rendimiento FROM productos WHERE id = $1 AND empresa_id = $2', [pId, empresaId]); // 🔒 FILTRO EMPRESA
                    if (prodRes.rows.length > 0) {
                        const row = prodRes.rows[0];
                        if (row.usa_stock === true || String(row.usa_stock) === 'true') {
                            // Si es refresco o postre, devuelve la pieza entera
                            await db.query('UPDATE productos SET stock_preparado = stock_preparado + $1, disponible = true WHERE id = $2 AND empresa_id = $3', [cantidadDevuelta, pId, empresaId]); // 🔒 FILTRO EMPRESA
                        } else {
                            // Si es platillo preparado, devuelve los gramos/mililitros exactos
                            const rendimiento = parseFloat(row.rendimiento) || 1;
                            const factorDevolucion = cantidadDevuelta / rendimiento;

                            const recursiveQueryPlatillo = `
                                WITH RECURSIVE Explosion AS (
                                    SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                                    FROM recetas r 
                                    LEFT JOIN insumos ibase ON r.insumo_id = ibase.id AND ibase.empresa_id = $5
                                    WHERE r.producto_id = $2 
                                    AND r.empresa_id = $5
                                    AND (r.sabor_nombre IS NULL OR LOWER(TRIM(r.sabor_nombre)) = ANY($3::text[]))
                                    -- 👇 FIX: Misma exclusión usada al crear el pedido, para no devolver lo que nunca se descontó
                                    AND (
                                        array_length($4::text[], 1) IS NULL 
                                        OR ibase.nombre IS NULL 
                                        OR NOT (REGEXP_REPLACE(LOWER(TRIM(ibase.nombre)), '\\s+', ' ', 'g') = ANY($4::text[]))
                                    )
                                    UNION ALL
                                    SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                                    FROM Explosion e
                                    JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $5
                                    JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $5
                                    WHERE e.sub_producto_id IS NOT NULL
                                )
                                UPDATE insumos SET stock_actual = stock_actual + calc.total_devolver FROM (
                                    SELECT insumo_id, SUM(qty_factor) as total_devolver FROM Explosion WHERE insumo_id IS NOT NULL GROUP BY insumo_id
                                ) calc WHERE insumos.id = calc.insumo_id AND insumos.empresa_id = $5;
                            `; // 🔒 FILTRO EMPRESA aplicado en TODOS los niveles — Motor Recursivo #3 (reverso del #1)
                            await db.query(recursiveQueryPlatillo, [factorDevolucion, pId, arrayVariaciones, arrayOmitidosRestaurar, empresaId]); // 🆕 TENANT: $5
                        }
                    }

                    // Procesamos la devolución de los Extras
                    if (item.extras && item.extras.length > 0) {
                        for (const extra of item.extras) {
                            // 👇 FIX: Ahora también revertimos 'extra' (Agregados: Extra Queso, Boba) y 'sustitucion' (Cambios de ingrediente).
                            // Antes solo se revertían grupo_opcional/grupo_obligatorio, dejando fuga de inventario en cancelaciones.
                            if (['grupo_opcional', 'grupo_obligatorio', 'extra', 'sustitucion'].includes(extra.tipo)) {
                                let nombreExtraLimpio = '';
                                if (extra.tipo === 'sustitucion') {
                                    nombreExtraLimpio = extra.nombre.split(' x ')[1]?.trim();
                                } else if (extra.tipo === 'extra') {
                                    nombreExtraLimpio = extra.nombre.replace('[Agregado] ', '').replace('🔸 ', '').replace('Extra ', '').trim();
                                } else if (extra.nombre.includes(': ')) {
                                    nombreExtraLimpio = extra.nombre.split(': ')[1].trim();
                                } else {
                                    nombreExtraLimpio = extra.nombre.trim();
                                }

                                if (!nombreExtraLimpio) continue;

                                // Mismo fix anti-doble-descuento en reversa: si la opción era la "isDefault",
                                // nunca se descontó por este motor, así que tampoco debe devolverse aquí.
                                if (extra.tipo === 'grupo_obligatorio' || extra.tipo === 'grupo_opcional') {
                                    const yaEnRecetaBase = await db.query(
                                        `SELECT 1 FROM recetas r
                                        JOIN insumos i2 ON r.insumo_id = i2.id AND i2.empresa_id = $4
                                        WHERE r.producto_id = $1
                                        AND r.empresa_id = $4
                                        AND (r.sabor_nombre IS NULL OR LOWER(TRIM(r.sabor_nombre)) = ANY($2::text[]))
                                        AND LOWER(TRIM(i2.nombre)) = LOWER(TRIM($3))
                                        LIMIT 1`,
                                        [pId, arrayVariaciones, nombreExtraLimpio, empresaId] // 🆕 TENANT: $4
                                    );
                                    if (yaEnRecetaBase.rows.length > 0) {
                                        continue; // Nunca se descontó por este motor, no debe devolverse aquí.
                                    }
                                }

                                // 👇 FIX: Igual que en crearPedido, filtramos también por Clasificación para
                                // evitar colisión entre ingredientes homónimos de distintas categorías.
                                const ingRes = await db.query(
                                    `SELECT ci.id FROM catalogo_ingredientes ci
                                    JOIN clasificaciones c ON ci.clasificacion_id = c.id AND c.empresa_id = $3
                                    WHERE LOWER(TRIM(ci.nombre)) = LOWER(TRIM($1))
                                    AND LOWER(TRIM(c.nombre)) = LOWER(TRIM($2))
                                    AND ci.empresa_id = $3
                                    LIMIT 1`,
                                    [nombreExtraLimpio, item.categoria, empresaId] // 🆕 TENANT: $3
                                );

                                if (ingRes.rows.length > 0) {
                                    const ingredienteId = ingRes.rows[0].id;
                                    const recursiveQueryExtra = `
                                        WITH RECURSIVE Explosion AS (
                                            SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                                            FROM recetas r WHERE r.ingrediente_id = $2 AND r.empresa_id = $3
                                            UNION ALL
                                            SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                                            FROM Explosion e
                                            JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $3
                                            JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $3
                                            WHERE e.sub_producto_id IS NOT NULL
                                        )
                                        UPDATE insumos SET stock_actual = stock_actual + calc.total_devolver FROM (
                                            SELECT insumo_id, SUM(qty_factor) as total_devolver FROM Explosion WHERE insumo_id IS NOT NULL GROUP BY insumo_id
                                        ) calc WHERE insumos.id = calc.insumo_id AND insumos.empresa_id = $3;
                                    `; // 🔒 FILTRO EMPRESA — Motor Recursivo #4 (reverso del #2)
                                    await db.query(recursiveQueryExtra, [cantidadDevuelta, ingredienteId, empresaId]); // 🆕 TENANT: $3
                                }
                            }
                        }
                    }
                }
            }
        }

        if (pedidoActual.cliente_id && estadoReal !== 'Cancelado') {
            // 👇 FIX CRÍTICO: Los puntos de lealtad SOLO se otorgan cuando el dinero
            // realmente entró (metodo_pago real), nunca por inferencia del estado_preparacion.
            // Antes, una mesa "Entregada" sin cobrar (cuenta abierta) ya generaba puntos,
            // aunque el cliente todavía no hubiera pagado nada.
            const yaEstabaPagado = ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto', 'Puntos'].includes(pedidoPrevio.metodo_pago);
            const ahoraEstaPagado = isPagadoDinero;
            
            if (!yaEstabaPagado && ahoraEstaPagado) {
                try {
                    const confRes = await db.query('SELECT * FROM configuracion WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
                    if (confRes.rows.length > 0) {
                        const config = confRes.rows[0];
                        if (config.puntos_activos === true || config.puntos_activos === 'true' || config.puntos_activos === undefined) {
                            const porcentaje = config.puntos_porcentaje !== undefined ? Number(config.puntos_porcentaje) : 10;
                            const valorPeso = config.puntos_valor_peso !== undefined ? Number(config.puntos_valor_peso) : 1;
                            
                            let totalElegible = 0;
                            const carritoItems = typeof pedidoActual.carrito === 'string' ? JSON.parse(pedidoActual.carrito) : pedidoActual.carrito;
                            if (carritoItems && carritoItems.length > 0) {
                                for (const item of carritoItems) {
                                    let genera = true;
                                    if (item.id) {
                                        const prodRes = await db.query(`SELECT p.genera_puntos as p_genera, c.genera_puntos as c_genera FROM productos p LEFT JOIN clasificaciones c ON p.categoria = c.nombre AND c.empresa_id = $2 WHERE p.id = $1 AND p.empresa_id = $2`, [item.id, empresaId]); // 🔒 FILTRO EMPRESA
                                        if (prodRes.rows.length > 0) {
                                            const data = prodRes.rows[0];
                                            if (data.p_genera === false || data.c_genera === false) genera = false;
                                        }
                                    }
                                    if (genera) totalElegible += Number(item.precioFinal || 0) * Number(item.cantidad || 1);
                                }
                            }

                            // 👇 SOLUCIÓN PUNTOS FANTASMAS (Actualizar Estado / Cobrar Cuenta Abierta)
                            // Restar lo que se pagó con puntos para no ganar puntos sobre lo que salió gratis
                            const puntosAplicados = Number(pedidoActual.descuento_puntos) || 0;
                            totalElegible -= (puntosAplicados * valorPeso);
                            if (totalElegible < 0) totalElegible = 0;

                            const puntosAGanar = Math.floor(totalElegible * (porcentaje / 100));
                            if (puntosAGanar > 0) await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2 AND empresa_id = $3', [puntosAGanar, pedidoActual.cliente_id, empresaId]); // 🔒 FILTRO EMPRESA
                        }
                    }
                } catch(e) {}
            }
        }

        // 🆕 FASE 3: el envío de "alerta_pedido_listo" ya NO vive aquí hardcodeado —
        // ahora lo dispara dispararEvento('pedido_listo', ...) más abajo, usando el
        // helper reutilizable enviarPlantillaWhatsApp() para los 3 eventos con
        // plantilla (pedido_listo, repartidor_en_camino, cancelado).

        const io = req.app.get('io');
        if (io) io.to(`empresa_${empresaId}`).emit('pedido_actualizado');

        if (estadoReal === 'Pagado' || estadoReal === 'Por Confirmar') {
            dispararEvento(empresaId, 'pedido_confirmado_cocina', { numero_pedido: pedidoActual.numero_pedido, cliente_id: pedidoActual.cliente_id, pedido: pedidoActual }); // 🆕 FASE 3
        } else if (estadoReal === 'Preparando') {
            dispararEvento(empresaId, 'en_preparacion', { numero_pedido: pedidoActual.numero_pedido, cliente_id: pedidoActual.cliente_id, pedido: pedidoActual }); // 🆕 FASE 3
        } else if (estadoReal === 'Listo') {
            dispararEvento(empresaId, 'pedido_listo', { numero_pedido: pedidoActual.numero_pedido, cliente_id: pedidoActual.cliente_id, pedido: pedidoActual }); // 🆕 FASE 3
        } else if (estadoReal === 'En Camino') {
            dispararEvento(empresaId, 'repartidor_en_camino', { numero_pedido: pedidoActual.numero_pedido, cliente_id: pedidoActual.cliente_id, pedido: pedidoActual }); // 🆕 FASE 3
        } else if (estadoReal === 'Cancelado') {
            dispararEvento(empresaId, 'cancelado', { numero_pedido: pedidoActual.numero_pedido, cliente_id: pedidoActual.cliente_id, pedido: pedidoActual }); // 🆕 FASE 3
        }

        // 🧾 Ticket por WhatsApp (opcional: lo decide el cajero en Caja). Nunca rompe la actualización del pedido.
        let ticketWhatsapp = null;
        if (req.body.enviar_ticket_whatsapp === true) {
            try {
                ticketWhatsapp = await require('../utils/whatsappTicketCaja').enviarTicketPedido(empresaId, id);
            } catch (errTicket) {
                console.error(`⚠️ Ticket por WhatsApp falló (empresa ${empresaId}):`, errTicket.message);
                ticketWhatsapp = { ok: false, motivo: 'envio_fallido' };
            }
        }

        res.json(ticketWhatsapp ? { ...pedidoActual, ticket_whatsapp: ticketWhatsapp } : pedidoActual);
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};

exports.actualizarAlerta = async (req, res) => {
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        let result;
        if (req.body.alerta_cocina !== undefined) {
            result = await db.query('UPDATE pedidos SET alerta_cocina = $1 WHERE id = $2 AND empresa_id = $3 RETURNING *', [req.body.alerta_cocina, req.params.id, empresaId]); // 🔒 FILTRO EMPRESA
        } else {
            result = await db.query('SELECT * FROM pedidos WHERE id = $1 AND empresa_id = $2', [req.params.id, empresaId]); // 🔒 FILTRO EMPRESA
        }

        if (req.body.notificar_cliente && result.rows.length > 0) {
            const p = result.rows[0];
            if (p.cliente_id && typeof notificarCliente !== 'undefined') {
                await notificarCliente(p.cliente_id, '¡Tu Repartidor llegó! 🛵', `Se encuentra afuera de tu domicilio para entregarte la orden #${p.numero_pedido}.`, empresaId); // 🆕 TENANT
            }
        }

        // 🐞 FIX: Faltaba emitir 'pedido_actualizado'. Sin esto, Caja (que no tiene
        // polling de respaldo como sí tiene Cocina.js) nunca se enteraba en vivo de
        // un nuevo "Faltante" reportado por Cocina, ni Cocina se enteraba de la
        // respuesta de Caja, hasta que alguien recargaba la página manualmente (F5).
        const io = req.app.get('io');
        if (io) io.to(`empresa_${empresaId}`).emit('pedido_actualizado');
        
        res.json(result.rows.length > 0 ? result.rows[0] : {});
    } catch (error) {
        console.error("Error al actualizar alerta:", error);
        res.status(500).json({ error: 'Error al actualizar alerta' });
    }
};

exports.obtenerHistorialAuditoria = async (req, res) => {
    const empresaId = req.empresa_id; // 🆕 TENANT
    const { periodo, fecha } = req.query; // 🆕 FIX: antes se ignoraban, traía hasta 3000 pedidos de TODAS las fechas

    try {
        let filtroFecha = '';
        let params = [empresaId];
        let idx = 2;

        if (periodo === 'dia' && fecha) {
            filtroFecha = ` AND (p.fecha_creacion AT TIME ZONE 'America/Mazatlan')::DATE = $${idx}::DATE`;
            params.push(fecha); idx++;
        } else if (periodo === 'mes' && fecha) {
            filtroFecha = ` AND TO_CHAR((p.fecha_creacion AT TIME ZONE 'America/Mazatlan'), 'YYYY-MM') = $${idx}`;
            params.push(fecha.substring(0, 7)); idx++;
        } else if (periodo === 'anio' && fecha) {
            filtroFecha = ` AND TO_CHAR((p.fecha_creacion AT TIME ZONE 'America/Mazatlan'), 'YYYY') = $${idx}`;
            params.push(fecha.substring(0, 4)); idx++;
        }

        const query = `
        SELECT p.*, c.nombre AS cliente_nombre
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id AND c.empresa_id = $1
        WHERE p.empresa_id = $1 ${filtroFecha}
        ORDER BY p.id DESC LIMIT 3000
        `;
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener historial de auditoría:", error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

exports.obtenerPedidosCliente = async (req, res) => {
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const result = await db.query('SELECT * FROM pedidos WHERE cliente_id = $1 AND empresa_id = $2 ORDER BY id DESC LIMIT 50', [req.params.cliente_id, empresaId]); // 🔒 FILTRO EMPRESA
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pedidos del cliente' });
    }
};

// =========================================================
// 🍽️ AGREGAR PLATILLOS A UN PEDIDO EXISTENTE (Opción B: motor de inventario DUPLICADO)
// No modifica ni reutiliza código de crearPedido/actualizarEstado — cero riesgo sobre lo existente.
// Reglas de negocio acordadas:
//  - Bloquea: Cancelado, Liquidado, Finalizado-sin-mesa (genera Nuevo Pedido en su lugar),
//    Finalizado-con-mesa-ya-liberada, y pedidos ya incluidos en un Corte de Caja.
//  - Si NO estaba pagado: solo se suma el total, sin preguntar método de pago.
//  - Si YA estaba pagado: la diferencia se cobra con el método que indique el frontend
//    (metodo_pago_diferencia). Si es el mismo método -> se suma. Si es distinto -> Mixto con desglose.
//  - Respeta la bandera usa_cocina: si hay cocina, reabre el pedido a 'Preparando' para que
//    el nuevo platillo aparezca en el KDS (los ítems viejos, al conservar su 'estado', no reaparecen).
//    Si no hay cocina, el pedido completo pasa/sigue en 'Listo'.
// =========================================================
exports.agregarItemsAPedido = async (req, res) => {
    const { id } = req.params;
    const itemsNuevos = req.body.items;
    const metodoPagoDiferenciaBody = req.body.metodo_pago_diferencia;
    const empresaId = req.empresa_id; // 🆕 TENANT

    if (!itemsNuevos || !Array.isArray(itemsNuevos) || itemsNuevos.length === 0) {
        return res.status(400).json({ error: 'No se recibieron platillos para agregar.' });
    }

    try {
        // 1. Cargar el pedido actual (lectura simple, fuera de transacción, para validar bloqueos primero)
        const pedidoRes = await db.query('SELECT * FROM pedidos WHERE id = $1 AND empresa_id = $2', [id, empresaId]); // 🔒 FILTRO EMPRESA
        if (pedidoRes.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
        const pedido = pedidoRes.rows[0];

        // 2. BLOQUEOS DE NEGOCIO
        if (['Cancelado', 'Liquidado'].includes(pedido.estado_preparacion)) {
            return res.status(400).json({ error: 'No se puede agregar platillos a una orden cancelada o liquidada.' });
        }

        if (pedido.estado_preparacion === 'Finalizado') {
            if (pedido.tipo_consumo !== 'Local') {
                // 🪑 Regla confirmada: sin mesa + Finalizado -> ya no es "agregar", es un pedido nuevo.
                return res.status(400).json({
                    error: 'Esta orden ya fue finalizada. Genera un Nuevo Pedido para este cliente.',
                    requiere_nuevo_pedido: true
                });
            }
            // Local + Finalizado: solo se permite si la mesa SIGUE físicamente ocupada
            // (el cajero no liberó o un nuevo flujo la re-ocupó con el mismo pedido). Si ya
            // está Libre, significa que la mesa realmente se cerró -> también es Nuevo Pedido.
            if (pedido.mesa) {
                const mesaCheck = await db.query('SELECT estado FROM mesas WHERE numero_mesa = $1 AND empresa_id = $2', [pedido.mesa, empresaId]); // 🔒 FILTRO EMPRESA
                const mesaLibre = mesaCheck.rows.length === 0 || mesaCheck.rows[0].estado === 'Libre';
                if (mesaLibre) {
                    return res.status(400).json({
                        error: 'Esta mesa ya fue cerrada y liberada. Genera un Nuevo Pedido.',
                        requiere_nuevo_pedido: true
                    });
                }
            } else {
                return res.status(400).json({
                    error: 'Esta orden ya fue finalizada. Genera un Nuevo Pedido.',
                    requiere_nuevo_pedido: true
                });
            }
        }

        // 3. BLOQUEO POR AUDITORÍA DE CORTE DE CAJA (mismo criterio que usa el frontend)
        try {
            const auditRes = await db.query('SELECT pedidos_incluidos FROM historico_cortes WHERE empresa_id = $1', [empresaId]); // 🔧 FIX: la tabla real es "historico_cortes" (no existe "cortes" en el esquema) + 🔒 FILTRO EMPRESA
            const yaAuditado = auditRes.rows.some(row => {
                try {
                    const inc = typeof row.pedidos_incluidos === 'string' ? JSON.parse(row.pedidos_incluidos) : row.pedidos_incluidos;
                    return Array.isArray(inc) && inc.map(String).includes(String(id));
                } catch (e) { return false; }
            });
            if (yaAuditado) {
                return res.status(400).json({ error: 'Esta orden ya forma parte de un Corte de Caja y no puede modificarse.' });
            }
        } catch (errAudit) {
            // Si el check de auditoría falla por cualquier motivo, no bloqueamos la operación
            // real del negocio — solo lo dejamos registrado en consola para revisión.
            console.error('Aviso: no se pudo verificar auditoría de corte:', errAudit.message);
        }

        // 4. VALIDACIÓN DE STOCK (idéntico patrón al de crearPedido, pero solo para los ítems nuevos)
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const cantRequerida = {};
            for (const item of itemsNuevos) {
                const pId = item.producto_id || item.id;
                if (pId && !isNaN(parseInt(pId))) {
                    const cleanId = parseInt(pId);
                    cantRequerida[cleanId] = (cantRequerida[cleanId] || 0) + (parseInt(item.cantidad) || 1);
                }
            }
            for (const [pId, cant] of Object.entries(cantRequerida)) {
                const checkRes = await client.query('SELECT nombre, usa_stock, stock_preparado FROM productos WHERE id = $1 AND empresa_id = $2', [pId, empresaId]); // 🔒 FILTRO EMPRESA
                if (checkRes.rows.length > 0) {
                    const row = checkRes.rows[0];
                    if (row.usa_stock === true || String(row.usa_stock) === 'true') {
                        const stockActual = parseInt(row.stock_preparado) || 0;
                        if (stockActual < cant) {
                            await client.query('ROLLBACK');
                            return res.status(400).json({ error: `Stock insuficiente para "${row.nombre}". Solo quedan ${stockActual} unidades.` });
                        }
                    }
                }
            }

            // 5. MOTOR DE EXPLOSIÓN DE INVENTARIO (copiado de crearPedido — Opción B, sin tocar el original)
            const tipo_consumo = pedido.tipo_consumo;
            for (const item of itemsNuevos) {
                const pId = item.producto_id || item.id;
                const cantidadVendida = parseInt(item.cantidad) || 1;
                if (!pId || isNaN(parseInt(pId))) continue;

                const ingredientesOmitidos = [];
                (item.extras || []).forEach(ex => {
                    if (ex.tipo === 'base' && String(ex.nombre).startsWith('Sin ')) {
                        ingredientesOmitidos.push(String(ex.nombre).replace('Sin ', '').trim().replace(/\s+/g, ' ').toLowerCase());
                    } else if (ex.tipo === 'sustitucion' && String(ex.nombre).includes(' x ')) {
                        const parts = String(ex.nombre).replace('🔄 Cambio: ', '').split(' x ');
                        if (parts.length === 2) {
                            ingredientesOmitidos.push(parts[0].trim().replace(/\s+/g, ' ').toLowerCase());
                        }
                    }
                });

                const opcionesGrupos = (item.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' || o.tipo === 'grupo_opcional');
                opcionesGrupos.forEach(opt => {
                    const nombreOpcionLimpio = String(opt.nombre).trim().toLowerCase();
                    const fueSeleccionada = (item.extras || []).some(ex => {
                        const isGroupType = ex.tipo === 'grupo_obligatorio' || ex.tipo === 'grupo_opcional';
                        return isGroupType && String(ex.nombre).toLowerCase().includes(nombreOpcionLimpio);
                    });
                    if (!fueSeleccionada) ingredientesOmitidos.push(nombreOpcionLimpio);
                });

                const nombresVariaciones = (item.extras || [])
                    .filter(e => e.tipo === 'variacion')
                    .map(e => String(e.nombre).trim().toLowerCase());
                const arrayVariacionesGlobal = nombresVariaciones.length > 0 ? nombresVariaciones : [null];

                const prodRes = await client.query('SELECT nombre, rendimiento, stock_preparado, usa_stock FROM productos WHERE id = $1 AND empresa_id = $2', [pId, empresaId]); // 🔒 FILTRO EMPRESA

                if (prodRes.rows.length > 0) {
                    const row = prodRes.rows[0];
                    const isUsaStock = row.usa_stock === true || String(row.usa_stock) === 'true';

                    if (isUsaStock) {
                        await client.query('UPDATE productos SET stock_preparado = stock_preparado - $1 WHERE id = $2 AND empresa_id = $3', [cantidadVendida, pId, empresaId]); // 🔒 FILTRO EMPRESA
                    } else {
                        const rendimiento = parseFloat(row.rendimiento) || 1;
                        let lotesADescontar = cantidadVendida / rendimiento;

                        if (lotesADescontar > 0) {
                            const arrayVariaciones = nombresVariaciones.length > 0 ? nombresVariaciones : [null];
                            const esParaLlevar = ['Domicilio', 'Recoger en Local', 'Para llevar'].includes(tipo_consumo);

                            const recursiveQueryPlatillo = `
                                WITH RECURSIVE Explosion AS (
                                    SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                                    FROM recetas r
                                    LEFT JOIN insumos ibase ON r.insumo_id = ibase.id AND ibase.empresa_id = $6
                                    WHERE r.producto_id = $2
                                    AND r.empresa_id = $6
                                    AND (r.sabor_nombre IS NULL OR LOWER(TRIM(r.sabor_nombre)) = ANY($3::text[]))
                                    AND (
                                        array_length($5::text[], 1) IS NULL 
                                        OR ibase.nombre IS NULL 
                                        OR NOT (REGEXP_REPLACE(LOWER(TRIM(ibase.nombre)), '\\s+', ' ', 'g') = ANY($5::text[]))
                                    )
                                    UNION ALL
                                    SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                                    FROM Explosion e
                                    JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $6
                                    JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $6
                                    WHERE e.sub_producto_id IS NOT NULL
                                ),
                                Requeridos AS (
                                    SELECT e.insumo_id, SUM(e.qty_factor) as total_descontar 
                                    FROM Explosion e
                                    LEFT JOIN insumos i_check ON e.insumo_id = i_check.id AND i_check.empresa_id = $6
                                    WHERE e.insumo_id IS NOT NULL 
                                    AND (i_check.descontar_solo_llevando = false OR (i_check.descontar_solo_llevando = true AND $4 = true))
                                    GROUP BY e.insumo_id
                                ),
                                MapeoSustitutos AS (
                                    SELECT 
                                        CASE 
                                            WHEN i.stock_actual <= 0 AND i.insumos_sustitutos IS NOT NULL AND jsonb_array_length(i.insumos_sustitutos) > 0 THEN i.insumos_sustitutos
                                            ELSE jsonb_build_array(i.id)
                                        END as array_ids,
                                        r.total_descontar
                                    FROM Requeridos r
                                    JOIN insumos i ON r.insumo_id = i.id AND i.empresa_id = $6
                                ),
                                TotalesFinales AS (
                                    SELECT CAST(jsonb_array_elements_text(array_ids) AS INTEGER) as final_insumo_id, SUM(total_descontar) as qty
                                    FROM MapeoSustitutos GROUP BY final_insumo_id
                                )
                                UPDATE insumos i SET stock_actual = i.stock_actual - t.qty
                                FROM TotalesFinales t WHERE i.id = t.final_insumo_id AND i.empresa_id = $6;
                            `; // 🔒 FILTRO EMPRESA — Motor Recursivo #5 (duplicado del #1 para items agregados)
                            const arrayOmitidos = ingredientesOmitidos.length > 0 ? ingredientesOmitidos : [];
                            await client.query(recursiveQueryPlatillo, [lotesADescontar, pId, arrayVariaciones, esParaLlevar, arrayOmitidos, empresaId]); // 🆕 TENANT: $6
                        }
                    }

                    if (item.extras && item.extras.length > 0) {
                        for (const extra of item.extras) {
                            if (['grupo_opcional', 'grupo_obligatorio', 'extra', 'sustitucion'].includes(extra.tipo)) {
                                let nombreExtraLimpio = '';
                                if (extra.tipo === 'sustitucion') {
                                    nombreExtraLimpio = extra.nombre.split(' x ')[1]?.trim();
                                } else if (extra.tipo === 'extra') {
                                    nombreExtraLimpio = extra.nombre.replace('[Agregado] ', '').replace('🔸 ', '').replace('Extra ', '').trim();
                                } else if (extra.nombre.includes(': ')) {
                                    nombreExtraLimpio = extra.nombre.split(': ')[1].trim();
                                } else {
                                    nombreExtraLimpio = extra.nombre.trim();
                                }

                                if (!nombreExtraLimpio) continue;

                                if (extra.tipo === 'grupo_obligatorio' || extra.tipo === 'grupo_opcional') {
                                    const yaEnRecetaBase = await client.query(
                                        `SELECT 1 FROM recetas r
                                        JOIN insumos i2 ON r.insumo_id = i2.id AND i2.empresa_id = $4
                                        WHERE r.producto_id = $1
                                        AND r.empresa_id = $4
                                        AND (r.sabor_nombre IS NULL OR LOWER(TRIM(r.sabor_nombre)) = ANY($2::text[]))
                                        AND LOWER(TRIM(i2.nombre)) = LOWER(TRIM($3))
                                        LIMIT 1`,
                                        [pId, arrayVariacionesGlobal, nombreExtraLimpio, empresaId] // 🆕 TENANT: $4
                                    );
                                    if (yaEnRecetaBase.rows.length > 0) continue;
                                }

                                const ingRes = await client.query(
                                    `SELECT ci.id FROM catalogo_ingredientes ci
                                    JOIN clasificaciones c ON ci.clasificacion_id = c.id AND c.empresa_id = $3
                                    WHERE LOWER(TRIM(ci.nombre)) = LOWER(TRIM($1))
                                    AND LOWER(TRIM(c.nombre)) = LOWER(TRIM($2))
                                    AND ci.empresa_id = $3
                                    LIMIT 1`,
                                    [nombreExtraLimpio, item.categoria, empresaId] // 🆕 TENANT: $3
                                );

                                if (ingRes.rows.length > 0) {
                                    const ingredienteId = ingRes.rows[0].id;
                                    const esParaLlevarExtra = ['Domicilio', 'Recoger en Local', 'Para llevar'].includes(tipo_consumo);

                                    const recursiveQueryExtra = `
                                        WITH RECURSIVE Explosion AS (
                                            SELECT r.insumo_id, r.sub_producto_id, (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                                            FROM recetas r WHERE r.ingrediente_id = $2 AND r.empresa_id = $4
                                            UNION ALL
                                            SELECT r.insumo_id, r.sub_producto_id, ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                                            FROM Explosion e
                                            JOIN productos p ON e.sub_producto_id = p.id AND p.empresa_id = $4
                                            JOIN recetas r ON r.producto_id = p.id AND r.empresa_id = $4
                                            WHERE e.sub_producto_id IS NOT NULL
                                        ),
                                        Requeridos AS (
                                            SELECT e.insumo_id, SUM(e.qty_factor) as total_descontar 
                                            FROM Explosion e
                                            LEFT JOIN insumos i_check ON e.insumo_id = i_check.id AND i_check.empresa_id = $4
                                            WHERE e.insumo_id IS NOT NULL 
                                            AND (i_check.descontar_solo_llevando = false OR (i_check.descontar_solo_llevando = true AND $3 = true))
                                            GROUP BY e.insumo_id
                                        ),
                                        MapeoSustitutos AS (
                                            SELECT 
                                                CASE 
                                                    WHEN i.stock_actual <= 0 AND i.insumos_sustitutos IS NOT NULL AND jsonb_array_length(i.insumos_sustitutos) > 0 THEN i.insumos_sustitutos
                                                    ELSE jsonb_build_array(i.id)
                                                END as array_ids, 
                                                r.total_descontar
                                            FROM Requeridos r JOIN insumos i ON r.insumo_id = i.id AND i.empresa_id = $4
                                        ),
                                        TotalesFinales AS (
                                            SELECT CAST(jsonb_array_elements_text(array_ids) AS INTEGER) as final_insumo_id, SUM(total_descontar) as qty 
                                            FROM MapeoSustitutos GROUP BY final_insumo_id
                                        )
                                        UPDATE insumos i SET stock_actual = i.stock_actual - t.qty FROM TotalesFinales t WHERE i.id = t.final_insumo_id AND i.empresa_id = $4;
                                    `; // 🔒 FILTRO EMPRESA aplicado en TODOS los niveles de la recursión
                                    await client.query(recursiveQueryExtra, [cantidadVendida, ingredienteId, esParaLlevarExtra, empresaId]); // 🆕 TENANT: $4
                                }
                            }
                        }
                    }
                }
            }

            // 5b. EMPAQUES GLOBALES (copiado de crearPedido), evaluado solo sobre los ítems nuevos
            const esParaLlevarGlobal = ['Domicilio', 'Recoger en Local', 'Para llevar'].includes(tipo_consumo);
            const empaquesGlobalesRes = await client.query(`
                SELECT id, regla_empaque_global, stock_actual, insumos_sustitutos 
                FROM insumos 
                WHERE es_empaque_global = true AND empresa_id = $2 AND (descontar_solo_llevando = false OR (descontar_solo_llevando = true AND $1 = true))
            `, [esParaLlevarGlobal, empresaId]); // 🔒 FILTRO EMPRESA

            for (const empG of empaquesGlobalesRes.rows) {
                const regla = typeof empG.regla_empaque_global === 'string' ? JSON.parse(empG.regla_empaque_global) : (empG.regla_empaque_global || {});
                const categoriasAplicables = regla.categorias_aplicables || [];
                const divisor = Number(regla.regla_divisor) || 1;

                if (categoriasAplicables.length > 0) {
                    let itemsAplicables = 0;
                    for (const item of itemsNuevos) {
                        if (categoriasAplicables.includes(item.categoria)) {
                            itemsAplicables += (parseInt(item.cantidad) || 1);
                        }
                    }
                    if (itemsAplicables > 0) {
                        const piezasADescontar = Math.ceil(itemsAplicables / divisor);
                        let targetId = empG.id;
                        if (empG.stock_actual <= 0 && empG.insumos_sustitutos && empG.insumos_sustitutos.length > 0) {
                            targetId = empG.insumos_sustitutos[0];
                        }
                        await client.query('UPDATE insumos SET stock_actual = stock_actual - $1 WHERE id = $2 AND empresa_id = $3', [piezasADescontar, targetId, empresaId]); // 🔒 FILTRO EMPRESA
                    }
                }
            }

            // 6. FUSIÓN DE CARRITO: los ítems viejos NO se tocan (conservan su 'estado' tal cual,
            // por eso no reaparecen en Cocina). Los nuevos se agregan sin 'estado' (nacen 'Pendiente').
            const carritoViejo = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);
            const carritoFinal = [...carritoViejo, ...itemsNuevos];

            const diferencia = itemsNuevos.reduce((sum, i) => sum + (Number(i.precioFinal || 0) * (Number(i.cantidad) || 1)), 0);
            const nuevoTotal = Number(pedido.total || 0) + diferencia;

            // 7. ESTADO DE PREPARACIÓN: respeta la bandera usa_cocina
            let usaCocina = true;
            try {
                const confOpRes = await client.query('SELECT usa_cocina FROM configuracion_operativa WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA ⚠️ Depende de la migración futura de configOperativaCtrl.js (tarea 14)
                usaCocina = confOpRes.rows.length === 0 ? true : (confOpRes.rows[0].usa_cocina !== false);
            } catch (e) { /* default usaCocina = true */ }

            let estadoFinal = pedido.estado_preparacion;
            if (usaCocina) {
                // Si el pedido ya había avanzado (Listo/Entregado/Finalizado-con-mesa-aún-ocupada),
                // lo reabrimos a 'Preparando' para que el platillo nuevo entre a Cocina.
                if (['Listo', 'Entregado', 'Finalizado'].includes(pedido.estado_preparacion)) {
                    estadoFinal = 'Preparando';
                }
                // Si seguía 'Pendiente' o 'Preparando', se queda igual.
            } else {
                // Sin cocina, el pedido completo vive en 'Listo' (salvo que siga 'Pendiente' por cobrar/confirmar).
                estadoFinal = pedido.estado_preparacion === 'Pendiente' ? 'Pendiente' : 'Listo';
            }

            // 8. MÉTODO DE PAGO / PAGOS MIXTOS (matriz de escenarios A-I acordada)
            const metodosPagados = ['Efectivo', 'Tarjeta', 'Transferencia', 'Puntos', 'Mixto'];
            const yaEstabaPagado = metodosPagados.includes(pedido.metodo_pago);

            let metodoPagoFinal = pedido.metodo_pago;
            let pagosMixtosFinal = pedido.pagos_mixtos;

            if (yaEstabaPagado && metodoPagoDiferenciaBody) {
                if (pedido.metodo_pago === 'Mixto') {
                    let desglose = [];
                    try {
                        desglose = typeof pedido.pagos_mixtos === 'string' ? JSON.parse(pedido.pagos_mixtos) : (pedido.pagos_mixtos || []);
                    } catch (e) { desglose = []; }

                    const idxExistente = desglose.findIndex(p => p.metodo === metodoPagoDiferenciaBody);
                    if (idxExistente >= 0) {
                        desglose[idxExistente].monto = Number(desglose[idxExistente].monto) + diferencia;
                    } else {
                        desglose.push({ metodo: metodoPagoDiferenciaBody, monto: diferencia });
                    }
                    pagosMixtosFinal = JSON.stringify(desglose);
                    metodoPagoFinal = 'Mixto';
                } else if (metodoPagoDiferenciaBody !== pedido.metodo_pago) {
                    // Método distinto al original -> se convierte en Mixto con desglose de ambos montos
                    const desglose = [
                        { metodo: pedido.metodo_pago, monto: Number(pedido.total || 0) },
                        { metodo: metodoPagoDiferenciaBody, monto: diferencia }
                    ];
                    pagosMixtosFinal = JSON.stringify(desglose);
                    metodoPagoFinal = 'Mixto';
                }
                // Si es el mismo método -> no se toca metodo_pago/pagos_mixtos, solo sube el total.
            }
            // Si NO estaba pagado (Pendiente/Por Cobrar/Comida Personal) -> no se toca metodo_pago, solo sube el total.

            // 9. ACTUALIZAR EL PEDIDO
            const updateRes = await client.query(
                `UPDATE pedidos SET carrito = $1, total = $2, estado_preparacion = $3, metodo_pago = $4, pagos_mixtos = $5 WHERE id = $6 AND empresa_id = $7 RETURNING *`, // 🔒 FILTRO EMPRESA
                [JSON.stringify(carritoFinal), nuevoTotal, estadoFinal, metodoPagoFinal, pagosMixtosFinal, id, empresaId] // 🆕 TENANT: $7
            );

            // 10. Reafirmar la mesa como Ocupada (defensivo, por si quedó Libre de un Finalizado previo)
            if (pedido.mesa) {
                await client.query("UPDATE mesas SET estado = 'Ocupada', pedido_actual_id = $1 WHERE numero_mesa = $2 AND empresa_id = $3", [id, pedido.mesa, empresaId]); // 🔒 FILTRO EMPRESA
            }

            await client.query('COMMIT');

            const io = req.app.get('io');
            if (io) {
                io.to(`empresa_${empresaId}`).emit('catalogo_actualizado'); // solo la sala de ESTA empresa
                io.to(`empresa_${empresaId}`).emit('pedido_actualizado');   // Cocina/Caja de ESTA empresa refrescan en vivo
            }

            res.json({ pedido: updateRes.rows[0], diferencia, items_agregados: itemsNuevos.length });

        } catch (errorTx) {
            await client.query('ROLLBACK');
            console.error("Error al agregar platillos al pedido:", errorTx);
            res.status(500).json({ error: 'Error en el servidor al agregar los platillos.' });
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Error al agregar platillos al pedido:", error);
        res.status(500).json({ error: 'Error en el servidor al agregar los platillos.' });
    }
};