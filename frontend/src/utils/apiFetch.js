// src/utils/apiFetch.js
// =========================================================================
// 🏢 ENVOLTORIO DE FETCH PARA MULTI-TENANT
// -------------------------------------------------------------------------
// Agrega automáticamente el header "X-Empresa-Slug" a cada petición, leído
// de la variable de entorno que set-cliente.js escribe en el .env.
// Esto es lo que resolveTenant.js (backend) exige en el Caso 2 (rutas
// públicas, sin sesión todavía: login, identificar, configuración inicial)
// cuando aún no existe un req.usuario con empresa_id.
//
// El slug SIEMPRE se fuerza (no se puede pisar desde el componente que
// llama), ya que es un dato crítico de aislamiento entre negocios.
// =========================================================================

const EMPRESA_SLUG = process.env.REACT_APP_EMPRESA_SLUG || '';

if (!EMPRESA_SLUG && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn(
    '[apiFetch] REACT_APP_EMPRESA_SLUG no está definido en el .env. ' +
    'Revisa que set-cliente.js se haya ejecutado correctamente para este cliente.'
  );
}

export const apiFetch = (url, options = {}) => {
  //console.log('🚩 [apiFetch] Llamando a:', url, 'método:', options.method || 'GET');
  const headers = new Headers(options.headers || {});
  headers.set('X-Empresa-Slug', EMPRESA_SLUG);
  return fetch(url, { ...options, headers })
    .then(res => {
      //console.log('🚩 [apiFetch] Respuesta de', url, '-> status:', res.status);
      return res;
    })
    .catch(err => {
      //console.error('🚩 [apiFetch] FALLÓ la petición a', url, err);
      throw err;
    });
};

export default apiFetch;