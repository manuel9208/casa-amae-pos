import React from 'react';
import { ArrowLeft, Package } from 'lucide-react';

const MenuCategoriasYProductos = ({
  categoriaActiva,
  setCategoriaActiva,
  categoriasUnicas,
  productosFiltrados,
  getPortadaCategoria,
  abrirModalProducto
}) => {
  return (
    <>
      {!categoriaActiva ? (
        <div className="p-4 md:p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto custom-scrollbar animate-in fade-in">
          {categoriasUnicas.map(cat => {
            const { imagen_url, emoji } = getPortadaCategoria(cat);
            return (
              <button 
                key={cat} 
                onClick={() => setCategoriaActiva(cat)} 
                className="bg-white rounded-3xl md:rounded-[32px] p-4 md:p-6 flex flex-col items-center justify-center gap-2 md:gap-4 hover:shadow-xl hover:border-blue-200 transition-all border border-slate-100 group active:scale-95 min-h-[140px] md:h-48"
              >
                {imagen_url ? (
                   <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 rounded-2xl p-2 group-hover:scale-110 transition-transform">
                     <img src={imagen_url} alt={cat} className="w-full h-full object-contain" />
                   </div>
                ) : (
                   <span className="text-5xl md:text-6xl group-hover:scale-110 transition-transform drop-shadow-sm">{emoji}</span>
                )}
                <span className="font-black text-base md:text-xl text-slate-700 text-center leading-tight group-hover:text-blue-600 transition-colors">
                  {cat}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
          <div className="p-3 md:p-4 flex items-center gap-3 md:gap-4 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
            <button 
              onClick={() => setCategoriaActiva(null)} 
              className="px-4 md:px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs md:text-sm rounded-xl transition flex items-center gap-2 active:scale-95"
            >
              <ArrowLeft size={16} /> Volver
            </button>
            <h3 className="text-lg md:text-2xl font-black text-slate-800">{categoriaActiva}</h3>
          </div>
          
          <div className="p-4 md:p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto custom-scrollbar pb-10">
            {productosFiltrados.map(p => {
              const isUsaStock = p.usa_stock === true || String(p.usa_stock) === 'true';
              const stockActual = Number(p.stock_preparado) || 0;

              return (
              <button 
                key={p.id} 
                onClick={() => abrirModalProducto(p)} 
                className="bg-white rounded-3xl p-3 md:p-5 flex flex-col items-center text-center hover:shadow-xl hover:border-blue-200 transition-all border border-slate-100 group active:scale-95 relative overflow-hidden"
              >
                {p.imagen_url ? (
                   <div className="w-20 h-20 md:w-24 md:h-24 mb-3 md:mb-4 rounded-2xl overflow-hidden shadow-sm">
                     <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                   </div>
                ) : (
                   <span className="text-5xl md:text-6xl mb-3 md:mb-4 group-hover:scale-110 transition-transform drop-shadow-sm">{p.emoji}</span>
                )}
                
                <span className="font-black text-slate-800 leading-tight mb-2 text-sm md:text-base group-hover:text-blue-700 transition-colors">
                  {p.nombre}
                </span>
                
                {isUsaStock && (
                    <div className={`mb-2 text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1 ${stockActual <= 3 ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                       <Package size={12}/> Disp: {stockActual}
                    </div>
                )}

                {p.descripcion && (
                  <span className="text-xs text-slate-500 font-medium line-clamp-2 mb-2 leading-tight px-1">
                    {p.descripcion}
                  </span>
                )}
                
                <span className="text-blue-600 font-black bg-blue-50 px-3 md:px-4 py-1.5 rounded-xl text-xs md:text-sm border border-blue-100">
                  ${p.precio_base}
                </span>
              </button>
            )})}
          </div>
        </div>
      )}
    </>
  );
};

export default MenuCategoriasYProductos;