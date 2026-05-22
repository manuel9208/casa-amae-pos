import React from 'react';
import { Target, CheckCircle, Zap } from 'lucide-react';

const ProyeccionesVentas = ({ proyecciones }) => {
  if (!proyecciones) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 print:border-slate-300 print:shadow-none print:p-4">
      <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <Target className="text-blue-600" size={24} /> Progreso y Metas (Crecimiento del 5%)
      </h3>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 w-full space-y-4">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Volumen Actual</p>
              <span className="text-4xl font-black text-slate-800">{proyecciones.actual_platillos}</span>
              <span className="text-lg font-bold text-slate-400 ml-2">/ {proyecciones.meta_platillos} platillos</span>
            </div>
            <span className={`text-3xl font-black ${
              proyecciones.estado === 'excelente' ? 'text-emerald-500' :
              proyecciones.estado === 'bueno' ? 'text-blue-500' : 'text-orange-500'
            }`}>
              {proyecciones.progreso}%
            </span>
          </div>

          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ${
                proyecciones.estado === 'excelente' ? 'bg-emerald-500' :
                proyecciones.estado === 'bueno' ? 'bg-blue-500' : 'bg-orange-500'
              }`}
              style={{ width: `${proyecciones.progreso}%` }}
            ></div>
          </div>
        </div>

        <div className="flex-1 w-full bg-slate-50 p-6 rounded-3xl border border-slate-200">
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 rounded-2xl mt-1 shrink-0 ${
              proyecciones.estado === 'excelente' ? 'bg-emerald-100 text-emerald-600' :
              proyecciones.estado === 'bueno' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {proyecciones.estado === 'excelente' ? <CheckCircle size={28}/> : <Zap size={28}/>}
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-xl leading-tight mb-1">{proyecciones.mensaje}</h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{proyecciones.accion}</p>
            </div>
          </div>

          {proyecciones.meta_futura && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">🚀 Siguiente paso</p>
              <p className="text-sm font-bold text-slate-700">{proyecciones.meta_futura}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProyeccionesVentas;