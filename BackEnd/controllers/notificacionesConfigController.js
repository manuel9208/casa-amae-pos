// BackEnd/controllers/notificacionesConfigController.js
// =========================================================================
// 🔔 CATÁLOGO DE NOTIFICACIONES — Eventos × Roles × Canales (por empresa)
// -------------------------------------------------------------------------
// Módulo 100% AISLADO (no toca la tabla "configuracion"). El propio negocio
// decide, evento por evento, qué rol recibe push interno y si el cliente
// recibe push y/o WhatsApp. Los defaults reflejan el comportamiento actual
// del sistema (ver pedidoController.js) para no sorprender a nadie al migrar.
//
// Los candados comerciales (empresas.whatsapp_pedidos_ia / whatsapp_notificaciones)
// siguen viviendo en AdminEmpresas.js — aquí solo se LEEN de forma read-only
// para saber si el negocio puede tocar la columna "Cliente WhatsApp".
// =========================================================================

const db = require('../config/db');

// Roles/canales válidos — whitelist estricta (igual patrón que FLAGS_WHATSAPP_PERMITIDOS)
const ROLES_PERMITIDOS = [
  'admin', 'gerente', 'cajero', 'chef', 'cocina', 'ayudante_cocina',
  'repartidor', 'cliente_push', 'cliente_whatsapp'
];

// Catálogo de eventos válidos + su configuración DEFAULT (= comportamiento actual del sistema)
const EVENTOS_DEFAULT = {
  pedido_nuevo: {
    destinatarios: { admin: true, gerente: true, cajero: true, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: true, cliente_whatsapp: false },
    mensaje_staff: '¡Nuevo Pedido! #{{numero_pedido}} acaba de llegar.',
    mensaje_cliente_push: 'Orden Recibida 🕒 Tu orden #{{numero_pedido}} está en espera de confirmación.',
    mensaje_cliente_whatsapp: null
  },
  pedido_directo_cocina: {
    destinatarios: { admin: true, gerente: true, cajero: true, chef: true, cocina: true, ayudante_cocina: true, repartidor: false, cliente_push: true, cliente_whatsapp: false },
    mensaje_staff: '👨‍🍳 Nueva Comanda (Comedor): La orden #{{numero_pedido}} entró directo a cocina.',
    mensaje_cliente_push: 'Orden Confirmada ✅ Tu orden #{{numero_pedido}} ha sido recibida y enviada a cocina.',
    mensaje_cliente_whatsapp: null
  },
  pedido_confirmado_cocina: {
    destinatarios: { admin: true, gerente: true, cajero: true, chef: true, cocina: true, ayudante_cocina: true, repartidor: false, cliente_push: true, cliente_whatsapp: false },
    mensaje_staff: '👨‍🍳 Nueva Comanda: La orden #{{numero_pedido}} está lista para prepararse.',
    mensaje_cliente_push: 'Orden Confirmada ✅ Tu orden #{{numero_pedido}} ha sido autorizada y enviada a cocina.',
    mensaje_cliente_whatsapp: null
  },
  en_preparacion: {
    destinatarios: { admin: true, gerente: true, cajero: true, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: true, cliente_whatsapp: false },
    mensaje_staff: 'Preparando Orden: Cocina comenzó a preparar la orden #{{numero_pedido}}.',
    mensaje_cliente_push: '¡En el fuego! 🔥 El chef ya está preparando tu orden #{{numero_pedido}}.',
    mensaje_cliente_whatsapp: null
  },
  pedido_listo: {
    destinatarios: { admin: true, gerente: true, cajero: true, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: true, cliente_whatsapp: true },
    mensaje_staff: 'Orden Lista ✅ Cocina terminó la orden #{{numero_pedido}}.',
    mensaje_cliente_push: '¡Tu comida está lista! 🍔 Tu orden #{{numero_pedido}} está lista para entregar.',
    mensaje_cliente_whatsapp: 'Hola, tu pedido #{{numero_pedido}} en {{nombre_negocio}} está listo. {{instruccion_entrega}}'
  },
  asignado_repartidor: {
    destinatarios: { admin: false, gerente: false, cajero: false, chef: false, cocina: false, ayudante_cocina: false, repartidor: true, cliente_push: false, cliente_whatsapp: false },
    mensaje_staff: 'Se te asignó el pedido #{{numero_pedido}}.',
    mensaje_cliente_push: null,
    mensaje_cliente_whatsapp: null
  },
  repartidor_en_camino: {
    destinatarios: { admin: false, gerente: false, cajero: false, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: true, cliente_whatsapp: true },
    mensaje_staff: null,
    mensaje_cliente_push: '¡Orden en Camino! 🛵 El repartidor ya va hacia tu domicilio con tu pedido.',
    mensaje_cliente_whatsapp: 'Hola, tu pedido #{{numero_pedido}} de {{nombre_negocio}} ya va en camino 🛵'
  },
  entregado: {
    destinatarios: { admin: false, gerente: false, cajero: false, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: false, cliente_whatsapp: false },
    mensaje_staff: null,
    mensaje_cliente_push: 'Pedido entregado, ¡gracias por tu compra!',
    mensaje_cliente_whatsapp: 'Gracias por tu compra en {{nombre_negocio}} 🙌 Esperamos verte pronto.'
  },
  cancelado: {
    destinatarios: { admin: true, gerente: true, cajero: true, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: false, cliente_whatsapp: true },
    mensaje_staff: 'Pedido #{{numero_pedido}} cancelado.',
    mensaje_cliente_push: null,
    mensaje_cliente_whatsapp: 'Tu pedido #{{numero_pedido}} en {{nombre_negocio}} fue cancelado. Contáctanos si tienes dudas.'
  },
  factura_recibida: {
    destinatarios: { admin: true, gerente: true, cajero: false, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: false, cliente_whatsapp: false },
    mensaje_staff: '🧾 Nueva Factura Recibida de {{proveedor_nombre}}. Pendiente de revisión.',
    mensaje_cliente_push: null,
    mensaje_cliente_whatsapp: null
  },
  factura_pagada: {
    destinatarios: { admin: true, gerente: true, cajero: false, chef: false, cocina: false, ayudante_cocina: false, repartidor: false, cliente_push: false, cliente_whatsapp: false },
    mensaje_staff: '✅ Factura de {{proveedor_nombre}} pagada por ${{monto}}.',
    mensaje_cliente_push: null,
    mensaje_cliente_whatsapp: null
  }
};

const EVENTOS_VALIDOS = Object.keys(EVENTOS_DEFAULT);

// =========================================================================
// 🛡️ AUTO-CREACIÓN DE TABLA (módulo aislado, mismo patrón que ia_configuracion)
// =========================================================================
exports.inicializarTablaNotificaciones = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_configuracion (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER REFERENCES empresas(id),
        evento VARCHAR(50) NOT NULL,
        destinatarios JSONB DEFAULT '{}'::jsonb,
        mensaje_staff TEXT DEFAULT NULL,
        mensaje_cliente_push TEXT DEFAULT NULL,
        mensaje_cliente_whatsapp TEXT DEFAULT NULL,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(empresa_id, evento)
      );
    `);
    console.log('✅ Tabla "notificaciones_configuracion" verificada/creada correctamente.');
  } catch (error) {
    console.error('🚨 Error al verificar/crear "notificaciones_configuracion":', error);
  }
};

// =========================================================================
// HELPER INTERNO: fusiona lo guardado en BD con los defaults (para que un
// evento nunca editado por el negocio siga funcionando con el comportamiento
// actual del sistema, sin necesitar una fila sembrada de antemano).
// =========================================================================
const fusionarConDefaults = (filasGuardadas) => {
  const mapaGuardado = {};
  filasGuardadas.forEach(fila => { mapaGuardado[fila.evento] = fila; });

  const resultado = {};
  EVENTOS_VALIDOS.forEach(evento => {
    const guardado = mapaGuardado[evento];
    const base = EVENTOS_DEFAULT[evento];
    resultado[evento] = {
      destinatarios: guardado?.destinatarios || base.destinatarios,
      mensaje_staff: guardado?.mensaje_staff ?? base.mensaje_staff,
      mensaje_cliente_push: guardado?.mensaje_cliente_push ?? base.mensaje_cliente_push,
      mensaje_cliente_whatsapp: guardado?.mensaje_cliente_whatsapp ?? base.mensaje_cliente_whatsapp,
      personalizado: !!guardado
    };
  });
  return resultado;
};

// =========================================================================
// GET /notificaciones-config — catálogo completo + flags comerciales (solo lectura)
// =========================================================================
exports.obtenerConfiguracionNotificaciones = async (req, res) => {
  const empresaId = req.empresa_id;
  try {
    const flagsRes = await db.query(
      'SELECT whatsapp_pedidos_ia, whatsapp_notificaciones FROM empresas WHERE id = $1',
      [empresaId]
    );
    const flags = flagsRes.rows[0] || { whatsapp_pedidos_ia: false, whatsapp_notificaciones: false };

    const filasRes = await db.query(
      'SELECT evento, destinatarios, mensaje_staff, mensaje_cliente_push, mensaje_cliente_whatsapp FROM notificaciones_configuracion WHERE empresa_id = $1',
      [empresaId]
    );

    const eventos = fusionarConDefaults(filasRes.rows);
    res.json({ success: true, flags, eventos });
  } catch (error) {
    console.error('🚨 Error al obtener configuración de notificaciones:', error);
    res.status(500).json({ error: 'No se pudo obtener la configuración de notificaciones.' });
  }
};

// =========================================================================
// PUT /notificaciones-config/:evento — actualiza UN evento (upsert)
// =========================================================================
exports.actualizarConfiguracionEvento = async (req, res) => {
  const empresaId = req.empresa_id;
  const { evento } = req.params;
  const { destinatarios, mensaje_staff, mensaje_cliente_push, mensaje_cliente_whatsapp } = req.body;

  if (!EVENTOS_VALIDOS.includes(evento)) {
    return res.status(400).json({ error: `Evento no reconocido. Usa uno de: ${EVENTOS_VALIDOS.join(', ')}` });
  }
  if (!destinatarios || typeof destinatarios !== 'object') {
    return res.status(400).json({ error: 'Formato de destinatarios inválido.' });
  }

  try {
    // 🔒 CANDADO REAL (no solo visual): si el negocio no tiene el extra de
    // notificaciones WhatsApp habilitado por el superadmin, se fuerza
    // cliente_whatsapp = false sin importar lo que mande el frontend.
    const flagsRes = await db.query('SELECT whatsapp_notificaciones FROM empresas WHERE id = $1', [empresaId]);
    const tieneWhatsappHabilitado = !!flagsRes.rows[0]?.whatsapp_notificaciones;

    const destinatariosLimpios = {};
    ROLES_PERMITIDOS.forEach(rol => {
      if (rol === 'cliente_whatsapp' && !tieneWhatsappHabilitado) {
        destinatariosLimpios[rol] = false; // ignora cualquier intento de activarlo
      } else {
        destinatariosLimpios[rol] = !!destinatarios[rol];
      }
    });

    await db.query(`
      INSERT INTO notificaciones_configuracion
        (empresa_id, evento, destinatarios, mensaje_staff, mensaje_cliente_push, mensaje_cliente_whatsapp, actualizado_en)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (empresa_id, evento) DO UPDATE SET
        destinatarios = $3::jsonb,
        mensaje_staff = $4,
        mensaje_cliente_push = $5,
        mensaje_cliente_whatsapp = $6,
        actualizado_en = CURRENT_TIMESTAMP
    `, [
      empresaId, evento, JSON.stringify(destinatariosLimpios),
      mensaje_staff || null, mensaje_cliente_push || null, mensaje_cliente_whatsapp || null
    ]);

    res.json({ ok: true, evento, destinatarios: destinatariosLimpios });
  } catch (error) {
    console.error('🚨 Error al actualizar configuración de evento:', error);
    res.status(500).json({ error: 'No se pudo actualizar la configuración del evento.' });
  }
};

// =========================================================================
// 🆕 HELPER EXPORTADO (uso interno de otros controladores, Fase 4):
// Resuelve la config final de UN evento para UNA empresa, lista para usarse
// al momento de decidir a quién notificar y con qué mensaje.
// =========================================================================
exports.obtenerConfigEventoInterno = async (empresaId, evento) => {
  if (!EVENTOS_VALIDOS.includes(evento)) return null;
  const filaRes = await db.query(
    'SELECT destinatarios, mensaje_staff, mensaje_cliente_push, mensaje_cliente_whatsapp FROM notificaciones_configuracion WHERE empresa_id = $1 AND evento = $2',
    [empresaId, evento]
  );
  const fusionado = fusionarConDefaults(filaRes.rows.length > 0 ? [{ evento, ...filaRes.rows[0] }] : []);
  return fusionado[evento];
};