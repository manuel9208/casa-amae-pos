import React from 'react';

const CategoriasGrid = ({ configGlobal, categoriasUnicas, getPortadaCategoria, setCategoriaActiva, baseUrl }) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <h2 className="text-3xl md:text-4xl font-black mb-4 md:mb-8 text-slate-800">
        {configGlobal.kiosco_mensaje || '¿Qué se te antoja hoy?'}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto pb-6 pr-2 custom-scrollbar">
        {categoriasUnicas.map(cat => {
          const portada = getPortadaCategoria(cat);
          return (
            <button 
              key={cat} 
              onClick={() => setCategoriaActiva(cat)} 
              className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center justify-center active:scale-95 transition-all hover:shadow-lg min-h-[140px] md:min-h-[220px] group"
            >
              {portada.imagen_url ? (
                <img 
                  src={portada.imagen_url?.startsWith('http') ? portada.imagen_url : `${baseUrl}${portada.imagen_url}`} 
                  alt={cat} 
                  className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-full shadow-md mb-3 md:mb-6 group-hover:scale-110 transition-transform" 
                />
              ) : (
                <span className="text-5xl md:text-7xl mb-3 md:mb-6 group-hover:scale-110 transition-transform">{portada.emoji}</span>
              )}
              <h3 className="text-lg md:text-2xl font-black text-slate-700 tracking-tight text-center leading-tight">{cat}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriasGrid;