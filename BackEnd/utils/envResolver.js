// BackEnd/utils/envResolver.js
// =========================================================================
// 🔌 RESOLVER DE VARIABLES DE ENTORNO POR EMPRESA
// -------------------------------------------------------------------------
// Dado un empresa_id y una clave (ej. 'CLOUDINARY_API_KEY'), busca primero
// en empresas.variables (cifrado). Si la empresa no tiene esa variable
// configurada, cae automáticamente a process.env (configuración global del
// servidor) — así ninguna empresa que aún no haya migrado sus credenciales
// se queda sin servicio. Reutiliza cryptoHelper.js (misma ENV_VARIABLES_MASTER_KEY
// ya usada por el panel Admin Empresas).
// =========================================================================

const db = require('../config/db');
const { desencriptar } = require('./cryptoHelper');

// Cache simple en memoria (30s) para no pegarle a la BD en cada subida/login
const cache = new Map(); // empresa_id -> { data, expira }
const TTL_MS = 30000;

async function obtenerVariablesCrudasEmpresa(empresa_id) {
  const ahora = Date.now();
  const cacheado = cache.get(empresa_id);
  if (cacheado && cacheado.expira > ahora) return cacheado.data;

  const result = await db.query('SELECT variables FROM empresas WHERE id = $1', [empresa_id]);
  const data = result.rows[0]?.variables || {};
  cache.set(empresa_id, { data, expira: ahora + TTL_MS });
  return data;
}

// Llamar esto justo después de guardar variables nuevas en empresasController,
// para que el cambio se refleje de inmediato sin esperar el TTL del caché.
exports.invalidarCache = (empresa_id) => {
  cache.delete(empresa_id);
};

// Devuelve el valor real de una variable: primero la de la empresa, si no
// existe cae a la variable global del servidor (.env de Render/local).
exports.resolverVariable = async (empresa_id, clave) => {
  try {
    if (empresa_id) {
      const variables = await obtenerVariablesCrudasEmpresa(empresa_id);
      const valorCifrado = variables[clave];
      if (valorCifrado) {
        const valorPlano = desencriptar(valorCifrado);
        if (valorPlano) return valorPlano;
      }
    }
  } catch (error) {
    console.error(`🚨 [envResolver] Error resolviendo ${clave} para empresa ${empresa_id}:`, error.message);
  }
  return process.env[clave] || '';
};

// Atajo para resolver varias claves de una sola vez (ej. las 3 de Cloudinary)
exports.resolverVariables = async (empresa_id, claves = []) => {
  const resultado = {};
  for (const clave of claves) {
    resultado[clave] = await exports.resolverVariable(empresa_id, clave);
  }
  return resultado;
};