const db = require('../config/db');

// 🔒 Enmascarado de secretos: 4 primeros + "..." + 4 últimos (o solo "..." si es corto).
// Todo valor que contenga "..." se considera "no modificado" al guardar.
const mascararSecreto = (valor) => {
  const v = String(valor || '');
  if (!v) return '';
  return v.length >= 16 ? `${v.slice(0, 4)}...${v.slice(-4)}` : '...';
};
const resolverSecreto = (nuevo, actual) =>
  (typeof nuevo === 'string' && nuevo.includes('...')) ? (actual || '') : (nuevo ?? actual ?? '');

exports.getConfiguracionUnificada = async (req, res) => {
  try {
    const empresa_id = req.empresa_id;

    // 1. Obtener o crear config IA
    let iaResult = await db.query('SELECT * FROM ia_configuracion WHERE empresa_id = $1', [empresa_id]);
    let iaConfig;
    if (iaResult.rows.length === 0) {
      const insertIa = await db.query('INSERT INTO ia_configuracion (empresa_id) VALUES ($1) RETURNING *', [empresa_id]);
      iaConfig = insertIa.rows[0];
    } else {
      iaConfig = iaResult.rows[0];
    }

    // 2. Obtener o crear config WhatsApp
    let waResult = await db.query('SELECT * FROM whatsapp_configuraciones WHERE empresa_id = $1', [empresa_id]);
    let waConfig;
    if (waResult.rows.length === 0) {
      const insertWa = await db.query(`
        INSERT INTO whatsapp_configuraciones (empresa_id, proveedor, ia_habilitada) 
        VALUES ($1, 'baileys', false) RETURNING *
      `, [empresa_id]);
      waConfig = insertWa.rows[0];
    } else {
      waConfig = waResult.rows[0];
    }

    // Estructura CLAVE: Esparcimos iaConfig al nivel principal para que coincida
    // con el estado inicial de ConfiguracionIA.js, y anidamos whatsapp.
    res.json({
      success: true,
      ...iaConfig,
      // 🔒 Las llaves NUNCA viajan completas al navegador
      api_key_gemini: mascararSecreto(iaConfig.api_key_gemini),
      api_key_openai: mascararSecreto(iaConfig.api_key_openai),
      api_key_claude: mascararSecreto(iaConfig.api_key_claude),
      whatsapp: {
        proveedor: waConfig.proveedor,
        meta_api_token: mascararSecreto(waConfig.meta_api_token),
        meta_phone_id: waConfig.meta_phone_id,
        dialog360_token: mascararSecreto(waConfig.dialog360_token),
        ia_habilitada: waConfig.ia_habilitada
      }
    });
  } catch (error) {
    console.error('🚨 Error en getConfiguracionUnificada:', error);
    res.status(500).json({ success: false, error: 'Error al obtener la configuración omnicanal.' });
  }
};

exports.actualizarConfiguracionUnificada = async (req, res) => {
  try {
    const empresa_id = req.empresa_id;
    const data = req.body;

    // 🔒 Si una llave llega enmascarada ("AIza...xK9d"), se conserva la que ya está guardada
    const iaActual = (await db.query('SELECT api_key_gemini, api_key_openai, api_key_claude FROM ia_configuracion WHERE empresa_id = $1', [empresa_id])).rows[0] || {};
    const waActual = (await db.query('SELECT meta_api_token, dialog360_token FROM whatsapp_configuraciones WHERE empresa_id = $1', [empresa_id])).rows[0] || {};
    data.api_key_gemini = resolverSecreto(data.api_key_gemini, iaActual.api_key_gemini);
    data.api_key_openai = resolverSecreto(data.api_key_openai, iaActual.api_key_openai);
    data.api_key_claude = resolverSecreto(data.api_key_claude, iaActual.api_key_claude);
    if (data.whatsapp) {
      data.whatsapp.meta_api_token = resolverSecreto(data.whatsapp.meta_api_token, waActual.meta_api_token);
      data.whatsapp.dialog360_token = resolverSecreto(data.whatsapp.dialog360_token, waActual.dialog360_token);
    }

    // Actualizar IA (las propiedades vienen en el primer nivel del body)
    await db.query(`
      UPDATE ia_configuracion 
      SET modulo_activo = $1, tier_premium = $2, proveedor_activo = $3, 
          api_key_gemini = $4, api_key_openai = $5, api_key_claude = $6, 
          gemini_habilitado = $7, openai_habilitado = $8, claude_habilitado = $9,
          imagen_proveedor = $10, kiosco_ia_activo = $12
      WHERE empresa_id = $11
    `, [
      data.modulo_activo, data.tier_premium, data.proveedor_activo,
      data.api_key_gemini, data.api_key_openai, data.api_key_claude,
      data.gemini_habilitado, data.openai_habilitado, data.claude_habilitado,
      data.imagen_proveedor || 'ninguno',
      empresa_id,
      data.kiosco_ia_activo || false
    ]);

    // Actualizar WhatsApp (vienen dentro de data.whatsapp)
    if (data.whatsapp) {
      await db.query(`
        UPDATE whatsapp_configuraciones 
        SET proveedor = $1, meta_api_token = $2, meta_phone_id = $3, 
            ia_habilitada = $4, dialog360_token = $6
        WHERE empresa_id = $5
      `, [
        data.whatsapp.proveedor, data.whatsapp.meta_api_token, data.whatsapp.meta_phone_id,
        data.whatsapp.ia_habilitada || false,
        empresa_id,
        data.whatsapp.dialog360_token || ''
      ]);
    }

    res.json({ success: true, mensaje: 'Ajustes guardados correctamente.' });
  } catch (error) {
    console.error('🚨 Error en actualizarConfiguracionUnificada:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar la configuración.' });
  }
};

// Endpoint público para el Kiosco
exports.getStatusPublico = async (req, res) => {
  try {
    const empresa_id = req.empresa_id;
    const result = await db.query('SELECT tier_premium, kiosco_ia_activo FROM ia_configuracion WHERE empresa_id = $1', [empresa_id]);
    
    if (result.rows.length > 0) {
      const premium = result.rows[0].tier_premium === true;
      res.json({ 
        success: true, 
        tier_premium: premium,
        kiosco_ia_activo: premium && result.rows[0].kiosco_ia_activo === true
      });
    } else {
      res.json({ success: true, tier_premium: false, kiosco_ia_activo: false });
    }
  } catch (error) {
    console.error('🚨 Error en getStatusPublico:', error);
    res.status(500).json({ success: false, tier_premium: false, kiosco_ia_activo: false });
  }
};