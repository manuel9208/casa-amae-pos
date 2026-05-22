import React from 'react';
import { MapPin } from 'lucide-react';

const CuadriculaMesas = ({ mesas, isSubmitting, limpiandoMesas, pedidos, setModalPago, setModalLiberarMesa }) => {
  return (
    <div className="space-y-8 animate-in fade-in">
      {Object.entries(
        mesas.reduce((acc, mesa) => {
          if (!acc[mesa.zona]) acc[mesa.zona] = [];
          acc[mesa.zona].push(mesa);
          return acc;
        }, {})
      ).map(([zona, mesasZona]) => (
        <div key={zona} className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
            <MapPin className="text-blue-500" size={28}/> {zona}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
             {mesasZona.map(mesa => {
                const isLibre = mesa.estado === 'Libre';
                const isOcupada = mesa.estado === 'Ocupada';
                const isPorPagar = mesa.estado === 'Por Pagar';

                let bgClass = 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 shadow-sm';
                let textClass = 'text-emerald-700';
                
                if (isOcupada) { bgClass = 'bg-orange-50 border-orange-300 hover:bg-orange-100 shadow-md shadow-orange-500/20'; textClass = 'text-orange-700'; }
                if (isPorPagar) { bgClass = 'bg-red-50 border-red-300 hover:bg-red-100 shadow-md shadow-red-500/20 animate-pulse'; textClass = 'text-red-700'; }

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
                     className={`p-6 rounded-[24px] border-2 flex flex-col items-center justify-center text-center transition-all ${bgClass} ${!isLibre ? 'active:scale-95 cursor-pointer' : 'cursor-default opacity-80'}`}
                   >
                     <span className={`text-3xl font-black mb-2 ${textClass}`}>{mesa.numero_mesa}</span>
                     <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white shadow-sm border ${textClass} ${isOcupada ? 'border-orange-200' : isPorPagar ? 'border-red-200' : 'border-emerald-200'}`}>
                        {isLibre ? '🟩 Libre' : isOcupada ? '🟧 Esperando' : '🟥 Comiendo'}
                     </span>
                     {!isLibre && mesa.numero_pedido && (
                        <span className={`mt-3 font-black text-sm bg-slate-900 px-3 py-1 rounded-lg shadow-sm text-white`}>
                           #{mesa.numero_pedido}
                        </span>
                     )}
                   </button>
                )
             })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CuadriculaMesas;