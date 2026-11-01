const db = require('../config/db');

// =========================================================
// AUTO-MIGRACIÓN DE BASE DE DATOS (Configuración Financiera)
// =========================================================
// 💡 MÓDULO AISLADO: Pensado para escalar a futuro con un Gestor de
// Gastos Fijos (Renta, Internet, Nómina, etc.). Por ahora solo se
// consume la fila especial 'factor_luz_agua', identificada por su
// columna 'clave', para reemplazar el 15% que estaba hardcodeado en
// reporteController.js, GestorRecetas.js y PanelTamanosFijos.js.
exports.inicializarTablaConfigFinanciera = async () => {
  try {
    // 🔒 FILTRO EMPRESA: "clave" dejó de ser UNIQUE por sí sola (bloqueaba a las
    // demás empresas de tener su propia fila "factor_luz_agua"). Ahora la
    // unicidad real es el PAR (clave, empresa_id) mediante el índice de abajo.
    await db.query(`
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
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_config_financiera_clave_empresa
      ON configuracion_financiera(clave, empresa_id);
    `); // 🔒 FILTRO EMPRESA: unicidad real ahora es (clave + empresa_id)

    // NOTA: ya NO se siembra aquí el 15% global, porque esta función corre UNA
    // SOLA VEZ al arrancar el servidor, sin saber a qué empresa pertenece. En su
    // lugar, obtenerFactorLuzAgua() y actualizarFactorLuzAgua() ya se encargan
    // de crear la fila con el valor por defecto la primera vez que cada empresa
    // la consulte o la edite (mismo patrón "lazy creation" que configController.js).

    console.log("✅ Tabla 'configuracion_financiera' verificada/creada en la BD.");
  } catch (error) {
    console.error("❌ Error al inicializar configuracion_financiera:", error);
  }
};

// =========================================================
// FACTOR LUZ/AGUA (Consumido por reporteController.js,
// GestorRecetas.js y PanelTamanosFijos.js)
// =========================================================
exports.obtenerFactorLuzAgua = async (req, res) => {
  const empresaId = req.empresa_id; // 🆕 TENANT
  try {
    const result = await db.query(
      `SELECT porcentaje FROM configuracion_financiera WHERE clave = 'factor_luz_agua' AND empresa_id = $1 LIMIT 1`, // 🔒 FILTRO EMPRESA
      [empresaId]
    );

    // 👇 Blindaje: si por alguna razón la fila no existe (instalación nueva
    // que aún no corrió la auto-migración), devolvemos el 15% por defecto
    // en vez de romper el frontend con un error o un NaN.
    const porcentaje = result.rows.length > 0 ? Number(result.rows[0].porcentaje) : 15;

    res.json({ success: true, porcentaje });
  } catch (error) {
    console.error("Error al obtener el factor Luz/Agua:", error);
    res.status(500).json({ error: 'Error al obtener el factor de Luz/Agua.' });
  }
};

exports.actualizarFactorLuzAgua = async (req, res) => {
  const { porcentaje } = req.body;
  const empresaId = req.empresa_id; // 🆕 TENANT

  if (porcentaje === undefined || porcentaje === null || isNaN(Number(porcentaje))) {
    return res.status(400).json({ error: 'El porcentaje enviado no es un número válido.' });
  }

  try {
    const result = await db.query(
      `UPDATE configuracion_financiera
       SET porcentaje = $1, fecha_actualizacion = NOW()
       WHERE clave = 'factor_luz_agua' AND empresa_id = $2
       RETURNING porcentaje`, // 🔒 FILTRO EMPRESA
      [Number(porcentaje), empresaId]
    );

    // 👇 Blindaje: si la fila no existía para ESTA empresa (caso extremo o
    // primera vez que la toca), la creamos en vez de fallar silenciosamente,
    // para que el ajuste del cliente nunca se pierda.
    if (result.rows.length === 0) {
      const inserted = await db.query(
        `INSERT INTO configuracion_financiera (clave, nombre_servicio, porcentaje, categoria, empresa_id)
         VALUES ('factor_luz_agua', 'Luz y Agua (Factor de Costeo)', $1, 'Servicios', $2)
         RETURNING porcentaje`, // 🆕 TENANT
        [Number(porcentaje), empresaId]
      );
      return res.json({ success: true, porcentaje: Number(inserted.rows[0].porcentaje) });
    }

    res.json({ success: true, porcentaje: Number(result.rows[0].porcentaje) });
  } catch (error) {
    console.error("Error al actualizar el factor Luz/Agua:", error);
    res.status(500).json({ error: 'Error al guardar el nuevo porcentaje de Luz/Agua.' });
  }
};