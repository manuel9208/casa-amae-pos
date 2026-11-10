// BackEnd/config/migracionOmnicanal.js
// =========================================================================
// 🤖📱 MIGRACIÓN AISLADA DEL MÓDULO OMNICANAL
// Cada paso corre en su propio db.query(): un fallo NO revierte a los demás
// (a diferencia del Bloque B, que es una sola transacción implícita).
// Todo es idempotente (IF NOT EXISTS).
// =========================================================================
const db = require('./db');

const PASOS = [
  {
    nombre: 'empresas.notificaciones_push (candado comercial de push)',
    sql: `ALTER TABLE empresas ADD COLUMN IF NOT EXISTS notificaciones_push BOOLEAN DEFAULT true;`
  },
  {
    // 🔒 Soporte del ON CONFLICT (device_id, empresa_id) de equipoController.registrarEquipo
    nombre: 'índice único equipos_autorizados(device_id, empresa_id)',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_equipos_device_empresa
          ON equipos_autorizados(device_id, empresa_id);`
  },
  {
    nombre: 'whatsapp_configuraciones.webhook_secret (360dialog)',
    sql: `ALTER TABLE whatsapp_configuraciones ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64);`
  },
  {
    nombre: 'índice único webhook_secret',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_config_webhook_secret
          ON whatsapp_configuraciones(webhook_secret) WHERE webhook_secret IS NOT NULL;`
  },
  {
    nombre: 'tabla whatsapp_sesiones (Baileys)',
    sql: `CREATE TABLE IF NOT EXISTS whatsapp_sesiones (
            empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
            session_id VARCHAR(255) NOT NULL,
            datos JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (empresa_id, session_id)
          );`
  },
  {
    nombre: 'ia_configuracion.kiosco_ia_activo',
    sql: `ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS kiosco_ia_activo BOOLEAN DEFAULT false;`
  },
  {
    nombre: 'whatsapp_configuraciones.ia_habilitada',
    sql: `ALTER TABLE whatsapp_configuraciones ADD COLUMN IF NOT EXISTS ia_habilitada BOOLEAN DEFAULT false;`
  },
  {
    nombre: 'whatsapp_configuraciones.dialog360_token',
    sql: `ALTER TABLE whatsapp_configuraciones ADD COLUMN IF NOT EXISTS dialog360_token TEXT DEFAULT '';`
  },
  {
    nombre: 'whatsapp_configuraciones.nombre_agente',
    sql: `ALTER TABLE whatsapp_configuraciones ADD COLUMN IF NOT EXISTS nombre_agente VARCHAR(50) DEFAULT 'Ana';`
  },
  {
    // 🔒 El webhook de Meta resuelve la empresa SOLO por este ID: no puede repetirse entre negocios.
    nombre: 'índice único whatsapp_configuraciones.meta_phone_id',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_config_meta_phone_unico
          ON whatsapp_configuraciones(meta_phone_id)
          WHERE meta_phone_id IS NOT NULL AND meta_phone_id <> '';`
  },
  {
    nombre: 'omnichannel_chats.empresa_id',
    sql: `ALTER TABLE omnichannel_chats ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);`
  },
  {
    // Para la ventana de 24 h de Meta y el contador de no leídos del panel de Caja (Fase 5)
    nombre: 'omnichannel_chats.ultimo_mensaje_cliente',
    sql: `ALTER TABLE omnichannel_chats ADD COLUMN IF NOT EXISTS ultimo_mensaje_cliente TIMESTAMP;`
  },
  {
    nombre: 'omnichannel_chats.no_leidos',
    sql: `ALTER TABLE omnichannel_chats ADD COLUMN IF NOT EXISTS no_leidos INTEGER DEFAULT 0;`
  },
  {
    nombre: 'índice omnichannel_chats (empresa, último mensaje)',
    sql: `CREATE INDEX IF NOT EXISTS idx_omni_chats_empresa_ultimo
          ON omnichannel_chats(empresa_id, ultimo_mensaje DESC);`
  }
];

exports.migrarOmnicanal = async () => {
  let fallos = 0;
  for (const paso of PASOS) {
    try {
      await db.query(paso.sql);
    } catch (error) {
      fallos++;
      console.error(`🚨 [OMNICANAL] Falló "${paso.nombre}":`, error.message);
    }
  }
  console.log(fallos === 0
    ? '✅ [OMNICANAL] Migración aislada aplicada correctamente.'
    : `⚠️ [OMNICANAL] Migración terminada con ${fallos} paso(s) fallido(s). Revisa los logs de arriba.`);
};