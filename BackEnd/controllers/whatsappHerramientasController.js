// BackEnd/controllers/whatsappHerramientasController.js
// =========================================================================
// 🧩 FASE 4 — Las 5 herramientas (function calling) del asistente de pedidos
// por WhatsApp. Cada una replica EXACTO el comportamiento/formato que ya usa
// el Kiosco (ModalPersonalizar.js) para no romper el motor de inventario de
// pedidoController.js (prefijos de "extras" obligatorios, expansión de
// cantidad, contrato del "paquete" de crearPedido).
// =========================================================================

const db = require('../config/db');
const pedidoController = require('./pedidoController');
const { mensajePorEstado } = require('../utils/whatsappHelpers');

// =========================================================================
// Declaración de herramientas en formato Gemini (functionDeclarations)
// =========================================================================
exports.TOOLS_DECLARATION = [
    {
        functionDeclarations: [
            {
                name: 'buscar_producto',
                description: 'Busca un producto del menú por nombre aproximado dicho por el cliente.',
                parameters: {
                    type: 'OBJECT',
                    properties: { nombre_buscado: { type: 'STRING', description: 'Nombre o parte del nombre del producto.' } },
                    required: ['nombre_buscado']
                }
            },
            {
                name: 'obtener_opciones_personalizacion',
                description: 'Obtiene tamaños, sabores, grupos obligatorios/opcionales y extras disponibles para un producto.',
                parameters: {
                    type: 'OBJECT',
                    properties: { producto_id: { type: 'INTEGER', description: 'ID del producto devuelto por buscar_producto.' } },
                    required: ['producto_id']
                }
            },
            {
                name: 'registrar_item_en_conversacion',
                description: 'Guarda un ítem YA COMPLETO (con todas sus opciones resueltas) en el carrito en construcción.',
                parameters: {
                    type: 'OBJECT',
                    properties: { item: { type: 'OBJECT', description: 'Objeto del ítem en formato nuevoItem del Kiosco (producto_id, nombre, categoria, precio_base, precioFinal, cantidad, extras[]).' } },
                    required: ['item']
                }
            },
            {
                name: 'registrar_pedido',
                description: 'Registra el pedido final en el POS. Úsala SOLO cuando el cliente confirme explícitamente que ya es todo.',
                parameters: { type: 'OBJECT', properties: {} }
            },
            {
                name: 'consultar_estado_pedido',
                description: 'Consulta el estado del pedido más reciente de este cliente (no arma carrito nuevo).',
                parameters: { type: 'OBJECT', properties: {} }
            }
        ]
    }
];

// =========================================================================
// 1. buscar_producto
// =========================================================================
exports.buscarProducto = async (empresaId, nombreBuscado) => {
    const termino = `%${String(nombreBuscado || '').trim()}%`;
    const result = await db.query(
        `SELECT p.id, p.nombre, p.descripcion, p.precio_base, p.categoria, p.disponible, p.usa_stock, p.stock_preparado,
                c.disponible as categoria_disponible
         FROM productos p
         LEFT JOIN clasificaciones c ON c.nombre = p.categoria AND c.empresa_id = p.empresa_id
         WHERE p.empresa_id = $1 AND LOWER(p.nombre) LIKE LOWER($2)
         ORDER BY p.id ASC LIMIT 5`,
        [empresaId, termino]
    );
    if (result.rows.length === 0) return { encontrado: false };

    const disponibles = result.rows.filter(p => p.disponible && p.categoria_disponible !== false);
    if (disponibles.length === 0) return { encontrado: false, motivo: 'sin_disponibilidad' };

    const p = disponibles[0];
    if (p.usa_stock && Number(p.stock_preparado) <= 0) return { encontrado: false, motivo: 'sin_stock' };

    return {
        encontrado: true,
        producto_id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio_base: Number(p.precio_base),
        categoria: p.categoria
    };
};

// =========================================================================
// 2. obtener_opciones_personalizacion
// =========================================================================
exports.obtenerOpcionesPersonalizacion = async (empresaId, productoId) => {
    const prodRes = await db.query('SELECT id, nombre, categoria, opciones FROM productos WHERE id = $1 AND empresa_id = $2', [productoId, empresaId]);
    if (prodRes.rows.length === 0) return { existe: false };

    const producto = prodRes.rows[0];
    const opciones = typeof producto.opciones === 'string' ? JSON.parse(producto.opciones || '[]') : (producto.opciones || []);

    // Extras = unión de producto.opciones (tipo='extra') + catalogo_ingredientes,
    // MISMO criterio que ModalPersonalizar.js (Kiosco).
    const extrasCatalogoRes = await db.query(
        `SELECT ci.nombre, ci.precio_extra
         FROM catalogo_ingredientes ci
         LEFT JOIN clasificaciones c ON ci.clasificacion_id = c.id AND c.empresa_id = ci.empresa_id
         WHERE ci.empresa_id = $1 AND ci.permite_extra != false AND (c.nombre = $2 OR ci.tipo = 'extra')`,
        [empresaId, producto.categoria]
    );

    const nombresBase = opciones.filter(o => o.tipo === 'base').map(o => String(o.nombre).trim().toLowerCase());
    const vistos = new Set(nombresBase);
    const extrasUnicos = [];
    opciones.filter(o => o.tipo === 'extra').forEach(o => { vistos.add(String(o.nombre).trim().toLowerCase()); extrasUnicos.push({ nombre: o.nombre, precio_extra: Number(o.precioExtra || 0) }); });
    extrasCatalogoRes.rows.forEach(ex => {
        const key = String(ex.nombre).trim().toLowerCase();
        if (!vistos.has(key)) { vistos.add(key); extrasUnicos.push({ nombre: ex.nombre, precio_extra: Number(ex.precio_extra || 0) }); }
    });

    const gruposObligatorios = {};
    opciones.filter(o => o.tipo === 'grupo_obligatorio').forEach(o => {
        if (!gruposObligatorios[o.categoria]) gruposObligatorios[o.categoria] = [];
        gruposObligatorios[o.categoria].push({ nombre: o.nombre, precio_extra: Number(o.precioExtra || 0), es_default: !!o.isDefault });
    });

    const gruposOpcionales = {};
    opciones.filter(o => o.tipo === 'grupo_opcional').forEach(o => {
        if (!gruposOpcionales[o.categoria]) gruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
        gruposOpcionales[o.categoria].opciones.push({ nombre: o.nombre, precio_extra: Number(o.precioExtra || 0) });
    });

    return {
        existe: true,
        producto_id: producto.id,
        nombre: producto.nombre,
        tamanos: opciones.filter(o => o.categoria === 'Tamaño').map(t => ({ nombre: t.nombre, precio_extra: Number(t.precioExtra || 0), es_default: !!t.isDefault })),
        sabores: opciones.filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño').map(s => ({ nombre: s.nombre, precio_extra: Number(s.precioExtra || 0), es_default: !!s.isDefault })),
        grupos_obligatorios: gruposObligatorios,
        grupos_opcionales: gruposOpcionales,
        ingredientes_base_editables: opciones.filter(o => o.tipo === 'base').map(o => o.nombre), // 🔒 SOLO ofrecer si el cliente pide explícito (regla #3 del System Prompt)
        extras_disponibles: extrasUnicos
    };
};

// =========================================================================
// 3. registrar_item_en_conversacion
// =========================================================================
exports.registrarItemEnConversacion = async (empresaId, telefono, item) => {
    const convRes = await db.query('SELECT carrito_borrador FROM whatsapp_conversaciones WHERE empresa_id = $1 AND telefono = $2', [empresaId, telefono]);
    const carritoActual = convRes.rows.length > 0
        ? (typeof convRes.rows[0].carrito_borrador === 'string' ? JSON.parse(convRes.rows[0].carrito_borrador) : (convRes.rows[0].carrito_borrador || []))
        : [];

    carritoActual.push(item);

    await db.query(`
        INSERT INTO whatsapp_conversaciones (empresa_id, telefono, carrito_borrador, paso_actual, actualizado_en)
        VALUES ($1, $2, $3::jsonb, 'armando_carrito', CURRENT_TIMESTAMP)
        ON CONFLICT (empresa_id, telefono) DO UPDATE SET
            carrito_borrador = $3::jsonb, paso_actual = 'armando_carrito', actualizado_en = CURRENT_TIMESTAMP
    `, [empresaId, telefono, JSON.stringify(carritoActual)]);

    return { ok: true, items_en_carrito: carritoActual.length };
};

// =========================================================================
// Helper interno: reutiliza pedidoController.crearPedido SIN duplicar su
// motor de inventario/puntos/sockets (Principio DRY). Se simula req/res.
// =========================================================================
const invocarCrearPedido = (empresaId, paquete, io) => {
    return new Promise((resolve, reject) => {
        const reqFake = { body: paquete, empresa_id: empresaId, app: { get: (key) => (key === 'io' ? io : null) } };
        const resFake = {
            status: (code) => ({
                json: (data) => (code >= 400 ? reject(new Error(data.error || 'Error al crear el pedido')) : resolve(data))
            }),
            json: (data) => resolve(data)
        };
        pedidoController.crearPedido(reqFake, resFake);
    });
};

// =========================================================================
// 4. registrar_pedido
// =========================================================================
exports.registrarPedido = async (empresaId, telefono, io) => {
    const convRes = await db.query('SELECT carrito_borrador FROM whatsapp_conversaciones WHERE empresa_id = $1 AND telefono = $2', [empresaId, telefono]);
    if (convRes.rows.length === 0) return { ok: false, error: 'No hay ningún carrito en construcción para este número.' };

    const carrito = typeof convRes.rows[0].carrito_borrador === 'string' ? JSON.parse(convRes.rows[0].carrito_borrador) : (convRes.rows[0].carrito_borrador || []);
    if (!carrito || carrito.length === 0) return { ok: false, error: 'El carrito está vacío, no hay nada que registrar.' };

    // 🆕 Misma expansión de cantidad que CheckoutFlujo.js (Kiosco) antes de mandar a crearPedido
    const carritoExpandido = [];
    carrito.forEach(item => {
        const qty = item.cantidad || 1;
        for (let i = 0; i < qty; i++) carritoExpandido.push({ ...item, cantidad: 1, idTicket: `${item.idTicket || Date.now()}_${i}` });
    });

    const total = carrito.reduce((sum, i) => sum + (Number(i.precioFinal || 0) * (Number(i.cantidad) || 1)), 0);

    const clienteRes = await db.query('SELECT id FROM clientes WHERE telefono = $1 AND empresa_id = $2', [telefono, empresaId]);
    const clienteId = clienteRes.rows[0]?.id || null;

    // ⚠️ PENDIENTE DE CONFIRMAR CONTIGO: hoy fijamos 'Recoger en Local' por default
    // porque el System Prompt/herramientas aún no preguntan tipo_consumo (Domicilio/
    // Recoger/Para llevar) ni dirección. Si quieres que el asistente también lo
    // pregunte, hay que: 1) agregar esa pregunta a las reglas del prompt, 2) una
    // herramienta nueva o un campo extra en registrar_pedido para capturarlo.
    const paquete = {
        cliente_id: clienteId,
        tipo_consumo: 'Recoger en Local',
        metodo_pago: 'Pendiente',
        total,
        carrito: carritoExpandido,
        origen: 'WhatsApp', // ⚠️ PENDIENTE DE CONFIRMAR: nuevo valor de "origen", no usado antes en el sistema
        direccion_entrega: clienteId ? '' : `CONTACTO: ${telefono}`,
        descuento_puntos: 0,
        cupon_codigo: null,
        estado_preparacion: 'Por Confirmar',
        mesa: null
    };

    const pedidoCreado = await invocarCrearPedido(empresaId, paquete, io);

    await db.query('DELETE FROM whatsapp_conversaciones WHERE empresa_id = $1 AND telefono = $2', [empresaId, telefono]);

    return { ok: true, numero_pedido: pedidoCreado.numero_pedido };
};

// =========================================================================
// 5. consultar_estado_pedido
// =========================================================================
exports.consultarEstadoPedido = async (empresaId, telefono) => {
    const clienteRes = await db.query('SELECT id FROM clientes WHERE telefono = $1 AND empresa_id = $2', [telefono, empresaId]);
    const clienteId = clienteRes.rows[0]?.id || null;

    const pedidoRes = await db.query(
        `SELECT * FROM pedidos
         WHERE empresa_id = $1
         AND (cliente_id = $2 OR direccion_entrega LIKE '%CONTACTO: ' || $3 || '%')
         ORDER BY id DESC LIMIT 1`,
        [empresaId, clienteId, telefono]
    );

    if (pedidoRes.rows.length === 0) return { encontrado: false };

    return {
        encontrado: true,
        numero_pedido: pedidoRes.rows[0].numero_pedido,
        estado: pedidoRes.rows[0].estado_preparacion,
        mensaje_sugerido: mensajePorEstado(pedidoRes.rows[0])
    };
};