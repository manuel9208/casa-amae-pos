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
    let result = await db.query('SELECT * FROM configuracion WHERE id = 1');
    
    // BLINDAJE 1: Si no hay fila de configuración, la creamos por defecto
    if (result.rows.length === 0) {
        await db.query("INSERT INTO configuracion (id, nombre_negocio) VALUES (1, 'Mi Restaurante') ON CONFLICT (id) DO NOTHING");
        result = await db.query('SELECT * FROM configuracion WHERE id = 1');
    }

    let config = result.rows[0] || {};

    // BLINDAJE 2: Convertimos los NULLs en textos vacíos para que el Frontend (React) no colapse
    for (let key in config) {
        if (config[key] === null) {
            config[key] = '';
        }
    }

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

  // 🛡️ BLINDAJE 4 (LA SOLUCIÓN): Fusionar los datos actuales con los nuevos.
  // Evita que las peticiones parciales (como Apagar Negocio desde Caja) borren tus colores y diseños.
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
    mensaje_envio, tarifas_envio,
    wa_api_activa, wa_api_token, wa_phone_id,
    puntos_porcentaje, puntos_valor_peso, puntos_activos, puntos_canje_activo,
    bloqueo_caja_activo, bloqueo_caja_segundos,
    comedor_limite, comedor_clasif_bebidas, comedor_clasif_platillos, matriz_limpieza,
    cocina_en_caja_activa 
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

  const segundosSeguros = bloqueo_caja_segundos !== undefined ? Number(bloqueo_caja_segundos) : 30;
  const limiteComedorSeguro = comedor_limite || 'ambos';
  const porcentajeSeguro = puntos_porcentaje !== undefined ? Number(puntos_porcentaje) : 10;
  const valorPesoSeguro = puntos_valor_peso !== undefined ? Number(puntos_valor_peso) : 1.00;

  // BLINDAJE 3: Evitar que textos vacíos se intenten guardar como JSON inválido
  let tarifasParsed = '[]', bebidasParsed = '[]', platillosParsed = '[]', matrizParsed = '{}';
  try { tarifasParsed = (tarifas_envio && tarifas_envio !== '') ? (typeof tarifas_envio === 'string' ? tarifas_envio : JSON.stringify(tarifas_envio)) : '[]'; } catch (e) {}
  try { bebidasParsed = (comedor_clasif_bebidas && comedor_clasif_bebidas !== '') ? (typeof comedor_clasif_bebidas === 'string' ? comedor_clasif_bebidas : JSON.stringify(comedor_clasif_bebidas)) : '[]'; } catch (e) {}
  try { platillosParsed = (comedor_clasif_platillos && comedor_clasif_platillos !== '') ? (typeof comedor_clasif_platillos === 'string' ? comedor_clasif_platillos : JSON.stringify(comedor_clasif_platillos)) : '[]'; } catch (e) {}
  try { matrizParsed = (matriz_limpieza && matriz_limpieza !== '') ? (typeof matriz_limpieza === 'string' ? matriz_limpieza : JSON.stringify(matriz_limpieza)) : '{}'; } catch (e) {}

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
        cocina_en_caja_activa
      )
      VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48
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
        mensaje_envio = EXCLUDED.mensaje_envio,
        tarifas_envio = EXCLUDED.tarifas_envio::jsonb,
        wa_api_activa = EXCLUDED.wa_api_activa,
        wa_api_token = EXCLUDED.wa_api_token,
        wa_phone_id = EXCLUDED.wa_api_token,
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
        cocina_en_caja_activa = EXCLUDED.cocina_en_caja_activa
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
      isCocinaCajaActiva
    ]);
    
    res.json({ success: true, logo_url });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

exports.obtenerCupones = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cupones ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Error al obtener cupones' }); }
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
    if(error.code === '23505') return res.status(400).json({ error: 'Este código de cupón ya existe.' });
    res.status(500).json({ error: 'Error al crear cupón' });
  }
};

exports.actualizarCuponEstado = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const result = await db.query('UPDATE cupones SET activo = $1 WHERE id = $2 RETURNING *', [activo, id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Error al actualizar cupón' }); }
};

exports.eliminarCupon = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM cupones WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Error al eliminar cupón' }); }
};

exports.validarCupon = async (req, res) => {
  const { codigo } = req.body;
  try {
    const codigoLimpio = String(codigo).toUpperCase().replace(/\s+/g, '');
    const result = await db.query('SELECT * FROM cupones WHERE codigo = $1 AND activo = true', [codigoLimpio]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cupón no encontrado o inactivo.' });

    const cupon = result.rows[0];
    if (cupon.fecha_vencimiento && new Date(cupon.fecha_vencimiento) < new Date()) return res.status(400).json({ error: 'Este cupón ya expiró.' });
    if (cupon.limite_usos !== null && cupon.usos_actuales >= cupon.limite_usos) return res.status(400).json({ error: 'Este cupón ya alcanzó su límite de usos.' });

    res.json(cupon);
  } catch (error) { res.status(500).json({ error: 'Error al validar cupón' }); }
};