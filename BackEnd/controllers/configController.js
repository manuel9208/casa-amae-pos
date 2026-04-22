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
    tv_msg_cola, tv_msg_progreso, tv_msg_listo 
  } = req.body;
  
  let logo_url = req.body.logo_url_actual;
  if (req.file) {
    logo_url = '/uploads/' + req.file.filename;
  }

  try {
    await db.query(`
      INSERT INTO configuracion (id, nombre_negocio, whatsapp, banco, cuenta, titular, logo_url, color_primario, color_secundario, color_fondo, color_fondo_tarjetas, color_texto_principal, color_texto_secundario, fuente_titulos, fuente_textos, kiosco_mensaje, color_texto_kiosco, tv_msg_cola, tv_msg_progreso, tv_msg_listo)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
        tv_msg_listo = EXCLUDED.tv_msg_listo
    `, [nombre_negocio, whatsapp, banco, cuenta, titular, req.file ? logo_url : null, color_primario, color_secundario, color_fondo, color_fondo_tarjetas, color_texto_principal, color_texto_secundario, fuente_titulos, fuente_textos, kiosco_mensaje, color_texto_kiosco, tv_msg_cola, tv_msg_progreso, tv_msg_listo]);
    
    res.json({ success: true, logo_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};