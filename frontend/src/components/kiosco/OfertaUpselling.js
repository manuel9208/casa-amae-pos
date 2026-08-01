import React, { useState, useEffect, useMemo } from 'react';
import { Gift, Plus, Minus, CheckCircle2 } from 'lucide-react';
import ImagenCachada from '../ImagenCachada';

const OfertaUpselling = ({
  promocionVigente,
  setPromocionVigente,
  agregarUpsellAlCarrito,
  apiUrl,
  productos = [],
  clasificaciones = [] 
}) => {
  const [seleccionados, setSeleccionados] = useState({});

  useEffect(() => {
    setSeleccionados({});
  }, [promocionVigente]);

  const estaDisponible = (item) => {
      if (!item) return false;
      if (item.disponible === false || item.disponible === 'false' || item.disponible === 0) return false;
      if (item.usa_horario !== true && item.usa_horario !== 'true') return true;

      try {
          const ahora = new Date();
          let diaActual = ahora.getDay();
          diaActual = diaActual === 0 ? 7 : diaActual; 

          let dias = item.dias_disponibles;
          if (typeof dias === 'string') dias = JSON.parse(dias);
          if (!Array.isArray(dias)) return true; 

          if (!dias.includes(diaActual)) return false;

          const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
          const [hIni, mIni] = (item.hora_inicio || '00:00').split(':').map(Number);
          const [hFin, mFin] = (item.hora_fin || '23:59').split(':').map(Number);

          const minIni = hIni * 60 + mIni;
          const minFin = hFin * 60 + mFin;

          if (minIni <= minFin) {
              if (minutosActuales < minIni || minutosActuales > minFin) return false;
          } else {
              if (minutosActuales < minIni && minutosActuales > minFin) return false;
          }
          return true;
      } catch (e) {
          return true;
      }
  };

  const validData = useMemo(() => {
      if (!promocionVigente) return { limite: 1, opciones: [] };

      let limite = 1;
      let opcionesTemp = [];

      if (promocionVigente.config_oferta) {
          try {
              const conf = typeof promocionVigente.config_oferta === 'string' ? JSON.parse(promocionVigente.config_oferta) : promocionVigente.config_oferta;
              limite = Number(conf.limite) || 0;
              
              if (conf.selecciones && Array.isArray(conf.selecciones)) {
                  conf.selecciones.forEach(sel => {
                      if (sel.tipo === 'categoria') {
                          const filtrados = productos.filter(p => p.categoria === sel.valor);
                          opcionesTemp = [...opcionesTemp, ...filtrados];
                      } else if (sel.tipo === 'producto') {
                          const prod = productos.find(p => String(p.id) === String(sel.valor));
                          if (prod) opcionesTemp.push(prod);
                      }
                  });
              }
          } catch(e) {}
      } else if (promocionVigente.producto_oferta_id) {
          const prod = productos.find(p => String(p.id) === String(promocionVigente.producto_oferta_id));
          if (prod) opcionesTemp.push(prod);
      }

      opcionesTemp = [...new Map(opcionesTemp.map(item => [item.id, item])).values()];

      opcionesTemp = opcionesTemp.filter(prod => {
          if (!estaDisponible(prod)) return false;
          if (clasificaciones && clasificaciones.length > 0) {
              const clasifPadre = clasificaciones.find(c => c.nombre === prod.categoria);
              if (clasifPadre && !estaDisponible(clasifPadre)) return false;
          }
          return true;
      });

      return { limite, opciones: opcionesTemp };
  }, [promocionVigente, productos, clasificaciones]);

  useEffect(() => {
      if (promocionVigente && validData.opciones.length === 0) {
          const timer = setTimeout(() => setPromocionVigente(null), 10);
          return () => clearTimeout(timer);
      }
  }, [promocionVigente, validData.opciones.length, setPromocionVigente]);

  if (!promocionVigente || validData.opciones.length === 0) return null;

  const { limite, opciones: opcionesValidas } = validData;
  const totalSeleccionado = Object.values(seleccionados).reduce((a, b) => a + b, 0);

  const handleCambio = (id, delta) => {
      setSeleccionados(prev => {
          const actual = prev[id] || 0;
          const nuevo = actual + delta;
          if (nuevo < 0) return prev;
          if (delta > 0 && limite > 0 && totalSeleccionado >= limite) return prev;
          return { ...prev, [id]: nuevo };
      });
  };

  const handleConfirmar = () => {
      const itemsQueue = [];
      Object.keys(seleccionados).forEach(prodId => {
          const qty = seleccionados[prodId];
          if (qty > 0) {
              const prodOriginal = productos.find(p => String(p.id) === String(prodId));
              if (!prodOriginal) return;
              
              let precioFinal = Number(promocionVigente.valor_descuento);
              if (promocionVigente.tipo_descuento === 'porcentaje') {
                  precioFinal = Number(prodOriginal.precio_base) - (Number(prodOriginal.precio_base) * (precioFinal / 100));
              }
              
              for(let i=0; i<qty; i++){
                   itemsQueue.push({
                       ...prodOriginal,
                       precio_base: Math.max(0, precioFinal), 
                       _esPromo: true,
                       _nombrePromo: promocionVigente.nombre
                   });
              }
          }
      });
      agregarUpsellAlCarrito(itemsQueue);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        <div className="text-center mb-6 shrink-0 relative">
          <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
             <Gift size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 leading-tight mb-1">{promocionVigente.nombre}</h2>
          <p className="text-slate-500 font-bold text-sm">
             {limite > 0 
                ? `Elige hasta ${limite} opción(es) con descuento` 
                : 'Elige todas las opciones que desees con descuento'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
           {opcionesValidas.map(p => {
               const qty = seleccionados[p.id] || 0;
               let precioFinal = Number(promocionVigente.valor_descuento);
               if (promocionVigente.tipo_descuento === 'porcentaje') {
                   precioFinal = Number(p.precio_base) - (Number(p.precio_base) * (precioFinal / 100));
               }

               return (
                   <div key={p.id} className={`flex items-center gap-4 p-4 rounded-3xl border transition-all ${qty > 0 ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200'}`}>
                      {/* 👇 APLICACIÓN DEL CACHÉ EXTREMO */}
                      {p.imagen_url ? (
                          <ImagenCachada src={p.imagen_url} alt={p.nombre} className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-white"/>
                      ) : (
                          <div className="w-16 h-16 flex items-center justify-center bg-slate-50 rounded-2xl shadow-sm border border-slate-100">
                             <span className="text-3xl">{p.emoji || '🍽️'}</span>
                          </div>
                      )}
                      
                      <div className="flex-1">
                          <p className="font-black text-slate-800 leading-tight">{p.nombre}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs font-black text-blue-600 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200">${precioFinal.toFixed(2)}</span>
                              <span className="text-[10px] font-bold text-slate-400 line-through">${Number(p.precio_base).toFixed(2)}</span>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-slate-100 p-1 shrink-0">
                         <button onClick={()=>handleCambio(p.id, -1)} disabled={qty === 0} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-30"><Minus size={16}/></button>
                         <span className="w-6 text-center font-black text-slate-700">{qty}</span>
                         <button onClick={()=>handleCambio(p.id, 1)} disabled={limite > 0 && totalSeleccionado >= limite} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-30"><Plus size={16}/></button>
                      </div>
                   </div>
               )
           })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-3">
           <button onClick={() => setPromocionVigente(null)} className="w-full sm:flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black tracking-wide rounded-2xl transition active:scale-95 order-2 sm:order-1">
             Omitir Oferta
           </button>
           <button disabled={totalSeleccionado === 0} onClick={handleConfirmar} className="w-full sm:flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 order-1 sm:order-2 tracking-wide">
              <CheckCircle2 size={20}/> Continuar a Personalizar ({totalSeleccionado})
           </button>
        </div>
      </div>
    </div>
  );
};

export default OfertaUpselling;