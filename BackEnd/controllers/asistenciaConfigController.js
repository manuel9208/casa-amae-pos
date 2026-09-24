const db = require('../config/db');

// =========================================================================
// 1. INICIALIZACIÓN DE TABLAS (Auto-Migración)
// =========================================================================
exports.inicializarTablas = async () => {
    try {
        await db.query(`
            -- Tabla 1: Configuración general de cómo se checa asistencia
            CREATE TABLE IF NOT EXISTS configuracion_asistencia (
                id SERIAL PRIMARY KEY,
                tipo_registro VARCHAR(50) DEFAULT 'botones', -- 'botones', 'huella', 'ambos'
                validacion_activa VARCHAR(50) DEFAULT 'ninguna', -- 'ninguna', 'ip', 'ubicacion', 'ambas'
                rango_metros INT DEFAULT 50 -- Radio en metros para la geocerca GPS
            );

            -- Insertar la configuración por defecto si no existe
            INSERT INTO configuracion_asistencia (id, tipo_registro, validacion_activa, rango_metros)
            VALUES (1, 'botones', 'ninguna', 50) ON CONFLICT (id) DO NOTHING;

            -- Tabla 2: IPs permitidas para checar
            CREATE TABLE IF NOT EXISTS asistencia_ips (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(50) UNIQUE NOT NULL,
                descripcion VARCHAR(150)
            );

            -- Tabla 3: Ubicaciones (GPS) permitidas para checar
            CREATE TABLE IF NOT EXISTS asistencia_ubicaciones (
                id SERIAL PRIMARY KEY,
                latitud DECIMAL(10, 8) NOT NULL,
                longitud DECIMAL(11, 8) NOT NULL,
                descripcion VARCHAR(150)
            );
        `);
        console.log('✅ Módulo de Asistencia (IPs y GPS) inicializado correctamente.');
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

        res.json({
            general: configRes.rows[0],
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
    const { tipo_registro, validacion_activa, rango_metros } = req.body;
    try {
        const result = await db.query(`
            UPDATE configuracion_asistencia 
            SET tipo_registro = $1, validacion_activa = $2, rango_metros = $3 
            WHERE id = 1 RETURNING *
        `, [tipo_registro, validacion_activa, rango_metros]);

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