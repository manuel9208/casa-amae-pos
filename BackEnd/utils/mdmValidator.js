const db = require('../config/db');

// =========================================================================
// MAPA DE SEGURIDAD: Pantallas que cada rol puede tener como máximo.
// Replica el mismo criterio de permisos por defecto usado en
// DirectorioEmpleados.js (handleRolChange), para que, aunque la configuración
// guardada en BD esté corrupta o mal formada, nunca se le otorgue a un rol
// una pantalla que jamás le correspondería (ej. "cocina" a un cajero).
// =========================================================================
const PANTALLAS_POR_ROL = {
  admin: ['admin', 'caja', 'cocina', 'repartidor', 'empleado'],
  gerente: ['admin', 'caja', 'cocina', 'empleado'],
  jefe: ['caja', 'cocina', 'empleado'],
  cajero: ['caja', 'empleado'],
  cocina: ['cocina', 'empleado'],
  repartidor: ['repartidor', 'empleado'],
  ayudante_cocina: ['empleado'],
};

// =========================================================================
// VALIDADOR CENTRAL DE ACCESO MDM (Compartido por authController.js y
// huellasController.js para cumplir el principio DRY).
//
// Devuelve SIEMPRE un objeto plano, nunca lanza un res.status(403) por sí
// mismo — eso lo decide el controlador que lo invoque:
//
//   { bloqueadoTotal: boolean, motivoBloqueo?: string, pantallasPermitidas: 'todas' | string[] }
//
// REGLAS:
// 1) Admin Global (usuario === 'admin') -> siempre exento, acceso total.
// 2) MDM apagado -> acceso total para todos.
// 3) Equipo OFICIAL (device_id está en equipos_autorizados) -> manda SIEMPRE
//    su propia matriz de roles_permitidos, sin importar el "Bloqueo estricto"
//    de abajo. Si el rol no está autorizado en ese equipo -> bloqueadoTotal.
// 4) Equipo FORÁNEO (no registrado) -> YA NO se bloquea el login. Si el rol
//    del usuario está marcado en roles_restringidos, solo se le conceden las
//    pantallas de su "pantallas_excepcion" (con 'empleado' siempre incluido).
//    Si el rol no está en roles_restringidos -> acceso total, sin excepción.
// =========================================================================
exports.validarAccesoMDM = async (user, dispositivo_id) => {
  // 1) Admin Global: inmune a cualquier regla MDM.
  if (!user || user.usuario === 'admin') {
    return { bloqueadoTotal: false, pantallasPermitidas: 'todas' };
  }

  try {
    const confMdm = await db.query(
      'SELECT control_dispositivos_activo, roles_restringidos FROM configuracion_biometria WHERE id = 1'
    );

    // 2) MDM apagado -> libre para todos.
    if (confMdm.rows.length === 0 || !confMdm.rows[0].control_dispositivos_activo) {
      return { bloqueadoTotal: false, pantallasPermitidas: 'todas' };
    }

    // 3) VALIDACIÓN DE EQUIPO OFICIAL (independiente del bloqueo estricto por rol).
    const equipoAuth = await db.query(
      'SELECT id, alias, roles_permitidos FROM equipos_autorizados WHERE device_id = $1',
      [dispositivo_id]
    );

    if (equipoAuth.rows.length > 0) {
      const rolesPermitidos = equipoAuth.rows[0].roles_permitidos || [];

      if (!rolesPermitidos.includes(user.rol)) {
        return {
          bloqueadoTotal: true,
          motivoBloqueo: `Esta máquina (${equipoAuth.rows[0].alias}) no está autorizada para el rol de ${String(user.rol).toUpperCase()}.`
        };
      }

      // Equipo oficial y rol autorizado en él: el login procede sin restricción.
      // El filtrado fino de qué pantallas se ven EN ESE equipo lo sigue resolviendo
      // App.js con el campo pantallas_permitidas del propio equipo (sin cambios).
      return { bloqueadoTotal: false, pantallasPermitidas: 'todas' };
    }

    // 4) EQUIPO FORÁNEO (no registrado): aquí aplica el "Bloqueo estricto por rol".
    const rolesRestringidos = confMdm.rows[0].roles_restringidos || [];
    const reglaRol = Array.isArray(rolesRestringidos)
      ? rolesRestringidos.find(r => r && r.rol === user.rol)
      : null;

    // El rol no está marcado en el bloqueo estricto -> acceso libre total.
    if (!reglaRol) {
      return { bloqueadoTotal: false, pantallasPermitidas: 'todas' };
    }

    const pantallasExcepcion = Array.isArray(reglaRol.pantallas_excepcion)
      ? reglaRol.pantallas_excepcion
      : [];

    // 'empleado' (Portal del Empleado) es innegociable: siempre disponible,
    // aunque no venga incluido en lo guardado.
    const pantallasSolicitadas = Array.from(new Set(['empleado', ...pantallasExcepcion]));

    // Capa de seguridad extra: nunca se concede una pantalla que el rol no
    // tendría por defecto (ej. no dar "cocina" a un cajero aunque la BD
    // tuviera un dato mal guardado).
    const pantallasPermitidasRol = PANTALLAS_POR_ROL[user.rol] || ['empleado'];
    const pantallasFinal = pantallasSolicitadas.filter(p => pantallasPermitidasRol.includes(p));

    return {
      bloqueadoTotal: false,
      pantallasPermitidas: pantallasFinal.length > 0 ? pantallasFinal : ['empleado']
    };

  } catch (error) {
    console.error('🚨 Error en validarAccesoMDM:', error);
    // Fail-open: ante un error inesperado de BD no se bloquea a todo el
    // personal, se deja pasar para no frenar la operación del negocio.
    return { bloqueadoTotal: false, pantallasPermitidas: 'todas' };
  }
};