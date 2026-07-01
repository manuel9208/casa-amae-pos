import React, { useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

const MermaInsumo = ({ insumosDB, procesarMerma, isSubmitting }) => {
    const [busqueda, setBusqueda] = useState('');
    const [insumoSeleccionado, setInsumoSeleccionado] = useState(null);
    const [cantidad, setCantidad] = useState('');

    const insumosVisibles = (insumosDB || []).filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    const handleSumbit = (e) => {
        e.preventDefault();
        if (!insumoSeleccionado || !cantidad || Number(cantidad) <= 0) return;
        
        let qtyToDiscount = Number(cantidad);

        // Costo exacto por unidad de medida base
        const factorRend = Number(insumoSeleccionado.factor_rendimiento) || 1;
        const costoPorPaquete = Number(insumoSeleccionado.costo_presentacion) || 0;
        const unidadesPorPaquete = Number(insumoSeleccionado.cantidad_presentacion) || 1;
        const costoPorUnidad = (costoPorPaquete / unidadesPorPaquete) / factorRend;

        const costoPerdido = qtyToDiscount * costoPorUnidad;

        procesarMerma({
            tipo: 'Insumo',
            item_id: insumoSeleccionado.id,
            nombre_item: insumoSeleccionado.nombre,
            cantidad: qtyToDiscount,
            costo_perdido: costoPerdido
        });
    };

    if (insumoSeleccionado) {
        return (
            <form onSubmit={handleSumbit} className="max-w-md mx-auto animate-in fade-in zoom-in-95 space-y-6">
                <div className="text-center mb-6 border-b border-slate-100 pb-6">
                    <span className="text-6xl mb-4 block drop-shadow-sm">📦</span>
                    <h3 className="text-2xl font-black text-slate-800">{insumoSeleccionado.nombre}</h3>
                    <p className="text-emerald-500 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-lg inline-block mt-2">Materia Prima Directa</p>
                </div>

                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
                        ¿Qué cantidad se perdió? ({insumoSeleccionado.unidad_medida})
                    </label>
                    <input 
                        type="number" min="0.01" step="0.01" required autoFocus
                        value={cantidad} onChange={e => setCantidad(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 text-center text-3xl font-black outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-700"
                        placeholder={`Ej. 1.5`}
                    />
                    <p className="text-center text-[10px] font-bold text-slate-400 mt-2">Usa siempre la unidad base ({insumoSeleccionado.unidad_medida})</p>
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => {setInsumoSeleccionado(null); setCantidad('');}} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                    <button type="submit" disabled={!cantidad || isSubmitting} className="flex-[2] py-4 bg-red-500 text-white font-black text-lg rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        <CheckCircle2 size={20}/> Confirmar Merma
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in flex flex-col h-full">
            <div className="relative mb-2 shrink-0">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar insumo o empaque..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-400 transition-all"
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {insumosVisibles.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">No se encontraron insumos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {insumosVisibles.map(ins => (
                            <button 
                                key={ins.id} 
                                onClick={() => setInsumoSeleccionado(ins)}
                                className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-xl p-4 flex justify-between items-center transition-all group active:scale-95 text-left"
                            >
                                <div>
                                    <p className="font-bold text-slate-700 group-hover:text-emerald-700 leading-tight">{ins.nombre}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                        Stock: {Number(ins.stock_actual).toFixed(2)} {ins.unidad_medida}
                                    </p>
                                </div>
                                <span className="text-lg bg-slate-50 p-2 rounded-lg group-hover:bg-emerald-50">📦</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MermaInsumo;