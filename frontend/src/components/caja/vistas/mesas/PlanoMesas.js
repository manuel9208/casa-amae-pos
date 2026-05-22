import React from 'react';
import { MapPin } from 'lucide-react';

const PlanoMesas = ({ mesas, zonaPlanoActiva, isSubmitting, limpiandoMesas, pedidos, setModalPago, setModalLiberarMesa }) => {
  return (
    <div className="bg-slate-100 p-4 md:p-8 rounded-3xl border border-slate-200 shadow-inner animate-in fade-in relative">
      <div className="absolute top-4 left-6 pointer-events-none opacity-40 flex items-center gap-2 text-slate-400 z-0">
         <MapPin size={24}/> <span className="font-black text-xl uppercase tracking-widest">{zonaPlanoActiva}</span>
      </div>

      <div 
        className="relative w-full h-[600px] bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      >
         {mesas.filter(m => m.zona === zonaPlanoActiva).map(mesa => {
            const isLibre = mesa.estado === 'Libre';
            const isOcupada = mesa.estado === 'Ocupada';
            const isPorPagar = mesa.estado === 'Por Pagar';

            let bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100';
            if (isOcupada) bgClass = 'bg-orange-50 border-orange-400 text-orange-700 hover:bg-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
            if (isPorPagar) bgClass = 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';

            return (
               <button
                 key={mesa.id}
                 disabled={isLibre || isSubmitting || limpiandoMesas}
                 onClick={() => {
                    if (!isLibre) {
                       const pedidoVinculado = pedidos.find(p => p.id === mesa.pedido_actual_id);
                       if (pedidoVinculado) {
                           setModalPago(pedidoVinculado);
                       } else {
                           setModalLiberarMesa({ todas: false, mesa: mesa.numero_mesa });
                       }
                    }
                 }}
                 className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 flex flex-col items-center justify-center transition-all ${bgClass} ${!isLibre ? 'active:scale-95 cursor-pointer z-20' : 'cursor-default z-10'}`}
                 style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%` }}
               >
                  <span className="font-black text-lg">{mesa.numero_mesa}</span>
                  {!isLibre && mesa.numero_pedido && (
                     <span className="mt-1 text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                        #{mesa.numero_pedido}
                     </span>
                  )}
               </button>
            );
         })}
      </div>
   </div>
  );
};

export default PlanoMesas;