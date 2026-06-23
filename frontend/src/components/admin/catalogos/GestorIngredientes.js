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
    // 👇 SOLUCIÓN APLICADA AQUÍ: Conservamos la clasificación previa al vaciar el formulario
    setNuevoIng(prev => ({ ...prev, nombre: '', tipo: 'base', precio_extra: 0, permite_extra: true })); 
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
      
      <form onSubmit={guardarIngrediente} className={`space-y-4 mb-8 p-6 rounded-3xl border ${editandoIngId ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Clasificación a la que pertenece</label>
            <select required value={nuevoIng.clasificacion_id} onChange={e => setNuevoIng({...nuevoIng, clasificacion_id: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-slate-700">
              <option value="">Selecciona...</option>
              {clasificaciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nombre (Ej. Pepperoni)</label>
            <input required type="text" value={nuevoIng.nombre} onChange={e => setNuevoIng({...nuevoIng, nombre: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-slate-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Comportamiento en Kiosco</label>
            <select value={nuevoIng.tipo} onChange={e => setNuevoIng({...nuevoIng, tipo: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-slate-700">
              <option value="base">Es Base (Viene incluido)</option>
              <option value="extra">Es Extra (Se cobra aparte)</option>
            </select>
          </div>
          {nuevoIng.tipo === 'extra' && (
            <div className="animate-in fade-in zoom-in">
              <label className="block text-xs font-bold text-slate-500 mb-1">Precio Extra ($)</label>
              <input required type="number" min="0" step="0.5" value={nuevoIng.precio_extra} onChange={e => setNuevoIng({...nuevoIng, precio_extra: Number(e.target.value)})} className="w-full bg-white border border-blue-300 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500 font-black text-blue-600 text-center" />
            </div>
          )}
          {nuevoIng.tipo === 'base' && (
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={nuevoIng.permite_extra} onChange={e => setNuevoIng({...nuevoIng, permite_extra: e.target.value === 'true' || e.target.checked})} className="w-5 h-5 accent-blue-600" />
              <label className="text-sm font-bold text-slate-600">¿El cliente puede pedir "Doble" por un costo extra?</label>
            </div>
          )}
          {nuevoIng.tipo === 'base' && nuevoIng.permite_extra && (
            <div className="animate-in fade-in zoom-in">
              <label className="block text-xs font-bold text-slate-500 mb-1">Costo por pedir "Doble" ($)</label>
              <input required type="number" min="0" step="0.5" value={nuevoIng.precio_extra} onChange={e => setNuevoIng({...nuevoIng, precio_extra: Number(e.target.value)})} className="w-full bg-white border border-emerald-300 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500 font-black text-emerald-600 text-center" />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <button type="submit" className={`flex-1 text-white font-black py-3 rounded-xl transition ${editandoIngId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
            {editandoIngId ? 'Actualizar Cambios' : 'Guardar Ingrediente'}
          </button>
          {editandoIngId && (
            <button type="button" onClick={cancelarEdicionIngrediente} className="bg-slate-200 text-slate-600 font-bold px-6 rounded-xl hover:bg-slate-300 transition">Cancelar</button>
          )}
        </div>
      </form>

      {nuevoIng.clasificacion_id && (
        <div className="animate-in slide-in-from-bottom-4">
           <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Registrados en esta Clasificación:</h4>
           {ingsFiltradosVisual.length === 0 ? (
             <p className="text-center text-slate-400 italic font-medium py-4">No hay ingredientes en esta categoría aún.</p>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {ingsFiltradosVisual.map(ing => (
                 <div key={ing.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 group hover:border-blue-200 transition">
                   <div>
                     <p className="font-black text-slate-800 leading-none mb-1">{ing.nombre}</p>
                     {ing.tipo === 'extra' ? (
                       <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Extra (+${ing.precio_extra})</span>
                     ) : (
                       <div className="flex gap-1">
                         <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Base</span>
                         {ing.permite_extra && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Permite Doble (+${ing.precio_extra})</span>}
                       </div>
                     )}
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                     <button onClick={() => prepararEdicionIngrediente(ing)} className="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white border border-blue-100 transition"><Edit size={14}/></button>
                     <button onClick={() => eliminarIng(ing.id)} className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white border border-red-100 transition"><Trash2 size={14}/></button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default GestorIngredientes;