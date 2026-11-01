import React, { useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

const MermaReceta = ({ subRecetas, procesarMerma, isSubmitting }) => {
    const [busqueda, setBusqueda] = useState('');
    const [subRecetaSeleccionada, setSubRecetaSeleccionada] = useState(null);
    const [cantidad, setCantidad] = useState('');

    // 🆕 Ya no se filtra "disponible === false" de productos — la tabla
    // sub_recetas es dedicada, todo lo que haya ahí es una base/preparación real.
    const basesVisibles = (subRecetas || []).filter(sr =>
        sr.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    const handleSumbit = (e) => {
        e.preventDefault();
        if (!subRecetaSeleccionada || !cantidad || Number(cantidad) <= 0) return;

        procesarMerma({
            tipo: 'Receta',
            item_id: subRecetaSeleccionada.id,
            nombre_item: subRecetaSeleccionada.nombre,
            cantidad: Number(cantidad)
        });
    };

    if (subRecetaSeleccionada) {
        const unidad = subRecetaSeleccionada.unidad_rendimiento || 'PZ';

        return (
            <form onSubmit={handleSumbit} className="max-w-md mx-auto animate-in fade-in zoom-in-95 space-y-6">
                <div className="text-center mb-6 border-b border-slate-100 pb-6">
                    <span className="text-6xl mb-4 block drop-shadow-sm">🥣</span>
                    <h3 className="text-2xl font-black text-slate-800">{subRecetaSeleccionada.nombre}</h3>
                    <p className="text-purple-500 font-bold text-sm bg-purple-50 px-3 py-1 rounded-lg inline-block mt-2">Sub-Receta / Base</p>
                </div>

                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
                        ¿Qué cantidad exacta se perdió? ({unidad})
                    </label>
                    <input 
                        type="number" min="0.01" step="0.01" required autoFocus
                        value={cantidad} onChange={e => setCantidad(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 text-center text-3xl font-black outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-700"
                        placeholder="Ej. 1.5"
                    />
                    <p className="text-center text-[10px] font-bold text-slate-400 mt-2">El sistema descontará proporcionalmente de los insumos crudos.</p>
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => {setSubRecetaSeleccionada(null); setCantidad('');}} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                    <button type="submit" disabled={!cantidad || isSubmitting} className="flex-[2] py-4 bg-red-500 text-white font-black text-lg rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        <CheckCircle2 size={20}/> Confirmar Merma
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar base o preparación..." 
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-purple-400 transition-all"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {basesVisibles.map(sr => (
                    <button 
                        key={sr.id} 
                        onClick={() => setSubRecetaSeleccionada(sr)}
                        className="bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md rounded-2xl p-4 flex flex-col items-center text-center transition-all group active:scale-95"
                    >
                        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🥣</span>
                        <span className="font-bold text-sm text-slate-700 leading-tight">{sr.nombre}</span>
                    </button>
                ))}
            </div>
            
            {basesVisibles.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">No se encontraron bases con esa búsqueda.</p>
                </div>
            )}
        </div>
    );
};

export default MermaReceta;