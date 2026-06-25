const db = require('../config/db');

// 1. Handshake: El checador hace "ping" para saber si el servidor está vivo.
exports.handshake = async (req, res) => {
  res.status(200).send("OK");
};

// 2. Recepción: El checador manda las huellas en texto plano, no en JSON.
exports.recibirDatos = async (req, res) => {
  try {
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

        // Buscamos al empleado. Vinculamos el ID del checador con el PIN o el ID del sistema
        const userRes = await db.query('SELECT id FROM usuarios WHERE id::text = $1 OR pin = $1 LIMIT 1', [idChecador]);

        if (userRes.rows.length > 0) {
          const idReal = userRes.rows[0].id;

          // REGLA SOLICITADA: Buscamos si tiene turno abierto HOY
          const turnoAbierto = await db.query(
            'SELECT id FROM registro_asistencias WHERE usuario_id = $1 AND fecha = $2 AND hora_salida IS NULL',
            [idReal, fechaStr]
          );

          if (turnoAbierto.rows.length === 0) {
            // No tiene turno abierto = ES ENTRADA
            await db.query(
              'INSERT INTO registro_asistencias (usuario_id, fecha, hora_entrada) VALUES ($1, $2, $3)',
              [idReal, fechaStr, fechaHora]
            );
          } else {
            // Ya tiene entrada = ES SALIDA
            // Si pone la huella varias veces para irse, sobreescribe la salida a la más tarde
            await db.query(
              'UPDATE registro_asistencias SET hora_salida = $1 WHERE id = $2',
              [fechaHora, turnoAbierto.rows[0].id]
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