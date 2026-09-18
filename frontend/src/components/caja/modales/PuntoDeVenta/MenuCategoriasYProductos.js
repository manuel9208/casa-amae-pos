import React from 'react';
import { ArrowLeft, Package, Star } from 'lucide-react';
import ImagenCachada from '../../../ImagenCachada';  

const MenuCategoriasYProductos = ({
  categoriaActiva,
  setCategoriaActiva,
  categoriasUnicas,
  productosFiltrados,
  getPortadaCategoria,
  abrirModalProducto,
  promociones = [] // 👈 NUEVA PROP: Recibimos las promociones
}) => {

  // 👇 NUEVA FUNCIÓN: Escáner visual para saber si el botón lleva etiqueta
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
                    <ImagenCachada src={imagen_url} alt={cat} className="w-full h-full object-contain" />
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
              
              // Escanear si este producto tiene promo
              const promoActiva = obtenerPromoActiva(p);

              // 👇 Cálculo visual del precio si es Happy Hour
              let precioVisual = p.precio_base;
              let precioTachado = null;

              if (promoActiva && promoActiva.tipo === 'happy_hour') {
                  precioTachado = Number(p.precio_base).toFixed(2);
                  let pBase = Number(p.precio_base);
                  if (promoActiva.tipo_descuento === 'porcentaje') {
                      precioVisual = (pBase - (pBase * (Number(promoActiva.valor_descuento) / 100))).toFixed(2);
                  } else if (promoActiva.tipo_descuento === 'descuento_fijo' || promoActiva.tipo_descuento === 'descontar_cantidad') {
                      precioVisual = Math.max(0, pBase - Number(promoActiva.valor_descuento)).toFixed(2);
                  } else if (promoActiva.tipo_descuento === 'precio_fijo') {
                      precioVisual = Number(promoActiva.valor_descuento).toFixed(2);
                  }
              }

              return (
                <button
                  key={p.id}
                  onClick={() => abrirModalProducto(p)}
                  className="bg-white rounded-3xl p-3 md:p-5 flex flex-col items-center justify-start text-center hover:shadow-xl hover:border-blue-200 transition-all border border-slate-100 group active:scale-95 relative overflow-hidden min-h-[180px] md:min-h-[220px]"
                >
                  {/* 👇 ETIQUETA DE PROMOCIÓN VISUAL */}
                  {promoActiva && (
                      <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white shadow-md z-10 flex items-center gap-1 ${promoActiva.tipo === 'happy_hour' ? 'bg-purple-500 shadow-purple-500/30' : 'bg-orange-500 shadow-orange-500/30'}`}>
                          <Star size={10} className={promoActiva.tipo === 'happy_hour' ? 'animate-pulse' : ''}/> 
                          {promoActiva.tipo === 'happy_hour' ? 'Happy Hour' : 'Promo'}
                      </div>
                  )}

                  {p.imagen_url ? (
                    <div className="w-16 h-16 md:w-24 md:h-24 mb-3 rounded-2xl overflow-hidden shadow-sm shrink-0 mt-3">
                      <ImagenCachada src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </div>
                  ) : (
                    <span className="text-4xl md:text-6xl mb-3 mt-3 group-hover:scale-110 transition-transform drop-shadow-sm shrink-0">{p.emoji}</span>
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
                    <span className="text-[10px] md:text-xs text-slate-500 font-medium line-clamp-2 mb-2 leading-tight px-1">
                      {p.descripcion}
                    </span>
                  )}

                  {/* 👇 RENDERIZADO DEL PRECIO INTELIGENTE (Detecta Happy Hour y Tacha el anterior) */}
                  <div className="mt-auto flex items-center gap-2">
                      <span className={`font-black px-3 md:px-4 py-1.5 rounded-xl text-xs md:text-sm border ${promoActiva && promoActiva.tipo === 'happy_hour' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          ${precioVisual}
                      </span>
                      {precioTachado && (
                          <span className="text-[10px] font-bold text-slate-400 line-through">
                              ${precioTachado}
                          </span>
                      )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default MenuCategoriasYProductos;