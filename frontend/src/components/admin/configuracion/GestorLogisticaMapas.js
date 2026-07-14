import React from 'react';
import { MapPin, Map, Key, Info } from 'lucide-react';

const GestorLogisticaMapas = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  return (
    <div className="bg-pink-50/30 p-6 rounded-3xl border border-pink-200 space-y-6">
      <h3 className="text-xl font-bold text-pink-800 flex items-center gap-2">📍 8. Logística y Mapas</h3>

      <div className="space-y-4">
        {/* CONFIGURACIÓN CRÍTICA (FASE 1) - CONTEXTO GEOGRÁFICO */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-pink-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <MapPin size={80} />
          </div>
          <label className="block text-xs font-black text-pink-600 uppercase tracking-widest mb-2 flex items-center gap-1.5 relative z-10">
            <MapPin size={16} /> Ciudad y Estado (Contexto GPS)
          </label>
          <input
            disabled={isSubmitting}
            type="text"
            // 👇 FIX: Ahora coinciden exactamente con la Base de Datos (gps_ciudad_estado)
            value={configGlobal.gps_ciudad_estado || ''}
            onChange={e => setConfigGlobal({ ...configGlobal, gps_ciudad_estado: e.target.value })}
            className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all relative z-10"
            placeholder="Ej. Navolato, Sinaloa"
          />
          <div className="flex items-start gap-2 mt-3 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 relative z-10">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] md:text-xs font-bold leading-relaxed">
              Este dato se concatenará automáticamente a la dirección del cliente para que la aplicación de Google Maps del repartidor no se pierda buscando calles genéricas en otros estados.
            </p>
          </div>
        </div>

        {/* PREPARACIÓN FASE 2 - CÁLCULOS EXACTOS DE COMBUSTIBLE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-pink-100">
          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm flex flex-col justify-between">
            <div>
              <label className="block text-xs font-black text-pink-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Map size={16} /> Dirección del Local (Punto A)
              </label>
              <input
                disabled={isSubmitting}
                type="text"
                // 👇 FIX: Coincide con gps_direccion_local
                value={configGlobal.gps_direccion_local || ''}
                onChange={e => setConfigGlobal({ ...configGlobal, gps_direccion_local: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 focus:border-pink-500 transition-all"
                placeholder="Ej. Calle Sonora #2133"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">Punto de partida para medir distancias reales.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm flex flex-col justify-between">
            <div>
              <label className="block text-xs font-black text-pink-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Key size={16} /> Google Maps API Key
              </label>
              <input
                disabled={isSubmitting}
                type="password"
                // 👇 FIX: Coincide con gps_api_key
                value={configGlobal.gps_api_key || ''}
                onChange={e => setConfigGlobal({ ...configGlobal, gps_api_key: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 focus:border-pink-500 transition-all tracking-[0.2em]"
                placeholder="AIzaSyA..."
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">Requerida para cálculos exactos de combustible (Fase 2).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestorLogisticaMapas;