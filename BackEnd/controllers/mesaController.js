const db = require('../config/db');

exports.obtenerMesas = async (req, res) => {
    try {
        const query = `
            SELECT m.*, p.numero_pedido, p.total, p.estado_preparacion 
            FROM mesas m 
            LEFT JOIN pedidos p ON m.pedido_actual_id = p.id
            ORDER BY m.zona ASC, m.numero_mesa ASC
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener mesas:", error);
        res.status(500).json({ error: 'Error al obtener mesas' });
    }
};

exports.crearMesa = async (req, res) => {
    const { numero_mesa, zona } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO mesas (numero_mesa, zona) VALUES ($1, $2) RETURNING *',
            [numero_mesa, zona || 'General']
        );
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al crear mesa:", error);
        res.status(500).json({ error: 'Error al crear la mesa. Verifica que el número/nombre no exista ya.' });
    }
};

exports.eliminarMesa = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM mesas WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar mesa:", error);
        res.status(500).json({ error: 'Error al eliminar mesa' });
    }
};

exports.actualizarEstadoMesa = async (req, res) => {
    const { id } = req.params;
    const { estado, pedido_actual_id } = req.body;
    try {
        await db.query(
            'UPDATE mesas SET estado = $1, pedido_actual_id = $2 WHERE id = $3',
            [estado, pedido_actual_id, id]
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
    
    if (!Array.isArray(mesasArray)) {
        return res.status(400).json({ error: 'Formato inválido' });
    }

    try {
        await db.query('BEGIN');
        for (let mesa of mesasArray) {
            await db.query(
                'UPDATE mesas SET pos_x = $1, pos_y = $2 WHERE id = $3',
                [mesa.pos_x, mesa.pos_y, mesa.id]
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