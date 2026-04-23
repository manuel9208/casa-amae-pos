import React from 'react';
import { AlertTriangle, Edit, Plus, Package, ShoppingBag, RotateCcw, Trash2 } from 'lucide-react';

const Inventario = ({
  subSeccionInventario, setSubSeccionInventario,
  insumosCriticos,
  editandoInsumoId,
  nuevoInsumo, setNuevoInsumo,
  guardarInsumo, cancelarEdicionInsumo,
  insumosDB,
  setModalCompra, setCompraCosto,
  reiniciarStockInsumo, prepararEdicionInsumo, eliminarInsumo,
  recetaCategoriaFiltro, setRecetaCategoriaFiltro,
  recetaActivaId, setRecetaActivaId,
  clasificaciones, productos,
  rendimientoCalculadora, setRendimientoCalculadora,
  guardarRendimiento,
  nuevoItemReceta, setNuevoItemReceta,
  guardarItemReceta, recetaItems, eliminarItemReceta
}) => {
  
  // Cálculo interno del costo total de la receta en pantalla
  let costoTotalRecetaCalculado = 0;
  if (recetaItems && recetaItems.length > 0) {
    recetaItems.forEach(item => {
      costoTotalRecetaCalculado += (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-800">Control de Insumos y Recetas</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row bg-slate-200 p-1 rounded-2xl w-fit mb-8 gap-1">
        <button onClick={() => setSubSeccionInventario('insumos')} className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionInventario === 'insumos' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Materia Prima (Insumos)</button>
        <button onClick={() => setSubSeccionInventario('recetas')} className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionInventario === 'recetas' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Escandallos (Recetas)</button>
      </div>

      {subSeccionInventario === 'insumos' ? ( 
        <div className="space-y-8">
          
          {/* ALERTA DE STOCK CRÍTICO */}
          {insumosCriticos.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex flex-col md:flex-row items-start gap-4 shadow-sm animate-in fade-in">
              <AlertTriangle className="text-red-500 w-10 h-10 flex-shrink-0" />
              <div>
                <h4 className="text-red-700 font-black text-lg uppercase tracking-widest">¡Alerta de Inventario Crítico!</h4>
                <p className="text-red-600 font-bold mt-1">Tienes insumos con menos de 1 paquete de existencia: 
                   <span className="font-black text-red-800 ml-1">{insumosCriticos.map(i => i.nombre).join(', ')}</span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              {editandoInsumoId ? <Edit className="text-blue-500" /> : <Plus className="text-emerald-500" />} 
              {editandoInsumoId ? 'Editar Insumo' : 'Alta Rápida de Insumo'}
            </h3>
            <form onSubmit={guardarInsumo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Nombre Comercial</label>
                  <input required placeholder="Ej. Azúcar Morena" value={nuevoInsumo.nombre} onChange={e => setNuevoInsumo({...nuevoInsumo, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Unidad Mínima</label>
                  <select required value={nuevoInsumo.unidad_medida} onChange={e => setNuevoInsumo({...nuevoInsumo, unidad_medida: e.target.value})} className="w-full p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl outline-none font-black text-center cursor-pointer">
                    <option value="KL">Kilos (KL)</option><option value="GR">Gramos (GR)</option><option value="LT">Litros (LT)</option><option value="ML">Mililitros (ML)</option><option value="PZ">Piezas (PZ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Cant. Paquete</label>
                  <input required type="number" placeholder="Ej. 1000" value={nuevoInsumo.cantidad_presentacion} onChange={e => setNuevoInsumo({...nuevoInsumo, cantidad_presentacion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-center" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Costo Paquete ($)</label>
                  <input required type="number" step="0.01" placeholder="Ej. 50.00" value={nuevoInsumo.costo_presentacion} onChange={e => setNuevoInsumo({...nuevoInsumo, costo_presentacion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-700 text-xl" />
                </div>
              </div>
              <div className="pt-2 flex flex-col md:flex-row gap-4">
                {editandoInsumoId && (
                  <button type="button" onClick={cancelarEdicionInsumo} className="w-full md:w-1/3 p-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition">Cancelar</button>
                )}
                <button type="submit" className={`flex-1 p-4 text-white rounded-xl font-black shadow-lg transition ${editandoInsumoId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
                  {editandoInsumoId ? 'Actualizar Insumo' : 'Guardar Insumo en Inventario'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-white p-4 md:p-8 rounded-[30px] shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">Catálogo y Existencias</h3>
            {(insumosDB || []).length === 0 ? ( 
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center"><Package size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-bold text-lg">Aún no has registrado insumos.</p></div> 
            ) : ( 
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-black">
                      <th className="p-4">Insumo / Presentación</th>
                      <th className="p-4">Stock Actual</th>
                      <th className="p-4 hidden sm:table-cell">Costo Ult. Compra</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumosDB.map(ins => { 
                      const stock_paquetes = Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion));
                      let colorClases = 'bg-red-100 text-red-700 border-red-200'; // Menos de 1 paquete (<1)
                      if (stock_paquetes >= 3) {
                          colorClases = 'bg-emerald-100 text-emerald-700 border-emerald-200'; // 3 o más
                      } else if (stock_paquetes >= 1) {
                          colorClases = 'bg-yellow-100 text-yellow-700 border-yellow-200'; // Entre 1 y 2.99
                      }
                      
                      return ( 
                        <tr key={ins.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4">
                            <p className="font-bold text-slate-800 text-base md:text-lg">{ins.nombre}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{ins.cantidad_presentacion} {ins.unidad_medida}</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-3 py-1 rounded-lg border font-black text-sm ${colorClases}`}>
                              {Number(ins.stock_actual).toFixed(2)} {ins.unidad_medida}
                            </span>
                          </td>
                          <td className="p-4 font-black text-slate-600 hidden sm:table-cell">${ins.costo_presentacion}</td>
                          <td className="p-4 flex justify-center gap-2">
                            <button onClick={() => {setModalCompra(ins); setCompraCosto(ins.costo_presentacion);}} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2"><ShoppingBag size={16}/> <span className="hidden md:inline">Comprar</span></button>
                            <button onClick={() => reiniciarStockInsumo(ins)} className="bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white p-2 rounded-xl transition" title="Reiniciar a 0 (Merma)"><RotateCcw size={18}/></button>
                            <button onClick={() => prepararEdicionInsumo(ins)} className="bg-slate-100 text-blue-500 hover:bg-blue-500 hover:text-white p-2 rounded-xl transition" title="Editar"><Edit size={18}/></button>
                            <button onClick={() => eliminarInsumo(ins.id)} className="bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition" title="Eliminar"><Trash2 size={18}/></button>
                          </td>
                        </tr> 
                      ); 
                    })}
                  </tbody>
                </table>
              </div> 
            )}
          </div>
        </div> 
      ) : ( 
        <div className="space-y-8">
          {/* Formulario Recetas */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
            <h3 className="text-2xl font-black mb-6 text-slate-800">Ficha Técnica (Receta) y Rendimiento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                <label className="block text-sm font-black text-blue-800 uppercase tracking-widest mb-3">1. Clasificación</label>
                <select value={recetaCategoriaFiltro} onChange={e => { setRecetaCategoriaFiltro(e.target.value); setRecetaActivaId(''); }} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
                  <option value="">Todas las clasificaciones...</option>
                  {(clasificaciones || []).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                <label className="block text-sm font-black text-blue-800 uppercase tracking-widest mb-3">2. Platillo a costear</label>
                <select value={recetaActivaId} onChange={e => setRecetaActivaId(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
                  <option value="">Seleccionar del Menú...</option>
                  {(productos || []).filter(p => !recetaCategoriaFiltro || p.categoria === recetaCategoriaFiltro).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
                </select>
              </div>

              <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
                <label className="block text-sm font-black text-purple-800 uppercase tracking-widest mb-3">3. Porciones por Receta</label>
                <div className="flex gap-2">
                  <input type="number" min="1" step="0.01" value={rendimientoCalculadora} onChange={e => setRendimientoCalculadora(e.target.value)} className="w-full p-4 bg-white border border-purple-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-black text-lg text-center shadow-sm" title="¿Cuántos platillos salen de esta receta?" />
                  <button onClick={guardarRendimiento} disabled={!recetaActivaId} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white px-4 rounded-2xl font-bold transition shadow-sm" title="Guardar rendimiento en la base de datos">Guardar</button>
                </div>
              </div>
            </div>

            {recetaActivaId && (
              <div className="mt-6 bg-slate-50 p-6 rounded-[24px] border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">4. Agregar Insumo a la Receta</h4>
                <form onSubmit={guardarItemReceta} className="flex flex-col md:flex-row gap-4 items-stretch">
                  <div className="flex-1">
                    <select required value={nuevoItemReceta.insumo_id} onChange={e => setNuevoItemReceta({...nuevoItemReceta, insumo_id: e.target.value})} className="w-full h-full p-4 border border-slate-200 rounded-xl outline-none font-medium">
                      <option value="">Buscar Insumo...</option>
                      {(insumosDB || []).map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad_medida})</option>)}
                    </select>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <input required type="number" step="0.01" placeholder="Cant. usada" value={nuevoItemReceta.cantidad_usada} onChange={e => setNuevoItemReceta({...nuevoItemReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl outline-none font-bold" />
                    <span className="bg-slate-200 text-slate-600 px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap">Uso</span>
                  </div>
                  <button type="submit" className="md:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">Añadir a Receta</button>
                </form>
              </div>
            )}
          </div>

          {/* Tabla de Costeos */}
          {!recetaActivaId ? ( 
             <div className="bg-white p-10 rounded-[30px] text-center opacity-50 border border-slate-200"><p className="text-xl font-bold text-slate-400">Selecciona un platillo arriba para armar su receta.</p></div> 
          ) : ( 
             <div className="bg-white p-4 md:p-8 rounded-[40px] shadow-sm border border-slate-200">
               <div className="border rounded-2xl overflow-x-auto mb-6">
                 <table className="w-full text-left border-collapse min-w-max">
                   <thead>
                     <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-black">
                       <th className="p-4">Ingrediente</th><th className="p-4">Uso</th><th className="p-4">Costo Calc.</th><th className="p-4 text-center">Acción</th>
                     </tr>
                   </thead>
                   <tbody>
                     {(recetaItems || []).length === 0 ? (
                       <tr><td colSpan="4" className="text-center p-6 text-slate-400 font-bold">Sin ingredientes. Usa el panel superior para añadir.</td></tr>
                     ) : (
                       recetaItems.map(item => {
                         const costoItem = (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
                         return (
                           <tr key={item.id} className="border-b">
                             <td className="p-4 font-bold text-slate-700">{item.insumo_nombre}</td>
                             <td className="p-4 text-sm font-medium"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">{item.cantidad_usada} {item.unidad_medida}</span></td>
                             <td className="p-4 font-black text-slate-600">${costoItem.toFixed(2)}</td>
                             <td className="p-4 text-center"><button onClick={() => eliminarItemReceta(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button></td>
                           </tr>
                         )
                       })
                     )}
                   </tbody>
                 </table>
               </div>
               
               {recetaItems.length > 0 && (
                 <div className="flex flex-col md:flex-row justify-end gap-4 border-t border-slate-100 pt-6">
                   <div className="text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Costo Total Receta</p>
                     <p className="text-2xl font-black text-slate-700">${costoTotalRecetaCalculado.toFixed(2)}</p>
                   </div>
                   <div className="text-right bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
                     <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">Costo por Platillo</p>
                     <p className="text-3xl font-black text-emerald-600">${(costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora)).toFixed(2)}</p>
                   </div>
                 </div>
               )}
             </div>
          )}
        </div> 
      )}
    </div>
  );
};

export default Inventario;