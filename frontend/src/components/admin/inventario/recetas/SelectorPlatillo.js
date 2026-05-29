// src/components/admin/inventario/recetas/SelectorPlatillo.js
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const SelectorPlatillo = ({
  clasificaciones, productos, recetaCategoriaFiltro, setRecetaCategoriaFiltro,
  recetaActivaId, setRecetaActivaId, iniciarCreacionBase, tamanosConfigurados,
  rendimientoCalculadora, setRendimientoCalculadora, unidadRendimiento, setUnidadRendimiento
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
        <label className="block text-sm font-black text-blue-800 uppercase tracking-widest mb-3">1. Clasificación</label>
        <select value={recetaCategoriaFiltro} onChange={e => { setRecetaCategoriaFiltro(e.target.value); setRecetaActivaId(''); }} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
          <option value="">Todas las clasificaciones...</option>
          {(clasificaciones || []).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
        <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-black text-blue-800 uppercase tracking-widest">2. Platillo o Base</label>
            {recetaCategoriaFiltro && (
              <button onClick={iniciarCreacionBase} className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded-md font-black uppercase tracking-widest transition shadow-sm border border-emerald-200">
                  + Crear Base
              </button>
            )}
        </div>
        <select value={recetaActivaId} onChange={e => setRecetaActivaId(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
          <option value="">Seleccionar del Menú...</option>
          {(productos || []).filter(p => !recetaCategoriaFiltro || p.categoria === recetaCategoriaFiltro).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
        </select>
      </div>

      {tamanosConfigurados.length === 0 ? (
        <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
            <label className="block text-sm font-black text-purple-800 uppercase tracking-widest mb-3">3. Rendimiento (Total que sale)</label>
            <div className="flex gap-0">
                <input type="number" min="0.01" step="0.01" value={rendimientoCalculadora} onChange={e => setRendimientoCalculadora(e.target.value)} className="w-full p-4 bg-white border border-purple-200 rounded-l-2xl outline-none focus:ring-2 focus:ring-purple-500 font-black text-lg text-center shadow-sm" placeholder="Ej: 6000" />
                <select value={unidadRendimiento} onChange={e => setUnidadRendimiento(e.target.value)} className="p-4 bg-purple-50 text-purple-800 font-black border-y border-purple-200 outline-none cursor-pointer text-xs md:text-base">
                    <option value="PZ">PZ</option><option value="GR">GR</option><option value="KL">KL</option><option value="ML">ML</option><option value="LT">LT</option>
                </select>
            </div>
            <p className="text-[11px] text-purple-600/80 mt-2 font-bold leading-tight">Selecciona si tu olla rinde en Gramos, Litros o Porciones Finales.</p>
        </div>
      ) : (
        <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="text-orange-500 mb-2" size={32}/>
            <p className="text-orange-700 font-bold text-sm">El rendimiento y los empaques se configuran por Tamaño Fijo abajo.</p>
        </div>
      )}
    </div>
  );
};

export default SelectorPlatillo;