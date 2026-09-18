import React from 'react';
import { AlertTriangle, Edit2, Utensils, BoxSelect } from 'lucide-react';  

const SelectorPlatillo = ({
  clasificaciones, productos, recetaCategoriaFiltro, setRecetaCategoriaFiltro,
  recetaActivaId, setRecetaActivaId, iniciarCreacionBase, iniciarEdicionBase, tamanosConfigurados,
  rendimientoCalculadora, setRendimientoCalculadora, unidadRendimiento, setUnidadRendimiento,
  modoCosteo = 'platillos', setModoCosteo,
  ingredientes = [], extraActivoId, setExtraActivoId,
  saboresConfigurados = [], saborActivo = 'Base', setSaborActivo
}) => {  

  const prodActivo = productos?.find(p => String(p.id) === String(recetaActivaId));
  
  // 👇 BLINDAJE: Ahora detecta que es una Base buscando la palabra oculta en la base de datos
  const esBaseActiva = prodActivo && prodActivo.nombre.toLowerCase().includes('(base)');  

  const productosFiltrados = (productos || []).filter(p => !recetaCategoriaFiltro || p.categoria === recetaCategoriaFiltro);  

  // 👇 BLINDAJE: Separa los platillos normales ocultando los que digan (Base)
  const platillos = productosFiltrados
    .filter(p => !p.nombre.toLowerCase().includes('(base)'))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));  

  // 👇 BLINDAJE: Separa las Bases asegurándose que sí digan (Base)
  const bases = productosFiltrados
    .filter(p => p.nombre.toLowerCase().includes('(base)'))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));  

  const clasificacionesOrdenadas = (clasificaciones || [])
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre));  

  const extrasFiltrados = (ingredientes || [])
    .filter(i => !recetaCategoriaFiltro || String(i.clasificacion_nombre) === String(recetaCategoriaFiltro))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));  

  return (
    <div className="animate-in fade-in">  
      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2 shadow-inner border border-slate-200 overflow-x-auto">
          <button
            onClick={() => {
              if (setModoCosteo) setModoCosteo('platillos');
              if (setExtraActivoId) setExtraActivoId('');
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${modoCosteo === 'platillos' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            <Utensils size={18}/> Costear Menú
          </button>
          <button
            onClick={() => {
              if (setModoCosteo) setModoCosteo('extras');
              if (setRecetaActivaId) setRecetaActivaId('');
              if (setSaborActivo) setSaborActivo('Base');
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all ${modoCosteo === 'extras' ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            <BoxSelect size={18}/> Costear Extras
          </button>
        </div>
      </div>  

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">  
        <div className={`${modoCosteo === 'platillos' ? 'bg-blue-50/50 border-blue-100' : 'bg-orange-50/50 border-orange-100'} p-6 rounded-3xl border transition-colors`}>
          <label className={`block text-sm font-black uppercase tracking-widest mb-3 ${modoCosteo === 'platillos' ? 'text-blue-800' : 'text-orange-800'}`}>
            1. Clasificación
          </label>
          <select
            value={recetaCategoriaFiltro}
            onChange={e => {
              setRecetaCategoriaFiltro(e.target.value);
              if (modoCosteo === 'platillos') setRecetaActivaId('');
              if (modoCosteo === 'extras') setExtraActivoId('');
            }}
            className={`w-full p-4 bg-white border rounded-2xl outline-none focus:ring-2 font-bold text-lg cursor-pointer shadow-sm transition-colors ${modoCosteo === 'platillos' ? 'border-blue-200 focus:ring-blue-500' : 'border-orange-200 focus:ring-orange-500'}`}
          >
            <option value="">Todas las clasificaciones...</option>
            {clasificacionesOrdenadas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>  

        {modoCosteo === 'platillos' ? (
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
            <select value={recetaActivaId} onChange={e => { setRecetaActivaId(e.target.value); if(setSaborActivo) setSaborActivo('Base'); }} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
              <option value="">Seleccionar del Menú...</option>
              {platillos.length > 0 && (
                <optgroup label="🍽️ PLATILLOS PRINCIPALES">
                  {platillos.map(p => <option key={p.id} value={p.id}>{p.emoji || '🍽️'} {p.nombre}</option>)}
                </optgroup>
              )}
              {bases.length > 0 && (
                <optgroup label="🥣 PREPARACIONES BASE (Sub-Recetas)">
                  {/* 👇 MAGIA VISUAL: Le quitamos la palabra (Base) a la pantalla usando .replace() para que se vea limpio */}
                  {bases.map(p => <option key={p.id} value={p.id}>{p.emoji || '🥣'} {p.nombre.replace(/\(Base\)/gi, '').trim()}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        ) : (
          <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
            <label className="block text-sm font-black text-orange-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BoxSelect size={18} /> 2. Extra / Ingrediente
            </label>
            <select value={extraActivoId} onChange={e => { if(setExtraActivoId) setExtraActivoId(e.target.value); }} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg cursor-pointer shadow-sm">
              <option value="">Buscar Extra del catálogo...</option>
              {extrasFiltrados.map(i => <option key={i.id} value={i.id}>{i.nombre} {i.precio_extra > 0 ? `(+$${i.precio_extra})` : ''}</option>)}
            </select>
          </div>
        )}  

        {tamanosConfigurados && tamanosConfigurados.length === 0 ? (
          <div className={`${modoCosteo === 'platillos' ? 'bg-purple-50/50 border-purple-100' : 'bg-amber-50/50 border-amber-100'} p-6 rounded-3xl border transition-colors`}>
            <label className={`block text-sm font-black uppercase tracking-widest mb-3 ${modoCosteo === 'platillos' ? 'text-purple-800' : 'text-amber-800'}`}>
              3. Rendimiento (Total que sale)
            </label>
            <div className="flex gap-0">
              <input type="number" min="0.01" step="0.01" value={rendimientoCalculadora} onChange={e => setRendimientoCalculadora(e.target.value)} className={`w-full p-4 bg-white border rounded-l-2xl outline-none focus:ring-2 font-black text-lg text-center shadow-sm ${modoCosteo === 'platillos' ? 'border-purple-200 focus:ring-purple-500' : 'border-amber-200 focus:ring-amber-500'}`} placeholder="Ej: 6000" />
              <select value={unidadRendimiento} onChange={e => setUnidadRendimiento(e.target.value)} className={`p-4 font-black border-y border-r outline-none cursor-pointer text-xs md:text-base rounded-r-2xl ${modoCosteo === 'platillos' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                <option value="PZ">PZ</option><option value="GR">GR</option><option value="KL">KL</option><option value="ML">ML</option><option value="LT">LT</option>
              </select>
            </div>
            <p className={`text-[11px] mt-2 font-bold leading-tight ${modoCosteo === 'platillos' ? 'text-purple-600/80' : 'text-amber-700/80'}`}>
              Selecciona si {modoCosteo === 'platillos' ? 'tu olla' : 'la preparación'} rinde en Gramos, Litros o Porciones Finales.
            </p>
          </div>
        ) : (
          <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="text-orange-500 mb-2" size={32}/>
            <p className="text-orange-700 font-bold text-sm">El rendimiento y los empaques se configuran por Tamaño Fijo abajo.</p>
          </div>
        )}
      </div>  

      {/* PESTAÑAS COMBINADAS DE SABORES Y TAMAÑOS */}
      {modoCosteo === 'platillos' && recetaActivaId && (saboresConfigurados.length > 0 || tamanosConfigurados.length > 0) && (
        <div className="mt-8 bg-slate-50 border border-slate-200 p-6 rounded-[24px] animate-in fade-in slide-in-from-top-4">
          <label className="block text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            Variaciones Específicas de Receta (Sabores y Tamaños)
          </label>
          <div className="flex flex-wrap gap-3">
            
            <button
              onClick={() => { if(setSaborActivo) setSaborActivo('Base'); }}
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all border-2 ${saborActivo === 'Base' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              Receta Base (Global)
            </button>

            {saboresConfigurados.map(s => (
              <button
                key={s.nombre}
                onClick={() => { if(setSaborActivo) setSaborActivo(s.nombre); }}
                className={`px-6 py-3 rounded-xl font-black text-sm transition-all border-2 ${saborActivo === s.nombre ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
              >
                Sabor: {s.nombre}
              </button>
            ))}

            {tamanosConfigurados && tamanosConfigurados.map(t => (
              <button
                key={t.nombre}
                onClick={() => { if(setSaborActivo) setSaborActivo(t.nombre); }}
                className={`px-6 py-3 rounded-xl font-black text-sm transition-all border-2 ${saborActivo === t.nombre ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
              >
                Tamaño: {t.nombre}
              </button>
            ))}

          </div>
          <div className="mt-4 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
            <p className="text-xs font-bold text-slate-500">
              <span className="text-blue-500">💡 Tip de Costeo:</span> {saborActivo === 'Base' 
                ? 'Agrega aquí los insumos comunes (ej. vaso estándar, hielo base).' 
                : `Agrega aquí los insumos exclusivos de "${saborActivo}" (ej. 2 shots extra, jarabe de fresa, domo especial).`}
            </p>
          </div>
        </div>
      )}  

    </div>
  );
};  

export default SelectorPlatillo;