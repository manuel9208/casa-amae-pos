// BackEnd/utils/sanitizarCliente.js
// =========================================================================
// 🔒 Quita credenciales de las filas que salen en respuestas PÚBLICAS
// (identificar, login con huella). Devuelve una copia: no muta la fila original.
// =========================================================================
const CAMPOS_CLIENTE = ['nip', 'codigo_verificacion', 'codigo_verificacion_expira'];
const CAMPOS_EMPLEADO_PRELOGIN = ['password', 'pin', 'nfc_uid'];

const quitarCampos = (fila, campos) => {
  if (!fila || typeof fila !== 'object') return fila;
  const copia = { ...fila };
  campos.forEach(c => { delete copia[c]; });
  return copia;
};

exports.sanitizarCliente = (cliente) => quitarCampos(cliente, CAMPOS_CLIENTE);
exports.sanitizarEmpleadoPreLogin = (usuario) => quitarCampos(usuario, CAMPOS_EMPLEADO_PRELOGIN);