const db = require('../config/db');

exports.obtenerInsumos = async (req, res) => {
    try { 
        const result = await db.query('SELECT * FROM insumos ORDER BY nombre ASC'); 
        res.json(result.rows); 
    } catch(e) { 
        res.status(500).json({error: 'Error al obtener insumos'}); 
    }
};

exports.crearInsumo = async (req, res) => {
    const { nombre, unidad_medida, cantidad_presentacion, costo_presentacion } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO insumos (nombre, unidad_medida, cantidad_presentacion, costo_presentacion, stock_actual) VALUES ($1, $2, $3, $4, 0) RETURNING *', 
            [nombre, unidad_medida, cantidad_presentacion, costo_presentacion]
        );
        res.status(201).json(result.rows[0]);
    } catch(e) { 
        console.error("Error al crear insumo:", e);
        res.status(500).json({error: 'Error al crear insumo'}); 
    }
};

exports.actualizarInsumo = async (req, res) => {
    const { id } = req.params;
    const { nombre, unidad_medida, cantidad_presentacion, costo_presentacion } = req.body;
    try {
        const result = await db.query(
            'UPDATE insumos SET nombre=$1, unidad_medida=$2, cantidad_presentacion=$3, costo_presentacion=$4 WHERE id=$5 RETURNING *', 
            [nombre, unidad_medida, cantidad_presentacion, costo_presentacion, id]
        );
        res.json(result.rows[0]);
    } catch (error) { 
        console.error("Error al editar insumo:", error);
        res.status(500).json({ error: 'Error al editar insumo' }); 
    }
};

exports.comprarInsumo = async (req, res) => {
    const { id } = req.params;
    const { paquetes_comprados, nuevo_costo_paquete } = req.body;
    try {
        await db.query('BEGIN'); // Iniciar transacción segura

        const ins = await db.query('SELECT cantidad_presentacion FROM insumos WHERE id = $1', [id]);
        if (ins.rows.length === 0) throw new Error(`Insumo no encontrado: ${id}`);
        
        const cant_paquete = parseFloat(ins.rows[0].cantidad_presentacion);
        const paquetes = parseFloat(paquetes_comprados);
        const costo_uni = parseFloat(nuevo_costo_paquete);
        
        const stock_agregado = cant_paquete * paquetes;
        const costo_total = paquetes * costo_uni;
        
        // 1. Actualizar el stock y el costo en la tabla principal
        const result = await db.query(
            'UPDATE insumos SET stock_actual = stock_actual + $1, costo_presentacion = $2 WHERE id = $3 RETURNING *', 
            [stock_agregado, costo_uni, id]
        );

        // 2. Guardar el movimiento en la nueva tabla de historial de compras
        await db.query(
            'INSERT INTO compras_insumos (insumo_id, paquetes, costo_unitario, costo_total) VALUES ($1, $2, $3, $4)',
            [id, paquetes, costo_uni, costo_total]
        );

        await db.query('COMMIT'); // Guardar cambios
        res.json(result.rows[0]);
    } catch(e) { 
        await db.query('ROLLBACK'); // Deshacer si hay error
        console.error("Error al comprar insumo:", e);
        res.status(500).json({error: 'Error al comprar insumo'}); 
    }
};

// ================= NUEVO: REINICIAR STOCK A 0 (MERMAS) =================
exports.reiniciarStock = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'UPDATE insumos SET stock_actual = 0 WHERE id = $1 RETURNING *', 
            [id]
        );
        res.json(result.rows[0]);
    } catch(e) { 
        console.error("Error al reiniciar stock:", e);
        res.status(500).json({error: 'Error al reiniciar stock'}); 
    }
};

exports.eliminarInsumo = async (req, res) => {
    try { 
        await db.query('DELETE FROM insumos WHERE id = $1', [req.params.id]); 
        res.json({success: true}); 
    } catch(e) { 
        res.status(500).json({error: 'Error al eliminar insumo'}); 
    }
};