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
    await db.query(`
      CREATE TABLE IF NOT EXISTS configuracion_operativa (
        id INT PRIMARY KEY DEFAULT 1,
        usa_cocina BOOLEAN DEFAULT true,
        mesa_obligatoria BOOLEAN DEFAULT false,
        criterio_presencia_cocina VARCHAR(20) DEFAULT 'asistencia',
        creado_en TIMESTAMP DEFAULT NOW(),
        actualizado_en TIMESTAMP DEFAULT NOW()
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

    // Aseguramos que la fila singleton (id=1) siempre exista, con los valores
    // por defecto que preservan el comportamiento actual (true = usa cocina,
    // false = mesa opcional, 'asistencia' = criterio por defecto en cocina,
    // tal como funciona hoy en todos los negocios existentes).
    await db.query(`
      INSERT INTO configuracion_operativa (id, usa_cocina, mesa_obligatoria, criterio_presencia_cocina)
      VALUES (1, true, false, 'asistencia')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log("✅ Tabla 'configuracion_operativa' verificada/creada correctamente.");
  } catch (error) {
    console.error("🚨 Error al inicializar la tabla configuracion_operativa:", error);
  }
};

exports.obtenerConfigOperativa = async (req, res) => {
  try {
    let result = await db.query('SELECT * FROM configuracion_operativa WHERE id = 1');

    // Red de seguridad por si la tabla existe pero la fila fue borrada manualmente.
    if (result.rows.length === 0) {
      await db.query("INSERT INTO configuracion_operativa (id, usa_cocina) VALUES (1, true) ON CONFLICT (id) DO NOTHING");
      result = await db.query('SELECT * FROM configuracion_operativa WHERE id = 1');
    }

    const config = result.rows[0] || { id: 1, usa_cocina: true, mesa_obligatoria: false, criterio_presencia_cocina: 'asistencia' };
    res.json(config);
  } catch (error) {
    console.error("Error al obtener configuración operativa:", error);
    res.status(500).json({ error: 'Error al obtener configuración operativa' });
  }
};

exports.actualizarConfigOperativa = async (req, res) => {
  try {
    // 🛡️ FIX: Leemos primero el estado actual para soportar actualizaciones
    // parciales — así el toggle de "Mesa Obligatoria" nunca pisa/apaga
    // accidentalmente el valor de "usa_cocina", y viceversa.
    const actualRes = await db.query('SELECT * FROM configuracion_operativa WHERE id = 1');
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
    INSERT INTO configuracion_operativa (id, usa_cocina, mesa_obligatoria, criterio_presencia_cocina, actualizado_en)
    VALUES (1, $1, $2, $3, NOW())
    ON CONFLICT (id) DO UPDATE SET
        usa_cocina = EXCLUDED.usa_cocina,
        mesa_obligatoria = EXCLUDED.mesa_obligatoria,
        criterio_presencia_cocina = EXCLUDED.criterio_presencia_cocina,
        actualizado_en = NOW()
    RETURNING *
    `, [isUsaCocina, isMesaObligatoria, isCriterioPresencia]);

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