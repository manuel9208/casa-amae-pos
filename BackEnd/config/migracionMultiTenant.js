// BackEnd/config/migracionMultiTenant.js
// =========================================================================
// 🏢 MIGRACIÓN CENTRALIZADA MULTI-TENANT
// -------------------------------------------------------------------------
// Única fuente de verdad para:
//   BLOQUE A) Crear las tablas del sistema CON TODOS SUS CAMPOS REALES
//             (definición base + todos los parches ALTER que el código
//             les fue agregando con el tiempo). Esto permite levantar un
//             backend 100% nuevo para un cliente nuevo sin que el primer
//             arranque dependa de ir disparando un ALTER por controlador.
//   BLOQUE B) Agregar la columna "empresa_id" a esas mismas tablas, para
//             los 5 clientes que ya existen y cuyas tablas YA están creadas.
//
// Se ejecuta UNA SOLA VEZ al arrancar el servidor (ver api.js), nunca
// dentro de los controladores en cada request.
//
// Esta lista se va completando de forma incremental, EXACTAMENTE en el
// mismo orden en que vamos auditando/migrando cada controlador. No se
// adelanta a tablas de controladores que todavía no han sido revisados.
//
// 📋 CONTROLADORES YA CUBIERTOS EN ESTA VERSIÓN:
//    - authController.js
//    - configController.js
//    - utils/asistenciaHelper.js (tablas usadas por authController)
//    - utils/mdmValidator.js (tablas usadas por authController)
// =========================================================================

const db = require('./db');

// =========================================================================
// BLOQUE A) CREACIÓN DE TABLAS BASE (para backends/clientes NUEVOS)
// -------------------------------------------------------------------------
// Cada CREATE TABLE ya incluye TODOS los campos reales de producción,
// incluyendo los que antes solo se agregaban vía ALTER TABLE disperso en
// los controladores. Así, un cliente nuevo nace completo desde el día 1.
// =========================================================================
exports.crearTablasBaseSiNoExisten = async () => {
  try {
    await db.query(`
      -- -----------------------------------------------------------------
      -- Tabla: configuracion (dueño: configController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS configuracion (
        id INTEGER PRIMARY KEY DEFAULT 1,
        nombre_negocio VARCHAR(100) DEFAULT 'Mi Restaurante',
        logo_url TEXT,
        whatsapp VARCHAR(20) DEFAULT '6721238015',
        banco VARCHAR(50) DEFAULT 'BBVA Bancomer',
        cuenta VARCHAR(50) DEFAULT '012345678901234567',
        titular VARCHAR(100) DEFAULT 'Restaurante POS SA de CV',
        color_primario VARCHAR(20) DEFAULT '#2563eb',
        color_secundario VARCHAR(20) DEFAULT '#10b981',
        color_fondo VARCHAR(20) DEFAULT '#f1f5f9',
        color_fondo_tarjetas VARCHAR(20) DEFAULT '#ffffff',
        color_texto_principal VARCHAR(20) DEFAULT '#1e293b',
        color_texto_secundario VARCHAR(20) DEFAULT '#64748b',
        fuente_titulos VARCHAR(50) DEFAULT 'system-ui, sans-serif',
        fuente_textos VARCHAR(50) DEFAULT 'system-ui, sans-serif',
        kiosco_mensaje VARCHAR(100) DEFAULT '¿Qué se te antoja hoy?',
        color_texto_kiosco VARCHAR(20) DEFAULT '#1e293b',
        kiosco_pin_maestro VARCHAR(10) DEFAULT '1234',
        tv_msg_cola VARCHAR(50) DEFAULT 'EN COLA',
        tv_msg_progreso VARCHAR(50) DEFAULT 'PREPARANDO',
        tv_msg_listo VARCHAR(50) DEFAULT '¡LISTOS!',
        tv_carrusel_activo BOOLEAN DEFAULT false,
        tv_carrusel_segundos INTEGER DEFAULT 10,
        tv_imagen_1 VARCHAR(255),
        tv_imagen_2 VARCHAR(255),
        tv_imagen_3 VARCHAR(255),
        tv_video VARCHAR(255),
        negocio_abierto BOOLEAN DEFAULT TRUE,
        mensaje_cierre TEXT,
        hora_apertura INTEGER DEFAULT 17,
        hora_cierre INTEGER DEFAULT 23,
        matriz_limpieza JSONB DEFAULT '{}'::jsonb,
        matriz_observaciones JSONB DEFAULT '{}'::jsonb,
        horarios_semana JSONB DEFAULT '{}'::jsonb,
        bloqueo_caja_activo BOOLEAN DEFAULT false,
        bloqueo_caja_segundos INTEGER DEFAULT 30,
        comedor_limite VARCHAR(20) DEFAULT 'ambos',
        comedor_clasif_bebidas JSONB DEFAULT '[]'::jsonb,
        comedor_clasif_platillos JSONB DEFAULT '[]'::jsonb,
        cocina_en_caja_activa BOOLEAN DEFAULT false,
        politicas_sustitucion JSONB DEFAULT '{}'::jsonb,
        calendario_anual JSONB DEFAULT '{}'::jsonb,
        limite_vacaciones_simultaneas INTEGER DEFAULT 2,
        ticket_impresion_activa BOOLEAN DEFAULT FALSE,
        ticket_modo_impresion VARCHAR(50) DEFAULT 'pdf',
        ticket_domicilio TEXT DEFAULT '',
        ticket_mensaje_final TEXT DEFAULT '¡Gracias por su preferencia!',
        ticket_firma_sistema VARCHAR(100) DEFAULT 'Powered by MiSistemaPOS',
        ticket_impresora_ip VARCHAR(50) DEFAULT '192.168.1.100',
        ticket_impresora_puerto VARCHAR(10) DEFAULT '9100',
        gps_ciudad_estado TEXT DEFAULT '',
        gps_direccion_local TEXT DEFAULT '',
        gps_api_key TEXT DEFAULT '',
        tarifas_envio JSONB DEFAULT '[]'::jsonb,
        mensaje_envio TEXT DEFAULT 'El costo de envío se calculará según tu zona y se sumará al total de tu pedido.',
        puntos_activos BOOLEAN DEFAULT true,
        puntos_canje_activo BOOLEAN DEFAULT true,
        puntos_porcentaje DECIMAL(10,2) DEFAULT 10,
        puntos_valor_peso DECIMAL(10,2) DEFAULT 1.00,
        wa_api_activa BOOLEAN DEFAULT FALSE,
        wa_api_token TEXT,
        wa_phone_id TEXT,
        smtp_email TEXT DEFAULT '',
        smtp_password TEXT DEFAULT '',
        smtp_host TEXT DEFAULT '',
        smtp_port TEXT DEFAULT '',
        precio_gasolina NUMERIC(10,2) DEFAULT 23.50, -- 🩹 Parche detectado en reporteController.js
        empresa_id INTEGER REFERENCES empresas(id)    -- 🆕 TENANT
        -- NOTA: asistencia_pin_caja, asistencia_login, asistencia_huella
        -- existían en versiones viejas pero configController.js las elimina
        -- (DROP COLUMN) en su auto-migración; por eso NO se incluyen aquí.
      );

      -- -----------------------------------------------------------------
      -- Tabla: usuarios (dueño principal: usuarioController.js,
      -- pero authController.js depende de ella)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        usuario VARCHAR(50) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'gerente', 'jefe', 'cajero', 'cocinero', 'cocina', 'tv', 'ayudante_cocina', 'repartidor')),
        permisos JSONB DEFAULT '{"ventas": false, "inventario": false, "usuarios": false}'::jsonb,
        telefono BIGINT UNIQUE CHECK (telefono IS NULL OR (telefono >= 1000000000 AND telefono <= 9999999999)),
        pin VARCHAR(4) DEFAULT NULL,
        pin_seguridad VARCHAR(10) DEFAULT '0000',
        dispositivo_id VARCHAR(100),
        ultimo_acceso TIMESTAMP,
        sueldo_diario DECIMAL(10,2) DEFAULT 0,
        tipo_empleado VARCHAR(50) DEFAULT 'Base',
        fecha_ingreso DATE DEFAULT CURRENT_DATE,
        estado_empleado VARCHAR(20) DEFAULT 'Activo' CHECK (estado_empleado IN ('Activo', 'Inactivo', 'Vacaciones', 'Incapacidad')),
        horario_asignado JSONB DEFAULT '{}'::jsonb,
        horario_semanal JSONB DEFAULT '{}'::jsonb,
        prestaciones JSONB DEFAULT '{"sueldo": 0, "tipo_sueldo": "Mensual", "vacaciones_dias": 0, "bebidas_dia": 0, "platillos_dia": 0, "otros_beneficios": []}'::jsonb,
        es_repartidor_moto BOOLEAN DEFAULT false,
        puntos_rendimiento INTEGER DEFAULT 0,
        rango_rendimiento VARCHAR(50) DEFAULT 'Novato',
        notas_desempeno TEXT DEFAULT '',
        nfc_uid VARCHAR(100) UNIQUE,              -- 🩹 Parche detectado en usuarioController.js
        vehiculo VARCHAR(100),                     -- 🩹 Parche detectado en reporteController.js
        rendimiento_km_l NUMERIC(10,2) DEFAULT 15.00, -- 🩹 Parche detectado en reporteController.js
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: registro_asistencias (usada por authController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS registro_asistencias (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        hora_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hora_salida TIMESTAMP,
        fecha DATE DEFAULT CURRENT_DATE,
        lat_registro DECIMAL(10, 8),               -- 🩹 Parche detectado en asistenciaHelper.js
        lon_registro DECIMAL(11, 8),                -- 🩹 Parche detectado en asistenciaHelper.js
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: clientes (usada por authController.js -> identificar)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        apellido VARCHAR(50) NOT NULL,
        telefono BIGINT UNIQUE CHECK (telefono >= 1000000000 AND telefono <= 9999999999),
        correo VARCHAR(100),
        fecha_nacimiento DATE,
        direccion TEXT,
        puntos INTEGER DEFAULT 0,
        nip VARCHAR(4) DEFAULT '0000',
        codigo_verificacion VARCHAR(10),
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: empleados_dispositivos (dueño: authController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS empleados_dispositivos (
        id SERIAL PRIMARY KEY,
        usuario_id INT UNIQUE,
        dispositivo_id TEXT UNIQUE,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: configuracion_asistencia (dueño: asistenciaConfigController.js,
      -- usada por utils/asistenciaHelper.js y authController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS configuracion_asistencia (
        id SERIAL PRIMARY KEY,
        tipo_registro JSONB DEFAULT '["portal"]'::jsonb,
        validacion_activa VARCHAR(50) DEFAULT 'ninguna',
        rango_metros INT DEFAULT 50,
        metodo_portal VARCHAR(50) DEFAULT 'ambos', -- 🩹 Parche original del propio archivo
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: asistencia_ips (dueño: asistenciaConfigController.js,
      -- usada por utils/asistenciaHelper.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS asistencia_ips (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(50) UNIQUE NOT NULL,
        descripcion VARCHAR(150),
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: asistencia_ubicaciones (dueño: asistenciaConfigController.js,
      -- usada por utils/asistenciaHelper.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS asistencia_ubicaciones (
        id SERIAL PRIMARY KEY,
        latitud DECIMAL(10, 8) NOT NULL,
        longitud DECIMAL(11, 8) NOT NULL,
        descripcion VARCHAR(150),
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: configuracion_biometria (dueño: huellasController.js,
      -- parcheada por equipoController.js, usada por utils/mdmValidator.js
      -- y authController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS configuracion_biometria (
        id SERIAL PRIMARY KEY,
        control_dispositivos_activo BOOLEAN DEFAULT false,
        smtp_host TEXT,
        smtp_port TEXT,
        smtp_user TEXT,
        smtp_pass TEXT,
        correo_remitente TEXT,
        roles_restringidos JSONB DEFAULT '["cajero", "cocina", "repartidor"]', -- 🩹 Parche detectado en equipoController.js
        pantallas_restringidas JSONB DEFAULT '["caja", "cocina", "admin"]',     -- 🩹 Parche detectado en equipoController.js
        metodo_asistencia TEXT DEFAULT 'ambos',                                 -- 🩹 Parche detectado en equipoController.js
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: equipos_autorizados (dueño: huellasController.js,
      -- parcheada por equipoController.js, usada por utils/mdmValidator.js
      -- y authController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS equipos_autorizados (
        id SERIAL PRIMARY KEY,
        device_id TEXT UNIQUE NOT NULL,
        alias TEXT NOT NULL,
        pantallas_permitidas JSONB DEFAULT '[]',
        estatus TEXT DEFAULT 'Activo',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        roles_permitidos JSONB DEFAULT '[]', -- 🩹 Parche detectado en equipoController.js
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: credenciales_biometricas (dueño: huellasController.js,
      -- usada por authController.js -> identificar)
      -- 🔒 REGLA DE ORO: separación completa, sin excepciones. Lleva su
      -- propia empresa_id aunque también se relacione indirectamente vía
      -- usuario_id/cliente_id.
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS credenciales_biometricas (
        id SERIAL PRIMARY KEY,
        usuario_id INT,
        cliente_id INT,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INT DEFAULT 0,
        dispositivo TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: promociones (usada por configController.js -> obtenerConfiguracion)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS promociones (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        tipo VARCHAR(50) NOT NULL DEFAULT 'upselling' CHECK (tipo IN ('upselling', 'happy_hour')),
        producto_trigger_id INTEGER NULL,
        categoria_trigger VARCHAR(50) NULL,
        producto_oferta_id INTEGER NOT NULL,
        tipo_descuento VARCHAR(20) NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'precio_fijo')),
        valor_descuento DECIMAL(10,2) NOT NULL,
        dias_aplicables JSONB NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: productos (referenciada por configController.js en el JOIN
      -- de promociones; su definición completa se revisará a fondo cuando
      -- auditemos productoController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        precio_base DECIMAL(10,2) NOT NULL,
        emoji VARCHAR(10),
        imagen_url TEXT,
        categoria VARCHAR(50) DEFAULT 'General',
        opciones JSONB DEFAULT '[]'::jsonb,
        tiempo_preparacion INTEGER DEFAULT 15,
        rendimiento DECIMAL(10,2) DEFAULT 1,
        stock_preparado INTEGER DEFAULT 0,
        estado VARCHAR(20) DEFAULT 'Activo',
        disponible BOOLEAN DEFAULT TRUE,
        genera_puntos BOOLEAN DEFAULT true,
        permite_canje BOOLEAN DEFAULT true,
        usa_horario BOOLEAN DEFAULT false,
        dias_disponibles VARCHAR(100) DEFAULT '[1,2,3,4,5,6,7]',
        hora_inicio TIME DEFAULT '00:00:00',
        hora_fin TIME DEFAULT '23:59:00',
        usa_stock BOOLEAN DEFAULT false, -- 🩹 Parche detectado en productoController.js
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: cupones (dueño: configController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS cupones (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'dinero', 'fijo')),
        valor DECIMAL(10,2) NOT NULL,
        limite_usos INTEGER DEFAULT NULL,
        usos_actuales INTEGER DEFAULT 0,
        fecha_vencimiento TIMESTAMP NULL,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

        
      -- -----------------------------------------------------------------
      -- Tabla: historico_nominas (dueño: usuarioController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS historico_nominas (
        id SERIAL PRIMARY KEY,
        fecha_corte DATE DEFAULT CURRENT_DATE,
        usuario_admin_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        datos_corte JSONB NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );
      -- -----------------------------------------------------------------
      -- Tabla: reporte_mermas (dueño: mermaController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS reporte_mermas (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50),
        item_id INTEGER,
        nombre_item VARCHAR(255),
        cantidad NUMERIC,
        costo_perdido NUMERIC,
        usuario_id INTEGER,
        origen VARCHAR(50),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );
      -- -----------------------------------------------------------------
      -- Tabla: historico_cortes (dueño: corteController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS historico_cortes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        fecha_corte DATE NOT NULL,
        hora_corte TIME DEFAULT CURRENT_TIME,
        turno_cerrado BOOLEAN DEFAULT false,
        fondo_inicial DECIMAL(10,2) DEFAULT 0,
        fondo_repartidor DECIMAL(10,2) DEFAULT 0.00,
        venta_platillos DECIMAL(10,2) DEFAULT 0,
        ingresos_extras DECIMAL(10,2) DEFAULT 0,
        cargos_envio DECIMAL(10,2) DEFAULT 0.00,
        total_efectivo DECIMAL(10,2) DEFAULT 0,
        total_tarjeta DECIMAL(10,2) DEFAULT 0,
        total_transferencia DECIMAL(10,2) DEFAULT 0,
        total_gastos DECIMAL(10,2) DEFAULT 0,
        efectivo_cajon DECIMAL(10,2) DEFAULT 0,
        pedidos_incluidos JSONB DEFAULT '[]'::jsonb,
        desglose_gastos JSONB DEFAULT '[]'::jsonb,
        detalles_envio JSONB DEFAULT '{}'::jsonb,
        efectivo_entregado NUMERIC DEFAULT 0,       -- 🩹 Parche B2B detectado en corteController.js
        efectivo_en_caja NUMERIC DEFAULT 0,          -- 🩹 Parche B2B detectado en corteController.js
        venta_mayoreo NUMERIC DEFAULT 0,             -- 🩹 Parche B2B detectado en corteController.js
        mayoreo_efectivo NUMERIC DEFAULT 0,          -- 🩹 Parche B2B detectado en corteController.js
        mayoreo_tarjeta NUMERIC DEFAULT 0,           -- 🩹 Parche B2B detectado en corteController.js
        mayoreo_transferencia NUMERIC DEFAULT 0,     -- 🩹 Parche B2B detectado en corteController.js
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      CREATE INDEX IF NOT EXISTS idx_cortes_fecha ON historico_cortes(fecha_corte);

    -- Bloque A:
    CREATE TABLE IF NOT EXISTS sub_recetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Base',
    rendimiento DECIMAL(10,3) DEFAULT 1,
    unidad_rendimiento VARCHAR(20) DEFAULT 'PZ',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
    );
    
      -- -----------------------------------------------------------------
      -- Tabla: configuracion_financiera (dueño: configFinancieraController.js,
      -- usada también por reporteController.js -> Factor Luz/Agua)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS configuracion_financiera (
        id SERIAL PRIMARY KEY,
        clave VARCHAR(50),
        nombre_servicio VARCHAR(100) NOT NULL,
        monto_mensual NUMERIC(12,2) DEFAULT 0,
        porcentaje NUMERIC(5,2) DEFAULT 0,
        categoria VARCHAR(50) DEFAULT 'Servicios',
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT NOW(),
        fecha_actualizacion TIMESTAMP DEFAULT NOW(),
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_financiera_clave_empresa ON configuracion_financiera(clave, empresa_id);

            -- -----------------------------------------------------------------
      -- Tabla: configuracion_operativa (dueño: configOperativaCtrl.js,
      -- usada también por pedidoController.js -> bandera usa_cocina)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS configuracion_operativa (
        id SERIAL PRIMARY KEY,
        usa_cocina BOOLEAN DEFAULT true,
        mesa_obligatoria BOOLEAN DEFAULT false,
        criterio_presencia_cocina VARCHAR(20) DEFAULT 'asistencia',
        creado_en TIMESTAMP DEFAULT NOW(),
        actualizado_en TIMESTAMP DEFAULT NOW(),
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_operativa_empresa_unica ON configuracion_operativa(empresa_id);

      -- -----------------------------------------------------------------
      -- Tabla: log_produccion_items (dueño: cocinaOperativaController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS log_produccion_items (
        id SERIAL PRIMARY KEY,
        pedido_id INT NOT NULL,
        item_index INT NOT NULL,
        usuario_id INT,
        accion VARCHAR(20) NOT NULL,
        creado_en TIMESTAMP DEFAULT NOW(),
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );
      CREATE INDEX IF NOT EXISTS idx_log_produccion_pedido ON log_produccion_items (pedido_id, item_index);

      -- -----------------------------------------------------------------
      -- Tabla: estaciones_cocina (dueño: cocinaOperativaController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS estaciones_cocina (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        capacidad_maxima_paralela INT DEFAULT 5,
        ventana_minutos INT DEFAULT 15,
        es_automatica BOOLEAN DEFAULT false,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT NOW(),
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: estacion_clasificacion (dueño: cocinaOperativaController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS estacion_clasificacion (
        id SERIAL PRIMARY KEY,
        estacion_id INT REFERENCES estaciones_cocina(id) ON DELETE CASCADE,
        clasificacion_id INT UNIQUE NOT NULL,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );

      -- -----------------------------------------------------------------
      -- Tabla: combos (dueño: comboController.js)
      -- -----------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS combos (
        id SERIAL PRIMARY KEY,
        producto_base_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        nombre VARCHAR(255) NOT NULL,
        configuracion_grupos JSONB NOT NULL,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );
      -- -----------------------------------------------------------------
-- Tabla: suscripciones_push (dueño: notificacionController.js,
-- usada por pedidoController.js, insumoController.js,
-- mensajeController.js, proveedorController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suscripciones_push (
  id SERIAL PRIMARY KEY,
  usuario_id INT,
  cliente_id INT,
  suscripcion JSONB NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

-- -----------------------------------------------------------------
-- Tabla: mensajes_empleados (dueño: mensajeController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes_empleados (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  empleado_id INTEGER,
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT false,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_lectura TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

-- -----------------------------------------------------------------
-- Tabla: compras_insumos (dueño: insumoController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compras_insumos (
  id SERIAL PRIMARY KEY,
  insumo_id INTEGER,
  paquetes NUMERIC DEFAULT 0,
  costo_unitario NUMERIC DEFAULT 0,
  costo_total NUMERIC DEFAULT 0,
  origen VARCHAR(50) DEFAULT 'Caja',
  usuario_id INTEGER,
  fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

-- -----------------------------------------------------------------
-- Tabla: auditorias_inventario (dueño: insumoController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditorias_inventario (
  id SERIAL PRIMARY KEY,
  estado VARCHAR(50) DEFAULT 'solicitada',
  datos JSONB DEFAULT '{}',
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

-- -----------------------------------------------------------------
-- Tabla: surtidos_borrador (dueño: insumoController.js)
-- 🔁 Ya NO es singleton WHERE id=1: ahora es 1 fila por empresa
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surtidos_borrador (
  id SERIAL PRIMARY KEY,
  datos JSONB DEFAULT '{}',
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_surtidos_borrador_empresa_unica ON surtidos_borrador(empresa_id);

-- -----------------------------------------------------------------
-- Tabla: configuracion_proveedores (dueño: proveedorController.js)
-- 🔁 Ya NO es singleton WHERE id=1: ahora es 1 fila por empresa
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_proveedores (
  id SERIAL PRIMARY KEY,
  correos_smtp JSON DEFAULT '[]',
  ajustes_extra JSON DEFAULT '{}',
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_proveedores_empresa_unica ON configuracion_proveedores(empresa_id);

-- -----------------------------------------------------------------
-- Tabla: proveedores (dueño: proveedorController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  empresa VARCHAR(255) NOT NULL,
  telefono_empresa VARCHAR(50),
  correo VARCHAR(255),
  contacto VARCHAR(255),
  telefono_contacto VARCHAR(50),
  rfc VARCHAR(50),
  merma_esperada DECIMAL(10,2) DEFAULT 0,
  stock_minimo_alerta DECIMAL(10,2) DEFAULT 0,
  enviar_email BOOLEAN DEFAULT false,
  enviar_wa BOOLEAN DEFAULT false,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  articulos_suministrados JSON DEFAULT '[]',
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

-- -----------------------------------------------------------------
-- Tabla: gastos_proveedores (dueño: proveedorController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos_proveedores (
  id SERIAL PRIMARY KEY,
  proveedor_id INTEGER NOT NULL,
  total_pago DECIMAL(10,2) DEFAULT 0,
  fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  origen VARCHAR(50) DEFAULT 'Caja',
  estado VARCHAR(50) DEFAULT 'Pendiente',
  usuario_id INTEGER NULL,
  articulos_comprados JSON DEFAULT '[]',
  cantidad_recibida DECIMAL(10,2) DEFAULT 0,
  folio VARCHAR(100),
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_asistencia_empresa_unica ON configuracion_asistencia(empresa_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_biometria_empresa_unica ON configuracion_biometria(empresa_id);

-- -----------------------------------------------------------------
-- Tabla: checador_ips (dueño: biometricoController.js)
-- Mapea la IP pública de cada sucursal/negocio a su empresa_id, ya que
-- el checador físico ZKTeco no puede mandar JWT ni header X-Empresa-Slug.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checador_ips (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(50) UNIQUE NOT NULL,
  descripcion VARCHAR(150),
  activo BOOLEAN DEFAULT true,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------
-- Tabla: dist_articulos (dueño: distribucionController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dist_articulos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria VARCHAR(255) NOT NULL,
  unidad_medida VARCHAR(50) DEFAULT 'PZ',
  equivalencia NUMERIC(10,2) DEFAULT 1,
  costo_inversion NUMERIC(10,2) DEFAULT 0,
  disponible BOOLEAN DEFAULT true,
  genera_puntos BOOLEAN DEFAULT true,
  permite_canje BOOLEAN DEFAULT true,
  permite_credito BOOLEAN DEFAULT false,
  usa_stock BOOLEAN DEFAULT true,
  stock_actual NUMERIC(10,2) DEFAULT 0,
  stock_minimo_alerta NUMERIC(10,2) DEFAULT 0,
  precios JSONB DEFAULT '[]',
  emoji VARCHAR(50) DEFAULT '📦',
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

CREATE TABLE IF NOT EXISTS dist_configuracion (
  id SERIAL PRIMARY KEY,
  distribucion_activa BOOLEAN DEFAULT false,
  distribucion_nombre VARCHAR(100) DEFAULT '28:20',
  smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
  smtp_puerto VARCHAR(10) DEFAULT '465',
  smtp_email VARCHAR(255) DEFAULT '',
  smtp_password VARCHAR(255) DEFAULT '',
  puntos_activos BOOLEAN DEFAULT true,
  puntos_porcentaje NUMERIC(10,2) DEFAULT 10,
  puntos_valor_peso NUMERIC(10,2) DEFAULT 1,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dist_configuracion_empresa_unica ON dist_configuracion(empresa_id);

CREATE TABLE IF NOT EXISTS dist_clientes (
  id SERIAL PRIMARY KEY,
  empresa VARCHAR(255) NOT NULL,
  nombre_contacto VARCHAR(255) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  correo VARCHAR(255),
  rfc VARCHAR(50),
  direccion TEXT,
  fecha_nacimiento DATE,
  puntos NUMERIC(10,2) DEFAULT 0,
  tiene_credito BOOLEAN DEFAULT false,
  limite_credito NUMERIC(10,2) DEFAULT 0,
  dias_credito INTEGER DEFAULT 0,
  recordatorios_activos BOOLEAN DEFAULT true,
  correo_verificado BOOLEAN DEFAULT false,
  codigo_autorizacion VARCHAR(10),
  ine_frente_url TEXT,
  ine_reverso_url TEXT,
  comprobante_url TEXT,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

CREATE TABLE IF NOT EXISTS dist_pedidos (
  id SERIAL PRIMARY KEY,
  numero_pedido INTEGER NOT NULL,
  cajero_id INTEGER,
  cliente_id INTEGER,
  cliente_nombre VARCHAR(255),
  cliente_telefono VARCHAR(50),
  correo_cliente VARCHAR(255),
  tipo_consumo VARCHAR(50),
  direccion_entrega TEXT,
  costo_envio NUMERIC(10,2) DEFAULT 0,
  repartidor_id INTEGER,
  es_reparto_externo BOOLEAN DEFAULT false,
  costo_reparto_externo NUMERIC(10,2) DEFAULT 0,
  metodo_pago VARCHAR(50),
  monto_efectivo NUMERIC(10,2) DEFAULT 0,
  monto_tarjeta NUMERIC(10,2) DEFAULT 0,
  monto_transferencia NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  carrito JSONB NOT NULL,
  estado_preparacion VARCHAR(50) DEFAULT 'Entregado',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);

-- -----------------------------------------------------------------
-- Tabla: ia_configuracion (dueño: iaController.js)
-- 🔁 Ya NO es singleton WHERE id=1: ahora es 1 fila por empresa.
-- 🔴 Guarda llaves API reales de Gemini/OpenAI/Claude — máxima sensibilidad.
-- -----------------------------------------------------------------
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
  fecha_uso DATE DEFAULT CURRENT_DATE,
  empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_configuracion_empresa_unica ON ia_configuracion(empresa_id);

-- -----------------------------------------------------------------
-- Tabla: ia_conversaciones (dueño: iaController.js)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ia_conversaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  contexto VARCHAR(30) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  mensajes JSONB DEFAULT '[]'::jsonb,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  empresa_id INTEGER REFERENCES empresas(id), -- 🆕 TENANT
  UNIQUE(usuario_id, contexto, empresa_id)
);

-- 🆕 FASE 4: Tabla aislada para configuraciones y credenciales de WhatsApp (Meta/Twilio/Baileys)
      CREATE TABLE IF NOT EXISTS whatsapp_configuraciones (
          empresa_id INTEGER PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
          proveedor VARCHAR(20) DEFAULT 'meta', -- meta, twilio, baileys
          meta_api_token TEXT,
          meta_phone_id VARCHAR(50),
          twilio_sid TEXT,
          twilio_token TEXT,
          twilio_number VARCHAR(50),
          ia_habilitada BOOLEAN DEFAULT false
      );

      -- 🆕 FASE 4: Tabla de Chats Omnicanal (Aislada para Handoff Humano-IA)
      CREATE TABLE IF NOT EXISTS omnichannel_chats (
          id SERIAL PRIMARY KEY,
          empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
          telefono_cliente VARCHAR(50) NOT NULL,
          nombre_cliente VARCHAR(100),
          pausa_ia BOOLEAN DEFAULT false,
          proveedor VARCHAR(20) DEFAULT 'baileys',
          mensajes JSONB DEFAULT '[]'::jsonb,
          ultimo_mensaje TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(empresa_id, telefono_cliente)
      );

      -- 🆕 FASE 4: Tabla de sesiones persistentes para Baileys
      CREATE TABLE IF NOT EXISTS whatsapp_sesiones (
          empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
          session_id VARCHAR(255) NOT NULL,
          datos JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (empresa_id, session_id)
      );


    `);
    console.log('✅ [MIGRACIÓN MULTI-TENANT] Tablas base verificadas/creadas correctamente (Bloque A).');
  } catch (error) {
    console.error('🚨 [MIGRACIÓN MULTI-TENANT] Error creando tablas base:', error);
  }
};

// =========================================================================
// BLOQUE B) AGREGAR empresa_id A TABLAS YA EXISTENTES (para los 5 clientes
// actuales, cuyas tablas ya están creadas desde antes de este proyecto).
// -------------------------------------------------------------------------
// Nota: aunque el Bloque A ya incluye "empresa_id" en cada CREATE TABLE,
// este Bloque B sigue siendo indispensable para las bases de datos que YA
// existen en producción, donde el CREATE TABLE nunca se vuelve a ejecutar
// (por el IF NOT EXISTS) y por lo tanto nunca ganarían la columna nueva
// si no fuera por este ALTER explícito.
// =========================================================================
exports.agregarEmpresaIdATablas = async () => {
  try {
    await db.query(`
      ALTER TABLE configuracion            ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE usuarios                 ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE registro_asistencias     ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE clientes                 ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE empleados_dispositivos   ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE configuracion_asistencia ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE asistencia_ips           ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE asistencia_ubicaciones   ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE configuracion_biometria  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE equipos_autorizados      ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE promociones              ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE productos                ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE cupones                  ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE credenciales_biometricas ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE historico_nominas       ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE pedidos                 ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE recetas                 ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE insumos                 ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE catalogo_ingredientes   ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE clasificaciones         ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE mesas                   ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE suscripciones_push      ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE configuracion_operativa ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE reporte_mermas ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE historico_cortes ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);      
      ALTER TABLE sub_recetas ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE configuracion_financiera ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE configuracion_financiera ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_financiera_clave_empresa ON configuracion_financiera(clave, empresa_id);
      ALTER TABLE configuracion_operativa ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_operativa_empresa_unica ON configuracion_operativa(empresa_id);
      ALTER TABLE log_produccion_items   ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE estaciones_cocina      ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE estacion_clasificacion ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE combos ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE mensajes_empleados ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE compras_insumos ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE auditorias_inventario ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE surtidos_borrador ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_surtidos_borrador_empresa_unica ON surtidos_borrador(empresa_id);
      ALTER TABLE configuracion_proveedores ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_proveedores_empresa_unica ON configuracion_proveedores(empresa_id);
      ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE gastos_proveedores ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_asistencia_empresa_unica ON configuracion_asistencia(empresa_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_biometria_empresa_unica ON configuracion_biometria(empresa_id);
      ALTER TABLE dist_articulos ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE dist_configuracion ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_dist_configuracion_empresa_unica ON dist_configuracion(empresa_id);
      ALTER TABLE dist_clientes ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE dist_pedidos ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_configuracion_empresa_unica ON ia_configuracion(empresa_id);
      ALTER TABLE ia_conversaciones ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE whatsapp_configuraciones ADD COLUMN IF NOT EXISTS ia_habilitada BOOLEAN DEFAULT false;
      ALTER TABLE omnichannel_chats ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
      ALTER TABLE ia_configuracion ADD COLUMN IF NOT EXISTS kiosco_ia_activo BOOLEAN DEFAULT false;
      ALTER TABLE whatsapp_configuraciones ADD COLUMN IF NOT EXISTS dialog360_token TEXT DEFAULT '';
      ALTER TABLE omnichannel_chats ADD COLUMN IF NOT EXISTS cerrado_en TIMESTAMPTZ;

    `);
    console.log('✅ [MIGRACIÓN MULTI-TENANT] Columnas empresa_id verificadas/creadas correctamente (Bloque B).');
  } catch (error) {
    console.error('🚨 [MIGRACIÓN MULTI-TENANT] Error al agregar columnas empresa_id:', error);
  }
};