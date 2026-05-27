const db = require('../config/db');

exports.obtenerInsumos = async (req, res) => {
    try { 
        const result = await db.query('SELECT * FROM insumos ORDER BY nombre ASC'); 
        
        // 👇 ESCUDO ANTI-NaN + NUEVOS CAMPOS DE RENDIMIENTO
        const insumosLimpios = result.rows.map(ins => ({
            ...ins,
            stock_actual: isNaN(parseFloat(ins.stock_actual)) ? 0 : parseFloat(ins.stock_actual),
            costo_presentacion: isNaN(parseFloat(ins.costo_presentacion)) ? 0 : parseFloat(ins.costo_presentacion),
            cantidad_presentacion: isNaN(parseFloat(ins.cantidad_presentacion)) || parseFloat(ins.cantidad_presentacion) <= 0 ? 1 : parseFloat(ins.cantidad_presentacion),
            factor_rendimiento: isNaN(parseFloat(ins.factor_rendimiento)) ? 1 : parseFloat(ins.factor_rendimiento), // Nuevo
            es_empaque: ins.es_empaque === true || ins.es_empaque === 'true'
        }));
        
        res.json(insumosLimpios); 
    } catch(e) { 
        res.status(500).json({error: 'Error al obtener insumos'}); 
    }
};

exports.crearInsumo = async (req, res) => {
    const { nombre, unidad_medida, cantidad_presentacion, costo_presentacion, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio } = req.body;
    try {
        // 👇 MAGIA DEL RENDIMIENTO: Calculamos el multiplicador secreto
        let factor_rendimiento = 1.0000;
        const tipo = tipo_rendimiento || 'Directo';
        
        if (tipo === 'Merma' || tipo === 'Expansión') {
            const crudo = parseFloat(peso_prueba_crudo) || 0;
            const limpio = parseFloat(peso_prueba_limpio) || 0;
            if (crudo > 0) {
                factor_rendimiento = limpio / crudo; // Ej: 200g / 400g = 0.5 (Pepino) || 2500g / 1000g = 2.5 (Arroz)
            }
        }

        const result = await db.query(
            `INSERT INTO insumos 
            (nombre, unidad_medida, cantidad_presentacion, costo_presentacion, stock_actual, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio, factor_rendimiento) 
            VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9) RETURNING *`, 
            [nombre, unidad_medida, cantidad_presentacion, costo_presentacion, Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento]
        );
        res.status(201).json(result.rows[0]);
    } catch(e) { 
        console.error("Error al crear insumo:", e);
        res.status(500).json({error: 'Error al crear insumo'}); 
    }
};

exports.actualizarInsumo = async (req, res) => {
    const { id } = req.params;
    const { nombre, unidad_medida, cantidad_presentacion, costo_presentacion, es_empaque, tipo_rendimiento, peso_prueba_crudo, peso_prueba_limpio } = req.body;
    try {
        // 👇 MAGIA DEL RENDIMIENTO AL EDITAR
        let factor_rendimiento = 1.0000;
        const tipo = tipo_rendimiento || 'Directo';
        
        if (tipo === 'Merma' || tipo === 'Expansión') {
            const crudo = parseFloat(peso_prueba_crudo) || 0;
            const limpio = parseFloat(peso_prueba_limpio) || 0;
            if (crudo > 0) factor_rendimiento = limpio / crudo;
        }

        const result = await db.query(
            `UPDATE insumos SET 
            nombre=$1, unidad_medida=$2, cantidad_presentacion=$3, costo_presentacion=$4, es_empaque=$5,
            tipo_rendimiento=$6, peso_prueba_crudo=$7, peso_prueba_limpio=$8, factor_rendimiento=$9 
            WHERE id=$10 RETURNING *`, 
            [nombre, unidad_medida, cantidad_presentacion, costo_presentacion, Boolean(es_empaque), tipo, peso_prueba_crudo || null, peso_prueba_limpio || null, factor_rendimiento, id]
        );
        res.json(result.rows[0]);
    } catch (error) { 
        console.error("Error al editar insumo:", error);
        res.status(500).json({ error: 'Error al editar insumo' }); 
    }
};

exports.comprarInsumo = async (req, res) => {
    const { id } = req.params;
    let paquetes_comprados = req.body.paquetes_comprados !== undefined ? req.body.paquetes_comprados : req.body.paquetes;
    let nuevo_costo_paquete = req.body.nuevo_costo_paquete !== undefined ? req.body.nuevo_costo_paquete : req.body.costo_unitario;

    try {
        await db.query('BEGIN'); 

        const ins = await db.query('SELECT cantidad_presentacion, costo_presentacion, stock_actual, factor_rendimiento FROM insumos WHERE id = $1', [id]);
        if (ins.rows.length === 0) throw new Error(`Insumo no encontrado: ${id}`);
        
        const cant_paquete = parseFloat(ins.rows[0].cantidad_presentacion) || 1;
        const paquetes = parseFloat(paquetes_comprados) || 0;
        
        // Obtenemos el factor (Ej: 0.5 para el pepino, 2.5 para el arroz)
        const factor = parseFloat(ins.rows[0].factor_rendimiento) || 1;
        
        let costo_uni = parseFloat(nuevo_costo_paquete);
        if (isNaN(costo_uni)) {
            costo_uni = parseFloat(ins.rows[0].costo_presentacion) || 0;
        }
        
        // 👇 AQUÍ SUCEDE LA MAGIA EN INVENTARIO: 
        // Si compras 1 paquete de 1000g de pepino, cant_paquete(1000) * paquetes(1) * factor(0.5) = 500g REALES a tu stock.
        const stock_agregado = cant_paquete * paquetes * factor; 
        const costo_total = paquetes * costo_uni;
        
        const stock_actual_real = parseFloat(ins.rows[0].stock_actual) || 0;
        const nuevo_stock_total = stock_actual_real + stock_agregado;

        const result = await db.query(
            'UPDATE insumos SET stock_actual = $1, costo_presentacion = $2 WHERE id = $3 RETURNING *', 
            [nuevo_stock_total, costo_uni, id]
        );

        await db.query(
            'INSERT INTO compras_insumos (insumo_id, paquetes, costo_unitario, costo_total) VALUES ($1, $2, $3, $4)',
            [id, paquetes, costo_uni, costo_total]
        );

        await db.query('COMMIT'); 
        res.json(result.rows[0]);
    } catch(e) { 
        await db.query('ROLLBACK'); 
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