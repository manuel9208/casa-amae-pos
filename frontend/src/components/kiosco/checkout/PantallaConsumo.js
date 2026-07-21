import React from 'react';
import { Gift } from 'lucide-react';

const PantallaConsumo = ({
  esPersonalInterno, mesaQR, promocionVigente, setPromocionVigente, 
  agregarUpsellAlCarrito, setPantallaActual, procesarTipoConsumo, apiUrl,
  modoKiosco = 'web' // 👈 NUEVO: Recibimos el modo
}) => {

  // 👇 NUEVA LÓGICA INTELIGENTE DE BOTONES
  const isTotem = modoKiosco === 'totem';

  // El cajero ve todo. El Tótem solo ve Local/Llevar. La Web solo ve Domicilio/Recoger.
  const showLocal = esPersonalInterno || isTotem;
  const showLlevar = esPersonalInterno || isTotem;
  const showDomicilio = esPersonalInterno || (!isTotem && modoKiosco === 'web');
  const showRecoger = esPersonalInterno || (!isTotem && modoKiosco === 'web');

  // Ajuste dinámico de columnas (Si hay 4 usa grid-cols-4, si hay 2 usa grid-cols-2)
  const totalBotones = [showLocal, showLlevar, showDomicilio, showRecoger].filter(Boolean).length;
  const gridClass = totalBotones === 4 
    ? 'grid-cols-1 md:grid-cols-4' 
    : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto';

  return (
    <div className="max-w-5xl mx-auto mt-10 text-center animate-in fade-in relative">
      
      {promocionVigente && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl text-center animate-in zoom-in duration-300">
            <div className="bg-orange-100 text-orange-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
               <Gift size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2 leading-tight">¡Espera! Oferta Especial 🔥</h2>
            <p className="text-slate-500 font-medium mb-6">¿Te gustaría agregar esto a tu orden?</p>
            
            <div className="bg-slate-50 border-2 border-orange-200 rounded-3xl p-6 mb-8 transform hover:scale-105 transition">
               {promocionVigente.oferta_imagen && (
                  <img 
                      src={promocionVigente.oferta_imagen.startsWith('http') ? promocionVigente.oferta_imagen : `${apiUrl.replace('/api', '')}${promocionVigente.oferta_imagen}`} 
                      className="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 shadow-sm" 
                      alt="promo" 
                  />
               )}
               <h3 className="font-black text-2xl text-slate-800 mb-2 leading-tight">{promocionVigente.oferta_nombre}</h3>
               <p className="text-lg font-bold text-orange-600 bg-orange-100 px-4 py-2 rounded-xl inline-block mt-2">
                 {promocionVigente.tipo_descuento === 'porcentaje' ? `¡Llévalo con ${promocionVigente.valor_descuento}% de descuento!` : `Precio especial: $${Number(promocionVigente.valor_descuento).toFixed(2)}`}
               </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                  onClick={agregarUpsellAlCarrito} 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg shadow-orange-500/30 transition active:scale-95"
              >
                  ¡Sí, agregarlo a mi orden!
              </button>
              <button 
                  onClick={() => setPromocionVigente(null)} 
                  className="w-full bg-slate-100 text-slate-500 hover:bg-slate-200 py-4 rounded-2xl font-bold transition active:scale-95"
              >
                  No, gracias, continuar a pago
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-start">
          <button 
              onClick={() => setPantallaActual('menu')} 
              className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition"
          >
              ⬅ Volver al carrito
          </button>
      </div>
      
      <h2 className="text-4xl font-black mb-4 texto-destacado mt-4">¿Cómo disfrutarás tu pedido?</h2>
      
      <div className={`grid gap-6 mt-12 ${gridClass}`}>
        
        {showLocal && (
            <button 
                onClick={() => procesarTipoConsumo('Local')} 
                className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2 group"
            >
                <span className="text-7xl block mb-6 group-hover:scale-110 transition-transform">🍽️</span>
                <span className="text-xl font-black text-slate-700">Comer aquí</span>
            </button>
        )}
        
        {showLlevar && (
            <button 
                onClick={() => procesarTipoConsumo('Para llevar')} 
                className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2 group"
            >
                <span className="text-7xl block mb-6 group-hover:scale-110 transition-transform">🛍️</span>
                <span className="text-xl font-black text-slate-700">Para llevar</span>
            </button>
        )}
        
        {showDomicilio && (
            <button 
              onClick={() => procesarTipoConsumo('Domicilio')} 
              className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2 group"
            >
                <span className="text-7xl block mb-6 group-hover:scale-110 transition-transform">🛵</span>
                <span className="text-xl font-black text-slate-700">A Domicilio</span>
            </button>
        )}
        
        {showRecoger && (
            <button 
              onClick={() => procesarTipoConsumo('Recoger')} 
              className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-orange-500 transition-all hover:-translate-y-2 group"
            >
                <span className="text-7xl block mb-6 group-hover:scale-110 transition-transform">📞</span>
                <span className="text-xl font-black text-slate-700">Recoger en Local</span>
            </button>
        )}
      </div>
    </div>
  );
};

export default PantallaConsumo;