import React from 'react';
import { AlertTriangle, Edit2 } from 'lucide-react';  

const SelectorPlatillo = ({
  clasificaciones, productos, recetaCategoriaFiltro, setRecetaCategoriaFiltro,
  recetaActivaId, setRecetaActivaId, iniciarCreacionBase, iniciarEdicionBase, tamanosConfigurados,
  rendimientoCalculadora, setRendimientoCalculadora, unidadRendimiento, setUnidadRendimiento
}) => {

  // 👇 1. Identificar si lo que seleccionó es una BASE para mostrarle el botón de Renombrar
  const prodActivo = productos?.find(p => String(p.id) === String(recetaActivaId));
  const esBaseActiva = prodActivo && (prodActivo.disponible === false || prodActivo.disponible === 'false' || prodActivo.disponible === 0);

  // 👇 2. Filtramos la categoría activa
  const productosFiltrados = (productos || []).filter(p => !recetaCategoriaFiltro || p.categoria === recetaCategoriaFiltro);

  // 👇 3. Separamos y ORDENAMOS ALFABÉTICAMENTE los Platillos Principales (A-Z)
  const platillos = productosFiltrados
    .filter(p => p.disponible === true || p.disponible === 'true' || p.disponible === 1)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  // 👇 4. Separamos y ORDENAMOS ALFABÉTICAMENTE las Bases Ocultas (A-Z)
  const bases = productosFiltrados
    .filter(p => p.disponible === false || p.disponible === 'false' || p.disponible === 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  // 👇 5. NUEVO: ORDENAMOS ALFABÉTICAMENTE LAS CLASIFICACIONES (A-Z)
  const clasificacionesOrdenadas = (clasificaciones || [])
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
        <label className="block text-sm font-black text-blue-800 uppercase tracking-widest mb-3">1. Clasificación</label>
        <select value={recetaCategoriaFiltro} onChange={e => { setRecetaCategoriaFiltro(e.target.value); setRecetaActivaId(''); }} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
          <option value="">Todas las clasificaciones...</option>
          {/* 👇 Usamos la nueva lista ordenada aquí */}
          {clasificacionesOrdenadas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
        </select>
      </div>  

      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-black text-blue-800 uppercase tracking-widest">2. Platillo o Base</label>
          <div className="flex gap-2">
            {esBaseActiva && (
              <button onClick={iniciarEdicionBase} className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white px-2 py-1 rounded-md font-black uppercase tracking-widest transition shadow-sm border border-blue-200 flex items-center gap-1">
                <Edit2 size={12}/> Renombrar
              </button>
            )}
            {recetaCategoriaFiltro && (
              <button onClick={iniciarCreacionBase} className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded-md font-black uppercase tracking-widest transition shadow-sm border border-emerald-200">
                + Crear Base
              </button>
            )}
          </div>
        </div>

        <select value={recetaActivaId} onChange={e => setRecetaActivaId(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
          <option value="">Seleccionar del Menú...</option>
          
          {platillos.length > 0 && (
            <optgroup label="🍽️ PLATILLOS PRINCIPALES">
              {platillos.map(p => <option key={p.id} value={p.id}>{p.emoji || '🍽️'} {p.nombre}</option>)}
            </optgroup>
          )}

          {bases.length > 0 && (
            <optgroup label="🥣 PREPARACIONES BASE (Sub-Recetas)">
              {bases.map(p => <option key={p.id} value={p.id}>{p.emoji || '🥣'} {p.nombre}</option>)}
            </optgroup>
          )}
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