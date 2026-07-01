import React, { useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

const MermaPlatillo = ({ productos, clasificaciones, procesarMerma, isSubmitting }) => {
    const [categoria, setCategoria] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidad, setCantidad] = useState('');

    const platillos = productos.filter(p => p.disponible === true || p.disponible === 'true' || p.disponible === 1);
    const clasifsDisponibles = clasificaciones.filter(c => platillos.some(p => p.categoria === c.nombre));

    const platillosVisibles = platillos.filter(p => !categoria || p.categoria === categoria);

    const handleSumbit = (e) => {
        e.preventDefault();
        if (!productoSeleccionado || !cantidad || Number(cantidad) <= 0) return;
        
        procesarMerma({
            tipo: 'Platillo',
            item_id: productoSeleccionado.id,
            nombre_item: productoSeleccionado.nombre,
            cantidad: Number(cantidad)
        });
    };

    if (productoSeleccionado) {
        return (
            <form onSubmit={handleSumbit} className="max-w-md mx-auto animate-in fade-in zoom-in-95 space-y-6">
                <div className="text-center mb-6 border-b border-slate-100 pb-6">
                    <span className="text-6xl mb-4 block drop-shadow-sm">{productoSeleccionado.emoji || '🍽️'}</span>
                    <h3 className="text-2xl font-black text-slate-800">{productoSeleccionado.nombre}</h3>
                    <p className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1 rounded-lg inline-block mt-2">Menú Principal</p>
                </div>

                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
                        ¿Cuántos platillos se perdieron?
                    </label>
                    <input 
                        type="number" min="0.1" step="0.1" required autoFocus
                        value={cantidad} onChange={e => setCantidad(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 text-center text-3xl font-black outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-700"
                        placeholder="Ej. 1"
                    />
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => {setProductoSeleccionado(null); setCantidad('');}} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                    <button type="submit" disabled={!cantidad || isSubmitting} className="flex-[2] py-4 bg-red-500 text-white font-black text-lg rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        <CheckCircle2 size={20}/> Confirmar Merma
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                        value={categoria} 
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-orange-400 cursor-pointer appearance-none"
                    >
                        <option value="">Todas las categorías...</option>
                        {clasifsDisponibles.map(c => (
                            <option key={c.id} value={c.nombre}>{c.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {platillosVisibles.map(p => (
                    <button 
                        key={p.id} 
                        onClick={() => setProductoSeleccionado(p)}
                        className="bg-white border border-slate-200 hover:border-orange-400 hover:shadow-md rounded-2xl p-4 flex flex-col items-center text-center transition-all group active:scale-95"
                    >
                        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{p.emoji || '🍽️'}</span>
                        <span className="font-bold text-sm text-slate-700 leading-tight">{p.nombre}</span>
                    </button>
                ))}
            </div>
            
            {platillosVisibles.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">No hay platillos en esta categoría.</p>
                </div>
            )}
        </div>
    );
};

export default MermaPlatillo;