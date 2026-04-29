import React, { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';

const GestionUsuarios = ({
  // Props recibidas desde AdminPanel
  usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  
  // === ESTADOS LOCALES PARA EL FORMULARIO ===
  const [editandoUsuarioId, setEditandoUsuarioId] = useState(null);
  const [uNombre, setUNombre] = useState('');
  const [uUser, setUUser] = useState('');
  const [uPass, setUPass] = useState('');
  const [uTelefono, setUTelefono] = useState('');
  const [uRol, setURol] = useState('cajero');
  const [uPermisos, setUPermisos] = useState({ 
    menu: true, 
    inventario: true, 
    catalogos: true, 
    usuarios: false, 
    configuracion: false 
  });

  // === LÓGICA DE EDICIÓN Y LIMPIEZA ===
  const prepararEdicionUsuario = (u) => {
    setEditandoUsuarioId(u.id); 
    setUNombre(u.nombre); 
    setUUser(u.usuario); 
    setUPass(''); 
    setUTelefono(u.telefono || ''); 
    setURol(u.rol);
    setUPermisos(u.permisos || { menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
  };

  const cancelarEdicionUsuario = () => {
    setEditandoUsuarioId(null); 
    setUNombre(''); 
    setUUser(''); 
    setUPass(''); 
    setUTelefono(''); 
    setURol('cajero');
    setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
  };

  // Lógica especial para roles (como el de TV que es automático)
  const handleRolChange = (e) => { 
    const nuevoRol = e.target.value; 
    setURol(nuevoRol); 
    if (nuevoRol === 'tv') { 
      const uniqueId = Math.floor(1000 + Math.random() * 9000); 
      setUNombre(`Pantalla TV ${uniqueId}`); 
      setUUser(`tv_${uniqueId}`); 
      setUPass('1234'); 
      setUTelefono(`999${uniqueId}000`); 
      setUPermisos({ menu: false, inventario: false, catalogos: false, usuarios: false, configuracion: false });
    } else if (nuevoRol === 'admin') {
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono('');
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: true, configuracion: true });
    } else { 
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono(''); 
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
    } 
  };

  // === LÓGICA DE GUARDADO ===
  const guardarUsuario = async (e) => { 
    e.preventDefault(); 
    if(uTelefono.length !== 10) return showAlert("Atención", "El teléfono debe tener exactamente 10 dígitos.", "info"); 
    
    const payload = { 
      nombre: uNombre, 
      usuario: uUser, 
      rol: uRol, 
      permisos: uPermisos, 
      telefono: uTelefono 
    };
    if (uPass) payload.password = uPass; 
    
    try { 
      const url = editandoUsuarioId ? `${apiUrl}/usuarios/${editandoUsuarioId}` : `${apiUrl}/usuarios`;
      const res = await fetch(url, { 
        method: editandoUsuarioId ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      }); 
      
      if (res.ok) { 
          showAlert("¡Excelente!", editandoUsuarioId ? "Información del empleado actualizada." : "Nuevo empleado registrado con éxito.", "success"); 
          cancelarEdicionUsuario(); 
          refrescarDatos(); 
      } else {
          const dataErr = await res.json();
          showAlert("Atención", dataErr.error || "El usuario o teléfono ya existe. Intenta con datos diferentes.", "warning");
      }
    } catch (error) { 
      showAlert("Error", "Error de conexión al guardar el usuario.", "error"); 
    } 
  };
  
  // === LÓGICA DE ELIMINACIÓN ===
  const eliminarUsuario = (id) => { 
    showConfirm("Eliminar Empleado", "¿Estás seguro que deseas dar de baja a este empleado? Perderá el acceso al sistema inmediatamente.", async () => { 
      try {
        const res = await fetch(`${apiUrl}/usuarios/${id}`, { method: 'DELETE' }); 
        if (res.ok) {
          showAlert("Usuario Eliminado", "El empleado ha sido borrado de la plantilla.", "success");
          refrescarDatos(); 
        }
      } catch (error) {
        showAlert("Error", "No se pudo realizar la eliminación.", "error");
      }
    }); 
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <h2 className="text-3xl font-black mb-6 text-slate-800">Gestión de Empleados</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA FORMULARIO */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 lg:col-span-1 h-fit">
          {editandoUsuarioId && (
            <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest w-fit mb-4">Editando Empleado</div>
          )}
          <h3 className="text-xl font-bold mb-4 text-slate-700">{editandoUsuarioId ? 'Actualizar Información' : 'Nuevo Empleado'}</h3>
          
          <form onSubmit={guardarUsuario} className="space-y-4">
            <input required placeholder="Nombre (Ej. Juan Pérez)" value={uNombre} onChange={e => setUNombre(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
            <input required placeholder="Usuario para acceder" value={uUser} onChange={e => setUUser(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
            <input required={!editandoUsuarioId} type="text" placeholder={editandoUsuarioId ? "Nueva contraseña (Opcional)" : "Contraseña"} value={uPass} onChange={e => setUPass(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" title={editandoUsuarioId ? "Déjalo en blanco si no quieres cambiar la contraseña actual" : ""} />
            <input required type="tel" maxLength="10" placeholder="Número Celular (10 dígitos)" value={uTelefono} onChange={e => setUTelefono(e.target.value.replace(/\D/g, ''))} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
            
            <select value={uRol} onChange={handleRolChange} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl outline-none font-black text-blue-900 cursor-pointer shadow-sm">
              <option value="cajero">Cajero (Caja)</option>
              <option value="cocina">Chef (Cocina/Barra)</option>
              <option value="admin">Administrador</option>
              <option value="tv">📺 Pantalla TV (KDS Cliente)</option>
            </select>
            
            {uRol === 'admin' && (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
                <p className="text-xs font-black text-orange-600 mb-2 uppercase tracking-widest">Permisos de Acceso (Admin)</p>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={uPermisos.menu !== false} onChange={e => setUPermisos({...uPermisos, menu: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Gestión de Menú
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={uPermisos.inventario !== false} onChange={e => setUPermisos({...uPermisos, inventario: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Inventario & Recetas
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={uPermisos.catalogos !== false} onChange={e => setUPermisos({...uPermisos, catalogos: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Ingredientes y Extras
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
              <button type="submit" className={`flex-1 text-white p-4 rounded-xl font-black shadow-lg transition active:scale-95 ${editandoUsuarioId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
                {editandoUsuarioId ? 'Actualizar Usuario' : 'Crear Empleado'}
              </button>
            </div>
          </form>
        </div>

        {/* COLUMNA LISTADO */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold mb-4 text-slate-700">Plantilla Registrada</h3>
            <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
              {usuariosDB.map(u => (
                <div key={u.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition gap-4 ${editandoUsuarioId === u.id ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                  <div>
                    <p className="font-bold text-lg text-slate-800 flex flex-wrap items-center gap-2">
                      {u.nombre} 
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${u.rol==='admin' ? 'bg-purple-100 text-purple-700' : u.rol==='cocina' ? 'bg-orange-100 text-orange-700' : u.rol==='tv' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {u.rol === 'tv' ? '📺 TV KDS' : u.rol}
                      </span>
                      {u.usuario === 'admin' && <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-md uppercase font-black tracking-widest">Admin Global</span>}
                    </p>
                    <p className="text-sm text-slate-500 font-medium mt-1">Usuario: <span className="font-bold text-slate-700">{u.usuario}</span> • Tel: <span className="font-bold text-slate-700">{u.telefono || 'N/A'}</span></p>
                  </div>
                  
                  {u.usuario !== 'admin' && (
                    <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                      <button onClick={() => prepararEdicionUsuario(u)} className="p-3 text-blue-500 hover:text-white hover:bg-blue-500 rounded-xl transition shadow-sm bg-white border border-slate-100 flex justify-center"><Edit size={20}/></button>
                      <button onClick={() => eliminarUsuario(u.id)} className="p-3 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition shadow-sm bg-white border border-slate-100 flex justify-center"><Trash2 size={20}/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GestionUsuarios;