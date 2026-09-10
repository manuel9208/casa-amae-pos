const db = require('../config/db');

exports.obtenerConfiguracion = async (req, res) => {
    try {
        // Auto-migración para añadir las columnas si no existen
        await db.query(`
            ALTER TABLE configuracion_biometria 
            ADD COLUMN IF NOT EXISTS roles_restringidos JSONB DEFAULT '["cajero", "cocina", "repartidor"]',
            ADD COLUMN IF NOT EXISTS pantallas_restringidas JSONB DEFAULT '["caja", "cocina", "admin"]'
        `).catch(() => {});

        // 👇 NUEVA AUTO-MIGRACIÓN PARA LA MATRIZ DE ROLES POR EQUIPO
        await db.query(`
            ALTER TABLE equipos_autorizados 
            ADD COLUMN IF NOT EXISTS roles_permitidos JSONB DEFAULT '[]'
        `).catch(() => {});

        const result = await db.query('SELECT control_dispositivos_activo, roles_restringidos, pantallas_restringidas, smtp_host, smtp_port, smtp_user, correo_remitente FROM configuracion_biometria WHERE id = 1');
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la configuración biométrica.' });
    }
};

exports.actualizarConfiguracion = async (req, res) => {
    const { control_dispositivos_activo, roles_restringidos, pantallas_restringidas, smtp_host, smtp_port, smtp_user, smtp_pass, correo_remitente } = req.body;
    try {
        let query = 'UPDATE configuracion_biometria SET control_dispositivos_activo = $1, roles_restringidos = $2, pantallas_restringidas = $3, smtp_host = $4, smtp_port = $5, smtp_user = $6, correo_remitente = $7';
        let params = [
            control_dispositivos_activo, 
            JSON.stringify(roles_restringidos || []), 
            JSON.stringify(pantallas_restringidas || []), 
            smtp_host, smtp_port, smtp_user, correo_remitente
        ];

        if (smtp_pass && smtp_pass.trim() !== '') {
            query += ', smtp_pass = $8 WHERE id = 1 RETURNING control_dispositivos_activo';
            params.push(smtp_pass);
        } else {
            query += ' WHERE id = 1 RETURNING control_dispositivos_activo';
        }

        const result = await db.query(query, params);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar configuración.' });
    }
};

exports.obtenerEquipos = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM equipos_autorizados ORDER BY fecha_registro DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los equipos autorizados.' });
    }
};

exports.registrarEquipo = async (req, res) => {
    const { device_id, alias, pantallas_permitidas, roles_permitidos } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO equipos_autorizados (device_id, alias, pantallas_permitidas, roles_permitidos, estatus) 
             VALUES ($1, $2, $3, $4, 'Activo') 
             ON CONFLICT (device_id) DO UPDATE 
             SET alias = EXCLUDED.alias, pantallas_permitidas = EXCLUDED.pantallas_permitidas, roles_permitidos = EXCLUDED.roles_permitidos 
             RETURNING *`,
            [
                device_id, 
                alias || 'Tablet Nueva', 
                JSON.stringify(pantallas_permitidas || ['empleado']),
                JSON.stringify(roles_permitidos || ['cajero', 'cocina', 'jefe', 'gerente'])
            ]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el equipo.' });
    }
};

exports.actualizarEquipo = async (req, res) => {
    const { id } = req.params;
    const { alias, pantallas_permitidas, roles_permitidos, estatus } = req.body;
    try {
        const result = await db.query(
            'UPDATE equipos_autorizados SET alias = $1, pantallas_permitidas = $2, roles_permitidos = $3, estatus = $4 WHERE id = $5 RETURNING *',
            [alias, JSON.stringify(pantallas_permitidas), JSON.stringify(roles_permitidos), estatus, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el equipo.' });
    }
};

exports.eliminarEquipo = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM equipos_autorizados WHERE id = $1', [id]);
        res.json({ success: true, message: 'Equipo eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el equipo.' });
    }
};