const db = require('../config/db');
const cloudinary = require('cloudinary').v2;  

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
  if (publicId) { cloudinary.uploader.destroy(publicId).catch(err => {}); }
};  

exports.obtenerConfiguracion = async (req, res) => {
  try {
    await db.query(`
      ALTER TABLE configuracion
      ADD COLUMN IF NOT EXISTS horarios_semana JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS asistencia_pin_caja BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS asistencia_login BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS asistencia_huella BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS politicas_sustitucion JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS calendario_anual JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS limite_vacaciones_simultaneas INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS ticket_impresion_activa BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS ticket_modo_impresion VARCHAR(50) DEFAULT 'pdf',
      ADD COLUMN IF NOT EXISTS ticket_domicilio TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS ticket_mensaje_final TEXT DEFAULT '¡Gracias por su preferencia!',
      ADD COLUMN IF NOT EXISTS ticket_firma_sistema VARCHAR(100) DEFAULT 'Powered by MiSistemaPOS',
      ADD COLUMN IF NOT EXISTS ticket_impresora_ip VARCHAR(50) DEFAULT '192.168.1.100',
      ADD COLUMN IF NOT EXISTS ticket_impresora_puerto VARCHAR(10) DEFAULT '9100';
    `);

    let result = await db.query('SELECT * FROM configuracion WHERE id = 1');
    if (result.rows.length === 0) {
      await db.query("INSERT INTO configuracion (id, nombre_negocio) VALUES (1, 'Mi Restaurante') ON CONFLICT (id) DO NOTHING");
      result = await db.query('SELECT * FROM configuracion WHERE id = 1');
    }

    let config = result.rows[0] || {};
    
    // Limpiamos nulos
    for (let key in config) {
      if (config[key] === null) {
        config[key] = '';
      }
    }

    // 👇 FIX: INYECTAR PROMOCIONES ACTIVAS AL CONFIG GLOBAL PARA EL POS Y KIOSCO
    const promoRes = await db.query(`
      SELECT p.*,
      t.nombre AS trigger_nombre,
      o.nombre AS oferta_nombre, o.imagen_url AS oferta_imagen
      FROM promociones p
      LEFT JOIN productos t ON p.producto_trigger_id = t.id
      LEFT JOIN productos o ON p.producto_oferta_id = o.id
      WHERE p.activo = true
    `);
    
    // Anexamos el arreglo al objeto config que se envía al frontend
    config.promociones = promoRes.rows;

    res.json(config);
  } catch (error) {
    console.error("Error al obtener config:", error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};  

exports.actualizarConfiguracion = async (req, res) => {
  let configActual = {};
  try {
    const resActual = await db.query('SELECT * FROM configuracion WHERE id = 1');
    if (resActual.rows.length > 0) configActual = resActual.rows[0];
  } catch(e) {}  

  const mergedBody = { ...configActual, ...req.body };  

  const {
    nombre_negocio, whatsapp, banco, cuenta, titular,
    color_primario, color_secundario, color_fondo,
    color_fondo_tarjetas, color_texto_principal, color_texto_secundario,
    fuente_titulos, fuente_textos,
    kiosco_mensaje, color_texto_kiosco,
    tv_msg_cola, tv_msg_progreso, tv_msg_listo,
    tv_carrusel_activo, tv_carrusel_segundos,
    negocio_abierto, mensaje_cierre,
    ticket_impresion_activa, ticket_modo_impresion, ticket_domicilio, ticket_mensaje_final, ticket_firma_sistema,
    ticket_impresora_ip, ticket_impresora_puerto, // 👈 INYECTADOS
    mensaje_envio, tarifas_envio,
    wa_api_activa, wa_api_token, wa_phone_id,
    puntos_porcentaje, puntos_valor_peso, puntos_activos, puntos_canje_activo,
    bloqueo_caja_activo, bloqueo_caja_segundos,
    comedor_limite, comedor_clasif_bebidas, comedor_clasif_platillos, matriz_limpieza,
    cocina_en_caja_activa, horarios_semana,
    asistencia_pin_caja, asistencia_login, asistencia_huella,
    politicas_sustitucion, calendario_anual, limite_vacaciones_simultaneas
  } = mergedBody;  

  let logo_url = configActual.logo_url || null;
  let tv_imagen_1 = configActual.tv_imagen_1 || null;
  let tv_imagen_2 = configActual.tv_imagen_2 || null;
  let tv_imagen_3 = configActual.tv_imagen_3 || null;
  let tv_video = configActual.tv_video || null;  

  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      if (file.fieldname === 'logo') { logo_url = file.path; if (configActual.logo_url) borrarDeCloudinary(configActual.logo_url); }
      if (file.fieldname === 'tv_imagen_1') { tv_imagen_1 = file.path; if (configActual.tv_imagen_1) borrarDeCloudinary(configActual.tv_imagen_1); }
      if (file.fieldname === 'tv_imagen_2') { tv_imagen_2 = file.path; if (configActual.tv_imagen_2) borrarDeCloudinary(configActual.tv_imagen_2); }
      if (file.fieldname === 'tv_imagen_3') { tv_imagen_3 = file.path; if (configActual.tv_imagen_3) borrarDeCloudinary(configActual.tv_imagen_3); }
      if (file.fieldname === 'tv_video') { tv_video = file.path; if (configActual.tv_video) borrarDeCloudinary(configActual.tv_video); }
    });
  }  

  const isCarruselActivo = tv_carrusel_activo === 'true' || tv_carrusel_activo === true;
  const isNegocioAbierto = negocio_abierto === undefined ? true : (negocio_abierto === 'true' || negocio_abierto === true);
  const isTicketActivo = ticket_impresion_activa === 'true' || ticket_impresion_activa === true;
  const isWaActiva = wa_api_activa === 'true' || wa_api_activa === true;
  const isPuntosActivos = puntos_activos === undefined ? true : (puntos_activos === 'true' || puntos_activos === true);
  const isCanjeActivo = puntos_canje_activo === undefined ? true : (puntos_canje_activo === 'true' || puntos_canje_activo === true);
  const isBloqueoCajaActivo = bloqueo_caja_activo === 'true' || bloqueo_caja_activo === true;
  const isCocinaCajaActiva = cocina_en_caja_activa === 'true' || cocina_en_caja_activa === true;
  const isAsistenciaPin = asistencia_pin_caja === undefined ? true : (asistencia_pin_caja === 'true' || asistencia_pin_caja === true);
  const isAsistenciaLogin = asistencia_login === undefined ? true : (asistencia_login === 'true' || asistencia_login === true);
  const isAsistenciaHuella = asistencia_huella === 'true' || asistencia_huella === true;  

  const segundosSeguros = bloqueo_caja_segundos !== undefined ? Number(bloqueo_caja_segundos) : 30;
  const limiteComedorSeguro = comedor_limite || 'ambos';
  const porcentajeSeguro = puntos_porcentaje !== undefined ? Number(puntos_porcentaje) : 10;
  const valorPesoSeguro = puntos_valor_peso !== undefined ? Number(puntos_valor_peso) : 1.00;
  const limiteVacSeguro = limite_vacaciones_simultaneas !== undefined ? Number(limite_vacaciones_simultaneas) : 2;  

  let tarifasParsed = '[]', bebidasParsed = '[]', platillosParsed = '[]', matrizParsed = '{}', horariosParsed = '{}', politicasParsed = '{}', calendarioParsed = '{}';  
  try { tarifasParsed = (tarifas_envio && typeof tarifas_envio !== 'string') ? JSON.stringify(tarifas_envio) : (tarifas_envio || '[]'); } catch (e) {}
  try { bebidasParsed = (comedor_clasif_bebidas && typeof comedor_clasif_bebidas !== 'string') ? JSON.stringify(comedor_clasif_bebidas) : (comedor_clasif_bebidas || '[]'); } catch (e) {}
  try { platillosParsed = (comedor_clasif_platillos && typeof comedor_clasif_platillos !== 'string') ? JSON.stringify(comedor_clasif_platillos) : (comedor_clasif_platillos || '[]'); } catch (e) {}
  try { matrizParsed = (matriz_limpieza && typeof matriz_limpieza !== 'string') ? JSON.stringify(matriz_limpieza) : (matriz_limpieza || '{}'); } catch (e) {}
  try { horariosParsed = (horarios_semana && typeof horarios_semana !== 'string') ? JSON.stringify(horarios_semana) : (horarios_semana || '{}'); } catch (e) {}
  try { politicasParsed = (politicas_sustitucion && typeof politicas_sustitucion !== 'string') ? JSON.stringify(politicas_sustitucion) : (politicas_sustitucion || '{}'); } catch (e) {}  

  try {
    if (calendario_anual) {
      if (typeof calendario_anual === 'object') {
        calendarioParsed = JSON.stringify(calendario_anual);
      } else if (calendario_anual === '[object Object]') {
        calendarioParsed = '{}';
      } else {
        calendarioParsed = calendario_anual;
      }
    }
  } catch (e) { calendarioParsed = '{}'; }  

  try {
    await db.query(`
      INSERT INTO configuracion (
        id, nombre_negocio, whatsapp, banco, cuenta, titular, logo_url,
        color_primario, color_secundario, color_fondo, color_fondo_tarjetas,
        color_texto_principal, color_texto_secundario, fuente_titulos, fuente_textos,
        kiosco_mensaje, color_texto_kiosco, tv_msg_cola, tv_msg_progreso, tv_msg_listo,
        tv_carrusel_activo, tv_carrusel_segundos, tv_imagen_1, tv_imagen_2, tv_imagen_3, tv_video,
        negocio_abierto, mensaje_cierre,
        ticket_impresion_activa, ticket_modo_impresion, ticket_domicilio, ticket_mensaje_final, ticket_firma_sistema,
        mensaje_envio, tarifas_envio,
        wa_api_activa, wa_api_token, wa_phone_id,
        puntos_porcentaje, puntos_valor_peso, puntos_activos, puntos_canje_activo,
        bloqueo_caja_activo, bloqueo_caja_segundos, comedor_limite, comedor_clasif_bebidas, comedor_clasif_platillos, matriz_limpieza,
        cocina_en_caja_activa, horarios_semana,
        asistencia_pin_caja, asistencia_login, asistencia_huella, politicas_sustitucion,
        calendario_anual, limite_vacaciones_simultaneas, ticket_impresora_ip, ticket_impresora_puerto
      )
      VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57
      )
      ON CONFLICT (id) DO UPDATE SET
        nombre_negocio = EXCLUDED.nombre_negocio,
        whatsapp = EXCLUDED.whatsapp,
        banco = EXCLUDED.banco,
        cuenta = EXCLUDED.cuenta,
        titular = EXCLUDED.titular,
        logo_url = COALESCE($6, configuracion.logo_url),
        color_primario = EXCLUDED.color_primario,
        color_secundario = EXCLUDED.color_secundario,
        color_fondo = EXCLUDED.color_fondo,
        color_fondo_tarjetas = EXCLUDED.color_fondo_tarjetas,
        color_texto_principal = EXCLUDED.color_texto_principal,
        color_texto_secundario = EXCLUDED.color_texto_secundario,
        fuente_titulos = EXCLUDED.fuente_titulos,
        fuente_textos = EXCLUDED.fuente_textos,
        kiosco_mensaje = EXCLUDED.kiosco_mensaje,
        color_texto_kiosco = EXCLUDED.color_texto_kiosco,
        tv_msg_cola = EXCLUDED.tv_msg_cola,
        tv_msg_progreso = EXCLUDED.tv_msg_progreso,
        tv_msg_listo = EXCLUDED.tv_msg_listo,
        tv_carrusel_activo = EXCLUDED.tv_carrusel_activo,
        tv_carrusel_segundos = EXCLUDED.tv_carrusel_segundos,
        tv_imagen_1 = COALESCE($22, configuracion.tv_imagen_1),
        tv_imagen_2 = COALESCE($23, configuracion.tv_imagen_2),
        tv_imagen_3 = COALESCE($24, configuracion.tv_imagen_3),
        tv_video = COALESCE($25, configuracion.tv_video),
        negocio_abierto = EXCLUDED.negocio_abierto,
        mensaje_cierre = EXCLUDED.mensaje_cierre,
        ticket_impresion_activa = EXCLUDED.ticket_impresion_activa,
        ticket_modo_impresion = EXCLUDED.ticket_modo_impresion,
        ticket_domicilio = EXCLUDED.ticket_domicilio,
        ticket_mensaje_final = EXCLUDED.ticket_mensaje_final,
        ticket_firma_sistema = EXCLUDED.ticket_firma_sistema,
        ticket_impresora_ip = EXCLUDED.ticket_impresora_ip,
        ticket_impresora_puerto = EXCLUDED.ticket_impresora_puerto,
        mensaje_envio = EXCLUDED.mensaje_envio,
        tarifas_envio = EXCLUDED.tarifas_envio::jsonb,
        wa_api_activa = EXCLUDED.wa_api_activa,
        wa_api_token = EXCLUDED.wa_api_token,
        wa_phone_id = EXCLUDED.wa_phone_id,
        puntos_porcentaje = EXCLUDED.puntos_porcentaje,
        puntos_valor_peso = EXCLUDED.puntos_valor_peso,
        puntos_activos = EXCLUDED.puntos_activos,
        puntos_canje_activo = EXCLUDED.puntos_canje_activo,
        bloqueo_caja_activo = EXCLUDED.bloqueo_caja_activo,
        bloqueo_caja_segundos = EXCLUDED.bloqueo_caja_segundos,
        comedor_limite = EXCLUDED.comedor_limite,
        comedor_clasif_bebidas = EXCLUDED.comedor_clasif_bebidas::jsonb,
        comedor_clasif_platillos = EXCLUDED.comedor_clasif_platillos::jsonb,
        matriz_limpieza = EXCLUDED.matriz_limpieza::jsonb,
        cocina_en_caja_activa = EXCLUDED.cocina_en_caja_activa,
        horarios_semana = EXCLUDED.horarios_semana::jsonb,
        asistencia_pin_caja = EXCLUDED.asistencia_pin_caja,
        asistencia_login = EXCLUDED.asistencia_login,
        asistencia_huella = EXCLUDED.asistencia_huella,
        politicas_sustitucion = EXCLUDED.politicas_sustitucion::jsonb,
        calendario_anual = EXCLUDED.calendario_anual::jsonb,
        limite_vacaciones_simultaneas = EXCLUDED.limite_vacaciones_simultaneas
    `, [
      nombre_negocio, whatsapp, banco, cuenta, titular, logo_url,
      color_primario, color_secundario, color_fondo, color_fondo_tarjetas,
      color_texto_principal, color_texto_secundario, fuente_titulos, fuente_textos,
      kiosco_mensaje, color_texto_kiosco, tv_msg_cola, tv_msg_progreso, tv_msg_listo,
      isCarruselActivo, tv_carrusel_segundos, tv_imagen_1, tv_imagen_2, tv_imagen_3, tv_video,
      isNegocioAbierto, mensaje_cierre,
      isTicketActivo, ticket_modo_impresion, ticket_domicilio, ticket_mensaje_final, ticket_firma_sistema,
      mensaje_envio, tarifasParsed,
      isWaActiva, wa_api_token, wa_phone_id,
      porcentajeSeguro, valorPesoSeguro, isPuntosActivos, isCanjeActivo,
      isBloqueoCajaActivo, segundosSeguros, limiteComedorSeguro, bebidasParsed, platillosParsed, matrizParsed,
      isCocinaCajaActiva, horariosParsed,
      isAsistenciaPin, isAsistenciaLogin, isAsistenciaHuella, politicasParsed,
      calendarioParsed, limiteVacSeguro,
      ticket_impresora_ip || '192.168.1.100', ticket_impresora_puerto || '9100'
    ]);  

    const io = req.app.get('io');
    if (io) { io.emit('config_actualizada'); }  

    res.json({ success: true, logo_url });
  } catch (error) {
    console.error("Error al guardar config:", error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};  

exports.subirEvidenciaLimpieza = async (req, res) => {
  try {
    const { area, fecha } = req.body;
    let imgUrl = null;  
    if (req.files && req.files.length > 0) { imgUrl = req.files[0].path; }  
    if (!imgUrl) return res.status(400).json({ error: 'No se procesó la imagen en Cloudinary' });  
    const resConf = await db.query('SELECT matriz_limpieza FROM configuracion WHERE id = 1');
    let matriz = {};
    if (resConf.rows.length > 0 && resConf.rows[0].matriz_limpieza) {
      matriz = typeof resConf.rows[0].matriz_limpieza === 'string' ? JSON.parse(resConf.rows[0].matriz_limpieza) : resConf.rows[0].matriz_limpieza;
    }  
    if (!matriz.evidencias) matriz.evidencias = {};
    if (!matriz.evidencias[area]) matriz.evidencias[area] = {};
    matriz.evidencias[area][fecha] = imgUrl;  
    await db.query('UPDATE configuracion SET matriz_limpieza = $1 WHERE id = 1', [JSON.stringify(matriz)]);  
    res.json({ success: true, url: imgUrl, matriz });
  } catch (error) {
    console.error("Error al subir evidencia:", error);
    res.status(500).json({ error: 'Error interno al subir evidencia' });
  }
};  

exports.obtenerCupones = async (req, res) => {
  try { res.json((await db.query('SELECT * FROM cupones ORDER BY id DESC')).rows); } 
  catch (error) { res.status(500).json({ error: 'Error al obtener cupones' }); }
};  

exports.crearCupon = async (req, res) => {
  const { codigo, tipo, valor, limite_usos, fecha_vencimiento } = req.body;
  try {
    const codigoLimpio = String(codigo).toUpperCase().replace(/\s+/g, '');
    const result = await db.query(
      'INSERT INTO cupones (codigo, tipo, valor, limite_usos, fecha_vencimiento) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [codigoLimpio, tipo, valor, limite_usos || null, fecha_vencimiento || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'El código del cupón ya existe.' });
    res.status(500).json({ error: 'Error al crear cupón' });
  }
};  

exports.actualizarCuponEstado = async (req, res) => {
  const { id } = req.params; const { activo } = req.body;
  try { res.json((await db.query('UPDATE cupones SET activo = $1 WHERE id = $2 RETURNING *', [activo, id])).rows[0]); } 
  catch (error) { res.status(500).json({ error: 'Error al actualizar cupón' }); }
};  

exports.eliminarCupon = async (req, res) => {
  try { await db.query('DELETE FROM cupones WHERE id = $1', [req.params.id]); res.json({ success: true }); } 
  catch (error) { res.status(500).json({ error: 'Error al eliminar cupón' }); }
};  

exports.validarCupon = async (req, res) => {
  const { codigo } = req.body;
  try {
    const codigoLimpio = String(codigo).toUpperCase().replace(/\s+/g, '');
    const result = await db.query('SELECT * FROM cupones WHERE codigo = $1 AND activo = true', [codigoLimpio]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cupón inválido o inactivo.' });
    const cupon = result.rows[0];
    if (cupon.limite_usos !== null && cupon.usos_actuales >= cupon.limite_usos) return res.status(400).json({ error: 'El cupón ha superado su límite de usos.' });
    if (cupon.fecha_vencimiento && new Date(cupon.fecha_vencimiento) < new Date()) return res.status(400).json({ error: 'El cupón ha expirado.' });
    res.json(cupon);
  } catch (error) { res.status(500).json({ error: 'Error al validar cupón' }); }
};