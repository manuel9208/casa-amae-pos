import React from 'react';
import { Package } from 'lucide-react'; // 👈 FIX: Importamos el icono

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
          // 👇 LÓGICA DE STOCK PARA EL KIOSCO
          const isUsaStock = p.usa_stock === true || p.usa_stock === 'true';
          const stockActual = Number(p.stock_preparado) || 0;
          const agotado = isUsaStock && stockActual <= 0;

          return (
            <button 
              key={p.id} 
              disabled={agotado} // 👈 Si está agotado (aunque no se haya refrescado el boolean "disponible") no dejará hacer click
              onClick={() => abrirModalProducto(p)} 
              className={`bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center transition-transform hover:shadow-md hover:border-blue-200 ${agotado ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'}`}
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
              
              {/* 👇 INSIGNIA DE STOCK */}
              {isUsaStock && (
                  <div className={`mt-2 mb-1 text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1 ${stockActual <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                     <Package size={12}/> Disp: {stockActual}
                  </div>
              )}

              {p.descripcion && (
                <p className="text-xs md:text-sm text-slate-500 font-medium text-center mt-1 line-clamp-2 leading-snug">
                  {p.descripcion}
                </p>
              )}
              {agotado && <span className="mt-2 text-xs font-black text-red-600 bg-red-100 px-2 py-1 rounded-md uppercase">Agotado</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductosGrid;