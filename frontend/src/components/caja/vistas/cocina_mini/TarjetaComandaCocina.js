import React from 'react';
import { ChefHat, CheckCircle2, Users, Play } from 'lucide-react';  

const TarjetaComandaCocina = ({
  pedido,
  trabajadorActivoId,
  procesarAccionItems,
  procesandoLocal,
  personalCocina
}) => {
  const items = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);  

  // Helper para buscar el nombre del cocinero
  const obtenerNombreTrabajador = (id) => {
    const t = personalCocina.find(t => String(t.id) === String(id));
    return t ? (t.nombre || t.usuario) : 'Chef';
  };

  const tiempoTotal = items.reduce((sum, item) => sum + ((Number(item.tiempo_preparacion) || 15) * (item.cantidad || 1)), 0);  

  // Acción masiva (para tomar todos los pendientes con un tap)
  const tomarTodosLosPendientes = () => {
    const indices = [];
    items.forEach((item, idx) => {
      if (!item.estado || item.estado === 'Pendiente') {
        indices.push(idx);
      }
    });
    if (indices.length > 0) procesarAccionItems(pedido, indices, 'Preparar', trabajadorActivoId);
  };

  // Validar si hay platillos de este pedido que aún no están listos
  const itemsPendientes = items.filter(i => i.estado !== 'Listo' && i.estado !== 'Finalizado');
  if (itemsPendientes.length === 0) return null; // Si ya se hizo todo localmente, se oculta

  return (
    <div className={`bg-white rounded-[32px] p-6 border-2 shadow-sm flex flex-col transition-all duration-300 ${
      pedido.estado_preparacion === 'Preparando'
        ? 'border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.15)] scale-[1.02]'
        : 'border-slate-200 hover:border-slate-300'
    }`}>  
      {/* 1. ENCABEZADO DE LA COMANDA */}
      <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4 shrink-0">
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
              : pedido.estado_preparacion === 'Aceptado'
              ? 'bg-blue-100 text-blue-600 border border-blue-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            {pedido.estado_preparacion}
          </span>
          <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 flex items-center gap-1 shadow-inner">
            ⏱️ {tiempoTotal} min
          </span>
        </div>
      </div>  

      {/* 2. LISTA GRANULAR DE PLATILLOS */}
      <div className="space-y-4 flex-1 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {items.map((item, originalIdx) => {
          if (item.estado === 'Listo' || item.estado === 'Finalizado') return null;

          const estadoItem = item.estado || 'Pendiente';
          const loEstoyHaciendoYo = String(item.chef_id) === String(trabajadorActivoId);
          const loHaceOtro = estadoItem === 'Preparando' && !loEstoyHaciendoYo;

          return (
            <div key={originalIdx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
              <div>
                <p className="font-black text-slate-700 text-base leading-snug">
                  {item.cantidad > 1 && <span className="text-blue-600 mr-1">{item.cantidad}x</span>}
                  {item.nombre}
                </p>  

                {item.extras && item.extras.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
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

                {/* Badge Si otro cocinero lo tiene */}
                {loHaceOtro && (
                  <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl mt-3 inline-flex items-center gap-2">
                    <ChefHat size={14} className="text-blue-500"/>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      Cocina: {obtenerNombreTrabajador(item.chef_id)}
                    </span>
                  </div>
                )}
              </div>

              {/* Botones de Acción por Platillo */}
              <div className="flex gap-2 mt-2 border-t border-slate-200/60 pt-3">
                {estadoItem === 'Pendiente' && (
                  <button
                    disabled={procesandoLocal}
                    onClick={() => procesarAccionItems(pedido, [originalIdx], 'Preparar', trabajadorActivoId)}
                    className="flex-1 bg-white hover:bg-slate-100 text-slate-700 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm border border-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    <Play size={14}/> Preparar
                  </button>
                )}

                {estadoItem === 'Preparando' && loEstoyHaciendoYo && (
                  <button
                    disabled={procesandoLocal}
                    onClick={() => procesarAccionItems(pedido, [originalIdx], 'Terminar', trabajadorActivoId)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14}/> Listo
                  </button>
                )}

                {loHaceOtro && (
                  <button
                    disabled={procesandoLocal}
                    onClick={() => procesarAccionItems(pedido, [originalIdx], 'Ayudar', trabajadorActivoId)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Users size={14}/> Ayudar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>  

      {/* 3. BOTÓN MASIVO INFERIOR */}
      <div className="mt-auto shrink-0 border-t border-slate-100 pt-5">
        {items.some(i => (!i.estado || i.estado === 'Pendiente') && i.estado !== 'Listo' && i.estado !== 'Finalizado') && (
          <button
            onClick={tomarTodosLosPendientes}
            disabled={procesandoLocal}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl text-xs sm:text-sm uppercase tracking-widest transition-all shadow-lg shadow-slate-800/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={18}/> Tomar todo lo pendiente
          </button>
        )}
      </div>  
    </div>
  );
};  

export default TarjetaComandaCocina;