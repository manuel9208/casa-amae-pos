const db = require('../config/db');

exports.obtenerInsumos = async (req, res) => {
    try { 
        const result = await db.query('SELECT * FROM insumos ORDER BY nombre ASC'); 
        
        // 👇 ESCUDO ANTI-NaN: Limpiamos la data corrupta antes de enviarla al frontend
        const insumosLimpios = result.rows.map(ins => ({
            ...ins,
            stock_actual: isNaN(parseFloat(ins.stock_actual)) ? 0 : parseFloat(ins.stock_actual),
            costo_presentacion: isNaN(parseFloat(ins.costo_presentacion)) ? 0 : parseFloat(ins.costo_presentacion),
            cantidad_presentacion: isNaN(parseFloat(ins.cantidad_presentacion)) || parseFloat(ins.cantidad_presentacion) <= 0 ? 1 : parseFloat(ins.cantidad_presentacion)
        }));
        
        res.json(insumosLimpios); 
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

// ================= CORREGIDO: Escudo total contra NaN =================
exports.comprarInsumo = async (req, res) => {
    const { id } = req.params;
    // Aceptamos las llaves que manden desde cualquier componente frontal (Caja o Admin)
    let paquetes_comprados = req.body.paquetes_comprados !== undefined ? req.body.paquetes_comprados : req.body.paquetes;
    let nuevo_costo_paquete = req.body.nuevo_costo_paquete !== undefined ? req.body.nuevo_costo_paquete : req.body.costo_unitario;

    try {
        await db.query('BEGIN'); // Iniciar transacción segura

        const ins = await db.query('SELECT cantidad_presentacion, costo_presentacion, stock_actual FROM insumos WHERE id = $1', [id]);
        if (ins.rows.length === 0) throw new Error(`Insumo no encontrado: ${id}`);
        
        // Verificaciones matemáticas seguras
        const cant_paquete = parseFloat(ins.rows[0].cantidad_presentacion) || 1;
        const paquetes = parseFloat(paquetes_comprados) || 0;
        
        let costo_uni = parseFloat(nuevo_costo_paquete);
        if (isNaN(costo_uni)) {
            costo_uni = parseFloat(ins.rows[0].costo_presentacion) || 0;
        }
        
        const stock_agregado = cant_paquete * paquetes;
        const costo_total = paquetes * costo_uni;
        
        // Limpiamos el stock actual por si la BD ya estaba corrupta con un NaN
        const stock_actual_real = parseFloat(ins.rows[0].stock_actual) || 0;
        const nuevo_stock_total = stock_actual_real + stock_agregado;

        // 1. Actualizar el stock y el costo en la tabla principal
        const result = await db.query(
            'UPDATE insumos SET stock_actual = $1, costo_presentacion = $2 WHERE id = $3 RETURNING *', 
            [nuevo_stock_total, costo_uni, id]
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

exports.obtenerComprasHoy = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT ci.id, ci.costo_total, i.nombre 
            FROM compras_insumos ci 
            JOIN insumos i ON ci.insumo_id = i.id 
            WHERE DATE(ci.fecha_compra) = CURRENT_DATE
        `);
        res.json(result.rows);
    } catch (e) {
        console.error("Error al obtener compras de hoy:", e);
        res.status(500).json({error: 'Error al obtener compras de hoy'});
    }
};

exports.reiniciarStock = async (req, res) => {
    const { id } = req.params;
    try {
        // Al forzarlo a 0 borramos permanentemente cualquier NaN que se haya colado
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