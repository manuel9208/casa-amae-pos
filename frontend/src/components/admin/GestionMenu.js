import React from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';

const GestionMenu = ({
  editandoId, guardarProducto, categoriaSelect, setCategoriaSelect, 
  clasificaciones, nombre, setNombre, descripcion, setDescripcion, 
  aplicaTamanos, setAplicaTamanos, precio, setPrecio, emoji, setEmoji, 
  EMOJIS_POR_GIRO, tiempoPreparacion, setTiempoPreparacion, tamanos, setTamanos, 
  ingredientesParaClasifActiva, checkedIngredientes, setCheckedIngredientes, 
  setImagenBlob, limpiarFormularioMenu, nombreCategoriaSeleccionada, 
  productosEnCategoria, baseUrl, prepararEdicion, eliminarProducto
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* FORMULARIO DE PRODUCTO */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
        <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-slate-800">
          {editandoId ? <Edit className="text-orange-500" size={32}/> : <Plus className="text-blue-600" size={32}/>} 
          {editandoId ? 'Editar Producto' : 'Crear Nuevo Producto'}
        </h2>
        
        <form onSubmit={guardarProducto} className="space-y-6">
           <div className="space-y-4">
             {/* 1. CLASIFICACIÓN */}
             <select 
               required 
               value={categoriaSelect} 
               onChange={e => setCategoriaSelect(e.target.value)} 
               className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-900 text-lg cursor-pointer"
             >
               <option value="">1. Selecciona Clasificación...</option>
               {(clasificaciones || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
             </select>

             {/* 2. NOMBRE */}
             <input 
               required 
               placeholder="2. Nombre (Ej. Moka Frapuccino)" 
               value={nombre} 
               onChange={e => setNombre(e.target.value)} 
               className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg" 
             />

             {/* 3. DESCRIPCIÓN */}
             <textarea 
               placeholder="Descripción atractiva del platillo..." 
               value={descripcion} 
               onChange={e => setDescripcion(e.target.value)} 
               className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none h-24" 
             />
             
             <div className="grid grid-cols-2 gap-4">
               {/* 4. PRECIO */}
               <input 
                 required={!aplicaTamanos} 
                 type="number" 
                 placeholder="Precio Base $" 
                 value={precio} 
                 onChange={e => setPrecio(e.target.value)} 
                 disabled={aplicaTamanos} 
                 className={`p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-lg ${aplicaTamanos ? 'bg-slate-200 text-slate-400' : 'bg-slate-50'}`} 
               />
               
               {/* 5. EMOJI */}
               <select 
                 required 
                 value={emoji} 
                 onChange={e => setEmoji(e.target.value)} 
                 className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-3xl focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
               >
                 {Object.entries(EMOJIS_POR_GIRO).map(([giro, emojis]) => (
                   <optgroup key={giro} label={giro}>
                     {emojis.map(em => <option key={em} value={em}>{em}</option>)}
                   </optgroup>
                 ))}
               </select>
             </div>
             
             {/* 6. TIEMPO */}
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tiempo de preparación (Minutos)</label>
               <input 
                 required 
                 type="number" 
                 placeholder="Ej. 15" 
                 value={tiempoPreparacion} 
                 onChange={e => setTiempoPreparacion(e.target.value)} 
                 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-lg outline-none" 
               />
             </div>
           </div>
           
           {/* TAMAÑOS */}
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
             <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer mb-4 text-lg">
               <input type="checkbox" checked={aplicaTamanos} onChange={e => setAplicaTamanos(e.target.checked)} className="w-6 h-6 accent-blue-600" /> ¿Aplica Tamaños? (Chico/Med/Gde)
             </label>
             {aplicaTamanos && (
               <div className="space-y-3 mt-4 bg-white p-5 rounded-2xl border border-slate-200">
                 {['chico', 'mediano', 'grande'].map(t => (
                   <div key={t} className="flex items-center gap-4">
                     <label className="flex items-center gap-3 text-lg w-32 capitalize cursor-pointer font-medium">
                       <input type="checkbox" checked={tamanos[t].activo} onChange={e => setTamanos({...tamanos, [t]: {...tamanos[t], activo: e.target.checked}})} className="w-5 h-5 accent-blue-600"/> {t}
                     </label>
                     <input type="number" placeholder="Precio $" disabled={!tamanos[t].activo} value={tamanos[t].extra} onChange={e => setTamanos({...tamanos, [t]: {...tamanos[t], extra: Number(e.target.value)}})} className="w-32 p-3 font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                   </div>
                 ))}
               </div>
             )}
           </div>

           {/* INGREDIENTES BASE */}
           {categoriaSelect && (
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
               <h4 className="font-bold text-lg text-slate-800 mb-4">Ingredientes Base (Visualizar en Kiosco)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                 {ingredientesParaClasifActiva.map(ing => (
                   <label key={ing.id} className="flex items-center gap-3 text-base cursor-pointer hover:bg-white p-2 rounded-xl transition border border-transparent hover:border-slate-200 shadow-sm">
                     <input 
                        type="checkbox" 
                        checked={checkedIngredientes.includes(ing.id)} 
                        onChange={e => e.target.checked ? setCheckedIngredientes([...checkedIngredientes, ing.id]) : setCheckedIngredientes(checkedIngredientes.filter(id => id !== ing.id))} 
                        className="w-5 h-5 accent-blue-600"
                     />
                     <span className="flex-1 font-medium">{ing.nombre}</span>
                   </label>
                 ))}
               </div>
             </div>
           )}

           {/* FOTO */}
           <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition cursor-pointer">
              <label className="text-base font-bold text-slate-600 block mb-3">Sube una Foto Atractiva (Max 10MB)</label>
              <input id="imagen-producto-upload" type="file" accept="image/png, image/jpeg" onChange={e => setImagenBlob(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
           </div>
           
           {/* BOTONES ACCIÓN */}
           <div className="flex gap-4 pt-4 border-t border-slate-100">
             {editandoId && ( 
               <button type="button" onClick={limpiarFormularioMenu} className="p-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar Edición</button> 
             )}
             <button type="submit" className={`flex-1 p-5 rounded-2xl font-black text-white text-xl shadow-lg transition active:scale-95 ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
               {editandoId ? 'Actualizar Producto' : 'Guardar Producto'}
             </button>
           </div>
        </form>
      </div>
      
      {/* VISTA PREVIA LISTADO */}
      {categoriaSelect && (
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
          <h3 className="text-2xl font-black mb-6 text-slate-800">Vista Previa de: <span className="text-blue-600">{nombreCategoriaSeleccionada}</span></h3>
          {productosEnCategoria.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <p className="text-slate-500 font-bold text-lg">Aún no hay productos guardados en esta categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productosEnCategoria.map(p => (
                <div key={p.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex justify-between items-center hover:border-blue-200 hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    {p.imagen_url ? (
                        <img src={`${baseUrl}${p.imagen_url}`} alt={p.nombre} className="w-16 h-16 object-cover rounded-2xl shadow-sm" /> 
                    ) : (
                        <span className="text-3xl bg-white w-16 h-16 flex items-center justify-center rounded-2xl shadow-sm">{p.emoji}</span>
                    )}
                    <div>
                      <p className="font-bold text-lg leading-tight text-slate-800">{p.nombre}</p>
                      <span className="text-blue-600 font-black text-sm block mt-1">${p.precio_base} • ⏱️ {p.tiempo_preparacion}m</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => prepararEdicion(p)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Edit size={18}/></button>
                    <button onClick={() => eliminarProducto(p.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Trash2 size={18}/></button>
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

export default GestionMenu;