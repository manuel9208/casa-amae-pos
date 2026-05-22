import React, { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';

const GestorIngredientes = ({
  clasificaciones, catalogoIngredientes, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  const [editandoIngId, setEditandoIngId] = useState(null); 
  const [nuevoIng, setNuevoIng] = useState({ clasificacion_id: '', nombre: '', tipo: 'base', precio_extra: 0, permite_extra: true });

  const prepararEdicionIngrediente = (ing) => { 
    setEditandoIngId(ing.id); 
    setNuevoIng({ clasificacion_id: ing.clasificacion_id, nombre: ing.nombre, tipo: ing.tipo, precio_extra: ing.precio_extra, permite_extra: ing.permite_extra }); 
  }; 
  
  const cancelarEdicionIngrediente = () => { 
    setEditandoIngId(null); 
    setNuevoIng({ clasificacion_id: '', nombre: '', tipo: 'base', precio_extra: 0, permite_extra: true }); 
  };
  
  const guardarIngrediente = async (e) => { 
    e.preventDefault(); 
    const duplicado = catalogoIngredientes.find(i => 
      i.nombre.trim().toLowerCase() === nuevoIng.nombre.trim().toLowerCase() && 
      Number(i.clasificacion_id) === Number(nuevoIng.clasificacion_id) &&
      i.id !== editandoIngId
    ); 
    if (duplicado) return showAlert("Atención", "Este ingrediente o extra ya existe en esta clasificación.", "warning"); 
    
    try { 
      const url = editandoIngId ? `${apiUrl}/ingredientes/${editandoIngId}` : `${apiUrl}/ingredientes`; 
      const res = await fetch(url, { method: editandoIngId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoIng) }); 
      if (res.ok) { 
        showAlert("¡Éxito!", editandoIngId ? "Actualizado correctamente." : "Guardado correctamente.", "success");
        cancelarEdicionIngrediente(); 
        refrescarDatos(); 
      } 
    } catch(e) {
        showAlert("Error", "Error de conexión.", "error");
    } 
  };

  const eliminarIng = (id) => { 
    showConfirm("Eliminar", "¿Estás seguro de borrar este ingrediente o extra?", async () => { 
      try {
        await fetch(`${apiUrl}/ingredientes/${id}`, { method: 'DELETE' }); 
        refrescarDatos(); 
        showAlert("Eliminado", "Borrado correctamente.", "success");
      } catch (error) {
        showAlert("Error", "No se pudo eliminar.", "error");
      }
    }); 
  };

  const ingsFiltradosVisual = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(nuevoIng.clasificacion_id));

  return (
    <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-200 relative animate-in fade-in slide-in-from-bottom-4">
      {editandoIngId && (<div className="absolute -top-3 left-6 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest">Editando Ingrediente/Extra</div>)}
      <h3 className="text-xl font-bold mb-6 text-slate-800">Ingredientes y Extras (Visual Kiosco)</h3>
      
      <form onSubmit={guardarIngrediente} className={`space-y-4 mb-8 p-6 rounded-3xl border ${editandoIngId ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select required disabled={editandoIngId} value={nuevoIng.clasificacion_id} onChange={e => setNuevoIng({...nuevoIng, clasificacion_id: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 disabled:opacity-50">
            <option value="">Selecciona Clasificación...</option>
            {(clasificaciones || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input required placeholder="Ej. Aguacate" value={nuevoIng.nombre} onChange={e => setNuevoIng({...nuevoIng, nombre: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-700" />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select value={nuevoIng.tipo} onChange={e => setNuevoIng({...nuevoIng, tipo: e.target.value})} className="w-full md:w-48 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-700">
            <option value="base">Es Base</option><option value="extra">Solo Extra</option>
          </select>
          
          {nuevoIng.tipo === 'base' && (
            <label className="flex items-center gap-3 text-slate-600 font-bold cursor-pointer bg-white p-4 rounded-xl border border-slate-200 w-full md:w-auto">
              <input type="checkbox" checked={!nuevoIng.permite_extra} onChange={e => setNuevoIng({...nuevoIng, permite_extra: !e.target.checked})} className="w-5 h-5 accent-red-500" /> ❌ NO puede pedirse como Extra
            </label>
          )}
          
          {(nuevoIng.tipo === 'extra' || (nuevoIng.tipo === 'base' && nuevoIng.permite_extra)) && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="font-bold text-slate-500">Precio (+$$)</span>
              <input required type="number" placeholder="Ej. 15" value={nuevoIng.precio_extra} onChange={e => setNuevoIng({...nuevoIng, precio_extra: e.target.value})} className="w-full md:w-32 p-4 rounded-xl border border-blue-200 outline-none font-black text-blue-700 focus:border-blue-500 bg-white" />
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 pt-4">
          {editandoIngId && (<button type="button" onClick={cancelarEdicionIngrediente} className="w-full md:w-1/3 bg-slate-200 text-slate-700 p-4 rounded-xl hover:bg-slate-300 font-bold text-lg">Cancelar</button>)}
          <button type="submit" className={`flex-1 text-white p-4 rounded-xl font-bold text-lg transition shadow-sm ${editandoIngId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{editandoIngId ? 'Actualizar Ingrediente/Extra' : 'Guardar Ingrediente/Extra'}</button>
        </div>
      </form>
      
      <div className="mt-8 border-t pt-6">
        {!nuevoIng.clasificacion_id ? ( 
          <div className="bg-slate-50 p-10 rounded-3xl border border-slate-200 text-center"><p className="text-lg text-slate-400 font-bold">Selecciona una clasificación arriba para ver sus ingredientes/extras.</p></div> 
        ) : ( 
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {ingsFiltradosVisual.length === 0 ? ( 
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center"><p className="text-slate-400 font-bold">No hay extras aún.</p></div> 
            ) : ( 
              ingsFiltradosVisual.map(i => ( 
                <div key={i.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl border border-slate-100 transition hover:border-slate-200 ${editandoIngId === i.id ? 'border-orange-300 bg-orange-50' : 'bg-slate-50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="font-black text-lg text-slate-700">{i.nombre}</span>
                    <span className={`text-[10px] w-fit px-3 py-1 rounded-md font-black uppercase tracking-widest ${i.tipo==='extra'?'bg-orange-100 text-orange-600':'bg-emerald-100 text-emerald-600'}`}>
                      {i.tipo} {(i.tipo==='extra' || (i.tipo==='base' && i.permite_extra)) && `+$${i.precio_extra}`}{i.tipo==='base' && !i.permite_extra && ` (No Extra)`}
                    </span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button onClick={() => prepararEdicionIngrediente(i)} className="text-blue-500 hover:text-white bg-blue-100 hover:bg-blue-500 p-2.5 rounded-xl transition"><Edit size={18}/></button>
                    <button onClick={() => eliminarIng(i.id)} className="text-red-500 hover:text-white bg-red-100 hover:bg-red-500 p-2.5 rounded-xl transition"><Trash2 size={18}/></button>
                  </div>
                </div> 
              )) 
            )}
          </div> 
        )}
      </div>
    </div>
  );
};

export default GestorIngredientes;