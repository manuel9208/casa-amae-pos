const db = require('../config/db');

// =========================================================================
// 1. INICIALIZACIÓN DE TABLAS (Auto-Migración)
// =========================================================================
exports.inicializarTablas = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS configuracion_asistencia (
                id SERIAL PRIMARY KEY,
                tipo_registro JSONB DEFAULT '["portal"]'::jsonb,
                validacion_activa VARCHAR(50) DEFAULT 'ninguna',
                rango_metros INT DEFAULT 50
            );
        `);

        await db.query(`
            ALTER TABLE configuracion_asistencia 
            ADD COLUMN IF NOT EXISTS metodo_portal VARCHAR(50) DEFAULT 'ambos';
        `);

        await db.query(`
            INSERT INTO configuracion_asistencia (id, tipo_registro, metodo_portal, validacion_activa, rango_metros)
            VALUES (1, '["portal"]'::jsonb, 'ambos', 'ninguna', 50) 
            ON CONFLICT (id) DO NOTHING;
        `);

        try {
            await db.query(`
                ALTER TABLE configuracion_asistencia 
                ALTER COLUMN tipo_registro TYPE JSONB 
                USING CASE 
                    WHEN tipo_registro IS NULL THEN '["portal"]'::jsonb 
                    WHEN tipo_registro::text = '' THEN '["portal"]'::jsonb 
                    ELSE ('["' || tipo_registro::text || '"]')::jsonb 
                END;
            `);
        } catch(e) {}

        await db.query(`
            CREATE TABLE IF NOT EXISTS asistencia_ips (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(50) UNIQUE NOT NULL,
                descripcion VARCHAR(150)
            );

            CREATE TABLE IF NOT EXISTS asistencia_ubicaciones (
                id SERIAL PRIMARY KEY,
                latitud DECIMAL(10, 8) NOT NULL,
                longitud DECIMAL(11, 8) NOT NULL,
                descripcion VARCHAR(150)
            );
        `);
        console.log('✅ Módulo de Asistencia (IPs, GPS y Métodos) inicializado correctamente.');
    } catch (error) {
        console.error('🚨 Error inicializando tablas de asistencia:', error);
    }
};

// =========================================================================
// 2. OBTENER TODA LA CONFIGURACIÓN (General, IPs y GPS)
// =========================================================================
exports.obtenerConfiguracionCompleta = async (req, res) => {
    try {
        const configRes = await db.query('SELECT * FROM configuracion_asistencia WHERE id = 1');
        const ipsRes = await db.query('SELECT * FROM asistencia_ips ORDER BY id DESC');
        const ubicacionesRes = await db.query('SELECT * FROM asistencia_ubicaciones ORDER BY id DESC');

        let generalData = configRes.rows[0] || {};
        
        // Garantizar que tipo_registro siempre se responda como Array
        if (typeof generalData.tipo_registro === 'string') {
            try { generalData.tipo_registro = JSON.parse(generalData.tipo_registro); } catch(e) { generalData.tipo_registro = ['portal']; }
        }

        res.json({
            general: generalData,
            ips: ipsRes.rows,
            ubicaciones: ubicacionesRes.rows
        });
    } catch (error) {
        console.error("Error al obtener config asistencia:", error);
        res.status(500).json({ error: 'Error al obtener la configuración de asistencia.' });
    }
};

// =========================================================================
// 3. ACTUALIZAR CONFIGURACIÓN GENERAL (Métodos y Reglas)
// =========================================================================
exports.actualizarConfiguracionGeneral = async (req, res) => {
    const { tipo_registro, metodo_portal, validacion_activa, rango_metros } = req.body;
    
    let tipoRegistroJSON = '["portal"]';
    if (Array.isArray(tipo_registro)) {
        tipoRegistroJSON = JSON.stringify(tipo_registro);
    } else if (typeof tipo_registro === 'string') {
        tipoRegistroJSON = tipo_registro;
    }

    try {
        const result = await db.query(`
            UPDATE configuracion_asistencia 
            SET tipo_registro = $1::jsonb, metodo_portal = $2, validacion_activa = $3, rango_metros = $4 
            WHERE id = 1 RETURNING *
        `, [tipoRegistroJSON, metodo_portal || 'ambos', validacion_activa || 'ninguna', rango_metros || 50]);

        // Notificar cambio en vivo a través de Sockets
        const io = req.app.get('io');
        if (io) {
            io.emit('config_asistencia_actualizada', result.rows[0]);
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error al actualizar config asistencia:", error);
        res.status(500).json({ error: 'Error al actualizar configuración general.' });
    }
};

// =========================================================================
// 4. GESTIÓN DE IPs
// =========================================================================
exports.agregarIP = async (req, res) => {
    const { ip, descripcion } = req.body;
    if (!ip) return res.status(400).json({ error: 'La dirección IP es obligatoria.' });

    try {
        const result = await db.query(
            'INSERT INTO asistencia_ips (ip, descripcion) VALUES ($1, $2) RETURNING *',
            [ip.trim(), descripcion]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Esta IP ya está registrada.' });
        res.status(500).json({ error: 'Error al guardar la IP.' });
    }
};

exports.eliminarIP = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM asistencia_ips WHERE id = $1', [id]);
        res.json({ success: true, message: 'IP eliminada.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la IP.' });
    }
};

// =========================================================================
// 5. GESTIÓN DE UBICACIONES GPS (Geocercas)
// =========================================================================
exports.agregarUbicacion = async (req, res) => {
    const { latitud, longitud, descripcion } = req.body;
    if (!latitud || !longitud) return res.status(400).json({ error: 'Las coordenadas son obligatorias.' });

    try {
        const result = await db.query(
            'INSERT INTO asistencia_ubicaciones (latitud, longitud, descripcion) VALUES ($1, $2, $3) RETURNING *',
            [latitud, longitud, descripcion]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la ubicación GPS.' });
    }
};

exports.eliminarUbicacion = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM asistencia_ubicaciones WHERE id = $1', [id]);
        res.json({ success: true, message: 'Ubicación eliminada.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la ubicación.' });
    }
};