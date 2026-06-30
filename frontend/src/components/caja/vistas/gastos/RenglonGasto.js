import React from 'react';
import { Trash2, Clock, Tag } from 'lucide-react';

const RenglonGasto = ({
  gasto,
  eliminarGasto,
  isSubmitting
}) => {
  // Helper interno para mostrar la hora de registro del gasto
  const obtenerHoraFormateada = (fechaStr) => {
    if (!fechaStr) return '--:--';
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) { return '--:--'; }
  };

  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-red-200 hover:shadow-md group animate-in slide-in-from-right-4">
      
      {/* 1. Descripción y Hora */}
      <div className="flex-1 min-w-0">
        <p className="text-sm md:text-base font-black text-slate-700 truncate flex items-center gap-2">
          <Tag size={14} className="text-slate-400 shrink-0" />
          {gasto.descripcion}
        </p>
        <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
          <Clock size={12} /> Registrado: {obtenerHoraFormateada(gasto.fecha_creacion)}
        </p>
      </div>

      {/* 2. Monto y Acción */}
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-lg md:text-xl font-black text-red-500">
          -${Number(gasto.monto).toFixed(2)}
        </span>
        
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => eliminarGasto(gasto.id)}
          className="p-2.5 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors active:scale-95 disabled:opacity-50"
          title="Eliminar Gasto"
        >
          <Trash2 size={18} />
        </button>
      </div>

    </div>
  );
};

export default RenglonGasto;