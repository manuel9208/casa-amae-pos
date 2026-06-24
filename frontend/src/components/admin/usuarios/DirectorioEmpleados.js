import React, { useState } from 'react';
import { Trash2, Edit, LogOut, Search, Filter } from 'lucide-react';  

const DirectorioEmpleados = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm, user }) => {
  // ==========================================
  // ESTADOS DE EDICIÓN DE USUARIO
  // ==========================================
  const [editandoUsuarioId, setEditandoUsuarioId] = useState(null);
  const [uNombre, setUNombre] = useState('');
  const [uUser, setUUser] = useState('');
  const [uPass, setUPass] = useState('');
  const [uTelefono, setUTelefono] = useState('');
  const [uRol, setURol] = useState('admin');
  const [uPin, setUPin] = useState('');  

  // Estados para Filtros de Búsqueda
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // Añadidas las llaves de acceso a Pantallas
  const [uPermisos, setUPermisos] = useState({
    pantalla_admin: true, pantalla_caja: true, pantalla_cocina: true, pantalla_repartidor: true,
    menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false, clientes: false, finanzas: false,
    corte_caja: false, cancelar_pedidos: false, compras_rapidas: false, promociones: false, mesas: false
  });  

  // Escudo de seguridad para evitar corrupción del estado de permisos
  const asegurarObjeto = (permisos) => {
    let permsFinales = {
      pantalla_admin: false, pantalla_caja: false, pantalla_cocina: false, pantalla_repartidor: false,
      menu: false, inventario: false, catalogos: false, usuarios: false, configuracion: false, clientes: false, finanzas: false,
      corte_caja: false, cancelar_pedidos: false, compras_rapidas: false, promociones: false, mesas: false
    };

    if (!permisos) return permsFinales;
    
    if (typeof permisos === 'string') {
      try {
        const parseado = JSON.parse(permisos);
        return { ...permsFinales, ...parseado };
      } catch (e) {
        return permsFinales;
      }
    }
    
    return { ...permsFinales, ...permisos };
  };

  // ==========================================
  // MANEJO DE FORMULARIO
  // ==========================================
  const prepararEdicionUsuario = (u) => {
    setEditandoUsuarioId(u.id);
    setUNombre(u.nombre);
    setUUser(u.usuario);
    setUPass('');
    setUTelefono(u.telefono || '');
    setUPin(u.pin || '');
    setURol(u.rol);
    setUPermisos(asegurarObjeto(u.permisos));  
  };  

  const cancelarEdicionUsuario = () => {
    setEditandoUsuarioId(null);
    setUNombre(''); 
    setUUser(''); 
    setUPass(''); 
    setUTelefono(''); 
    setUPin(''); 
    setURol(isGlobalAdmin ? 'admin' : 'gerente');
    
    setUPermisos({
      pantalla_admin: true, pantalla_caja: true, pantalla_cocina: true, pantalla_repartidor: true,
      menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false, clientes: false, finanzas: false,
      corte_caja: false, cancelar_pedidos: false, compras_rapidas: false, promociones: false, mesas: false
    });
  };  

  const handleRolChange = (e) => {
    const nuevoRol = e.target.value;
    setURol(nuevoRol);  

    let perms = {
      pantalla_admin: false, pantalla_caja: false, pantalla_cocina: false, pantalla_repartidor: false,
      menu: false, inventario: false, catalogos: false, usuarios: false, configuracion: false, clientes: false, finanzas: false,
      corte_caja: false, cancelar_pedidos: false, compras_rapidas: false, promociones: false, mesas: false
    };  

    if (nuevoRol === 'tv') {
      const uniqueId = Math.floor(1000 + Math.random() * 9000);
      setUNombre(`Pantalla TV ${uniqueId}`);
      setUUser(`tv_${uniqueId}`);
      setUPass('1234');
      setUTelefono(`999${uniqueId}000`);
      setUPin('');
    } else if (nuevoRol === 'ayudante_cocina') {
      const uniqueId = Math.floor(100 + Math.random() * 900);
      setUNombre(''); 
      setUUser(`ayudante_${uniqueId}`); 
      setUPass('0000'); 
      setUTelefono(''); 
      setUPin('');
    } 

    // Pre-cargamos llaves de pantalla según el rol
    if (nuevoRol === 'admin') {
      perms.pantalla_admin = true; perms.pantalla_caja = true; perms.pantalla_cocina = true; perms.pantalla_repartidor = true;
      perms.menu = true; perms.inventario = true; perms.catalogos = true; perms.promociones = true; perms.mesas = true;
    } else if (nuevoRol === 'gerente') {
      perms.pantalla_admin = false; perms.pantalla_caja = true; perms.pantalla_cocina = true; perms.pantalla_repartidor = false;
      perms.corte_caja = true; perms.cancelar_pedidos = true; perms.compras_rapidas = true;
    } else if (nuevoRol === 'jefe') {
      perms.pantalla_caja = true; perms.pantalla_cocina = true; perms.pantalla_repartidor = false;
      perms.corte_caja = true; perms.cancelar_pedidos = true; perms.compras_rapidas = true;
    } else if (nuevoRol === 'cajero') {
      perms.pantalla_caja = true; perms.corte_caja = true;
    } else if (nuevoRol === 'cocina') {
      perms.pantalla_cocina = true;
    } else if (nuevoRol === 'repartidor') {
      perms.pantalla_repartidor = true;
    }

    setUPermisos(perms);
  };  

  const guardarUsuario = async (e) => {
    e.preventDefault();  
    if (uRol !== 'tv' && (!uTelefono || uTelefono.length !== 10)) {
      return showAlert("Atención", "El número celular es obligatorio y debe contener exactamente 10 dígitos numéricos.", "info");
    }  
    if (uRol !== 'tv' && (!uPin || uPin.length !== 4)) {
      return showAlert("Atención", "El PIN de seguridad debe contener exactamente 4 dígitos numéricos.", "info");
    }

    try {
      const url = editandoUsuarioId ? `${apiUrl}/usuarios/${editandoUsuarioId}` : `${apiUrl}/usuarios`;
      const method = editandoUsuarioId ? 'PUT' : 'POST';
      const bodyPayload = {
        nombre: uNombre, usuario: uUser, rol: uRol, permisos: uPermisos, telefono: uTelefono, pin: uPin
      };
      if (uPass) bodyPayload.password = uPass;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("¡Éxito!", editandoUsuarioId ? "Usuario actualizado." : "Usuario creado exitosamente.", "success");
        cancelarEdicionUsuario();
        refrescarDatos();
      } else {
        showAlert("Error", data.error || "No se pudo guardar el usuario.", "error");
      }
    } catch (error) {
      showAlert("Error", "Error al conectar con el servidor.", "error");
    }
  };  

  const eliminarUsuario = (id) => {
    showConfirm("Eliminar Empleado", "¿Estás seguro de que deseas eliminar este empleado? Perderá acceso inmediatamente.", async () => {
      try {
        const res = await fetch(`${apiUrl}/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert("Eliminado", "Empleado borrado correctamente.", "success");
          refrescarDatos();
        } else {
          showAlert("Error", "No se pudo eliminar al empleado.", "error");
        }
      } catch (error) {
        showAlert("Error", "Error al conectar con el servidor.", "error");
      }
    });
  };  

  // Función para forzar cierre de sesión remoto
  const cerrarSesionRemota = (u) => {
    showConfirm("Cerrar Sesión Remota", `¿Estás seguro de forzar el cierre de sesión de ${u.nombre}? Esto lo expulsará de cualquier equipo donde haya dejado su cuenta abierta.`, async () => {
      try {
        const res = await fetch(`${apiUrl}/usuarios/${u.id}/forzar-logout`, { method: 'POST' });
        if (res.ok) {
          showAlert("Sesión Cerrada", `Se cerraron todas las sesiones activas de ${u.nombre}.`, "success");
        } else {
          showAlert("Error", "No se pudo procesar la solicitud.", "error");
        }
      } catch(e) {
        showAlert("Error", "Error de conexión.", "error");
      }
    });
  };

  // ==========================================
  // REGLAS DE NEGOCIO Y VISIBILIDAD DE BLOQUES
  // ==========================================
  const isGlobalAdmin = user?.usuario === 'admin';

  // Lógica de visualización de Bloques de Permisos en Cascada
  const showPantallasBlock = ['admin', 'gerente', 'jefe'].includes(uRol);
  const showPOSBlock = (showPantallasBlock && uPermisos.pantalla_caja) || ['cajero', 'cocina', 'gerente', 'jefe'].includes(uRol);
  const showWebBlock = ['admin', 'gerente'].includes(uRol) && uPermisos.pantalla_admin;

  // 👇 NUEVO: Diccionario para ordenar la plantilla por jerarquía de rol
  const ordenRoles = {
    admin: 1,
    gerente: 2,
    jefe: 3,
    cajero: 4,
    cocina: 5,
    repartidor: 6,
    ayudante_cocina: 7,
    tv: 8
  };

  // Lógica de filtrado y ordenamiento para la tabla visual
  const plantillaVisible = usuariosDB.filter(u => {
    if (u.nombre === 'Administrador Global') return false;
    
    // Un gerente no puede ver a los admins
    if (!isGlobalAdmin && u.rol === 'admin') return false;

    // Filtros de búsqueda (Nombre, Usuario, Teléfono y Rol)
    if (filtroRol && u.rol !== filtroRol) return false;
    if (filtroTexto) {
      const txt = filtroTexto.toLowerCase();
      const nom = (u.nombre || '').toLowerCase();
      const usu = (u.usuario || '').toLowerCase();
      const tel = (u.telefono || '').toString();
      if (!nom.includes(txt) && !usu.includes(txt) && !tel.includes(txt)) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    // 👇 Aplicamos el orden jerárquico
    const prioridadA = ordenRoles[a.rol] || 99;
    const prioridadB = ordenRoles[b.rol] || 99;
    return prioridadA - prioridadB;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
      
      {/* ======================= COLUMNA IZQUIERDA: FORMULARIO ======================= */}
      <div className="lg:col-span-1">
        <form onSubmit={guardarUsuario} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 space-y-5 sticky top-8">
          <h3 className="text-xl font-bold mb-4 text-slate-700">{editandoUsuarioId ? '✏️ Editar Empleado' : '➕ Nuevo Empleado'}</h3>  
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Nombre Completo *</label>
              <input type="text" required value={uNombre} onChange={e => setUNombre(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Usuario de Acceso *</label>
              <input type="text" required value={uUser} onChange={e => setUUser(e.target.value.replace(/\s+/g, '').toLowerCase())} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" placeholder="Ej. juan123" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">{editandoUsuarioId ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso *'}</label>
              <input type="password" required={!editandoUsuarioId && uRol !== 'ayudante_cocina' && uRol !== 'tv'} value={uPass} onChange={e => setUPass(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Teléfono (10 Días) *</label>
                <input type="tel" maxLength="10" required={uRol !== 'tv'} value={uTelefono} onChange={e => setUTelefono(e.target.value.replace(/\D/g, ''))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 tracking-wider" placeholder="0000000000" />
              </div>
              <div>
                <label className="text-xs font-black text-emerald-500 block mb-1 uppercase">PIN Seguridad *</label>
                <input type="text" maxLength="4" required={uRol !== 'tv'} value={uPin} onChange={e => setUPin(e.target.value.replace(/\D/g, ''))} className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none font-black text-emerald-700 tracking-[0.5em] text-center" placeholder="Ej. 1234" />
              </div>
            </div>
          </div>  

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Puesto o Rol asignado</label>
            <select value={uRol} onChange={handleRolChange} className="w-full p-3 bg-slate-100 border border-slate-300 rounded-xl outline-none font-black text-slate-800 cursor-pointer shadow-sm">
              {isGlobalAdmin && (
                <option value="admin">Administrador (Acceso Web Personalizable)</option>
              )}
              <option value="gerente">👔 Gerente de Sucursal</option>
              <option value="jefe">⭐ Jefe de Turno</option>
              <option value="cocina">👨‍🍳 Chef Principal (Inicio de Sesión KDS)</option>
              <option value="cajero">💵 Cajero (Caja Principal)</option>
              <option value="repartidor">🛵 Repartidor (Entregas Domicilio)</option>
              <option value="ayudante_cocina">🔪 Ayudante de Cocina (Sub-Perfil KDS)</option>
              <option value="tv">📺 Pantalla TV (KDS Cliente)</option>
            </select>
          </div>  

          {/* BLOQUE: ACCESO A PANTALLAS (La llave de las puertas) */}
          {showPantallasBlock && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 space-y-3 animate-in fade-in">
              <p className="text-xs font-black text-indigo-600 mb-2 uppercase tracking-widest">Acceso a Pantallas</p>
              
              {/* Jefe de turno no puede ver la opción de acceder al panel Admin */}
              {['admin', 'gerente'].includes(uRol) && (
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={uPermisos.pantalla_admin === true} onChange={e => setUPermisos({...uPermisos, pantalla_admin: e.target.checked})} className="accent-indigo-600 w-5 h-5" />
                  🖥️ Panel de Administración (Web)
                </label>
              )}
              
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.pantalla_caja === true} onChange={e => setUPermisos({...uPermisos, pantalla_caja: e.target.checked})} className="accent-indigo-600 w-5 h-5" />
                💵 Caja Principal (POS)
              </label>
              
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.pantalla_cocina === true} onChange={e => setUPermisos({...uPermisos, pantalla_cocina: e.target.checked})} className="accent-indigo-600 w-5 h-5" />
                👨‍🍳 Cocina (KDS)
              </label>
              
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.pantalla_repartidor === true} onChange={e => setUPermisos({...uPermisos, pantalla_repartidor: e.target.checked})} className="accent-indigo-600 w-5 h-5" />
                🛵 Logística de Reparto
              </label>
            </div>
          )}

          {/* PERMISOS ESPECIALES DE POS (CAJA) */}
          {showPOSBlock && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3 animate-in fade-in">
              <p className="text-xs font-black text-blue-600 mb-2 uppercase tracking-widest">Permisos Operativos (POS)</p>  
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.corte_caja === true} onChange={e => setUPermisos({...uPermisos, corte_caja: e.target.checked})} className="accent-blue-600 w-5 h-5" />
                Puede realizar el Corte de Caja
              </label>  
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.cancelar_pedidos === true} onChange={e => setUPermisos({...uPermisos, cancelar_pedidos: e.target.checked})} className="accent-red-500 w-5 h-5" />
                Puede Cancelar / Rechazar Pedidos
              </label>  
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.compras_rapidas === true} onChange={e => setUPermisos({...uPermisos, compras_rapidas: e.target.checked})} className="accent-emerald-500 w-5 h-5" />
                Puede registrar Compras Rápidas
              </label>
            </div>
          )}  

          {/* PERMISOS DE ACCESO WEB (MÓDULOS DEL ADMIN) */}
          {showWebBlock && (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3 animate-in fade-in">
              <p className="text-xs font-black text-orange-600 mb-2 uppercase tracking-widest">Permisos de Módulos (Acceso Web)</p>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.finanzas === true} onChange={e => setUPermisos({...uPermisos, finanzas: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Finanzas y Reportes
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.menu !== false} onChange={e => setUPermisos({...uPermisos, menu: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Gestión de Menú
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.inventario !== false} onChange={e => setUPermisos({...uPermisos, inventario: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Inventario & Recetas
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.catalogos !== false} onChange={e => setUPermisos({...uPermisos, catalogos: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Ingredientes y Extras
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.clientes === true} onChange={e => setUPermisos({...uPermisos, clientes: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Clientes (CRM)
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.promociones === true} onChange={e => setUPermisos({...uPermisos, promociones: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Promociones y Marketing
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={uPermisos.mesas === true} onChange={e => setUPermisos({...uPermisos, mesas: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Gestión de Mesas y QR
              </label>

              <div className="border-t border-orange-200 my-2"></div>
              <label className="flex items-center gap-3 text-sm font-black text-orange-800 cursor-pointer">
                <input type="checkbox" checked={uPermisos.usuarios === true} onChange={e => setUPermisos({...uPermisos, usuarios: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Acceso a Usuarios
              </label>
              <label className="flex items-center gap-3 text-sm font-black text-orange-800 cursor-pointer">
                <input type="checkbox" checked={uPermisos.configuracion === true} onChange={e => setUPermisos({...uPermisos, configuracion: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Acceso a Configuración
              </label>
            </div>
          )}  

          <div className="flex flex-col md:flex-row gap-4 pt-2">
            {editandoUsuarioId && (
              <button type="button" onClick={cancelarEdicionUsuario} className="w-full md:w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 p-4 rounded-xl font-bold transition">Cancelar</button>
            )}
            <button type="submit" className={`flex-1 text-white p-4 rounded-xl font-black shadow-lg transition active:scale-95 ${editandoUsuarioId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editandoUsuarioId ? 'Actualizar Usuario' : 'Crear Empleado'}
            </button>
          </div>
        </form>
      </div>  

      {/* ======================= COLUMNA DERECHA: PLANTILLA ======================= */}
      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-slate-700">Plantilla Registrada</h3>
            
            {/* Filtros de Búsqueda */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar empleado..." 
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-blue-400"
                />
              </div>
              <div className="relative w-full sm:w-40 shrink-0">
                <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select 
                  value={filtroRol} 
                  onChange={(e) => setFiltroRol(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 cursor-pointer focus:border-blue-400 appearance-none"
                >
                  <option value="">Todos los roles</option>
                  <option value="admin">Administradores</option>
                  <option value="gerente">Gerentes</option>
                  <option value="jefe">Jefes de Turno</option>
                  <option value="cajero">Cajeros</option>
                  <option value="cocina">Cocineros</option>
                  <option value="repartidor">Repartidores</option>
                  <option value="ayudante_cocina">Ayudantes</option>
                  <option value="tv">Pantallas TV</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {plantillaVisible.map(u => (
              <div key={u.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition gap-4 ${editandoUsuarioId === u.id ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                <div>
                  <p className="font-bold text-lg text-slate-800 flex flex-wrap items-center gap-2">
                    {u.nombre}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                      u.rol==='admin' ? 'bg-purple-100 text-purple-700' :
                      u.rol==='gerente' ? 'bg-indigo-100 text-indigo-700' :
                      u.rol==='jefe' ? 'bg-amber-100 text-amber-700' :
                      u.rol==='cocina' ? 'bg-orange-100 text-orange-700' :
                      u.rol==='ayudante_cocina' ? 'bg-orange-50 text-orange-500' :
                      u.rol==='repartidor' ? 'bg-teal-100 text-teal-700' :
                      u.rol==='tv' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.rol === 'tv' ? '📺 TV KDS' : u.rol === 'ayudante_cocina' ? '🔪 Ayudante' : u.rol === 'repartidor' ? '🛵 Repartidor' : u.rol === 'jefe' ? '⭐ Jefe de Turno' : u.rol === 'gerente' ? '👔 Gerente' : u.rol === 'admin' ? '👑 Admin' : u.rol}
                    </span>
                  </p>  
                  <div className="mt-1 space-y-0.5 flex items-center gap-4 flex-wrap">
                    <p className="text-sm text-slate-600 font-bold">Usuario: <span className="text-slate-800">{u.usuario}</span></p>
                    <p className="text-sm text-slate-600 font-bold">Tel: <span className="text-blue-600 font-black">{u.telefono || '--'}</span></p>
                    {u.pin && <p className="text-sm text-slate-600 font-bold">PIN: <span className="text-emerald-600 font-black tracking-widest">{u.pin}</span></p>}  
                  </div>
                </div>  
                
                <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                  {/* Botón: Forzar Cierre de Sesión Remoto */}
                  {u.rol !== 'tv' && (
                    <button onClick={() => cerrarSesionRemota(u)} title={`Cerrar sesión remota de ${u.nombre}`} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition bg-white border border-slate-200 shadow-sm flex justify-center">
                      <LogOut size={20}/>
                    </button>
                  )}
                  <button onClick={() => prepararEdicionUsuario(u)} className="p-3 text-blue-500 hover:text-white hover:bg-blue-500 rounded-xl transition bg-white border border-slate-100 shadow-sm flex justify-center"><Edit size={20}/></button>
                  <button onClick={() => eliminarUsuario(u.id)} className="p-3 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition bg-white border border-red-100 shadow-sm flex justify-center"><Trash2 size={20}/></button>
                </div>
              </div>
            ))}  
            
            {plantillaVisible.length === 0 && (
              <div className="text-center text-slate-400 font-bold mt-10 p-10 border-2 border-dashed border-slate-200 rounded-3xl">
                <Search size={40} className="mx-auto mb-3 opacity-20"/>
                <p>No se encontraron empleados con esos filtros.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};  

export default DirectorioEmpleados;