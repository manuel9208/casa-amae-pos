import React, { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';

const DirectorioEmpleados = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [editandoUsuarioId, setEditandoUsuarioId] = useState(null);
  const [uNombre, setUNombre] = useState('');
  const [uUser, setUUser] = useState('');
  const [uPass, setUPass] = useState('');
  const [uTelefono, setUTelefono] = useState('');
  const [uRol, setURol] = useState('cajero');
  
  // Nuevo estado para los horarios de los ayudantes
  const [horarioEntrada, setHorarioEntrada] = useState('08:00');
  const [horarioSalida, setHorarioSalida] = useState('16:00');
  
  const [uPermisos, setUPermisos] = useState({ 
    menu: true, inventario: true, catalogos: true, 
    usuarios: false, configuracion: false, clientes: false, finanzas: false
  });

  const prepararEdicionUsuario = (u) => {
    setEditandoUsuarioId(u.id); 
    setUNombre(u.nombre); 
    setUUser(u.usuario); 
    setUPass(''); 
    setUTelefono(u.telefono || ''); 
    setURol(u.rol);
    setUPermisos(u.permisos || { menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false, clientes: false, finanzas: false });
    
    // Si es ayudante, cargamos sus horarios desde los permisos (aprovechando el JSONB)
    if (u.rol === 'ayudante_cocina') {
        setHorarioEntrada(u.permisos?.horario_entrada || '08:00');
        setHorarioSalida(u.permisos?.horario_salida || '16:00');
    }
  };

  const cancelarEdicionUsuario = () => {
    setEditandoUsuarioId(null); 
    setUNombre(''); setUUser(''); setUPass(''); setUTelefono(''); setURol('cajero');
    setHorarioEntrada('08:00'); setHorarioSalida('16:00');
    setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false, clientes: false, finanzas: false });
  };

  const handleRolChange = (e) => { 
    const nuevoRol = e.target.value; 
    setURol(nuevoRol); 
    
    if (nuevoRol === 'tv') { 
      const uniqueId = Math.floor(1000 + Math.random() * 9000); 
      setUNombre(`Pantalla TV ${uniqueId}`); 
      setUUser(`tv_${uniqueId}`); 
      setUPass('1234'); 
      setUTelefono(`999${uniqueId}000`); 
      setUPermisos({ menu: false, inventario: false, catalogos: false, usuarios: false, configuracion: false, clientes: false, finanzas: false });
    } else if (nuevoRol === 'admin') {
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono('');
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: true, configuracion: true, clientes: true, finanzas: true });
    } else if (nuevoRol === 'ayudante_cocina') {
      // Los ayudantes no necesitan contraseña ni teléfono real (se autogenera el user)
      const uniqueId = Math.floor(100 + Math.random() * 900); 
      setUUser(`ayudante_${uniqueId}`); 
      setUPass('0000'); // Dummy pass
      setUTelefono('');
      setUPermisos({ menu: false, inventario: false, catalogos: false, usuarios: false, configuracion: false, clientes: false, finanzas: false, horario_entrada: '08:00', horario_salida: '16:00' });
    } else { 
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono(''); 
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false, clientes: false, finanzas: false });
    } 
  };

  const guardarUsuario = async (e) => { 
    e.preventDefault(); 
    if(uRol !== 'tv' && uRol !== 'ayudante_cocina' && uTelefono && uTelefono.length !== 10) return showAlert("Atención", "El teléfono debe tener exactamente 10 dígitos.", "info"); 
    
    // Si es ayudante, inyectamos los horarios en el objeto JSON de permisos
    let permisosFinales = uPermisos;
    if (uRol === 'ayudante_cocina') {
        permisosFinales = { ...uPermisos, horario_entrada: horarioEntrada, horario_salida: horarioSalida };
    }

    const payload = { nombre: uNombre, usuario: uUser, rol: uRol, permisos: permisosFinales, telefono: uTelefono };
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 lg:col-span-1 h-fit">
        {editandoUsuarioId && (
          <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest w-fit mb-4">Editando Empleado</div>
        )}
        <h3 className="text-xl font-bold mb-4 text-slate-700">{editandoUsuarioId ? 'Actualizar Información' : 'Nuevo Empleado'}</h3>
        
        <form onSubmit={guardarUsuario} className="space-y-4">
          <input required placeholder="Nombre (Ej. Juan Pérez)" value={uNombre} onChange={e => setUNombre(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
          
          {uRol !== 'ayudante_cocina' && (
              <>
                <input required placeholder="Usuario para acceder" value={uUser} onChange={e => setUUser(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
                <input required={!editandoUsuarioId} type="text" placeholder={editandoUsuarioId ? "Nueva contraseña (Opcional)" : "Contraseña"} value={uPass} onChange={e => setUPass(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" title={editandoUsuarioId ? "Déjalo en blanco si no quieres cambiar la contraseña actual" : ""} />
                <input type="tel" maxLength="10" placeholder="Número Celular (Opcional)" value={uTelefono} onChange={e => setUTelefono(e.target.value.replace(/\D/g, ''))} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
              </>
          )}

          <select value={uRol} onChange={handleRolChange} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl outline-none font-black text-blue-900 cursor-pointer shadow-sm">
            <option value="cajero">Cajero (Caja)</option>
            <option value="cocina">Chef Principal (Inicio de Sesión KDS)</option>
            <option value="ayudante_cocina">🔪 Ayudante de Cocina (Sub-Perfil KDS)</option>
            <option value="admin">Administrador</option>
            <option value="tv">📺 Pantalla TV (KDS Cliente)</option>
          </select>
          
          {/* HORARIOS PARA EL AYUDANTE DE COCINA */}
          {uRol === 'ayudante_cocina' && (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
                  <p className="text-xs font-black text-orange-600 mb-2 uppercase tracking-widest">Turno del Ayudante</p>
                  <div className="flex gap-4">
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500">Entrada</label>
                          <input type="time" value={horarioEntrada} onChange={e => setHorarioEntrada(e.target.value)} className="w-full p-2 mt-1 rounded-lg border outline-none font-bold text-slate-700" required />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500">Salida</label>
                          <input type="time" value={horarioSalida} onChange={e => setHorarioSalida(e.target.value)} className="w-full p-2 mt-1 rounded-lg border outline-none font-bold text-slate-700" required />
                      </div>
                  </div>
                  <p className="text-[10px] text-orange-800 font-medium">El nombre de este ayudante solo aparecerá en la pantalla de cocina durante su turno.</p>
              </div>
          )}

          {uRol === 'admin' && (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
              <p className="text-xs font-black text-orange-600 mb-2 uppercase tracking-widest">Permisos de Acceso (Admin)</p>
              
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

      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold mb-4 text-slate-700">Plantilla Registrada</h3>
          <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
            {usuariosDB.map(u => (
              <div key={u.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition gap-4 ${editandoUsuarioId === u.id ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                <div>
                  <p className="font-bold text-lg text-slate-800 flex flex-wrap items-center gap-2">
                    {u.nombre} 
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${u.rol==='admin' ? 'bg-purple-100 text-purple-700' : u.rol==='cocina' ? 'bg-orange-100 text-orange-700' : u.rol==='ayudante_cocina' ? 'bg-amber-100 text-amber-700' : u.rol==='tv' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                      {u.rol === 'tv' ? '📺 TV KDS' : u.rol === 'ayudante_cocina' ? '🔪 Ayudante' : u.rol}
                    </span>
                    {u.usuario === 'admin' && <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-md uppercase font-black tracking-widest">Admin Global</span>}
                  </p>
                  
                  {u.rol === 'ayudante_cocina' ? (
                      <p className="text-xs text-amber-600 font-bold mt-1">🕒 Turno: {u.permisos?.horario_entrada || '00:00'} - {u.permisos?.horario_salida || '00:00'}</p>
                  ) : (
                      <p className="text-sm text-slate-500 font-medium mt-1">Usuario: <span className="font-bold text-slate-700">{u.usuario}</span> • Tel: <span className="font-bold text-slate-700">{u.telefono || 'N/A'}</span></p>
                  )}
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
  );
};

export default DirectorioEmpleados;