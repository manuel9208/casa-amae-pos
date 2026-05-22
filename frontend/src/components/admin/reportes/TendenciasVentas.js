import React from 'react';
import { History, Clock } from 'lucide-react';

const TendenciasVentas = ({ comparativas }) => {
  if (!comparativas || comparativas.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 print:border-slate-300 print:shadow-none print:p-4">
      <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <History className="text-blue-600" size={24} /> Análisis de Horarios y Tendencias
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparativas.map((comp, idx) => (
          <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">
              {comp.label}
              {comp.subtitulo && (
                <span className="block text-[10px] font-bold text-slate-400 mt-0.5 normal-case tracking-normal">
                  ({comp.subtitulo})
                </span>
              )}
            </h4>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Volumen Total:</span>
                  <span className="font-black text-slate-800">{comp.totalPlatillos} platillos</span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                    <Clock size={14}/> Hora Pico:
                  </span>
                  <span className="text-xs font-bold text-emerald-600 text-right">{comp.mejorHora}</span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                    <Clock size={14}/> Hora Muerta:
                  </span>
                  <span className="text-xs font-bold text-red-500 text-right">{comp.peorHora}</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TendenciasVentas;