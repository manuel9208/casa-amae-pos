import React from 'react';

const CategoriasGrid = ({ configGlobal, categoriasUnicas, getPortadaCategoria, setCategoriaActiva, baseUrl }) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <h2 className="text-4xl font-black mb-8 text-slate-800">
        {configGlobal.kiosco_mensaje || '¿Qué se te antoja hoy?'}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6 pr-2">
        {categoriasUnicas.map(cat => {
          const portada = getPortadaCategoria(cat);
          return (
            <button 
              key={cat} 
              onClick={() => setCategoriaActiva(cat)} 
              className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center justify-center active:scale-95 transition-all hover:shadow-lg min-h-[220px] group"
            >
              {portada.imagen_url ? (
                <img 
                  src={portada.imagen_url?.startsWith('http') ? portada.imagen_url : `${baseUrl}${portada.imagen_url}`} 
                  alt={cat} 
                  className="w-24 h-24 object-cover rounded-full shadow-md mb-6 group-hover:scale-110 transition-transform" 
                />
              ) : (
                <span className="text-7xl mb-6 group-hover:scale-110 transition-transform">{portada.emoji}</span>
              )}
              <h3 className="text-2xl font-black text-slate-700 tracking-tight">{cat}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriasGrid;