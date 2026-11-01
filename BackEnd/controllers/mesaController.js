const db = require('../config/db');

exports.obtenerMesas = async (req, res) => {
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const query = `
            SELECT m.*, p.numero_pedido, p.total, p.estado_preparacion 
            FROM mesas m 
            LEFT JOIN pedidos p ON m.pedido_actual_id = p.id AND p.empresa_id = $1
            WHERE m.empresa_id = $1
            ORDER BY m.zona ASC, m.numero_mesa ASC
        `;
        const { rows } = await db.query(query, [empresaId]); // 🔒 FILTRO EMPRESA
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener mesas:", error);
        res.status(500).json({ error: 'Error al obtener mesas' });
    }
};

exports.crearMesa = async (req, res) => {
    const { numero_mesa, zona } = req.body;
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        const { rows } = await db.query(
            'INSERT INTO mesas (numero_mesa, zona, empresa_id) VALUES ($1, $2, $3) RETURNING *', // 🆕 TENANT
            [numero_mesa, zona || 'General', empresaId]
        );
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al crear mesa:", error);
        res.status(500).json({ error: 'Error al crear la mesa. Verifica que el número/nombre no exista ya.' });
    }
};

exports.eliminarMesa = async (req, res) => {
    const { id } = req.params;
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        await db.query('DELETE FROM mesas WHERE id = $1 AND empresa_id = $2', [id, empresaId]); // 🔒 FILTRO EMPRESA
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar mesa:", error);
        res.status(500).json({ error: 'Error al eliminar mesa' });
    }
};

exports.actualizarEstadoMesa = async (req, res) => {
    const { id } = req.params;
    const { estado, pedido_actual_id } = req.body;
    const empresaId = req.empresa_id; // 🆕 TENANT
    try {
        await db.query(
            'UPDATE mesas SET estado = $1, pedido_actual_id = $2 WHERE id = $3 AND empresa_id = $4', // 🔒 FILTRO EMPRESA
            [estado, pedido_actual_id, id, empresaId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar estado de mesa:", error);
        res.status(500).json({ error: 'Error al actualizar mesa' });
    }
};

// 👇 NUEVA FUNCIÓN: Para guardar las coordenadas (X, Y) del mapa visual
exports.guardarPosiciones = async (req, res) => {
    const mesasArray = req.body; // Recibimos un arreglo de mesas [{id, pos_x, pos_y}]
    const empresaId = req.empresa_id; // 🆕 TENANT
    
    if (!Array.isArray(mesasArray)) {
        return res.status(400).json({ error: 'Formato inválido' });
    }

    try {
        await db.query('BEGIN');
        for (let mesa of mesasArray) {
            await db.query(
                'UPDATE mesas SET pos_x = $1, pos_y = $2 WHERE id = $3 AND empresa_id = $4', // 🔒 FILTRO EMPRESA
                [mesa.pos_x, mesa.pos_y, mesa.id, empresaId]
            );
        }
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Error al guardar posiciones de mesas:", error);
        res.status(500).json({ error: 'Error al guardar el mapa de mesas' });
    }
};