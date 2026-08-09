const pool = require('../config/db'); // 👈 AQUÍ ESTÁ LA CORRECCIÓN DE LA RUTA

// =========================================================================
// 1. INICIALIZACIÓN DE LA TABLA (Auto-Migración para Neon.tech)
// =========================================================================
const inicializarTablaCombos = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS combos (
            id SERIAL PRIMARY KEY,
            producto_base_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
            nombre VARCHAR(255) NOT NULL,
            configuracion_grupos JSONB NOT NULL,
            activo BOOLEAN DEFAULT true,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(query);
        console.log('✅ Tabla "combos" verificada/creada exitosamente en PostgreSQL.');
    } catch (error) {
        console.error('❌ Error al inicializar la tabla "combos":', error);
    }
};

// =========================================================================
// 2. OBTENER TODOS LOS COMBOS
// =========================================================================
const obtenerCombos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, p.nombre as producto_base_nombre, p.imagen_url as producto_base_imagen 
            FROM combos c
            JOIN productos p ON c.producto_base_id = p.id
            ORDER BY c.creado_en DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener combos:', error);
        res.status(500).json({ error: 'Error interno al obtener la lista de combos.' });
    }
};

// =========================================================================
// 3. CREAR UN NUEVO COMBO
// =========================================================================
const crearCombo = async (req, res) => {
    const { producto_base_id, nombre, configuracion_grupos, activo } = req.body;

    if (!producto_base_id || !nombre || !configuracion_grupos) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para crear el combo.' });
    }

    try {
        const query = `
            INSERT INTO combos (producto_base_id, nombre, configuracion_grupos, activo)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [
            producto_base_id, 
            nombre, 
            JSON.stringify(configuracion_grupos), // Guardado como JSONB
            activo !== undefined ? activo : true
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear combo:', error);
        res.status(500).json({ error: 'Error interno al guardar el combo.' });
    }
};

// =========================================================================
// 4. ACTUALIZAR UN COMBO EXISTENTE
// =========================================================================
const actualizarCombo = async (req, res) => {
    const { id } = req.params;
    const { producto_base_id, nombre, configuracion_grupos, activo } = req.body;

    try {
        const query = `
            UPDATE combos 
            SET producto_base_id = $1, 
                nombre = $2, 
                configuracion_grupos = $3, 
                activo = $4
            WHERE id = $5
            RETURNING *;
        `;
        const values = [
            producto_base_id, 
            nombre, 
            JSON.stringify(configuracion_grupos), 
            activo, 
            id
        ];

        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Combo no encontrado para actualizar.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar combo:', error);
        res.status(500).json({ error: 'Error interno al actualizar el combo.' });
    }
};

// =========================================================================
// 5. CAMBIAR ESTADO DE UN COMBO (Activar/Desactivar)
// =========================================================================
const cambiarEstadoCombo = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    try {
        const query = `UPDATE combos SET activo = $1 WHERE id = $2 RETURNING *;`;
        const result = await pool.query(query, [activo, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Combo no encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al cambiar estado del combo:', error);
        res.status(500).json({ error: 'Error interno al cambiar el estado.' });
    }
};

// =========================================================================
// 6. ELIMINAR UN COMBO PERMANENTEMENTE
// =========================================================================
const eliminarCombo = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`DELETE FROM combos WHERE id = $1 RETURNING id;`, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Combo no encontrado para eliminar.' });
        }

        res.json({ mensaje: 'Combo eliminado exitosamente.', id_eliminado: id });
    } catch (error) {
        console.error('Error al eliminar combo:', error);
        res.status(500).json({ error: 'Error interno al eliminar el combo.' });
    }
};

module.exports = {
    inicializarTablaCombos,
    obtenerCombos,
    crearCombo,
    actualizarCombo,
    cambiarEstadoCombo,
    eliminarCombo
};