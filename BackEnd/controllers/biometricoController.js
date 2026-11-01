const db = require('../config/db');

// 🆕 AUTO-MIGRACIÓN: tabla de mapeo IP pública -> empresa, exclusiva de este
// módulo. Se debe llamar desde api.js al arrancar, igual que otros módulos
// (ej. comboCtrl.inicializarTablaCombos()).
exports.inicializarTablas = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS checador_ips (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(50) UNIQUE NOT NULL,
        descripcion VARCHAR(150),
        activo BOOLEAN DEFAULT true,
        empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla de mapeo de checadores ZKTeco (checador_ips) verificada/creada.');
  } catch (error) {
    console.error('🚨 Error al inicializar tabla checador_ips:', error);
  }
};

// 🆕 Helper: normaliza la IP de origen (quita el prefijo IPv6 "::ffff:" que
// Node agrega a veces a direcciones IPv4 cuando el servidor corre detrás
// de un proxy, como es el caso de Render).
const obtenerIPReal = (req) => {
  let ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress || '';
  return ip.replace('::ffff:', '');
};

// 1. Handshake: El checador hace "ping" para saber si el servidor está vivo.
exports.handshake = async (req, res) => {
  res.status(200).send("OK");
};

// 2. Recepción: El checador manda las huellas en texto plano, no en JSON.
exports.recibirDatos = async (req, res) => {
  try {
    // 🔒 PATRÓN 20 corregido: resolución de empresa_id por IP de origen,
    // ya que el checador físico no manda header ni JWT como el resto del sistema.
    const ipOrigen = obtenerIPReal(req);
    const dispositivoRes = await db.query(
      'SELECT empresa_id FROM checador_ips WHERE ip = $1 AND activo = true',
      [ipOrigen]
    );

    if (dispositivoRes.rows.length === 0) {
      console.warn(`⚠️ Checador ZKTeco con IP no registrada intentó enviar datos: ${ipOrigen}`);
      return res.status(200).send("OK: 0"); // Mismo "soft fail" ya usado en el resto del archivo
    }
    const empresaId = dispositivoRes.rows[0].empresa_id;

    // 👇 Interruptor Dinámico. Si ZKTeco no está activo en el panel, ignoramos el proceso silenciosamente.
    const confAsist = await db.query('SELECT tipo_registro FROM configuracion_asistencia WHERE empresa_id = $1', [empresaId]);
    if (confAsist.rows.length === 0) return res.status(200).send("OK: 0");

    let metodosActivos = [];
    try {
        metodosActivos = typeof confAsist.rows[0].tipo_registro === 'string' 
            ? JSON.parse(confAsist.rows[0].tipo_registro) 
            : confAsist.rows[0].tipo_registro;
    } catch(e) { metodosActivos = []; }

    if (!Array.isArray(metodosActivos) || !metodosActivos.includes('zkteco')) {
        return res.status(200).send("OK: 0"); // Respondemos OK para que el checador no se bloquee ni marque error de red.
    }
    // ☝️ FIN DEL INTERRUPTOR

    const rawData = req.body;
    if (!rawData || typeof rawData !== 'string') {
      return res.status(200).send("OK: 0");
    }

    // El checador puede mandar varias checadas de golpe si se quedó sin internet
    const lineas = rawData.split('\n').filter(linea => linea.trim() !== '');
    let procesados = 0;

    for (const linea of lineas) {
      // Formato ZKTeco: ID_USUARIO \t FECHA_HORA \t ESTADO \t TIPO_VERIFICACION ...
      const partes = linea.split('\t');
      
      if (partes.length >= 2) {
        const idChecador = partes[0].trim();
        const fechaHora = partes[1].trim(); // Ej: "2026-06-25 14:30:00"
        const [fechaStr, horaStr] = fechaHora.split(' ');

        // Buscamos al empleado SOLO dentro de la empresa dueña de este checador
        const userRes = await db.query('SELECT id FROM usuarios WHERE (id::text = $1 OR pin = $1) AND empresa_id = $2 LIMIT 1', [idChecador, empresaId]);

        if (userRes.rows.length > 0) {
          const idReal = userRes.rows[0].id;

          // REGLA SOLICITADA: Buscamos si tiene turno abierto HOY, dentro de su empresa
          const turnoAbierto = await db.query(
            'SELECT id FROM registro_asistencias WHERE usuario_id = $1 AND fecha = $2 AND hora_salida IS NULL AND empresa_id = $3',
            [idReal, fechaStr, empresaId]
          );

          if (turnoAbierto.rows.length === 0) {
            // No tiene turno abierto = ES ENTRADA
            await db.query(
              'INSERT INTO registro_asistencias (usuario_id, fecha, hora_entrada, empresa_id) VALUES ($1, $2, $3, $4)',
              [idReal, fechaStr, fechaHora, empresaId]
            );
          } else {
            // Ya tiene entrada = ES SALIDA
            // Si pone la huella varias veces para irse, sobreescribe la salida a la más tarde
            await db.query(
              'UPDATE registro_asistencias SET hora_salida = $1 WHERE id = $2 AND empresa_id = $3',
              [fechaHora, turnoAbierto.rows[0].id, empresaId]
            );
          }
          procesados++;
        }
      }
    }

    // El checador necesita esta respuesta exacta para saber que guardamos los datos
    res.status(200).send(`OK: ${procesados}`);
  } catch (error) {
    console.error("Error al procesar huella del biométrico:", error);
    res.status(500).send("ERROR");
  }
};

// 3. Comandos: Responde vacío para que el checador no marque error de sincronización
exports.getComandos = async (req, res) => {
  res.status(200).send("OK");
};