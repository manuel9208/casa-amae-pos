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
const CLAVE_TOKEN = 'pos_token_sesion';
const CLAVE_TOKEN_CLIENTE = 'pos_token_cliente';
const CLAVE_TOKEN_CANJE = 'pos_token_canje'; // 🎁 prueba de NIP/huella para canjear puntos (solo viaja en POST /pedidos)
// 🔐 El token del cliente solo viaja a las rutas que lo validan (chat IA, su propio registro/pedidos y recuperar NIP)
const RUTAS_CON_TOKEN_CLIENTE = /\/kiosco-chat-ia\/|\/clientes\/\d+(\/pedidos)?(\?|$)|\/clientes\/recuperar-nip$|\/huellas\/(generar|verificar)-registro$/;
const RUTAS_QUE_EMITEN_TOKEN_CLIENTE = /\/(identificar|clientes\/registro|huellas\/verificar-login)$/;

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
  const tokenSesion = localStorage.getItem(CLAVE_TOKEN);
  if (tokenSesion) headers.set('Authorization', `Bearer ${tokenSesion}`);
  const tokenCliente = localStorage.getItem(CLAVE_TOKEN_CLIENTE);
  if (tokenCliente && RUTAS_CON_TOKEN_CLIENTE.test(String(url))) headers.set('X-Cliente-Token', tokenCliente);
  const esCrearPedido = /\/pedidos$/.test(String(url)) && String(options.method || 'GET').toUpperCase() === 'POST';
  const tokenCanje = localStorage.getItem(CLAVE_TOKEN_CANJE);
  if (tokenCanje && esCrearPedido) headers.set('X-Canje-Token', tokenCanje);
  return fetch(url, { ...options, headers })
    .then(res => {
      //console.log('🚩 [apiFetch] Respuesta de', url, '-> status:', res.status);
      const ruta = String(url);
      if (res.ok && /\/(clientes\/verificar-nip|huellas\/verificar-login)$/.test(ruta)) {
        res.clone().json()
          .then(d => { if (d && d.token_canje) localStorage.setItem(CLAVE_TOKEN_CANJE, d.token_canje); })
          .catch(() => {});
      }
      if (res.ok && esCrearPedido) localStorage.removeItem(CLAVE_TOKEN_CANJE); // el canje vale para UN pedido
      if (res.ok && RUTAS_QUE_EMITEN_TOKEN_CLIENTE.test(ruta)) {
        res.clone().json()
          .then(d => { if (d && d.token_cliente) localStorage.setItem(CLAVE_TOKEN_CLIENTE, d.token_cliente); })
          .catch(() => {});
      }
      if (res.ok && /\/(login|huellas\/verificar-login)$/.test(ruta)) {
        res.clone().json()
          .then(d => { if (d && d.token) localStorage.setItem(CLAVE_TOKEN, d.token); })
          .catch(() => {});
      } else if (/\/logout$/.test(ruta)) {
        localStorage.removeItem(CLAVE_TOKEN);
        localStorage.removeItem(CLAVE_TOKEN_CLIENTE);
      }
      return res;
    })
    .catch(err => {
      //console.error('🚩 [apiFetch] FALLÓ la petición a', url, err);
      throw err;
    });
};

// =========================================================================
// 🔐 Helpers del token de cliente (solo lectura de `exp`/`cid`; la validez real la decide el servidor)
// =========================================================================
const MARGEN_RENOVACION_MS = 5 * 60 * 1000;
let renovacionEnCurso = null;                       // llamadas simultáneas comparten UNA sola petición
let ultimoIntentoRenovacion = 0;
const ESPERA_ENTRE_INTENTOS_MS = 60 * 1000;         // si falla, no reintenta en cada ciclo de 5 s

const leerPayloadToken = (token) => {
  try {
    return JSON.parse(atob(String(token || '').split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) {
    return null;
  }
};

export const limpiarTokenCliente = () => localStorage.removeItem(CLAVE_TOKEN_CLIENTE);

// Devuelve el token solo si es de ESTE cliente y no está por caducar (evita usar el de otra cuenta, p. ej. tras canje con huella ajena)
export const tokenClienteVigente = (clienteId) => {
  const token = localStorage.getItem(CLAVE_TOKEN_CLIENTE);
  const p = token ? leerPayloadToken(token) : null;
  return p && p.typ === 'cli' && Number(p.cid) === Number(clienteId) && p.exp - Date.now() > MARGEN_RENOVACION_MS ? token : null;
};

// Garantiza token para el cliente de la sesión restaurada (la sesión de 9 h vive en localStorage y puede no tener token).
// Misma garantía que el login original: teléfono. Si falla, el chat responde como invitado (no rompe nada).
export const asegurarTokenCliente = async (apiUrl, cliente) => {
  if (!cliente?.id || !cliente?.telefono) return false;
  const pSesion = leerPayloadToken(localStorage.getItem(CLAVE_TOKEN) || '');
  if (pSesion && pSesion.exp - Date.now() > 0) return true; // personal con sesión vigente (modo cajero): el servidor confía en su token
  if (tokenClienteVigente(cliente.id)) return true;
  if (renovacionEnCurso) return renovacionEnCurso;
  if (Date.now() - ultimoIntentoRenovacion < ESPERA_ENTRE_INTENTOS_MS) return false;
  ultimoIntentoRenovacion = Date.now();
  renovacionEnCurso = (async () => {
    try {
      const res = await apiFetch(`${apiUrl}/identificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: cliente.telefono })
      });
      const d = await res.json();
      if (res.ok && d && d.tipo === 'cliente' && d.token_cliente && Number(d.data?.id) === Number(cliente.id)) {
        localStorage.setItem(CLAVE_TOKEN_CLIENTE, d.token_cliente);
        return true;
      }
    } catch (e) { /* sin token: las rutas protegidas responderán 401 y el chat como invitado */ }
    return false;
  })().finally(() => { renovacionEnCurso = null; });
  return renovacionEnCurso;
};

export default apiFetch;