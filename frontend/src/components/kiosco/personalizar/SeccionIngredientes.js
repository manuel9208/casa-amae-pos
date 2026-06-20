import React from 'react';

const SeccionIngredientes = ({
  productoEnEspera, ingredientesRemovidos, toggleIngredienteBase, 
  catalogoIngredientes, extrasAgregados, toggleExtra, notaEspecial, setNotaEspecial
}) => {

  const obtenerExtrasDisponibles = () => { 
    if (!productoEnEspera) return []; 
    const extrasGlobales = (catalogoIngredientes || []).filter(ing => ing.clasificacion_nombre === (productoEnEspera.categoria || 'General') && (ing.tipo === 'extra' || (ing.tipo === 'base' && ing.permite_extra))); 
    const extrasManuales = productoEnEspera.opciones?.filter(o => o.tipo === 'extra') || []; 
    const extrasMap = new Map(); 
    extrasGlobales.forEach(e => extrasMap.set(e.nombre, { nombre: e.nombre, precioExtra: Number(e.precio_extra) })); 
    extrasManuales.forEach(e => extrasMap.set(e.nombre, { nombre: e.nombre, precioExtra: Number(e.precioExtra) })); 
    
    // 👇 ORDEN ALFABÉTICO EN EXTRAS DEL KIOSCO
    return Array.from(extrasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)); 
  };

  return (
    <div className="space-y-6">
      {/* QUITAR INGREDIENTES BASE */}
      {productoEnEspera.opciones?.filter(o => o.tipo === 'base').length > 0 && ( 
        <div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Quitar Ingredientes</h4>
          <div className="space-y-2">
            {/* 👇 ORDEN ALFABÉTICO EN BASES DEL KIOSCO */}
            {productoEnEspera.opciones.filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre)).map((o, idx) => { 
              const estaRemovido = ingredientesRemovidos.includes(o.nombre); 
              return ( 
                <button key={idx} type="button" onClick={() => toggleIngredienteBase(o.nombre)} className={`w-full flex justify-between p-4 rounded-2xl border-2 transition-all font-bold ${estaRemovido ? 'border-red-200 bg-red-50 text-red-500' : 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                  <span className={estaRemovido ? 'line-through' : ''}>{o.nombre}</span><span>{estaRemovido ? 'Sin ❌' : 'Con ✅'}</span>
                </button> 
              ); 
            })}
          </div>
        </div> 
      )}

      {/* AGREGAR EXTRAS */}
      {obtenerExtrasDisponibles().length > 0 && ( 
        <div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Agrega Extras</h4>
          <div className="grid grid-cols-2 gap-2">
            {obtenerExtrasDisponibles().map((o, idx) => { 
              const seleccionado = extrasAgregados.find(e => e.nombre === o.nombre); 
              return ( 
                <button key={idx} type="button" onClick={() => toggleExtra(o)} className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center ${seleccionado ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300 text-slate-600'}`}>
                  <span className="text-sm">{o.nombre}</span><span className="text-xs mt-1">{o.precioExtra > 0 ? `+$${o.precioExtra}` : 'Gratis'}</span>
                </button> 
              ); 
            })}
          </div>
        </div> 
      )}
      
      {/* NOTAS ESPECIALES */}
      <div>
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Notas</h4>
        <textarea placeholder="Instrucciones al chef..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 ring-blue-500 resize-none h-24 font-medium text-slate-800" value={notaEspecial} onChange={(e) => setNotaEspecial(e.target.value)}></textarea>
      </div>
    </div>
  );
};

export default SeccionIngredientes;