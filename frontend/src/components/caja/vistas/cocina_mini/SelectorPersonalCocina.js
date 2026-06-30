import React from 'react';
import { ChefHat } from 'lucide-react';

const SelectorPersonalCocina = ({
  personalCocina,
  trabajadorActivoId,
  setTrabajadorActivoId,
  obtenerOrdenActiva
}) => {
  return (
    <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center animate-in fade-in duration-200">
      {/* Etiqueta del Selector */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="bg-orange-100 text-orange-600 p-2 rounded-xl shadow-inner">
          <ChefHat size={20}/>
        </div>
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
          Asignar a Chef:
        </p>
      </div>  

      {/* Botones de Cocineros Activos */}
      <div className="flex flex-wrap gap-2 w-full">
        {personalCocina.map(emp => {
          const ocupado = obtenerOrdenActiva(emp.id);
          const esSeleccionado = trabajadorActivoId === emp.id;
          
          return (
            <button 
              key={emp.id} 
              type="button"
              onClick={() => setTrabajadorActivoId(emp.id)} 
              className={`flex-1 sm:flex-none px-4 py-3 rounded-xl text-xs font-black uppercase transition-all duration-200 flex items-center justify-center gap-2 border active:scale-95 ${
                esSeleccionado 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30 scale-105 z-10' 
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <span>
                {emp.rol === 'ayudante_cocina' ? '🔪' : '👨‍¼'} {emp.nombre || emp.usuario}
              </span>
              
              {/* Alerta de comanda en progreso asignada a este chef */}
              {ocupado && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black tracking-tight animate-pulse shadow-sm">
                  #{ocupado.numero_pedido}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
};

export default SelectorPersonalCocina;