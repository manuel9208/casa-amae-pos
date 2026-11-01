const db = require('../config/db');

// =========================================================================
// MOTOR DE AUTO-MIGRACIÓN: Prepara la BD automáticamente
// =========================================================================
const asegurarMigracionPromociones = async () => {
    try {
        await db.query('ALTER TABLE promociones DROP CONSTRAINT IF EXISTS promociones_tipo_descuento_check;');
        await db.query(`ALTER TABLE promociones ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'upselling';`);
    } catch (e) {
        console.error("Aviso: Migración de promociones omitida o ya aplicada.", e);
    }
};

exports.obtenerPromociones = async (req, res) => {
    await asegurarMigracionPromociones();
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const result = await db.query(`
            SELECT p.*,
            t.nombre AS trigger_nombre,
            o.nombre AS oferta_nombre, o.imagen_url AS oferta_imagen
            FROM promociones p
            LEFT JOIN productos t ON p.producto_trigger_id = t.id AND t.empresa_id = $1
            LEFT JOIN productos o ON p.producto_oferta_id = o.id AND o.empresa_id = $1
            WHERE p.empresa_id = $1
            ORDER BY p.activo DESC, p.id DESC
        `, [empresaId]); // 🔒 FILTRO EMPRESA
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener promociones' });
    }
};

exports.crearPromocion = async (req, res) => {
    await asegurarMigracionPromociones();
    const { nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin, config_oferta } = req.body;
    const empresaId = req.empresa_id; // 🆕 TENANT

    try {
        const configOfertaParsed = config_oferta ? (typeof config_oferta === 'string' ? config_oferta : JSON.stringify(config_oferta)) : null;

        // 👇 FIX APLICADO: Sanitizar el valor_descuento para que nunca sea un string vacío
        const valorDescuentoLimpio = valor_descuento ? Number(valor_descuento) : 0;

        const result = await db.query(
            `INSERT INTO promociones
            (nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin, config_oferta, empresa_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb, $12) RETURNING *`, // 🆕 TENANT
            [nombre, tipo || 'upselling', producto_trigger_id || null, categoria_trigger || null, producto_oferta_id || null, tipo_descuento, valorDescuentoLimpio, JSON.stringify(dias_aplicables), hora_inicio, hora_fin, configOfertaParsed, empresaId]
        );

        // Aviso en Tiempo Real al Kiosco/Pantallas
        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear la promoción' });
    }
};

exports.actualizarEstadoPromocion = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const result = await db.query('UPDATE promociones SET activo = $1 WHERE id = $2 AND empresa_id = $3 RETURNING *', [activo, id, empresaId]); // 🔒 FILTRO EMPRESA

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Promoción no encontrada o no pertenece a tu negocio.' });
        }

        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar estado de la promoción' });
    }
};

exports.eliminarPromocion = async (req, res) => {
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const result = await db.query('DELETE FROM promociones WHERE id = $1 AND empresa_id = $2 RETURNING id', [req.params.id, empresaId]); // 🔒 FILTRO EMPRESA

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Promoción no encontrada o no pertenece a tu negocio.' });
        }

        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la promoción' });
    }
};

exports.actualizarPromocion = async (req, res) => {
    await asegurarMigracionPromociones();
    const { id } = req.params;
    const { nombre, tipo, producto_trigger_id, categoria_trigger, producto_oferta_id, tipo_descuento, valor_descuento, dias_aplicables, hora_inicio, hora_fin, config_oferta } = req.body;
    const empresaId = req.empresa_id; // 🆕 TENANT
    
    try {
        const configOfertaParsed = config_oferta ? (typeof config_oferta === 'string' ? config_oferta : JSON.stringify(config_oferta)) : null;

        // 👇 FIX APLICADO: Sanitizar el valor_descuento para que nunca sea un string vacío
        const valorDescuentoLimpio = valor_descuento ? Number(valor_descuento) : 0;

        const result = await db.query(
            `UPDATE promociones SET
            nombre = $1, tipo = $2, producto_trigger_id = $3, categoria_trigger = $4,
            producto_oferta_id = $5, tipo_descuento = $6, valor_descuento = $7,
            dias_aplicables = $8::jsonb, hora_inicio = $9, hora_fin = $10, config_oferta = $11::jsonb
            WHERE id = $12 AND empresa_id = $13 RETURNING *`, // 🔒 FILTRO EMPRESA
            [nombre, tipo || 'upselling', producto_trigger_id || null, categoria_trigger || null, producto_oferta_id || null, tipo_descuento, valorDescuentoLimpio, JSON.stringify(dias_aplicables), hora_inicio, hora_fin, configOfertaParsed, id, empresaId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Promoción no encontrada' });

        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al actualizar promoción:", error);
        res.status(500).json({ error: 'Error al actualizar la promoción' });
    }
};