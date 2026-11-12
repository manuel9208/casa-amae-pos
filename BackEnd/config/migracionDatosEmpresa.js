// BackEnd/config/migracionDatosEmpresa.js
// =========================================================================
// 🏢 Tablas de "Datos de la Empresa" (sucursales, contactos, info extra).
// Migración AISLADA (mismo patrón que migrarOmnicanal): cada sentencia va por
// separado (sin transacción implícita) y un fallo aquí NUNCA tumba el servidor.
// Todas las tablas nacen con empresa_id desde el diseño.
// =========================================================================
const db = require('./db');

const SENTENCIAS = [
  `CREATE TABLE IF NOT EXISTS empresa_sucursales (
     id SERIAL PRIMARY KEY,
     empresa_id INTEGER NOT NULL REFERENCES empresas(id),
     nombre VARCHAR(120) NOT NULL,
     direccion TEXT,
     referencias TEXT,
     ciudad_estado VARCHAR(120),
     latitud NUMERIC(9,6),
     longitud NUMERIC(9,6),
     url_mapa TEXT,
     horario_texto TEXT,
     es_principal BOOLEAN NOT NULL DEFAULT false,
     visible_ia BOOLEAN NOT NULL DEFAULT true,
     activo BOOLEAN NOT NULL DEFAULT true,
     orden INTEGER NOT NULL DEFAULT 0,
     creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS idx_empresa_sucursales_empresa ON empresa_sucursales(empresa_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_empresa_sucursal_principal ON empresa_sucursales(empresa_id) WHERE es_principal = true`,

  `CREATE TABLE IF NOT EXISTS empresa_contactos (
     id SERIAL PRIMARY KEY,
     empresa_id INTEGER NOT NULL REFERENCES empresas(id),
     sucursal_id INTEGER REFERENCES empresa_sucursales(id) ON DELETE SET NULL,
     tipo VARCHAR(20) NOT NULL,
     proposito VARCHAR(30) NOT NULL DEFAULT 'general',
     etiqueta VARCHAR(80),
     valor VARCHAR(200) NOT NULL,
     notas TEXT,
     visible_ia BOOLEAN NOT NULL DEFAULT true,
     activo BOOLEAN NOT NULL DEFAULT true,
     orden INTEGER NOT NULL DEFAULT 0,
     creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS idx_empresa_contactos_empresa ON empresa_contactos(empresa_id)`,

  `CREATE TABLE IF NOT EXISTS empresa_info_extra (
     id SERIAL PRIMARY KEY,
     empresa_id INTEGER NOT NULL REFERENCES empresas(id),
     categoria VARCHAR(30) NOT NULL DEFAULT 'general',
     titulo VARCHAR(120) NOT NULL,
     contenido TEXT NOT NULL,
     visible_ia BOOLEAN NOT NULL DEFAULT true,
     activo BOOLEAN NOT NULL DEFAULT true,
     orden INTEGER NOT NULL DEFAULT 0,
     creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS idx_empresa_info_extra_empresa ON empresa_info_extra(empresa_id)`
];

exports.migrarDatosEmpresa = async () => {
  try {
    for (const sql of SENTENCIAS) await db.query(sql);
    console.log('✅ [DATOS-EMPRESA] Tablas verificadas/creadas (sucursales, contactos, info extra).');
  } catch (error) {
    console.error('🚨 [DATOS-EMPRESA] No se pudieron crear las tablas (el servidor continúa):', error.message);
  }
};