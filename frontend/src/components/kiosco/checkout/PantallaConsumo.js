import React from 'react';

const PantallaConsumo = ({
  esPersonalInterno, mesaQR, setPantallaActual, procesarTipoConsumo,
  modoKiosco = 'web'
}) => {

  const isTotem = modoKiosco === 'totem';

  const showLocal = esPersonalInterno || isTotem;
  const showLlevar = esPersonalInterno || isTotem;
  const showDomicilio = esPersonalInterno || (!isTotem && modoKiosco === 'web');
  const showRecoger = esPersonalInterno || (!isTotem && modoKiosco === 'web');

  const totalBotones = [showLocal, showLlevar, showDomicilio, showRecoger].filter(Boolean).length;
  const gridClass = totalBotones === 4 
    ? 'grid-cols-1 md:grid-cols-4' 
    : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto';

  return (
    <div className="max-w-5xl mx-auto mt-10 text-center animate-in fade-in relative">
      
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