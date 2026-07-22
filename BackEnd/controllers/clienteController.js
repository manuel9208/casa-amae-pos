const db = require('../config/db');
const nodemailer = require('nodemailer');

exports.registrar = async (req, res) => {
  const { telefono, nombre, apellido, correo, fecha_nacimiento, nip, direccion } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO clientes (telefono, nombre, apellido, correo, fecha_nacimiento, nip, direccion) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [ telefono, nombre, apellido || '', correo || null, fecha_nacimiento || null, nip || '0000', direccion || null ]
    );
    res.json({ cliente: result.rows[0] });
  } catch (error) {
    console.error("Error al registrar cliente:", error);
    res.status(500).json({ error: 'Ese número ya está registrado o hubo un error' });
  }
};

exports.verificarNip = async (req, res) => {
  const { cliente_id, nip } = req.body;
  try {
    const result = await db.query('SELECT nip FROM clientes WHERE id = $1', [cliente_id]);
    if (result.rows.length > 0) {
      const dbNip = String(result.rows[0].nip).trim();
      const inputNip = String(nip).trim();
      if (dbNip === inputNip) return res.json({ success: true });
    }
    res.status(401).json({ error: 'NIP Incorrecto' });
  } catch (error) { 
    res.status(500).json({ error: 'Error del servidor' }); 
  }
};

exports.recuperarNip = async (req, res) => {
  const { cliente_id, correo } = req.body;

  if (!cliente_id || !correo) {
    return res.status(400).json({ error: 'El ID del cliente y el correo son obligatorios.' });
  }

  try {
    await db.query(`ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_email TEXT, ADD COLUMN IF NOT EXISTS smtp_password TEXT, ADD COLUMN IF NOT EXISTS smtp_host TEXT, ADD COLUMN IF NOT EXISTS smtp_port TEXT;`);

    const result = await db.query(
      'UPDATE clientes SET correo = $1 WHERE id = $2 RETURNING *',
      [correo, cliente_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado en la base de datos.' });
    }

    const cliente = result.rows[0];
    const nipCliente = cliente.nip;

    const configRes = await db.query('SELECT smtp_email, smtp_password, smtp_host, smtp_port, nombre_negocio FROM configuracion WHERE id = 1');
    const configData = configRes.rows[0] || {};
    
    if (!configData.smtp_email || !configData.smtp_password) {
      return res.status(500).json({ error: 'El administrador aún no ha configurado el servidor de correos del negocio.' });
    }

    const hostSmtp = configData.smtp_host || 'smtp.gmail.com';
    const puertoSmtp = configData.smtp_port ? Number(configData.smtp_port) : 465;

    let mailConfig;
    if (hostSmtp.toLowerCase().includes('gmail')) {
      mailConfig = {
        service: 'gmail',
        auth: {
          user: configData.smtp_email.trim(),
          pass: configData.smtp_password.trim()
        }
      };
    } else {
      mailConfig = {
        host: hostSmtp.trim(),
        port: puertoSmtp,
        secure: puertoSmtp === 465,
        auth: {
          user: configData.smtp_email.trim(),
          pass: configData.smtp_password.trim()
        }
      };
    }

    const transporter = nodemailer.createTransport(mailConfig);

    await transporter.sendMail({
      from: `"${configData.nombre_negocio || 'El Restaurante'}" `,
      to: correo,
      subject: '🎁 Tu NIP de Seguridad',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center;">
          <h2 style="color: #1e293b;">Hola, ${cliente.nombre}</h2>
          <p style="color: #64748b; font-size: 16px;">Has solicitado recuperar tu NIP de seguridad para usar tus puntos de lealtad.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="color: #64748b; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Tu NIP actual es:</p>
            <h1 style="color: #2563eb; font-size: 40px; letter-spacing: 8px; margin: 10px 0;">${nipCliente}</h1>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">Por favor, no compartas este NIP con nadie.</p>
        </div>
      `
    });

    res.json({ success: true, mensaje: 'Correo asociado y NIP enviado.' });

  } catch (error) {
    console.error("Error al recuperar NIP:", error);
    res.status(500).json({ error: 'Ocurrió un error al intentar enviar el correo. Verifica las credenciales SMTP.' });
  }
};

// ==========================================
// 🛡️ MÓDULO 2FA: CÓDIGO DE VERIFICACIÓN
// ==========================================

exports.solicitarCodigoNip = async (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'ID de cliente requerido.' });

  try {
    await db.query(`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(10);`);
    await db.query(`ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_email TEXT, ADD COLUMN IF NOT EXISTS smtp_password TEXT, ADD COLUMN IF NOT EXISTS smtp_host TEXT, ADD COLUMN IF NOT EXISTS smtp_port TEXT;`);

    const result = await db.query('SELECT nombre, correo FROM clientes WHERE id = $1', [cliente_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const cliente = result.rows[0];
    
    if (!cliente.correo) {
      return res.status(400).json({ error: 'Por seguridad, debes guardar un correo electrónico en tus datos antes de hacer cambios.' });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query('UPDATE clientes SET codigo_verificacion = $1 WHERE id = $2', [codigo, cliente_id]);

    const configRes = await db.query('SELECT smtp_email, smtp_password, smtp_host, smtp_port, nombre_negocio FROM configuracion WHERE id = 1');
    const configData = configRes.rows[0] || {};
    
    if (!configData.smtp_email || !configData.smtp_password) {
      return res.status(500).json({ error: 'El administrador aún no ha configurado el servidor de correos del negocio.' });
    }

    const hostSmtp = configData.smtp_host || 'smtp.gmail.com';
    const puertoSmtp = configData.smtp_port ? Number(configData.smtp_port) : 465;

    let mailConfig;
    if (hostSmtp.toLowerCase().includes('gmail')) {
      mailConfig = {
        service: 'gmail',
        auth: {
          user: configData.smtp_email.trim(),
          pass: configData.smtp_password.trim()
        }
      };
    } else {
      mailConfig = {
        host: hostSmtp.trim(),
        port: puertoSmtp,
        secure: puertoSmtp === 465,
        auth: {
          user: configData.smtp_email.trim(),
          pass: configData.smtp_password.trim()
        }
      };
    }

    const transporter = nodemailer.createTransport(mailConfig);

    // 👇 FIX: Hacemos el texto del correo genérico para NIP y Correo
    await transporter.sendMail({
      from: `"${configData.nombre_negocio || 'El Restaurante'}" `,
      to: cliente.correo,
      subject: '🔐 Código de Verificación de Seguridad',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center;">
          <h2 style="color: #1e293b;">Verificación de Seguridad</h2>
          <p style="color: #64748b; font-size: 16px;">Hola ${cliente.nombre}, alguien solicitó un cambio de seguridad (NIP o Correo) en tu cuenta.</p>
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bfdbfe;">
            <p style="color: #3b82f6; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Tu Código de Autorización es:</p>
            <h1 style="color: #1d4ed8; font-size: 44px; letter-spacing: 12px; margin: 10px 0;">${codigo}</h1>
          </div>
          <p style="color: #ef4444; font-size: 12px; font-weight: bold;">Si no fuiste tú, ignora este mensaje y tus datos estarán a salvo.</p>
        </div>
      `
    });

    res.json({ success: true, mensaje: 'Código de verificación enviado al correo.' });
  } catch (error) {
    console.error("Error al solicitar código 2FA:", error);
    res.status(500).json({ error: 'Error al enviar el correo de verificación. Revisa la configuración SMTP.' });
  }
};

exports.cambiarNipConCodigo = async (req, res) => {
  const { cliente_id, codigo, nuevoNip } = req.body;

  if (!cliente_id || !codigo || !nuevoNip) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  if (nuevoNip.length !== 4) {
    return res.status(400).json({ error: 'El NIP debe ser exactamente de 4 dígitos.' });
  }

  try {
    const result = await db.query('SELECT codigo_verificacion FROM clientes WHERE id = $1', [cliente_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const dbCodigo = result.rows[0].codigo_verificacion;

    if (!dbCodigo || dbCodigo !== String(codigo).trim()) {
      return res.status(401).json({ error: 'El código de verificación es incorrecto o ya expiró.' });
    }

    await db.query('UPDATE clientes SET nip = $1, codigo_verificacion = NULL WHERE id = $2', [nuevoNip, cliente_id]);

    res.json({ success: true, mensaje: 'Tu NIP ha sido actualizado correctamente.' });
  } catch (error) {
    console.error("Error al cambiar NIP:", error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// 👇 NUEVA FUNCIÓN: Cambiar correo con el mismo sistema 2FA
exports.cambiarCorreoConCodigo = async (req, res) => {
  const { cliente_id, codigo, nuevoCorreo } = req.body;

  if (!cliente_id || !codigo || !nuevoCorreo) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  try {
    const result = await db.query('SELECT codigo_verificacion FROM clientes WHERE id = $1', [cliente_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const dbCodigo = result.rows[0].codigo_verificacion;

    if (!dbCodigo || dbCodigo !== String(codigo).trim()) {
      return res.status(401).json({ error: 'El código de verificación es incorrecto o ya expiró.' });
    }

    // Comprobamos que el nuevo correo no esté ya en uso por otro cliente
    const checkEmail = await db.query('SELECT id FROM clientes WHERE correo = $1 AND id != $2', [nuevoCorreo, cliente_id]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Ese correo ya está registrado en otra cuenta.' });
    }

    await db.query('UPDATE clientes SET correo = $1, codigo_verificacion = NULL WHERE id = $2', [nuevoCorreo, cliente_id]);

    res.json({ success: true, mensaje: 'Tu correo ha sido actualizado correctamente.' });
  } catch (error) {
    console.error("Error al cambiar correo:", error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// ==========================================
// FUNCIONES PARA EL ADMIN CRM
// ==========================================

exports.obtenerClientes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

exports.actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, correo, puntos, nip, direccion, fecha_nacimiento } = req.body;
  
  try {
    const curr = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (curr.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    
    const c = curr.rows[0];

    const nNombre = nombre !== undefined ? nombre : c.nombre;
    const nApellido = apellido !== undefined ? apellido : c.apellido;
    const nTelefono = telefono !== undefined ? telefono : c.telefono;
    const nCorreo = correo !== undefined ? correo : c.correo;
    const nPuntos = puntos !== undefined ? puntos : c.puntos;
    const nNip = nip !== undefined ? nip : c.nip;
    const nDireccion = direccion !== undefined ? direccion : c.direccion;
    const nFechaNacimiento = fecha_nacimiento !== undefined ? fecha_nacimiento : c.fecha_nacimiento; 

    const result = await db.query(
      'UPDATE clientes SET nombre=$1, apellido=$2, telefono=$3, correo=$4, puntos=$5, nip=$6, direccion=$7, fecha_nacimiento=$8 WHERE id=$9 RETURNING *',
      [nNombre, nApellido, nTelefono, nCorreo, nPuntos, nNip, nDireccion, nFechaNacimiento, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

exports.obtenerReportes = async (req, res) => {
  try {
    const edadRes = await db.query("SELECT ROUND(AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, fecha_nacimiento)))) as promedio_edad FROM clientes WHERE fecha_nacimiento IS NOT NULL");
    const topPuntos = await db.query("SELECT nombre, apellido, puntos FROM clientes ORDER BY puntos DESC LIMIT 5");
    const antiguos = await db.query("SELECT nombre, apellido, fecha_registro FROM clientes ORDER BY fecha_registro ASC LIMIT 5");
    const pagos = await db.query("SELECT metodo_pago, COUNT(*) as cantidad FROM pedidos WHERE cliente_id IS NOT NULL GROUP BY metodo_pago ORDER BY cantidad DESC");
    const origenes = await db.query("SELECT origen, COUNT(*) as cantidad FROM pedidos WHERE cliente_id IS NOT NULL GROUP BY origen ORDER BY cantidad DESC");
    const platillos = await db.query(`
      SELECT obj->>'nombre' as platillo, sum(CAST(obj->>'cantidad' AS INTEGER)) as total
      FROM pedidos p, jsonb_array_elements(p.carrito) obj
      WHERE p.cliente_id IS NOT NULL
      GROUP BY platillo ORDER BY total DESC LIMIT 5
    `);

    res.json({
      promedioEdad: edadRes.rows[0]?.promedio_edad || 0,
      topPuntos: topPuntos.rows,
      antiguos: antiguos.rows,
      pagos: pagos.rows,
      origenes: origenes.rows,
      platillos: platillos.rows
    });
  } catch (error) {
    console.error("Error en reportes CRM:", error);
    res.status(500).json({ error: 'Error al generar reportes' });
  }
};