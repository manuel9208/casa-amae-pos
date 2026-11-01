const db = require('../config/db');
const nodemailer = require('nodemailer');

// ==========================================
// 🛡️ AUTO-MIGRACIÓN DE TABLA: PEDIDOS B2B
// ==========================================
exports.inicializarTablas = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS dist_pedidos (
                id SERIAL PRIMARY KEY,
                numero_pedido INTEGER NOT NULL,
                cajero_id INTEGER,
                cliente_id INTEGER,
                cliente_nombre VARCHAR(255),
                cliente_telefono VARCHAR(50),
                correo_cliente VARCHAR(255),
                tipo_consumo VARCHAR(50),
                direccion_entrega TEXT,
                costo_envio NUMERIC(10,2) DEFAULT 0,
                repartidor_id INTEGER,
                es_reparto_externo BOOLEAN DEFAULT false,
                costo_reparto_externo NUMERIC(10,2) DEFAULT 0,
                metodo_pago VARCHAR(50),
                monto_efectivo NUMERIC(10,2) DEFAULT 0,
                monto_tarjeta NUMERIC(10,2) DEFAULT 0,
                monto_transferencia NUMERIC(10,2) DEFAULT 0,
                total NUMERIC(10,2) NOT NULL,
                carrito JSONB NOT NULL,
                estado_preparacion VARCHAR(50) DEFAULT 'Entregado',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabla 'dist_pedidos' (Ventas de Distribución) verificada/creada.");
    } catch (error) {
        console.error("🚨 Error al inicializar tabla dist_pedidos:", error);
    }
};

// ==========================================
// 📦 PROCESAR VENTA DE MAYOREO
// ==========================================
exports.crearVenta = async (req, res) => {
    const { empresa_id } = req;
    const {
        cajero_id,
        cliente_id,
        cliente_nombre,
        cliente_telefono,
        correo_cliente,
        guardar_como_verificado, 
        tipo_consumo,
        direccion_entrega,
        costo_envio,
        repartidor_id,
        es_reparto_externo,
        costo_reparto_externo,   
        metodo_pago,
        pagos_mixtos,            
        total,
        carrito,
        estado_preparacion // 👈 FIX: Extracción del estado enviado por el frontend
    } = req.body;

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. REGLA 1: Guardar como cliente verificado si el usuario lo solicitó
        let finalClienteId = cliente_id;
        if (!finalClienteId && guardar_como_verificado && cliente_nombre) {
            const resCli = await client.query(
                `INSERT INTO dist_clientes (empresa, nombre_contacto, telefono, correo, tiene_credito, empresa_id) 
                 VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
                [cliente_nombre, cliente_nombre, cliente_telefono || '', correo_cliente || null, empresa_id]
            );
            finalClienteId = resCli.rows[0].id;
        }

        // 2. REGLA 4: Desglose exacto del Pago Mixto
        let m_efectivo = 0, m_tarjeta = 0, m_transf = 0;
        if (metodo_pago === 'Mixto' && Array.isArray(pagos_mixtos)) {
            pagos_mixtos.forEach(p => {
                if (p.metodo === 'Efectivo') m_efectivo += Number(p.monto || 0);
                if (p.metodo === 'Tarjeta') m_tarjeta += Number(p.monto || 0);
                if (p.metodo === 'Transferencia') m_transf += Number(p.monto || 0);
            });
        } else if (metodo_pago === 'Efectivo') { m_efectivo = Number(total); }
        else if (metodo_pago === 'Tarjeta') { m_tarjeta = Number(total); }
        else if (metodo_pago === 'Transferencia') { m_transf = Number(total); }

        // 3. REGLA 3: Obtener número de pedido y guardar la venta con Timestamp
        // 🔒 Patrón 11 corregido: el folio ahora se calcula AISLADO por empresa,
        // para que 2 negocios no compitan por el mismo consecutivo del día.
        const nroRes = await client.query("SELECT COALESCE(MAX(numero_pedido), 0) + 1 AS num FROM dist_pedidos WHERE fecha_creacion::DATE = CURRENT_DATE AND empresa_id = $1", [empresa_id]);
        const sigNumero = nroRes.rows[0].num;

        // 👇 FIX: Modificada la inyección SQL para recibir explícitamente el estado_preparacion (Variable $19) + empresa_id ($20)
        const insertVenta = await client.query(
            `INSERT INTO dist_pedidos (
                numero_pedido, cajero_id, cliente_id, cliente_nombre, cliente_telefono, correo_cliente,
                tipo_consumo, direccion_entrega, costo_envio, repartidor_id, es_reparto_externo, costo_reparto_externo,
                metodo_pago, monto_efectivo, monto_tarjeta, monto_transferencia, total, carrito, estado_preparacion, empresa_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
            [
                sigNumero, cajero_id || null, finalClienteId || null, cliente_nombre || 'Invitado B2B',
                cliente_telefono || null, correo_cliente || null, tipo_consumo, direccion_entrega, Number(costo_envio || 0),
                repartidor_id || null, es_reparto_externo || false, Number(costo_reparto_externo || 0),
                metodo_pago, m_efectivo, m_tarjeta, m_transf, Number(total), JSON.stringify(carrito),
                estado_preparacion || 'Listo', empresa_id
            ]
        );

        const ventaGuardada = insertVenta.rows[0];

        // 4. REGLA 2: Descontar stock del catálogo de Distribución (dist_articulos)
        if (Array.isArray(carrito)) {
            for (const item of carrito) {
                const idReal = String(item.id).replace('B2B_', '');
                if (!isNaN(parseInt(idReal))) {
                    await client.query(
                        'UPDATE dist_articulos SET stock_actual = stock_actual - $1 WHERE id = $2 AND usa_stock = true AND empresa_id = $3',
                        [Number(item.cantidad || 1), parseInt(idReal), empresa_id]
                    );
                }
            }
        }

        // 5. REGLA 5: Notificaciones si la venta es a Crédito
        if (metodo_pago === 'Crédito') {
            const io = req.app.get('io');
            if (io) {
                io.emit('alerta_admin', { 
                    titulo: 'Venta a Crédito B2B', 
                    mensaje: `Se registró una venta a crédito por $${total} al cliente ${cliente_nombre || 'Desconocido'}.`,
                    fecha: new Date()
                });
            }

            const confRes = await client.query('SELECT * FROM dist_configuracion WHERE empresa_id = $1', [empresa_id]);
            const conf = confRes.rows[0] || {};
            if (conf.smtp_email && conf.smtp_password && (correo_cliente || finalClienteId)) {
                let correoDestino = correo_cliente;
                if (!correoDestino && finalClienteId) {
                    const cRes = await client.query('SELECT correo FROM dist_clientes WHERE id = $1 AND empresa_id = $2', [finalClienteId, empresa_id]);
                    correoDestino = cRes.rows[0]?.correo;
                }

                if (correoDestino) {
                    const transporter = nodemailer.createTransport({
                        host: conf.smtp_host || 'smtp.gmail.com',
                        port: Number(conf.smtp_puerto || 465),
                        secure: Number(conf.smtp_puerto || 465) === 465,
                        auth: { user: conf.smtp_email.trim(), pass: conf.smtp_password.trim() }
                    });

                    await transporter.sendMail({
                        from: `"${conf.distribucion_nombre || 'Distribución'}" <${conf.smtp_email}>`,
                        to: correoDestino,
                        subject: `📝 Nota de Crédito Registrada - Orden #${sigNumero}`,
                        html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2>Hola, ${cliente_nombre}</h2>
                        <p>Te confirmamos que se ha registrado una nueva compra a tu línea de crédito comercial.</p>
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Orden B2B:</strong> #${sigNumero}</p>
                        <p><strong>Total con cargo a crédito:</strong> $${Number(total).toFixed(2)}</p>
                        </div>
                        <p>Esta nota se sumará a tu estado de cuenta actual. Gracias por tu preferencia.</p>
                        </div>
                    `
                    }).catch(() => null); 
                }
            }
        }

        await client.query('COMMIT');

        // Avisamos a las pantallas que el catálogo (stock) cambió
        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');

        res.status(201).json(ventaGuardada);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("🚨 Error al procesar venta de distribución:", error);
        res.status(500).json({ error: 'Error interno al registrar la venta de mayoreo.' });
    } finally {
        client.release();
    }
};

// ==========================================
// 📊 OBTENER HISTORIAL DE VENTAS B2B
// ==========================================
exports.obtenerVentas = async (req, res) => {
    const { empresa_id } = req;
    try {
        const result = await db.query('SELECT * FROM dist_pedidos WHERE empresa_id = $1 ORDER BY fecha_creacion DESC LIMIT 200', [empresa_id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de ventas B2B.' });
    }
};

// ==========================================
// 🔄 ACTUALIZAR ESTADO DE VENTA B2B (Reparto, Cobro, etc.)
// ==========================================
exports.actualizarEstado = async (req, res) => {
    const { id } = req.params;
    const { empresa_id } = req;
    const { 
        estado_preparacion, 
        repartidor_id, 
        metodo_pago, 
        pagos_mixtos, 
        monto_efectivo, 
        monto_tarjeta, 
        monto_transferencia 
    } = req.body;

    try {
        let updateFields = [];
        let params = [];
        let queryIndex = 1;

        if (estado_preparacion !== undefined) {
            updateFields.push(`estado_preparacion = $${queryIndex++}`);
            params.push(estado_preparacion);
        }
        if (repartidor_id !== undefined) {
            updateFields.push(`repartidor_id = $${queryIndex++}`);
            params.push(repartidor_id);
        }
        if (metodo_pago !== undefined) {
            updateFields.push(`metodo_pago = $${queryIndex++}`);
            params.push(metodo_pago);
        }
        if (monto_efectivo !== undefined) {
            updateFields.push(`monto_efectivo = $${queryIndex++}`);
            params.push(monto_efectivo);
        }
        if (monto_tarjeta !== undefined) {
            updateFields.push(`monto_tarjeta = $${queryIndex++}`);
            params.push(monto_tarjeta);
        }
        if (monto_transferencia !== undefined) {
            updateFields.push(`monto_transferencia = $${queryIndex++}`);
            params.push(monto_transferencia);
        }
        if (pagos_mixtos !== undefined) {
            updateFields.push(`pagos_mixtos = $${queryIndex++}`);
            params.push(JSON.stringify(pagos_mixtos));
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos válidos para actualizar.' });
        }

        // 🔒 Patrón 9 corregido: se agrega el filtro de empresa_id como
        // última condición del WHERE, preservando el armado dinámico original.
        params.push(id);
        params.push(empresa_id);
        const query = `UPDATE dist_pedidos SET ${updateFields.join(', ')} WHERE id = $${queryIndex} AND empresa_id = $${queryIndex + 1} RETURNING *`;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Orden de mayoreo no encontrada o no pertenece a tu negocio.' });
        }

        // 📡 Emitir evento en vivo para refrescar las pantallas
        const io = req.app.get('io');
        if (io) {
            io.emit('catalogo_actualizado'); 
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("🚨 Error al actualizar estado de venta B2B:", error);
        res.status(500).json({ error: 'Error interno al actualizar el estado de la orden B2B.' });
    }
};