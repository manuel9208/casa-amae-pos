// src/components/admin/inventario/recetas/TablaIngredientes.js
import React from 'react';
import { Trash2 } from 'lucide-react';

const TablaIngredientes = ({ recetaItems, insumosDB, productos, eliminarItemReceta, formatearCantidadVisual }) => {
  return (
    <div className="border rounded-2xl overflow-x-auto mb-6">
        <table className="w-full text-left border-collapse min-w-max">
            <thead>
            <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-black">
                <th className="p-4">Ingrediente / Sub-Receta</th><th className="p-4">Uso</th><th className="p-4">Merma (Desperdicio)</th><th className="p-4">Costo Calc.</th><th className="p-4 text-center">Acción</th>
            </tr>
            </thead>
            <tbody>
            {(recetaItems || []).length === 0 ? (
                <tr><td colSpan="5" className="text-center p-6 text-slate-400 font-bold">Sin ingredientes. Usa el panel superior para añadir.</td></tr>
            ) : (
                recetaItems.map(item => {
                let nombreItem = '';
                let usoVisual = '';
                let costoItem = 0;
                let badge = null;
                
                let vistaMerma = <span className="text-slate-400 font-bold text-xs">0% ($0.00)</span>;

                if (item.insumo_id) {
                    nombreItem = item.insumo_nombre;
                    usoVisual = formatearCantidadVisual(item.cantidad_usada, item.unidad_medida);
                    
                    const factorRendimiento = Number(item.factor_rendimiento) || 1;
                    const costoBruto = (item.costo_presentacion / Math.max(1, item.cantidad_presentacion)) * item.cantidad_usada;
                    costoItem = costoBruto / factorRendimiento;
                    
                    const porcentajeMerma = (1 - factorRendimiento) * 100;
                    const costoExtraPorMerma = costoItem - costoBruto;

                    if (porcentajeMerma > 0) {
                        vistaMerma = (
                            <div className="flex flex-col">
                                <span className="text-red-500 font-black text-sm">{porcentajeMerma.toFixed(0)}%</span>
                                <span className="text-xs text-red-400 font-bold">+${costoExtraPorMerma.toFixed(2)} extra</span>
                            </div>
                        );
                    }

                } else if (item.sub_producto_id) {
                    nombreItem = item.sub_producto_nombre;
                    
                    let unidadSub = 'PZ';
                    let rendSub = 1;
                    let costoSubEmpaques = 0; 
                    
                    const prodRef = productos.find(p => Number(p.id) === Number(item.sub_producto_id));
                    if (prodRef) {
                        rendSub = Number(prodRef.rendimiento) || 1;
                        if (prodRef.opciones) {
                            const ops = typeof prodRef.opciones === 'string' ? JSON.parse(prodRef.opciones) : prodRef.opciones;
                            const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                            if (opt) unidadSub = opt.nombre;
                            
                            const optEmp = ops.find(o => o.categoria === 'EmpaquesUnicos');
                            if (optEmp && optEmp.empaques) {
                                optEmp.empaques.forEach(emp => {
                                    const ins = insumosDB.find(i => String(i.id) === String(emp.insumo_id));
                                    if (ins) {
                                        const factorRendimientoEmp = Number(ins.factor_rendimiento) || 1;
                                        costoSubEmpaques += ((ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) / factorRendimientoEmp) * (Number(emp.cantidad) || 0);
                                    }
                                });
                            }
                        }
                    }
                    
                    if (Number(item.cantidad_usada) === rendSub) {
                        usoVisual = `1 Olla/Batch Completo (${rendSub} ${unidadSub})`;
                    } else {
                        usoVisual = formatearCantidadVisual(item.cantidad_usada, unidadSub);
                    }

                    const costoTotalSubrecetaUnitaria = (Number(item.costo_subreceta) || 0) + costoSubEmpaques;
                    costoItem = costoTotalSubrecetaUnitaria * item.cantidad_usada;
                    
                    badge = <span className="ml-2 text-[8px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-widest font-black">Sub-Receta</span>;
                    vistaMerma = <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Ya Incluida</span>;
                }

                return (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-700 flex items-center">{nombreItem} {badge}</td>
                    <td className="p-4 text-sm font-medium"><span className={`px-2 py-1 rounded font-bold ${item.sub_producto_id ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{usoVisual}</span></td>
                    <td className="p-4">{vistaMerma}</td>
                    <td className="p-4 font-black text-slate-600">${costoItem.toFixed(2)}</td>
                    <td className="p-4 text-center"><button onClick={() => eliminarItemReceta(item.id)} className="text-red-400 hover:text-red-600 bg-white p-2 rounded-lg shadow-sm border border-slate-100"><Trash2 size={18}/></button></td>
                    </tr>
                )
                })
            )}
            </tbody>
        </table>
    </div>
  );
};

export default TablaIngredientes;