const db = require('../config/db');

exports.obtenerConfiguracion = async (req, res) => {
    const { empresa_id } = req;
    try {
        // Auto-migración para añadir las columnas si no existen.
        // 👇 CAMBIO: roles_restringidos ahora es un array de OBJETOS
        // [{ rol: 'cajero', pantallas_excepcion: ['empleado'] }], en vez de
        // un array plano de strings. Esto permite que cada rol bloqueado
        // conserve excepciones de pantalla (ej. seguir viendo "Portal del
        // Empleado") en lugar de quedar con el login totalmente denegado.
        // pantallas_restringidas se mantiene solo por compatibilidad retro,
        // pero ya no se usa en la nueva lógica de validación de App.js/authController.js.
        await db.query(`
            ALTER TABLE configuracion_biometria 
            ADD COLUMN IF NOT EXISTS roles_restringidos JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS pantallas_restringidas JSONB DEFAULT '["caja", "cocina", "admin"]'
        `).catch(() => {});

        // Auto-migración para la matriz de roles por equipo
        await db.query(`
            ALTER TABLE equipos_autorizados 
            ADD COLUMN IF NOT EXISTS roles_permitidos JSONB DEFAULT '[]'
        `).catch(() => {});

        // 👇 NUEVA AUTO-MIGRACIÓN: Preferencia del método de asistencia
        await db.query(`
            ALTER TABLE configuracion_biometria 
            ADD COLUMN IF NOT EXISTS metodo_asistencia TEXT DEFAULT 'ambos'
        `).catch(() => {});

        // Se envía todo al frontend
        const result = await db.query('SELECT control_dispositivos_activo, roles_restringidos, pantallas_restringidas, metodo_asistencia, smtp_host, smtp_port, smtp_user, correo_remitente FROM configuracion_biometria WHERE empresa_id = $1', [empresa_id]);
        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la configuración biométrica.' });
    }
};

exports.actualizarConfiguracion = async (req, res) => {
    const { empresa_id } = req;
    // 👇 AHORA SÍ RECIBE TODOS LOS DATOS NUEVOS
    const { control_dispositivos_activo, roles_restringidos, pantallas_restringidas, metodo_asistencia, smtp_host, smtp_port, smtp_user, smtp_pass, correo_remitente } = req.body;
    try {
        // Primero verificamos si ya existe una fila para esta empresa
        const existe = await db.query('SELECT smtp_pass FROM configuracion_biometria WHERE empresa_id = $1', [empresa_id]);
        const smtpPassFinal = (smtp_pass && smtp_pass.trim() !== '') ? smtp_pass : (existe.rows[0]?.smtp_pass || null);

        const result = await db.query(
            `INSERT INTO configuracion_biometria 
                (empresa_id, control_dispositivos_activo, roles_restringidos, pantallas_restringidas, metodo_asistencia, smtp_host, smtp_port, smtp_user, smtp_pass, correo_remitente)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (empresa_id) DO UPDATE SET
                control_dispositivos_activo = $2, roles_restringidos = $3, pantallas_restringidas = $4, metodo_asistencia = $5,
                smtp_host = $6, smtp_port = $7, smtp_user = $8, smtp_pass = $9, correo_remitente = $10
             RETURNING control_dispositivos_activo`,
            [
                empresa_id, control_dispositivos_activo,
                JSON.stringify(roles_restringidos || []),
                JSON.stringify(pantallas_restringidas || []),
                metodo_asistencia || 'ambos',
                smtp_host, smtp_port, smtp_user, smtpPassFinal, correo_remitente
            ]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar configuración.' });
    }
};

exports.obtenerEquipos = async (req, res) => {
    const { empresa_id } = req;
    try {
        const result = await db.query('SELECT * FROM equipos_autorizados WHERE empresa_id = $1 ORDER BY fecha_registro DESC', [empresa_id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los equipos autorizados.' });
    }
};

exports.registrarEquipo = async (req, res) => {
    const { empresa_id } = req;
    const { device_id, alias, pantallas_permitidas, roles_permitidos } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO equipos_autorizados (device_id, alias, pantallas_permitidas, roles_permitidos, estatus, empresa_id) 
             VALUES ($1, $2, $3, $4, 'Activo', $5) 
             ON CONFLICT (device_id) DO UPDATE 
             SET alias = EXCLUDED.alias, pantallas_permitidas = EXCLUDED.pantallas_permitidas, roles_permitidos = EXCLUDED.roles_permitidos, empresa_id = EXCLUDED.empresa_id 
             RETURNING *`,
            [
                device_id, 
                alias || 'Tablet Nueva', 
                JSON.stringify(pantallas_permitidas || ['empleado']),
                JSON.stringify(roles_permitidos || ['cajero', 'cocina', 'jefe', 'gerente']),
                empresa_id
            ]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el equipo.' });
    }
};

exports.actualizarEquipo = async (req, res) => {
    const { id } = req.params;
    const { empresa_id } = req;
    const { alias, pantallas_permitidas, roles_permitidos, estatus } = req.body;
    try {
        const result = await db.query(
            'UPDATE equipos_autorizados SET alias = $1, pantallas_permitidas = $2, roles_permitidos = $3, estatus = $4 WHERE id = $5 AND empresa_id = $6 RETURNING *',
            [alias, JSON.stringify(pantallas_permitidas), JSON.stringify(roles_permitidos), estatus, id, empresa_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado o no pertenece a tu negocio.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el equipo.' });
    }
};

exports.eliminarEquipo = async (req, res) => {
    const { id } = req.params;
    const { empresa_id } = req;
    try {
        const result = await db.query('DELETE FROM equipos_autorizados WHERE id = $1 AND empresa_id = $2 RETURNING id', [id, empresa_id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado o no pertenece a tu negocio.' });
        }
        res.json({ success: true, message: 'Equipo eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el equipo.' });
    }
};