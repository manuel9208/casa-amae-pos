import React from 'react';

// =========================================================================
// TAB 3: EXTRAS Y NOTAS
// Muestra los extras sueltos disponibles y el campo de notas al chef.
// =========================================================================

const TabExtrasNotas = ({
  pasoActualObj,
  productoEnEspera,
  clasificaciones,
  catalogoIngredientes,
  extrasSeleccionados,
  setExtrasSeleccionados,
  notaProducto,
  setNotaProducto
}) => {

  if (pasoActualObj?.tipo !== 'extras_notas') return null;

  return (
    <div className="animate-in slide-in-from-right duration-200 px-4 md:px-8 pb-6">
      
      {/* RENDERIZADO DINÁMICO DE EXTRAS */}
      {(() => {
        const categoriaItem = String(productoEnEspera.categoria || '').trim().toLowerCase();
        const clasifObj = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === categoriaItem);
        const clasifId = clasifObj ? clasifObj.id : null;
        
        // Filtra los ingredientes que pertenecen a esta categoría o son globales
        const extrasDelSistema = (catalogoIngredientes || []).filter(i => {
           const catIng = String(i.clasificacion_nombre || '').trim().toLowerCase();
           const coincideCategoria = (clasifId && Number(i.clasificacion_id) === Number(clasifId)) || (catIng === categoriaItem);
           return (coincideCategoria || i.es_extra || String(i.tipo) === 'extra') && i.permite_extra !== false;
        });

        const extrasMap = new Map();
        (productoEnEspera.opciones || []).forEach(o => { if (o.tipo === 'extra') extrasMap.set(o.nombre, o); });
        extrasDelSistema.forEach(o => { extrasMap.set(o.nombre, { nombre: o.nombre, precioExtra: o.precio_extra || 0 }); });

        const extrasTodos = Array.from(extrasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

        if (extrasTodos.length > 0) {
          return (
            <div className="grid grid-cols-2 gap-2 md:gap-3 max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {extrasTodos.map((ex, idx) => {
                // 🔢 NUEVO: Contamos cuántas veces está repetido este extra en el array.
                // Esto permite "Doble Crema Batida" sin tocar el motor de precios ni el backend:
                // cada entrada duplicada ya se suma/descuenta de forma independiente.
                const cantidadSeleccionada = extrasSeleccionados.filter(e => e.nombre === ex.nombre).length;
                const estaSeleccionado = cantidadSeleccionada > 0;

                const agregarUno = () => {
                  setExtrasSeleccionados([...extrasSeleccionados, { nombre: ex.nombre, precioExtra: ex.precioExtra }]);
                };

                const quitarUno = () => {
                  const idxExistente = extrasSeleccionados.findIndex(e => e.nombre === ex.nombre);
                  if (idxExistente === -1) return;
                  const nuevosExtras = [...extrasSeleccionados];
                  nuevosExtras.splice(idxExistente, 1);
                  setExtrasSeleccionados(nuevosExtras);
                };

                return (
                  <div
                    key={idx}
                    className={`p-3 md:p-4 rounded-xl font-bold text-xs md:text-sm transition border flex flex-col items-center gap-2 ${estaSeleccionado ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}
                  >
                    <span className="text-center leading-tight">{ex.nombre}</span>
                    <span className={estaSeleccionado ? 'text-blue-500' : 'text-slate-400'}>
                      {ex.precioExtra > 0 ? `+$${ex.precioExtra}` : 'Gratis'}
                    </span>

                    {estaSeleccionado ? (
                      <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 shadow-inner">
                        <button
                          type="button"
                          onClick={quitarUno}
                          className="w-7 h-7 flex items-center justify-center text-blue-600 hover:text-red-500 font-black text-base active:scale-90 transition"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-black text-blue-700">{cantidadSeleccionada}</span>
                        <button
                          type="button"
                          onClick={agregarUno}
                          className="w-7 h-7 flex items-center justify-center text-blue-600 hover:text-emerald-600 font-black text-base active:scale-90 transition"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={agregarUno}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition active:scale-95"
                      >
                        Agregar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }
        return <p className="text-center text-xs md:text-sm font-bold text-slate-400">No hay extras disponibles para este platillo.</p>;
      })()}

      {/* ÁREA DE TEXTO PARA NOTAS */}
      <div>
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 mt-3 md:mt-4">
          Notas Generales
        </p>
        <textarea 
          value={notaProducto} 
          onChange={e => setNotaProducto(e.target.value)} 
          placeholder="Instrucciones al chef (ej. Sin mucha sal, para llevar)..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-3 md:p-4 outline-none focus:border-blue-500 text-slate-700 font-bold resize-none h-16 md:h-20 shadow-inner text-xs md:text-sm transition-all" 
        />
      </div>
    </div>
  );
};

export default TabExtrasNotas;