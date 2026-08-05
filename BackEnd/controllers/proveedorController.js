const db = require('../config/db');
const nodemailer = require('nodemailer');
const webpush = require('web-push'); // 👈 NUEVO: Motor de Push Nativo  

// ==========================================
// 🛡️ AUTO-MIGRACIÓN DE TABLAS AISLADAS
// ==========================================
const inicializarTablas = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS configuracion_proveedores (
                id SERIAL PRIMARY KEY,
                correos_smtp JSON DEFAULT '[]',
                ajustes_extra JSON DEFAULT '{}'
            );
        `);  

        await db.query(`
            INSERT INTO configuracion_proveedores (id, correos_smtp, ajustes_extra)
            SELECT 1, '[]', '{}' WHERE NOT EXISTS (SELECT 1 FROM configuracion_proveedores WHERE id = 1);
        `);  

        await db.query(`
            CREATE TABLE IF NOT EXISTS proveedores (
                id SERIAL PRIMARY KEY,
                empresa VARCHAR(255) NOT NULL,
                telefono_empresa VARCHAR(50),
                correo VARCHAR(255),
                contacto VARCHAR(255),
                telefono_contacto VARCHAR(50),
                rfc VARCHAR(50),
                merma_esperada DECIMAL(10,2) DEFAULT 0,
                stock_minimo_alerta DECIMAL(10,2) DEFAULT 0,
                enviar_email BOOLEAN DEFAULT false,
                enviar_wa BOOLEAN DEFAULT false,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                articulos_suministrados JSON DEFAULT '[]'
            );
        `);  

        await db.query(`
            CREATE TABLE IF NOT EXISTS gastos_proveedores (
                id SERIAL PRIMARY KEY,
                proveedor_id INTEGER NOT NULL,
                total_pago DECIMAL(10,2) DEFAULT 0,
                fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                origen VARCHAR(50) DEFAULT 'Caja',
                estado VARCHAR(50) DEFAULT 'Pendiente',
                usuario_id INTEGER NULL,
                articulos_comprados JSON DEFAULT '[]'
            );
        `);
        console.log("✅ Tablas de Proveedores y su Configuración Exclusiva verificadas/creadas.");
    } catch (error) {
        console.error("🚨 Error al inicializar tablas de proveedores:", error);
    }
};  

inicializarTablas();  

// ==========================================
// ⚙️ MÓDULO: CONFIGURACIÓN EXCLUSIVA DE PROVEEDORES
// ==========================================
exports.obtenerConfiguracion = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM configuracion_proveedores WHERE id = 1');
        res.json(result.rows[0] || { correos_smtp: [], ajustes_extra: {} });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la configuración de proveedores.' });
    }
};  

exports.actualizarConfiguracion = async (req, res) => {
    const { correos_smtp, ajustes_extra } = req.body;
    try {
        const result = await db.query(
            `UPDATE configuracion_proveedores
             SET correos_smtp = $1, ajustes_extra = $2
             WHERE id = 1 RETURNING *`,
            [JSON.stringify(correos_smtp || []), JSON.stringify(ajustes_extra || {})]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar configuración de proveedores.' });
    }
};  

// ==========================================
// 🔔 MOTOR DE ALERTAS PUSH / SOCKETS PARA ADMINS
// ==========================================
const alertarAdministradores = async (req, titulo, mensaje) => {
    try {
        // 1. Alerta visual inmediata (Socket.io) para pantallas abiertas
        const io = req.app.get('io');
        if (io) {
            io.emit('alerta_admin', { titulo, mensaje, fecha: new Date() });
            io.emit('catalogo_actualizado');
        }  

        // 2. Notificación Push Nativa (Celulares/PC en segundo plano)
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            webpush.setVapidDetails(
                `mailto:${process.env.VAPID_EMAIL || 'admin@sistema.com'}`,
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
            );  

            // Cruzamos las tablas para enviar SOLO a Admins y Gerentes
            const subsRes = await db.query(`
                SELECT sp.suscripcion
                FROM suscripciones_push sp
                JOIN usuarios u ON sp.usuario_id = u.id
                WHERE u.rol IN ('admin', 'gerente')
            `);  

            if (subsRes.rows.length > 0) {
                const payload = JSON.stringify({
                    title: titulo,
                    body: mensaje,
                    icon: '/logo192.png', // Icono de tu PWA
                    badge: '/logo192.png',
                    url: '/admin' // Al darle tap, los llevará al administrador
                });  

                const promesas = subsRes.rows.map(row => {
                    const sub = typeof row.suscripcion === 'string' ? JSON.parse(row.suscripcion) : row.suscripcion;
                    return webpush.sendNotification(sub, payload).catch(err => {
                        // Limpieza automática: Si el admin cambió de celular o revocó el permiso, borramos la suscripción muerta
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            db.query("DELETE FROM suscripciones_push WHERE suscripcion->>'endpoint' = $1", [sub.endpoint]).catch(()=>null);
                        }
                    });
                });  

                await Promise.all(promesas);
                console.log(`✅ Push Notification enviada a ${subsRes.rows.length} administradores.`);
            }
        } else {
            console.warn("⚠️ VAPID Keys no encontradas en .env. Saltando notificación Push nativa.");
        }
    } catch (error) {
        console.error("🚨 Error al emitir alerta a administradores", error);
    }
};  

// ==========================================
// 🚚 MÓDULO: DIRECTORIO DE PROVEEDORES
// ==========================================
exports.obtenerProveedores = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM proveedores ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los proveedores.' });
    }
};  

exports.crearProveedor = async (req, res) => {
    const {
        empresa, telefono_empresa, correo, contacto, telefono_contacto, rfc,
        merma_esperada, stock_minimo_alerta, enviar_email, enviar_wa, articulos_suministrados
    } = req.body;  

    try {
        const result = await db.query(
            `INSERT INTO proveedores
            (empresa, telefono_empresa, correo, contacto, telefono_contacto, rfc, merma_esperada, stock_minimo_alerta, enviar_email, enviar_wa, articulos_suministrados)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                empresa, telefono_empresa, correo, contacto, telefono_contacto, rfc,
                merma_esperada || 0, stock_minimo_alerta || 0, enviar_email || false, enviar_wa || false,
                JSON.stringify(articulos_suministrados || [])
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el proveedor.' });
    }
};  

exports.actualizarProveedor = async (req, res) => {
    const { id } = req.params;
    const {
        empresa, telefono_empresa, correo, contacto, telefono_contacto, rfc,
        merma_esperada, stock_minimo_alerta, enviar_email, enviar_wa, articulos_suministrados
    } = req.body;  

    try {
        const result = await db.query(
            `UPDATE proveedores SET
            empresa=$1, telefono_empresa=$2, correo=$3, contacto=$4, telefono_contacto=$5, rfc=$6,
            merma_esperada=$7, stock_minimo_alerta=$8, enviar_email=$9, enviar_wa=$10, articulos_suministrados=$11
            WHERE id=$12 RETURNING *`,
            [
                empresa, telefono_empresa, correo, contacto, telefono_contacto, rfc,
                merma_esperada || 0, stock_minimo_alerta || 0, enviar_email || false, enviar_wa || false,
                JSON.stringify(articulos_suministrados || []), id
            ]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el proveedor.' });
    }
};  

exports.eliminarProveedor = async (req, res) => {
    try {
        await db.query('DELETE FROM proveedores WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el proveedor. Verifica que no tenga facturas activas.' });
    }
};  

// ==========================================
// 💵 MÓDULO: GASTOS Y FACTURAS
// ==========================================
exports.obtenerGastos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT gp.*, p.empresa, p.contacto, p.telefono_contacto, p.correo
            FROM gastos_proveedores gp
            JOIN proveedores p ON gp.proveedor_id = p.id
            ORDER BY gp.fecha_compra DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de facturas.' });
    }
};  

exports.registrarGasto = async (req, res) => {
    const { proveedor_id, cantidad_recibida, total_pago, origen, estado, usuario_id, articulos_comprados } = req.body;  

    try {
        const result = await db.query(
            `INSERT INTO gastos_proveedores
            (proveedor_id, cantidad_recibida, total_pago, origen, estado, usuario_id, articulos_comprados)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                proveedor_id, cantidad_recibida || 0, total_pago || 0, origen || 'Caja', estado || 'Pendiente',
                usuario_id || null, JSON.stringify(articulos_comprados || [])
            ]
        );  

        const origenTxt = origen || 'Caja';
        // 👇 DISPARA PUSH NATIVO Y ALERTA VISUAL
        alertarAdministradores(req, "🧾 Nueva Factura Recibida", `Se ha registrado una nueva recepción de mercancía desde ${origenTxt}. Pendiente de revisión.`);  

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar la factura.' });
    }
};  

exports.eliminarGasto = async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();  

    try {
        await client.query('BEGIN');
        const gastoRes = await client.query('SELECT * FROM gastos_proveedores WHERE id = $1', [id]);
        if (gastoRes.rows.length === 0) throw new Error("Factura no encontrada");
        const gasto = gastoRes.rows[0];  

        if (gasto.estado === 'Aprobado') {
            const articulos = typeof gasto.articulos_comprados === 'string' ? JSON.parse(gasto.articulos_comprados) : (gasto.articulos_comprados || []);
            for (const art of articulos) {
                if (art.tipo === 'insumo') {
                    await client.query('UPDATE insumos SET stock_actual = stock_actual - $1 WHERE id = $2', [art.cantidad, art.id]);
                } else if (art.tipo === 'producto') {
                    await client.query('UPDATE productos SET stock_preparado = stock_preparado - $1 WHERE id = $2', [art.cantidad, art.id]);
                }
            }
        }  

        await client.query('DELETE FROM gastos_proveedores WHERE id = $1', [id]);
        await client.query('COMMIT');  

        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');  

        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al eliminar la factura y revertir el stock.' });
    } finally {
        client.release();
    }
};  

// ==========================================
// 📧 MOTOR DE CORREOS CON SOPORTE MULTI-CUENTAS
// ==========================================
const enviarCorreoProveedor = async (proveedor, gasto) => {
    try {
        const negocioRes = await db.query('SELECT nombre_negocio FROM configuracion LIMIT 1');
        const nombreNegocio = negocioRes.rows[0]?.nombre_negocio || 'Administración';  

        const confRes = await db.query('SELECT correos_smtp FROM configuracion_proveedores WHERE id = 1');
        if (confRes.rows.length === 0) return;  

        let cuentasSMTP = [];
        try { cuentasSMTP = typeof confRes.rows[0].correos_smtp === 'string' ? JSON.parse(confRes.rows[0].correos_smtp) : (confRes.rows[0].correos_smtp || []); } catch(e){}  

        if (cuentasSMTP.length === 0 || !proveedor.correo) return;  

        const cuentaActiva = cuentasSMTP[0];  

        if(!cuentaActiva.host || !cuentaActiva.email || !cuentaActiva.password) return;  

        const transporter = nodemailer.createTransport({
            host: cuentaActiva.host,
            port: cuentaActiva.port || 465,
            secure: Number(cuentaActiva.port) === 465,
            auth: {
                user: cuentaActiva.email,
                pass: cuentaActiva.password
            }
        });  

        const articulos = typeof gasto.articulos_comprados === 'string' ? JSON.parse(gasto.articulos_comprados) : (gasto.articulos_comprados || []);
        let filasArticulos = '';
        articulos.forEach(art => {
            filasArticulos += `<li style="padding: 5px 0; border-bottom: 1px dashed #e2e8f0;">
                <strong>${art.cantidad}x ${art.nombre}</strong> - <span style="color:#64748b;">$${Number(art.total).toFixed(2)}</span>
            </li>`;
        });  

        const html = `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center;">
                    <h2 style="margin: 0; font-size: 24px;">Aceptación de Mercancía y Factura</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">${nombreNegocio}</p>
                </div>
                <div style="padding: 30px;">
                    <p>Hola, <strong>${proveedor.contacto || proveedor.empresa}</strong>:</p>
                    <p>Te confirmamos que hemos recibido y aceptado exitosamente tu factura en nuestro sistema.</p>  
                    <div style="background-color: #f8fafc; border-left: 5px solid #10b981; padding: 20px; margin: 25px 0;">
                        <p style="margin-top:0; font-weight:bold; color:#1e293b;">Resumen de la Recepción:</p>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${filasArticulos}
                        </ul>
                        <p style="margin-bottom:0; margin-top:15px; font-size:18px; color:#0f172a;"><strong>Total Aprobado: $${Number(gasto.total_pago).toFixed(2)}</strong></p>
                    </div>  
                    <p style="font-size: 14px; color: #64748b;">Gracias por ser nuestro proveedor.</p>
                </div>
            </div>
        `;  

        await transporter.sendMail({
            from: `"Área de Compras" <${cuentaActiva.email}>`,
            to: proveedor.correo,
            subject: `Factura Aprobada - ${nombreNegocio}`,
            html: html
        });  
    } catch(e) {
        console.error("🚨 Error al enviar correo SMTP a proveedor:", e);
    }
};  

// ==========================================
// ⚙️ EL NÚCLEO: Aprobar Gasto y Sumar Stock
// ==========================================
exports.actualizarEstadoGasto = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const client = await db.connect();  

    try {
        await client.query('BEGIN');  
        
        const gastoRes = await client.query('SELECT * FROM gastos_proveedores WHERE id = $1', [id]);
        if (gastoRes.rows.length === 0) throw new Error("Gasto no encontrado");
        const gasto = gastoRes.rows[0];  

        const provRes = await client.query('SELECT * FROM proveedores WHERE id = $1', [gasto.proveedor_id]);
        const proveedor = provRes.rows[0];  

        const updateGasto = await client.query('UPDATE gastos_proveedores SET estado = $1 WHERE id = $2 RETURNING *', [estado, id]);  

        if (estado === 'Aprobado' && gasto.estado === 'Pendiente') {
            const articulos = typeof gasto.articulos_comprados === 'string' ? JSON.parse(gasto.articulos_comprados) : (gasto.articulos_comprados || []);  
            
            for (const art of articulos) {
                if (art.tipo === 'insumo') {
                    await client.query('UPDATE insumos SET stock_actual = stock_actual + $1 WHERE id = $2', [art.cantidad, art.id]);
                } else if (art.tipo === 'producto') {
                    await client.query('UPDATE productos SET stock_preparado = stock_preparado + $1, usa_stock = true WHERE id = $2', [art.cantidad, art.id]);
                }
            }  

            if (proveedor.enviar_email) {
                enviarCorreoProveedor(proveedor, updateGasto.rows[0]);
            }  

            // 👇 DISPARA PUSH NATIVO Y ALERTA VISUAL
            alertarAdministradores(req, "✅ Factura Pagada", `Se ha acreditado la factura de ${proveedor.empresa} por $${gasto.total_pago} y el stock fue sumado exitosamente.`);
        }  

        await client.query('COMMIT');  

        const io = req.app.get('io');
        if (io) io.emit('catalogo_actualizado');  

        res.json(updateGasto.rows[0]);
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({error: 'Error al actualizar el estado de la factura.'});
    } finally {
        client.release();
    }
};

// ==========================================
// 🛡️ VIGILANTE DE STOCK (CRON JOB ANTI-SPAM)
// ==========================================
exports.verificarAlertasStock = async (io) => {
    try {
        // 1. Buscamos proveedores que tengan las alertas encendidas
        const provRes = await db.query('SELECT * FROM proveedores WHERE enviar_email = true OR enviar_wa = true');
        if (provRes.rows.length === 0) return;

        // 2. Preparamos configuraciones de correo
        const confRes = await db.query('SELECT nombre_negocio FROM configuracion LIMIT 1');
        const nombreNegocio = confRes.rows[0]?.nombre_negocio || 'Administración';
        
        const confProv = await db.query('SELECT correos_smtp FROM configuracion_proveedores WHERE id = 1');
        let cuentasSMTP = [];
        try { cuentasSMTP = typeof confProv.rows[0]?.correos_smtp === 'string' ? JSON.parse(confProv.rows[0].correos_smtp) : (confProv.rows[0]?.correos_smtp || []); } catch(e){}
        const cuentaActiva = cuentasSMTP[0];

        // 3. Revisamos cada proveedor
        for (const prov of provRes.rows) {
            let articulos = [];
            try { articulos = typeof prov.articulos_suministrados === 'string' ? JSON.parse(prov.articulos_suministrados) : prov.articulos_suministrados; } catch(e){}
            
            let huboCambios = false;
            let alertasAEnviar = [];

            for (let art of articulos) {
                const minStock = Number(art.stock_minimo) || 0;
                if (minStock > 0) {
                    // Calculamos stock real desde la BD
                    let stockReal = 0;
                    let nombreArt = 'Artículo';
                    
                    if (art.tipo_vinculo === 'insumo') {
                        const ins = await db.query('SELECT stock_actual, nombre, unidad_medida FROM insumos WHERE id = $1', [art.vinculo_id]);
                        if (ins.rows.length > 0) { 
                            stockReal = Number(ins.rows[0].stock_actual); 
                            nombreArt = ins.rows[0].nombre; 
                            art.unidad_medida = ins.rows[0].unidad_medida; 
                        }
                    } else {
                        const prod = await db.query('SELECT stock_preparado, nombre FROM productos WHERE id = $1', [art.vinculo_id]);
                        if (prod.rows.length > 0) { 
                            stockReal = Number(prod.rows[0].stock_preparado); 
                            nombreArt = prod.rows[0].nombre; 
                            art.unidad_medida = 'PZ'; 
                        }
                    }

                    // Si el stock está en rojo
                    if (stockReal <= minStock) {
                        // REGLA ANTI-SPAM: Revisamos si ya le enviamos correo en las últimas 24 hrs
                        const ahora = new Date().getTime();
                        const ultimaAlerta = art.ultima_alerta ? new Date(art.ultima_alerta).getTime() : 0;
                        const horasPasadas = (ahora - ultimaAlerta) / (1000 * 60 * 60);

                        if (horasPasadas >= 24) {
                            alertasAEnviar.push({ nombre: nombreArt, stockActual: stockReal, minStock, unidad: art.unidad_medida });
                            art.ultima_alerta = new Date().toISOString(); // Actualizamos la hora de alerta
                            huboCambios = true;
                        }
                    }
                }
            }

            // 4. Si hay productos en rojo para este proveedor, enviamos la alerta combinada
            if (alertasAEnviar.length > 0) {
                
                // Guardamos la nueva fecha en el JSON para que el anti-spam funcione
                if (huboCambios) {
                    await db.query('UPDATE proveedores SET articulos_suministrados = $1 WHERE id = $2', [JSON.stringify(articulos), prov.id]);
                }

                // Enviar Email al Proveedor
                if (prov.enviar_email && cuentaActiva && prov.correo) {
                    const transporter = nodemailer.createTransport({
                        host: cuentaActiva.host,
                        port: cuentaActiva.port || 465,
                        secure: Number(cuentaActiva.port) === 465, 
                        auth: { user: cuentaActiva.email, pass: cuentaActiva.password }
                    });

                    let filasHTML = '';
                    alertasAEnviar.forEach(a => {
                        filasHTML += `<li style="padding: 10px 0; border-bottom: 1px dashed #e2e8f0;">
                            <strong style="color:#ef4444;">${a.nombre}</strong> - Nos quedan: <strong>${Number(a.stockActual).toFixed(2)} ${a.unidad}</strong> <span style="color:#94a3b8; font-size:12px;">(Pactado Mínimo: ${a.minStock})</span>
                        </li>`;
                    });

                    const html = `
                        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                            <div style="background-color: #f97316; color: white; padding: 30px 20px; text-align: center;">
                                <h2 style="margin: 0; font-size: 24px;">Alerta de Re-Surtido de Inventario</h2>
                                <p style="margin: 10px 0 0 0; opacity: 0.9;">${nombreNegocio}</p>
                            </div>
                            <div style="padding: 30px;">
                                <p>Hola, <strong>${prov.contacto || prov.empresa}</strong>:</p>
                                <p>Te informamos automatizadamente que nuestro inventario de los siguientes productos está por agotarse y requerimos resurtido pronto:</p>
                                <div style="background-color: #fff7ed; border-left: 5px solid #f97316; padding: 20px; margin: 25px 0;">
                                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px;">${filasHTML}</ul>
                                </div>
                                <p style="font-size: 14px; color: #64748b;">Por favor, contáctanos a la brevedad para coordinar una entrega.</p>
                            </div>
                        </div>
                    `;
                    
                    transporter.sendMail({
                        from: `"Área de Compras" <${cuentaActiva.email}>`,
                        to: prov.correo,
                        subject: `Re-Surtido Requerido - ${nombreNegocio}`,
                        html: html
                    }).catch(()=>null);
                }
                
                // Disparar Notificación Push a los celulares/PC de los Administradores
                if (io) {
                    io.emit('alerta_admin', { 
                        titulo: '📉 Alerta de Stock Crítico', 
                        mensaje: `El sistema acaba de notificar automáticamente a ${prov.empresa} para resurtir ${alertasAEnviar.length} artículos agotándose.`, 
                        fecha: new Date() 
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error en vigilante de stock:", e);
    }
};