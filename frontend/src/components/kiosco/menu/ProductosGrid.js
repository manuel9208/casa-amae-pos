import React from 'react';
import { Package, Star } from 'lucide-react'; // 👈 Agregamos Star para el ícono de la promo
import ImagenCachada from '../../ImagenCachada';

const ProductosGrid = ({ 
  categoriaActiva, 
  setCategoriaActiva, 
  productosFiltrados, 
  abrirModalProducto, 
  baseUrl,
  promociones = [] // 👈 NUEVA PROP: Recibimos las promociones
}) => {

  // 👇 NUEVA FUNCIÓN: Escáner visual silencioso
  const obtenerPromoActiva = (prod) => {
      if (!promociones || promociones.length === 0) return null;
      const ahora = new Date();
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaHoy = dias[ahora.getDay()];
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

      return promociones.find(p => {
          if (!p.activo) return false;
          if (p.tipo !== 'upselling' && p.tipo !== 'happy_hour') return false;

          const diasPromo = typeof p.dias_aplicables === 'string' ? JSON.parse(p.dias_aplicables || '[]') : (p.dias_aplicables || []);
          if (!diasPromo.includes(diaHoy)) return false;

          const [hI, mI] = (p.hora_inicio || '00:00').split(':').map(Number);
          const [hF, mF] = (p.hora_fin || '23:59').split(':').map(Number);
          const minI = hI * 60 + mI;
          const minF = hF * 60 + mF;

          if (minI <= minF) {
              if (horaActual < minI || horaActual > minF) return false;
          } else {
              if (horaActual < minI && horaActual > minF) return false;
          }

          if (p.producto_trigger_id && String(p.producto_trigger_id) === String(prod.id)) return true;
          if (p.categoria_trigger && p.categoria_trigger === prod.categoria) return true;
          if (!p.producto_trigger_id && !p.categoria_trigger) return true;

          return false;
      });
  };

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
          const isUsaStock = p.usa_stock === true || p.usa_stock === 'true';
          const stockActual = Number(p.stock_preparado) || 0;
          const agotado = isUsaStock && stockActual <= 0;

          // 👇 Ejecutamos el escáner para este producto
          const promoActiva = obtenerPromoActiva(p);

          return (
            <button 
              key={p.id} 
              disabled={agotado} 
              onClick={() => abrirModalProducto(p)} 
              // 👇 FIX: Solo agregué la clase "relative" al inicio para que el diseño no se rompa
              className={`relative bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center transition-transform hover:shadow-md hover:border-blue-200 ${agotado ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'}`}
            >
              
              {/* 👇 ETIQUETA VISUAL FLOTANTE (Solo se muestra si hay promo y no está agotado) */}
              {promoActiva && !agotado && (
                  <div className={`absolute top-2 left-2 md:top-4 md:left-4 px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white shadow-md z-10 flex items-center gap-1.5 ${promoActiva.tipo === 'happy_hour' ? 'bg-purple-500 shadow-purple-500/30' : 'bg-orange-500 shadow-orange-500/30'}`}>
                      <Star size={12} className={promoActiva.tipo === 'happy_hour' ? 'animate-pulse' : ''}/>
                      {promoActiva.tipo === 'happy_hour' ? 'Happy Hour' : 'Promo'}
                  </div>
              )}

              {p.imagen_url ? (
                <ImagenCachada 
                  src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} 
                  alt={p.nombre} 
                  className="w-20 h-20 md:w-28 md:h-28 object-cover rounded-2xl shadow-sm mb-3 md:mb-4" 
                />
              ) : (
                <span className="text-5xl md:text-6xl mb-3 md:mb-4 bg-slate-50 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center rounded-2xl">{p.emoji}</span>
              )}
              <h3 className="text-lg md:text-xl font-bold text-center leading-tight text-slate-700">{p.nombre}</h3>
              
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