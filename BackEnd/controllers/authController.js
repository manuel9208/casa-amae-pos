const db = require('../config/db');

exports.identificar = async (req, res) => {
    const { telefono } = req.body;
    try {
        const empleado = await db.query('SELECT * FROM usuarios WHERE telefono = $1', [telefono]);
        if (empleado.rows.length > 0) return res.json({ tipo: 'empleado', data: empleado.rows[0] });  

        // 👇 FIX: Ahora revisamos si el cliente tiene huella al momento de teclear su celular
        const cliente = await db.query(`
            SELECT c.*, 
            EXISTS(SELECT 1 FROM credenciales_biometricas cb WHERE cb.cliente_id = c.id) as tiene_huella 
            FROM clientes c WHERE telefono = $1
        `, [telefono]);
        
        if (cliente.rows.length > 0) return res.json({ tipo: 'cliente', data: cliente.rows[0] });  

        return res.json({ tipo: 'nuevo' });
    } catch (error) {
        res.status(500).json({ error: 'Error al identificar' });
    }
};

exports.login = async (req, res) => {
    const { usuario, password, dispositivo_id } = req.body;
    try {
        const result = await db.query('SELECT * FROM usuarios WHERE usuario = $1 AND password = $2', [usuario, password]);

        if (result.rows.length > 0) {
            const user = result.rows[0];

            // 👇 NUEVO: BLOQUEO ESTRICTO (MATRIZ EQUIPO-ROL)
            try {
                // El Admin Global ignora todo bloqueo
                if (user.usuario !== 'admin') { 
                    const confMdm = await db.query('SELECT control_dispositivos_activo, roles_restringidos FROM configuracion_biometria WHERE id = 1');
                    if (confMdm.rows.length > 0 && confMdm.rows[0].control_dispositivos_activo) {
                        const rolesRestringidos = confMdm.rows[0].roles_restringidos || [];
                        
                        // Si el rol del empleado tiene prohibido iniciar fuera de la red
                        if (rolesRestringidos.includes(user.rol)) {
                            const equipoAuth = await db.query('SELECT id, alias, roles_permitidos FROM equipos_autorizados WHERE device_id = $1', [dispositivo_id]);
                            
                            // 1. ¿El equipo está registrado?
                            if (equipoAuth.rows.length === 0) {
                                return res.status(403).json({ 
                                    error: 'Acceso Denegado. Tu cuenta solo puede iniciar sesión en las tablets y equipos oficiales de la sucursal.' 
                                });
                            }

                            // 2. ¿El equipo permite a ESTE rol? (Ej. Un cajero intentando usar la tablet de cocina)
                            const rolesPermitidos = equipoAuth.rows[0].roles_permitidos || [];
                            if (!rolesPermitidos.includes(user.rol)) {
                                return res.status(403).json({ 
                                    error: `Esta máquina (${equipoAuth.rows[0].alias}) no está autorizada para el rol de ${user.rol.toUpperCase()}.` 
                                });
                            }
                        }
                    }
                } 
            } catch(e) { console.error("Error en validación MDM", e); }
            // ☝️ FIN BLOQUEO MDM

            const ahora = new Date();
            const hace8Horas = new Date(ahora.getTime() - (8 * 60 * 60 * 1000));

            let devices = [];
            if (user.ultimo_acceso && new Date(user.ultimo_acceso) > hace8Horas) {
                devices = (user.dispositivo_id || '').split(',').filter(Boolean);
            }

            if (!devices.includes(dispositivo_id)) {
                if (devices.length >= 2) {
                    return res.status(403).json({ error: 'Esta cuenta ya está abierta en 2 equipos simultáneamente. Cierra la sesión en alguno de ellos primero.' });
                }
                devices.push(dispositivo_id); 
            }

            const es_secundaria = devices.indexOf(dispositivo_id) > 0;

            await db.query(
                'UPDATE usuarios SET dispositivo_id = $1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $2',
                [devices.join(','), user.id]
            );

            const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
            const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;

            if (isLoginActivo && !es_secundaria) {
                const turnoAbierto = await db.query(
                    'SELECT id FROM registro_asistencias WHERE usuario_id = $1 AND hora_salida IS NULL AND fecha = CURRENT_DATE',
                    [user.id]
                );
                if (turnoAbierto.rows.length === 0) {
                    await db.query(
                        'INSERT INTO registro_asistencias (usuario_id, fecha, hora_entrada) VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP)',
                        [user.id]
                    );
                }
            }

            res.json({ usuario: user, segunda_sesion: es_secundaria });
        } else {
            res.status(401).json({ error: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

exports.logout = async (req, res) => {
  const { usuario_id, dispositivo_id } = req.body;
  try {
    const userRes = await db.query('SELECT dispositivo_id FROM usuarios WHERE id = $1', [usuario_id]);
    
    if (userRes.rows.length > 0) {
      let devices = (userRes.rows[0].dispositivo_id || '').split(',').filter(Boolean);
      
      if (dispositivo_id) {
        devices = devices.filter(d => d !== dispositivo_id); // Removemos solo el equipo que cerró sesión
      } else {
        devices = []; // Fallback de seguridad: si no nos manda ID, limpiamos todas
      }

      await db.query('UPDATE usuarios SET dispositivo_id = $1 WHERE id = $2', [devices.length > 0 ? devices.join(',') : null, usuario_id]);
    }

    // REVISAMOS SI ESTÁ ACTIVADO EL LOGOUT AUTOMÁTICO
    const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
    const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;

    // Solo cerramos asistencia si se cerró LA ÚLTIMA sesión del usuario
    const userCheck = await db.query('SELECT dispositivo_id FROM usuarios WHERE id = $1', [usuario_id]);
    const quedanDispositivos = userCheck.rows.length > 0 && userCheck.rows[0].dispositivo_id !== null && userCheck.rows[0].dispositivo_id !== '';

    if (isLoginActivo && !quedanDispositivos) {
      await db.query(
        'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND hora_salida IS NULL',
        [usuario_id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

exports.forzarLogout = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE usuarios SET dispositivo_id = NULL WHERE id = $1', [id]);
    
    // 👇 MEJORA APLICADA: Si el administrador expulsa al empleado, también le cerramos su turno de asistencia para que no quede "colgado" ganando horas fantasma.
    const confRes = await db.query('SELECT asistencia_login FROM configuracion WHERE id = 1');
    const isLoginActivo = confRes.rows.length === 0 || confRes.rows[0].asistencia_login === true || confRes.rows[0].asistencia_login === null;
    
    if (isLoginActivo) {
      await db.query(
        'UPDATE registro_asistencias SET hora_salida = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND hora_salida IS NULL',
        [id]
      );
    }

    // Disparamos un evento por Socket para expulsar los dispositivos si estuvieran activos
    const io = req.app.get('io');
    if (io) {
      io.emit('usuario_eliminado', parseInt(id)); 
    }

    res.json({ success: true, message: 'Sesiones remotas y turno de asistencia cerrados correctamente. El usuario ya puede iniciar sesión de nuevo.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al forzar el cierre de sesión.' });
  }
};