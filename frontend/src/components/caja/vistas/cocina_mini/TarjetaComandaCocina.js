import React from 'react';
import { ChefHat, CheckCircle2 } from 'lucide-react';

const TarjetaComandaCocina = ({
  pedido,
  trabajadorActivoId,
  manejarCambioEstado,
  procesandoLocal,
  ordenPendienteActivo
}) => {
  // Lógica de desglosado del carrito
  const items = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);
  
  // Regla de Negocio Original: Validar si la comanda la tiene el chef actual
  const esMiComanda = pedido.chef_id === trabajadorActivoId && pedido.estado_preparacion === 'Preparando';
  
  // Cálculo de tiempo total de preparación
  const tiempoTotal = items.reduce((sum, item) => sum + ((Number(item.tiempo_preparacion) || 15) * (item.cantidad || 1)), 0);

  return (
    <div className={`bg-white rounded-[32px] p-6 border-2 shadow-sm flex flex-col transition-all duration-300 ${
      pedido.estado_preparacion === 'Preparando' 
        ? 'border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.15)] scale-[1.02]' 
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      
      {/* 1. ENCABEZADO DE LA COMANDA */}
      <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-4xl font-black text-slate-800 tracking-tight">#{pedido.numero_pedido}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            {pedido.tipo_consumo}
          </p>
        </div>
        <div className="text-right flex flex-col gap-2 items-end">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm ${
            pedido.estado_preparacion === 'Preparando' 
              ? 'bg-orange-100 text-orange-600 border border-orange-200' 
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            {pedido.estado_preparacion}
          </span>
          <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 flex items-center gap-1 shadow-inner">
            ⏱️ {tiempoTotal} min
          </span>
        </div>
      </div>  

      {/* 2. LISTA DE PLATILLOS */}
      <div className="space-y-3 flex-1 mb-6">
        {items.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 shadow-sm transition-colors hover:bg-slate-100">
            <p className="font-black text-slate-700 text-base leading-snug">
              {item.cantidad > 1 && <span className="text-blue-600 mr-1">{item.cantidad}x</span>}
              {item.nombre}
            </p>
            
            {item.extras && item.extras.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {item.extras.map((e, i) => {
                  const esSin = e.nombre.toLowerCase().startsWith('sin ');
                  return (
                    <span key={i} className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider border shadow-sm ${
                      esSin 
                        ? 'bg-red-50 text-red-600 line-through border-red-200/60' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    }`}>
                      {e.nombre}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>  

      {/* 3. BOTONES DE ACCIÓN (Lógica de candados de asignación) */}
      <div className="mt-auto border-t border-slate-100 pt-6">
        {pedido.estado_preparacion !== 'Preparando' ? (
          <button 
            disabled={procesandoLocal || !!ordenPendienteActivo} 
            onClick={() => manejarCambioEstado(pedido.id, 'Preparando')} 
            className={`w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${
              ordenPendienteActivo 
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                : 'bg-slate-800 hover:bg-slate-700 text-white shadow-lg shadow-slate-800/20 active:scale-95'
            }`}
          >
            <ChefHat size={20}/> 
            {ordenPendienteActivo ? 'Termina tu pedido actual' : 'Preparar Pedido'}
          </button>
        ) : (
          <button 
            disabled={procesandoLocal || !esMiComanda} 
            onClick={() => manejarCambioEstado(pedido.id, 'Listo')} 
            className={`w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${
              esMiComanda 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 active:scale-95' 
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={20}/> 
            {esMiComanda ? '¡Terminar Pedido!' : 'Asignado a otro Chef'}
          </button>
        )}
      </div>
      
    </div>
  );
};

export default TarjetaComandaCocina;