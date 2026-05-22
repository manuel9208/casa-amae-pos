import React from 'react';

const SeccionVariaciones = ({ productoEnEspera, variacionesSeleccionadas, seleccionarVariacion }) => {
  const agruparVariaciones = (opciones) => { 
    const grupos = {}; 
    opciones?.filter(o => o.tipo === 'variacion').forEach(o => { 
      if (!grupos[o.categoria]) grupos[o.categoria] = []; 
      grupos[o.categoria].push(o); 
    }); 
    return grupos; 
  };

  return (
    <>
      {Object.entries(agruparVariaciones(productoEnEspera.opciones)).map(([categoria, opcionesGrupo]) => ( 
        <div key={categoria} className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 shadow-sm">
          <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2"><span>🏷️</span> {categoria}</h4>
          <div className="grid grid-cols-2 gap-3">
            {opcionesGrupo.map((o, idx) => { 
              const estaSeleccionado = variacionesSeleccionadas[categoria]?.nombre === o.nombre; 
              return ( 
                <button 
                  key={idx} 
                  type="button"
                  onClick={() => seleccionarVariacion(categoria, o)} 
                  className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center ${estaSeleccionado ? 'border-blue-600 bg-blue-600 text-white shadow-md transform scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
                >
                  <span className="text-lg leading-tight">{o.nombre}</span>
                  <span className={`text-xs mt-1 font-black uppercase tracking-wider ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>{o.precioExtra > 0 ? `+$${o.precioExtra}` : 'Gratis'}</span>
                </button> 
              ); 
            })}
          </div>
        </div> 
      ))}
    </>
  );
};

export default SeccionVariaciones;