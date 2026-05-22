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
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6 pr-2">
        {productosFiltrados.map((p) => {
          const tieneOpciones = p.opciones?.length > 0;
          return (
            <button 
              key={p.id} 
              onClick={() => abrirModalProducto(p)} 
              className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col items-center active:scale-95 transition-transform hover:shadow-md hover:border-blue-200"
            >
              {p.imagen_url ? (
                <img 
                  src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} 
                  alt={p.nombre} 
                  className="w-28 h-28 object-cover rounded-2xl shadow-sm mb-4" 
                />
              ) : (
                <span className="text-6xl mb-4 bg-slate-50 w-28 h-28 flex items-center justify-center rounded-2xl">{p.emoji}</span>
              )}
              <h3 className="text-xl font-bold text-center leading-tight text-slate-700">{p.nombre}</h3>
              <span className={`mt-4 px-4 py-2 rounded-full font-black ${tieneOpciones ? 'bg-emerald-50 text-emerald-600 text-sm' : 'bg-slate-100 text-blue-600'}`}>
                {tieneOpciones ? 'Personalizar' : `$${p.precio_base}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductosGrid;