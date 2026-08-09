import React from 'react';
import { Trash2, Edit, Package, Layers } from 'lucide-react';

const ListaCombos = ({ combos, productos, apiUrl, showAlert, showConfirm, refrescarCombos, setComboAEditar }) => {
    
    const toggleEstado = async (id, estadoActual) => {
        try {
            const res = await fetch(`${apiUrl}/combos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !estadoActual }) });
            if (res.ok) refrescarCombos();
        } catch (error) { showAlert("Error", "No se pudo actualizar el estado.", "error"); }
    };

    const eliminarCombo = (id) => {
        showConfirm("Eliminar Combo", "¿Estás seguro de borrar este constructor de combo permanentemente?", async () => {
            try {
                const res = await fetch(`${apiUrl}/combos/${id}`, { method: 'DELETE' });
                if (res.ok) { showAlert("Eliminado", "Combo borrado del sistema.", "success"); refrescarCombos(); }
            } catch (error) { showAlert("Error", "No se pudo eliminar el combo.", "error"); }
        });
    };

    return (
        <div className="space-y-4 mt-8">
            <h3 className="text-xl font-black text-slate-800 ml-2">Combos Activos ({combos.length})</h3>

            {combos.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[30px] p-10 text-center">
                    <Package size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Aún no has configurado ningún combo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {combos.map(combo => {
                        // 👇 PARSEAMOS EL NUEVO OBJETO AVANZADO
                        const conf = typeof combo.configuracion_grupos === 'string' ? JSON.parse(combo.configuracion_grupos) : combo.configuracion_grupos;
                        const grupos = Array.isArray(conf) ? conf : (conf.grupos || []);
                        const precioCombo = Array.isArray(conf) ? null : conf.precio_combo;
                        const variacionesBase = Array.isArray(conf) ? {} : (conf.variaciones_base || {});

                        return (
                            <div key={combo.id} className={`bg-white rounded-[30px] shadow-sm border-2 overflow-hidden transition-all relative flex flex-col ${combo.activo ? 'border-indigo-200 hover:shadow-indigo-100' : 'border-slate-200 opacity-70 grayscale'}`}>
                                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-indigo-200 text-indigo-800">Constructor</span>
                                        <h4 className="font-black text-slate-800 text-lg mt-2 leading-tight pr-8">{combo.nombre}</h4>
                                        <p className="text-xs font-bold text-indigo-600 mt-1 flex items-center gap-1"><Package size={12}/> Padre: {combo.producto_base_nombre}</p>
                                        
                                        {/* 👇 MOSTRAR LA CONFIGURACIÓN BASE */}
                                        {precioCombo !== null && <p className="text-[11px] font-black text-emerald-600 mt-1.5">Precio Base: ${Number(precioCombo).toFixed(2)}</p>}
                                        {Object.entries(variacionesBase).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {Object.entries(variacionesBase).map(([k, v]) => (
                                                    <span key={k} className="text-[9px] bg-white border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{k}: {v}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <label className="flex items-center cursor-pointer absolute top-4 right-4 z-10">
                                        <input type="checkbox" checked={combo.activo} onChange={() => toggleEstado(combo.id, combo.activo)} className="w-5 h-5 accent-indigo-600" />
                                    </label>
                                </div>

                                <div className="p-5 flex flex-col flex-1 gap-3">
                                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1"><Layers size={12}/> {grupos.length} Grupos de Elección</span>
                                    
                                    <div className="flex flex-col gap-2 flex-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {grupos.map((g, idx) => (
                                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <p className="text-xs font-black text-slate-700 leading-tight">{g.nombre}</p>
                                                <p className="text-[10px] font-bold text-indigo-500 mt-0.5 mb-1.5">Elige {g.limite} de:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {g.tipo_seleccion === 'categoria' ? (
                                                        <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-bold uppercase tracking-wider">Toda la Cat: {g.categoria}</span>
                                                    ) : (
                                                        g.productos_ids?.map(pid => {
                                                            const pFound = productos?.find(p => String(p.id) === String(pid));
                                                            return <span key={pid} className="text-[9px] bg-white text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200">{pFound ? pFound.nombre : `Item #${pid}`}</span>;
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 mt-auto flex justify-end gap-2">
                                        <button onClick={() => setComboAEditar(combo)} className="p-2 bg-blue-50 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl transition shadow-sm" title="Editar Combo"><Edit size={18}/></button>
                                        <button onClick={() => eliminarCombo(combo.id)} className="p-2 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm" title="Eliminar Combo"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ListaCombos;