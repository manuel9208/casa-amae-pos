const db = require('../config/db');

// ==========================================
// 🍳 MÓDULO AISLADO: CONFIGURACIÓN OPERATIVA (Flujo Cocina Sí/No)
// Tabla 100% independiente de "configuracion" (Marca Blanca).
// ==========================================

exports.inicializarTablaConfigOperativa = async () => {
  try {
    // ✅ CREATE TABLE ya con TODOS los campos vigentes (incluye los que antes
    // solo llegaban vía ALTER). Esto garantiza que un negocio NUEVO (marca
    // blanca) nazca completo desde el día uno, sin depender de los ALTER.
    // 🔒 FILTRO EMPRESA: "id" ya NO es un singleton fijo en 1 — cada empresa
    // tendrá su propia fila con un id autogenerado distinto (mismo patrón
    // ya aplicado en configController.js).
    await db.query(`
      CREATE TABLE IF NOT EXISTS configuracion_operativa (
        id SERIAL PRIMARY KEY,
        usa_cocina BOOLEAN DEFAULT true,
        mesa_obligatoria BOOLEAN DEFAULT false,
        criterio_presencia_cocina VARCHAR(20) DEFAULT 'asistencia',
        creado_en TIMESTAMP DEFAULT NOW(),
        actualizado_en TIMESTAMP DEFAULT NOW(),
        empresa_id INTEGER REFERENCES empresas(id) -- 🆕 TENANT
      );
    `);

    // 🪑 NUEVA BANDERA: Mesa Obligatoria (fuerza asignar mesa en consumo Local).
    // ALTER TABLE para negocios que ya tenían la tabla creada desde antes.
    // ⚠️ Se mantiene por compatibilidad retroactiva (negocios existentes).
    await db.query(`
      ALTER TABLE configuracion_operativa
      ADD COLUMN IF NOT EXISTS mesa_obligatoria BOOLEAN DEFAULT false;
    `);

    // 🧑‍🍳 NUEVO: Criterio de Presencia en Cocina ('asistencia' | 'horario' | 'ambos')
    // ⚠️ Se mantiene por compatibilidad retroactiva (negocios existentes).
    await db.query(`
        ALTER TABLE configuracion_operativa
        ADD COLUMN IF NOT EXISTS criterio_presencia_cocina VARCHAR(20) DEFAULT 'asistencia';
    `);

    // 🆕 TENANT: garantiza 1 sola fila de config operativa por empresa
    // (reemplaza el singleton id=1 que usaba todo el sistema antes)
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_operativa_empresa_unica
      ON configuracion_operativa(empresa_id);
    `);

    // NOTA: el INSERT semilla (id=1, usa_cocina=true...) ya NO se hace aquí,
    // porque esta función corre UNA SOLA VEZ al arrancar el servidor, sin
    // saber a qué empresa pertenece. obtenerConfigOperativa() y
    // actualizarConfigOperativa() ya crean la fila con los valores por
    // defecto la primera vez que cada empresa la consulte o la edite
    // (mismo patrón "lazy creation" que configController.js y
    // configFinancieraController.js).

    console.log("✅ Tabla 'configuracion_operativa' verificada/creada correctamente.");
  } catch (error) {
    console.error("🚨 Error al inicializar la tabla configuracion_operativa:", error);
  }
};

exports.obtenerConfigOperativa = async (req, res) => {
  const empresaId = req.empresa_id; // 🆕 TENANT
  try {
    let result = await db.query('SELECT * FROM configuracion_operativa WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA

    // Red de seguridad por si la fila de ESTA empresa aún no existe (primera
    // vez que consulta, o fue borrada manualmente).
    if (result.rows.length === 0) {
      await db.query(
        "INSERT INTO configuracion_operativa (usa_cocina, empresa_id) VALUES (true, $1) ON CONFLICT (empresa_id) DO NOTHING", // 🔒 FILTRO EMPRESA
        [empresaId]
      );
      result = await db.query('SELECT * FROM configuracion_operativa WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
    }

    const config = result.rows[0] || { usa_cocina: true, mesa_obligatoria: false, criterio_presencia_cocina: 'asistencia', empresa_id: empresaId };
    res.json(config);
  } catch (error) {
    console.error("Error al obtener configuración operativa:", error);
    res.status(500).json({ error: 'Error al obtener configuración operativa' });
  }
};

exports.actualizarConfigOperativa = async (req, res) => {
  const empresaId = req.empresa_id; // 🆕 TENANT
  try {
    // 🛡️ FIX: Leemos primero el estado actual para soportar actualizaciones
    // parciales — así el toggle de "Mesa Obligatoria" nunca pisa/apaga
    // accidentalmente el valor de "usa_cocina", y viceversa.
    const actualRes = await db.query('SELECT * FROM configuracion_operativa WHERE empresa_id = $1', [empresaId]); // 🔒 FILTRO EMPRESA
    const actual = actualRes.rows[0] || { usa_cocina: true, mesa_obligatoria: false };

    const isUsaCocina = req.body.usa_cocina !== undefined
      ? (req.body.usa_cocina === true || req.body.usa_cocina === 'true')
      : actual.usa_cocina;

    // 🪑 NUEVA BANDERA: Mesa Obligatoria
    const isMesaObligatoria = req.body.mesa_obligatoria !== undefined
    ? (req.body.mesa_obligatoria === true || req.body.mesa_obligatoria === 'true')
    : actual.mesa_obligatoria;

    // 🧑‍🍳 NUEVO: Criterio de Presencia en Cocina
    const valoresValidosCriterio = ['asistencia', 'horario', 'ambos'];
    const isCriterioPresencia = valoresValidosCriterio.includes(req.body.criterio_presencia_cocina)
    ? req.body.criterio_presencia_cocina
    : (actual.criterio_presencia_cocina || 'asistencia');

    const result = await db.query(`
    INSERT INTO configuracion_operativa (usa_cocina, mesa_obligatoria, criterio_presencia_cocina, actualizado_en, empresa_id)
    VALUES ($1, $2, $3, NOW(), $4)
    ON CONFLICT (empresa_id) DO UPDATE SET
        usa_cocina = EXCLUDED.usa_cocina,
        mesa_obligatoria = EXCLUDED.mesa_obligatoria,
        criterio_presencia_cocina = EXCLUDED.criterio_presencia_cocina,
        actualizado_en = NOW()
    RETURNING *
    `, [isUsaCocina, isMesaObligatoria, isCriterioPresencia, empresaId]); // 🔒 FILTRO EMPRESA

    // Evento propio y sin ambigüedad: no colisiona con 'config_actualizada'
    // ni con 'configuracion_actualizada' que ya existen en el sistema.
    const io = req.app.get('io');
    if (io) io.emit('configuracion_operativa_actualizada');

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar configuración operativa:", error);
    res.status(500).json({ error: 'Error al actualizar configuración operativa' });
  }
};