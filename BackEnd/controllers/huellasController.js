const db = require('../config/db');
const { 
    generateRegistrationOptions, 
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse 
} = require('@simplewebauthn/server');
const nodemailer = require('nodemailer');

const rpName = 'Sistema POS';
const rpID = process.env.RP_ID || 'localhost'; 
const expectedOrigin = process.env.FRONTEND_URL || `http://localhost:3000`;

const challengesConfig = {};

// 1. AUTO-MIGRACIÓN
exports.inicializarTablas = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS configuracion_biometria (
                id SERIAL PRIMARY KEY,
                control_dispositivos_activo BOOLEAN DEFAULT false,
                smtp_host TEXT,
                smtp_port TEXT,
                smtp_user TEXT,
                smtp_pass TEXT,
                correo_remitente TEXT
            );
            
            INSERT INTO configuracion_biometria (id, control_dispositivos_activo)
            VALUES (1, false) ON CONFLICT (id) DO NOTHING;

            CREATE TABLE IF NOT EXISTS equipos_autorizados (
                id SERIAL PRIMARY KEY,
                device_id TEXT UNIQUE NOT NULL,
                alias TEXT NOT NULL,
                pantallas_permitidas JSONB DEFAULT '[]',
                estatus TEXT DEFAULT 'Activo',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS credenciales_biometricas (
                id SERIAL PRIMARY KEY,
                usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
                cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
                credential_id TEXT UNIQUE NOT NULL,
                public_key TEXT NOT NULL,
                counter INT DEFAULT 0,
                dispositivo TEXT,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Módulo WebAuthn (Huellas) y Dispositivos inicializado (Aislado).');
    } catch (error) {
        console.error('🚨 Error inicializando tablas de huellas:', error);
    }
};

// 2. ENVÍO DE CÓDIGO POR CORREO
exports.enviarCodigoVerificacion = async (req, res) => {
    const { cliente_id, correo } = req.body;
    try {
        const confRes = await db.query('SELECT * FROM configuracion_biometria WHERE id = 1');
        const config = confRes.rows[0];

        if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
            return res.status(400).json({ error: 'Servidor de correos no configurado.' });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: parseInt(config.smtp_port) || 465,
            secure: parseInt(config.smtp_port) === 465,
            auth: { user: config.smtp_user, pass: config.smtp_pass }
        });

        await transporter.sendMail({
            from: `"${rpName} Seguridad"`,
            to: correo,
            subject: 'Código para vincular tu Huella 👆',
            html: `<h2>Tu código de seguridad es: <strong>${codigo}</strong></h2>`
        });

        res.json({ success: true, message: 'Código enviado al correo.' });
    } catch (error) {
        console.error("🚨 Error al enviar correo:", error);
        res.status(500).json({ error: 'Error al enviar el código de verificación.' });
    }
};

// 3. REGISTRO DE HUELLA (ENROLAMIENTO)
exports.generarOpcionesRegistro = async (req, res) => {
    const { usuario_id, cliente_id } = req.body;
    try {
        let userID, userName, userDisplayName;

        if (usuario_id) {
            const userRes = await db.query('SELECT usuario, nombre FROM usuarios WHERE id = $1', [usuario_id]);
            if (userRes.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
            userID = `USR_${usuario_id}`;
            userName = userRes.rows[0].usuario;
            userDisplayName = userRes.rows[0].nombre;
        } else if (cliente_id) {
            const cliRes = await db.query('SELECT telefono, nombre FROM clientes WHERE id = $1', [cliente_id]);
            if (cliRes.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
            userID = `CLI_${cliente_id}`;
            userName = cliRes.rows[0].telefono;
            userDisplayName = cliRes.rows[0].nombre;
        } else {
            return res.status(400).json({ error: 'No se recibió ID válido.' });
        }

        const options = await generateRegistrationOptions({
            rpName, 
            rpID, 
            userID: new Uint8Array(Buffer.from(userID)), 
            userName, 
            userDisplayName,
            attestationType: 'none',
            authenticatorSelection: { userVerification: 'preferred', residentKey: 'required' }
        });

        challengesConfig[userID] = options.challenge;
        res.json(options);
    } catch (error) {
        console.error("🚨 Error al generar opciones biométricas:", error);
        res.status(500).json({ error: 'Error al generar opciones biométricas.' });
    }
};

exports.verificarRegistro = async (req, res) => {
    const { usuario_id, cliente_id, credencial, dispositivo_nombre } = req.body;
    const userID = usuario_id ? `USR_${usuario_id}` : `CLI_${cliente_id}`;
    
    try {
        const expectedChallenge = challengesConfig[userID];
        if (!expectedChallenge) return res.status(400).json({ error: 'Reto caducado. Intenta de nuevo.' });

        const cleanOrigin = expectedOrigin.trim().replace(/\/$/, "");
        const cleanRPID = rpID.trim();

        const verification = await verifyRegistrationResponse({
            response: credencial,
            expectedChallenge,
            expectedOrigin: cleanOrigin,
            expectedRPID: cleanRPID,
        });

        if (verification.verified) {
            const publicKey = verification.registrationInfo.credential 
                ? verification.registrationInfo.credential.publicKey 
                : verification.registrationInfo.credentialPublicKey;
            
            const credIDString = credencial.id; 

            await db.query(
                `INSERT INTO credenciales_biometricas (usuario_id, cliente_id, credential_id, public_key, dispositivo) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    usuario_id || null, 
                    cliente_id || null,
                    credIDString, 
                    Buffer.from(publicKey).toString('base64'), 
                    dispositivo_nombre || 'Dispositivo Desconocido'
                ]
            );
            
            delete challengesConfig[userID];
            res.json({ success: true, message: 'Huella vinculada exitosamente.' });
        } else {
            res.status(400).json({ error: 'No se pudo verificar la huella.' });
        }
    } catch (error) {
        console.error("🚨 Error interno en verificarRegistro:", error.message || error);
        res.status(500).json({ error: 'Error interno de criptografía.' });
    }
};

// ==============================================================
// 4. MÉTODOS DE INICIO DE SESIÓN CON HUELLA (LOGIN)
// ==============================================================

exports.generarOpcionesAutenticacion = async (req, res) => {
    try {
        const options = await generateAuthenticationOptions({
            rpID,
            userVerification: 'preferred',
        });
        
        challengesConfig['login_global'] = options.challenge;
        res.json(options);
    } catch (error) {
        console.error("🚨 Error en generarOpcionesAutenticacion:", error);
        res.status(500).json({ error: 'Error al preparar el lector de huellas.' });
    }
};

exports.verificarAutenticacion = async (req, res) => {
    const { credencial, dispositivo_id } = req.body;
    try {
        const expectedChallenge = challengesConfig['login_global'];
        if (!expectedChallenge) return res.status(400).json({ error: 'Tiempo de espera agotado. Vuelve a intentarlo.' });

        const credRes = await db.query('SELECT * FROM credenciales_biometricas WHERE credential_id = $1', [credencial.id]);
        if (credRes.rows.length === 0) return res.status(404).json({ error: 'Huella no reconocida en la base de datos.' });

        const credGuardada = credRes.rows[0];

        const cleanOrigin = expectedOrigin.trim().replace(/\/$/, "");
        const cleanRPID = rpID.trim();

        const verification = await verifyAuthenticationResponse({
            response: credencial,
            expectedChallenge,
            expectedOrigin: cleanOrigin,
            expectedRPID: cleanRPID,
            requireUserVerification: false, 
            // 👇 FIX CRÍTICO: La versión 10 de la librería exige que se llame 'credential' y no 'authenticator'
            credential: {
                id: credGuardada.credential_id, // Ahora exige que el ID se envíe como String
                publicKey: new Uint8Array(Buffer.from(credGuardada.public_key, 'base64')), // Exige que se convierta a Uint8Array
                counter: credGuardada.counter,
            }
        });

        if (verification.verified) {
            await db.query('UPDATE credenciales_biometricas SET counter = $1 WHERE id = $2', [verification.authenticationInfo.newCounter, credGuardada.id]);

            if (credGuardada.usuario_id) {
                const userRes = await db.query('SELECT * FROM usuarios WHERE id = $1', [credGuardada.usuario_id]);
                const user = userRes.rows[0];

                // BLOQUEO ESTRICTO MDM (TAMBIÉN PARA HUELLAS)
                try {
                    if (user.usuario !== 'admin') { 
                        const confMdm = await db.query('SELECT control_dispositivos_activo, roles_restringidos FROM configuracion_biometria WHERE id = 1');
                        if (confMdm.rows.length > 0 && confMdm.rows[0].control_dispositivos_activo) {
                            const rolesRestringidos = confMdm.rows[0].roles_restringidos || [];
                            
                            if (rolesRestringidos.includes(user.rol)) {
                                const equipoAuth = await db.query('SELECT id, alias, roles_permitidos FROM equipos_autorizados WHERE device_id = $1', [dispositivo_id]);
                                
                                if (equipoAuth.rows.length === 0) {
                                    return res.status(403).json({ 
                                        error: 'Acceso Denegado. Tu rol solo puede usar huella en las tablets oficiales de la empresa.' 
                                    });
                                }

                                const rolesPermitidos = equipoAuth.rows[0].roles_permitidos || [];
                                if (!rolesPermitidos.includes(user.rol)) {
                                    return res.status(403).json({ 
                                        error: `Esta máquina (${equipoAuth.rows[0].alias}) no está autorizada para el rol de ${user.rol.toUpperCase()}.` 
                                    });
                                }
                            }
                        }
                    } 
                } catch(e) { console.error("Error en validación MDM Biométrico", e); }

                // Auto-Asistencia y Control Multi-Sesión
                const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
                const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true;

                if (isLoginActivo) {
                    const turnoAbierto = await db.query('SELECT id FROM registro_asistencias WHERE usuario_id = $1 AND hora_salida IS NULL AND fecha = CURRENT_DATE', [user.id]);
                    if (turnoAbierto.rows.length === 0) {
                        await db.query('INSERT INTO registro_asistencias (usuario_id, fecha, hora_entrada) VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP)', [user.id]);
                    }
                }

                let devices = (user.dispositivo_id || '').split(',').filter(Boolean);
                if (dispositivo_id && !devices.includes(dispositivo_id)) {
                    devices.push(dispositivo_id);
                    await db.query('UPDATE usuarios SET dispositivo_id = $1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $2', [devices.join(','), user.id]);
                }
                const es_secundaria = devices.indexOf(dispositivo_id) > 0;

                return res.json({ success: true, tipo: 'empleado', usuario: user, segunda_sesion: es_secundaria });
            }

            if (credGuardada.cliente_id) {
                const cliRes = await db.query('SELECT * FROM clientes WHERE id = $1', [credGuardada.cliente_id]);
                if (cliRes.rows.length > 0) {
                    return res.json({ success: true, tipo: 'cliente', data: cliRes.rows[0] });
                }
            }
        } else {
            res.status(400).json({ error: 'No se pudo verificar matemáticamente la huella.' });
        }
    } catch (error) {
        console.error("🚨 Error en verificarAutenticacion:", error.message || error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la huella.' });
    }
};