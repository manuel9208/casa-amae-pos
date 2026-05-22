import React, { useRef, useState } from 'react';

const PlanoMesas2D = ({ mesas, setMesas, apiUrl, setModoPlano, mostrarAlerta, isSubmitting, setIsSubmitting }) => {
  const [zonaPlanoActiva, setZonaPlanoActiva] = useState(mesas.length > 0 ? mesas[0].zona : ''); 
  const [mesaArrastrada, setMesaArrastrada] = useState(null);
  const lienzoRef = useRef(null);

  const iniciarArrastre = (e, id) => {
    e.target.setPointerCapture(e.pointerId);
    setMesaArrastrada(id);
  };

  const moverMesa = (e) => {
    if (!mesaArrastrada || !lienzoRef.current) return;
    const rect = lienzoRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(x, 90));
    y = Math.max(0, Math.min(y, 90));
    setMesas(prev => prev.map(m => m.id === mesaArrastrada ? { ...m, pos_x: x, pos_y: y } : m));
  };

  const soltarMesa = (e) => {
    if (mesaArrastrada) {
      e.target.releasePointerCapture(e.pointerId);
      setMesaArrastrada(null);
    }
  };

  return (
    <div className="bg-slate-100 p-4 md:p-8 rounded-3xl border-2 border-slate-300 border-dashed animate-in zoom-in duration-300">
       <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">💡 Toca y arrastra las mesas</span>
          
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
             {[...new Set(mesas.map(m => m.zona))].map(zona => (
                <button
                   key={zona}
                   onClick={() => setZonaPlanoActiva(zona)}
                   className={`px-6 py-2 rounded-xl font-black text-sm transition-all whitespace-nowrap ${zonaPlanoActiva === zona ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                >
                   {zona}
                </button>
             ))}
          </div>
       </div>

       {/* EL LIENZO */}
       <div 
         ref={lienzoRef}
         onPointerMove={moverMesa}
         onPointerUp={soltarMesa}
         onPointerLeave={soltarMesa} 
         className="relative w-full h-[600px] bg-white rounded-2xl shadow-inner border border-slate-200 overflow-hidden touch-none"
         style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
       >
          {mesas.filter(m => m.zona === zonaPlanoActiva).map(mesa => {
             const isOcupada = mesa.estado === 'Ocupada';
             const isPorPagar = mesa.estado === 'Por Pagar';

             let bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100';
             if (isOcupada) bgClass = 'bg-orange-50 border-orange-400 text-orange-700 hover:bg-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
             if (isPorPagar) bgClass = 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';

             return (
             <div
               key={mesa.id}
               onPointerDown={(e) => iniciarArrastre(e, mesa.id)}
               className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-transform ${mesaArrastrada === mesa.id ? 'border-blue-500 bg-blue-100 scale-110 z-50' : `${bgClass} z-10`}`}
               style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%`, touchAction: 'none' }}
             >
                <span className="font-black text-slate-700 text-center select-none pointer-events-none">
                   {mesa.numero_mesa}
                </span>
             </div>
          )})}
       </div>
    </div>
  );
};

export default PlanoMesas2D;