import React, { useState } from 'react';
import { AlertTriangle, Edit, Plus, Package, ShoppingBag, RotateCcw, Trash2, Box, Percent } from 'lucide-react';

const GestorInsumos = ({ insumosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [nuevoInsumo, setNuevoInsumo] = useState({ 
      nombre: '', 
      unidad_medida: 'KL', 
      cantidad_presentacion: '', 
      costo_presentacion: '', 
      es_empaque: false,
      tipo_rendimiento: 'Directo', 
      peso_prueba_crudo: '', 
      peso_prueba_limpio: '' 
  });
  const [editandoInsumoId, setEditandoInsumoId] = useState(null);
  
  const [modalCompra, setModalCompra] = useState(null);
  const [compraPaquetes, setCompraPaquetes] = useState('');
  const [compraCosto, setCompraCosto] = useState('');

  const prepararEdicionInsumo = (i) => { 
    setEditandoInsumoId(i.id); 
    setNuevoInsumo({
        nombre: i.nombre, 
        unidad_medida: i.unidad_medida, 
        cantidad_presentacion: i.cantidad_presentacion, 
        costo_presentacion: i.costo_presentacion,
        es_empaque: i.es_empaque === true || i.es_empaque === 'true',
        tipo_rendimiento: i.tipo_rendimiento || 'Directo',
        peso_prueba_crudo: i.peso_prueba_crudo || '',
        peso_prueba_limpio: i.peso_prueba_limpio || ''
    }); 
  };
  
  const cancelarEdicionInsumo = () => { 
    setEditandoInsumoId(null); 
    setNuevoInsumo({ 
        nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', costo_presentacion: '', 
        es_empaque: false, tipo_rendimiento: 'Directo', peso_prueba_crudo: '', peso_prueba_limpio: '' 
    }); 
  };
  
  const guardarInsumo = async (e) => { 
      e.preventDefault(); 
      try { 
          const url = editandoInsumoId ? `${apiUrl}/insumos/${editandoInsumoId}` : `${apiUrl}/insumos`;
          const res = await fetch(url, { method: editandoInsumoId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoInsumo) }); 
          if (res.ok) { 
            showAlert("¡Éxito!", editandoInsumoId ? "Insumo actualizado." : "Insumo registrado.", "success");
            cancelarEdicionInsumo(); 
            refrescarDatos(); 
          } else {
            showAlert("Error", "No se pudo guardar el insumo.", "error");
          }
      } catch(e) {
          showAlert("Error", "Error de conexión al servidor.", "error");
      } 
  };
  
  const eliminarInsumo = (id) => { 
    showConfirm("Eliminar Insumo", "Asegúrate de que este insumo no esté siendo utilizado en ninguna receta antes de eliminarlo.", async () => { 
      try {
        await fetch(`${apiUrl}/insumos/${id}`, { method: 'DELETE' }); 
        refrescarDatos(); 
        showAlert("Eliminado", "Insumo borrado de la base de datos.", "success");
      } catch (error) {
        showAlert("Error", "No se pudo borrar el insumo.", "error");
      }
    }); 
  };
  
  const procesarCompraInsumo = async (e) => { 
      e.preventDefault(); 
      try { 
          const res = await fetch(`${apiUrl}/insumos/${modalCompra.id}/comprar`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ paquetes_comprados: compraPaquetes, nuevo_costo_paquete: compraCosto }) 
          }); 
          if (res.ok) { 
            showAlert("Stock Actualizado", `Se ha sumado el stock correctamente.`, "success");
            setModalCompra(null); setCompraPaquetes(''); setCompraCosto(''); 
            refrescarDatos(); 
          } else {
            showAlert("Error", "No se pudo registrar la compra.", "error");
          }
      } catch(e) {
          showAlert("Error", "Problema de conexión al procesar la compra.", "error");
      } 
  };

  const reiniciarStockInsumo = (insumo) => {
    showConfirm("Reiniciar a 0", `¿Deseas poner en 0 el stock de ${insumo.nombre}? \n\nÚsalo únicamente si se echó a perder, hubo merma o detectaste un descuadre en tu inventario.`, async () => {
        try { 
          const res = await fetch(`${apiUrl}/insumos/${insumo.id}/reiniciar`, { method: 'PUT' }); 
          if (res.ok) { 
            showAlert("Stock Reiniciado", `El inventario de ${insumo.nombre} ahora está en 0.`, "success");
            refrescarDatos(); 
          } 
        } catch(e) {}
    });
  };

  const insumosCriticos = (insumosDB || []).filter(ins => (Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion))) < 1);
  const totalCalculadoModalCompra = (parseFloat(compraPaquetes) || 0) * (parseFloat(compraCosto) || 0);

  // Calcula el porcentaje de rendimiento visualmente para que el usuario sepa qué pasará
  let porcentajeRendimientoCalculado = 100;
  if (nuevoInsumo.tipo_rendimiento !== 'Directo') {
      const pC = parseFloat(nuevoInsumo.peso_prueba_crudo) || 0;
      const pL = parseFloat(nuevoInsumo.peso_prueba_limpio) || 0;
      if (pC > 0) porcentajeRendimientoCalculado = (pL / pC) * 100;
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
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
          {editandoInsumoId ? 'Editar Insumo / Empaque' : 'Alta Rápida de Insumo / Empaque'}
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
          
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-4">
             <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={nuevoInsumo.es_empaque} onChange={e => setNuevoInsumo({...nuevoInsumo, es_empaque: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                <span className="font-black text-indigo-800 flex items-center gap-2"><Box size={18}/> ¿Es un Empaque / Desechable?</span>
             </label>
             <p className="text-xs text-indigo-600/80 font-bold ml-8 mt-1">Márcalo si es un domo, vaso, cuchara o servilleta. Así aparecerá en el simulador de Tamaños.</p>
          </div>

          {/* 👇 NUEVO BLOQUE: CONTROL DE RENDIMIENTO (MERMAS) */}
          {!nuevoInsumo.es_empaque && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Percent size={16} className="text-amber-500"/> Factor de Rendimiento (Mermas)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-1">Comportamiento del Producto</label>
                        <select value={nuevoInsumo.tipo_rendimiento} onChange={e => setNuevoInsumo({...nuevoInsumo, tipo_rendimiento: e.target.value})} className="w-full p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl outline-none font-black text-center cursor-pointer">
                            <option value="Directo">1. Se usa directo (Rinde 100%)</option>
                            <option value="Merma">2. Tiene Merma (Se pela/limpia)</option>
                            <option value="Expansión">3. Se Expande (Ej. Arroz/Frijol)</option>
                        </select>
                    </div>

                    {nuevoInsumo.tipo_rendimiento !== 'Directo' && (
                        <>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Pesaje de Prueba (Crudo/Sucio)</label>
                                <input required type="number" step="0.01" placeholder={`Ej. 400 ${nuevoInsumo.unidad_medida}`} value={nuevoInsumo.peso_prueba_crudo} onChange={e => setNuevoInsumo({...nuevoInsumo, peso_prueba_crudo: e.target.value})} className="w-full p-4 bg-slate-50 border border-amber-200 rounded-xl outline-none font-bold text-center" />
                                <p className="text-[10px] text-slate-400 mt-1 font-bold">Pesa 1 sola pieza tal cual se compró.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Pesaje de Prueba (Limpio/Cocido)</label>
                                <input required type="number" step="0.01" placeholder={`Ej. 200 ${nuevoInsumo.unidad_medida}`} value={nuevoInsumo.peso_prueba_limpio} onChange={e => setNuevoInsumo({...nuevoInsumo, peso_prueba_limpio: e.target.value})} className="w-full p-4 bg-white border border-amber-400 shadow-inner rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-black text-amber-700 text-center text-xl" />
                                <p className="text-[10px] text-slate-400 mt-1 font-bold">Pésalo otra vez ya listo para cocinar.</p>
                            </div>
                        </>
                    )}
                </div>

                {nuevoInsumo.tipo_rendimiento !== 'Directo' && nuevoInsumo.peso_prueba_crudo && nuevoInsumo.peso_prueba_limpio && (
                    <div className="mt-4 bg-slate-800 p-4 rounded-xl flex items-center justify-between text-white">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Rendimiento Real Calculado:</span>
                        <span className={`text-2xl font-black ${porcentajeRendimientoCalculado < 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {porcentajeRendimientoCalculado.toFixed(1)}%
                        </span>
                    </div>
                )}
              </div>
          )}

          <div className="pt-6 flex flex-col md:flex-row gap-4">
            {editandoInsumoId && (
              <button type="button" onClick={cancelarEdicionInsumo} className="w-full md:w-1/3 p-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition">Cancelar</button>
            )}
            <button type="submit" className={`flex-1 p-4 text-white rounded-xl font-black shadow-lg transition active:scale-95 ${editandoInsumoId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
              {editandoInsumoId ? 'Actualizar Registro' : 'Guardar en Inventario'}
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
                  let colorClases = 'bg-red-100 text-red-700 border-red-200'; 
                  if (stock_paquetes >= 3) {
                      colorClases = 'bg-emerald-100 text-emerald-700 border-emerald-200'; 
                  } else if (stock_paquetes >= 1) {
                      colorClases = 'bg-yellow-100 text-yellow-700 border-yellow-200'; 
                  }
                  
                  return ( 
                    <tr key={ins.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-2">
                            {ins.nombre}
                            {ins.es_empaque && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-widest align-middle">
                                    📦 Empaque
                                </span>
                            )}
                            {ins.factor_rendimiento && Number(ins.factor_rendimiento) !== 1 && (
                                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest align-middle ${Number(ins.factor_rendimiento) < 1 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {(Number(ins.factor_rendimiento) * 100).toFixed(0)}% RND
                                </span>
                            )}
                        </p>
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

      {modalCompra && ( 
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <form onSubmit={procesarCompraInsumo} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-blue-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Ingresar Stock</h3>
            <p className="text-slate-500 font-medium mb-6">Insumo: <span className="font-bold text-blue-600">{modalCompra.nombre}</span> ({modalCompra.cantidad_presentacion} {modalCompra.unidad_medida})</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Paquetes / Cajas Compradas</label><input autoFocus required type="number" value={compraPaquetes} onChange={e => setCompraPaquetes(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-xl text-center" placeholder="Ej. 2" /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Costo Nuevo del Paquete ($)</label><input required type="number" step="0.01" value={compraCosto} onChange={e => setCompraCosto(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-xl text-center text-slate-700" /></div>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-4 text-right">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Costo Total Compra</p>
                <p className="text-3xl font-black text-blue-700">${totalCalculadoModalCompra.toFixed(2)}</p>
            </div>
            
            {modalCompra.factor_rendimiento && Number(modalCompra.factor_rendimiento) !== 1 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-bold text-center">
                    💡 Entrarán <span className="text-amber-600 text-sm font-black mx-1">{(Number(compraPaquetes || 0) * Number(modalCompra.cantidad_presentacion) * Number(modalCompra.factor_rendimiento)).toFixed(2)} {modalCompra.unidad_medida}</span> utilizables a tu inventario.
                </div>
            )}

            <div className="flex gap-4 mt-6">
              <button type="button" onClick={() => {setModalCompra(null); setCompraPaquetes(''); setCompraCosto('');}} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition active:scale-95">Guardar</button>
            </div>
          </form>
        </div> 
      )}
    </div>
  );
};

export default GestorInsumos;