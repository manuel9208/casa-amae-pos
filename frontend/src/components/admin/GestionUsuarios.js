import React from 'react';
import { Trash2, Edit } from 'lucide-react';

const GestionUsuarios = ({
  usuariosDB,
  editandoUsuarioId,
  uNombre, setUNombre,
  uUser, setUUser,
  uPass, setUPass,
  uTelefono, setUTelefono,
  uRol, setURol,
  uPermisos, setUPermisos,
  guardarUsuario,
  prepararEdicionUsuario,
  cancelarEdicionUsuario,
  eliminarUsuario,
  handleRolChange
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <h2 className="text-3xl font-black mb-6">Gestión de Empleados</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border lg:col-span-1 h-fit">
          {editandoUsuarioId && (
            <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest w-fit mb-4">Editando Empleado</div>
          )}
          <h3 className="text-xl font-bold mb-4">{editandoUsuarioId ? 'Actualizar Información' : 'Nuevo Empleado'}</h3>
          
          <form onSubmit={guardarUsuario} className="space-y-4">
            <input required placeholder="Nombre (Ej. Juan Pérez)" value={uNombre} onChange={e => setUNombre(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
            <input required placeholder="Usuario para acceder" value={uUser} onChange={e => setUUser(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
            <input required={!editandoUsuarioId} type="text" placeholder={editandoUsuarioId ? "Nueva contraseña (Opcional)" : "Contraseña"} value={uPass} onChange={e => setUPass(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" title={editandoUsuarioId ? "Déjalo en blanco si no quieres cambiar la contraseña actual" : ""} />
            <input required type="tel" maxLength="10" placeholder="Número Celular (10 dígitos)" value={uTelefono} onChange={e => setUTelefono(e.target.value.replace(/\D/g, ''))} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
            <select value={uRol} onChange={handleRolChange} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl outline-none font-black text-blue-900 cursor-pointer">
              <option value="cajero">Cajero (Caja)</option><option value="cocina">Chef (Cocina/Barra)</option><option value="admin">Administrador</option><option value="tv">📺 Pantalla TV (KDS Cliente)</option>
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
              <button type="submit" className={`flex-1 text-white p-4 rounded-xl font-black shadow-lg transition ${editandoUsuarioId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {editandoUsuarioId ? 'Actualizar Usuario' : 'Crear Empleado'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-3xl shadow-sm border">
            <h3 className="text-xl font-bold mb-4">Plantilla Registrada</h3>
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
                      <button onClick={() => prepararEdicionUsuario(u)} className="p-3 text-blue-500 hover:text-white hover:bg-blue-500 rounded-xl transition shadow-sm bg-blue-50 border border-blue-100 sm:border-none flex justify-center"><Edit size={20}/></button>
                      <button onClick={() => eliminarUsuario(u.id)} className="p-3 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition shadow-sm bg-red-50 border border-red-100 sm:border-none flex justify-center"><Trash2 size={20}/></button>
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