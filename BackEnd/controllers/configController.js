const db = require('../config/db');

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM configuracion WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

exports.actualizarConfiguracion = async (req, res) => {
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
    // 👇 NUEVOS CAMPOS DE ENVÍO
    mensaje_envio, tarifas_envio
  } = req.body;
  
  // Variables para las rutas de las imágenes
  let logo_url = null;
  let tv_imagen_1 = null;
  let tv_imagen_2 = null;
  let tv_imagen_3 = null;

  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      if (file.fieldname === 'logo') logo_url = file.path;
      if (file.fieldname === 'tv_imagen_1') tv_imagen_1 = file.path;
      if (file.fieldname === 'tv_imagen_2') tv_imagen_2 = file.path;
      if (file.fieldname === 'tv_imagen_3') tv_imagen_3 = file.path;
    });
  }

  // Parseo de booleanos
  const isCarruselActivo = tv_carrusel_activo === 'true' || tv_carrusel_activo === true;
  const isNegocioAbierto = negocio_abierto === undefined ? true : (negocio_abierto === 'true' || negocio_abierto === true);
  const isTicketActivo = ticket_impresion_activa === 'true' || ticket_impresion_activa === true;
  
  // Parseo seguro de tarifas de envío (Si viene vacío, guardamos un arreglo vacío)
  let tarifasParsed = '[]';
  try {
    tarifasParsed = tarifas_envio ? (typeof tarifas_envio === 'string' ? tarifas_envio : JSON.stringify(tarifas_envio)) : '[]';
  } catch (e) {
    tarifasParsed = '[]';
  }

  try {
    await db.query(`
      INSERT INTO configuracion (
        id, nombre_negocio, whatsapp, banco, cuenta, titular, logo_url, 
        color_primario, color_secundario, color_fondo, color_fondo_tarjetas, 
        color_texto_principal, color_texto_secundario, fuente_titulos, fuente_textos, 
        kiosco_mensaje, color_texto_kiosco, tv_msg_cola, tv_msg_progreso, tv_msg_listo,
        tv_carrusel_activo, tv_carrusel_segundos, tv_imagen_1, tv_imagen_2, tv_imagen_3,
        negocio_abierto, mensaje_cierre,
        ticket_impresion_activa, ticket_modo_impresion, ticket_domicilio, ticket_mensaje_final, ticket_firma_sistema,
        mensaje_envio, tarifas_envio
      )
      VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
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
        negocio_abierto = EXCLUDED.negocio_abierto,
        mensaje_cierre = EXCLUDED.mensaje_cierre,
        ticket_impresion_activa = EXCLUDED.ticket_impresion_activa,
        ticket_modo_impresion = EXCLUDED.ticket_modo_impresion,
        ticket_domicilio = EXCLUDED.ticket_domicilio,
        ticket_mensaje_final = EXCLUDED.ticket_mensaje_final,
        ticket_firma_sistema = EXCLUDED.ticket_firma_sistema,
        mensaje_envio = EXCLUDED.mensaje_envio,
        tarifas_envio = EXCLUDED.tarifas_envio::jsonb
    `, [
      nombre_negocio, whatsapp, banco, cuenta, titular, logo_url, 
      color_primario, color_secundario, color_fondo, color_fondo_tarjetas, 
      color_texto_principal, color_texto_secundario, fuente_titulos, fuente_textos, 
      kiosco_mensaje, color_texto_kiosco, tv_msg_cola, tv_msg_progreso, tv_msg_listo,
      isCarruselActivo, tv_carrusel_segundos, tv_imagen_1, tv_imagen_2, tv_imagen_3,
      isNegocioAbierto, mensaje_cierre,
      isTicketActivo, ticket_modo_impresion, ticket_domicilio, ticket_mensaje_final, ticket_firma_sistema,
      mensaje_envio, tarifasParsed
    ]);
    
    res.json({ success: true, logo_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};