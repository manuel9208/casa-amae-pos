// src/components/admin/inventario/recetas/PanelTamanosFijos.js
import React from 'react';
import { AlertTriangle, Box, Trash2, Package } from 'lucide-react';

const PanelTamanosFijos = ({
  tamanosConfigurados, productoSeleccionado, configTamanos, setConfigTamanos,
  insumosDB, empaquesDisponibles, costoTotalRecetaCalculado,
  guardarRendimientosTamanos, actualizarEmpaqueTamanio, eliminarEmpaqueTamanio, agregarEmpaqueTamanio,
  esSubReceta
}) => {
  return (
    <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl mt-8 animate-in fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-orange-100 shadow-sm mb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Package size={24}/></div>
                <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Costo de Insumos Base (Olla Completa)</p>
                    <p className="text-xl font-black text-slate-800">Receta Total: <span className="text-orange-600">${costoTotalRecetaCalculado.toFixed(2)}</span></p>
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-orange-200 pb-4">
            <div>
                <h4 className="text-orange-800 font-black flex items-center gap-2 text-lg">
                    <AlertTriangle size={22}/> ¡Rendimiento y Empaques por Tamaño Fijo!
                </h4>
                <p className="text-xs text-orange-600 font-bold mt-0.5">Calcula el margen exacto añadiendo el costo de todos los desechables de cada tamaño.</p>
            </div>
            <button onClick={guardarRendimientosTamanos} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-md active:scale-95">
                💾 Guardar Tamaños
            </button>
        </div>
        
        <div className="space-y-4">
            {tamanosConfigurados.map(tam => {
                const precioBase = Number(productoSeleccionado.precio_base) || 0;
                const precioVentaReal = precioBase + (Number(tam.precioExtra) || 0);
                
                const configTam = configTamanos[tam.nombre] || { rendimiento: '', empaques: [] };
                const rendSimulado = Number(configTam.rendimiento) || 1;
                
                let costoEmpaqueTotal = 0;
                (configTam.empaques || []).forEach(emp => {
                    if (emp.insumo_id) {
                        const ins = insumosDB.find(i => String(i.id) === String(emp.insumo_id));
                        if (ins) {
                            const factorRendimientoEmp = Number(ins.factor_rendimiento) || 1;
                            costoEmpaqueTotal += ((ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) / factorRendimientoEmp) * (Number(emp.cantidad) || 0);
                        }
                    }
                });
                
                const costoInsumoSimulado = costoTotalRecetaCalculado / Math.max(1, rendSimulado);
                const costoTotalSimulado = costoInsumoSimulado + costoEmpaqueTotal; 
                
                const luzAguaSimulado = costoTotalSimulado * 0.15;
                const costoRealSimulado = costoTotalSimulado * 1.15;
                const sugeridoSimulado = costoRealSimulado * 3; 
                
                const utilidadReal = precioVentaReal - costoRealSimulado;
                const margenReal = precioVentaReal > 0 ? (utilidadReal / precioVentaReal) * 100 : 0;

                return (
                    <div key={tam.nombre} className="flex flex-col xl:flex-row justify-between gap-4 p-5 bg-white rounded-2xl border border-orange-200 shadow-sm">
                        <div className="w-full xl:w-1/4">
                            <p className="font-black text-slate-800 text-xl">{tam.nombre}</p>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">P. Venta: <span className="font-black">${precioVentaReal.toFixed(2)}</span></p>
                            
                            <div className="mt-4 flex flex-col gap-2">
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Rendimiento (Piezas de la olla)</span>
                                <input type="number" placeholder="Ej. 20" value={configTam.rendimiento} onChange={e => setConfigTamanos({...configTamanos, [tam.nombre]: {...configTam, rendimiento: e.target.value}})} className="w-full p-3 border border-orange-300 rounded-xl outline-none font-black text-orange-800 text-center focus:ring-2 focus:ring-orange-500 bg-orange-50" />
                            </div>
                        </div>
                        
                        <div className="w-full xl:w-2/4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3 flex justify-between items-center">
                                    <span className="flex items-center gap-1"><Box size={14}/> Empaques (Por 1 pza)</span>
                                    <span className="text-slate-400 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">Total: ${costoEmpaqueTotal.toFixed(2)}</span>
                                </p>
                                
                                <div className="space-y-2 mb-3">
                                    {(configTam.empaques || []).map((emp, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <select value={emp.insumo_id} onChange={e => actualizarEmpaqueTamanio(tam.nombre, idx, 'insumo_id', e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs truncate focus:ring-1 focus:ring-slate-400">
                                                <option value="">Selecciona empaque...</option>
                                                {empaquesDisponibles.map(ins => {
                                                    const factorRendimientoEmp = Number(ins.factor_rendimiento) || 1;
                                                    const costoUnitario = (ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) / factorRendimientoEmp;
                                                    return (
                                                        <option key={ins.id} value={ins.id}>{ins.nombre} - ${costoUnitario.toFixed(2)} c/u</option>
                                                    );
                                                })}
                                            </select>
                                            <input type="number" min="0.01" step="0.01" value={emp.cantidad} onChange={e => actualizarEmpaqueTamanio(tam.nombre, idx, 'cantidad', e.target.value)} className="w-16 p-2 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs text-center focus:ring-1 focus:ring-slate-400" title="Cantidad utilizada de este empaque" />
                                            <button onClick={() => eliminarEmpaqueTamanio(tam.nombre, idx)} className="p-2 bg-white border border-red-200 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    {empaquesDisponibles.length === 0 && <p className="text-xs text-slate-400 italic">No tienes insumos marcados como "Empaque".</p>}
                                </div>
                            </div>
                            <button onClick={() => agregarEmpaqueTamanio(tam.nombre)} className="w-full py-2 border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500 hover:bg-slate-100 rounded-lg text-xs font-black uppercase transition mt-auto">+ Añadir Empaque</button>
                        </div>

                        {esSubReceta ? (
                            <div className="w-full xl:w-1/4 flex flex-col justify-center items-center bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Costo Neto Base</p>
                                <p className="text-2xl font-black text-slate-800">${costoTotalSimulado.toFixed(2)}</p>
                                <p className="text-[9px] text-blue-600 font-bold mt-2 bg-blue-50 px-2 py-1 rounded">Luz/Agua se cobra en platillo final.</p>
                            </div>
                        ) : (
                            <div className="w-full xl:w-1/4 grid grid-cols-1 gap-2 bg-slate-100/50 p-4 rounded-xl border border-slate-100 text-xs font-bold self-start">
                                <p className="text-slate-500 flex justify-between">Base + Empaque: <span className="text-slate-700 font-black">${costoTotalSimulado.toFixed(2)}</span></p>
                                <p className="text-red-500 flex justify-between">Luz/Agua (15%): <span className="font-black">${luzAguaSimulado.toFixed(2)}</span></p>
                                <p className="text-amber-600 flex justify-between">Costo Real: <span className="font-black">${costoRealSimulado.toFixed(2)}</span></p>
                                <p className="text-emerald-600 flex justify-between bg-emerald-50 px-2 py-1 -mx-2 rounded">Sugerido (*3): <span className="font-black">${sugeridoSimulado.toFixed(2)}</span></p>
                                <p className="text-slate-700 border-t border-dashed border-slate-300 pt-2 mt-1 font-black text-[13px] text-center">
                                    Margen: <span className={margenReal > 65 ? "text-emerald-600" : "text-amber-600"}>{margenReal.toFixed(1)}%</span>
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    </div>
  );
};

export default PanelTamanosFijos;