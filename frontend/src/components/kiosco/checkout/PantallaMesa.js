import React from 'react';

const PantallaMesa = ({ isSubmitting, setPantallaActual, asignarMesaYEnviar, mesasDisponibles }) => {
  return (
    <div className="max-w-4xl mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
      <div className="flex justify-start mb-6">
         <button 
             onClick={() => setPantallaActual('consumo')} 
             className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition"
         >
             ⬅ Volver
         </button>
      </div>
      
      <span className="text-6xl block mb-6">📍</span>
      <h2 className="text-3xl font-black mb-2 texto-destacado">Asignar Mesa</h2>
      <p className="text-slate-500 font-medium mb-8">¿En qué mesa se sentará el cliente? Su orden se enviará a caja para aprobarse.</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <button 
            disabled={isSubmitting} 
            onClick={() => asignarMesaYEnviar(null)} 
            className="bg-slate-100 border-2 border-slate-200 p-6 rounded-3xl font-black text-slate-600 hover:border-slate-400 transition hover:-translate-y-1"
        >
            Barra / Espera
        </button>
        
        {mesasDisponibles.filter(m => m.estado === 'Libre').map(m => (
          <button 
              key={m.id} 
              disabled={isSubmitting} 
              onClick={() => asignarMesaYEnviar(m.numero_mesa)} 
              className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-3xl font-black text-emerald-700 hover:border-emerald-500 transition hover:-translate-y-1"
          >
              {m.numero_mesa}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PantallaMesa;