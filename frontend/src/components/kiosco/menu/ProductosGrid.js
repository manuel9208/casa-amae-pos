import React from 'react';

const ProductosGrid = ({ categoriaActiva, setCategoriaActiva, productosFiltrados, abrirModalProducto, baseUrl }) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="flex items-center justify-between mb-8 gap-4 bg-white p-4 rounded-3xl shadow-sm border">
        <h2 className="text-3xl font-black text-slate-800 ml-4">{categoriaActiva}</h2>
        <button 
          onClick={() => setCategoriaActiva(null)} 
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-lg transition flex items-center justify-center shadow-lg active:scale-95"
        >
          ⬅ Volver
        </button>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto pb-6 pr-2">
        {productosFiltrados.map((p) => {
          return (
            <button 
              key={p.id} 
              onClick={() => abrirModalProducto(p)} 
              className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center active:scale-95 transition-transform hover:shadow-md hover:border-blue-200"
            >
              {p.imagen_url ? (
                <img 
                  src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} 
                  alt={p.nombre} 
                  className="w-20 h-20 md:w-28 md:h-28 object-cover rounded-2xl shadow-sm mb-3 md:mb-4" 
                />
              ) : (
                <span className="text-5xl md:text-6xl mb-3 md:mb-4 bg-slate-50 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center rounded-2xl">{p.emoji}</span>
              )}
              <h3 className="text-lg md:text-xl font-bold text-center leading-tight text-slate-700">{p.nombre}</h3>
              
              {/* 👇 INYECCIÓN DE LA DESCRIPCIÓN CON CORTE INTELIGENTE */}
              {p.descripcion && (
                <p className="text-xs md:text-sm text-slate-500 font-medium text-center mt-2 line-clamp-2 leading-snug">
                  {p.descripcion}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductosGrid;