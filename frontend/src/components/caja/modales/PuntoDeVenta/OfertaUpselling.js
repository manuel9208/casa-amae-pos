import React from 'react';
import { Gift } from 'lucide-react';

const OfertaUpselling = ({
  promocionVigente,
  setPromocionVigente,
  agregarUpsellAlCarrito,
  apiUrl
}) => {
  if (!promocionVigente) return null;

  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-md w-full shadow-2xl text-center animate-in zoom-in duration-300 border-4 border-orange-400">
        <div className="bg-orange-100 text-orange-600 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
           <Gift size={40} className="md:w-12 md:h-12" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 leading-tight">¡Oferta Especial! 🔥</h2>
        <p className="text-slate-500 font-medium mb-6 text-sm md:text-base">Ofrece esto al cliente:</p>
        
        <div className="bg-slate-50 border-2 border-orange-200 rounded-3xl p-4 md:p-6 mb-8 transform hover:scale-105 transition duration-300">
           {promocionVigente.oferta_imagen && (
              <img 
                  src={promocionVigente.oferta_imagen.startsWith('http') ? promocionVigente.oferta_imagen : `${apiUrl.replace('/api', '')}${promocionVigente.oferta_imagen}`} 
                  className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl mx-auto mb-4 shadow-sm" 
                  alt="promo" 
              />
           )}
           <h3 className="font-black text-xl md:text-2xl text-slate-800 mb-2 leading-tight">
             {promocionVigente.oferta_nombre}
           </h3>
           <p className="text-base md:text-lg font-bold text-orange-600 bg-orange-100 px-4 py-2 rounded-xl inline-block mt-2 shadow-sm">
             {promocionVigente.tipo_descuento === 'porcentaje' 
                ? `Llévalo con ${promocionVigente.valor_descuento}% de descuento` 
                : `Precio especial: $${Number(promocionVigente.valor_descuento).toFixed(2)}`}
           </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            type="button" 
            onClick={agregarUpsellAlCarrito} 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 md:py-4 rounded-2xl font-black text-lg md:text-xl shadow-lg shadow-orange-500/30 transition active:scale-95"
          >
            ¡Sí, agregarlo a la orden!
          </button>
          <button 
            type="button" 
            onClick={() => setPromocionVigente(null)} 
            className="w-full bg-slate-100 text-slate-500 hover:bg-slate-200 py-3 md:py-4 rounded-2xl font-bold transition active:scale-95 text-sm md:text-base"
          >
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfertaUpselling;