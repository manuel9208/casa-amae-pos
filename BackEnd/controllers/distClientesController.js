const db = require('../config/db');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');

// ==========================================
// 🛡️ AUTO-MIGRACIÓN DE TABLAS AISLADAS
// ==========================================
exports.inicializarTablas = async () => {
    try {
        // Tabla de Configuración Exclusiva para la Distribución (Módulo 100% Aislado)
        await db.query(`
            CREATE TABLE IF NOT EXISTS dist_configuracion (
                id SERIAL PRIMARY KEY,
                distribucion_activa BOOLEAN DEFAULT false,
                distribucion_nombre VARCHAR(100) DEFAULT '28:20',
                smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
                smtp_puerto VARCHAR(10) DEFAULT '465',
                smtp_email VARCHAR(255) DEFAULT '',
                smtp_password VARCHAR(255) DEFAULT '',
                puntos_activos BOOLEAN DEFAULT true,
                puntos_porcentaje NUMERIC(10,2) DEFAULT 10,
                puntos_valor_peso NUMERIC(10,2) DEFAULT 1,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Auto-actualizador para bases de datos existentes que no tenían las columnas de puntos
        await db.query(`ALTER TABLE dist_configuracion ADD COLUMN IF NOT EXISTS puntos_activos BOOLEAN DEFAULT true;`).catch(()=>null);
        await db.query(`ALTER TABLE dist_configuracion ADD COLUMN IF NOT EXISTS puntos_porcentaje NUMERIC(10,2) DEFAULT 10;`).catch(()=>null);
        await db.query(`ALTER TABLE dist_configuracion ADD COLUMN IF NOT EXISTS puntos_valor_peso NUMERIC(10,2) DEFAULT 1;`).catch(()=>null);

        // Inserción de la fila base de configuración si no existe
        await db.query(`
            INSERT INTO dist_configuracion (id)
            SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM dist_configuracion WHERE id = 1);
        `);

        // Tabla del Directorio de Clientes B2B
        await db.query(`
            CREATE TABLE IF NOT EXISTS dist_clientes (
                id SERIAL PRIMARY KEY,
                empresa VARCHAR(255) NOT NULL,
                nombre_contacto VARCHAR(255) NOT NULL,
                telefono VARCHAR(50) NOT NULL,
                correo VARCHAR(255),
                rfc VARCHAR(50),
                direccion TEXT,
                fecha_nacimiento DATE,
                puntos NUMERIC(10,2) DEFAULT 0,
                tiene_credito BOOLEAN DEFAULT false,
                limite_credito NUMERIC(10,2) DEFAULT 0,
                dias_credito INTEGER DEFAULT 0,
                recordatorios_activos BOOLEAN DEFAULT true,
                correo_verificado BOOLEAN DEFAULT false,
                codigo_autorizacion VARCHAR(10),
                ine_frente_url TEXT,
                ine_reverso_url TEXT,
                comprobante_url TEXT,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Tablas 'dist_clientes' y 'dist_configuracion' verificadas/creadas de forma aislada.");
    } catch (error) {
        console.error("🚨 Error al inicializar tablas del CRM de Distribución:", error);
    }
};

// ==========================================
// 🧹 HELPERS DE CLOUDINARY
// ==========================================
const extraerPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        const pathSinVersion = parts[1].replace(/^v\d+\//, '');
        const publicId = pathSinVersion.substring(0, pathSinVersion.lastIndexOf('.'));
        return publicId || pathSinVersion;
    } catch (e) { return null; }
};

const borrarDeCloudinary = (urlVieja) => {
    const publicId = extraerPublicId(urlVieja);
    if (publicId) {
        cloudinary.uploader.destroy(publicId).catch(() => {});
    }
};

// ==========================================
// ⚙️ RUTAS: CONFIGURACIÓN B2B Y SMTP
// ==========================================
exports.obtenerConfiguracion = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM dist_configuracion WHERE id = 1');
        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la configuración de distribución.' });
    }
};

exports.actualizarConfiguracion = async (req, res) => {
    const { 
        distribucion_activa, distribucion_nombre, host, puerto, email, password,
        puntos_activos, puntos_porcentaje, puntos_valor_peso
    } = req.body;

    // Parseo del booleano por si viaja como string en el formData o fetch
    let activaParseada = null;
    if (distribucion_activa !== undefined) {
        activaParseada = (distribucion_activa === true || distribucion_activa === 'true');
    }
    let ptsActivosParseados = null;
    if (puntos_activos !== undefined) {
        ptsActivosParseados = (puntos_activos === true || puntos_activos === 'true');
    }

    try {
        // Usamos COALESCE para que actualice solo lo que nos mandan en el body sin borrar lo demás
        const result = await db.query(
            `UPDATE dist_configuracion
             SET 
                distribucion_activa = COALESCE($1, distribucion_activa),
                distribucion_nombre = COALESCE($2, distribucion_nombre),
                smtp_host = COALESCE($3, smtp_host),
                smtp_puerto = COALESCE($4, smtp_puerto),
                smtp_email = COALESCE($5, smtp_email),
                smtp_password = COALESCE($6, smtp_password),
                puntos_activos = COALESCE($7, puntos_activos),
                puntos_porcentaje = COALESCE($8, puntos_porcentaje),
                puntos_valor_peso = COALESCE($9, puntos_valor_peso),
                actualizado_en = CURRENT_TIMESTAMP
             WHERE id = 1 RETURNING *`,
            [activaParseada, distribucion_nombre, host, puerto, email, password, ptsActivosParseados, puntos_porcentaje, puntos_valor_peso]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la configuración de distribución.' });
    }
};

// ==========================================
// 📧 ENVIAR CÓDIGO DE VERIFICACIÓN
// ==========================================
exports.enviarCodigoVerificacion = async (req, res) => {
    const { correo, empresa } = req.body;
    if (!correo) return res.status(400).json({ error: 'Falta el correo electrónico.' });

    try {
        const configRes = await db.query('SELECT * FROM dist_configuracion WHERE id = 1');
        const conf = configRes.rows[0] || {};

        if (!conf.smtp_email || !conf.smtp_password) {
            return res.status(500).json({ error: 'Primero debes configurar los ajustes SMTP en el botón de ajustes.' });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const isGmail = String(conf.smtp_host).toLowerCase().includes('gmail');
        const puertoVal = Number(conf.smtp_puerto) || 465;

        const transporter = nodemailer.createTransport(isGmail ? {
            service: 'gmail',
            auth: { user: conf.smtp_email.trim(), pass: conf.smtp_password.trim() }
        } : {
            host: conf.smtp_host.trim(),
            port: puertoVal,
            secure: puertoVal === 465,
            auth: { user: conf.smtp_email.trim(), pass: conf.smtp_password.trim() }
        });

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center;">
            <h2 style="color: #1e293b;">Verificación de Crédito</h2>
            <p style="color: #64748b; font-size: 16px;">Hola ${empresa || 'Cliente'}, este es el código para autorizar tu línea de crédito comercial.</p>
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bfdbfe;">
                <h1 style="color: #1d4ed8; font-size: 44px; letter-spacing: 12px; margin: 10px 0;">${codigo}</h1>
            </div>
        </div>
        `;

        await transporter.sendMail({
            from: `"Área de Crédito y Cobranza" <${conf.smtp_email}>`,
            to: correo,
            subject: '🔐 Código de Autorización de Crédito',
            html: html
        });

        res.json({ success: true, codigo_generado: codigo });
    } catch (error) {
        console.error("Error SMTP:", error);
        res.status(500).json({ error: 'Error al enviar el correo. Revisa tus contraseñas de aplicación.' });
    }
};

// ==========================================
// 📦 RUTAS CRUD: CLIENTES B2B
// ==========================================
exports.obtenerClientes = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM dist_clientes ORDER BY empresa ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el directorio.' });
    }
};

exports.crearCliente = async (req, res) => {
    const { 
        empresa, nombre_contacto, telefono, correo, rfc, direccion, fecha_nacimiento, 
        puntos_acumulados, tiene_credito, limite_credito, dias_credito, recordatorios_activos, correo_verificado 
    } = req.body;

    // Lógica Multer Multi-archivos
    const archivos = req.files || {};
    const ineFrenteUrl = archivos['ine_frente'] ? archivos['ine_frente'][0].path : null;
    const ineReversoUrl = archivos['ine_reverso'] ? archivos['ine_reverso'][0].path : null;
    const comprobanteUrl = archivos['comprobante_domicilio'] ? archivos['comprobante_domicilio'][0].path : null;

    try {
        const result = await db.query(
            `INSERT INTO dist_clientes 
            (empresa, nombre_contacto, telefono, correo, rfc, direccion, fecha_nacimiento, puntos, 
             tiene_credito, limite_credito, dias_credito, recordatorios_activos, correo_verificado, 
             ine_frente_url, ine_reverso_url, comprobante_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [
                empresa, nombre_contacto, telefono, correo || null, rfc || null, direccion, 
                fecha_nacimiento || null, Number(puntos_acumulados) || 0, 
                tiene_credito === 'true', Number(limite_credito) || 0, Number(dias_credito) || 0, 
                recordatorios_activos !== 'false', correo_verificado === 'true',
                ineFrenteUrl, ineReversoUrl, comprobanteUrl
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error BD Crear Cliente:", error);
        res.status(500).json({ error: 'Error al registrar el cliente mayorista.' });
    }
};

exports.actualizarCliente = async (req, res) => {
    const { id } = req.params;
    const { 
        empresa, nombre_contacto, telefono, correo, rfc, direccion, fecha_nacimiento, 
        puntos_acumulados, tiene_credito, limite_credito, dias_credito, recordatorios_activos, correo_verificado 
    } = req.body;

    const archivos = req.files || {};
    const ineFrenteUrl = archivos['ine_frente'] ? archivos['ine_frente'][0].path : null;
    const ineReversoUrl = archivos['ine_reverso'] ? archivos['ine_reverso'][0].path : null;
    const comprobanteUrl = archivos['comprobante_domicilio'] ? archivos['comprobante_domicilio'][0].path : null;

    try {
        const clienteAntiguo = await db.query('SELECT ine_frente_url, ine_reverso_url, comprobante_url FROM dist_clientes WHERE id = $1', [id]);
        
        // Purga de archivos si se reemplazaron
        if (ineFrenteUrl && clienteAntiguo.rows[0]?.ine_frente_url) borrarDeCloudinary(clienteAntiguo.rows[0].ine_frente_url);
        if (ineReversoUrl && clienteAntiguo.rows[0]?.ine_reverso_url) borrarDeCloudinary(clienteAntiguo.rows[0].ine_reverso_url);
        if (comprobanteUrl && clienteAntiguo.rows[0]?.comprobante_url) borrarDeCloudinary(clienteAntiguo.rows[0].comprobante_url);

        const result = await db.query(
            `UPDATE dist_clientes SET 
             empresa=$1, nombre_contacto=$2, telefono=$3, correo=$4, rfc=$5, direccion=$6, fecha_nacimiento=$7, 
             puntos=$8, tiene_credito=$9, limite_credito=$10, dias_credito=$11, recordatorios_activos=$12, correo_verificado=$13,
             ine_frente_url = COALESCE($14, ine_frente_url), 
             ine_reverso_url = COALESCE($15, ine_reverso_url), 
             comprobante_url = COALESCE($16, comprobante_url)
             WHERE id=$17 RETURNING *`,
            [
                empresa, nombre_contacto, telefono, correo || null, rfc || null, direccion, 
                fecha_nacimiento || null, Number(puntos_acumulados) || 0, 
                tiene_credito === 'true', Number(limite_credito) || 0, Number(dias_credito) || 0, 
                recordatorios_activos !== 'false', correo_verificado === 'true',
                ineFrenteUrl, ineReversoUrl, comprobanteUrl, id
            ]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error BD Editar Cliente:", error);
        res.status(500).json({ error: 'Error al actualizar el cliente.' });
    }
};

exports.eliminarCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const clienteAct = await db.query('SELECT ine_frente_url, ine_reverso_url, comprobante_url FROM dist_clientes WHERE id = $1', [id]);
        if (clienteAct.rows.length > 0) {
            if (clienteAct.rows[0].ine_frente_url) borrarDeCloudinary(clienteAct.rows[0].ine_frente_url);
            if (clienteAct.rows[0].ine_reverso_url) borrarDeCloudinary(clienteAct.rows[0].ine_reverso_url);
            if (clienteAct.rows[0].comprobante_url) borrarDeCloudinary(clienteAct.rows[0].comprobante_url);
        }
        await db.query('DELETE FROM dist_clientes WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar cliente. Puede tener historial de pedidos vinculado.' });
    }
};