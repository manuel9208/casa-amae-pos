import React from 'react';
import { MapPin } from 'lucide-react';

const FormularioConsumoLocal = ({
  mesas,
  mesaSeleccionada,
  setMesaSeleccionada,
  ordenEditandoRapida
}) => {
  // Si no hay mesas configuradas en el sistema, no renderizamos el bloque por seguridad
  if (!mesas || mesas.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner animate-in fade-in duration-200">
      <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-1.5">
        <MapPin size={14} /> Asignación de Espacio (Comedor)
      </label>
      
      <div className="relative">
        <select
          value={mesaSeleccionada}
          onChange={e => setMesaSeleccionada(e.target.value)}
          className="w-full bg-white text-slate-800 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm appearance-none"
        >
          <option value="">-- Asignación Libre / Barra --</option>
          {mesas
            .filter(m => m.estado === 'Libre' || (ordenEditandoRapida && m.numero_mesa === ordenEditandoRapida.mesa))
            .map(m => (
              <option key={m.id} value={m.numero_mesa}>
                {String(m.numero_mesa).toLowerCase().startsWith('mesa') 
                  ? m.numero_mesa 
                  : `Mesa ${m.numero_mesa}`}
              </option>
            ))}
        </select>
        
        {/* Indicador visual del dropdown para mejorar la UX en mobile */}
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
          <span className="text-xs">▼</span>
        </div>
      </div>

      {mesaSeleccionada && (
        <p className="text-[11px] font-bold text-indigo-600 mt-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg w-fit animate-in slide-in-from-top-1">
          📍 La orden se vinculará a la **Mesa {mesaSeleccionada}** en el mapa en tiempo real.
        </p>
      )}
    </div>
  );
};

export default FormularioConsumoLocal;